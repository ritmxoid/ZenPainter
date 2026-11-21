import * as fabricModule from 'fabric';
import {
  ArrowVariant,
  BackgroundConfig,
  CanvasSizeConfig,
  ExportScope,
  FillSettings,
  HatchPattern,
  LinePattern,
  PolygonVariant,
} from '../types/paint';

declare global {
  interface Window {
    fabric: any;
  }
}

const resolvedFabric =
  (fabricModule as any).fabric ||
  (fabricModule as any).default?.fabric ||
  (fabricModule as any).default ||
  fabricModule;

export function getFabric(): any {
  return resolvedFabric || window.fabric;
}

export function hexToRgba(hex: string, opacity: number): string {
  const clean = hex.replace('#', '');
  let r = 0;
  let g = 0;
  let b = 0;
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else if (clean.length === 6) {
    r = parseInt(clean.slice(0, 2), 16);
    g = parseInt(clean.slice(2, 4), 16);
    b = parseInt(clean.slice(4, 6), 16);
  }
  const alpha = Math.max(0, Math.min(1, opacity));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function applyColorOpacity(hex: string, opacity: number): string {
  const clamped = Math.max(0, Math.min(1, opacity));
  if (clamped >= 0.999) {
    return hex.startsWith('#') ? hex : '#000000';
  }
  return hexToRgba(hex, clamped);
}

export function parseColorAndOpacity(
  colorValue: unknown,
  explicitOpacity?: number
): { hex: string; opacity: number } {
  const fallbackOpacity =
    typeof explicitOpacity === 'number'
      ? Math.max(0, Math.min(1, explicitOpacity))
      : 1;
  if (typeof colorValue !== 'string' || !colorValue.trim()) {
    return { hex: '#000000', opacity: fallbackOpacity };
  }
  const trimmed = colorValue.trim();
  if (trimmed.startsWith('#')) {
    if (trimmed.length === 4) {
      const hex =
        '#' +
        trimmed[1] +
        trimmed[1] +
        trimmed[2] +
        trimmed[2] +
        trimmed[3] +
        trimmed[3];
      return { hex: hex.toUpperCase(), opacity: fallbackOpacity };
    }
    return { hex: trimmed.slice(0, 7).toUpperCase(), opacity: fallbackOpacity };
  }
  const rgbaMatch = trimmed.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i
  );
  if (rgbaMatch) {
    const toHex = (v: string) =>
      Math.max(0, Math.min(255, parseInt(v, 10)))
        .toString(16)
        .padStart(2, '0')
        .toUpperCase();
    const hex = `#${toHex(rgbaMatch[1])}${toHex(rgbaMatch[2])}${toHex(rgbaMatch[3])}`;
    const parsedAlpha =
      rgbaMatch[4] !== undefined ? Math.max(0, Math.min(1, parseFloat(rgbaMatch[4]))) : 1;
    return {
      hex,
      opacity: typeof explicitOpacity === 'number' ? fallbackOpacity : parsedAlpha,
    };
  }
  return { hex: '#000000', opacity: fallbackOpacity };
}

export function getScaledDashArray(pattern: LinePattern, strokeWidth: number): number[] | null {
  const w = Math.max(1, strokeWidth);
  switch (pattern) {
    case 'solid':
      return null;
    case 'dashed':
      return [Math.round(w * 2.8 + 6), Math.round(w * 1.8 + 4)];
    case 'dotted':
      return [1, Math.round(w * 1.6 + 5)];
    case 'dashdot':
      return [
        Math.round(w * 3.2 + 6),
        Math.round(w * 1.5 + 4),
        1,
        Math.round(w * 1.5 + 4),
      ];
    default:
      return null;
  }
}

export function createHatchPattern(
  type: HatchPattern,
  color: string,
  opacity: number
): any {
  const fabric = getFabric();
  if (!fabric) return 'transparent';

  const tile = document.createElement('canvas');
  const size = type === 'dots' ? 18 : 16;
  tile.width = size;
  tile.height = size;
  const ctx = tile.getContext('2d');
  if (!ctx) return 'transparent';

  const rgba = hexToRgba(color, opacity);
  ctx.strokeStyle = rgba;
  ctx.fillStyle = rgba;
  ctx.lineWidth = 2;
  ctx.lineCap = 'square';

  if (type === 'diagonal') {
    ctx.beginPath();
    ctx.moveTo(-2, size + 2);
    ctx.lineTo(size + 2, -2);
    ctx.moveTo(-2, 2);
    ctx.lineTo(2, -2);
    ctx.moveTo(size - 2, size + 2);
    ctx.lineTo(size + 2, size - 2);
    ctx.stroke();
  } else if (type === 'crosshatch') {
    ctx.beginPath();
    ctx.moveTo(-2, size + 2);
    ctx.lineTo(size + 2, -2);
    ctx.moveTo(-2, 2);
    ctx.lineTo(2, -2);
    ctx.moveTo(size - 2, size + 2);
    ctx.lineTo(size + 2, size - 2);
    ctx.moveTo(-2, -2);
    ctx.lineTo(size + 2, size + 2);
    ctx.moveTo(size - 2, -2);
    ctx.lineTo(size + 2, 2);
    ctx.moveTo(-2, size - 2);
    ctx.lineTo(2, size + 2);
    ctx.stroke();
  } else if (type === 'dots') {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'horizontal') {
    ctx.beginPath();
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.stroke();
  }

  return new fabric.Pattern({
    source: tile,
    repeat: 'repeat',
  });
}

const fillImageCache = new Map<string, HTMLImageElement>();
const pendingImageCallbacks = new Map<string, Set<() => void>>();

export function loadFillImage(
  dataUrl: string,
  onLoad?: () => void
): HTMLImageElement | null {
  if (!dataUrl || typeof Image === 'undefined') return null;

  const existing = fillImageCache.get(dataUrl);
  if (existing) {
    if (existing.complete && existing.naturalWidth > 0) {
      return existing;
    }
    if (onLoad) {
      let cbs = pendingImageCallbacks.get(dataUrl);
      if (!cbs) {
        cbs = new Set();
        pendingImageCallbacks.set(dataUrl, cbs);
      }
      cbs.add(onLoad);
    }
    return null;
  }

  const img = new Image();
  fillImageCache.set(dataUrl, img);
  if (onLoad) {
    let cbs = pendingImageCallbacks.get(dataUrl);
    if (!cbs) {
      cbs = new Set();
      pendingImageCallbacks.set(dataUrl, cbs);
    }
    cbs.add(onLoad);
  }

  img.onload = () => {
    const cbs = pendingImageCallbacks.get(dataUrl);
    pendingImageCallbacks.delete(dataUrl);
    if (cbs) {
      cbs.forEach((cb) => {
        try {
          cb();
        } catch {
          // ignore callback errors
        }
      });
    }
  };
  img.onerror = () => {
    pendingImageCallbacks.delete(dataUrl);
  };
  img.src = dataUrl;

  if (img.complete && img.naturalWidth > 0) {
    pendingImageCallbacks.delete(dataUrl);
    return img;
  }
  return null;
}

export const MAX_INSERTED_IMAGE_BYTES = 100 * 1024;

function encodeCanvasToTargetBytes(
  sourceImg: CanvasImageSource,
  naturalW: number,
  naturalH: number,
  preferAlpha: boolean,
  maxDim = 960,
  maxDataUrlBytes = MAX_INSERTED_IMAGE_BYTES
): string {
  const safeW = Math.max(1, naturalW);
  const safeH = Math.max(1, naturalH);
  const startScale = Math.min(1, maxDim / Math.max(safeW, safeH));
  let curW = Math.max(16, Math.round(safeW * startScale));
  let curH = Math.max(16, Math.round(safeH * startScale));

  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  if (!ctx) return '';

  // Probe whether this browser encodes WebP (which supports transparency)
  c.width = 2;
  c.height = 2;
  const supportsWebp = c.toDataURL('image/webp', 0.8).startsWith('data:image/webp');

  const qualities = [0.82, 0.7, 0.58, 0.46, 0.35, 0.25];
  let bestUrl = '';

  for (let step = 0; step < 7; step++) {
    c.width = curW;
    c.height = curH;
    ctx.clearRect(0, 0, curW, curH);

    if (!supportsWebp && !preferAlpha) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, curW, curH);
    }
    ctx.drawImage(sourceImg, 0, 0, curW, curH);

    const mime = supportsWebp
      ? 'image/webp'
      : preferAlpha
        ? 'image/png'
        : 'image/jpeg';

    if (mime === 'image/png') {
      const url = c.toDataURL('image/png');
      bestUrl = url;
      if (url.length <= maxDataUrlBytes) return url;
    } else {
      for (const q of qualities) {
        const url = c.toDataURL(mime, q);
        bestUrl = url;
        if (url.length <= maxDataUrlBytes) return url;
      }
    }

    // Also try JPEG without alpha if transparent PNG fallback failed budget
    if (mime === 'image/png') {
      c.width = curW;
      c.height = curH;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, curW, curH);
      ctx.drawImage(sourceImg, 0, 0, curW, curH);
      for (const q of qualities) {
        const url = c.toDataURL('image/jpeg', q);
        bestUrl = url;
        if (url.length <= maxDataUrlBytes) return url;
      }
    }

    if (curW <= 96 && curH <= 96) break;
    curW = Math.max(48, Math.round(curW * 0.72));
    curH = Math.max(48, Math.round(curH * 0.72));
  }

  return bestUrl;
}

export function encodeTransparentCanvasCompact(
  srcCanvas: HTMLCanvasElement,
  maxDataUrlBytes = MAX_INSERTED_IMAGE_BYTES
): string {
  const probe = document.createElement('canvas');
  probe.width = 2;
  probe.height = 2;
  const supportsWebp = probe.toDataURL('image/webp', 0.85).startsWith('data:image/webp');

  if (supportsWebp) {
    const webpQualities = [0.86, 0.74, 0.62, 0.48, 0.36];
    for (const q of webpQualities) {
      const url = srcCanvas.toDataURL('image/webp', q);
      if (url.length <= maxDataUrlBytes) return url;
    }
  } else {
    const pngUrl = srcCanvas.toDataURL('image/png');
    if (pngUrl.length <= maxDataUrlBytes) return pngUrl;
  }

  const fallback = encodeCanvasToTargetBytes(
    srcCanvas,
    srcCanvas.width,
    srcCanvas.height,
    true,
    Math.max(srcCanvas.width, srcCanvas.height),
    maxDataUrlBytes
  );
  return fallback || srcCanvas.toDataURL(supportsWebp ? 'image/webp' : 'image/png');
}

