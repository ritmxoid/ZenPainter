import { BrushType } from '../types/paint';
import {
  beginStroke,
  BrushPresetId,
  drawSegment,
  finishStroke,
  StrokePoint,
} from './brushEngine';

export interface PolylineLoop {
  pts: Array<{ x: number; y: number }>;
  closed: boolean;
}

interface CachedArtisticBrush {
  key: string;
  canvas: HTMLCanvasElement;
  drawX: number;
  drawY: number;
  drawW: number;
  drawH: number;
}

const ARTISTIC_PRESETS = new Set<string>([
  'stroke',
  'roller',
  'dry',
  'watercolor',
  'charcoal',
  'calligraphy',
  'spray',
]);

export function isArtisticContourBrush(bt?: BrushType): bt is BrushPresetId {
  return Boolean(bt && ARTISTIC_PRESETS.has(bt));
}

const brushCache = new WeakMap<object, CachedArtisticBrush>();
const originalRenderMap = new WeakMap<object, (ctx: CanvasRenderingContext2D) => void>();

function sampleQuadBezier(
  p0x: number,
  p0y: number,
  cx: number,
  cy: number,
  p1x: number,
  p1y: number,
  steps = 12,
): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    out.push({
      x: mt * mt * p0x + 2 * mt * t * cx + t * t * p1x,
      y: mt * mt * p0y + 2 * mt * t * cy + t * t * p1y,
    });
  }
  return out;
}

function sampleCubicBezier(
  p0x: number,
  p0y: number,
  c1x: number,
  c1y: number,
  c2x: number,
  c2y: number,
  p1x: number,
  p1y: number,
  steps = 16,
): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const t2 = t * t;
    out.push({
      x: mt2 * mt * p0x + 3 * mt2 * t * c1x + 3 * mt * t2 * c2x + t2 * t * p1x,
      y: mt2 * mt * p0y + 3 * mt2 * t * c1y + 3 * mt * t2 * c2y + t2 * t * p1y,
    });
  }
  return out;
}

/**
 * Extracts closed glyph contour loops from an alpha-masked offscreen text canvas
 * using Marching Squares + O(N) edge chaining.
 */
function extractContoursFromAlphaMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  scale: number,
  localW: number,
  localH: number,
): PolylineLoop[] {
  const threshold = 118;
  const alphaAt = (x: number, y: number): number => {
    if (x < 0 || y < 0 || x >= width || y >= height) return 0;
    return data[(y * width + x) * 4 + 3];
  };

  // Interp crossing along edge between (x0,y0) and (x1,y1)
  const interp = (a0: number, a1: number): number => {
    const diff = a1 - a0;
    if (Math.abs(diff) < 1) return 0.5;
    return Math.max(0.05, Math.min(0.95, (threshold - a0) / diff));
  };

  interface EdgeSeg {
    k0: string;
    k1: string;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    used: boolean;
  }

  const segments: EdgeSeg[] = [];
  const adj = new Map<string, number[]>();

  const addSeg = (
    k0: string,
    x0: number,
    y0: number,
    k1: string,
    x1: number,
    y1: number,
  ) => {
    const idx = segments.length;
    segments.push({ k0, k1, x0, y0, x1, y1, used: false });
    let list0 = adj.get(k0);
    if (!list0) {
      list0 = [];
      adj.set(k0, list0);
    }
    list0.push(idx);
    let list1 = adj.get(k1);
    if (!list1) {
      list1 = [];
      adj.set(k1, list1);
    }
    list1.push(idx);
  };

  // Edge keys:
  // top(x,y) -> "h:x,y"
  // bottom(x,y) -> "h:x,y+1"
  // left(x,y) -> "v:x,y"
  // right(x,y) -> "v:x+1,y"
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const aTL = alphaAt(x, y);
      const aTR = alphaAt(x + 1, y);
      const aBR = alphaAt(x + 1, y + 1);
      const aBL = alphaAt(x, y + 1);

      const bTL = aTL >= threshold ? 8 : 0;
      const bTR = aTR >= threshold ? 4 : 0;
      const bBR = aBR >= threshold ? 2 : 0;
      const bBL = aBL >= threshold ? 1 : 0;
      const code = bTL | bTR | bBR | bBL;
      if (code === 0 || code === 15) continue;

      const topPt = () => ({
        k: `h:${x},${y}`,
        x: x + interp(aTL, aTR),
        y,
      });
      const rightPt = () => ({
        k: `v:${x + 1},${y}`,
        x: x + 1,
        y: y + interp(aTR, aBR),
      });
      const bottomPt = () => ({
        k: `h:${x},${y + 1}`,
        x: x + interp(aBL, aBR),
        y: y + 1,
      });
      const leftPt = () => ({
        k: `v:${x},${y}`,
        x,
        y: y + interp(aTL, aBL),
      });

      const pairs: Array<[() => { k: string; x: number; y: number }, () => { k: string; x: number; y: number }]> = [];
      switch (code) {
        case 1:
        case 14:
          pairs.push([leftPt, bottomPt]);
          break;
        case 2:
        case 13:
          pairs.push([bottomPt, rightPt]);
          break;
        case 3:
        case 12:
          pairs.push([leftPt, rightPt]);
          break;
        case 4:
        case 11:
          pairs.push([topPt, rightPt]);
          break;
        case 5: {
          const avg = (aTL + aTR + aBR + aBL) * 0.25;
          if (avg >= threshold) {
            pairs.push([leftPt, topPt], [bottomPt, rightPt]);
          } else {
            pairs.push([leftPt, bottomPt], [topPt, rightPt]);
          }
          break;
        }
        case 6:
        case 9:
          pairs.push([topPt, bottomPt]);
          break;
        case 7:
        case 8:
          pairs.push([leftPt, topPt]);
          break;
        case 10: {
          const avg = (aTL + aTR + aBR + aBL) * 0.25;
          if (avg >= threshold) {
            pairs.push([leftPt, bottomPt], [topPt, rightPt]);
          } else {
            pairs.push([leftPt, topPt], [bottomPt, rightPt]);
          }
          break;
        }
      }

      for (const [fnA, fnB] of pairs) {
        const pA = fnA();
        const pB = fnB();
        addSeg(pA.k, pA.x, pA.y, pB.k, pB.x, pB.y);
      }
    }
  }

  const loops: PolylineLoop[] = [];
  const minDistLocal = 1.35;

  for (let i = 0; i < segments.length; i++) {
    const startSeg = segments[i];
    if (startSeg.used) continue;
    startSeg.used = true;

    const rawPts: Array<{ x: number; y: number }> = [
      { x: startSeg.x0 / scale - localW / 2, y: startSeg.y0 / scale - localH / 2 },
      { x: startSeg.x1 / scale - localW / 2, y: startSeg.y1 / scale - localH / 2 },
    ];
    let curKey = startSeg.k1;
    const endKey = startSeg.k0;

    let guard = 0;
    while (curKey !== endKey && guard < segments.length + 2) {
      guard++;
      const candidates = adj.get(curKey);
      if (!candidates) break;
      let nextSeg: EdgeSeg | null = null;
      for (const ci of candidates) {
        if (!segments[ci].used) {
          nextSeg = segments[ci];
          break;
        }
      }
      if (!nextSeg) break;
      nextSeg.used = true;
      if (nextSeg.k0 === curKey) {
        rawPts.push({
          x: nextSeg.x1 / scale - localW / 2,
          y: nextSeg.y1 / scale - localH / 2,
        });
        curKey = nextSeg.k1;
      } else {
        rawPts.push({
          x: nextSeg.x0 / scale - localW / 2,
          y: nextSeg.y0 / scale - localH / 2,
        });
        curKey = nextSeg.k0;
      }
    }

    if (rawPts.length < 4) continue;

    // Decimate micro grid jitter while preserving corners & curves
    const pts: Array<{ x: number; y: number }> = [rawPts[0]];
    for (let p = 1; p < rawPts.length - 1; p++) {
      const prev = pts[pts.length - 1];
      const cur = rawPts[p];
      if (Math.hypot(cur.x - prev.x, cur.y - prev.y) >= minDistLocal) {
        pts.push(cur);
      }
    }
    const last = rawPts[rawPts.length - 1];
    if (Math.hypot(last.x - pts[pts.length - 1].x, last.y - pts[pts.length - 1].y) > 0.2) {
      pts.push(last);
    }
    if (pts.length >= 3) {
      const closedLoop = curKey === endKey;
      if (closedLoop) {
        const first = pts[0];
        const tail = pts[pts.length - 1];
        if (Math.hypot(first.x - tail.x, first.y - tail.y) > 0.5) {
          pts.push({ ...first });
        }
      }
      loops.push({ pts, closed: closedLoop });
    }
  }

  return loops;
}

