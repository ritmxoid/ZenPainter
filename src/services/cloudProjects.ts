import { type User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  BackgroundConfig,
  CanvasSizeConfig,
  CanvasSizePreset,
  ExportScope,
} from '../types/paint';
import { APP_VERSION } from '../version';

export const MAX_CLOUD_PROJECTS_PER_USER = 5;
export const CLOUD_PROJECT_TTL_DAYS = 30;
const TTL_MS = CLOUD_PROJECT_TTL_DAYS * 24 * 60 * 60 * 1000;
const MAX_FIRESTORE_DOC_BYTES = 920_000;
const NESTED_ARRAY_KEY = '__nestedArray';

export interface SerializedCanvasData {
  version: string;
  objects: Record<string, unknown>[];
  [key: string]: unknown;
}

export interface CloudProjectMetaRecord {
  id: string;
  ownerId: string;
  title: string;
  appVersion: string;
  objectCount: number;
  approxBytes: number;
  preset: CanvasSizePreset;
  width: number;
  height: number;
  createdAtMs: number;
  updatedAtMs: number;
  expiresAtMs: number;
}

export interface CloudProjectRecord {
  id: string;
  ownerId: string;
  title: string;
  appVersion: string;
  objectCount: number;
  exportScope: ExportScope;
  canvasSize: CanvasSizeConfig;
  bgConfig: BackgroundConfig;
  canvasData: SerializedCanvasData;
  createdAtMs: number;
  updatedAtMs: number;
  expiresAtMs: number;
}

export interface SaveCloudProjectInput {
  projectId?: string;
  title: string;
  exportScope: ExportScope;
  canvasSize: CanvasSizeConfig;
  bgConfig: BackgroundConfig;
  canvasData: Record<string, unknown>;
}

export interface CloudDraftRecord {
  ownerId: string;
  appVersion: string;
  objectCount: number;
  exportScope: ExportScope;
  canvasSize: CanvasSizeConfig;
  bgConfig: BackgroundConfig;
  canvasData: SerializedCanvasData;
  activeProjectId: string;
  activeProjectTitle: string;
  updatedAtMs: number;
}

export interface SaveCloudDraftInput {
  exportScope: ExportScope;
  canvasSize: CanvasSizeConfig;
  bgConfig: BackgroundConfig;
  canvasData: Record<string, unknown>;
  activeProjectId?: string | null;
  activeProjectTitle?: string;
}

/**
 * Recursively converts arbitrary JS / Fabric objects into Firestore-safe native
 * Maps, Lists, strings, finite numbers, booleans, or null.
 * Wraps nested arrays (e.g. Fabric Path commands `[['M', x, y]]`) in a
 * `{ __nestedArray: [...] }` map since Firestore prohibits direct array-of-arrays.
 */
function sanitizeValueForFirestore(value: unknown, insideArray = false): unknown {
  if (value === null || value === undefined) {
    return insideArray ? null : undefined;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'function' || typeof value === 'symbol') {
    return undefined;
  }

  if (Array.isArray(value)) {
    const sanitizedItems = value
      .map((item) => sanitizeValueForFirestore(item, true))
      .map((item) => (item === undefined ? null : item));
    if (insideArray) {
      return { [NESTED_ARRAY_KEY]: sanitizedItems };
    }
    return sanitizedItems;
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val === undefined || typeof val === 'function' || typeof val === 'symbol') {
        continue;
      }
      const sanitized = sanitizeValueForFirestore(val, false);
      if (sanitized !== undefined) {
        out[key] = sanitized;
      }
    }
    return out;
  }

  return undefined;
}

/**
 * Unwraps `{ __nestedArray: [...] }` back into nested JS arrays when restoring
 * Fabric.js objects from Firestore.
 */
export function restoreValueFromFirestore(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((item) => restoreValueFromFirestore(item));
  }
  if (typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    const keys = Object.keys(rec);
    if (keys.length === 1 && keys[0] === NESTED_ARRAY_KEY && Array.isArray(rec[NESTED_ARRAY_KEY])) {
      return (rec[NESTED_ARRAY_KEY] as unknown[]).map((item) => restoreValueFromFirestore(item));
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rec)) {
      out[k] = restoreValueFromFirestore(v);
    }
    return out;
  }
  return value;
}