export function compressDataUrlToMaxBytes(
  rawUrl: string,
  maxDim = 960,
  maxDataUrlBytes = MAX_INSERTED_IMAGE_BYTES
): Promise<string> {
  if (!rawUrl || rawUrl.length <= maxDataUrlBytes) {
    return Promise.resolve(rawUrl);
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onerror = () => resolve(rawUrl);
    img.onload = () => {
      const iw = img.naturalWidth || img.width || 1;
      const ih = img.naturalHeight || img.height || 1;
      const preferAlpha =
        rawUrl.startsWith('data:image/png') ||
        rawUrl.startsWith('data:image/webp') ||
        rawUrl.startsWith('data:image/svg');
      const compressed = encodeCanvasToTargetBytes(
        img,
        iw,
        ih,
        preferAlpha,
        maxDim,
        maxDataUrlBytes
      );
      resolve(compressed || rawUrl);
    };
    img.src = rawUrl;
  });
}

export function downscaleImageFileToDataUrl(
  file: File,
  maxDim = 960,
  maxDataUrlBytes = MAX_INSERTED_IMAGE_BYTES
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (ev) => {
      const rawUrl = ev.target?.result as string;
      if (!rawUrl) {
        reject(new Error('Empty image data'));
        return;
      }

      if (rawUrl.length <= maxDataUrlBytes && file.type !== 'image/svg+xml') {
        resolve(rawUrl);
        return;
      }

      const img = new Image();
      img.onerror = () => resolve(rawUrl);
      img.onload = () => {
        const iw = img.naturalWidth || img.width || 1;
        const ih = img.naturalHeight || img.height || 1;
        const preferAlpha =
          file.type === 'image/png' ||
          file.type === 'image/webp' ||
          file.type === 'image/svg+xml';
        const compressed = encodeCanvasToTargetBytes(
          img,
          iw,
          ih,
          preferAlpha,
          maxDim,
          maxDataUrlBytes
        );
        resolve(compressed || rawUrl);
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  });
}

function renderPhotoToOffscreenCanvas(
  img: HTMLImageElement,
  targetW: number,
  targetH: number,
  opacity: number
): HTMLCanvasElement | null {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return null;

  const safeW = Math.max(1, targetW);
  const safeH = Math.max(1, targetH);
  const maxSide = Math.max(256, Math.min(1024, Math.round(Math.max(safeW, safeH))));
  const offW =
    safeW >= safeH ? maxSide : Math.max(16, Math.round(maxSide * (safeW / safeH)));
  const offH =
    safeH >= safeW ? maxSide : Math.max(16, Math.round(maxSide * (safeH / safeW)));

  const offCanvas = document.createElement('canvas');
  offCanvas.width = offW;
  offCanvas.height = offH;
  const ctx = offCanvas.getContext('2d');
  if (!ctx) return null;

  const coverScale = Math.max(offW / iw, offH / ih);
  const dw = iw * coverScale;
  const dh = ih * coverScale;
  const dx = (offW - dw) / 2;
  const dy = (offH - dh) / 2;

  ctx.clearRect(0, 0, offW, offH);
  ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
  ctx.drawImage(img, dx, dy, dw, dh);
  return offCanvas;
}

export function isFillableStampChild(child: any): boolean {
  if (!child) return false;
  if (
    child.type === 'rect' ||
    child.type === 'circle' ||
    child.type === 'ellipse' ||
    child.type === 'polygon'
  ) {
    return true;
  }
  if (child.type === 'path' && Array.isArray(child.path) && child.path.length > 0) {
    if (child.path.some((cmd: any) => cmd && (cmd[0] === 'Z' || cmd[0] === 'z'))) {
      return true;
    }
    let startX: number | null = null;
    let startY: number | null = null;
    let lastX: number | null = null;
    let lastY: number | null = null;
    let segments = 0;

    for (let i = 0; i < child.path.length; i++) {
      const cmd = child.path[i];
      if (!cmd) continue;
      const op = cmd[0];
      if (op === 'M') {
        startX = Number(cmd[1]);
        startY = Number(cmd[2]);
        lastX = startX;
        lastY = startY;
      } else if (op === 'L' || op === 'T') {
        lastX = Number(cmd[1]);
        lastY = Number(cmd[2]);
        segments++;
      } else if (op === 'Q' || op === 'S') {
        lastX = Number(cmd[3]);
        lastY = Number(cmd[4]);
        segments++;
      } else if (op === 'C') {
        lastX = Number(cmd[5]);
        lastY = Number(cmd[6]);
        segments++;
      } else if (op === 'A') {
        lastX = Number(cmd[6]);
        lastY = Number(cmd[7]);
        segments++;
      }
    }

    if (
      segments >= 2 &&
      startX !== null &&
      startY !== null &&
      lastX !== null &&
      lastY !== null &&
      Math.hypot(lastX - startX, lastY - startY) <= 1.5
    ) {
      return true;
    }
  }
  return false;
}

export function hasFillableStampParts(obj: any): boolean {
  if (!obj || !obj.isStampGroup || !Array.isArray(obj._objects)) return false;
  return obj._objects.some((child: any) => isFillableStampChild(child));
}

export function buildFillValue(
  fill: FillSettings,
  targetWidth = 240,
  targetHeight = 240,
  onPhotoReady?: () => void
): any {
  const fabric = getFabric();
  if (fill.mode === 'none') {
    return 'transparent';
  }
  if (fill.mode === 'solid') {
    return hexToRgba(fill.color, fill.opacity);
  }
  if (fill.mode === 'photo') {
    if (!fabric || !fill.photoDataUrl) return 'transparent';
    const img = loadFillImage(fill.photoDataUrl, onPhotoReady);
    if (!img) return 'transparent';
    const safeW = Math.max(1, targetWidth);
    const safeH = Math.max(1, targetHeight);
    const offCanvas = renderPhotoToOffscreenCanvas(img, safeW, safeH, fill.opacity);
    if (!offCanvas) return 'transparent';
    return new fabric.Pattern({
      source: offCanvas,
      repeat: 'no-repeat',
      offsetX: 0,
      offsetY: 0,
      patternTransform: [safeW / offCanvas.width, 0, 0, safeH / offCanvas.height, 0, 0],
    });
  }
  return createHatchPattern(fill.hatchPattern, fill.color, fill.opacity);
}

export function applyFillToObject(
  obj: any,
  fill: FillSettings,
  fabricCanvas?: any
): void {
  const fabric = getFabric();
  if (!obj || !fabric) return;

  const fillCopy: FillSettings = { ...fill };
  obj.set({ fillMeta: fillCopy });

  const handlePhotoReady = () => {
    const latestMeta = obj.fillMeta || fillCopy;
    if (latestMeta.mode === 'photo') {
      applyFillToObject(obj, latestMeta, fabricCanvas);
      fabricCanvas?.requestRenderAll();
    }
  };

  if (obj.isStampGroup && Array.isArray(obj._objects)) {
    if (fillCopy.mode === 'photo') {
      if (!fillCopy.photoDataUrl) {
        obj._objects.forEach((c: any) => c.set({ fill: 'transparent', dirty: true }));
        obj.set({ dirty: true });
        return;
      }
      const img = loadFillImage(fillCopy.photoDataUrl, handlePhotoReady);
      if (!img) {
        obj._objects.forEach((c: any) => c.set({ fill: 'transparent', dirty: true }));
        obj.set({ dirty: true });
        return;
      }

      const gw = Math.max(1, obj.width || 24);
      const gh = Math.max(1, obj.height || 24);
      const worldW = Math.max(1, gw * Math.abs(obj.scaleX || 1));
      const worldH = Math.max(1, gh * Math.abs(obj.scaleY || 1));
      const offCanvas = renderPhotoToOffscreenCanvas(img, worldW, worldH, fillCopy.opacity);
      if (!offCanvas) {
        obj._objects.forEach((c: any) => c.set({ fill: 'transparent', dirty: true }));
        obj.set({ dirty: true });
        return;
      }

      const offW = offCanvas.width;
      const offH = offCanvas.height;

      obj._objects.forEach((c: any) => {
        if (!isFillableStampChild(c)) {
          c.set({ fill: 'transparent', dirty: true });
          return;
        }
        const cCenter = c.getCenterPoint();
        const cW = Math.max(0.01, c.width || 0.01);
        const cH = Math.max(0.01, c.height || 0.01);
        const cScaleX = c.scaleX || 1;
        const cScaleY = c.scaleY || 1;
        const offsetX = cW / 2 - (gw / 2 + cCenter.x) / cScaleX;
        const offsetY = cH / 2 - (gh / 2 + cCenter.y) / cScaleY;
        const pattern = new fabric.Pattern({
          source: offCanvas,
          repeat: 'no-repeat',
          offsetX,
          offsetY,
          patternTransform: [gw / (offW * cScaleX), 0, 0, gh / (offH * cScaleY), 0, 0],
        });
        c.set({ fill: pattern, dirty: true });
      });
      obj.set({ dirty: true });
      return;
    }

    const simpleFillVal = buildFillValue(fillCopy);
    obj._objects.forEach((c: any) => {
      c.set({
        fill: isFillableStampChild(c) ? simpleFillVal : 'transparent',
        dirty: true,
      });
    });
    obj.set({ dirty: true });
    return;
  }

  if (fillCopy.mode === 'photo') {
    if (!fillCopy.photoDataUrl) {
      obj.set({ fill: 'transparent', dirty: true });
      return;
    }
    const img = loadFillImage(fillCopy.photoDataUrl, handlePhotoReady);
    if (!img) {
      obj.set({ fill: 'transparent', dirty: true });
      return;
    }
    const objW = Math.max(1, obj.width || 1);
    const objH = Math.max(1, obj.height || 1);
    const worldW = Math.max(1, objW * Math.abs(obj.scaleX || 1));
    const worldH = Math.max(1, objH * Math.abs(obj.scaleY || 1));
    const offCanvas = renderPhotoToOffscreenCanvas(img, worldW, worldH, fillCopy.opacity);
    if (!offCanvas) {
      obj.set({ fill: 'transparent', dirty: true });
      return;
    }
    const pattern = new fabric.Pattern({
      source: offCanvas,
      repeat: 'no-repeat',
      offsetX: 0,
      offsetY: 0,
      patternTransform: [objW / offCanvas.width, 0, 0, objH / offCanvas.height, 0, 0],
    });
    obj.set({ fill: pattern, dirty: true });
    return;
  }

  obj.set({ fill: buildFillValue(fillCopy), dirty: true });
}