function extractTextPolylines(
  obj: any,
  origRender: (ctx: CanvasRenderingContext2D) => void,
): PolylineLoop[] {
  const localW = Math.max(8, Math.ceil(obj.width || 60));
  const localH = Math.max(8, Math.ceil(obj.height || 30));
  const padPx = 6;
  const targetMaxDim = 680;
  const maxDim = Math.max(localW + padPx * 2, localH + padPx * 2);
  const scale = Math.min(2.2, Math.max(1.2, targetMaxDim / maxDim));

  const cw = Math.max(8, Math.ceil((localW + padPx * 2) * scale));
  const ch = Math.max(8, Math.ceil((localH + padPx * 2) * scale));
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = cw;
  maskCanvas.height = ch;
  const mctx = maskCanvas.getContext('2d');
  if (!mctx) return [];

  mctx.save();
  mctx.scale(scale, scale);
  mctx.translate((localW + padPx * 2) / 2, (localH + padPx * 2) / 2);

  const savedStroke = obj.stroke;
  const savedStrokeW = obj.strokeWidth;
  const savedFill = obj.fill;
  const savedShadow = obj.shadow;
  const savedBg = obj.textBackgroundColor;

  obj.stroke = null;
  obj.strokeWidth = 0;
  obj.fill = '#000000';
  obj.shadow = null;
  obj.textBackgroundColor = '';
  try {
    origRender.call(obj, mctx);
  } finally {
    obj.stroke = savedStroke;
    obj.strokeWidth = savedStrokeW;
    obj.fill = savedFill;
    obj.shadow = savedShadow;
    obj.textBackgroundColor = savedBg;
  }
  mctx.restore();

  const img = mctx.getImageData(0, 0, cw, ch);
  return extractContoursFromAlphaMask(
    img.data,
    cw,
    ch,
    scale,
    localW + padPx * 2,
    localH + padPx * 2,
  );
}