function timestampToMs(val: unknown, fallbackMs = Date.now()): number {
  if (!val) return fallbackMs;
  if (typeof val === 'object' && val !== null && 'toMillis' in val) {
    try {
      return (val as Timestamp).toMillis();
    } catch {
      return fallbackMs;
    }
  }
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  return fallbackMs;
}

function clampDim(val: number): number {
  if (!Number.isFinite(val)) return 1080;
  return Math.max(50, Math.min(10000, Math.round(val)));
}

function buildValidatedCanvasSize(cs: CanvasSizeConfig): CanvasSizeConfig {
  return {
    preset: cs.preset,
    width: clampDim(cs.width),
    height: clampDim(cs.height),
  };
}

function buildValidatedBgConfig(bg: BackgroundConfig): BackgroundConfig {
  const opacity = Number.isFinite(bg.opacity) ? Math.max(0, Math.min(1, bg.opacity)) : 1;
  const angle = Number.isFinite(bg.gradientAngle)
    ? Math.max(0, Math.min(360, bg.gradientAngle))
    : 135;
  return {
    mode: bg.mode,
    fillType: bg.fillType,
    color1: (bg.color1 || '#FFFFFF').slice(0, 40),
    color2: (bg.color2 || '#EFF6FF').slice(0, 40),
    opacity,
    gradientType: bg.gradientType,
    gradientAngle: angle,
  };
}

function computeNextExpiryTimestamp(): Timestamp {
  return Timestamp.fromMillis(Date.now() + TTL_MS);
}

const inFlightProfileSyncs = new Map<string, Promise<{ hideWelcomeTutorial: boolean }>>();
const inFlightDraftSaves = new Map<string, Promise<boolean>>();