export function refreshObjectPhotoFill(obj: any, fabricCanvas?: any): void {
  if (!obj || obj.fillMeta?.mode !== 'photo' || !obj.fillMeta.photoDataUrl) return;
  applyFillToObject(obj, obj.fillMeta, fabricCanvas);
}

export function buildStarPoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  spikes = 5,
  innerRatio = 0.42
): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;

  for (let i = 0; i < spikes; i++) {
    pts.push({
      x: cx + Math.cos(rot) * rx,
      y: cy + Math.sin(rot) * ry,
    });
    rot += step;
    pts.push({
      x: cx + Math.cos(rot) * rx * innerRatio,
      y: cy + Math.sin(rot) * ry * innerRatio,
    });
    rot += step;
  }
  return pts;
}

export function buildRegularPolygonPoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  sides: number,
  startAngle = -Math.PI / 2
): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  const step = (Math.PI * 2) / sides;
  for (let i = 0; i < sides; i++) {
    const a = startAngle + i * step;
    pts.push({
      x: cx + Math.cos(a) * rx,
      y: cy + Math.sin(a) * ry,
    });
  }
  return pts;
}

export function buildPolygonPoints(
  variant: PolygonVariant,
  cx: number,
  cy: number,
  rx: number,
  ry: number
): Array<{ x: number; y: number }> {
  const safeRx = Math.max(2, rx);
  const safeRy = Math.max(2, ry);

  switch (variant) {
    case 'star5':
      return buildStarPoints(cx, cy, safeRx, safeRy, 5, 0.42);
    case 'star4':
      return buildStarPoints(cx, cy, safeRx, safeRy, 4, 0.34);
    case 'star6':
      return buildStarPoints(cx, cy, safeRx, safeRy, 6, 0.5);
    case 'star8':
      return buildStarPoints(cx, cy, safeRx, safeRy, 8, 0.62);
    case 'diamond':
      return [
        { x: cx, y: cy - safeRy },
        { x: cx + safeRx, y: cy },
        { x: cx, y: cy + safeRy },
        { x: cx - safeRx, y: cy },
      ];
    case 'pentagon':
      return buildRegularPolygonPoints(cx, cy, safeRx, safeRy, 5);
    case 'hexagon':
      return buildRegularPolygonPoints(cx, cy, safeRx, safeRy, 6);
    case 'octagon':
      return buildRegularPolygonPoints(cx, cy, safeRx, safeRy, 8, -Math.PI / 2 + Math.PI / 8);
    case 'trapezoid':
      return [
        { x: cx - safeRx * 0.58, y: cy - safeRy },
        { x: cx + safeRx * 0.58, y: cy - safeRy },
        { x: cx + safeRx, y: cy + safeRy },
        { x: cx - safeRx, y: cy + safeRy },
      ];
    case 'parallelogram':
      return [
        { x: cx - safeRx * 0.42, y: cy - safeRy },
        { x: cx + safeRx, y: cy - safeRy },
        { x: cx + safeRx * 0.42, y: cy + safeRy },
        { x: cx - safeRx, y: cy + safeRy },
      ];
    case 'cross': {
      const armX = safeRx * 0.34;
      const armY = safeRy * 0.34;
      return [
        { x: cx - armX, y: cy - safeRy },
        { x: cx + armX, y: cy - safeRy },
        { x: cx + armX, y: cy - armY },
        { x: cx + safeRx, y: cy - armY },
        { x: cx + safeRx, y: cy + armY },
        { x: cx + armX, y: cy + armY },
        { x: cx + armX, y: cy + safeRy },
        { x: cx - armX, y: cy + safeRy },
        { x: cx - armX, y: cy + armY },
        { x: cx - safeRx, y: cy + armY },
        { x: cx - safeRx, y: cy - armY },
        { x: cx - armX, y: cy - armY },
      ];
    }
    case 'tagArrow':
      return [
        { x: cx - safeRx, y: cy - safeRy * 0.72 },
        { x: cx + safeRx * 0.38, y: cy - safeRy * 0.72 },
        { x: cx + safeRx, y: cy },
        { x: cx + safeRx * 0.38, y: cy + safeRy * 0.72 },
        { x: cx - safeRx, y: cy + safeRy * 0.72 },
      ];
    default:
      return buildStarPoints(cx, cy, safeRx, safeRy, 5, 0.42);
  }
}

export function computeRoundedPolygonPoints(
  basePoints: Array<{ x: number; y: number }>,
  ratio: number,
  scaleX = 1,
  scaleY = 1
): Array<{ x: number; y: number }> {
  const clamped = Math.max(0, Math.min(1, ratio));
  if (clamped <= 0.005 || basePoints.length < 3) {
    return basePoints.map((p) => ({ x: p.x, y: p.y }));
  }

  const sx = Math.max(0.05, Math.abs(scaleX || 1));
  const sy = Math.max(0.05, Math.abs(scaleY || 1));
  const scaled = basePoints.map((p) => ({ x: p.x * sx, y: p.y * sy }));
  const n = scaled.length;
  const out: Array<{ x: number; y: number }> = [];
  const segments = 7;

  for (let i = 0; i < n; i++) {
    const prev = scaled[(i - 1 + n) % n];
    const curr = scaled[i];
    const next = scaled[(i + 1) % n];

    const ux = prev.x - curr.x;
    const uy = prev.y - curr.y;
    const vx = next.x - curr.x;
    const vy = next.y - curr.y;

    const len1 = Math.hypot(ux, uy);
    const len2 = Math.hypot(vx, vy);

    if (len1 < 0.001 || len2 < 0.001) {
      out.push({ x: curr.x / sx, y: curr.y / sy });
      continue;
    }

    const maxCut = Math.min(len1, len2) * 0.48;
    const cut = maxCut * clamped;
    if (cut < 0.25) {
      out.push({ x: curr.x / sx, y: curr.y / sy });
      continue;
    }

    const ax = curr.x + (ux / len1) * cut;
    const ay = curr.y + (uy / len1) * cut;
    const bx = curr.x + (vx / len2) * cut;
    const by = curr.y + (vy / len2) * cut;

    for (let s = 0; s <= segments; s++) {
      const t = s / segments;
      const omt = 1 - t;
      const qx = omt * omt * ax + 2 * omt * t * curr.x + t * t * bx;
      const qy = omt * omt * ay + 2 * omt * t * curr.y + t * t * by;
      out.push({ x: qx / sx, y: qy / sy });
    }
  }

  return out;
}

type LocalPt = { x: number; y: number };
type LocalPathSeg =
  | { type: 'L'; from: LocalPt; to: LocalPt }
  | { type: 'Q'; from: LocalPt; cp1: LocalPt; to: LocalPt }
  | { type: 'C'; from: LocalPt; cp1: LocalPt; cp2: LocalPt; to: LocalPt };

function lerpLocalPt(a: LocalPt, b: LocalPt, t: number): LocalPt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function splitQuadLocal(
  p0: LocalPt,
  p1: LocalPt,
  p2: LocalPt,
  t: number
): [LocalPathSeg, LocalPathSeg] {
  const a = lerpLocalPt(p0, p1, t);
  const b = lerpLocalPt(p1, p2, t);
  const m = lerpLocalPt(a, b, t);
  return [
    { type: 'Q', from: p0, cp1: a, to: m },
    { type: 'Q', from: m, cp1: b, to: p2 },
  ];
}

function splitCubicLocal(
  p0: LocalPt,
  p1: LocalPt,
  p2: LocalPt,
  p3: LocalPt,
  t: number
): [LocalPathSeg, LocalPathSeg] {
  const a = lerpLocalPt(p0, p1, t);
  const b = lerpLocalPt(p1, p2, t);
  const c = lerpLocalPt(p2, p3, t);
  const d = lerpLocalPt(a, b, t);
  const e = lerpLocalPt(b, c, t);
  const m = lerpLocalPt(d, e, t);
  return [
    { type: 'C', from: p0, cp1: a, cp2: d, to: m },
    { type: 'C', from: m, cp1: e, cp2: c, to: p3 },
  ];
}

function trimLocalSegment(
  seg: LocalPathSeg,
  tStart: number,
  tEnd: number
): LocalPathSeg {
  const ts = Math.max(0, Math.min(0.49, tStart));
  const te = Math.max(0, Math.min(0.49, tEnd));
  if (ts <= 1e-4 && te <= 1e-4) return seg;

  if (seg.type === 'L') {
    return {
      type: 'L',
      from: lerpLocalPt(seg.from, seg.to, ts),
      to: lerpLocalPt(seg.from, seg.to, 1 - te),
    };
  }

  if (seg.type === 'Q') {
    let cur: LocalPathSeg = seg;
    if (ts > 1e-4) {
      cur = splitQuadLocal(cur.from, cur.cp1, cur.to, ts)[1];
    }
    if (te > 1e-4 && cur.type === 'Q') {
      const remT = Math.max(0.01, Math.min(0.99, (1 - te - ts) / Math.max(1e-4, 1 - ts)));
      cur = splitQuadLocal(cur.from, cur.cp1, cur.to, remT)[0];
    }
    return cur;
  }

  let cur: LocalPathSeg = seg;
  if (ts > 1e-4) {
    cur = splitCubicLocal(cur.from, cur.cp1, cur.cp2, cur.to, ts)[1];
  }
  if (te > 1e-4 && cur.type === 'C') {
    const remT = Math.max(0.01, Math.min(0.99, (1 - te - ts) / Math.max(1e-4, 1 - ts)));
    cur = splitCubicLocal(cur.from, cur.cp1, cur.cp2, cur.to, remT)[0];
  }
  return cur;
}