function extractLocalPolylines(
  obj: any,
  origRender: (ctx: CanvasRenderingContext2D) => void,
): PolylineLoop[] {
  const type = obj.type;

  if (type === 'i-text' || type === 'textbox' || type === 'text') {
    return extractTextPolylines(obj, origRender);
  }

  if (type === 'line' && typeof obj.calcLinePoints === 'function') {
    const p = obj.calcLinePoints();
    return [
      {
        pts: [
          { x: p.x1, y: p.y1 },
          { x: p.x2, y: p.y2 },
        ],
        closed: false,
      },
    ];
  }

  if (type === 'rect') {
    const w = obj.width || 0;
    const h = obj.height || 0;
    const hw = w / 2;
    const hh = h / 2;
    const rx = Math.min(obj.rx || 0, hw);
    const ry = Math.min(obj.ry || 0, hh);
    if (rx <= 0.5 || ry <= 0.5) {
      return [
        {
          pts: [
            { x: -hw, y: -hh },
            { x: hw, y: -hh },
            { x: hw, y: hh },
            { x: -hw, y: hh },
            { x: -hw, y: -hh },
          ],
          closed: true,
        },
      ];
    }
    const pts: Array<{ x: number; y: number }> = [];
    const arcSteps = 8;
    const corners = [
      { cx: hw - rx, cy: -hh + ry, a0: -Math.PI / 2, a1: 0 },
      { cx: hw - rx, cy: hh - ry, a0: 0, a1: Math.PI / 2 },
      { cx: -hw + rx, cy: hh - ry, a0: Math.PI / 2, a1: Math.PI },
      { cx: -hw + rx, cy: -hh + ry, a0: Math.PI, a1: Math.PI * 1.5 },
    ];
    for (const c of corners) {
      for (let i = 0; i <= arcSteps; i++) {
        const a = c.a0 + ((c.a1 - c.a0) * i) / arcSteps;
        pts.push({
          x: c.cx + Math.cos(a) * rx,
          y: c.cy + Math.sin(a) * ry,
        });
      }
    }
    pts.push({ ...pts[0] });
    return [{ pts, closed: true }];
  }

  if (type === 'ellipse' || type === 'circle') {
    const rx = type === 'circle' ? obj.radius || (obj.width || 0) / 2 : obj.rx || (obj.width || 0) / 2;
    const ry = type === 'circle' ? obj.radius || (obj.height || 0) / 2 : obj.ry || (obj.height || 0) / 2;
    const steps = Math.max(48, Math.min(180, Math.round((rx + ry) * 0.55)));
    const pts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      pts.push({ x: Math.cos(a) * rx, y: Math.sin(a) * ry });
    }
    return [{ pts, closed: true }];
  }

  if (type === 'triangle') {
    const hw = (obj.width || 0) / 2;
    const hh = (obj.height || 0) / 2;
    return [
      {
        pts: [
          { x: 0, y: -hh },
          { x: hw, y: hh },
          { x: -hw, y: hh },
          { x: 0, y: -hh },
        ],
        closed: true,
      },
    ];
  }

  if ((type === 'polygon' || type === 'polyline') && Array.isArray(obj.points)) {
    const ox = obj.pathOffset?.x || 0;
    const oy = obj.pathOffset?.y || 0;
    const pts = obj.points.map((pt: any) => ({ x: pt.x - ox, y: pt.y - oy }));
    if (type === 'polygon' && pts.length > 0) {
      pts.push({ ...pts[0] });
    }
    return pts.length >= 2 ? [{ pts, closed: type === 'polygon' }] : [];
  }

  if (type === 'path' && Array.isArray(obj.path)) {
    const ox = obj.pathOffset?.x || 0;
    const oy = obj.pathOffset?.y || 0;
    const loops: PolylineLoop[] = [];
    let current: Array<{ x: number; y: number }> = [];
    let cx = 0;
    let cy = 0;
    let sx = 0;
    let sy = 0;

    for (const cmd of obj.path) {
      if (!Array.isArray(cmd) || cmd.length === 0) continue;
      const op = String(cmd[0]).toUpperCase();
      if (op === 'M') {
        if (current.length >= 2) {
          loops.push({ pts: current, closed: false });
        }
        cx = Number(cmd[1]) - ox;
        cy = Number(cmd[2]) - oy;
        sx = cx;
        sy = cy;
        current = [{ x: cx, y: cy }];
      } else if (op === 'L') {
        cx = Number(cmd[1]) - ox;
        cy = Number(cmd[2]) - oy;
        current.push({ x: cx, y: cy });
      } else if (op === 'Q') {
        const qx = Number(cmd[1]) - ox;
        const qy = Number(cmd[2]) - oy;
        const nx = Number(cmd[3]) - ox;
        const ny = Number(cmd[4]) - oy;
        current.push(...sampleQuadBezier(cx, cy, qx, qy, nx, ny, 10));
        cx = nx;
        cy = ny;
      } else if (op === 'C') {
        const c1x = Number(cmd[1]) - ox;
        const c1y = Number(cmd[2]) - oy;
        const c2x = Number(cmd[3]) - ox;
        const c2y = Number(cmd[4]) - oy;
        const nx = Number(cmd[5]) - ox;
        const ny = Number(cmd[6]) - oy;
        current.push(...sampleCubicBezier(cx, cy, c1x, c1y, c2x, c2y, nx, ny, 14));
        cx = nx;
        cy = ny;
      } else if (op === 'Z') {
        if (current.length >= 2) {
          if (Math.hypot(sx - cx, sy - cy) > 0.4) {
            current.push({ x: sx, y: sy });
          }
          loops.push({ pts: current, closed: true });
        }
        current = [];
        cx = sx;
        cy = sy;
      }
    }
    if (current.length >= 2) {
      const closed = Boolean(obj.isClosedContour);
      if (closed && Math.hypot(sx - cx, sy - cy) > 0.4) {
        current.push({ x: sx, y: sy });
      }
      loops.push({ pts: current, closed });
    }
    return loops;
  }

  return [];
}

