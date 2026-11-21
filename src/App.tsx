import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  beginStroke,
  cropOpaqueCanvasBounds,
  drawSegment,
  finishStroke,
  type BrushPresetId,
  type StrokeSession,
} from './brushes/brushEngine';
import {
  attachArtisticBrushRenderer,
  isArtisticContourBrush,
  rehydrateArtisticBrushObject,
} from './brushes/contourBrushRenderer';
import { ActionsPopover } from './components/ActionsPopover';
import { CloudSaveModal } from './components/CloudSaveModal';
import { EraserPopover } from './components/EraserPopover';
import { HelpModal } from './components/HelpModal';
import { ObjectEditorPopover } from './components/ObjectEditorPopover';
import { RightSidebar } from './components/RightSidebar';
import { ShapesPopover } from './components/ShapesPopover';
import { StampsPopover } from './components/StampsPopover';
import { TextModal } from './components/TextModal';
import { auth } from './firebase';
import {
  clearCloudDraft,
  type CloudProjectRecord,
  ensureUserProfile,
  loadCloudDraft,
  prepareCanvasDataForCloud,
  saveCloudDraft,
  saveCloudProject,
  updateUserTutorialPref,
} from './services/cloudProjects';
import {
  getSavedLanguagePreference,
  resolveLanguage,
  saveLanguagePreference,
  translations,
  type TranslationKey,
} from './i18n/translations';
import {
  type ActivePopover,
  type ArrowVariant,
  type BackgroundConfig,
  type BackgroundMode,
  type BrushType,
  type CanvasSizeConfig,
  type DrawMode,
  type EmojiDefinition,
  type ExportScope,
  type FillSettings,
  type LanguagePreference,
  type LinePattern,
  type PolygonVariant,
  type RectGridConfig,
  type SelectedObjectInfo,
  type SelectedObjectKind,
  type StampDefinition,
  type StrokeSettings,
} from './types/paint';
import { trackFunction } from './utils/analytics';
import {
  applyColorOpacity,
  applyCornerRoundingToObject,
  applyFillToObject,
  buildFillValue,
  buildPolygonPoints,
  compressDataUrlToMaxBytes,
  createArrowObject,
  downscaleImageFileToDataUrl,
  drawBackgroundToContext,
  exportCanvasImage,
  getArtboardWorldRect,
  getFabric,
  getObjectCornerRoundRatio,
  getObjectCornerWorldVertices,
  getObjectScreenRect,
  getScaledDashArray,
  hasFillableStampParts,
  installDoubleLineStrokeHook,
  isBackgroundDark,
  isObjectCornerRoundable,
  parseColorAndOpacity,
  refreshObjectPhotoFill,
} from './utils/canvasHelpers';
import { drawLassoOverlayOnContext, extractLassoFragment, type LassoPoint } from './utils/lassoHelper';
import {
  attachEndpointControls,
  buildFabricPathFromWorldSegments,
  convertClosedContourToOpen,
  convertObjectToClosedContour,
  detachEndpointControls,
  extractWorldPathSegmentsForEdit,
  findNearestEndpointSnap,
  getObjectBezierControlHandles,
  getObjectEditableWorldVertices,
  getObjectWorldEndpoints,
  hasPathCloseCommand,
  isBezierPathObject,
  isMergeableOpenLine,
  isObjectVertexEditable,
  mergeObjectWithEndpointSnaps,
  segmentsToPathCommands,
  updateObjectBezierHandle,
  updateObjectEditableVertex,
  updateOpenObjectEndpoint,
  type Point2D,
  type WorldSegment,
} from './utils/pathSnapping';
import { HIDE_TUTORIAL_STORAGE_KEY } from './version';

const CUSTOM_FABRIC_PROPS = [
  'fillMeta',
  'strokeColorHex',
  'strokeOpacity',
  'strokePattern',
  'doubleLine',
  'brushType',
  'isSprayGroup',
  'isEraserPath',
  'isClosedContour',
  'isBezierCurve',
  'isArrowGroup',
  'isArrowObject',
  'arrowVariant',
  'arrowEndpoints',
  'isPolygonMorphable',
  'polygonVariant',
  'baseLocalPoints',
  'basePathCommands',
  'baseWidth',
  'baseHeight',
  'basePathOffset',
  'cornerRoundRatio',
  'isGridRect',
  'gridRows',
  'gridCols',
  'isStampGroup',
  'isTexturedBrushStroke',
  'worldEndpoints',
  'perPixelTargetFind',
  'targetFindTolerance',
  'cornerColor',
  'borderColor',
  'selectable',
  'evented',
  'globalCompositeOperation',
];

const TEXTURED_BRUSH_TYPES: ReadonlySet<BrushType> = new Set([
  'stroke',
  'roller',
  'dry',
  'watercolor',
  'charcoal',
  'calligraphy',
]);

function isTexturedBrush(bt: BrushType): bt is Exclude<BrushPresetId, 'spray'> {
  return TEXTURED_BRUSH_TYPES.has(bt);
}

const DEFAULT_BG: BackgroundConfig = {
  mode: 'white',
  fillType: 'solid',
  color1: '#FFFFFF',
  color2: '#EFF6FF',
  opacity: 1,
  gradientType: 'linear',
  gradientAngle: 135,
};

const DEFAULT_STROKE: StrokeSettings = {
  color: '#0F172A',
  opacity: 1,
  width: 6,
  pattern: 'solid',
  brushType: 'standard',
  doubleLine: false,
};

const DEFAULT_FILL: FillSettings = {
  mode: 'none',
  color: '#3B82F6',
  opacity: 0.35,
  hatchPattern: 'diagonal',
};

const ARTBOARD_CENTER = { x: 0, y: 0 };