function localSegmentLength(seg: LocalPathSeg): number {
  const chord = Math.hypot(seg.to.x - seg.from.x, seg.to.y - seg.from.y);
  if (seg.type === 'L') return chord;
  if (seg.type === 'Q') {
    const poly =
      Math.hypot(seg.cp1.x - seg.from.x, seg.cp1.y - seg.from.y) +
      Math.hypot(seg.to.x - seg.cp1.x, seg.to.y - seg.cp1.y);
    return (chord + poly) / 2;
  }
  const poly =
    Math.hypot(seg.cp1.x - seg.from.x, seg.cp1.y - seg.from.y) +
    Math.hypot(seg.cp2.x - seg.cp1.x, seg.cp2.y - seg.cp1.y) +
    Math.hypot(seg.to.x - seg.cp2.x, seg.to.y - seg.cp2.y);
  return (chord + poly) / 2;
}

function getCornerTangents(
  inSeg: LocalPathSeg,
  outSeg: LocalPathSeg,
  vertex: LocalPt
): { inVec: LocalPt; outVec: LocalPt } {
  let inRef = inSeg.from;
  if (inSeg.type === 'Q') {
    inRef =
      Math.hypot(inSeg.cp1.x - vertex.x, inSeg.cp1.y - vertex.y) > 0.1
        ? inSeg.cp1
        : inSeg.from;
  } else if (inSeg.type === 'C') {
    if (Math.hypot(inSeg.cp2.x - vertex.x, inSeg.cp2.y - vertex.y) > 0.1) {
      inRef = inSeg.cp2;
    } else if (Math.hypot(inSeg.cp1.x - vertex.x, inSeg.cp1.y - vertex.y) > 0.1) {
      inRef = inSeg.cp1;
    }
  }

  let outRef = outSeg.to;
  if (outSeg.type === 'Q') {
    outRef =
      Math.hypot(outSeg.cp1.x - vertex.x, outSeg.cp1.y - vertex.y) > 0.1
        ? outSeg.cp1
        : outSeg.to;
  } else if (outSeg.type === 'C') {
    if (Math.hypot(outSeg.cp1.x - vertex.x, outSeg.cp1.y - vertex.y) > 0.1) {
      outRef = outSeg.cp1;
    } else if (Math.hypot(outSeg.cp2.x - vertex.x, outSeg.cp2.y - vertex.y) > 0.1) {
      outRef = outSeg.cp2;
    }
  }

  return {
    inVec: { x: inRef.x - vertex.x, y: inRef.y - vertex.y },
    outVec: { x: outRef.x - vertex.x, y: outRef.y - vertex.y },
  };
}

function extractLocalPathSegments(
  commands: any[],
  sx = 1,
  sy = 1
): { segs: LocalPathSeg[]; closed: boolean } {
  const segs: LocalPathSeg[] = [];
  let cur: LocalPt | null = null;
  let subStart: LocalPt | null = null;
  let closed = false;

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    if (!cmd) continue;
    const op = cmd[0];
    if (op === 'M') {
      cur = { x: cmd[1] * sx, y: cmd[2] * sy };
      subStart = cur;
    } else if (op === 'L' && cur) {
      const next = { x: cmd[1] * sx, y: cmd[2] * sy };
      if (Math.hypot(next.x - cur.x, next.y - cur.y) > 0.05) {
        segs.push({ type: 'L', from: cur, to: next });
        cur = next;
      }
    } else if (op === 'Q' && cur) {
      const cp1 = { x: cmd[1] * sx, y: cmd[2] * sy };
      const next = { x: cmd[3] * sx, y: cmd[4] * sy };
      if (Math.hypot(next.x - cur.x, next.y - cur.y) > 0.05) {
        segs.push({ type: 'Q', from: cur, cp1, to: next });
        cur = next;
      }
    } else if (op === 'C' && cur) {
      const cp1 = { x: cmd[1] * sx, y: cmd[2] * sy };
      const cp2 = { x: cmd[3] * sx, y: cmd[4] * sy };
      const next = { x: cmd[5] * sx, y: cmd[6] * sy };
      if (Math.hypot(next.x - cur.x, next.y - cur.y) > 0.05) {
        segs.push({ type: 'C', from: cur, cp1, cp2, to: next });
        cur = next;
      }
    } else if ((op === 'Z' || op === 'z') && cur && subStart) {
      closed = true;
      if (Math.hypot(subStart.x - cur.x, subStart.y - cur.y) > 0.25) {
        segs.push({ type: 'L', from: cur, to: subStart });
      }
      cur = subStart;
    }
  }

  return { segs, closed };
}

export function computeRoundedPathCommands(
  baseCommands: any[],
  ratio: number,
  scaleX = 1,
  scaleY = 1
): any[] {
  const clamped = Math.max(0, Math.min(1, ratio));
  if (clamped <= 0.005 || !Array.isArray(baseCommands) || baseCommands.length < 2) {
    return baseCommands.map((cmd) => [...cmd]);
  }

  const sx = Math.max(0.05, Math.abs(scaleX || 1));
  const sy = Math.max(0.05, Math.abs(scaleY || 1));
  const { segs, closed } = extractLocalPathSegments(baseCommands, sx, sy);

  if (segs.length < 2) {
    return baseCommands.map((cmd) => [...cmd]);
  }

  const n = segs.length;
  const lengths = segs.map((s) => Math.max(0.001, localSegmentLength(s)));
  const trimStart = new Array<number>(n).fill(0);
  const trimEnd = new Array<number>(n).fill(0);

  const junctionCount = closed ? n : n - 1;
  for (let j = 0; j < junctionCount; j++) {
    const inIdx = closed ? (j - 1 + n) % n : j;
    const outIdx = closed ? j : j + 1;
    const inSeg = segs[inIdx];
    const outSeg = segs[outIdx];
    const vertex = inSeg.to;

    const { inVec, outVec } = getCornerTangents(inSeg, outSeg, vertex);
    const uLen = Math.hypot(inVec.x, inVec.y);
    const vLen = Math.hypot(outVec.x, outVec.y);
    if (uLen < 0.1 || vLen < 0.1) continue;

    const dot = (inVec.x * outVec.x + inVec.y * outVec.y) / (uLen * vLen);
    // Already tangent-continuous join (~180 deg)
    if (dot < -0.996) continue;

    const cut = Math.min(lengths[inIdx], lengths[outIdx]) * 0.46 * clamped;
    if (cut < 0.25) continue;

    trimEnd[inIdx] = cut;
    trimStart[outIdx] = cut;
  }

  const trimmed = segs.map((seg, i) =>
    trimLocalSegment(seg, trimStart[i] / lengths[i], trimEnd[i] / lengths[i])
  );

  const cmds: any[] = [['M', trimmed[0].from.x / sx, trimmed[0].from.y / sy]];
  for (let i = 0; i < n; i++) {
    const cur = trimmed[i];
    if (cur.type === 'L') {
      cmds.push(['L', cur.to.x / sx, cur.to.y / sy]);
    } else if (cur.type === 'Q') {
      cmds.push(['Q', cur.cp1.x / sx, cur.cp1.y / sy, cur.to.x / sx, cur.to.y / sy]);
    } else {
      cmds.push([
        'C',
        cur.cp1.x / sx,
        cur.cp1.y / sy,
        cur.cp2.x / sx,
        cur.cp2.y / sy,
        cur.to.x / sx,
        cur.to.y / sy,
      ]);
    }

    if (closed || i < n - 1) {
      const next = trimmed[(i + 1) % n];
      const vertex = segs[i].to;
      if (Math.hypot(next.from.x - cur.to.x, next.from.y - cur.to.y) > 0.2) {
        cmds.push(['Q', vertex.x / sx, vertex.y / sy, next.from.x / sx, next.from.y / sy]);
      }
    }
  }

  if (closed) {
    cmds.push(['Z']);
  }

  return cmds;
}

function isRoundablePathObject(obj: any): boolean {
  if (!obj || obj.type !== 'path' || !Array.isArray(obj.path) || obj.path.length < 2) {
    return false;
  }
  const sourceCmds =
    Array.isArray(obj.basePathCommands) && obj.basePathCommands.length >= 2
      ? obj.basePathCommands
      : obj.path;
  const { segs, closed } = extractLocalPathSegments(sourceCmds, 1, 1);
  if (closed || obj.isClosedContour) {
    return segs.length >= 2;
  }
  return segs.length >= 2;
}

export function isObjectCornerRoundable(obj: any): boolean {
  if (
    !obj ||
    obj.excludeFromExport ||
    obj.isEraserPath ||
    obj.isArrowGroup ||
    obj.isStampGroup ||
    obj.isSprayGroup
  ) {
    return false;
  }
  if (obj.type === 'rect' || obj.type === 'polygon' || obj.type === 'triangle') {
    return true;
  }
  if (obj.type === 'path') {
    return isRoundablePathObject(obj);
  }
  return false;
}

export function getObjectCornerRoundRatio(obj: any): number | null {
  if (!isObjectCornerRoundable(obj)) return null;
  if (typeof obj.cornerRoundRatio === 'number') {
    return Math.max(0, Math.min(1, obj.cornerRoundRatio));
  }
  if (obj.type === 'rect') {
    const w = (obj.width || 0) * Math.abs(obj.scaleX || 1);
    const h = (obj.height || 0) * Math.abs(obj.scaleY || 1);
    const maxR = Math.max(1, Math.min(w, h) / 2);
    const curR = ((obj.rx || 0) * Math.abs(obj.scaleX || 1) + (obj.ry || 0) * Math.abs(obj.scaleY || 1)) / 2;
    return Math.max(0, Math.min(1, curR / maxR));
  }
  return 0;
}