function buildGeometryKey(obj: any): string {
  const type = obj.type || '';
  const bt = obj.brushType || 'standard';
  const color = obj.strokeColorHex || obj.stroke || obj.fill || '#0F172A';
  const width = Number(obj.strokeWidth ?? 3).toFixed(2);
  const op = Number(obj.strokeOpacity ?? 1).toFixed(2);
  const w = Number(obj.width || 0).toFixed(1);
  const h = Number(obj.height || 0).toFixed(1);

  if (type === 'i-text' || type === 'textbox' || type === 'text') {
    return `${bt}|${color}|${width}|${op}|${w}x${h}|${obj.text || ''}|${obj.fontFamily || ''}|${obj.fontSize || 0}|${obj.fontWeight || ''}|${obj.fontStyle || ''}|${obj.textAlign || ''}`;
  }
  if (type === 'line') {
    return `${bt}|${color}|${width}|${op}|${obj.x1},${obj.y1},${obj.x2},${obj.y2}`;
  }
  if (type === 'rect') {
    return `${bt}|${color}|${width}|${op}|${w}x${h}|rx${obj.rx || 0}|ry${obj.ry || 0}`;
  }
  if (type === 'ellipse') {
    return `${bt}|${color}|${width}|${op}|rx${obj.rx || 0}|ry${obj.ry || 0}`;
  }
  if (type === 'circle') {
    return `${bt}|${color}|${width}|${op}|r${obj.radius || 0}`;
  }
  if (type === 'polygon' || type === 'polyline') {
    const pts = Array.isArray(obj.points) ? obj.points : [];
    const sig = pts.slice(0, 8).map((p: any) => `${Math.round(p.x)},${Math.round(p.y)}`).join(';');
    return `${bt}|${color}|${width}|${op}|${pts.length}|${sig}`;
  }
  if (type === 'path') {
    const cmds = Array.isArray(obj.path) ? obj.path : [];
    const first = cmds[0] ? cmds[0].join(',') : '';
    const mid = cmds[Math.floor(cmds.length / 2)] ? cmds[Math.floor(cmds.length / 2)].join(',') : '';
    const last = cmds[cmds.length - 1] ? cmds[cmds.length - 1].join(',') : '';
    return `${bt}|${color}|${width}|${op}|${w}x${h}|${cmds.length}|${Boolean(obj.isClosedContour)}|${first}|${mid}|${last}`;
  }
  return `${bt}|${color}|${width}|${op}|${w}x${h}`;
}