export async function ensureUserProfile(
  user: User,
  localHideTutorial?: boolean
): Promise<{ hideWelcomeTutorial: boolean }> {
  const existing = inFlightProfileSyncs.get(user.uid);
  if (existing) {
    return existing;
  }

  const run = (async (): Promise<{ hideWelcomeTutorial: boolean }> => {
    const path = `users/${user.uid}`;
    const ref = doc(db, 'users', user.uid);
    let snap;
    try {
      snap = await getDoc(ref);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }

    const email = (user.email || `${user.uid}@zenpainter.local`).slice(0, 320);
    const displayName = (
      user.displayName ||
      (user.email ? user.email.split('@')[0] : 'ZenPainter')
    ).slice(0, 100);

    if (!snap.exists()) {
      const hide = Boolean(localHideTutorial);
      try {
        await setDoc(ref, {
          uid: user.uid,
          email,
          displayName,
          hideWelcomeTutorial: hide,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
      return { hideWelcomeTutorial: hide };
    }

    const data = snap.data() as Record<string, unknown>;
    const remoteHide = Boolean(data.hideWelcomeTutorial);
    const mergedHide = remoteHide || Boolean(localHideTutorial);

    if (
      data.email !== email ||
      data.displayName !== displayName ||
      data.hideWelcomeTutorial !== mergedHide
    ) {
      try {
        await updateDoc(ref, {
          email,
          displayName,
          hideWelcomeTutorial: mergedHide,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }
    return { hideWelcomeTutorial: mergedHide };
  })();

  inFlightProfileSyncs.set(user.uid, run);
  try {
    return await run;
  } finally {
    if (inFlightProfileSyncs.get(user.uid) === run) {
      inFlightProfileSyncs.delete(user.uid);
    }
  }
}

export async function updateUserTutorialPref(
  uid: string,
  hideWelcomeTutorial: boolean
): Promise<void> {
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    await updateDoc(ref, {
      hideWelcomeTutorial: Boolean(hideWelcomeTutorial),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

async function deleteProjectPairQuietly(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    const batch = writeBatch(db);
    for (const id of ids) {
      batch.delete(doc(db, 'projectMetas', id));
      batch.delete(doc(db, 'projects', id));
    }
    await batch.commit();
  } catch {
    // Cleanup failures should not break listing
  }
}

export async function listCloudProjectMetas(
  uid: string
): Promise<CloudProjectMetaRecord[]> {
  const path = 'projectMetas';
  try {
    const metaSnap = await getDocs(
      query(collection(db, path), where('ownerId', '==', uid))
    );
    const metasById = new Map<string, CloudProjectMetaRecord>();
    const expiredIds: string[] = [];
    const now = Date.now();

    for (const d of metaSnap.docs) {
      const data = d.data() as Record<string, unknown>;
      const updatedAtMs = timestampToMs(data.updatedAt, now);
      const createdAtMs = timestampToMs(data.createdAt, updatedAtMs);
      const expiresAtMs = timestampToMs(data.expiresAt, updatedAtMs + TTL_MS);

      if (expiresAtMs <= now) {
        expiredIds.push(d.id);
        continue;
      }

      metasById.set(d.id, {
        id: d.id,
        ownerId: String(data.ownerId || uid),
        title: String(data.title || 'ZenPainter'),
        appVersion: String(data.appVersion || APP_VERSION),
        objectCount: typeof data.objectCount === 'number' ? data.objectCount : 0,
        approxBytes: typeof data.approxBytes === 'number' ? data.approxBytes : 0,
        preset: (data.preset as CanvasSizePreset) || 'fullscreen',
        width: typeof data.width === 'number' ? data.width : 1200,
        height: typeof data.height === 'number' ? data.height : 900,
        createdAtMs,
        updatedAtMs,
        expiresAtMs,
      });
    }

    // One-time check for any legacy /projects documents saved before card split
    const migKey = `zp_meta_migrated_${uid}`;
    let alreadyMigrated = false;
    try {
      alreadyMigrated = localStorage.getItem(migKey) === '1';
    } catch {
      alreadyMigrated = false;
    }

    if (!alreadyMigrated) {
      const legacySnap = await getDocs(
        query(collection(db, 'projects'), where('ownerId', '==', uid))
      );
      const backfillBatch = writeBatch(db);
      let hasBackfill = false;

      for (const d of legacySnap.docs) {
        if (metasById.has(d.id)) continue;
        const data = d.data() as Record<string, unknown>;
        const updatedAtMs = timestampToMs(data.updatedAt, now);
        const createdAtMs = timestampToMs(data.createdAt, updatedAtMs);
        const expiresAtMs = timestampToMs(data.expiresAt, updatedAtMs + TTL_MS);

        if (expiresAtMs <= now) {
          expiredIds.push(d.id);
          continue;
        }

        const cs = (data.canvasSize as CanvasSizeConfig) || {
          preset: 'fullscreen',
          width: 1200,
          height: 900,
        };
        const approxBytes = new Blob([JSON.stringify(data)]).size;
        const metaRec: CloudProjectMetaRecord = {
          id: d.id,
          ownerId: uid,
          title: String(data.title || 'ZenPainter'),
          appVersion: String(data.appVersion || APP_VERSION),
          objectCount: typeof data.objectCount === 'number' ? data.objectCount : 0,
          approxBytes,
          preset: cs.preset || 'fullscreen',
          width: clampDim(cs.width),
          height: clampDim(cs.height),
          createdAtMs,
          updatedAtMs,
          expiresAtMs,
        };
        metasById.set(d.id, metaRec);

        backfillBatch.set(doc(db, 'projectMetas', d.id), {
          id: d.id,
          ownerId: uid,
          title: metaRec.title.slice(0, 120),
          appVersion: metaRec.appVersion.slice(0, 24),
          objectCount: metaRec.objectCount,
          approxBytes: metaRec.approxBytes,
          preset: metaRec.preset,
          width: metaRec.width,
          height: metaRec.height,
          createdAt: data.createdAt || serverTimestamp(),
          updatedAt: data.updatedAt || serverTimestamp(),
          expiresAt: Timestamp.fromMillis(expiresAtMs),
        });
        hasBackfill = true;
      }

      if (hasBackfill) {
        try {
          await backfillBatch.commit();
        } catch {
          // Ignore legacy backfill write errors if slot isn't numbered
        }
      }
      try {
        localStorage.setItem(migKey, '1');
      } catch {
        // Ignore storage errors
      }
    }

    if (expiredIds.length > 0) {
      void deleteProjectPairQuietly(expiredIds);
    }

    const items = Array.from(metasById.values());
    items.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function loadCloudProjectPayload(
  projectId: string
): Promise<CloudProjectRecord | null> {
  const path = `projects/${projectId}`;
  try {
    const snap = await getDoc(doc(db, 'projects', projectId));
    if (!snap.exists()) return null;
    const data = snap.data() as Record<string, unknown>;
    const now = Date.now();
    const updatedAtMs = timestampToMs(data.updatedAt, now);
    const createdAtMs = timestampToMs(data.createdAt, updatedAtMs);
    const expiresAtMs = timestampToMs(data.expiresAt, updatedAtMs + TTL_MS);

    if (expiresAtMs <= now) {
      void deleteProjectPairQuietly([projectId]);
      return null;
    }

    const restoredCanvas = (restoreValueFromFirestore(data.canvasData) || {
      version: '5.3.0',
      objects: [],
    }) as SerializedCanvasData;

    return {
      id: snap.id,
      ownerId: String(data.ownerId || ''),
      title: String(data.title || 'ZenPainter'),
      appVersion: String(data.appVersion || APP_VERSION),
      objectCount: typeof data.objectCount === 'number' ? data.objectCount : 0,
      exportScope: data.exportScope === 'artwork' ? 'artwork' : 'canvas',
      canvasSize: (data.canvasSize as CanvasSizeConfig) || {
        preset: 'fullscreen',
        width: 1200,
        height: 900,
      },
      bgConfig: (data.bgConfig as BackgroundConfig) || {
        mode: 'white',
        fillType: 'solid',
        color1: '#FFFFFF',
        color2: '#EFF6FF',
        opacity: 1,
        gradientType: 'linear',
        gradientAngle: 135,
      },
      canvasData: restoredCanvas,
      createdAtMs,
      updatedAtMs,
      expiresAtMs,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveCloudProject(
  user: User,
  input: SaveCloudProjectInput
): Promise<string> {
  const title = (input.title || 'ZenPainter').trim().slice(0, 120) || 'ZenPainter';
  const rawObjects = Array.isArray(input.canvasData?.objects)
    ? (input.canvasData.objects as unknown[])
    : [];
  const sanitizedObjects = rawObjects
    .slice(0, 3000)
    .map((obj) => sanitizeValueForFirestore(obj, false))
    .filter((obj): obj is Record<string, unknown> => Boolean(obj && typeof obj === 'object'));

  const sanitizedCanvasData: SerializedCanvasData = {
    version: String(input.canvasData?.version || '5.3.0').slice(0, 40),
    objects: sanitizedObjects,
  };

  const validatedSize = buildValidatedCanvasSize(input.canvasSize);
  const validatedBg = buildValidatedBgConfig(input.bgConfig);
  const exportScope: ExportScope = input.exportScope === 'artwork' ? 'artwork' : 'canvas';

  let targetProjectId = input.projectId;
  let isUpdatingExisting = false;

  if (targetProjectId) {
    const existingSnap = await getDoc(doc(db, 'projects', targetProjectId));
    isUpdatingExisting = existingSnap.exists();
  }

  if (!isUpdatingExisting) {
    const existingMetas = await listCloudProjectMetas(user.uid);
    if (existingMetas.length >= MAX_CLOUD_PROJECTS_PER_USER) {
      throw new Error('MAX_PROJECTS_REACHED');
    }

    const usedIds = new Set(existingMetas.map((m) => m.id));
    let freeSlotId: string | null = null;
    for (let slot = 0; slot < MAX_CLOUD_PROJECTS_PER_USER; slot++) {
      const candidate = `${user.uid}_${slot}`;
      if (!usedIds.has(candidate)) {
        freeSlotId = candidate;
        break;
      }
    }
    if (!freeSlotId) {
      throw new Error('MAX_PROJECTS_REACHED');
    }
    targetProjectId = freeSlotId;
  }

  if (!targetProjectId) {
    throw new Error('MAX_PROJECTS_REACHED');
  }

  const sizeCheckPayload = {
    id: targetProjectId,
    ownerId: user.uid,
    title,
    appVersion: APP_VERSION.slice(0, 24),
    objectCount: sanitizedObjects.length,
    exportScope,
    canvasSize: validatedSize,
    bgConfig: validatedBg,
    canvasData: sanitizedCanvasData,
  };

  const estimatedBytes = new Blob([JSON.stringify(sizeCheckPayload)]).size;
  if (estimatedBytes > MAX_FIRESTORE_DOC_BYTES) {
    throw new Error('PROJECT_TOO_LARGE');
  }

  const expiresAt = computeNextExpiryTimestamp();
  const path = `projects/${targetProjectId}`;

  try {
    const batch = writeBatch(db);
    const projRef = doc(db, 'projects', targetProjectId);
    const metaRef = doc(db, 'projectMetas', targetProjectId);

    const metaSnap = isUpdatingExisting ? await getDoc(metaRef) : null;

    if (isUpdatingExisting) {
      batch.update(projRef, {
        title,
        appVersion: APP_VERSION.slice(0, 24),
        objectCount: sanitizedObjects.length,
        exportScope,
        canvasSize: validatedSize,
        bgConfig: validatedBg,
        canvasData: sanitizedCanvasData,
        updatedAt: serverTimestamp(),
        expiresAt,
      });

      if (metaSnap?.exists()) {
        batch.update(metaRef, {
          title,
          appVersion: APP_VERSION.slice(0, 24),
          objectCount: sanitizedObjects.length,
          approxBytes: estimatedBytes,
          preset: validatedSize.preset,
          width: validatedSize.width,
          height: validatedSize.height,
          updatedAt: serverTimestamp(),
          expiresAt,
        });
      } else {
        batch.set(metaRef, {
          id: targetProjectId,
          ownerId: user.uid,
          title,
          appVersion: APP_VERSION.slice(0, 24),
          objectCount: sanitizedObjects.length,
          approxBytes: estimatedBytes,
          preset: validatedSize.preset,
          width: validatedSize.width,
          height: validatedSize.height,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          expiresAt,
        });
      }
    } else {
      batch.set(projRef, {
        ...sizeCheckPayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        expiresAt,
      });

      batch.set(metaRef, {
        id: targetProjectId,
        ownerId: user.uid,
        title,
        appVersion: APP_VERSION.slice(0, 24),
        objectCount: sanitizedObjects.length,
        approxBytes: estimatedBytes,
        preset: validatedSize.preset,
        width: validatedSize.width,
        height: validatedSize.height,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        expiresAt,
      });
    }

    await batch.commit();
    return targetProjectId;
  } catch (error) {
    handleFirestoreError(
      error,
      isUpdatingExisting ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function deleteCloudProject(projectId: string): Promise<void> {
  const path = `projects/${projectId}`;
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'projectMetas', projectId));
    batch.delete(doc(db, 'projects', projectId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveCloudDraft(
  user: User,
  input: SaveCloudDraftInput
): Promise<boolean> {
  const previous = inFlightDraftSaves.get(user.uid) ?? Promise.resolve(false);
  const next = previous
    .catch(() => false)
    .then(async (): Promise<boolean> => {
      const rawObjects = Array.isArray(input.canvasData?.objects)
        ? (input.canvasData.objects as unknown[])
        : [];
      const sanitizedObjects = rawObjects
        .slice(0, 3000)
        .map((obj) => sanitizeValueForFirestore(obj, false))
        .filter((obj): obj is Record<string, unknown> => Boolean(obj && typeof obj === 'object'));

      const sanitizedCanvasData: SerializedCanvasData = {
        version: String(input.canvasData?.version || '5.3.0').slice(0, 40),
        objects: sanitizedObjects,
      };

      const validatedSize = buildValidatedCanvasSize(input.canvasSize);
      const validatedBg = buildValidatedBgConfig(input.bgConfig);
      const exportScope: ExportScope = input.exportScope === 'artwork' ? 'artwork' : 'canvas';
      const activeProjectId = String(input.activeProjectId || '').slice(0, 128);
      const activeProjectTitle = String(input.activeProjectTitle || '').slice(0, 120);

      const payload = {
        ownerId: user.uid,
        appVersion: APP_VERSION.slice(0, 24),
        objectCount: sanitizedObjects.length,
        exportScope,
        canvasSize: validatedSize,
        bgConfig: validatedBg,
        canvasData: sanitizedCanvasData,
        activeProjectId,
        activeProjectTitle,
      };

      const estimatedBytes = new Blob([JSON.stringify(payload)]).size;
      if (estimatedBytes > MAX_FIRESTORE_DOC_BYTES) {
        return false;
      }

      const ref = doc(db, 'userDrafts', user.uid);
      const path = `userDrafts/${user.uid}`;
      const expiresAt = computeNextExpiryTimestamp();

      let existingSnap;
      try {
        existingSnap = await getDoc(ref);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
      }

      if (existingSnap.exists()) {
        try {
          await updateDoc(ref, {
            appVersion: payload.appVersion,
            objectCount: payload.objectCount,
            exportScope: payload.exportScope,
            canvasSize: payload.canvasSize,
            bgConfig: payload.bgConfig,
            canvasData: payload.canvasData,
            activeProjectId: payload.activeProjectId,
            activeProjectTitle: payload.activeProjectTitle,
            updatedAt: serverTimestamp(),
            expiresAt,
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, path);
        }
      } else {
        try {
          await setDoc(ref, {
            ...payload,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            expiresAt,
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, path);
        }
      }
      return true;
    });

  inFlightDraftSaves.set(user.uid, next);
  try {
    return await next;
  } finally {
    if (inFlightDraftSaves.get(user.uid) === next) {
      inFlightDraftSaves.delete(user.uid);
    }
  }
}

export async function loadCloudDraft(
  uid: string
): Promise<CloudDraftRecord | null> {
  const ref = doc(db, 'userDrafts', uid);
  const path = `userDrafts/${uid}`;
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() as Record<string, unknown>;
    const now = Date.now();
    const updatedAtMs = timestampToMs(data.updatedAt, now);
    const expiresAtMs = timestampToMs(data.expiresAt, updatedAtMs + TTL_MS);
    if (expiresAtMs <= now) {
      void deleteDoc(ref).catch(() => {});
      return null;
    }

    const restoredCanvas = (restoreValueFromFirestore(data.canvasData) || {
      version: '5.3.0',
      objects: [],
    }) as SerializedCanvasData;

    return {
      ownerId: String(data.ownerId || uid),
      appVersion: String(data.appVersion || APP_VERSION),
      objectCount: typeof data.objectCount === 'number' ? data.objectCount : 0,
      exportScope: data.exportScope === 'artwork' ? 'artwork' : 'canvas',
      canvasSize: (data.canvasSize as CanvasSizeConfig) || {
        preset: 'fullscreen',
        width: 1200,
        height: 900,
      },
      bgConfig: (data.bgConfig as BackgroundConfig) || {
        mode: 'white',
        fillType: 'solid',
        color1: '#FFFFFF',
        color2: '#EFF6FF',
        opacity: 1,
        gradientType: 'linear',
        gradientAngle: 135,
      },
      canvasData: restoredCanvas,
      activeProjectId: String(data.activeProjectId || ''),
      activeProjectTitle: String(data.activeProjectTitle || ''),
      updatedAtMs,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function clearCloudDraft(uid: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'userDrafts', uid));
  } catch {
    // Draft cleanup failures should never block UX
  }
}