export function applyCornerRoundingToObject(obj: any, ratio: number): boolean {
  const fabric = getFabric();
  if (!fabric || !isObjectCornerRoundable(obj)) return false;

  const clamped = Math.max(0, Math.min(1, ratio));

  if (obj.type === 'rect') {
    const sx = Math.max(0.05, Math.abs(obj.scaleX || 1));
    const sy = Math.max(0.05, Math.abs(obj.scaleY || 1));
    const worldW = (obj.width || 0) * sx;
    const worldH = (obj.height || 0) * sy;
    const worldR = clamped * (Math.min(worldW, worldH) / 2);
    obj.set({
      rx: worldR / sx,
      ry: worldR / sy,
      cornerRoundRatio: clamped,
      dirty: true,
    });
    return true;
  }

  if (obj.type === 'polygon') {
    if (!Array.isArray(obj.baseLocalPoints) || obj.baseLocalPoints.length < 3) {
      if (!Array.isArray(obj.points) || obj.points.length < 3) return false;
      obj.baseLocalPoints = obj.points.map((p: any) => ({ x: p.x, y: p.y }));
      obj.baseWidth = obj.width;
      obj.baseHeight = obj.height;
      obj.basePathOffset = { x: obj.pathOffset?.x || 0, y: obj.pathOffset?.y || 0 };
    }

    const nextPts = computeRoundedPolygonPoints(
      obj.baseLocalPoints,
      clamped,
      obj.scaleX || 1,
      obj.scaleY || 1
    );
    obj.set({
      points: nextPts,
      cornerRoundRatio: clamped,
      width: obj.baseWidth ?? obj.width,
      height: obj.baseHeight ?? obj.height,
      pathOffset: obj.basePathOffset
        ? new fabric.Point(obj.basePathOffset.x, obj.basePathOffset.y)
        : obj.pathOffset,
      dirty: true,
    });
    return true;
  }

  if (obj.type === 'path') {
    if (!Array.isArray(obj.basePathCommands) || obj.basePathCommands.length < 2) {
      if (!Array.isArray(obj.path) || obj.path.length < 2) return false;
      obj.basePathCommands = obj.path.map((cmd: any[]) => [...cmd]);
      obj.baseWidth = obj.width;
      obj.baseHeight = obj.height;
      obj.basePathOffset = { x: obj.pathOffset?.x || 0, y: obj.pathOffset?.y || 0 };
    }

    const nextCmds = computeRoundedPathCommands(
      obj.basePathCommands,
      clamped,
      obj.scaleX || 1,
      obj.scaleY || 1
    );
    obj.set({
      path: nextCmds,
      cornerRoundRatio: clamped,
      width: obj.baseWidth ?? obj.width,
      height: obj.baseHeight ?? obj.height,
      pathOffset: obj.basePathOffset
        ? new fabric.Point(obj.basePathOffset.x, obj.basePathOffset.y)
        : obj.pathOffset,
      dirty: true,
    });
    return true;
  }

  if (obj.type === 'triangle') {
    obj.set({
      cornerRoundRatio: clamped,
      dirty: true,
    });
    return true;
  }

  return false;
}

export function getObjectCornerWorldVertices(
  obj: any
): Array<{ x: number; y: number }> {
  const fabric = getFabric();
  if (!fabric || !obj || !isObjectCornerRoundable(obj)) return [];

  const mat = obj.calcTransformMatrix();
  const toWorld = (lx: number, ly: number) => {
    const p = fabric.util.transformPoint(new fabric.Point(lx, ly), mat);
    return { x: p.x, y: p.y };
  };

  if (obj.type === 'rect') {
    const w2 = (obj.width || 0) / 2;
    const h2 = (obj.height || 0) / 2;
    if (w2 < 1 || h2 < 1) return [];
    return [
      toWorld(-w2, -h2),
      toWorld(w2, -h2),
      toWorld(w2, h2),
      toWorld(-w2, h2),
    ];
  }

  if (obj.type === 'triangle') {
    const w2 = (obj.width || 0) / 2;
    const h2 = (obj.height || 0) / 2;
    if (w2 < 1 || h2 < 1) return [];
    return [
      toWorld(0, -h2),
      toWorld(w2, h2),
      toWorld(-w2, h2),
    ];
  }

  if (obj.type === 'polygon') {
    const rawPts =
      Array.isArray(obj.baseLocalPoints) && obj.baseLocalPoints.length >= 3
        ? obj.baseLocalPoints
        : obj.points;
    if (!Array.isArray(rawPts) || rawPts.length < 3) return [];
    const ox = obj.basePathOffset?.x ?? obj.pathOffset?.x ?? 0;
    const oy = obj.basePathOffset?.y ?? obj.pathOffset?.y ?? 0;
    return rawPts.map((pt: any) => toWorld((pt.x || 0) - ox, (pt.y || 0) - oy));
  }

  if (obj.type === 'path') {
    const cmds =
      Array.isArray(obj.basePathCommands) && obj.basePathCommands.length >= 2
        ? obj.basePathCommands
        : obj.path;
    if (!Array.isArray(cmds) || cmds.length < 2) return [];
    const ox = obj.basePathOffset?.x ?? obj.pathOffset?.x ?? 0;
    const oy = obj.basePathOffset?.y ?? obj.pathOffset?.y ?? 0;
    const vertices: Array<{ x: number; y: number }> = [];
    const pushUnique = (lx: number, ly: number) => {
      const wpt = toWorld(lx - ox, ly - oy);
      const last = vertices[vertices.length - 1];
      if (last && Math.hypot(wpt.x - last.x, wpt.y - last.y) < 2) return;
      vertices.push(wpt);
    };
    for (let i = 0; i < cmds.length; i++) {
      const c = cmds[i];
      if (!c) continue;
      const op = c[0];
      if (op === 'M' || op === 'L' || op === 'T') {
        pushUnique(Number(c[1]), Number(c[2]));
      } else if (op === 'Q' || op === 'S') {
        pushUnique(Number(c[3]), Number(c[4]));
      } else if (op === 'C') {
        pushUnique(Number(c[5]), Number(c[6]));
      } else if (op === 'A') {
        pushUnique(Number(c[6]), Number(c[7]));
      }
    }
    if (vertices.length >= 2) {
      const first = vertices[0];
      const last = vertices[vertices.length - 1];
      if (Math.hypot(first.x - last.x, first.y - last.y) < 3) {
        vertices.pop();
      }
    }
    return vertices;
  }

  return [];
}

export function buildBlockArrowPoints(
  variant: 'filled' | 'filledDouble',
  length: number,
  strokeWidth = 2
): Array<{ x: number; y: number }> {
  const L = Math.max(16, length);
  const halfL = L / 2;
  const sw = Math.max(1, strokeWidth);
  if (variant === 'filledDouble') {
    const headLen = Math.min(Math.max(13, sw * 2.1 + 10), L * 0.36);
    const headHalfW = Math.max(8, headLen * 0.64);
    const shaftHalfW = Math.max(3, Math.min(headHalfW * 0.46, sw * 1.1 + 3.5));
    const leftNeck = -halfL + headLen;
    const rightNeck = halfL - headLen;
    return [
      { x: -halfL, y: 0 },
      { x: leftNeck, y: -headHalfW },
      { x: leftNeck, y: -shaftHalfW },
      { x: rightNeck, y: -shaftHalfW },
      { x: rightNeck, y: -headHalfW },
      { x: halfL, y: 0 },
      { x: rightNeck, y: headHalfW },
      { x: rightNeck, y: shaftHalfW },
      { x: leftNeck, y: shaftHalfW },
      { x: leftNeck, y: headHalfW },
    ];
  }

  const headLen = Math.min(Math.max(14, sw * 2.4 + 12), L * 0.46);
  const headHalfW = Math.max(8, headLen * 0.64);
  const shaftHalfW = Math.max(3, Math.min(headHalfW * 0.46, sw * 1.1 + 3.5));
  const neckX = halfL - headLen;
  return [
    { x: -halfL, y: -shaftHalfW },
    { x: neckX, y: -shaftHalfW },
    { x: neckX, y: -headHalfW },
    { x: halfL, y: 0 },
    { x: neckX, y: headHalfW },
    { x: neckX, y: shaftHalfW },
    { x: -halfL, y: shaftHalfW },
  ];
}