function renderPolylinesToCanvas(
  loops: PolylineLoop[],
  preset: BrushPresetId,
  color: string,
  strokeWidth: number,
  strokeOpacity: number,
): CachedArtisticBrush | null {
  if (loops.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const loop of loops) {
    for (const pt of loop.pts) {
      if (pt.x < minX) minX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y > maxY) maxY = pt.y;
    }
  }
  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return null;

  const size = Math.max(2, strokeWidth);
  const pad = Math.max(28, size * 2.2);
  const localX = minX - pad;
  const localY = minY - pad;
  const localW = Math.max(8, maxX - minX + pad * 2);
  const localH = Math.max(8, maxY - minY + pad * 2);

  const maxCanvasDim = 1500;
  const renderScale = Math.min(2, Math.max(0.75, maxCanvasDim / Math.max(localW, localH)));

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(4, Math.ceil(localW * renderScale));
  canvas.height = Math.max(4, Math.ceil(localH * renderScale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.save();
  ctx.scale(renderScale, renderScale);
  ctx.translate(-localX, -localY);

  const stepMax = Math.max(3.5, Math.min(9, size * 0.48));
  const wrapDistance = Math.max(85, size * 7);

  for (const loop of loops) {
    if (loop.pts.length < 2) continue;

    // Subdivide polyline edges smoothly for rich brush texture
    const dense: Array<{ x: number; y: number }> = [loop.pts[0]];
    for (let i = 1; i < loop.pts.length; i++) {
      const a = loop.pts[i - 1];
      const b = loop.pts[i];
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      const sub = Math.max(1, Math.ceil(d / stepMax));
      for (let s = 1; s <= sub; s++) {
        const t = s / sub;
        dense.push({
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
        });
      }
    }

    let time = 0;
    const p0: StrokePoint = {
      x: dense[0].x,
      y: dense[0].y,
      pressure: 0.72,
      time,
    };
    const session = beginStroke(
      ctx,
      p0,
      'mouse',
      'brush',
      preset,
      color,
      size,
      strokeOpacity,
    );

    for (let i = 1; i < dense.length; i++) {
      time += 14;
      const pt = dense[i];

      // On closed loops (shapes, letters), keep brush paint load alive around the entire perimeter
      // so Мазок / Сухая кисть don't disappear halfway around the contour.
      if (loop.closed && (preset === 'stroke' || preset === 'dry')) {
        if (session.totalDistance > wrapDistance) {
          session.totalDistance = session.totalDistance % wrapDistance;
        }
      }

      const progressFrac = i / (dense.length - 1);
      const pressure = loop.closed
        ? 0.72 + Math.sin(progressFrac * Math.PI * 2) * 0.14
        : preset === 'stroke'
          ? Math.max(0.25, 0.92 - progressFrac * 0.55)
          : 0.75;

      drawSegment(
        ctx,
        session,
        { x: pt.x, y: pt.y, pressure, time },
        'mouse',
        1,
        false,
      );
    }

    if (!loop.closed) {
      finishStroke(ctx, session, 'mouse');
    }
  }

  ctx.restore();

  return {
    key: '',
    canvas,
    drawX: localX,
    drawY: localY,
    drawW: localW,
    drawH: localH,
  };
}

function getOrBuildCachedBrush(
  obj: any,
  origRender: (ctx: CanvasRenderingContext2D) => void,
): CachedArtisticBrush | null {
  const bt: BrushType | undefined = obj.brushType;
  if (!isArtisticContourBrush(bt)) return null;
  const strokeWidth = Number(obj.strokeWidth ?? 0);
  if (strokeWidth <= 0) return null;

  const key = buildGeometryKey(obj);
  const existing = brushCache.get(obj);
  if (existing && existing.key === key) {
    return existing;
  }

  const loops = extractLocalPolylines(obj, origRender);
  const color = obj.strokeColorHex || obj.stroke || obj.fill || '#0F172A';
  const strokeOpacity = Math.max(0, Math.min(1, Number(obj.strokeOpacity ?? 1)));

  const rendered = renderPolylinesToCanvas(loops, bt, color, strokeWidth, strokeOpacity);
  if (!rendered) return null;
  rendered.key = key;
  brushCache.set(obj, rendered);
  return rendered;
}

/**
 * Attaches non-destructive artistic brush contour rendering to any Fabric shape, line, path,
 * group child, or text object. Rehydrates cleanly after JSON load / undo / redo.
 */
export function attachArtisticBrushRenderer(obj: any): void {
  if (!obj) return;

  if (Array.isArray(obj._objects)) {
    const hasArtisticChild = isArtisticContourBrush(obj.brushType) ||
      obj._objects.some((c: any) => isArtisticContourBrush(c?.brushType));
    if (hasArtisticChild) {
      obj.objectCaching = false;
    }
    obj._objects.forEach((child: any) => attachArtisticBrushRenderer(child));
    return;
  }

  if (!isArtisticContourBrush(obj.brushType)) {
    // Restore default objectCaching when returning to vector brushes
    if (originalRenderMap.has(obj)) {
      obj._render = originalRenderMap.get(obj);
      originalRenderMap.delete(obj);
      obj.objectCaching = true;
      brushCache.delete(obj);
    }
    return;
  }

  if (!originalRenderMap.has(obj) && typeof obj._render === 'function') {
    const origRender: (ctx: CanvasRenderingContext2D) => void = obj._render;
    originalRenderMap.set(obj, origRender);

    obj._render = function patchedArtisticRender(this: any, ctx: CanvasRenderingContext2D) {
      if (!isArtisticContourBrush(this.brushType) || Number(this.strokeWidth ?? 0) <= 0) {
        origRender.call(this, ctx);
        return;
      }

      // While user is inline-typing inside text, draw crisp native text without flicker
      if (this.isEditing) {
        origRender.call(this, ctx);
        return;
      }

      const cached = getOrBuildCachedBrush(this, origRender);
      const isText =
        this.type === 'i-text' || this.type === 'textbox' || this.type === 'text';

      const savedStroke = this.stroke;
      const savedStrokeWidth = this.strokeWidth;
      const savedShadow = this.shadow;

      const drawContourBitmap = () => {
        if (cached) {
          ctx.drawImage(
            cached.canvas,
            cached.drawX,
            cached.drawY,
            cached.drawW,
            cached.drawH,
          );
        }
      };

      try {
        this.stroke = null;
        this.strokeWidth = 0;
        this.shadow = null;

        if (isText) {
          const textColor = String(this.fill || '#000000').toLowerCase();
          const strokeColor = String(this.strokeColorHex || textColor).toLowerCase();
          if (strokeColor !== textColor) {
            // Contrasting contour behind crisp letters
            drawContourBitmap();
            origRender.call(this, ctx);
          } else {
            // Matching brush color: draw text then brush edges over glyph boundary
            origRender.call(this, ctx);
            drawContourBitmap();
          }
        } else {
          // Shapes/lines: draw fill (if any) first, then artistic contour on top
          if (this.fill && this.fill !== 'transparent') {
            origRender.call(this, ctx);
          }
          drawContourBitmap();
        }
      } finally {
        this.stroke = savedStroke;
        this.strokeWidth = savedStrokeWidth;
        this.shadow = savedShadow;
      }
    };
  }

  // Disable tight Fabric vector bbox caching so bristles/spray outside bbox never clip
  obj.objectCaching = false;
}

export function rehydrateArtisticBrushObject(obj: any): void {
  if (!obj) return;
  if (Array.isArray(obj._objects)) {
    const anyArtistic =
      isArtisticContourBrush(obj.brushType) ||
      obj._objects.some((c: any) => isArtisticContourBrush(c?.brushType));
    if (anyArtistic) {
      obj.objectCaching = false;
      obj._objects.forEach((c: any) => {
        if (isArtisticContourBrush(obj.brushType) && !c.brushType) {
          c.brushType = obj.brushType;
        }
        rehydrateArtisticBrushObject(c);
      });
    }
    return;
  }
  if (isArtisticContourBrush(obj.brushType)) {
    attachArtisticBrushRenderer(obj);
  }
}
