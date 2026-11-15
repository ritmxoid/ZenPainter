import * as fabricModule from 'fabric';
import {
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

export function buildFillValue(fill: FillSettings): any {
  if (fill.mode === 'none') {
    return 'transparent';
  }
  if (fill.mode === 'solid') {
    return hexToRgba(fill.color, fill.opacity);
  }
  return createHatchPattern(fill.hatchPattern, fill.color, fill.opacity);
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

  return false;
}

export function createArrowObject(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  strokeColor: string,
  strokeWidth: number,
  dashArray: number[] | null,
  doubleLine = false
): any {
  const fabric = getFabric();
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);
  const length = Math.hypot(dx, dy);

  const headLength = Math.min(Math.max(12, strokeWidth * 2.6 + 8), Math.max(12, length * 0.45));
  const headWidth = headLength * 0.85;

  // Shorten shaft slightly so it meets the base of the arrowhead cleanly
  const shorten = Math.min(headLength * 0.65, length * 0.5);
  const sx2 = x2 - Math.cos(angle) * shorten;
  const sy2 = y2 - Math.sin(angle) * shorten;

  const shaft = new fabric.Line([x1, y1, sx2, sy2], {
    stroke: strokeColor,
    strokeWidth,
    strokeDashArray: dashArray || undefined,
    strokeLineCap: 'round',
    strokeUniform: true,
    doubleLine,
  });

  const head = new fabric.Triangle({
    width: headWidth,
    height: headLength,
    fill: strokeColor,
    left: x2,
    top: y2,
    originX: 'center',
    originY: 'center',
    angle: (angle * 180) / Math.PI + 90,
  });

  // Offset head back by half its height so tip lands accurately at (x2, y2)
  head.set({
    left: x2 - (Math.cos(angle) * headLength) / 2,
    top: y2 - (Math.sin(angle) * headLength) / 2,
  });

  return new fabric.Group([shaft, head], {
    selectable: true,
    evented: true,
    strokeUniform: true,
    isArrowGroup: true,
    doubleLine,
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