export function createArrowObject(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  strokeColor: string,
  strokeWidth: number,
  dashArray: number[] | null,
  doubleLine = false,
  variant: ArrowVariant = 'single',
  fillValue?: any,
  extraProps: Record<string, any> = {}
): any {
  const fabric = getFabric();
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angleRad = Math.atan2(dy, dx);
  const angleDeg = (angleRad * 180) / Math.PI;
  const length = Math.max(4, Math.hypot(dx, dy));
  const halfL = length / 2;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;

  if (variant === 'filled' || variant === 'filledDouble') {
    const sw = Math.max(0, strokeWidth);
    const pts = buildBlockArrowPoints(variant, length, Math.max(1, sw));
    const poly = new fabric.Polygon(pts, {
      fill: fillValue && fillValue !== 'transparent' ? fillValue : strokeColor,
      stroke: sw > 0 ? strokeColor : null,
      strokeWidth: sw,
      strokeDashArray: dashArray || undefined,
      doubleLine,
      strokeUniform: true,
      strokeLineJoin: 'round',
      originX: 'center',
      originY: 'center',
      left: cx,
      top: cy,
      angle: angleDeg,
      perPixelTargetFind: false,
      targetFindTolerance: 16,
      selectable: true,
      evented: true,
      isArrowObject: true,
      arrowVariant: variant,
      arrowLength: length,
      ...extraProps,
    });
    poly.set({
      baseLocalPoints: poly.points.map((p: any) => ({ x: p.x, y: p.y })),
      baseWidth: poly.width,
      baseHeight: poly.height,
      basePathOffset: {
        x: poly.pathOffset?.x || 0,
        y: poly.pathOffset?.y || 0,
      },
      cornerRoundRatio:
        typeof extraProps.cornerRoundRatio === 'number' ? extraProps.cornerRoundRatio : 0,
    });
    if (extraProps.fillMeta?.mode === 'photo') {
      applyFillToObject(poly, extraProps.fillMeta);
    }
    return poly;
  }

  const sw = Math.max(1, strokeWidth);
  const isTwoEnded = variant === 'double' || variant === 'openDouble';
  const headLength = Math.min(
    Math.max(12, sw * 2.4 + 8),
    Math.max(10, length * (isTwoEnded ? 0.34 : 0.45))
  );
  const headWidth = headLength * 0.88;
  const halfHeadW = headWidth / 2;

  const isOpenHead = variant === 'open' || variant === 'openDouble';
  // For filled triangle heads, shorten the shaft back slightly so the stroke cap stays behind the tip
  const shortenHead = isOpenHead ? Math.min(sw * 0.25, 2) : Math.min(headLength * 0.62, length * 0.45);
  let shaftX1 = -halfL;
  let shaftX2 = halfL - shortenHead;

  if (variant === 'double') {
    shaftX1 = -halfL + shortenHead;
    shaftX2 = halfL - shortenHead;
  } else if (variant === 'openDouble') {
    shaftX1 = -halfL + shortenHead;
    shaftX2 = halfL - shortenHead;
  } else if (variant === 'circleTail') {
    const dotR = Math.min(Math.max(4, sw * 1.15 + 2.5), length * 0.16);
    shaftX1 = -halfL + dotR;
  }

  if (shaftX2 < shaftX1) {
    const mid = (shaftX1 + shaftX2) / 2;
    shaftX1 = mid - 0.5;
    shaftX2 = mid + 0.5;
  }

  const shaft = new fabric.Line([shaftX1, 0, shaftX2, 0], {
    originX: 'center',
    originY: 'center',
    left: (shaftX1 + shaftX2) / 2,
    top: 0,
    stroke: strokeColor,
    strokeWidth: sw,
    strokeDashArray: dashArray || undefined,
    strokeLineCap: isOpenHead ? 'round' : 'butt',
    strokeUniform: true,
    doubleLine,
    isArrowShaft: true,
  });

  const children: any[] = [shaft];

  const makeFilledHead = (tipX: number, baseX: number) =>
    new fabric.Polygon(
      [
        { x: baseX, y: -halfHeadW },
        { x: tipX, y: 0 },
        { x: baseX, y: halfHeadW },
      ],
      {
        originX: 'center',
        originY: 'center',
        left: (tipX + baseX) / 2,
        top: 0,
        fill: strokeColor,
        stroke: null,
        strokeWidth: 0,
        isArrowHeadFill: true,
      }
    );

  const makeOpenHead = (tipX: number, backX: number) =>
    new fabric.Polyline(
      [
        { x: backX, y: -halfHeadW },
        { x: tipX, y: 0 },
        { x: backX, y: halfHeadW },
      ],
      {
        originX: 'center',
        originY: 'center',
        left: (tipX + backX) / 2,
        top: 0,
        fill: 'transparent',
        stroke: strokeColor,
        strokeWidth: sw,
        strokeUniform: true,
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
        isArrowHeadStroke: true,
      }
    );

  if (variant === 'open' || variant === 'openDouble') {
    children.push(makeOpenHead(halfL, halfL - headLength));
    if (variant === 'openDouble') {
      children.push(makeOpenHead(-halfL, -halfL + headLength));
    }
  } else {
    children.push(makeFilledHead(halfL, halfL - headLength));
    if (variant === 'double') {
      children.push(makeFilledHead(-halfL, -halfL + headLength));
    }
  }

  if (variant === 'circleTail') {
    const dotR = Math.min(Math.max(4, sw * 1.15 + 2.5), length * 0.16);
    children.push(
      new fabric.Circle({
        radius: dotR,
        originX: 'center',
        originY: 'center',
        left: -halfL + dotR,
        top: 0,
        fill: strokeColor,
        stroke: null,
        strokeWidth: 0,
        isArrowTailDot: true,
      })
    );
  } else if (variant === 'barTail') {
    const barHalfH = Math.max(7, halfHeadW * 0.9);
    children.push(
      new fabric.Line([-halfL, -barHalfH, -halfL, barHalfH], {
        originX: 'center',
        originY: 'center',
        left: -halfL,
        top: 0,
        stroke: strokeColor,
        strokeWidth: sw,
        strokeUniform: true,
        strokeLineCap: 'round',
        isArrowHeadStroke: true,
      })
    );
  }

  return new fabric.Group(children, {
    originX: 'center',
    originY: 'center',
    left: cx,
    top: cy,
    angle: angleDeg,
    selectable: true,
    evented: true,
    strokeUniform: true,
    perPixelTargetFind: false,
    targetFindTolerance: 16,
    isArrowGroup: true,
    isArrowObject: true,
    arrowVariant: variant,
    arrowLength: length,
    doubleLine,
    ...extraProps,
  });
}

let doubleStrokeCanvas: HTMLCanvasElement | null = null;
let doubleHookInstalled = false;

function buildObjectPath2D(obj: any): Path2D | null {
  if (!obj || typeof Path2D === 'undefined') return null;
  const p = new Path2D();

  switch (obj.type) {
    case 'rect': {
      const w = obj.width || 0;
      const h = obj.height || 0;
      if (w <= 0 || h <= 0) return null;
      const rx = obj.rx ? Math.min(obj.rx, w / 2) : 0;
      const ry = obj.ry ? Math.min(obj.ry, h / 2) : 0;
      const x = -w / 2;
      const y = -h / 2;
      const isRounded = rx !== 0 || ry !== 0;
      const k = 1 - 0.5522847498;
      p.moveTo(x + rx, y);
      p.lineTo(x + w - rx, y);
      if (isRounded) p.bezierCurveTo(x + w - k * rx, y, x + w, y + k * ry, x + w, y + ry);
      p.lineTo(x + w, y + h - ry);
      if (isRounded) p.bezierCurveTo(x + w, y + h - k * ry, x + w - k * rx, y + h, x + w - rx, y + h);
      p.lineTo(x + rx, y + h);
      if (isRounded) p.bezierCurveTo(x + k * rx, y + h, x, y + h - k * ry, x, y + h - ry);
      p.lineTo(x, y + ry);
      if (isRounded) p.bezierCurveTo(x, y + k * ry, x + k * rx, y, x + rx, y);
      p.closePath();
      return p;
    }
    case 'triangle': {
      const w2 = (obj.width || 0) / 2;
      const h2 = (obj.height || 0) / 2;
      if (w2 <= 0 && h2 <= 0) return null;
      const ratio = typeof obj.cornerRoundRatio === 'number' ? obj.cornerRoundRatio : 0;
      if (ratio > 0.005) {
        const pts = computeRoundedPolygonPoints(
          [
            { x: 0, y: -h2 },
            { x: w2, y: h2 },
            { x: -w2, y: h2 },
          ],
          ratio,
          obj.scaleX || 1,
          obj.scaleY || 1
        );
        if (pts.length >= 3) {
          p.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) {
            p.lineTo(pts[i].x, pts[i].y);
          }
          p.closePath();
          return p;
        }
      }
      p.moveTo(-w2, h2);
      p.lineTo(0, -h2);
      p.lineTo(w2, h2);
      p.closePath();
      return p;
    }
    case 'ellipse': {
      const rx = obj.rx || 0;
      const ry = obj.ry || 0;
      if (rx <= 0.1 || ry <= 0.1) return null;
      p.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      return p;
    }
    case 'circle': {
      const r = obj.radius || 0;
      if (r <= 0.1) return null;
      p.arc(0, 0, r, obj.startAngle || 0, obj.endAngle || Math.PI * 2);
      return p;
    }
    case 'polygon':
    case 'polyline': {
      const pts = obj.points;
      if (!Array.isArray(pts) || pts.length < 2) return null;
      const ox = obj.pathOffset?.x || 0;
      const oy = obj.pathOffset?.y || 0;
      p.moveTo(pts[0].x - ox, pts[0].y - oy);
      for (let i = 1; i < pts.length; i++) {
        p.lineTo(pts[i].x - ox, pts[i].y - oy);
      }
      if (obj.type === 'polygon') {
        p.closePath();
      }
      return p;
    }
    case 'line': {
      if (typeof obj.calcLinePoints !== 'function') return null;
      const lp = obj.calcLinePoints();
      p.moveTo(lp.x1, lp.y1);
      p.lineTo(lp.x2, lp.y2);
      return p;
    }
    case 'path': {
      const cmds = obj.path;
      if (!Array.isArray(cmds) || cmds.length === 0) return null;
      const l = -(obj.pathOffset?.x || 0);
      const t = -(obj.pathOffset?.y || 0);
      for (let i = 0; i < cmds.length; i++) {
        const c = cmds[i];
        switch (c[0]) {
          case 'M':
            p.moveTo(c[1] + l, c[2] + t);
            break;
          case 'L':
            p.lineTo(c[1] + l, c[2] + t);
            break;
          case 'C':
            p.bezierCurveTo(
              c[1] + l,
              c[2] + t,
              c[3] + l,
              c[4] + t,
              c[5] + l,
              c[6] + t
            );
            break;
          case 'Q':
            p.quadraticCurveTo(c[1] + l, c[2] + t, c[3] + l, c[4] + t);
            break;
          case 'z':
          case 'Z':
            p.closePath();
            break;
          default:
            break;
        }
      }
      return p;
    }
    case 'image': {
      const w = obj.width || 0;
      const h = obj.height || 0;
      if (w <= 0 || h <= 0) return null;
      p.rect(-w / 2, -h / 2, w, h);
      return p;
    }
    default:
      return null;
  }
}