function createGridRectGroup(
  fabric: any,
  left: number,
  top: number,
  width: number,
  height: number,
  rows: number,
  cols: number,
  strokeCfg: StrokeSettings,
  fillCfg: FillSettings
): any {
  const safeW = Math.max(8, width);
  const safeH = Math.max(8, height);
  const sw = Math.max(1, strokeCfg.width);
  const strokeRgba = applyColorOpacity(strokeCfg.color, strokeCfg.opacity);
  const dash = getScaledDashArray(strokeCfg.pattern, sw);

  const outer = new fabric.Rect({
    left: -safeW / 2,
    top: -safeH / 2,
    width: safeW,
    height: safeH,
    fill: buildFillValue(fillCfg, safeW, safeH),
    stroke: strokeRgba,
    strokeWidth: sw,
    strokeDashArray: dash || undefined,
    strokeUniform: true,
    originX: 'left',
    originY: 'top',
  });

  const children: any[] = [outer];
  for (let r = 1; r < rows; r++) {
    const y = -safeH / 2 + (safeH * r) / rows;
    children.push(
      new fabric.Line([-safeW / 2, y, safeW / 2, y], {
        stroke: strokeRgba,
        strokeWidth: Math.max(1, sw * 0.75),
        strokeDashArray: dash || undefined,
        strokeUniform: true,
      })
    );
  }
  for (let c = 1; c < cols; c++) {
    const x = -safeW / 2 + (safeW * c) / cols;
    children.push(
      new fabric.Line([x, -safeH / 2, x, safeH / 2], {
        stroke: strokeRgba,
        strokeWidth: Math.max(1, sw * 0.75),
        strokeDashArray: dash || undefined,
        strokeUniform: true,
      })
    );
  }

  const grp = new fabric.Group(children, {
    left: left + safeW / 2,
    top: top + safeH / 2,
    originX: 'center',
    originY: 'center',
    isGridRect: true,
    gridRows: rows,
    gridCols: cols,
    fillMeta: { ...fillCfg },
    strokeColorHex: strokeCfg.color,
    strokeOpacity: strokeCfg.opacity,
    strokePattern: strokeCfg.pattern,
    strokeWidth: sw,
    doubleLine: strokeCfg.doubleLine,
    cornerColor: '#2563EB',
    borderColor: '#2563EB',
  });
  return grp;
}

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const brushPreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [languagePref, setLanguagePref] = useState<LanguagePreference>(() =>
    getSavedLanguagePreference()
  );
  const lang = useMemo(() => resolveLanguage(languagePref), [languagePref]);
  const t = useCallback(
    (key: TranslationKey): string => translations[lang]?.[key] ?? translations.en[key],
    [lang]
  );

  const [isToolbarOpen, setIsToolbarOpen] = useState(true);
  const [activePopover, setActivePopover] = useState<ActivePopover>(null);
  const [activeMode, setActiveMode] = useState<DrawMode>('brush');
  const [stroke, setStroke] = useState<StrokeSettings>(DEFAULT_STROKE);
  const [fill, setFill] = useState<FillSettings>(DEFAULT_FILL);
  const [rectGrid, setRectGrid] = useState<RectGridConfig>({
    enabled: false,
    rows: 3,
    cols: 3,
  });
  const [polygonVariant, setPolygonVariant] = useState<PolygonVariant>('star5');
  const [arrowVariant, setArrowVariant] = useState<ArrowVariant>('single');
  const [closedContour, setClosedContour] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [eraserSize, setEraserSize] = useState(24);

  const [bgConfig, setBgConfig] = useState<BackgroundConfig>(DEFAULT_BG);
  const [canvasSize, setCanvasSize] = useState<CanvasSizeConfig>(() => ({
    preset: 'fullscreen',
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 720,
  }));
  const [exportScope, setExportScope] = useState<ExportScope>('canvas');
  const [zoomPercent, setZoomPercent] = useState(100);
  const [hasArtwork, setHasArtwork] = useState(false);

  const [selectedInfo, setSelectedInfo] = useState<SelectedObjectInfo | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [dontShowTutorialAgain, setDontShowTutorialAgain] = useState<boolean>(() => {
    try {
      return localStorage.getItem(HIDE_TUTORIAL_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [helpOpen, setHelpOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(HIDE_TUTORIAL_STORAGE_KEY) !== 'true';
    } catch {
      return false;
    }
  });

  // Cloud profile & saved project state
  const [cloudUser, setCloudUser] = useState<User | null>(() => auth.currentUser);
  const [cloudModalOpen, setCloudModalOpen] = useState(false);
  const [activeCloudProjectId, setActiveCloudProjectId] = useState<string | null>(null);
  const [activeCloudProjectTitle, setActiveCloudProjectTitle] = useState<string>('');
  const lastRightClickOpenAtRef = useRef<number>(0);

  // Contour polyline points & corner radius HUD state
  const [contourPoints, setContourPoints] = useState<Point2D[]>([]);
  const [cornerRoundHudRatio, setCornerRoundHudRatio] = useState<number | null>(null);

  // Refs synced with latest state for Fabric callbacks
  const activeModeRef = useRef(activeMode);
  const strokeRef = useRef(stroke);
  const fillRef = useRef(fill);
  const rectGridRef = useRef(rectGrid);
  const polygonVariantRef = useRef(polygonVariant);
  const arrowVariantRef = useRef(arrowVariant);
  const closedContourRef = useRef(closedContour);
  const snapEnabledRef = useRef(snapEnabled);
  const eraserSizeRef = useRef(eraserSize);
  const bgConfigRef = useRef(bgConfig);
  const canvasSizeRef = useRef(canvasSize);
  const activePopoverRef = useRef(activePopover);
  const cloudUserRef = useRef<User | null>(cloudUser);
  const exportScopeRef = useRef<ExportScope>(exportScope);
  const activeCloudProjectIdRef = useRef<string | null>(activeCloudProjectId);
  const activeCloudProjectTitleRef = useRef<string>(activeCloudProjectTitle);

  activeModeRef.current = activeMode;
  strokeRef.current = stroke;
  fillRef.current = fill;
  rectGridRef.current = rectGrid;
  polygonVariantRef.current = polygonVariant;
  arrowVariantRef.current = arrowVariant;
  closedContourRef.current = closedContour;
  snapEnabledRef.current = snapEnabled;
  eraserSizeRef.current = eraserSize;
  bgConfigRef.current = bgConfig;
  canvasSizeRef.current = canvasSize;
  activePopoverRef.current = activePopover;
  cloudUserRef.current = cloudUser;
  exportScopeRef.current = exportScope;
  activeCloudProjectIdRef.current = activeCloudProjectId;
  activeCloudProjectTitleRef.current = activeCloudProjectTitle;

  // Cloud auto-draft persistence refs
  const isDirtyDraftRef = useRef(false);
  const draftSaveTimerRef = useRef<number | null>(null);
  const draftLoadedForUidRef = useRef<string | null>(null);

  // Undo/Redo history refs
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isRestoringHistoryRef = useRef(false);

  // Interactive drawing refs
  const drawingShapeRef = useRef<{
    obj: any;
    startX: number;
    startY: number;
  } | null>(null);
  const contourPointsRef = useRef<Point2D[]>([]);
  contourPointsRef.current = contourPoints;
  const polylineHoverPtRef = useRef<Point2D | null>(null);

  const bezierEditRef = useRef<{
    pathObj: any;
    p1: Point2D;
    cp1: Point2D;
    cp2: Point2D;
    p2: Point2D;
    draggingHandle: 'p1' | 'cp1' | 'cp2' | 'p2' | null;
  } | null>(null);

  const lassoPointsRef = useRef<LassoPoint[]>([]);
  const isDrawingLassoRef = useRef(false);
  const snapIndicatorRef = useRef<Point2D | null>(null);
  const rotatingAngleHudRef = useRef<{
    angle: number;
    screenX: number;
    screenY: number;
    snapped: boolean;
  } | null>(null);

  // Long-press corner-rounding & tap-to-select green vertex editing refs
  const selectedVertexRef = useRef<{
    obj: any;
    index: number;
  } | null>(null);
  const vertexPendingRef = useRef<{
    obj: any;
    index: number;
    pointerId: number;
    startScreenX: number;
    startScreenY: number;
    wasAlreadySelected: boolean;
    isOpenLineEnd: boolean;
    prevLocks: {
      prevLockX: boolean;
      prevLockY: boolean;
      prevLockScaleX: boolean;
      prevLockScaleY: boolean;
      prevLockRot: boolean;
      prevHasControls: boolean;
    } | null;
  } | null>(null);
  const vertexDragRef = useRef<{
    obj: any;
    index: number;
    pointerId: number;
    isOpenLineEnd: boolean;
    prevLocks: {
      prevLockX: boolean;
      prevLockY: boolean;
      prevLockScaleX: boolean;
      prevLockScaleY: boolean;
      prevLockRot: boolean;
      prevHasControls: boolean;
    };
  } | null>(null);
  const bezierHandleDragRef = useRef<{
    obj: any;
    segIndex: number;
    handle: 'cp1' | 'cp2';
    pointerId: number;
    prevLocks: {
      prevLockX: boolean;
      prevLockY: boolean;
      prevLockScaleX: boolean;
      prevLockScaleY: boolean;
      prevLockRot: boolean;
      prevHasControls: boolean;
    };
  } | null>(null);
  const cornerLongPressTimerRef = useRef<number | null>(null);
  const cornerPendingRef = useRef<{
    obj: any;
    pointerId: number;
    startScreenX: number;
    startScreenY: number;
    centerScreen: Point2D;
    startDist: number;
    startRatio: number;
    prevLocks: {
      prevLockX: boolean;
      prevLockY: boolean;
      prevLockScaleX: boolean;
      prevLockScaleY: boolean;
      prevLockRot: boolean;
      prevHasControls: boolean;
    } | null;
  } | null>(null);
  const cornerRoundDragRef = useRef<{
    obj: any;
    pointerId: number;
    centerScreen: Point2D;
    startDist: number;
    startRatio: number;
    prevLockX: boolean;
    prevLockY: boolean;
    prevLockScaleX: boolean;
    prevLockScaleY: boolean;
    prevLockRot: boolean;
    prevHasControls: boolean;
  } | null>(null);

  // Textured Brush active stroke refs
  const brushBufferRef = useRef<HTMLCanvasElement | null>(null);
  const brushSessionRef = useRef<{
    session: StrokeSession;
    pointerId: number;
    dpr: number;
    vpt: number[];
    pointerType: string;
    startWorld: Point2D;
    lastWorld: Point2D;
  } | null>(null);

  // Clipboard internal object clone ref
  const clipboardJsonRef = useRef<any[] | null>(null);

  // Spacebar / pan / pinch refs
  const spacePressedRef = useRef(false);
  const isPanningRef = useRef(false);
  const panLastScreenRef = useRef<{ x: number; y: number } | null>(null);
  const touchPinchRef = useRef<{
    active: boolean;
    dist: number;
    midX: number;
    midY: number;
  } | null>(null);
  const activeTouchesRef = useRef<Map<number, { x: number; y: number }>>(new Map());

  const toastTimerRef = useRef<number | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 2400);
  }, []);

  const isDarkBg = useMemo(() => isBackgroundDark(bgConfig), [bgConfig]);

  const redrawBackground = useCallback(() => {
    const bgCanvas = bgCanvasRef.current;
    const fc = fabricRef.current;
    if (!bgCanvas) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (bgCanvas.width !== Math.round(w * dpr) || bgCanvas.height !== Math.round(h * dpr)) {
      bgCanvas.width = Math.round(w * dpr);
      bgCanvas.height = Math.round(h * dpr);
    }
    const ctx = bgCanvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const vpt = fc?.viewportTransform || [1, 0, 0, 1, 0, 0];
    drawBackgroundToContext(
      ctx,
      bgConfigRef.current,
      vpt,
      w,
      h,
      false,
      canvasSizeRef.current,
      ARTBOARD_CENTER
    );
    ctx.restore();
  }, []);

  const syncHasArtwork = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const objs = fc
      .getObjects()
      .filter((o: any) => !o.excludeFromExport && !o.isEraserPath);
    setHasArtwork(objs.length > 0);
  }, []);

  const getLocalDraftKey = (uid: string) => `zp_local_draft_${uid}`;

  const clearLocalDraftBackup = useCallback((uid?: string | null) => {
    if (!uid) return;
    try {
      localStorage.removeItem(getLocalDraftKey(uid));
    } catch {
      // ignore storage errors
    }
  }, []);

  const flushCloudDraftNow = useCallback(() => {
    const fc = fabricRef.current;
    const user = cloudUserRef.current;
    if (!fc || !user || !isDirtyDraftRef.current) return;
    if (draftSaveTimerRef.current !== null) {
      window.clearTimeout(draftSaveTimerRef.current);
      draftSaveTimerRef.current = null;
    }

    const activeObjs = fc
      .getObjects()
      .filter((o: any) => !o.excludeFromExport && !o.isEraserPath);

    if (activeObjs.length === 0) {
      isDirtyDraftRef.current = false;
      clearLocalDraftBackup(user.uid);
      void clearCloudDraft(user.uid);
      return;
    }

    try {
      const serialized = fc.toObject(CUSTOM_FABRIC_PROPS) as Record<string, unknown>;
      const compactSerialized = prepareCanvasDataForCloud(serialized);
      const draftPayload = {
        exportScope: exportScopeRef.current,
        canvasSize: canvasSizeRef.current,
        bgConfig: bgConfigRef.current,
        canvasData: compactSerialized,
        activeProjectId: activeCloudProjectIdRef.current || '',
        activeProjectTitle: activeCloudProjectTitleRef.current || '',
        updatedAtMs: Date.now(),
      };
      try {
        localStorage.setItem(getLocalDraftKey(user.uid), JSON.stringify(draftPayload));
      } catch {
        // ignore quota errors on large local backup
      }
      void saveCloudDraft(user, draftPayload).catch(() => {
        // ignore background network errors while auto-saving draft
      });
    } catch {
      // ignore serialization errors
    }
  }, [clearLocalDraftBackup]);

  const scheduleCloudDraftSave = useCallback(() => {
    isDirtyDraftRef.current = true;
    const user = cloudUserRef.current;
    if (!user) return;
    if (draftSaveTimerRef.current !== null) {
      window.clearTimeout(draftSaveTimerRef.current);
    }
    draftSaveTimerRef.current = window.setTimeout(() => {
      draftSaveTimerRef.current = null;
      flushCloudDraftNow();
    }, 2200);
  }, [flushCloudDraftNow]);

  const pushHistory = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc || isRestoringHistoryRef.current) return;
    try {
      const json = JSON.stringify(fc.toObject(CUSTOM_FABRIC_PROPS));
      const stack = historyRef.current.slice(0, historyIndexRef.current + 1);
      if (stack.length > 0 && stack[stack.length - 1] === json) {
        return;
      }
      stack.push(json);
      if (stack.length > 50) {
        stack.shift();
      }
      historyRef.current = stack;
      historyIndexRef.current = stack.length - 1;
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(false);
      syncHasArtwork();
      if (historyIndexRef.current > 0) {
        scheduleCloudDraftSave();
      }
    } catch {
      // ignore serialization edge cases
    }
  }, [scheduleCloudDraftSave, syncHasArtwork]);

  const extractSelectedObjectInfo = useCallback((): SelectedObjectInfo | null => {
    const fc = fabricRef.current;
    if (!fc) return null;
    const active = fc.getActiveObject();
    if (!active) return null;

    const isMulti = active.type === 'activeSelection';
    const primary = isMulti && Array.isArray(active._objects) ? active._objects[0] : active;
    if (!primary) return null;

    const screenRect = getObjectScreenRect(active);
    const opacity = typeof active.opacity === 'number' ? active.opacity : 1;

    if (primary.type === 'i-text' || primary.type === 'text' || primary.type === 'textbox') {
      const parsedFill = parseColorAndOpacity(primary.fill);
      const parsedStroke = parseColorAndOpacity(primary.stroke, primary.strokeOpacity);
      return {
        kind: 'text',
        strokeColor: primary.strokeColorHex || (primary.stroke ? parsedStroke.hex : parsedFill.hex),
        strokeOpacity: primary.strokeOpacity ?? (primary.stroke ? parsedStroke.opacity : 1),
        strokeWidth: typeof primary.strokeWidth === 'number' ? primary.strokeWidth : 0,
        strokePattern: primary.strokePattern || 'solid',
        doubleLine: Boolean(primary.doubleLine),
        brushType: primary.brushType || 'standard',
        selectionCount: isMulti ? active._objects.length : 1,
        fill: DEFAULT_FILL,
        opacity,
        cornerRoundRatio: null,
        textColor: parsedFill.hex,
        fontFamily: primary.fontFamily || 'Montserrat',
        fontSize: primary.fontSize || 36,
        screenRect,
      };
    }

    if (primary.type === 'image') {
      if (primary.isTexturedBrushStroke) {
        return {
          kind: 'line',
          strokeColor: primary.strokeColorHex || '#0F172A',
          strokeOpacity: primary.strokeOpacity ?? opacity,
          strokeWidth: primary.strokeWidth || 6,
          strokePattern: 'solid',
          doubleLine: false,
          brushType: primary.brushType,
          isSpray: true,
          selectionCount: isMulti ? active._objects.length : 1,
          fill: DEFAULT_FILL,
          opacity,
          cornerRoundRatio: null,
          textColor: '#000000',
          fontFamily: 'Montserrat',
          fontSize: 36,
          screenRect,
        };
      }
      const parsed = parseColorAndOpacity(primary.stroke, primary.strokeOpacity);
      return {
        kind: 'image',
        strokeColor: primary.strokeColorHex || parsed.hex,
        strokeOpacity: primary.strokeOpacity ?? parsed.opacity,
        strokeWidth: primary.strokeWidth || 0,
        strokePattern: primary.strokePattern || 'solid',
        doubleLine: Boolean(primary.doubleLine),
        brushType: primary.brushType,
        selectionCount: isMulti ? active._objects.length : 1,
        fill: DEFAULT_FILL,
        opacity,
        cornerRoundRatio: null,
        textColor: '#000000',
        fontFamily: 'Montserrat',
        fontSize: 36,
        screenRect,
      };
    }

    const parsedStroke = parseColorAndOpacity(primary.stroke, primary.strokeOpacity);
    const isClosedPath =
      primary.type === 'path' &&
      (Boolean(primary.isClosedContour) || hasPathCloseCommand(primary));
    const isFilledArrow =
      Boolean(primary.isArrowMorphable || primary.isArrowObject) &&
      (primary.arrowVariant === 'filled' || primary.arrowVariant === 'filledDouble');
    const isClosed =
      primary.type === 'ellipse' ||
      primary.type === 'rect' ||
      primary.type === 'triangle' ||
      primary.type === 'polygon' ||
      Boolean(primary.isGridRect) ||
      Boolean(primary.isStampGroup && hasFillableStampParts(primary)) ||
      isClosedPath ||
      isFilledArrow;

    const kind: SelectedObjectKind = isClosed ? 'closedShape' : 'line';

    const canToggleClosedContour =
      !isMulti &&
      !primary.isArrowGroup &&
      !primary.isArrowObject &&
      !primary.isStampGroup &&
      !primary.isSprayGroup &&
      !primary.isGridRect &&
      (primary.type === 'line' ||
        (primary.type === 'path' &&
          !primary.isEraserPath &&
          Array.isArray(primary.path) &&
          primary.path.length >= 2));

    const fillMeta: FillSettings = primary.fillMeta
      ? { ...primary.fillMeta }
      : { ...DEFAULT_FILL };

    return {
      kind,
      strokeColor: primary.strokeColorHex || parsedStroke.hex,
      strokeOpacity: primary.strokeOpacity ?? parsedStroke.opacity,
      strokeWidth:
        typeof primary.strokeWidth === 'number' ? primary.strokeWidth : strokeRef.current.width,
      strokePattern: primary.strokePattern || 'solid',
      doubleLine: Boolean(primary.doubleLine),
      brushType: primary.brushType || 'standard',
      isSpray: Boolean(primary.isSprayGroup),
      isClosedContour: Boolean(primary.isClosedContour || isClosedPath),
      canToggleClosedContour,
      isPolygonMorphable: Boolean(primary.isPolygonMorphable && primary.polygonVariant),
      polygonVariant: primary.polygonVariant,
      isRectEditable: primary.type === 'rect' || Boolean(primary.isGridRect),
      isGridRect: Boolean(primary.isGridRect),
      gridRows: primary.gridRows ?? 3,
      gridCols: primary.gridCols ?? 3,
      isArrowMorphable: Boolean(primary.isArrowMorphable || primary.isArrowObject || primary.isArrowGroup),
      arrowVariant: primary.arrowVariant,
      selectionCount: isMulti ? active._objects.length : 1,
      fill: fillMeta,
      opacity,
      cornerRoundRatio: isMulti ? null : getObjectCornerRoundRatio(primary),
      textColor: '#000000',
      fontFamily: 'Montserrat',
      fontSize: 36,
      screenRect,
    };
  }, []);

  const refreshSelectionInfo = useCallback(() => {
    setSelectedInfo(extractSelectedObjectInfo());
  }, [extractSelectedObjectInfo]);

  const applyEndpointControlsToSelection = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const active = fc.getActiveObject();
    if (!active || active.type === 'activeSelection') return;
    if (snapEnabledRef.current && isMergeableOpenLine(active)) {
      attachEndpointControls(active, {
        onDragEndpoint: (obj, end, worldX, worldY) => {
          const zoom = fc.getZoom() || 1;
          const curEps = getObjectWorldEndpoints(obj);
          const segCount =
            obj.type === 'path' ? extractWorldPathSegmentsForEdit(obj).length : 1;
          const selfOtherEnd =
            curEps && segCount >= 2
              ? end === 'start'
                ? curEps.end
                : curEps.start
              : null;
          const match = findNearestEndpointSnap(
            fc,
            { x: worldX, y: worldY },
            [obj],
            zoom,
            selfOtherEnd,
            true
          );
          const targetPt = match ? match.point : { x: worldX, y: worldY };
          snapIndicatorRef.current = match ? match.point : null;
          updateOpenObjectEndpoint(obj, end, targetPt);
          fc.requestRenderAll();
          return true;
        },
      });
    } else {
      detachEndpointControls(active);
    }
  }, []);

  const restoreHistoryIndex = useCallback(
    (idx: number) => {
      const fc = fabricRef.current;
      if (!fc || idx < 0 || idx >= historyRef.current.length) return;
      isRestoringHistoryRef.current = true;
      historyIndexRef.current = idx;
      const json = historyRef.current[idx];
      fc.loadFromJSON(json, () => {
        fc.getObjects().forEach((obj: any) => {
          if (obj.isEraserPath) {
            obj.set({
              selectable: false,
              evented: false,
              globalCompositeOperation: 'destination-out',
            });
          } else {
            obj.set({
              selectable: true,
              evented: true,
              cornerColor: '#2563EB',
              borderColor: '#2563EB',
            });
            const rehydratePhoto = (item: any) => {
              if (!item) return;
              if (item.fillMeta?.mode === 'photo' && item.fillMeta.photoDataUrl) {
                refreshObjectPhotoFill(item, fc);
              } else if (Array.isArray(item._objects)) {
                item._objects.forEach((child: any) => rehydratePhoto(child));
              }
            };
            rehydratePhoto(obj);
            rehydrateArtisticBrushObject(obj);
          }
        });
        fc.discardActiveObject();
        fc.requestRenderAll();
        redrawBackground();
        syncHasArtwork();
        refreshSelectionInfo();
        setCanUndo(historyIndexRef.current > 0);
        setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
        isRestoringHistoryRef.current = false;
      });
    },
    [redrawBackground, refreshSelectionInfo, syncHasArtwork]
  );

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      trackFunction('undo', 'history');
      restoreHistoryIndex(historyIndexRef.current - 1);
    }
  }, [restoreHistoryIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      trackFunction('redo', 'history');
      restoreHistoryIndex(historyIndexRef.current + 1);
    }
  }, [restoreHistoryIndex]);

  const applyClipForArtboard = useCallback(() => {
    const fc = fabricRef.current;
    const fabric = getFabric();
    if (!fc || !fabric) return;
    const cs = canvasSizeRef.current;
    if (cs.preset === 'fullscreen') {
      fc.clipPath = undefined;
    } else {
      const r = getArtboardWorldRect(ARTBOARD_CENTER, cs);
      fc.clipPath = new fabric.Rect({
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
        originX: 'left',
        originY: 'top',
        absolutePositioned: true,
      });
    }
    fc.requestRenderAll();
    redrawBackground();
  }, [redrawBackground]);

  const fitViewportToArtboard = useCallback(
    (cs: CanvasSizeConfig) => {
      const fc = fabricRef.current;
      if (!fc) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (cs.preset === 'fullscreen') {
        fc.setViewportTransform([1, 0, 0, 1, 0, 0]);
        setZoomPercent(100);
      } else {
        const pad = 48;
        const scale = Math.min(
          1,
          Math.max(0.15, Math.min((vw - pad) / cs.width, (vh - pad) / cs.height))
        );
        const tx = vw / 2 - ARTBOARD_CENTER.x * scale;
        const ty = vh / 2 - ARTBOARD_CENTER.y * scale;
        fc.setViewportTransform([scale, 0, 0, scale, tx, ty]);
        setZoomPercent(Math.round(scale * 100));
      }
      redrawBackground();
      fc.requestRenderAll();
      refreshSelectionInfo();
    },
    [redrawBackground, refreshSelectionInfo]
  );

  // Configure Fabric drawing brush whenever mode, stroke, or eraserSize updates
  const syncFabricToolState = useCallback(() => {
    const fc = fabricRef.current;
    const fabric = getFabric();
    if (!fc || !fabric) return;

    const mode = activeModeRef.current;
    const st = strokeRef.current;

    if (mode === 'select') {
      fc.isDrawingMode = false;
      fc.selection = true;
      fc.skipTargetFind = false;
      fc.defaultCursor = 'default';
      fc.getObjects().forEach((obj: any) => {
        if (obj.isEraserPath) {
          obj.set({ selectable: false, evented: false });
        } else {
          obj.set({ selectable: true, evented: true });
        }
      });
    } else if (mode === 'brush') {
      if (isTexturedBrush(st.brushType)) {
        fc.isDrawingMode = false;
        fc.selection = false;
        fc.skipTargetFind = true;
        fc.defaultCursor = 'crosshair';
      } else if (st.brushType === 'spray') {
        fc.isDrawingMode = true;
        fc.selection = false;
        fc.skipTargetFind = true;
        const spray = new fabric.SprayBrush(fc);
        spray.width = Math.max(8, st.width * 3.2);
        spray.density = Math.max(18, Math.round(st.width * 2.5));
        spray.dotWidth = Math.max(1.2, st.width * 0.22);
        spray.dotWidthVariance = 1.5;
        spray.color = applyColorOpacity(st.color, st.opacity);
        fc.freeDrawingBrush = spray;
      } else {
        fc.isDrawingMode = true;
        fc.selection = false;
        fc.skipTargetFind = true;
        const pencil = new fabric.PencilBrush(fc);
        const sw = Math.max(1, st.width);
        pencil.width = sw;
        pencil.color = applyColorOpacity(st.color, st.opacity);
        pencil.strokeDashArray = getScaledDashArray(st.pattern, sw);
        pencil.strokeLineCap = 'round';
        pencil.strokeLineJoin = 'round';
        if (st.brushType === 'soft') {
          pencil.shadow = new fabric.Shadow({
            blur: Math.max(4, sw * 0.9),
            offsetX: 0,
            offsetY: 0,
            color: applyColorOpacity(st.color, Math.min(1, st.opacity * 0.85)),
            affectStroke: true,
          });
        } else {
          pencil.shadow = null;
        }
        fc.freeDrawingBrush = pencil;
      }
    } else if (mode === 'eraser') {
      fc.isDrawingMode = true;
      fc.selection = false;
      fc.skipTargetFind = true;
      const eb = new fabric.PencilBrush(fc);
      eb.width = eraserSizeRef.current;
      eb.color = 'rgba(0,0,0,1)';
      eb.strokeLineCap = 'round';
      eb.strokeLineJoin = 'round';
      eb.shadow = null;
      fc.freeDrawingBrush = eb;
    } else {
      fc.isDrawingMode = false;
      fc.selection = false;
      fc.skipTargetFind = true;
      fc.defaultCursor = 'crosshair';
    }

    if (mode !== 'select') {
      selectedVertexRef.current = null;
      fc.discardActiveObject();
      setSelectedInfo(null);
    } else if (bezierEditRef.current?.pathObj) {
      const prevBezierObj = bezierEditRef.current.pathObj;
      bezierEditRef.current = null;
      if (fc.getObjects().includes(prevBezierObj)) {
        fc.setActiveObject(prevBezierObj);
      }
    }
    if (mode !== 'bezier' && bezierEditRef.current) {
      bezierEditRef.current = null;
    }
    fc.requestRenderAll();
  }, []);

  useEffect(() => {
    syncFabricToolState();
  }, [activeMode, stroke, eraserSize, syncFabricToolState]);

  // Commit multi-segment contour / polyline points
  const commitContourPoints = useCallback(
    (closeIt: boolean) => {
      const fc = fabricRef.current;
      const pts = contourPointsRef.current;
      polylineHoverPtRef.current = null;
      snapIndicatorRef.current = null;
      if (!fc || pts.length < 2) {
        setContourPoints([]);
        fc?.requestRenderAll();
        return;
      }
      const st = strokeRef.current;
      const segs: WorldSegment[] = [];
      for (let i = 0; i < pts.length - 1; i++) {
        segs.push({ type: 'L', from: pts[i], to: pts[i + 1] });
      }
      const shouldClose = closeIt && pts.length >= 3;
      const obj = buildFabricPathFromWorldSegments(
        segs,
        {
          stroke: st.width > 0 ? applyColorOpacity(st.color, st.opacity) : null,
          strokeColorHex: st.color,
          strokeOpacity: st.opacity,
          strokeWidth: st.width,
          strokeDashArray: getScaledDashArray(st.pattern, st.width),
          strokePattern: st.pattern,
          doubleLine: st.doubleLine,
          brushType: 'standard',
        },
        shouldClose,
        fillRef.current,
        true
      );
      if (obj) {
        fc.add(obj);
        if (!shouldClose && snapEnabledRef.current) {
          mergeObjectWithEndpointSnaps(fc, obj, fillRef.current);
        }
        pushHistory();
      }
      setContourPoints([]);
      fc.requestRenderAll();
    },
    [pushHistory]
  );

  // Initialize Fabric Canvas & Listeners once
  useEffect(() => {
    const fabric = getFabric();
    const el = canvasElRef.current;
    if (!fabric || !el) return;

    installDoubleLineStrokeHook();

    const w = window.innerWidth;
    const h = window.innerHeight;
    const fc = new fabric.Canvas(el, {
      width: w,
      height: h,
      preserveObjectStacking: true,
      selection: false,
      fireRightClick: true,
      fireMiddleClick: true,
      stopContextMenu: true,
      enableRetinaScaling: true,
    });
    fabricRef.current = fc;

    // Seed initial undo snapshot
    historyRef.current = [JSON.stringify(fc.toObject(CUSTOM_FABRIC_PROPS))];
    historyIndexRef.current = 0;
    setCanUndo(false);
    setCanRedo(false);
    redrawBackground();
    syncFabricToolState();

    // Animated marching ants loop for lasso
    let rafId = 0;
    const tickLasso = () => {
      if (isDrawingLassoRef.current && lassoPointsRef.current.length > 1) {
        fc.requestRenderAll();
      }
      rafId = window.requestAnimationFrame(tickLasso);
    };
    rafId = window.requestAnimationFrame(tickLasso);

    // Path created from Pencil / Spray / Eraser brushes
    fc.on('path:created', (opt: any) => {
      const path = opt?.path;
      if (!path) return;
      const mode = activeModeRef.current;
      const st = strokeRef.current;
      snapIndicatorRef.current = null;

      if (mode === 'eraser') {
        path.set({
          isEraserPath: true,
          selectable: false,
          evented: false,
          fill: null,
          stroke: 'rgba(0,0,0,1)',
          strokeWidth: eraserSizeRef.current,
          strokeLineCap: 'round',
          strokeLineJoin: 'round',
          globalCompositeOperation: 'destination-out',
        });
        fc.requestRenderAll();
        pushHistory();
        return;
      }

      if (st.brushType === 'spray') {
        path.set({
          isSprayGroup: true,
          brushType: 'spray',
          strokeColorHex: st.color,
          strokeOpacity: st.opacity,
          cornerColor: '#2563EB',
          borderColor: '#2563EB',
        });
        fc.requestRenderAll();
        pushHistory();
        return;
      }

      path.set({
        strokeColorHex: st.color,
        strokeOpacity: st.opacity,
        strokePattern: st.pattern,
        doubleLine: st.doubleLine,
        brushType: st.brushType,
        strokeUniform: true,
        perPixelTargetFind: !closedContourRef.current,
        targetFindTolerance: 14,
        cornerColor: '#2563EB',
        borderColor: '#2563EB',
      });

      if (closedContourRef.current) {
        const closedObj = convertObjectToClosedContour(path, fillRef.current, false);
        if (closedObj) {
          fc.remove(path);
          fc.add(closedObj);
        }
      } else if (snapEnabledRef.current) {
        mergeObjectWithEndpointSnaps(fc, path, fillRef.current);
      }
      fc.requestRenderAll();
      pushHistory();
    });

    // Selection lifecycle
    const onSelectionChange = () => {
      const curActive = fc.getActiveObject();
      if (selectedVertexRef.current && selectedVertexRef.current.obj !== curActive) {
        selectedVertexRef.current = null;
      }
      applyEndpointControlsToSelection();
      refreshSelectionInfo();
    };
    fc.on('selection:created', onSelectionChange);
    fc.on('selection:updated', onSelectionChange);
    fc.on('selection:cleared', () => {
      selectedVertexRef.current = null;
      snapIndicatorRef.current = null;
      setSelectedInfo(null);
    });

    fc.on('object:modified', (e: any) => {
      rotatingAngleHudRef.current = null;
      const target = e?.target;
      if (target) {
        refreshObjectPhotoFill(target, fc);
        if (snapEnabledRef.current && isMergeableOpenLine(target)) {
          const merged = mergeObjectWithEndpointSnaps(fc, target, fillRef.current);
          if (merged) {
            selectedVertexRef.current = null;
            fc.setActiveObject(merged);
            applyEndpointControlsToSelection();
            fc.requestRenderAll();
          }
        }
      }
      snapIndicatorRef.current = null;
      refreshSelectionInfo();
      pushHistory();
    });

    fc.on('object:moving', (e: any) => {
      selectedVertexRef.current = null;
      const target = e?.target;
      if (snapEnabledRef.current && isMergeableOpenLine(target)) {
        const eps = getObjectWorldEndpoints(target);
        const zoom = fc.getZoom() || 1;
        if (eps) {
          const mStart = findNearestEndpointSnap(fc, eps.start, [target], zoom);
          const mEnd = findNearestEndpointSnap(fc, eps.end, [target], zoom);
          const best =
            mStart && (!mEnd || mStart.distance <= mEnd.distance) ? mStart : mEnd;
          if (best) {
            const matchedEnd = best === mStart ? eps.start : eps.end;
            target.set({
              left: (target.left || 0) + (best.point.x - matchedEnd.x),
              top: (target.top || 0) + (best.point.y - matchedEnd.y),
            });
            target.setCoords();
            snapIndicatorRef.current = best.point;
          } else {
            snapIndicatorRef.current = null;
          }
        }
      } else {
        snapIndicatorRef.current = null;
      }
      refreshSelectionInfo();
    });
    fc.on('object:scaling', refreshSelectionInfo);
    fc.on('object:rotating', (e: any) => {
      const target = e?.target;
      if (target) {
        const raw = (((target.angle || 0) % 360) + 360) % 360;
        const shift = Boolean(e?.e?.shiftKey);
        const step = shift ? 15 : 45;
        const nearest = Math.round(raw / step) * step;
        let snappedAngle = raw;
        let snapped = false;
        if (shift || Math.abs(raw - nearest) <= 6) {
          snappedAngle = nearest % 360;
          snapped = true;
        }
        target.set('angle', snappedAngle);
        const center = target.getCenterPoint();
        const vpt = fc.viewportTransform || [1, 0, 0, 1, 0, 0];
        const sc = fabric.util.transformPoint(new fabric.Point(center.x, center.y), vpt);
        rotatingAngleHudRef.current = {
          angle: Math.round(snappedAngle),
          screenX: sc.x,
          screenY: Math.max(36, sc.y - 44),
          snapped,
        };
      }
      refreshSelectionInfo();
    });

    fc.on('mouse:dblclick', (opt: any) => {
      const mode = activeModeRef.current;
      if (
        (mode === 'polyline' || (mode === 'line' && closedContourRef.current)) &&
        contourPointsRef.current.length >= 2
      ) {
        commitContourPoints(closedContourRef.current && contourPointsRef.current.length >= 3);
        return;
      }
      const target = opt?.target;
      if (target && (target.type === 'i-text' || target.type === 'textbox')) {
        target.enterEditing();
        target.selectAll?.();
        fc.requestRenderAll();
      }
    });

    // Overlay rendering (Lasso, Bezier handles, Contour/Polyline preview, Corner nodes, Snap indicator, Rotation HUD)
    fc.on('after:render', () => {
      const ctx = fc.getContext();
      if (!ctx) return;
      const vpt = fc.viewportTransform || [1, 0, 0, 1, 0, 0];
      const retina = fc.getRetinaScaling ? fc.getRetinaScaling() : 1;

      if (isDrawingLassoRef.current && lassoPointsRef.current.length > 1) {
        drawLassoOverlayOnContext(ctx, lassoPointsRef.current, vpt, retina, fabric);
      }

      // Contour / Polyline preview with rubber-band cursor segment
      if (contourPointsRef.current.length > 0) {
        ctx.save();
        ctx.setTransform(retina, 0, 0, retina, 0, 0);
        const screenPts = contourPointsRef.current.map((p) =>
          fabric.util.transformPoint(new fabric.Point(p.x, p.y), vpt)
        );
        ctx.beginPath();
        ctx.moveTo(screenPts[0].x, screenPts[0].y);
        for (let i = 1; i < screenPts.length; i++) {
          ctx.lineTo(screenPts[i].x, screenPts[i].y);
        }
        ctx.strokeStyle = '#2563EB';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.stroke();

        if (polylineHoverPtRef.current) {
          const sh = fabric.util.transformPoint(
            new fabric.Point(polylineHoverPtRef.current.x, polylineHoverPtRef.current.y),
            vpt
          );
          const last = screenPts[screenPts.length - 1];
          ctx.beginPath();
          ctx.moveTo(last.x, last.y);
          ctx.lineTo(sh.x, sh.y);
          ctx.strokeStyle = 'rgba(37, 99, 235, 0.55)';
          ctx.lineWidth = 1.75;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
        }
        ctx.setLineDash([]);

        screenPts.forEach((sp, idx) => {
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, idx === 0 ? 6 : 4, 0, Math.PI * 2);
          ctx.fillStyle = idx === 0 ? '#10B981' : '#FFFFFF';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = idx === 0 ? '#FFFFFF' : '#2563EB';
          ctx.stroke();
        });
        ctx.restore();
      }

      // Bezier tangent handles right after drawing in Bezier mode
      if (activeModeRef.current === 'bezier' && bezierEditRef.current) {
        const { p1, cp1, cp2, p2 } = bezierEditRef.current;
        const sp1 = fabric.util.transformPoint(new fabric.Point(p1.x, p1.y), vpt);
        const scp1 = fabric.util.transformPoint(new fabric.Point(cp1.x, cp1.y), vpt);
        const scp2 = fabric.util.transformPoint(new fabric.Point(cp2.x, cp2.y), vpt);
        const sp2 = fabric.util.transformPoint(new fabric.Point(p2.x, p2.y), vpt);
        ctx.save();
        ctx.setTransform(retina, 0, 0, retina, 0, 0);
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(sp1.x, sp1.y);
        ctx.lineTo(scp1.x, scp1.y);
        ctx.moveTo(sp2.x, sp2.y);
        ctx.lineTo(scp2.x, scp2.y);
        ctx.stroke();
        ctx.setLineDash([]);
        [sp1, sp2].forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#2563EB';
          ctx.stroke();
        });
        [scp1, scp2].forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6.8, 0, Math.PI * 2);
          ctx.fillStyle = '#F59E0B';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#FFFFFF';
          ctx.stroke();
        });
        ctx.restore();
      }

      // Persistent cubic Bezier tangent handles (in Select mode or right after creation in Bezier mode)
      if (activeModeRef.current === 'select') {
        const activeObj = fc.getActiveObject();
        if (activeObj && activeObj.type !== 'activeSelection' && isBezierPathObject(activeObj)) {
          const bHandles = getObjectBezierControlHandles(activeObj);
          if (bHandles.length > 0) {
            ctx.save();
            ctx.setTransform(retina, 0, 0, retina, 0, 0);
            ctx.strokeStyle = 'rgba(37, 99, 235, 0.7)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            bHandles.forEach((h) => {
              const sa = fabric.util.transformPoint(new fabric.Point(h.anchor.x, h.anchor.y), vpt);
              const sp = fabric.util.transformPoint(new fabric.Point(h.point.x, h.point.y), vpt);
              ctx.moveTo(sa.x, sa.y);
              ctx.lineTo(sp.x, sp.y);
            });
            ctx.stroke();
            ctx.setLineDash([]);

            bHandles.forEach((h) => {
              const sp = fabric.util.transformPoint(new fabric.Point(h.point.x, h.point.y), vpt);
              const isDragging = Boolean(
                bezierHandleDragRef.current &&
                  bezierHandleDragRef.current.obj === activeObj &&
                  bezierHandleDragRef.current.segIndex === h.segIndex &&
                  bezierHandleDragRef.current.handle === h.kind
              );
              ctx.beginPath();
              ctx.arc(sp.x, sp.y, isDragging ? 7.6 : 6.4, 0, Math.PI * 2);
              ctx.fillStyle = '#F59E0B';
              ctx.fill();
              ctx.lineWidth = 2;
              ctx.strokeStyle = '#FFFFFF';
              ctx.stroke();
            });
            ctx.restore();
          }
        }
      }

      // Editable vertex nodes & corner rounding handles (green when tapped/selected)
      if (activeModeRef.current === 'select') {
        const activeObj = fc.getActiveObject();
        if (activeObj && activeObj.type !== 'activeSelection') {
          const editable = isObjectVertexEditable(activeObj);
          const roundable = isObjectCornerRoundable(activeObj);
          if (editable || roundable) {
            const verts = editable
              ? getObjectEditableWorldVertices(activeObj)
              : getObjectCornerWorldVertices(activeObj);
            if (verts.length > 0) {
              const hasSnapEpControls = Boolean(
                snapEnabledRef.current && isMergeableOpenLine(activeObj)
              );
              ctx.save();
              ctx.setTransform(retina, 0, 0, retina, 0, 0);
              verts.forEach((v, idx) => {
                const isSelectedVert = Boolean(
                  selectedVertexRef.current &&
                    selectedVertexRef.current.obj === activeObj &&
                    selectedVertexRef.current.index === idx
                );
                if (
                  !isSelectedVert &&
                  hasSnapEpControls &&
                  (idx === 0 || idx === verts.length - 1)
                ) {
                  return;
                }
                const sv = fabric.util.transformPoint(new fabric.Point(v.x, v.y), vpt);
                if (isSelectedVert) {
                  ctx.beginPath();
                  ctx.arc(sv.x, sv.y, 11.5, 0, Math.PI * 2);
                  ctx.fillStyle = 'rgba(16, 185, 129, 0.24)';
                  ctx.fill();

                  ctx.beginPath();
                  ctx.arc(sv.x, sv.y, 6.8, 0, Math.PI * 2);
                  ctx.fillStyle = '#10B981';
                  ctx.fill();
                  ctx.lineWidth = 2.2;
                  ctx.strokeStyle = '#FFFFFF';
                  ctx.stroke();

                  ctx.beginPath();
                  ctx.arc(sv.x, sv.y, 2, 0, Math.PI * 2);
                  ctx.fillStyle = '#FFFFFF';
                  ctx.fill();
                } else {
                  ctx.beginPath();
                  ctx.arc(sv.x, sv.y, cornerRoundDragRef.current ? 5.5 : 4.4, 0, Math.PI * 2);
                  ctx.fillStyle = cornerRoundDragRef.current ? '#F59E0B' : '#FFFFFF';
                  ctx.fill();
                  ctx.lineWidth = 1.8;
                  ctx.strokeStyle = '#F59E0B';
                  ctx.stroke();
                }
              });
              ctx.restore();
            }
          }
        }
      }

      // Endpoint snap indicator
      if (snapIndicatorRef.current) {
        const spt = fabric.util.transformPoint(
          new fabric.Point(snapIndicatorRef.current.x, snapIndicatorRef.current.y),
          vpt
        );
        ctx.save();
        ctx.setTransform(retina, 0, 0, retina, 0, 0);
        ctx.beginPath();
        ctx.arc(spt.x, spt.y, 9, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#10B981';
        ctx.stroke();
        ctx.restore();
      }

      // Live rotation angle snap badge
      if (rotatingAngleHudRef.current) {
        const hud = rotatingAngleHudRef.current;
        const label = `${hud.angle}°`;
        ctx.save();
        ctx.setTransform(retina, 0, 0, retina, 0, 0);
        ctx.font = '600 12px Inter, system-ui, sans-serif';
        const tw = ctx.measureText(label).width;
        const pw = tw + 16;
        const ph = 24;
        const rx = hud.screenX - pw / 2;
        const ry = hud.screenY - ph / 2;
        ctx.beginPath();
        ctx.roundRect(rx, ry, pw, ph, 8);
        ctx.fillStyle = hud.snapped ? '#059669' : '#0F172A';
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, hud.screenX, hud.screenY + 0.5);
        ctx.restore();
      }
    });

    // Mouse / Pointer handlers for shapes, lines, arrows, bezier, lasso, pan
    fc.on('mouse:down', (opt: any) => {
      const e = opt.e as MouseEvent | PointerEvent | TouchEvent;
      // Ignore multi-touch pinch
      if ('touches' in e && e.touches.length > 1) return;

      const button = 'button' in e ? e.button : 0;
      const isRightClick = button === 2 || opt.button === 3;
      if (isRightClick) {
        if ('pointerType' in e && e.pointerType === 'touch') return;
        lastRightClickOpenAtRef.current = Date.now();
        setIsToolbarOpen(true);
        setActivePopover((prev) => {
          const next = prev === 'shapes' ? null : 'shapes';
          trackFunction('toggle_shapes_context_menu', 'ui', {
            is_open: next === 'shapes',
          });
          return next;
        });
        return;
      }

      // Close open popover when clicking canvas to draw
      if (activePopoverRef.current) {
        setActivePopover(null);
      }

      const clientX = 'clientX' in e ? e.clientX : 0;
      const clientY = 'clientY' in e ? e.clientY : 0;

      if (button === 1 || spacePressedRef.current) {
        isPanningRef.current = true;
        panLastScreenRef.current = { x: clientX, y: clientY };
        fc.selection = false;
        fc.defaultCursor = 'grabbing';
        return;
      }

      const mode = activeModeRef.current;
      if (mode === 'select' || mode === 'brush' || mode === 'eraser') return;

      const worldPt = fc.getPointer(e);

      // Bezier active handle dragging (cp1, cp2, p1, p2)
      if (mode === 'bezier' && bezierEditRef.current) {
        const zoom = fc.getZoom() || 1;
        const hitR = 20 / zoom;
        const { p1, cp1, cp2, p2 } = bezierEditRef.current;
        if (Math.hypot(worldPt.x - cp1.x, worldPt.y - cp1.y) <= hitR) {
          bezierEditRef.current.draggingHandle = 'cp1';
          return;
        }
        if (Math.hypot(worldPt.x - cp2.x, worldPt.y - cp2.y) <= hitR) {
          bezierEditRef.current.draggingHandle = 'cp2';
          return;
        }
        if (Math.hypot(worldPt.x - p1.x, worldPt.y - p1.y) <= hitR) {
          bezierEditRef.current.draggingHandle = 'p1';
          return;
        }
        if (Math.hypot(worldPt.x - p2.x, worldPt.y - p2.y) <= hitR) {
          bezierEditRef.current.draggingHandle = 'p2';
          return;
        }
        // Clicked away: leave saved curve on canvas and start a new one
        bezierEditRef.current = null;
        snapIndicatorRef.current = null;
      }

      if (mode === 'lasso') {
        isDrawingLassoRef.current = true;
        lassoPointsRef.current = [{ x: worldPt.x, y: worldPt.y }];
        fc.requestRenderAll();
        return;
      }

      if (mode === 'polyline' || (mode === 'line' && closedContourRef.current)) {
        const pts = contourPointsRef.current;
        const zoom = fc.getZoom() || 1;
        let nextPt: Point2D = { x: worldPt.x, y: worldPt.y };
        if (snapEnabledRef.current) {
          const snap = findNearestEndpointSnap(
            fc,
            nextPt,
            [],
            zoom,
            pts.length >= 3 ? pts[0] : null,
            true
          );
          if (snap) {
            nextPt = snap.point;
            snapIndicatorRef.current = snap.point;
          }
        }
        if (pts.length >= 3) {
          const dFirst = Math.hypot(nextPt.x - pts[0].x, nextPt.y - pts[0].y);
          if (dFirst <= 18 / zoom) {
            commitContourPoints(true);
            return;
          }
        }
        if (pts.length > 0) {
          const last = pts[pts.length - 1];
          if (Math.hypot(nextPt.x - last.x, nextPt.y - last.y) < 3 / zoom) {
            return;
          }
        }
        polylineHoverPtRef.current = nextPt;
        setContourPoints((prev) => [...prev, nextPt]);
        fc.requestRenderAll();
        return;
      }

      const st = strokeRef.current;
      const fl = fillRef.current;
      const sw = st.width;
      const strokeRgba = sw > 0 ? applyColorOpacity(st.color, st.opacity) : null;
      const dash = getScaledDashArray(st.pattern, Math.max(1, sw));

      if (mode === 'line' || mode === 'bezier') {
        let startPt = { x: worldPt.x, y: worldPt.y };
        if (snapEnabledRef.current) {
          const snap = findNearestEndpointSnap(fc, startPt, [], fc.getZoom() || 1, null, true);
          if (snap) {
            startPt = snap.point;
            snapIndicatorRef.current = snap.point;
          }
        }
        const line = new fabric.Line([startPt.x, startPt.y, startPt.x, startPt.y], {
          stroke: strokeRgba || applyColorOpacity(st.color, st.opacity),
          strokeColorHex: st.color,
          strokeOpacity: st.opacity,
          strokeWidth: Math.max(1, sw),
          strokeDashArray: dash || undefined,
          strokePattern: st.pattern,
          doubleLine: st.doubleLine,
          strokeUniform: true,
          strokeLineCap: 'round',
          perPixelTargetFind: true,
          targetFindTolerance: 14,
          selectable: false,
          evented: false,
          cornerColor: '#2563EB',
          borderColor: '#2563EB',
        });
        fc.add(line);
        drawingShapeRef.current = { obj: line, startX: startPt.x, startY: startPt.y };
        return;
      }

      if (mode === 'arrow') {
        const arrow = createArrowObject(
          worldPt.x,
          worldPt.y,
          worldPt.x + 2,
          worldPt.y,
          st.color,
          sw,
          dash,
          st.doubleLine,
          arrowVariantRef.current,
          buildFillValue(fl),
          {
            selectable: false,
            evented: false,
            strokeColorHex: st.color,
            strokeOpacity: st.opacity,
            strokePattern: st.pattern,
            fillMeta: { ...fl },
          }
        );
        fc.add(arrow);
        drawingShapeRef.current = { obj: arrow, startX: worldPt.x, startY: worldPt.y };
        return;
      }

      if (mode === 'ellipse') {
        const ellipse = new fabric.Ellipse({
          left: worldPt.x,
          top: worldPt.y,
          rx: 1,
          ry: 1,
          fill: buildFillValue(fl, 10, 10),
          fillMeta: { ...fl },
          stroke: strokeRgba,
          strokeColorHex: st.color,
          strokeOpacity: st.opacity,
          strokeWidth: sw,
          strokeDashArray: dash || undefined,
          strokePattern: st.pattern,
          doubleLine: st.doubleLine,
          strokeUniform: true,
          originX: 'left',
          originY: 'top',
          selectable: false,
          evented: false,
          cornerColor: '#2563EB',
          borderColor: '#2563EB',
        });
        fc.add(ellipse);
        drawingShapeRef.current = { obj: ellipse, startX: worldPt.x, startY: worldPt.y };
        return;
      }

      if (mode === 'rect') {
        if (rectGridRef.current.enabled) {
          const grp = createGridRectGroup(
            fabric,
            worldPt.x,
            worldPt.y,
            10,
            10,
            rectGridRef.current.rows,
            rectGridRef.current.cols,
            st,
            fl
          );
          grp.set({ selectable: false, evented: false });
          fc.add(grp);
          drawingShapeRef.current = { obj: grp, startX: worldPt.x, startY: worldPt.y };
        } else {
          const rect = new fabric.Rect({
            left: worldPt.x,
            top: worldPt.y,
            width: 1,
            height: 1,
            fill: buildFillValue(fl, 10, 10),
            fillMeta: { ...fl },
            stroke: strokeRgba,
            strokeColorHex: st.color,
            strokeOpacity: st.opacity,
            strokeWidth: sw,
            strokeDashArray: dash || undefined,
            strokePattern: st.pattern,
            doubleLine: st.doubleLine,
            strokeUniform: true,
            originX: 'left',
            originY: 'top',
            selectable: false,
            evented: false,
            cornerColor: '#2563EB',
            borderColor: '#2563EB',
          });
          fc.add(rect);
          drawingShapeRef.current = { obj: rect, startX: worldPt.x, startY: worldPt.y };
        }
        return;
      }

      if (mode === 'triangle') {
        const tri = new fabric.Triangle({
          left: worldPt.x,
          top: worldPt.y,
          width: 1,
          height: 1,
          fill: buildFillValue(fl, 10, 10),
          fillMeta: { ...fl },
          stroke: strokeRgba,
          strokeColorHex: st.color,
          strokeOpacity: st.opacity,
          strokeWidth: sw,
          strokeDashArray: dash || undefined,
          strokePattern: st.pattern,
          doubleLine: st.doubleLine,
          strokeUniform: true,
          originX: 'left',
          originY: 'top',
          selectable: false,
          evented: false,
          cornerColor: '#2563EB',
          borderColor: '#2563EB',
        });
        fc.add(tri);
        drawingShapeRef.current = { obj: tri, startX: worldPt.x, startY: worldPt.y };
        return;
      }

      if (mode === 'star') {
        const pts = buildPolygonPoints(polygonVariantRef.current, 0, 0, 1, 1);
        const poly = new fabric.Polygon(pts, {
          left: worldPt.x,
          top: worldPt.y,
          fill: buildFillValue(fl, 10, 10),
          fillMeta: { ...fl },
          stroke: strokeRgba,
          strokeColorHex: st.color,
          strokeOpacity: st.opacity,
          strokeWidth: sw,
          strokeDashArray: dash || undefined,
          strokePattern: st.pattern,
          doubleLine: st.doubleLine,
          strokeUniform: true,
          strokeLineJoin: 'round',
          isPolygonMorphable: true,
          polygonVariant: polygonVariantRef.current,
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false,
          cornerColor: '#2563EB',
          borderColor: '#2563EB',
        });
        fc.add(poly);
        drawingShapeRef.current = { obj: poly, startX: worldPt.x, startY: worldPt.y };
      }
    });

    fc.on('mouse:move', (opt: any) => {
      const e = opt.e as MouseEvent | PointerEvent;
      if (isPanningRef.current && panLastScreenRef.current) {
        const cx = 'clientX' in e ? e.clientX : panLastScreenRef.current.x;
        const cy = 'clientY' in e ? e.clientY : panLastScreenRef.current.y;
        const dx = cx - panLastScreenRef.current.x;
        const dy = cy - panLastScreenRef.current.y;
        panLastScreenRef.current = { x: cx, y: cy };
        fc.relativePan(new fabric.Point(dx, dy));
        redrawBackground();
        return;
      }

      const mode = activeModeRef.current;
      const worldPt = fc.getPointer(e);

      const dragHandle = bezierEditRef.current?.draggingHandle;
      if (mode === 'bezier' && dragHandle && bezierEditRef.current) {
        const edit = bezierEditRef.current;
        const zoom = fc.getZoom() || 1;
        let nextPt: Point2D = { x: worldPt.x, y: worldPt.y };

        if (dragHandle === 'p1' || dragHandle === 'p2') {
          if (snapEnabledRef.current) {
            const snap = findNearestEndpointSnap(
              fc,
              nextPt,
              [edit.pathObj],
              zoom,
              dragHandle === 'p1' ? edit.p2 : edit.p1,
              true
            );
            if (snap) {
              nextPt = snap.point;
              snapIndicatorRef.current = snap.point;
            } else {
              snapIndicatorRef.current = null;
            }
          } else {
            snapIndicatorRef.current = null;
          }

          if (dragHandle === 'p1') {
            const dx = nextPt.x - edit.p1.x;
            const dy = nextPt.y - edit.p1.y;
            edit.p1 = nextPt;
            edit.cp1 = { x: edit.cp1.x + dx, y: edit.cp1.y + dy };
          } else {
            const dx = nextPt.x - edit.p2.x;
            const dy = nextPt.y - edit.p2.y;
            edit.p2 = nextPt;
            edit.cp2 = { x: edit.cp2.x + dx, y: edit.cp2.y + dy };
          }
        } else {
          snapIndicatorRef.current = null;
          edit[dragHandle] = nextPt;
        }

        const isClosed = Boolean(edit.pathObj.isClosedContour || hasPathCloseCommand(edit.pathObj));
        const cmds = segmentsToPathCommands(
          [
            {
              type: 'C',
              from: edit.p1,
              cp1: edit.cp1,
              cp2: edit.cp2,
              to: edit.p2,
            },
          ],
          isClosed
        );
        edit.pathObj.set({
          isBezierCurve: true,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          flipX: false,
          flipY: false,
          skewX: 0,
          skewY: 0,
          originX: 'left',
          originY: 'top',
          dirty: true,
        });
        if (typeof edit.pathObj._setPath === 'function') {
          edit.pathObj._setPath(cmds);
        } else {
          edit.pathObj.set({ path: cmds });
        }
        edit.pathObj.basePathCommands = cmds.map((c: any[]) => [...c]);
        edit.pathObj.baseWidth = edit.pathObj.width;
        edit.pathObj.baseHeight = edit.pathObj.height;
        edit.pathObj.basePathOffset = {
          x: edit.pathObj.pathOffset?.x || 0,
          y: edit.pathObj.pathOffset?.y || 0,
        };
        if (edit.pathObj.fillMeta?.mode === 'photo') {
          refreshObjectPhotoFill(edit.pathObj, fc);
        }
        edit.pathObj.set({ dirty: true });
        edit.pathObj.setCoords();
        fc.requestRenderAll();
        return;
      }

      if (
        (mode === 'polyline' || (mode === 'line' && closedContourRef.current)) &&
        contourPointsRef.current.length > 0
      ) {
        const pts = contourPointsRef.current;
        const zoom = fc.getZoom() || 1;
        let hoverPt: Point2D = { x: worldPt.x, y: worldPt.y };
        if (snapEnabledRef.current) {
          const snap = findNearestEndpointSnap(
            fc,
            hoverPt,
            [],
            zoom,
            pts.length >= 3 ? pts[0] : null,
            true
          );
          if (snap) {
            hoverPt = snap.point;
            snapIndicatorRef.current = snap.point;
          } else {
            snapIndicatorRef.current = null;
          }
        } else {
          snapIndicatorRef.current = null;
        }
        polylineHoverPtRef.current = hoverPt;
        fc.requestRenderAll();
        return;
      }

      if (mode === 'lasso' && isDrawingLassoRef.current) {
        const pts = lassoPointsRef.current;
        const last = pts[pts.length - 1];
        if (!last || Math.hypot(worldPt.x - last.x, worldPt.y - last.y) >= 3) {
          pts.push({ x: worldPt.x, y: worldPt.y });
        }
        return;
      }

      const ds = drawingShapeRef.current;
      if (!ds) return;
      const { obj, startX, startY } = ds;

      if (mode === 'line' || mode === 'bezier') {
        let endPt = { x: worldPt.x, y: worldPt.y };
        if (snapEnabledRef.current) {
          const snap = findNearestEndpointSnap(
            fc,
            endPt,
            [obj],
            fc.getZoom() || 1,
            null,
            true
          );
          if (snap) {
            endPt = snap.point;
            snapIndicatorRef.current = snap.point;
          } else {
            snapIndicatorRef.current = null;
          }
        }
        obj.set({ x2: endPt.x, y2: endPt.y });
        obj.setCoords();
        fc.requestRenderAll();
        return;
      }

      if (mode === 'arrow') {
        const st = strokeRef.current;
        const fl = fillRef.current;
        const dash = getScaledDashArray(st.pattern, Math.max(1, st.width));
        const nextArrow = createArrowObject(
          startX,
          startY,
          worldPt.x,
          worldPt.y,
          st.color,
          st.width,
          dash,
          st.doubleLine,
          arrowVariantRef.current,
          buildFillValue(fl),
          {
            selectable: false,
            evented: false,
            strokeColorHex: st.color,
            strokeOpacity: st.opacity,
            strokePattern: st.pattern,
            fillMeta: { ...fl },
          }
        );
        fc.remove(obj);
        fc.add(nextArrow);
        ds.obj = nextArrow;
        fc.requestRenderAll();
        return;
      }

      const left = Math.min(startX, worldPt.x);
      const top = Math.min(startY, worldPt.y);
      const width = Math.max(2, Math.abs(worldPt.x - startX));
      const height = Math.max(2, Math.abs(worldPt.y - startY));

      if (mode === 'ellipse') {
        obj.set({ left, top, rx: width / 2, ry: height / 2 });
        obj.setCoords();
      } else if (mode === 'rect') {
        if (rectGridRef.current.enabled) {
          const nextGrp = createGridRectGroup(
            fabric,
            left,
            top,
            width,
            height,
            rectGridRef.current.rows,
            rectGridRef.current.cols,
            strokeRef.current,
            fillRef.current
          );
          nextGrp.set({ selectable: false, evented: false });
          fc.remove(obj);
          fc.add(nextGrp);
          ds.obj = nextGrp;
        } else {
          obj.set({ left, top, width, height });
          obj.setCoords();
        }
      } else if (mode === 'triangle') {
        obj.set({ left, top, width, height });
        obj.setCoords();
      } else if (mode === 'star') {
        const pts = buildPolygonPoints(
          polygonVariantRef.current,
          0,
          0,
          Math.max(4, width / 2),
          Math.max(4, height / 2)
        );
        const st = strokeRef.current;
        const fl = fillRef.current;
        const sw = st.width;
        const dash = getScaledDashArray(st.pattern, Math.max(1, sw));
        const nextPoly = new fabric.Polygon(pts, {
          left: left + width / 2,
          top: top + height / 2,
          fill: buildFillValue(fl, width, height),
          fillMeta: { ...fl },
          stroke: sw > 0 ? applyColorOpacity(st.color, st.opacity) : null,
          strokeColorHex: st.color,
          strokeOpacity: st.opacity,
          strokeWidth: sw,
          strokeDashArray: dash || undefined,
          strokePattern: st.pattern,
          doubleLine: st.doubleLine,
          strokeUniform: true,
          strokeLineJoin: 'round',
          isPolygonMorphable: true,
          polygonVariant: polygonVariantRef.current,
          baseLocalPoints: pts.map((p) => ({ x: p.x, y: p.y })),
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false,
          cornerColor: '#2563EB',
          borderColor: '#2563EB',
        });
        nextPoly.baseWidth = nextPoly.width;
        nextPoly.baseHeight = nextPoly.height;
        nextPoly.basePathOffset = {
          x: nextPoly.pathOffset?.x || 0,
          y: nextPoly.pathOffset?.y || 0,
        };
        fc.remove(obj);
        fc.add(nextPoly);
        ds.obj = nextPoly;
      }

      fc.requestRenderAll();
    });

    fc.on('mouse:up', () => {
      rotatingAngleHudRef.current = null;

      if (isPanningRef.current) {
        isPanningRef.current = false;
        panLastScreenRef.current = null;
        fc.selection = activeModeRef.current === 'select';
        fc.defaultCursor = activeModeRef.current === 'select' ? 'default' : 'crosshair';
        return;
      }

      const mode = activeModeRef.current;
      if (mode === 'bezier' && bezierEditRef.current?.draggingHandle) {
        const edit = bezierEditRef.current;
        const dragged = edit.draggingHandle;
        edit.draggingHandle = null;
        snapIndicatorRef.current = null;
        edit.pathObj.set({ dirty: true });
        edit.pathObj.setCoords();
        if (
          (dragged === 'p1' || dragged === 'p2') &&
          !edit.pathObj.isClosedContour &&
          snapEnabledRef.current
        ) {
          const merged = mergeObjectWithEndpointSnaps(fc, edit.pathObj, fillRef.current);
          if (merged) {
            bezierEditRef.current = null;
          }
        }
        fc.requestRenderAll();
        pushHistory();
        return;
      }

      if (mode === 'lasso' && isDrawingLassoRef.current) {
        isDrawingLassoRef.current = false;
        const pts = [...lassoPointsRef.current];
        lassoPointsRef.current = [];
        fc.requestRenderAll();
        if (pts.length >= 3) {
          void extractLassoFragment(fc, pts, (frag) => {
            if (frag) {
              setActiveMode('select');
              fc.setActiveObject(frag);
              refreshSelectionInfo();
              pushHistory();
            }
          });
        }
        return;
      }

      const ds = drawingShapeRef.current;
      if (!ds) return;
      drawingShapeRef.current = null;
      const { obj, startX, startY } = ds;

      if (mode === 'bezier') {
        const x2 = obj.x2 ?? startX;
        const y2 = obj.y2 ?? startY;
        fc.remove(obj);
        snapIndicatorRef.current = null;
        if (Math.hypot(x2 - startX, y2 - startY) < 6) {
          fc.requestRenderAll();
          return;
        }
        const st = strokeRef.current;
        const dx = x2 - startX;
        const dy = y2 - startY;
        const p1 = { x: startX, y: startY };
        const p2 = { x: x2, y: y2 };
        const cp1 = { x: startX + dx * 0.28, y: startY + dy * 0.28 };
        const cp2 = { x: startX + dx * 0.72, y: startY + dy * 0.72 };
        const closed = closedContourRef.current;
        const pathObj = buildFabricPathFromWorldSegments(
          [{ type: 'C', from: p1, cp1, cp2, to: p2 }],
          {
            stroke: st.width > 0 ? applyColorOpacity(st.color, st.opacity) : null,
            strokeColorHex: st.color,
            strokeOpacity: st.opacity,
            strokeWidth: Math.max(1, st.width),
            strokeDashArray: getScaledDashArray(st.pattern, Math.max(1, st.width)) || undefined,
            strokePattern: st.pattern,
            doubleLine: st.doubleLine,
            brushType: 'standard',
            isBezierCurve: true,
          },
          closed,
          fillRef.current,
          true
        );
        if (pathObj) {
          fc.add(pathObj);
          bezierEditRef.current = { pathObj, p1, cp1, cp2, p2, draggingHandle: null };
          fc.requestRenderAll();
          pushHistory();
        }
        return;
      }

      // Discard tiny accidental clicks
      if (mode === 'line') {
        const len = Math.hypot((obj.x2 ?? startX) - startX, (obj.y2 ?? startY) - startY);
        if (len < 3) {
          fc.remove(obj);
          snapIndicatorRef.current = null;
          fc.requestRenderAll();
          return;
        }
        obj.set({ selectable: true, evented: true });
        if (snapEnabledRef.current) {
          mergeObjectWithEndpointSnaps(fc, obj, fillRef.current);
        }
        snapIndicatorRef.current = null;
        fc.requestRenderAll();
        pushHistory();
        return;
      }

      if ((obj.width || 0) < 3 && (obj.height || 0) < 3 && !obj.isArrowObject && !obj.isArrowGroup) {
        fc.remove(obj);
        fc.requestRenderAll();
        return;
      }

      obj.set({ selectable: true, evented: true });
      applyFillToObject(obj, fillRef.current, fc);
      obj.setCoords();
      fc.requestRenderAll();
      pushHistory();
    });

    // Wheel zoom (and touchpad pan)
    fc.on('mouse:wheel', (opt: any) => {
      const e = opt.e as WheelEvent;
      e.preventDefault();
      e.stopPropagation();

      if (e.ctrlKey || Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
        const zoom = fc.getZoom() || 1;
        const factor = Math.pow(0.9985, e.deltaY);
        const nextZoom = Math.min(8, Math.max(0.15, zoom * factor));
        fc.zoomToPoint(new fabric.Point(e.offsetX, e.offsetY), nextZoom);
        setZoomPercent(Math.round(nextZoom * 100));
        redrawBackground();
        refreshSelectionInfo();
      } else {
        fc.relativePan(new fabric.Point(-e.deltaX, -e.deltaY));
        redrawBackground();
        refreshSelectionInfo();
      }
    });

    // Resize listener
    const handleResize = () => {
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      fc.setWidth(nw);
      fc.setHeight(nh);
      if (canvasSizeRef.current.preset === 'fullscreen') {
        setCanvasSize((prev) =>
          prev.preset === 'fullscreen' ? { preset: 'fullscreen', width: nw, height: nh } : prev
        );
      }
      redrawBackground();
      fc.requestRenderAll();
      refreshSelectionInfo();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      fc.dispose();
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render background whenever bgConfig or canvasSize changes
  useEffect(() => {
    applyClipForArtboard();
    redrawBackground();
  }, [bgConfig, canvasSize, applyClipForArtboard, redrawBackground]);

  // Native pointer listeners for textured brushes, long-press vertex corner rounding, and 2-finger pinch/pan
  useEffect(() => {
    const el = containerRef.current;
    const fc = fabricRef.current;
    const fabric = getFabric();
    if (!el || !fc || !fabric) return;

    const clearPreview = () => {
      const prevCanvas = brushPreviewCanvasRef.current;
      if (!prevCanvas) return;
      const pctx = prevCanvas.getContext('2d');
      pctx?.clearRect(0, 0, prevCanvas.width, prevCanvas.height);
    };

    const syncPreviewFromBuffer = () => {
      const prevCanvas = brushPreviewCanvasRef.current;
      const bufCanvas = brushBufferRef.current;
      if (!prevCanvas || !bufCanvas) return;
      if (prevCanvas.width !== bufCanvas.width || prevCanvas.height !== bufCanvas.height) {
        prevCanvas.width = bufCanvas.width;
        prevCanvas.height = bufCanvas.height;
      }
      const pctx = prevCanvas.getContext('2d');
      if (!pctx) return;
      pctx.clearRect(0, 0, prevCanvas.width, prevCanvas.height);
      pctx.drawImage(bufCanvas, 0, 0);
    };

    const screenToWorld = (clientX: number, clientY: number, vpt: number[]): Point2D => {
      const rect = el.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      const inv = fabric.util.invertTransform(vpt);
      const wp = fabric.util.transformPoint(new fabric.Point(sx, sy), inv);
      return { x: wp.x, y: wp.y };
    };

    const worldToClient = (wx: number, wy: number, vpt: number[]): Point2D => {
      const rect = el.getBoundingClientRect();
      const sp = fabric.util.transformPoint(new fabric.Point(wx, wy), vpt);
      return { x: sp.x + rect.left, y: sp.y + rect.top };
    };

    const restoreObjLocks = (
      obj: any,
      locks: {
        prevLockX: boolean;
        prevLockY: boolean;
        prevLockScaleX: boolean;
        prevLockScaleY: boolean;
        prevLockRot: boolean;
        prevHasControls: boolean;
      } | null
    ) => {
      if (!obj || !locks) return;
      obj.set({
        lockMovementX: locks.prevLockX,
        lockMovementY: locks.prevLockY,
        lockScalingX: locks.prevLockScaleX,
        lockScalingY: locks.prevLockScaleY,
        lockRotation: locks.prevLockRot,
        hasControls: locks.prevHasControls,
      });
    };

    const cancelCornerPending = () => {
      if (cornerLongPressTimerRef.current !== null) {
        window.clearTimeout(cornerLongPressTimerRef.current);
        cornerLongPressTimerRef.current = null;
      }
      cornerPendingRef.current = null;
    };

    const cancelVertexPending = () => {
      if (vertexPendingRef.current?.prevLocks) {
        restoreObjLocks(vertexPendingRef.current.obj, vertexPendingRef.current.prevLocks);
      }
      vertexPendingRef.current = null;
    };

    const commitActiveTexturedStroke = () => {
      const active = brushSessionRef.current;
      const bufCanvas = brushBufferRef.current;
      if (!active || !bufCanvas) return;
      brushSessionRef.current = null;

      let finalEndWorld = active.lastWorld;
      const bctx = bufCanvas.getContext('2d');
      if (bctx) {
        if (snapEnabledRef.current) {
          const snapEnd = findNearestEndpointSnap(
            fc,
            active.lastWorld,
            [],
            fc.getZoom() || 1,
            active.startWorld,
            true
          );
          if (snapEnd) {
            finalEndWorld = snapEnd.point;
            drawSegment(
              bctx,
              active.session,
              {
                x: finalEndWorld.x,
                y: finalEndWorld.y,
                pressure: 0.5,
                time: performance.now(),
              },
              active.pointerType
            );
          }
        }
        finishStroke(bctx, active.session, active.pointerType);
      }
      snapIndicatorRef.current = null;
      fc.requestRenderAll();

      const cropped = cropOpaqueCanvasBounds(bufCanvas, 3);
      clearPreview();
      if (!cropped || cropped.width < 2 || cropped.height < 2) return;

      const { dpr, vpt } = active;
      const scaleX = 1 / (dpr * vpt[0]);
      const scaleY = 1 / (dpr * vpt[3]);
      const worldLeft = (cropped.minX / dpr - vpt[4]) / vpt[0];
      const worldTop = (cropped.minY / dpr - vpt[5]) / vpt[3];

      fabric.Image.fromURL(
        cropped.dataUrl,
        (img: any) => {
          if (!img) return;
          const ratioX = img.width ? cropped.width / img.width : 1;
          const ratioY = img.height ? cropped.height / img.height : 1;
          img.set({
            left: worldLeft,
            top: worldTop,
            scaleX: scaleX * ratioX,
            scaleY: scaleY * ratioY,
            originX: 'left',
            originY: 'top',
            isTexturedBrushStroke: true,
            worldEndpoints: {
              start: active.startWorld,
              end: finalEndWorld,
            },
            brushType: active.session.preset,
            strokeColorHex: active.session.color,
            strokeOpacity: active.session.opacity,
            strokeWidth: active.session.size,
            perPixelTargetFind: true,
            targetFindTolerance: 14,
            cornerColor: '#2563EB',
            borderColor: '#2563EB',
            selectable: true,
            evented: true,
          });
          fc.add(img);
          fc.requestRenderAll();
          pushHistory();
        },
        { crossOrigin: 'anonymous' }
      );
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        activeTouchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (activeTouchesRef.current.size === 2) {
          cancelCornerPending();
          // Cancel single-finger textured stroke on second finger down -> switch to pinch/pan
          if (brushSessionRef.current) {
            brushSessionRef.current = null;
            clearPreview();
            snapIndicatorRef.current = null;
          }
          const pts = Array.from(activeTouchesRef.current.values());
          const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
          touchPinchRef.current = {
            active: true,
            dist: Math.max(10, dist),
            midX: (pts[0].x + pts[1].x) / 2,
            midY: (pts[0].y + pts[1].y) / 2,
          };
          fc.isDrawingMode = false;
          return;
        }
      }

      if (e.button !== 0 || spacePressedRef.current) return;

      const targetEl = e.target as HTMLElement | null;
      if (targetEl && targetEl.tagName !== 'CANVAS') return;

      // Persistent Bezier tangent handles + tap-to-select green vertex + long-press corner rounding in Select mode
      if (activeModeRef.current === 'select') {
        const activeObj = fc.getActiveObject();

        // Priority 1: Bezier tangent handles (orange circles) on any selected Bezier curve
        if (activeObj && activeObj.type !== 'activeSelection' && isBezierPathObject(activeObj)) {
          const vpt = fc.viewportTransform || [1, 0, 0, 1, 0, 0];
          const bHandles = getObjectBezierControlHandles(activeObj);
          let bestHandle: (typeof bHandles)[number] | null = null;
          let bestHandleDist = 23;
          bHandles.forEach((h) => {
            const sc = worldToClient(h.point.x, h.point.y, vpt);
            const d = Math.hypot(e.clientX - sc.x, e.clientY - sc.y);
            if (d <= bestHandleDist) {
              bestHandleDist = d;
              bestHandle = h;
            }
          });
          if (bestHandle) {
            const picked = bestHandle as (typeof bHandles)[number];
            cancelCornerPending();
            cancelVertexPending();
            if (fc._currentTransform) {
              fc._currentTransform = null;
            }
            const locks = {
              prevLockX: Boolean(activeObj.lockMovementX),
              prevLockY: Boolean(activeObj.lockMovementY),
              prevLockScaleX: Boolean(activeObj.lockScalingX),
              prevLockScaleY: Boolean(activeObj.lockScalingY),
              prevLockRot: Boolean(activeObj.lockRotation),
              prevHasControls: activeObj.hasControls !== false,
            };
            activeObj.set({
              lockMovementX: true,
              lockMovementY: true,
              lockScalingX: true,
              lockScalingY: true,
              lockRotation: true,
              hasControls: false,
            });
            bezierHandleDragRef.current = {
              obj: activeObj,
              segIndex: picked.segIndex,
              handle: picked.kind,
              pointerId: e.pointerId,
              prevLocks: locks,
            };
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            fc.requestRenderAll();
            return;
          }
        }

        const editable =
          activeObj && activeObj.type !== 'activeSelection' && isObjectVertexEditable(activeObj);
        const roundable =
          activeObj && activeObj.type !== 'activeSelection' && isObjectCornerRoundable(activeObj);

        if (activeObj && activeObj.type !== 'activeSelection' && (editable || roundable)) {
          const vpt = fc.viewportTransform || [1, 0, 0, 1, 0, 0];
          const verts = editable
            ? getObjectEditableWorldVertices(activeObj)
            : getObjectCornerWorldVertices(activeObj);

          let nearestIdx = -1;
          let nearestDist = 23;
          verts.forEach((v, idx) => {
            const sc = worldToClient(v.x, v.y, vpt);
            const d = Math.hypot(e.clientX - sc.x, e.clientY - sc.y);
            if (d <= nearestDist) {
              nearestDist = d;
              nearestIdx = idx;
            }
          });

          if (nearestIdx === -1) {
            if (selectedVertexRef.current) {
              selectedVertexRef.current = null;
              fc.requestRenderAll();
            }
            return;
          }

          cancelCornerPending();
          cancelVertexPending();

          const isOpenPath =
            activeObj.type === 'line' ||
            (activeObj.type === 'path' &&
              !activeObj.isClosedContour &&
              !hasPathCloseCommand(activeObj));
          const isOpenLineEnd =
            isOpenPath && (nearestIdx === 0 || nearestIdx === verts.length - 1);
          const wasAlreadySelected = Boolean(
            editable &&
              selectedVertexRef.current &&
              selectedVertexRef.current.obj === activeObj &&
              selectedVertexRef.current.index === nearestIdx
          );

          const locks = {
            prevLockX: Boolean(activeObj.lockMovementX),
            prevLockY: Boolean(activeObj.lockMovementY),
            prevLockScaleX: Boolean(activeObj.lockScalingX),
            prevLockScaleY: Boolean(activeObj.lockScalingY),
            prevLockRot: Boolean(activeObj.lockRotation),
            prevHasControls: activeObj.hasControls !== false,
          };

          if (wasAlreadySelected) {
            if (fc._currentTransform) {
              fc._currentTransform = null;
            }
            activeObj.set({
              lockMovementX: true,
              lockMovementY: true,
              lockScalingX: true,
              lockScalingY: true,
              lockRotation: true,
              hasControls: false,
            });
          }

          if (editable) {
            vertexPendingRef.current = {
              obj: activeObj,
              index: nearestIdx,
              pointerId: e.pointerId,
              startScreenX: e.clientX,
              startScreenY: e.clientY,
              wasAlreadySelected,
              isOpenLineEnd,
              prevLocks: wasAlreadySelected ? locks : null,
            };
          }

          if (roundable && !isOpenLineEnd) {
            const centerWorld = activeObj.getCenterPoint();
            const centerScreen = worldToClient(centerWorld.x, centerWorld.y, vpt);
            const startDist = Math.max(
              20,
              Math.hypot(e.clientX - centerScreen.x, e.clientY - centerScreen.y)
            );
            const startRatio = getObjectCornerRoundRatio(activeObj) ?? 0;

            cornerPendingRef.current = {
              obj: activeObj,
              pointerId: e.pointerId,
              startScreenX: e.clientX,
              startScreenY: e.clientY,
              centerScreen,
              startDist,
              startRatio,
              prevLocks: locks,
            };

            cornerLongPressTimerRef.current = window.setTimeout(() => {
              const pending = cornerPendingRef.current;
              cornerLongPressTimerRef.current = null;
              cornerPendingRef.current = null;
              if (!pending) return;

              // Transfer ownership cleanly without prematurely unlocking
              vertexPendingRef.current = null;

              if (fc._currentTransform) {
                fc._currentTransform = null;
              }
              const obj = pending.obj;
              const objLocks = pending.prevLocks || {
                prevLockX: Boolean(obj.lockMovementX),
                prevLockY: Boolean(obj.lockMovementY),
                prevLockScaleX: Boolean(obj.lockScalingX),
                prevLockScaleY: Boolean(obj.lockScalingY),
                prevLockRot: Boolean(obj.lockRotation),
                prevHasControls: obj.hasControls !== false,
              };
              obj.set({
                lockMovementX: true,
                lockMovementY: true,
                lockScalingX: true,
                lockScalingY: true,
                lockRotation: true,
                hasControls: false,
              });
              cornerRoundDragRef.current = {
                obj,
                pointerId: pending.pointerId,
                centerScreen: pending.centerScreen,
                startDist: pending.startDist,
                startRatio: pending.startRatio,
                ...objLocks,
              };
              if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
                navigator.vibrate(18);
              }
              setCornerRoundHudRatio(Math.round(pending.startRatio * 100));
              fc.requestRenderAll();
            }, 360);
          }
        } else if (selectedVertexRef.current) {
          selectedVertexRef.current = null;
          fc.requestRenderAll();
        }
        return;
      }

      if (activeModeRef.current !== 'brush') return;
      const st = strokeRef.current;
      if (!isTexturedBrush(st.brushType)) return;

      if (activePopoverRef.current) {
        setActivePopover(null);
      }

      const vpt = [...(fc.viewportTransform || [1, 0, 0, 1, 0, 0])];
      const vw = el.clientWidth || window.innerWidth;
      const vh = el.clientHeight || window.innerHeight;
      const dpr = Math.min(2.5, Math.max(2, window.devicePixelRatio || 1));

      if (!brushBufferRef.current) {
        brushBufferRef.current = document.createElement('canvas');
      }
      const buf = brushBufferRef.current;
      buf.width = Math.round(vw * dpr);
      buf.height = Math.round(vh * dpr);

      const ctx = buf.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);

      let worldPt = screenToWorld(e.clientX, e.clientY, vpt);
      if (snapEnabledRef.current) {
        const snapStart = findNearestEndpointSnap(
          fc,
          worldPt,
          [],
          fc.getZoom() || 1,
          null,
          true
        );
        if (snapStart) {
          worldPt = snapStart.point;
          snapIndicatorRef.current = snapStart.point;
          fc.requestRenderAll();
        }
      }

      const session = beginStroke(
        ctx,
        {
          x: worldPt.x,
          y: worldPt.y,
          pressure: e.pressure,
          time: e.timeStamp || performance.now(),
        },
        e.pointerType,
        'brush',
        st.brushType,
        st.color,
        Math.max(2, st.width),
        Math.max(0.05, st.opacity)
      );

      brushSessionRef.current = {
        session,
        pointerId: e.pointerId,
        dpr,
        vpt,
        pointerType: e.pointerType,
        startWorld: { x: worldPt.x, y: worldPt.y },
        lastWorld: { x: worldPt.x, y: worldPt.y },
      };
      syncPreviewFromBuffer();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch' && activeTouchesRef.current.has(e.pointerId)) {
        activeTouchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (touchPinchRef.current?.active && activeTouchesRef.current.size >= 2) {
          const pts = Array.from(activeTouchesRef.current.values());
          const newDist = Math.max(10, Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y));
          const newMidX = (pts[0].x + pts[1].x) / 2;
          const newMidY = (pts[0].y + pts[1].y) / 2;

          const prev = touchPinchRef.current;
          const dx = newMidX - prev.midX;
          const dy = newMidY - prev.midY;
          fc.relativePan(new fabric.Point(dx, dy));

          const scaleRatio = newDist / prev.dist;
          const nextZoom = Math.min(8, Math.max(0.15, (fc.getZoom() || 1) * scaleRatio));
          fc.zoomToPoint(new fabric.Point(newMidX, newMidY), nextZoom);
          setZoomPercent(Math.round(nextZoom * 100));

          prev.dist = newDist;
          prev.midX = newMidX;
          prev.midY = newMidY;
          redrawBackground();
          return;
        }
      }

      if (
        bezierHandleDragRef.current &&
        bezierHandleDragRef.current.pointerId === e.pointerId
      ) {
        e.preventDefault();
        e.stopPropagation();
        if (fc._currentTransform) {
          fc._currentTransform = null;
        }
        const drag = bezierHandleDragRef.current;
        const vpt = fc.viewportTransform || [1, 0, 0, 1, 0, 0];
        const worldPt = screenToWorld(e.clientX, e.clientY, vpt);
        updateObjectBezierHandle(fc, drag.obj, drag.segIndex, drag.handle, worldPt);
        fc.requestRenderAll();
        refreshSelectionInfo();
        return;
      }

      if (
        vertexPendingRef.current &&
        vertexPendingRef.current.pointerId === e.pointerId
      ) {
        const vp = vertexPendingRef.current;
        const dMoved = Math.hypot(e.clientX - vp.startScreenX, e.clientY - vp.startScreenY);
        if (dMoved > 5) {
          cancelCornerPending();
          if (vp.wasAlreadySelected && vp.prevLocks) {
            if (fc._currentTransform) {
              fc._currentTransform = null;
            }
            vertexDragRef.current = {
              obj: vp.obj,
              index: vp.index,
              pointerId: vp.pointerId,
              isOpenLineEnd: vp.isOpenLineEnd,
              prevLocks: vp.prevLocks,
            };
            vertexPendingRef.current = null;
          } else if (dMoved > 8) {
            cancelVertexPending();
          }
        }
      }

      if (
        vertexDragRef.current &&
        vertexDragRef.current.pointerId === e.pointerId
      ) {
        e.preventDefault();
        e.stopPropagation();
        if (fc._currentTransform) {
          fc._currentTransform = null;
        }
        const drag = vertexDragRef.current;
        const vpt = fc.viewportTransform || [1, 0, 0, 1, 0, 0];
        let worldPt = screenToWorld(e.clientX, e.clientY, vpt);

        if (
          snapEnabledRef.current &&
          drag.isOpenLineEnd &&
          isMergeableOpenLine(drag.obj)
        ) {
          const verts = getObjectEditableWorldVertices(drag.obj);
          const segCount =
            drag.obj.type === 'path' ? extractWorldPathSegmentsForEdit(drag.obj).length : 1;
          const selfOther =
            verts.length >= 2 && segCount >= 2
              ? drag.index === 0
                ? verts[verts.length - 1]
                : verts[0]
              : null;
          const match = findNearestEndpointSnap(
            fc,
            worldPt,
            [drag.obj],
            fc.getZoom() || 1,
            selfOther,
            true
          );
          if (match) {
            worldPt = match.point;
            snapIndicatorRef.current = match.point;
          } else {
            snapIndicatorRef.current = null;
          }
        } else {
          snapIndicatorRef.current = null;
        }

        const nextObj = updateObjectEditableVertex(fc, drag.obj, drag.index, worldPt);
        if (nextObj && nextObj !== drag.obj) {
          nextObj.set({
            lockMovementX: true,
            lockMovementY: true,
            lockScalingX: true,
            lockScalingY: true,
            lockRotation: true,
            hasControls: false,
          });
          drag.obj = nextObj;
        }
        selectedVertexRef.current = { obj: drag.obj, index: drag.index };
        fc.requestRenderAll();
        refreshSelectionInfo();
        return;
      }

      if (
        cornerPendingRef.current &&
        cornerPendingRef.current.pointerId === e.pointerId
      ) {
        const dMoved = Math.hypot(
          e.clientX - cornerPendingRef.current.startScreenX,
          e.clientY - cornerPendingRef.current.startScreenY
        );
        if (dMoved > 10) {
          cancelCornerPending();
        }
      }

      if (
        cornerRoundDragRef.current &&
        cornerRoundDragRef.current.pointerId === e.pointerId
      ) {
        e.preventDefault();
        e.stopPropagation();
        const drag = cornerRoundDragRef.current;
        const curDist = Math.hypot(
          e.clientX - drag.centerScreen.x,
          e.clientY - drag.centerScreen.y
        );
        const inwardDelta = (drag.startDist - curDist) / Math.max(48, drag.startDist);
        const nextRatio = Math.max(0, Math.min(1, drag.startRatio + inwardDelta));
        if (applyCornerRoundingToObject(drag.obj, nextRatio)) {
          drag.obj.setCoords();
          fc.requestRenderAll();
          refreshSelectionInfo();
          setCornerRoundHudRatio(Math.round(nextRatio * 100));
        }
        return;
      }

      const active = brushSessionRef.current;
      const buf = brushBufferRef.current;
      if (!active || !buf || active.pointerId !== e.pointerId) return;

      const ctx = buf.getContext('2d');
      if (!ctx) return;

      const events = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [e];
      const list = events.length > 0 ? events : [e];
      for (let i = 0; i < list.length; i++) {
        const ev = list[i];
        const wp = screenToWorld(ev.clientX, ev.clientY, active.vpt);
        active.lastWorld = { x: wp.x, y: wp.y };
        drawSegment(
          ctx,
          active.session,
          {
            x: wp.x,
            y: wp.y,
            pressure: ev.pressure,
            time: ev.timeStamp || performance.now(),
          },
          active.pointerType
        );
      }
      if (snapEnabledRef.current) {
        const snapHover = findNearestEndpointSnap(
          fc,
          active.lastWorld,
          [],
          fc.getZoom() || 1,
          active.startWorld,
          true
        );
        const nextPt = snapHover ? snapHover.point : null;
        const prevPt = snapIndicatorRef.current;
        const changed =
          (nextPt === null) !== (prevPt === null) ||
          (nextPt && prevPt && (nextPt.x !== prevPt.x || nextPt.y !== prevPt.y));
        if (changed) {
          snapIndicatorRef.current = nextPt;
          fc.requestRenderAll();
        }
      }
      syncPreviewFromBuffer();
    };

    const onPointerUpOrCancel = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        activeTouchesRef.current.delete(e.pointerId);
        if (touchPinchRef.current?.active && activeTouchesRef.current.size < 2) {
          touchPinchRef.current = null;
          syncFabricToolState();
        }
      }

      if (cornerPendingRef.current && cornerPendingRef.current.pointerId === e.pointerId) {
        cancelCornerPending();
      }

      if (
        bezierHandleDragRef.current &&
        bezierHandleDragRef.current.pointerId === e.pointerId
      ) {
        e.preventDefault();
        e.stopPropagation();
        const drag = bezierHandleDragRef.current;
        restoreObjLocks(drag.obj, drag.prevLocks);
        drag.obj.set({ dirty: true });
        drag.obj.setCoords();
        bezierHandleDragRef.current = null;
        if (isMergeableOpenLine(drag.obj)) {
          applyEndpointControlsToSelection();
        }
        fc.requestRenderAll();
        refreshSelectionInfo();
        pushHistory();
        trackFunction('bezier_handle_adjust', 'shapes');
        return;
      }

      if (
        vertexDragRef.current &&
        vertexDragRef.current.pointerId === e.pointerId
      ) {
        e.preventDefault();
        e.stopPropagation();
        const drag = vertexDragRef.current;
        restoreObjLocks(drag.obj, drag.prevLocks);
        drag.obj.setCoords();
        vertexDragRef.current = null;

        if (
          snapEnabledRef.current &&
          drag.isOpenLineEnd &&
          isMergeableOpenLine(drag.obj)
        ) {
          const merged = mergeObjectWithEndpointSnaps(fc, drag.obj, fillRef.current);
          if (merged) {
            selectedVertexRef.current = null;
            fc.setActiveObject(merged);
            applyEndpointControlsToSelection();
          } else {
            applyEndpointControlsToSelection();
          }
        } else if (isMergeableOpenLine(drag.obj)) {
          applyEndpointControlsToSelection();
        }

        snapIndicatorRef.current = null;
        fc.requestRenderAll();
        refreshSelectionInfo();
        pushHistory();
        trackFunction('vertex_move', 'shapes');
        return;
      }

      if (
        vertexPendingRef.current &&
        vertexPendingRef.current.pointerId === e.pointerId
      ) {
        const vp = vertexPendingRef.current;
        if (vp.prevLocks) {
          restoreObjLocks(vp.obj, vp.prevLocks);
        }
        vertexPendingRef.current = null;
        const dMoved = Math.hypot(e.clientX - vp.startScreenX, e.clientY - vp.startScreenY);
        if (dMoved <= 8) {
          selectedVertexRef.current = { obj: vp.obj, index: vp.index };
          fc.requestRenderAll();
          trackFunction('vertex_select', 'shapes');
        }
      }

      if (
        cornerRoundDragRef.current &&
        cornerRoundDragRef.current.pointerId === e.pointerId
      ) {
        e.preventDefault();
        e.stopPropagation();
        const drag = cornerRoundDragRef.current;
        restoreObjLocks(drag.obj, {
          prevLockX: drag.prevLockX,
          prevLockY: drag.prevLockY,
          prevLockScaleX: drag.prevLockScaleX,
          prevLockScaleY: drag.prevLockScaleY,
          prevLockRot: drag.prevLockRot,
          prevHasControls: drag.prevHasControls,
        });
        drag.obj.setCoords();
        cornerRoundDragRef.current = null;
        setCornerRoundHudRatio(null);
        fc.requestRenderAll();
        refreshSelectionInfo();
        pushHistory();
        trackFunction('corner_round_long_press', 'shapes');
        return;
      }

      if (brushSessionRef.current && brushSessionRef.current.pointerId === e.pointerId) {
        commitActiveTexturedStroke();
      }
    };

    const blockFabricDownIfHandleDrag = (e: Event) => {
      if (bezierHandleDragRef.current) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };

    el.addEventListener('pointerdown', onPointerDown, true);
    el.addEventListener('mousedown', blockFabricDownIfHandleDrag, true);
    el.addEventListener('touchstart', blockFabricDownIfHandleDrag, true);
    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerup', onPointerUpOrCancel, true);
    window.addEventListener('pointercancel', onPointerUpOrCancel, true);

    return () => {
      cancelCornerPending();
      cancelVertexPending();
      el.removeEventListener('pointerdown', onPointerDown, true);
      el.removeEventListener('mousedown', blockFabricDownIfHandleDrag, true);
      el.removeEventListener('touchstart', blockFabricDownIfHandleDrag, true);
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('pointerup', onPointerUpOrCancel, true);
      window.removeEventListener('pointercancel', onPointerUpOrCancel, true);
    };
  }, [pushHistory, redrawBackground, refreshSelectionInfo, syncFabricToolState]);

  // Actions: Copy, Paste, Delete, Keyboard Shortcuts
  const handleDeleteSelected = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const active = fc.getActiveObject();
    if (!active) return;

    if (active.type === 'activeSelection' && Array.isArray(active._objects)) {
      const items = [...active._objects];
      fc.discardActiveObject();
      items.forEach((o: any) => fc.remove(o));
    } else {
      fc.remove(active);
      fc.discardActiveObject();
    }
    setSelectedInfo(null);
    fc.requestRenderAll();
    pushHistory();
  }, [pushHistory]);

  const handleDuplicateSelected = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const active = fc.getActiveObject();
    if (!active) return;
    active.clone((cloned: any) => {
      fc.discardActiveObject();
      cloned.set({
        left: (cloned.left || 0) + 20,
        top: (cloned.top || 0) + 20,
        evented: true,
        selectable: true,
      });
      if (cloned.type === 'activeSelection') {
        cloned.canvas = fc;
        cloned.forEachObject((o: any) => {
          rehydrateArtisticBrushObject(o);
          fc.add(o);
        });
        cloned.setCoords();
      } else {
        rehydrateArtisticBrushObject(cloned);
        fc.add(cloned);
      }
      fc.setActiveObject(cloned);
      refreshSelectionInfo();
      fc.requestRenderAll();
      pushHistory();
    }, CUSTOM_FABRIC_PROPS);
  }, [pushHistory, refreshSelectionInfo]);

  const handleAddImageDataUrl = useCallback(
    (dataUrl: string) => {
      const fc = fabricRef.current;
      const fabric = getFabric();
      if (!fc || !fabric) return;
      void compressDataUrlToMaxBytes(dataUrl).then((finalUrl) => {
        fabric.Image.fromURL(
          finalUrl,
          (img: any) => {
            if (!img) return;
            const vpt = fc.viewportTransform || [1, 0, 0, 1, 0, 0];
            const zoom = fc.getZoom() || 1;
            const cx = (window.innerWidth / 2 - vpt[4]) / zoom;
            const cy = (window.innerHeight / 2 - vpt[5]) / zoom;
            const maxWorldDim = Math.min(window.innerWidth, window.innerHeight) * 0.65 / zoom;
            const scale = Math.min(
              1,
              maxWorldDim / Math.max(1, img.width || 1, img.height || 1)
            );
            img.set({
              left: cx,
              top: cy,
              originX: 'center',
              originY: 'center',
              scaleX: scale,
              scaleY: scale,
              cornerColor: '#2563EB',
              borderColor: '#2563EB',
            });
            fc.add(img);
            setActiveMode('select');
            fc.setActiveObject(img);
            refreshSelectionInfo();
            fc.requestRenderAll();
            pushHistory();
          },
          { crossOrigin: 'anonymous' }
        );
      });
    },
    [pushHistory, refreshSelectionInfo]
  );

  const handleAddText = useCallback(
    (payload: { text: string; color: string; fontFamily: string; fontSize: number }) => {
      const fc = fabricRef.current;
      const fabric = getFabric();
      if (!fc || !fabric) return;

      const vpt = fc.viewportTransform || [1, 0, 0, 1, 0, 0];
      const zoom = fc.getZoom() || 1;
      const cx = (window.innerWidth / 2 - vpt[4]) / zoom;
      const cy = (window.innerHeight / 2 - vpt[5]) / zoom;

      const itext = new fabric.IText(payload.text, {
        left: cx,
        top: cy,
        originX: 'center',
        originY: 'center',
        fill: payload.color,
        fontFamily: payload.fontFamily,
        fontSize: payload.fontSize,
        cornerColor: '#2563EB',
        borderColor: '#2563EB',
      });
      fc.add(itext);
      setActivePopover(null);
      setActiveMode('select');
      fc.setActiveObject(itext);
      refreshSelectionInfo();
      fc.requestRenderAll();
      pushHistory();
      trackFunction('add_text', 'text', { font_family: payload.fontFamily });
    },
    [pushHistory, refreshSelectionInfo]
  );

  const handleAddStamp = useCallback(
    (stamp: StampDefinition, color: string) => {
      const fc = fabricRef.current;
      const fabric = getFabric();
      if (!fc || !fabric) return;

      const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${stamp.paths}</svg>`;
      fabric.loadSVGFromString(svgStr, (objects: any[], options: any) => {
        if (!objects || objects.length === 0) return;
        const grp = fabric.util.groupSVGElements(objects, options);
        const vpt = fc.viewportTransform || [1, 0, 0, 1, 0, 0];
        const zoom = fc.getZoom() || 1;
        const cx = (window.innerWidth / 2 - vpt[4]) / zoom;
        const cy = (window.innerHeight / 2 - vpt[5]) / zoom;
        const scale = 3.2 / zoom;
        grp.set({
          left: cx,
          top: cy,
          originX: 'center',
          originY: 'center',
          scaleX: scale,
          scaleY: scale,
          isStampGroup: true,
          strokeColorHex: color,
          strokeOpacity: 1,
          strokeWidth: 2,
          cornerColor: '#2563EB',
          borderColor: '#2563EB',
        });
        fc.add(grp);
        setActivePopover(null);
        setActiveMode('select');
        fc.setActiveObject(grp);
        refreshSelectionInfo();
        fc.requestRenderAll();
        pushHistory();
        trackFunction('add_stamp', 'stamps', { stamp_id: stamp.id });
      });
    },
    [pushHistory, refreshSelectionInfo]
  );

  const handleAddEmoji = useCallback(
    (emoji: EmojiDefinition) => {
      const fc = fabricRef.current;
      const fabric = getFabric();
      if (!fc || !fabric) return;
      const vpt = fc.viewportTransform || [1, 0, 0, 1, 0, 0];
      const zoom = fc.getZoom() || 1;
      const cx = (window.innerWidth / 2 - vpt[4]) / zoom;
      const cy = (window.innerHeight / 2 - vpt[5]) / zoom;

      const txt = new fabric.IText(emoji.char, {
        left: cx,
        top: cy,
        originX: 'center',
        originY: 'center',
        fontSize: Math.round(56 / Math.max(0.4, zoom)),
        fontFamily:
          '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif',
        cornerColor: '#2563EB',
        borderColor: '#2563EB',
      });
      fc.add(txt);
      setActivePopover(null);
      setActiveMode('select');
      fc.setActiveObject(txt);
      refreshSelectionInfo();
      fc.requestRenderAll();
      pushHistory();
      trackFunction('add_emoji', 'stamps', { emoji: emoji.char });
    },
    [pushHistory, refreshSelectionInfo]
  );

  const handleSelectAll = useCallback(() => {
    const fc = fabricRef.current;
    const fabric = getFabric();
    if (!fc || !fabric) return;
    bezierEditRef.current = null;
    if (contourPointsRef.current.length > 0) {
      polylineHoverPtRef.current = null;
      setContourPoints([]);
    }
    const objs = fc
      .getObjects()
      .filter((o: any) => !o.excludeFromExport && !o.isEraserPath);
    if (objs.length === 0) return;
    setActiveMode('select');
    fc.discardActiveObject();
    if (objs.length === 1) {
      fc.setActiveObject(objs[0]);
    } else {
      const sel = new fabric.ActiveSelection(objs, { canvas: fc });
      fc.setActiveObject(sel);
    }
    fc.requestRenderAll();
    refreshSelectionInfo();
    showToast(t('selectedAllToast'));
    trackFunction('select_all', 'selection', { count: objs.length });
  }, [refreshSelectionInfo, showToast, t]);

  // Keyboard shortcuts (Ctrl+A, Ctrl+Z, Ctrl+Y, Delete, Space Pan, Ctrl+C / Ctrl+V)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditingInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      const fc = fabricRef.current;
      const activeObj = fc?.getActiveObject();
      if (isEditingInput || activeObj?.isEditing) return;

      if (e.code === 'Space') {
        spacePressedRef.current = true;
        if (fc) fc.defaultCursor = 'grab';
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'a' || e.code === 'KeyA')) {
        e.preventDefault();
        handleSelectAll();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'z' || e.code === 'KeyZ')) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || e.code === 'KeyY')) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'c' || e.code === 'KeyC')) {
        if (activeObj) {
          const objs =
            activeObj.type === 'activeSelection' && Array.isArray(activeObj._objects)
              ? activeObj._objects
              : [activeObj];
          clipboardJsonRef.current = objs.map((o: any) => o.toObject(CUSTOM_FABRIC_PROPS));
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'v' || e.code === 'KeyV')) {
        if (clipboardJsonRef.current && clipboardJsonRef.current.length > 0 && fc) {
          const fabric = getFabric();
          fabric.util.enlivenObjects(clipboardJsonRef.current, (enlivened: any[]) => {
            if (!enlivened || enlivened.length === 0) return;
            fc.discardActiveObject();
            enlivened.forEach((o) => {
              o.set({ left: (o.left || 0) + 24, top: (o.top || 0) + 24 });
              rehydrateArtisticBrushObject(o);
              fc.add(o);
            });
            if (enlivened.length === 1) {
              fc.setActiveObject(enlivened[0]);
            }
            refreshSelectionInfo();
            fc.requestRenderAll();
            pushHistory();
            showToast(t('pastedToast'));
          });
        }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeObj) {
          e.preventDefault();
          handleDeleteSelected();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spacePressedRef.current = false;
        const fc = fabricRef.current;
        if (fc) {
          fc.defaultCursor = activeModeRef.current === 'select' ? 'default' : 'crosshair';
        }
      }
    };

    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            void downscaleImageFileToDataUrl(file).then((url) => {
              handleAddImageDataUrl(url);
              showToast(t('pastedToast'));
            });
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('paste', onPaste);
    };
  }, [
    handleAddImageDataUrl,
    handleDeleteSelected,
    handleRedo,
    handleSelectAll,
    handleUndo,
    pushHistory,
    refreshSelectionInfo,
    showToast,
    t,
  ]);

  // Selection modification handlers (shared between ShapesPopover & ObjectEditorPopover)
  const getTargetObjects = (): any[] => {
    const fc = fabricRef.current;
    if (!fc) return [];
    const active = fc.getActiveObject();
    if (!active) return [];
    return active.type === 'activeSelection' && Array.isArray(active._objects)
      ? active._objects
      : [active];
  };

  const handleUpdateSelectedStroke = useCallback(
    (patch: {
      color?: string;
      opacity?: number;
      width?: number;
      pattern?: LinePattern;
      doubleLine?: boolean;
      brushType?: BrushType;
    }) => {
      const fc = fabricRef.current;
      const fabric = getFabric();
      if (!fc || !fabric) return;
      const targets = getTargetObjects();
      if (targets.length === 0) return;

      targets.forEach((obj) => {
        if (obj.isTexturedBrushStroke) {
          const nextColor = patch.color ?? obj.strokeColorHex ?? '#0F172A';
          const nextOp = patch.opacity ?? obj.strokeOpacity ?? 1;
          obj.set({
            strokeColorHex: nextColor,
            strokeOpacity: nextOp,
            ...(patch.opacity !== undefined ? { opacity: nextOp } : {}),
            dirty: true,
          });
          if (patch.color !== undefined && fabric.Image?.filters?.BlendColor) {
            obj.filters = [
              new fabric.Image.filters.BlendColor({
                color: nextColor,
                mode: 'tint',
                alpha: 1,
              }),
            ];
            if (typeof obj.applyFilters === 'function') {
              obj.applyFilters();
            }
          }
          return;
        }

        if (obj.isStampGroup && Array.isArray(obj._objects)) {
          const nextColor = patch.color ?? obj.strokeColorHex ?? '#0F172A';
          const nextOp = patch.opacity ?? obj.strokeOpacity ?? 1;
          const nextW = patch.width ?? obj.strokeWidth ?? 2;
          const nextPat = patch.pattern ?? obj.strokePattern ?? 'solid';
          const nextBrush = patch.brushType ?? obj.brushType ?? 'standard';
          const rgba = nextW > 0 ? applyColorOpacity(nextColor, nextOp) : null;
          obj.set({
            strokeColorHex: nextColor,
            strokeOpacity: nextOp,
            strokeWidth: nextW,
            strokePattern: nextPat,
            doubleLine: patch.doubleLine ?? obj.doubleLine ?? false,
            brushType: nextBrush,
          });
          obj._objects.forEach((child: any) => {
            child.set({
              strokeColorHex: nextColor,
              strokeOpacity: nextOp,
              stroke: rgba,
              strokeWidth: nextW,
              strokeDashArray: getScaledDashArray(nextPat, Math.max(1, nextW)) || undefined,
              brushType: nextBrush,
              shadow:
                nextBrush === 'soft' && nextW > 0
                  ? new fabric.Shadow({
                      blur: Math.max(4, nextW * 0.9),
                      offsetX: 0,
                      offsetY: 0,
                      color: applyColorOpacity(nextColor, Math.min(1, nextOp * 0.85)),
                      affectStroke: true,
                    })
                  : null,
              dirty: true,
            });
          });
          attachArtisticBrushRenderer(obj);
          return;
        }

        const nextColor = patch.color ?? obj.strokeColorHex ?? '#0F172A';
        const nextOp = patch.opacity ?? obj.strokeOpacity ?? 1;
        const nextW =
          patch.width ??
          (typeof obj.strokeWidth === 'number' ? obj.strokeWidth : 3);
        const nextPat = patch.pattern ?? obj.strokePattern ?? 'solid';
        const nextDouble = patch.doubleLine ?? obj.doubleLine ?? false;
        const nextBrush = patch.brushType ?? obj.brushType ?? 'standard';

        if (obj.isGridRect && Array.isArray(obj._objects)) {
          const effW = Math.max(1, nextW);
          const rgba = applyColorOpacity(nextColor, nextOp);
          const dash = getScaledDashArray(nextPat, effW);
          obj.set({
            strokeColorHex: nextColor,
            strokeOpacity: nextOp,
            strokeWidth: effW,
            strokePattern: nextPat,
            doubleLine: nextDouble,
            brushType: nextBrush,
          });
          obj._objects.forEach((c: any, idx: number) => {
            const childW = idx === 0 ? effW : Math.max(1, effW * 0.75);
            c.set({
              strokeColorHex: nextColor,
              strokeOpacity: nextOp,
              stroke: rgba,
              strokeWidth: childW,
              strokeDashArray: dash || undefined,
              brushType: nextBrush,
              shadow:
                nextBrush === 'soft'
                  ? new fabric.Shadow({
                      blur: Math.max(4, childW * 0.9),
                      offsetX: 0,
                      offsetY: 0,
                      color: applyColorOpacity(nextColor, Math.min(1, nextOp * 0.85)),
                      affectStroke: true,
                    })
                  : null,
              dirty: true,
            });
          });
          attachArtisticBrushRenderer(obj);
          return;
        }

        const isTextObj =
          obj.type === 'i-text' || obj.type === 'textbox' || obj.type === 'text';

        obj.set({
          strokeColorHex: nextColor,
          strokeOpacity: nextOp,
          strokeWidth: nextW,
          stroke: nextW > 0 ? applyColorOpacity(nextColor, nextOp) : null,
          strokePattern: nextPat,
          strokeDashArray: getScaledDashArray(nextPat, Math.max(1, nextW)) || undefined,
          doubleLine: nextDouble,
          brushType: nextBrush,
          ...(isTextObj ? { paintFirst: 'stroke' } : {}),
          dirty: true,
        });

        if (nextBrush === 'soft') {
          obj.set({
            shadow: new fabric.Shadow({
              blur: Math.max(4, Math.max(1, nextW) * 0.9),
              offsetX: 0,
              offsetY: 0,
              color: applyColorOpacity(nextColor, Math.min(1, nextOp * 0.85)),
              affectStroke: true,
            }),
          });
        } else if (nextBrush === 'standard' || isArtisticContourBrush(nextBrush)) {
          obj.set({ shadow: null });
        }
        attachArtisticBrushRenderer(obj);
      });

      fc.requestRenderAll();
      refreshSelectionInfo();
      pushHistory();
    },
    [pushHistory, refreshSelectionInfo]
  );

  const handleUpdateSelectedFill = useCallback(
    (nextFill: FillSettings) => {
      const fc = fabricRef.current;
      if (!fc) return;
      const targets = getTargetObjects();
      targets.forEach((obj) => {
        if (obj.isGridRect && Array.isArray(obj._objects) && obj._objects[0]) {
          obj.set({ fillMeta: { ...nextFill } });
          applyFillToObject(obj._objects[0], nextFill, fc);
        } else {
          applyFillToObject(obj, nextFill, fc);
        }
      });
      fc.requestRenderAll();
      refreshSelectionInfo();
      pushHistory();
    },
    [pushHistory, refreshSelectionInfo]
  );

  const handleUpdateSelectedGrid = useCallback(
    (nextGrid: RectGridConfig) => {
      const fc = fabricRef.current;
      const fabric = getFabric();
      if (!fc || !fabric) return;
      const active = fc.getActiveObject();
      if (!active) return;

      const center = active.getCenterPoint();
      const worldW = (active.width || 100) * Math.abs(active.scaleX || 1);
      const worldH = (active.height || 100) * Math.abs(active.scaleY || 1);
      const st: StrokeSettings = {
        color: active.strokeColorHex || strokeRef.current.color,
        opacity: active.strokeOpacity ?? strokeRef.current.opacity,
        width: active.strokeWidth ?? strokeRef.current.width,
        pattern: active.strokePattern || 'solid',
        brushType: active.brushType || 'standard',
        doubleLine: Boolean(active.doubleLine),
      };
      const fl: FillSettings = active.fillMeta ? { ...active.fillMeta } : { ...fillRef.current };

      let replacement: any;
      if (nextGrid.enabled) {
        replacement = createGridRectGroup(
          fabric,
          center.x - worldW / 2,
          center.y - worldH / 2,
          worldW,
          worldH,
          nextGrid.rows,
          nextGrid.cols,
          st,
          fl
        );
        replacement.set({ brushType: st.brushType });
        if (Array.isArray(replacement._objects)) {
          replacement._objects.forEach((c: any) => {
            c.set({ brushType: st.brushType });
          });
        }
      } else {
        replacement = new fabric.Rect({
          left: center.x,
          top: center.y,
          width: worldW,
          height: worldH,
          originX: 'center',
          originY: 'center',
          fill: buildFillValue(fl, worldW, worldH),
          fillMeta: { ...fl },
          stroke: st.width > 0 ? applyColorOpacity(st.color, st.opacity) : null,
          strokeColorHex: st.color,
          strokeOpacity: st.opacity,
          strokeWidth: st.width,
          strokeDashArray: getScaledDashArray(st.pattern, Math.max(1, st.width)) || undefined,
          strokePattern: st.pattern,
          doubleLine: st.doubleLine,
          brushType: st.brushType,
          strokeUniform: true,
          cornerColor: '#2563EB',
          borderColor: '#2563EB',
        });
      }

      replacement.set({ angle: active.angle || 0 });
      rehydrateArtisticBrushObject(replacement);
      fc.remove(active);
      fc.add(replacement);
      fc.setActiveObject(replacement);
      fc.requestRenderAll();
      refreshSelectionInfo();
      pushHistory();
    },
    [pushHistory, refreshSelectionInfo]
  );

  const handleUpdateSelectedOpacity = useCallback(
    (opacity: number) => {
      const fc = fabricRef.current;
      if (!fc) return;
      const active = fc.getActiveObject();
      if (!active) return;
      active.set({ opacity, dirty: true });
      fc.requestRenderAll();
      refreshSelectionInfo();
      pushHistory();
    },
    [pushHistory, refreshSelectionInfo]
  );

  const handleUpdateSelectedCornerRadius = useCallback(
    (ratio: number) => {
      const fc = fabricRef.current;
      if (!fc) return;
      const active = fc.getActiveObject();
      if (!active) return;
      if (applyCornerRoundingToObject(active, ratio)) {
        fc.requestRenderAll();
        refreshSelectionInfo();
        pushHistory();
      }
    },
    [pushHistory, refreshSelectionInfo]
  );

  const handleToggleSelectedClosedContour = useCallback(
    (nextClosed: boolean) => {
      const fc = fabricRef.current;
      if (!fc) return;
      const active = fc.getActiveObject();
      if (!active) return;
      const converted = nextClosed
        ? convertObjectToClosedContour(active, fillRef.current, true)
        : convertClosedContourToOpen(active, true);
      if (converted) {
        fc.remove(active);
        fc.add(converted);
        fc.setActiveObject(converted);
        fc.requestRenderAll();
        refreshSelectionInfo();
        pushHistory();
      }
    },
    [pushHistory, refreshSelectionInfo]
  );

  const handleMorphSelectedPolygon = useCallback(
    (variant: PolygonVariant) => {
      const fc = fabricRef.current;
      const fabric = getFabric();
      if (!fc || !fabric) return;
      const active = fc.getActiveObject();
      if (!active || !active.isPolygonMorphable) return;

      const center = active.getCenterPoint();
      const rx = Math.max(8, ((active.width || 60) * Math.abs(active.scaleX || 1)) / 2);
      const ry = Math.max(8, ((active.height || 60) * Math.abs(active.scaleY || 1)) / 2);
      const pts = buildPolygonPoints(variant, 0, 0, rx, ry);

      const nextPoly = new fabric.Polygon(pts, {
        left: center.x,
        top: center.y,
        angle: active.angle || 0,
        fill: active.fill,
        fillMeta: active.fillMeta,
        stroke: active.stroke,
        strokeColorHex: active.strokeColorHex,
        strokeOpacity: active.strokeOpacity,
        strokeWidth: active.strokeWidth,
        strokeDashArray: active.strokeDashArray,
        strokePattern: active.strokePattern,
        doubleLine: active.doubleLine,
        brushType: active.brushType || 'standard',
        strokeUniform: true,
        strokeLineJoin: 'round',
        opacity: active.opacity ?? 1,
        isPolygonMorphable: true,
        polygonVariant: variant,
        baseLocalPoints: pts.map((p) => ({ x: p.x, y: p.y })),
        originX: 'center',
        originY: 'center',
        cornerColor: '#2563EB',
        borderColor: '#2563EB',
      });
      nextPoly.baseWidth = nextPoly.width;
      nextPoly.baseHeight = nextPoly.height;
      nextPoly.basePathOffset = {
        x: nextPoly.pathOffset?.x || 0,
        y: nextPoly.pathOffset?.y || 0,
      };
      rehydrateArtisticBrushObject(nextPoly);
      fc.remove(active);
      fc.add(nextPoly);
      fc.setActiveObject(nextPoly);
      fc.requestRenderAll();
      refreshSelectionInfo();
      pushHistory();
    },
    [pushHistory, refreshSelectionInfo]
  );

  const handleMorphSelectedArrow = useCallback(
    (variant: ArrowVariant) => {
      const fc = fabricRef.current;
      if (!fc) return;
      const active = fc.getActiveObject();
      if (!active) return;
      const center = active.getCenterPoint();
      const len = Math.max(24, (active.width || 100) * Math.abs(active.scaleX || 1));
      const rad = ((active.angle || 0) * Math.PI) / 180;
      const x1 = center.x - (Math.cos(rad) * len) / 2;
      const y1 = center.y - (Math.sin(rad) * len) / 2;
      const x2 = center.x + (Math.cos(rad) * len) / 2;
      const y2 = center.y + (Math.sin(rad) * len) / 2;

      const fl = active.fillMeta || fillRef.current;
      const nextArrow = createArrowObject(
        x1,
        y1,
        x2,
        y2,
        active.strokeColorHex || strokeRef.current.color,
        active.strokeWidth ?? strokeRef.current.width,
        active.strokeDashArray || null,
        Boolean(active.doubleLine),
        variant,
        buildFillValue(fl),
        {
          selectable: true,
          evented: true,
          opacity: active.opacity ?? 1,
          strokeColorHex: active.strokeColorHex || strokeRef.current.color,
          strokeOpacity: active.strokeOpacity ?? 1,
          strokePattern: active.strokePattern || 'solid',
          brushType: active.brushType || 'standard',
          fillMeta: { ...fl },
        }
      );
      rehydrateArtisticBrushObject(nextArrow);
      fc.remove(active);
      fc.add(nextArrow);
      fc.setActiveObject(nextArrow);
      fc.requestRenderAll();
      refreshSelectionInfo();
      pushHistory();
    },
    [pushHistory, refreshSelectionInfo]
  );

  const handleUpdateSelectedText = useCallback(
    (patch: { color?: string; fontFamily?: string; fontSize?: number }) => {
      const fc = fabricRef.current;
      if (!fc) return;
      const active = fc.getActiveObject();
      if (!active || (active.type !== 'i-text' && active.type !== 'text' && active.type !== 'textbox')) {
        return;
      }
      active.set({
        ...(patch.color !== undefined ? { fill: patch.color } : {}),
        ...(patch.fontFamily !== undefined ? { fontFamily: patch.fontFamily } : {}),
        ...(patch.fontSize !== undefined ? { fontSize: patch.fontSize } : {}),
        dirty: true,
      });
      active.setCoords();
      fc.requestRenderAll();
      refreshSelectionInfo();
      pushHistory();
    },
    [pushHistory, refreshSelectionInfo]
  );

  const handleClearCanvas = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    fc.clear();
    polylineHoverPtRef.current = null;
    setContourPoints([]);
    bezierEditRef.current = null;
    setSelectedInfo(null);
    setClearConfirmOpen(false);
    applyClipForArtboard();
    redrawBackground();
    pushHistory();
    isDirtyDraftRef.current = false;
    if (draftSaveTimerRef.current !== null) {
      window.clearTimeout(draftSaveTimerRef.current);
      draftSaveTimerRef.current = null;
    }
    const uid = cloudUserRef.current?.uid;
    if (uid) {
      clearLocalDraftBackup(uid);
      void clearCloudDraft(uid);
    }
    trackFunction('clear_canvas', 'canvas');
  }, [applyClipForArtboard, clearLocalDraftBackup, pushHistory, redrawBackground]);

  const handleSelectBgPreset = useCallback((mode: BackgroundMode) => {
    setBgConfig((prev) => ({
      ...prev,
      mode,
      ...(mode === 'white' ? { color1: '#FFFFFF', fillType: 'solid', opacity: 1 } : {}),
      ...(mode === 'dark' ? { color1: '#1E1E1E', fillType: 'solid', opacity: 1 } : {}),
    }));
    trackFunction('select_bg_preset', 'background', { mode });
  }, []);

  const handleTriggerOfflineDownload = useCallback(() => {
    const html = `<!doctype html>\n${document.documentElement.outerHTML}`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(t('offlineSavedToast'));
  }, [showToast, t]);

  const handleTriggerZipDownload = useCallback(async () => {
    const backupUrl = `/backup.zip?t=${Date.now()}`;
    try {
      const response = await fetch(backupUrl, { cache: 'no-store' });
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || contentType.includes('text/html')) {
        throw new Error('Backup zip unavailable');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'zenpainter-backup.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      showToast(t('zipBackupSavedToast'));
    } catch {
      const a = document.createElement('a');
      a.href = '/backup.zip';
      a.download = 'zenpainter-backup.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast(t('zipBackupSavedToast'));
    }
  }, [showToast, t]);

  const applyTutorialHidePrefLocally = useCallback((hide: boolean) => {
    setDontShowTutorialAgain(hide);
    try {
      localStorage.setItem(HIDE_TUTORIAL_STORAGE_KEY, String(hide));
    } catch {
      // ignore storage errors
    }
    if (hide) {
      setHelpOpen(false);
    }
  }, []);

  // Mark draft dirty & schedule auto-save when canvas background/size/export settings change after edits
  const draftEffectMountedRef = useRef(false);
  useEffect(() => {
    if (!draftEffectMountedRef.current) {
      draftEffectMountedRef.current = true;
      return;
    }
    if (isRestoringHistoryRef.current) return;
    const fc = fabricRef.current;
    if (!fc) return;
    const hasObjs = fc
      .getObjects()
      .some((o: any) => !o.excludeFromExport && !o.isEraserPath);
    if (hasObjs || isDirtyDraftRef.current) {
      scheduleCloudDraftSave();
    }
  }, [bgConfig, canvasSize, exportScope, scheduleCloudDraftSave]);

  // Flush unsaved draft to cloud + local backup when closing or hiding the app
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushCloudDraftNow();
      }
    };
    const handlePageHide = () => {
      flushCloudDraftNow();
    };
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (draftSaveTimerRef.current !== null) {
        window.clearTimeout(draftSaveTimerRef.current);
      }
    };
  }, [flushCloudDraftNow]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCloudUser(user);
      if (!user) {
        draftLoadedForUidRef.current = null;
        setActiveCloudProjectId(null);
        setActiveCloudProjectTitle('');
        return;
      }
      let localHide = false;
      try {
        localHide = localStorage.getItem(HIDE_TUTORIAL_STORAGE_KEY) === 'true';
      } catch {
        localHide = false;
      }
      void ensureUserProfile(user, localHide)
        .then((profile) => {
          if (profile.hideWelcomeTutorial) {
            applyTutorialHidePrefLocally(true);
          }
        })
        .catch(() => {
          // ignore profile sync errors on auth boot
        });

      // Auto-restore unsaved cloud draft once per signed-in session (excluded from 5-project limit)
      if (draftLoadedForUidRef.current !== user.uid) {
        draftLoadedForUidRef.current = user.uid;
        let localBackup: any = null;
        try {
          const raw = localStorage.getItem(`zp_local_draft_${user.uid}`);
          if (raw) localBackup = JSON.parse(raw);
        } catch {
          localBackup = null;
        }

        void loadCloudDraft(user.uid)
          .catch(() => null)
          .then((remoteDraft) => {
            const fc = fabricRef.current;
            if (!fc) return;
            const currentObjs = fc
              .getObjects()
              .filter((o: any) => !o.excludeFromExport && !o.isEraserPath);
            if (currentObjs.length > 0) return;

            const remoteObjs = Array.isArray(remoteDraft?.canvasData?.objects)
              ? remoteDraft.canvasData.objects
              : [];
            const localObjs = Array.isArray(localBackup?.canvasData?.objects)
              ? localBackup.canvasData.objects
              : [];

            const useLocal =
              localObjs.length > 0 &&
              (remoteObjs.length === 0 ||
                Number(localBackup?.updatedAtMs || 0) > Number(remoteDraft?.updatedAtMs || 0));

            const chosen = useLocal
              ? localBackup
              : remoteObjs.length > 0
                ? remoteDraft
                : null;
            if (!chosen || !chosen.canvasData) return;

            isRestoringHistoryRef.current = true;
            if (chosen.bgConfig) {
              setBgConfig(chosen.bgConfig);
              bgConfigRef.current = chosen.bgConfig;
            }
            if (chosen.canvasSize) {
              setCanvasSize(chosen.canvasSize);
              canvasSizeRef.current = chosen.canvasSize;
            }
            if (chosen.exportScope === 'artwork' || chosen.exportScope === 'canvas') {
              setExportScope(chosen.exportScope);
            }

            fc.loadFromJSON(chosen.canvasData, () => {
              fc.getObjects().forEach((obj: any) => {
                if (obj.isEraserPath) {
                  obj.set({
                    selectable: false,
                    evented: false,
                    globalCompositeOperation: 'destination-out',
                  });
                } else {
                  obj.set({
                    selectable: true,
                    evented: true,
                    cornerColor: '#2563EB',
                    borderColor: '#2563EB',
                  });
                  const rehydratePhoto = (item: any) => {
                    if (!item) return;
                    if (item.fillMeta?.mode === 'photo' && item.fillMeta.photoDataUrl) {
                      refreshObjectPhotoFill(item, fc);
                    } else if (Array.isArray(item._objects)) {
                      item._objects.forEach((child: any) => rehydratePhoto(child));
                    }
                  };
                  rehydratePhoto(obj);
                  rehydrateArtisticBrushObject(obj);
                }
              });
              fc.discardActiveObject();
              applyClipForArtboard();
              if (chosen.canvasSize) {
                fitViewportToArtboard(chosen.canvasSize);
              } else {
                redrawBackground();
              }
              syncHasArtwork();
              syncFabricToolState();
              refreshSelectionInfo();
              isRestoringHistoryRef.current = false;
              pushHistory();
              isDirtyDraftRef.current = true;
              if (chosen.activeProjectId) {
                setActiveCloudProjectId(chosen.activeProjectId);
              }
              if (chosen.activeProjectTitle) {
                setActiveCloudProjectTitle(chosen.activeProjectTitle);
              }
              showToast(t('cloudDraftRestoredToast'));
            });
          });
      }
    });
    return () => unsub();
  }, [
    applyClipForArtboard,
    applyTutorialHidePrefLocally,
    fitViewportToArtboard,
    pushHistory,
    redrawBackground,
    refreshSelectionInfo,
    showToast,
    syncFabricToolState,
    syncHasArtwork,
    t,
  ]);

  const handleSaveProjectToCloud = useCallback(
    async (user: User, options: { projectId?: string; title: string }): Promise<string> => {
      const fc = fabricRef.current;
      if (!fc) throw new Error('Canvas not initialized');
      bezierEditRef.current = null;
      const serialized = fc.toObject(CUSTOM_FABRIC_PROPS) as Record<string, unknown>;
      const savedId = await saveCloudProject(user, {
        projectId: options.projectId,
        title: options.title,
        exportScope,
        canvasSize: canvasSizeRef.current,
        bgConfig: bgConfigRef.current,
        canvasData: serialized,
      });
      setActiveCloudProjectId(savedId);
      setActiveCloudProjectTitle(options.title);
      isDirtyDraftRef.current = false;
      if (draftSaveTimerRef.current !== null) {
        window.clearTimeout(draftSaveTimerRef.current);
        draftSaveTimerRef.current = null;
      }
      clearLocalDraftBackup(user.uid);
      void clearCloudDraft(user.uid);
      showToast(t('cloudSavedToast'));
      return savedId;
    },
    [clearLocalDraftBackup, exportScope, showToast, t]
  );

  const handleLoadCloudProject = useCallback(
    (project: CloudProjectRecord) => {
      const fc = fabricRef.current;
      if (!fc) return;
      bezierEditRef.current = null;
      polylineHoverPtRef.current = null;
      setContourPoints([]);
      setSelectedInfo(null);
      isRestoringHistoryRef.current = true;

      setBgConfig(project.bgConfig);
      bgConfigRef.current = project.bgConfig;
      setCanvasSize(project.canvasSize);
      canvasSizeRef.current = project.canvasSize;
      setExportScope(project.exportScope);

      fc.loadFromJSON(project.canvasData, () => {
        fc.getObjects().forEach((obj: any) => {
          if (obj.isEraserPath) {
            obj.set({
              selectable: false,
              evented: false,
              globalCompositeOperation: 'destination-out',
            });
          } else {
            obj.set({
              selectable: true,
              evented: true,
              cornerColor: '#2563EB',
              borderColor: '#2563EB',
            });
            const rehydratePhoto = (item: any) => {
              if (!item) return;
              if (item.fillMeta?.mode === 'photo' && item.fillMeta.photoDataUrl) {
                refreshObjectPhotoFill(item, fc);
              } else if (Array.isArray(item._objects)) {
                item._objects.forEach((child: any) => rehydratePhoto(child));
              }
            };
            rehydratePhoto(obj);
            rehydrateArtisticBrushObject(obj);
          }
        });
        fc.discardActiveObject();
        applyClipForArtboard();
        fitViewportToArtboard(project.canvasSize);
        syncHasArtwork();
        syncFabricToolState();
        refreshSelectionInfo();
        isRestoringHistoryRef.current = false;
        pushHistory();
        isDirtyDraftRef.current = false;
        if (draftSaveTimerRef.current !== null) {
          window.clearTimeout(draftSaveTimerRef.current);
          draftSaveTimerRef.current = null;
        }
        const uid = cloudUserRef.current?.uid;
        if (uid) {
          clearLocalDraftBackup(uid);
          void clearCloudDraft(uid);
        }
        setActiveCloudProjectId(project.id);
        setActiveCloudProjectTitle(project.title);
        setCloudModalOpen(false);
        showToast(t('cloudLoadedToast'));
      });
    },
    [
      applyClipForArtboard,
      clearLocalDraftBackup,
      fitViewportToArtboard,
      pushHistory,
      refreshSelectionInfo,
      showToast,
      syncFabricToolState,
      syncHasArtwork,
      t,
    ]
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[100dvh] overflow-hidden select-none"
      style={{ touchAction: 'none' }}
      onContextMenu={(e) => {
        e.preventDefault();
        const target = e.target as HTMLElement | null;
        if (target && target !== containerRef.current && target.tagName !== 'CANVAS') {
          return;
        }
        const nativeEvt = e.nativeEvent as MouseEvent & { pointerType?: string };
        if (nativeEvt.pointerType === 'touch') return;
        if (Date.now() - lastRightClickOpenAtRef.current < 300) return;
        lastRightClickOpenAtRef.current = Date.now();
        setIsToolbarOpen(true);
        setActivePopover((prev) => {
          const next = prev === 'shapes' ? null : 'shapes';
          trackFunction('toggle_shapes_context_menu', 'ui', {
            is_open: next === 'shapes',
          });
          return next;
        });
      }}
    >
      {/* Background Canvas Layer */}
      <canvas
        ref={bgCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Fabric.js Main Interactive Canvas */}
      <canvas ref={canvasElRef} className="block w-full h-full" />

      {/* Live Preview Overlay for Textured Brushes (Мазок / Валик / etc.) */}
      <canvas
        ref={brushPreviewCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />

      {/* Hidden Image Upload Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          void downscaleImageFileToDataUrl(file).then((url) => {
            handleAddImageDataUrl(url);
            trackFunction('upload_image', 'canvas', {
              file_size_kb: Math.round(file.size / 1024),
            });
          });
        }}
      />

      {/* Empty Canvas Subtle Centered Hint */}
      {!hasArtwork && !activePopover && !helpOpen && (
        <div
          className={`pointer-events-none fixed inset-0 z-10 flex items-center justify-center transition-opacity duration-300 ${
            isDarkBg ? 'text-white/15' : 'text-slate-900/15'
          }`}
        >
          <span className="text-xl sm:text-2xl font-medium tracking-tight">
            {t('emptyCanvasHint')}
          </span>
        </div>
      )}

      {/* Contour / Polyline Floating Action Bar */}
      {contourPoints.length > 0 && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-3 py-2 rounded-2xl border backdrop-blur-md flex items-center gap-2 shadow-xl ${
            isDarkBg
              ? 'bg-neutral-900/95 border-neutral-700 text-neutral-100'
              : 'bg-white/95 border-slate-200 text-slate-800'
          }`}
        >
          <span className="text-xs font-medium px-1 hidden sm:inline">
            {t('contourHint')}
          </span>
          {contourPoints.length >= 2 && (
            <button
              type="button"
              onClick={() => commitContourPoints(false)}
              className="min-h-[36px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
            >
              {t('contourFinish')}
            </button>
          )}
          {contourPoints.length >= 3 && (
            <button
              type="button"
              onClick={() => commitContourPoints(true)}
              className="min-h-[36px] px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
            >
              {t('contourClose')}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              polylineHoverPtRef.current = null;
              snapIndicatorRef.current = null;
              setContourPoints([]);
              fabricRef.current?.requestRenderAll();
            }}
            className={`min-h-[36px] px-3 rounded-xl text-xs font-medium cursor-pointer ${
              isDarkBg ? 'bg-neutral-800 hover:bg-neutral-700' : 'bg-slate-100 hover:bg-slate-200'
            }`}
          >
            {t('contourCancel')}
          </button>
        </div>
      )}

      {/* Corner Rounding Live HUD Pill during Long-Press Vertex Drag */}
      {cornerRoundHudRatio !== null && (
        <div
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-2xl border backdrop-blur-md flex items-center gap-2 shadow-xl pointer-events-none ${
            isDarkBg
              ? 'bg-neutral-900/95 border-amber-500/60 text-amber-300'
              : 'bg-white/95 border-amber-400 text-amber-700'
          }`}
        >
          <span className="text-xs font-semibold">
            {t('cornerRadiusLabel')}: {cornerRoundHudRatio}%
          </span>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 left-4 z-50 px-3.5 py-2 rounded-xl bg-neutral-900/90 text-white text-xs font-medium shadow-lg backdrop-blur-md pointer-events-none">
          {toastMessage}
        </div>
      )}

      {/* Right Sidebar & Floating Eye Trigger */}
      <RightSidebar
        t={t}
        isOpen={isToolbarOpen}
        onToggleOpen={() => setIsToolbarOpen((o) => !o)}
        activePopover={activePopover}
        onTogglePopover={(pop) =>
          setActivePopover((prev) => (prev === pop ? null : pop))
        }
        activeMode={activeMode}
        onSelectMode={(m) => {
          if (contourPointsRef.current.length > 0) {
            polylineHoverPtRef.current = null;
            setContourPoints([]);
          }
          setActiveMode(m);
        }}
        onActivateLasso={() => {
          if (contourPointsRef.current.length > 0) {
            polylineHoverPtRef.current = null;
            setContourPoints([]);
          }
          setActiveMode('lasso');
          setActivePopover(null);
        }}
        onActivateEraser={() => {
          if (contourPointsRef.current.length > 0) {
            polylineHoverPtRef.current = null;
            setContourPoints([]);
          }
          if (activeMode === 'eraser') {
            setActivePopover((prev) => (prev === 'eraser' ? null : 'eraser'));
          } else {
            setActiveMode('eraser');
            setActivePopover('eraser');
          }
        }}
        onRequestClearCanvas={() => setClearConfirmOpen(true)}
        onTriggerImageUpload={() => {
          setActivePopover(null);
          fileInputRef.current?.click();
        }}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        isDarkBg={isDarkBg}
      />

      {/* Tool Popovers */}
      {activePopover === 'shapes' && (
        <ShapesPopover
          t={t}
          activeMode={activeMode}
          onSelectMode={(m) => {
            if (contourPointsRef.current.length > 0) {
              polylineHoverPtRef.current = null;
              setContourPoints([]);
            }
            setActiveMode(m);
          }}
          rectGrid={rectGrid}
          onChangeRectGrid={setRectGrid}
          onUpdateSelectedGrid={handleUpdateSelectedGrid}
          polygonVariant={polygonVariant}
          onSelectPolygonVariant={setPolygonVariant}
          arrowVariant={arrowVariant}
          onSelectArrowVariant={setArrowVariant}
          closedContour={closedContour}
          onToggleClosedContour={setClosedContour}
          snapEnabled={snapEnabled}
          onToggleSnapEnabled={(next) => {
            setSnapEnabled(next);
            setTimeout(() => applyEndpointControlsToSelection(), 0);
          }}
          stroke={stroke}
          onChangeStroke={setStroke}
          fill={fill}
          onChangeFill={setFill}
          selectedInfo={selectedInfo}
          onUpdateSelectedStroke={handleUpdateSelectedStroke}
          onUpdateSelectedFill={handleUpdateSelectedFill}
          onUpdateSelectedOpacity={handleUpdateSelectedOpacity}
          onUpdateSelectedCornerRadius={handleUpdateSelectedCornerRadius}
          onToggleSelectedClosedContour={handleToggleSelectedClosedContour}
          onMorphSelectedPolygon={handleMorphSelectedPolygon}
          onMorphSelectedArrow={handleMorphSelectedArrow}
          onClearSelection={() => {
            fabricRef.current?.discardActiveObject();
            fabricRef.current?.requestRenderAll();
            setSelectedInfo(null);
          }}
          isDarkBg={isDarkBg}
        />
      )}

      {activePopover === 'text' && (
        <TextModal
          t={t}
          onAddText={handleAddText}
          defaultColor={isDarkBg ? '#FFFFFF' : '#0F172A'}
          isDarkBg={isDarkBg}
        />
      )}

      {activePopover === 'stamps' && (
        <StampsPopover
          t={t}
          lang={lang}
          onAddStamp={handleAddStamp}
          onAddEmoji={handleAddEmoji}
          defaultColor={stroke.color}
          isDarkBg={isDarkBg}
        />
      )}

      {activePopover === 'eraser' && (
        <EraserPopover
          t={t}
          size={eraserSize}
          onChangeSize={setEraserSize}
          hasSelectedObject={Boolean(selectedInfo)}
          onDeleteSelected={handleDeleteSelected}
          onRequestClearCanvas={() => setClearConfirmOpen(true)}
          isDarkBg={isDarkBg}
        />
      )}

      {activePopover === 'actions' && (
        <ActionsPopover
          t={t}
          bgConfig={bgConfig}
          onChangeBgConfig={setBgConfig}
          onSelectBgPreset={handleSelectBgPreset}
          canvasSize={canvasSize}
          onChangeCanvasSize={(next, fit) => {
            setCanvasSize(next);
            canvasSizeRef.current = next;
            applyClipForArtboard();
            if (fit) {
              fitViewportToArtboard(next);
            } else {
              redrawBackground();
            }
          }}
          exportScope={exportScope}
          onChangeExportScope={setExportScope}
          onExport={(fmt) => {
            if (!fabricRef.current) return;
            exportCanvasImage(
              fabricRef.current,
              bgConfig,
              fmt,
              canvasSize,
              ARTBOARD_CENTER,
              exportScope
            );
            trackFunction('export_image', 'export', { format: fmt, scope: exportScope });
          }}
          zoomPercent={zoomPercent}
          onResetView={() => fitViewportToArtboard(canvasSizeRef.current)}
          languagePref={languagePref}
          onChangeLanguage={(pref) => {
            setLanguagePref(pref);
            saveLanguagePreference(pref);
          }}
          onOpenHelp={() => {
            setActivePopover(null);
            setHelpOpen(true);
          }}
          onOpenCloudSave={() => {
            setActivePopover(null);
            setCloudModalOpen(true);
          }}
          cloudUserEmail={cloudUser?.email || cloudUser?.displayName || null}
          onTriggerOfflineDownload={handleTriggerOfflineDownload}
          onTriggerZipDownload={handleTriggerZipDownload}
          isDarkBg={isDarkBg}
        />
      )}

      {/* Floating Selected Object Inspector */}
      {selectedInfo && activeMode === 'select' && activePopover !== 'shapes' && (
        <ObjectEditorPopover
          t={t}
          info={selectedInfo}
          onUpdateStroke={handleUpdateSelectedStroke}
          onUpdateFill={handleUpdateSelectedFill}
          onUpdateGrid={handleUpdateSelectedGrid}
          onUpdateOpacity={handleUpdateSelectedOpacity}
          onUpdateCornerRadius={handleUpdateSelectedCornerRadius}
          onUpdateText={handleUpdateSelectedText}
          onEnterTextEdit={() => {
            const fc = fabricRef.current;
            const obj = fc?.getActiveObject();
            if (obj && (obj.type === 'i-text' || obj.type === 'textbox')) {
              obj.enterEditing();
              obj.selectAll?.();
              fc.requestRenderAll();
            }
          }}
          onFlip={(axis) => {
            const fc = fabricRef.current;
            const obj = fc?.getActiveObject();
            if (!fc || !obj) return;
            if (axis === 'x') obj.set('flipX', !obj.flipX);
            else obj.set('flipY', !obj.flipY);
            fc.requestRenderAll();
            pushHistory();
          }}
          onBringForward={() => {
            const fc = fabricRef.current;
            const obj = fc?.getActiveObject();
            if (!fc || !obj) return;
            if (obj.type === 'activeSelection' && Array.isArray(obj._objects)) {
              [...obj._objects].reverse().forEach((o: any) => fc.bringForward(o));
            } else {
              fc.bringForward(obj);
            }
            fc.requestRenderAll();
            pushHistory();
          }}
          onSendBackwards={() => {
            const fc = fabricRef.current;
            const obj = fc?.getActiveObject();
            if (!fc || !obj) return;
            if (obj.type === 'activeSelection' && Array.isArray(obj._objects)) {
              [...obj._objects].forEach((o: any) => fc.sendBackwards(o));
            } else {
              fc.sendBackwards(obj);
            }
            fc.requestRenderAll();
            pushHistory();
          }}
          onBringToFront={() => {
            const fc = fabricRef.current;
            const obj = fc?.getActiveObject();
            if (!fc || !obj) return;
            obj.bringToFront();
            fc.requestRenderAll();
            pushHistory();
          }}
          onSendToBack={() => {
            const fc = fabricRef.current;
            const obj = fc?.getActiveObject();
            if (!fc || !obj) return;
            obj.sendToBack();
            fc.requestRenderAll();
            pushHistory();
          }}
          onDuplicate={handleDuplicateSelected}
          onDelete={handleDeleteSelected}
          onRequestClearCanvas={() => setClearConfirmOpen(true)}
          onClose={() => {
            fabricRef.current?.discardActiveObject();
            fabricRef.current?.requestRenderAll();
            setSelectedInfo(null);
          }}
          isDarkBg={isDarkBg}
        />
      )}

      {/* Clear Canvas Confirmation Modal */}
      {clearConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          onClick={() => setClearConfirmOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-xs rounded-2xl border p-5 space-y-4 shadow-2xl ${
              isDarkBg
                ? 'bg-neutral-900 border-neutral-700 text-neutral-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="text-sm font-semibold text-center">
              {t('clearConfirmPrompt')}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setClearConfirmOpen(false)}
                className={`min-h-[42px] rounded-xl text-xs font-semibold cursor-pointer ${
                  isDarkBg
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {t('clearConfirmNo')}
              </button>
              <button
                type="button"
                onClick={handleClearCanvas}
                className="min-h-[42px] rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
              >
                {t('clearConfirmYes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help & Interactive Tour Modal */}
      {helpOpen && (
        <HelpModal
          lang={lang}
          isDarkBg={isDarkBg}
          dontShowAgain={dontShowTutorialAgain}
          onToggleDontShowAgain={(next) => {
            setDontShowTutorialAgain(next);
            try {
              localStorage.setItem(HIDE_TUTORIAL_STORAGE_KEY, String(next));
            } catch {
              // ignore storage errors
            }
            if (cloudUser) {
              void updateUserTutorialPref(cloudUser.uid, next).catch(() => {
                // ignore network issues while toggling help checkbox
              });
            }
          }}
          onClose={() => setHelpOpen(false)}
        />
      )}

      {/* Cloud Save & Profile Modal */}
      {cloudModalOpen && (
        <CloudSaveModal
          t={t}
          user={cloudUser}
          dontShowTutorialAgain={dontShowTutorialAgain}
          onSyncTutorialPrefFromCloud={(hide) => {
            if (hide) {
              applyTutorialHidePrefLocally(true);
            }
          }}
          activeProjectId={activeCloudProjectId}
          activeProjectTitle={activeCloudProjectTitle}
          onSaveProjectToCloud={handleSaveProjectToCloud}
          onLoadCloudProject={handleLoadCloudProject}
          onActiveProjectDeleted={(deletedId) => {
            if (deletedId === activeCloudProjectId) {
              setActiveCloudProjectId(null);
              setActiveCloudProjectTitle('');
            }
          }}
          onClose={() => setCloudModalOpen(false)}
          isDarkBg={isDarkBg}
        />
      )}
    </div>
  );
}