export function installDoubleLineStrokeHook(): void {
  const fabric = getFabric();
  if (!fabric || doubleHookInstalled) return;
  doubleHookInstalled = true;

  const origRenderStroke = fabric.Object.prototype._renderStroke;
  const origGetCacheDims = fabric.Object.prototype._getCacheCanvasDimensions;

  fabric.Object.prototype._getCacheCanvasDimensions = function () {
    const dims = origGetCacheDims.call(this);
    let extra = 0;
    if (this.doubleLine && this.stroke && this.strokeWidth) {
      const baseW = Math.max(1, this.strokeWidth);
      const railW = Math.max(1, baseW * 0.72);
      const gapW = Math.max(2, baseW * 0.85);
      extra += Math.ceil(railW * 2 + gapW + 4);
    }
    if (this.shadow && this.shadow.blur) {
      extra += Math.ceil(this.shadow.blur * 2.4 + 6);
    }
    if (extra > 0) {
      const zoom = Math.max(dims.zoomX || 1, dims.zoomY || 1, 1);
      const pad = Math.ceil(extra * zoom * 2);
      dims.width += pad;
      dims.height += pad;
      dims.x += pad;
      dims.y += pad;
    }
    return dims;
  };

  fabric.Object.prototype._renderStroke = function (ctx: CanvasRenderingContext2D) {
    if (!this.doubleLine || !this.stroke || this.strokeWidth === 0) {
      return origRenderStroke.call(this, ctx);
    }

    const localPath = buildObjectPath2D(this);
    if (!localPath || typeof DOMMatrix === 'undefined') {
      return origRenderStroke.call(this, ctx);
    }

    const cw = Math.max(1, ctx.canvas?.width || 1);
    const ch = Math.max(1, ctx.canvas?.height || 1);

    if (!doubleStrokeCanvas) {
      doubleStrokeCanvas = document.createElement('canvas');
    }
    if (doubleStrokeCanvas.width < cw) {
      doubleStrokeCanvas.width = cw;
    }
    if (doubleStrokeCanvas.height < ch) {
      doubleStrokeCanvas.height = ch;
    }

    const sCtx = doubleStrokeCanvas.getContext('2d');
    if (!sCtx) {
      return origRenderStroke.call(this, ctx);
    }

    if (this.shadow && !this.shadow.affectStroke) {
      this._removeShadow(ctx);
    }

    const scaling = this.strokeUniform
      ? this.group
        ? this.getObjectScaling()
        : { scaleX: this.scaleX || 1, scaleY: this.scaleY || 1 }
      : { scaleX: 1, scaleY: 1 };
    const sx = Math.abs(scaling.scaleX) || 1;
    const sy = Math.abs(scaling.scaleY) || 1;

    const mBase = ctx.getTransform();
    const mUnscaled = DOMMatrix.fromMatrix(mBase);
    mUnscaled.scaleSelf(1 / sx, 1 / sy);

    const scaledPath = new Path2D();
    scaledPath.addPath(localPath, new DOMMatrix().scale(sx, sy));

    const baseW = Math.max(1, this.strokeWidth);
    const railW = Math.max(1, baseW * 0.72);
    const gapW = Math.max(2, baseW * 0.85);
    const outerW = railW * 2 + gapW;

    sCtx.save();
    sCtx.setTransform(1, 0, 0, 1, 0, 0);
    sCtx.clearRect(0, 0, cw, ch);

    sCtx.setTransform(mUnscaled);
    sCtx.globalCompositeOperation = 'source-over';
    this._setStrokeStyles(sCtx, this);
    sCtx.lineWidth = outerW;
    sCtx.lineJoin = this.strokeLineJoin || 'miter';

    if (this.strokePattern === 'dotted') {
      sCtx.lineCap = 'square';
      const dotLen = Math.max(1, Math.round(railW * 0.9));
      const dotGap = Math.max(4, Math.round(baseW * 1.6 + 5));
      sCtx.setLineDash([dotLen, dotGap]);
    } else {
      sCtx.lineCap = 'butt';
      this._setLineDash(sCtx, this.strokeDashArray);
    }
    sCtx.stroke(scaledPath);

    // Carve transparent inner gap down the centerline so twin parallel lines remain crisp
    sCtx.globalCompositeOperation = 'destination-out';
    sCtx.strokeStyle = '#000000';
    sCtx.lineWidth = gapW;
    sCtx.lineCap = 'square';
    sCtx.lineJoin = this.strokeLineJoin || 'miter';
    sCtx.setLineDash([]);
    sCtx.stroke(scaledPath);
    sCtx.restore();

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(doubleStrokeCanvas, 0, 0, cw, ch, 0, 0, cw, ch);
    ctx.restore();
  };

  if (fabric.Rect && fabric.Rect.prototype) {
    if (Array.isArray(fabric.Rect.prototype.cacheProperties)) {
      ['isGridRect', 'gridRows', 'gridCols'].forEach((prop) => {
        if (!fabric.Rect.prototype.cacheProperties.includes(prop)) {
          fabric.Rect.prototype.cacheProperties.push(prop);
        }
      });
    }

    const origRectRender = fabric.Rect.prototype._render;
    fabric.Rect.prototype._render = function (ctx: CanvasRenderingContext2D) {
      origRectRender.call(this, ctx);

      if (!this.isGridRect || !this.stroke || !this.strokeWidth || this.strokeWidth <= 0) {
        return;
      }

      const rows = Math.max(1, Math.min(24, Math.round(Number(this.gridRows) || 1)));
      const cols = Math.max(1, Math.min(24, Math.round(Number(this.gridCols) || 1)));
      if (rows <= 1 && cols <= 1) {
        return;
      }

      const w = this.width || 0;
      const h = this.height || 0;
      if (w < 4 || h < 4) return;

      const x = -w / 2;
      const y = -h / 2;
      const rx = this.rx ? Math.min(this.rx, w / 2) : 0;
      const ry = this.ry ? Math.min(this.ry, h / 2) : 0;
      const isRounded = rx !== 0 || ry !== 0;
      const k = 1 - 0.5522847498;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x + rx, y);
      ctx.lineTo(x + w - rx, y);
      if (isRounded) ctx.bezierCurveTo(x + w - k * rx, y, x + w, y + k * ry, x + w, y + ry);
      ctx.lineTo(x + w, y + h - ry);
      if (isRounded) ctx.bezierCurveTo(x + w, y + h - k * ry, x + w - k * rx, y + h, x + w - rx, y + h);
      ctx.lineTo(x + rx, y + h);
      if (isRounded) ctx.bezierCurveTo(x + k * rx, y + h, x, y + h - k * ry, x, y + h - ry);
      ctx.lineTo(x, y + ry);
      if (isRounded) ctx.bezierCurveTo(x, y + k * ry, x + k * rx, y, x + rx, y);
      ctx.closePath();
      ctx.clip();

      const scaling = this.strokeUniform
        ? this.group
          ? this.getObjectScaling()
          : { scaleX: this.scaleX || 1, scaleY: this.scaleY || 1 }
        : { scaleX: 1, scaleY: 1 };
      const sx = Math.max(0.01, Math.abs(scaling.scaleX || 1));
      const sy = Math.max(0.01, Math.abs(scaling.scaleY || 1));

      ctx.scale(1 / sx, 1 / sy);
      this._setStrokeStyles(ctx, this);
      this._setLineDash(ctx, this.strokeDashArray);
      ctx.lineWidth = Math.max(0.5, this.strokeWidth * 0.85);
      ctx.lineCap = 'butt';

      const halfW = (w / 2) * sx;
      const halfH = (h / 2) * sy;

      ctx.beginPath();
      for (let c = 1; c < cols; c++) {
        const gx = -halfW + (c / cols) * (w * sx);
        ctx.moveTo(gx, -halfH);
        ctx.lineTo(gx, halfH);
      }
      for (let r = 1; r < rows; r++) {
        const gy = -halfH + (r / rows) * (h * sy);
        ctx.moveTo(-halfW, gy);
        ctx.lineTo(halfW, gy);
      }
      ctx.stroke();
      ctx.restore();
    };
  }

  if (fabric.Triangle && fabric.Triangle.prototype) {
    if (Array.isArray(fabric.Triangle.prototype.cacheProperties)) {
      if (!fabric.Triangle.prototype.cacheProperties.includes('cornerRoundRatio')) {
        fabric.Triangle.prototype.cacheProperties.push('cornerRoundRatio');
      }
    }
    const origTriRender = fabric.Triangle.prototype._render;
    fabric.Triangle.prototype._render = function (ctx: CanvasRenderingContext2D) {
      const ratio = typeof this.cornerRoundRatio === 'number' ? this.cornerRoundRatio : 0;
      if (ratio <= 0.005) {
        return origTriRender.call(this, ctx);
      }
      const w2 = (this.width || 0) / 2;
      const h2 = (this.height || 0) / 2;
      if (w2 <= 0.5 || h2 <= 0.5) {
        return origTriRender.call(this, ctx);
      }
      const pts = computeRoundedPolygonPoints(
        [
          { x: 0, y: -h2 },
          { x: w2, y: h2 },
          { x: -w2, y: h2 },
        ],
        ratio,
        this.scaleX || 1,
        this.scaleY || 1
      );
      if (pts.length < 3) {
        return origTriRender.call(this, ctx);
      }
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.closePath();
      this._renderFill(ctx);
      this._renderStroke(ctx);
    };
  }
}

export function getObjectScreenRect(obj: any): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  if (!obj) return { left: 0, top: 0, width: 0, height: 0 };
  const rect = obj.getBoundingRect(false, true);
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16) || 0,
      g: parseInt(clean[1] + clean[1], 16) || 0,
      b: parseInt(clean[2] + clean[2], 16) || 0,
    };
  }
  return {
    r: parseInt(clean.slice(0, 2), 16) || 0,
    g: parseInt(clean.slice(2, 4), 16) || 0,
    b: parseInt(clean.slice(4, 6), 16) || 0,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function isBackgroundDark(bg: BackgroundConfig): boolean {
  if (bg.mode === 'dark') return true;
  if (bg.mode === 'white') return false;
  if (bg.opacity < 0.35) return false;
  if (bg.fillType === 'gradient') {
    const avg = (getRelativeLuminance(bg.color1) + getRelativeLuminance(bg.color2)) / 2;
    return avg < 0.45;
  }
  return getRelativeLuminance(bg.color1) < 0.45;
}

export function getArtboardWorldRect(
  artboardCenter: { x: number; y: number },
  canvasSize: CanvasSizeConfig
): { left: number; top: number; width: number; height: number } {
  return {
    left: artboardCenter.x - canvasSize.width / 2,
    top: artboardCenter.y - canvasSize.height / 2,
    width: canvasSize.width,
    height: canvasSize.height,
  };
}

export function paintBackgroundRegion(
  ctx: CanvasRenderingContext2D,
  bg: BackgroundConfig,
  vpt: number[],
  width: number,
  height: number,
  opaqueFallbackWhite = false
): void {
  if (opaqueFallbackWhite) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
  }

  ctx.save();
  if (bg.mode === 'dark') {
    ctx.fillStyle = '#1E1E1E';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    return;
  }

  if (bg.mode === 'white') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    return;
  }

  // Custom / Grid / Lined base fill (with opacity & solid/gradient)
  ctx.globalAlpha = Math.max(0, Math.min(1, bg.opacity));
  if (bg.fillType === 'gradient') {
    if (bg.gradientType === 'radial') {
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.hypot(width, height) / 2;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0, bg.color1);
      grad.addColorStop(1, bg.color2);
      ctx.fillStyle = grad;
    } else {
      const rad = ((bg.gradientAngle - 90) * Math.PI) / 180;
      const halfDiag = Math.hypot(width, height) / 2;
      const cx = width / 2;
      const cy = height / 2;
      const x0 = cx - Math.cos(rad) * halfDiag;
      const y0 = cy - Math.sin(rad) * halfDiag;
      const x1 = cx + Math.cos(rad) * halfDiag;
      const y1 = cy + Math.sin(rad) * halfDiag;
      const grad = ctx.createLinearGradient(x0, y0, x1, y1);
      grad.addColorStop(0, bg.color1);
      grad.addColorStop(1, bg.color2);
      ctx.fillStyle = grad;
    }
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.fillStyle = bg.color1 || '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();

  if (bg.mode !== 'grid' && bg.mode !== 'lined') {
    return;
  }

  const darkBase = isBackgroundDark(bg);
  const scale = Math.max(0.05, vpt[0] || 1);
  const tx = vpt[4] || 0;
  const ty = vpt[5] || 0;

  let baseStep = bg.mode === 'grid' ? 28 : 32;
  let visualStep = baseStep * scale;
  while (visualStep < 10) {
    baseStep *= 2;
    visualStep = baseStep * scale;
  }

  const startX = ((tx % visualStep) + visualStep) % visualStep;
  const startY = ((ty % visualStep) + visualStep) % visualStep;

  ctx.save();
  ctx.lineWidth = 1;

  if (bg.mode === 'grid') {
    ctx.strokeStyle = darkBase
      ? 'rgba(255, 255, 255, 0.14)'
      : 'rgba(148, 163, 184, 0.24)';
    ctx.beginPath();
    for (let x = startX; x <= width; x += visualStep) {
      const px = Math.round(x) + 0.5;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
    }
    for (let y = startY; y <= height; y += visualStep) {
      const py = Math.round(y) + 0.5;
      ctx.moveTo(0, py);
      ctx.lineTo(width, py);
    }
    ctx.stroke();

    const majorStep = visualStep * 5;
    const majorStartX = ((tx % majorStep) + majorStep) % majorStep;
    const majorStartY = ((ty % majorStep) + majorStep) % majorStep;
    ctx.strokeStyle = darkBase
      ? 'rgba(255, 255, 255, 0.24)'
      : 'rgba(100, 116, 139, 0.28)';
    ctx.beginPath();
    for (let x = majorStartX; x <= width; x += majorStep) {
      const px = Math.round(x) + 0.5;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
    }
    for (let y = majorStartY; y <= height; y += majorStep) {
      const py = Math.round(y) + 0.5;
      ctx.moveTo(0, py);
      ctx.lineTo(width, py);
    }
    ctx.stroke();
  } else if (bg.mode === 'lined') {
    ctx.strokeStyle = darkBase
      ? 'rgba(147, 197, 253, 0.24)'
      : 'rgba(96, 165, 250, 0.30)';
    ctx.beginPath();
    for (let y = startY; y <= height; y += visualStep) {
      const py = Math.round(y) + 0.5;
      ctx.moveTo(0, py);
      ctx.lineTo(width, py);
    }
    ctx.stroke();
  }

  ctx.restore();
}

export function drawBackgroundToContext(
  ctx: CanvasRenderingContext2D,
  bg: BackgroundConfig,
  vpt: number[],
  width: number,
  height: number,
  opaqueFallbackWhite = false,
  canvasSize?: CanvasSizeConfig,
  artboardCenter?: { x: number; y: number }
): void {
  ctx.clearRect(0, 0, width, height);

  if (!canvasSize || canvasSize.preset === 'fullscreen' || !artboardCenter) {
    paintBackgroundRegion(ctx, bg, vpt, width, height, opaqueFallbackWhite);
    return;
  }

  const darkUi = isBackgroundDark(bg);
  ctx.fillStyle = darkUi ? '#0B0F17' : '#E2E8F0';
  ctx.fillRect(0, 0, width, height);

  const scale = Math.max(0.05, vpt[0] || 1);
  const tx = vpt[4] || 0;
  const ty = vpt[5] || 0;
  const worldRect = getArtboardWorldRect(artboardCenter, canvasSize);
  const sx = worldRect.left * scale + tx;
  const sy = worldRect.top * scale + ty;
  const sw = worldRect.width * scale;
  const sh = worldRect.height * scale;

  ctx.save();
  ctx.shadowColor = darkUi ? 'rgba(0, 0, 0, 0.55)' : 'rgba(15, 23, 42, 0.16)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = bg.mode === 'dark' ? '#1E1E1E' : '#FFFFFF';
  ctx.fillRect(sx, sy, sw, sh);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.rect(sx, sy, sw, sh);
  ctx.clip();

  // Show checkerboard inside transparent custom artboards
  if (bg.mode !== 'white' && bg.mode !== 'dark' && bg.opacity < 1) {
    const tile = 10;
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(sx, sy, sw, sh);
    ctx.fillStyle = '#E2E8F0';
    const cols = Math.ceil(sw / tile);
    const rows = Math.ceil(sh / tile);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if ((r + c) % 2 === 1) {
          ctx.fillRect(sx + c * tile, sy + r * tile, tile, tile);
        }
      }
    }
  }

  ctx.translate(sx, sy);
  paintBackgroundRegion(ctx, bg, [scale, 0, 0, scale, 0, 0], sw, sh, opaqueFallbackWhite);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = darkUi ? 'rgba(255, 255, 255, 0.2)' : 'rgba(15, 23, 42, 0.16)';
  ctx.lineWidth = 1;
  ctx.strokeRect(Math.round(sx) + 0.5, Math.round(sy) + 0.5, Math.round(sw), Math.round(sh));
  ctx.restore();
}

export function getArtworkWorldBounds(
  fabricCanvas: any
): { left: number; top: number; width: number; height: number } | null {
  if (!fabricCanvas) return null;
  const objects = fabricCanvas
    .getObjects()
    .filter((o: any) => !o.excludeFromExport && !o.isEraserPath);
  if (objects.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const obj of objects) {
    obj.setCoords();
    const r = obj.getBoundingRect(true, true);
    if (!r || r.width < 0 || r.height < 0) continue;
    const extra =
      (obj.doubleLine ? (obj.strokeWidth || 3) * 1.4 + 4 : 0) +
      (obj.shadow?.blur ? obj.shadow.blur * 1.6 : 0);
    minX = Math.min(minX, r.left - extra);
    minY = Math.min(minY, r.top - extra);
    maxX = Math.max(maxX, r.left + r.width + extra);
    maxY = Math.max(maxY, r.top + r.height + extra);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;

  const pad = 20;
  return {
    left: minX - pad,
    top: minY - pad,
    width: Math.max(8, maxX - minX + pad * 2),
    height: Math.max(8, maxY - minY + pad * 2),
  };
}

export function exportCanvasImage(
  fabricCanvas: any,
  bg: BackgroundConfig,
  format: 'png' | 'jpg',
  canvasSize?: CanvasSizeConfig,
  artboardCenter?: { x: number; y: number },
  exportScope: ExportScope = 'canvas'
): void {
  if (!fabricCanvas) return;

  const prevActive = fabricCanvas.getActiveObject();
  if (prevActive) {
    fabricCanvas.discardActiveObject();
    fabricCanvas.renderAll();
  }

  const outCanvas = document.createElement('canvas');
  const ctx = outCanvas.getContext('2d');
  if (!ctx) return;

  const trimmedBounds =
    exportScope === 'artwork' ? getArtworkWorldBounds(fabricCanvas) : null;

  if (trimmedBounds) {
    const maxDim = Math.max(trimmedBounds.width, trimmedBounds.height, 1);
    const multiplier = Math.min(2, Math.max(1, 4096 / maxDim));
    outCanvas.width = Math.round(trimmedBounds.width * multiplier);
    outCanvas.height = Math.round(trimmedBounds.height * multiplier);

    ctx.save();
    ctx.scale(multiplier, multiplier);
    ctx.clearRect(0, 0, trimmedBounds.width, trimmedBounds.height);
    paintBackgroundRegion(
      ctx,
      bg,
      [1, 0, 0, 1, -trimmedBounds.left, -trimmedBounds.top],
      trimmedBounds.width,
      trimmedBounds.height,
      format === 'jpg'
    );
    ctx.restore();

    const savedVpt = fabricCanvas.viewportTransform
      ? [...fabricCanvas.viewportTransform]
      : [1, 0, 0, 1, 0, 0];
    fabricCanvas.viewportTransform = [1, 0, 0, 1, 0, 0];
    const fabricEl = fabricCanvas.toCanvasElement(multiplier, trimmedBounds);
    fabricCanvas.viewportTransform = savedVpt;
    ctx.drawImage(fabricEl, 0, 0);
  } else if (canvasSize && canvasSize.preset !== 'fullscreen' && artboardCenter) {
    const artboard = getArtboardWorldRect(artboardCenter, canvasSize);
    outCanvas.width = Math.max(1, Math.round(canvasSize.width));
    outCanvas.height = Math.max(1, Math.round(canvasSize.height));

    ctx.clearRect(0, 0, outCanvas.width, outCanvas.height);
    paintBackgroundRegion(
      ctx,
      bg,
      [1, 0, 0, 1, 0, 0],
      outCanvas.width,
      outCanvas.height,
      format === 'jpg'
    );

    const savedVpt = fabricCanvas.viewportTransform
      ? [...fabricCanvas.viewportTransform]
      : [1, 0, 0, 1, 0, 0];
    fabricCanvas.viewportTransform = [1, 0, 0, 1, 0, 0];
    const fabricEl = fabricCanvas.toCanvasElement(1, artboard);
    fabricCanvas.viewportTransform = savedVpt;
    ctx.drawImage(fabricEl, 0, 0);
  } else {
    const multiplier = 2;
    const width = fabricCanvas.getWidth();
    const height = fabricCanvas.getHeight();
    outCanvas.width = Math.round(width * multiplier);
    outCanvas.height = Math.round(height * multiplier);

    ctx.save();
    ctx.scale(multiplier, multiplier);
    ctx.clearRect(0, 0, width, height);
    paintBackgroundRegion(
      ctx,
      bg,
      fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0],
      width,
      height,
      format === 'jpg'
    );
    ctx.restore();

    const fabricEl = fabricCanvas.toCanvasElement(multiplier);
    ctx.drawImage(fabricEl, 0, 0);
  }

  if (prevActive) {
    fabricCanvas.setActiveObject(prevActive);
    fabricCanvas.renderAll();
  }

  const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
  const quality = format === 'jpg' ? 0.94 : 1.0;
  const dataUrl = outCanvas.toDataURL(mime, quality);

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours()
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  const link = document.createElement('a');
  link.download = `zenpainter-${stamp}.${format}`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
