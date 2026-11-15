import { FillSettings } from '../types/paint';
import { applyColorOpacity, buildFillValue, getFabric } from './canvasHelpers';

export interface Point2D {
  x: number;
  y: number;
}

export interface WorldSegment {
  type: 'L' | 'Q' | 'C';
  from: Point2D;
  to: Point2D;
  cp1?: Point2D;
  cp2?: Point2D;
}

export interface EndpointSnapMatch {
  point: Point2D;
  targetObj: any | null;
  targetEnd: 'start' | 'end' | 'self';
  distance: number;
}

export interface EndpointControlHooks {
  onDragEndpoint: (
    obj: any,
    end: 'start' | 'end',
    worldX: number,
    worldY: number
  ) => boolean;
}

export function hasPathCloseCommand(obj: any): boolean {
  if (!obj || !Array.isArray(obj.path)) return false;
  return obj.path.some((cmd: any) => cmd && (cmd[0] === 'Z' || cmd[0] === 'z'));
}

export function isMergeableOpenLine(obj: any): boolean {
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
  if (obj.type === 'line') return true;
  if (obj.type === 'path') {
    if (obj.isClosedContour || hasPathCloseCommand(obj)) return false;
    return Array.isArray(obj.path) && obj.path.length >= 2;
  }
  return false;
}

export function extractWorldPathSegments(obj: any): WorldSegment[] {
  const fabric = getFabric();
  if (!fabric || !obj) return [];

  const mat = obj.calcTransformMatrix();

  if (obj.type === 'line') {
    const lp = obj.calcLinePoints();
    const p1 = fabric.util.transformPoint(new fabric.Point(lp.x1, lp.y1), mat);
    const p2 = fabric.util.transformPoint(new fabric.Point(lp.x2, lp.y2), mat);
    return [
      {
        type: 'L',
        from: { x: p1.x, y: p1.y },
        to: { x: p2.x, y: p2.y },
      },
    ];
  }

  if (obj.type === 'path' && Array.isArray(obj.path)) {
    const ox = obj.pathOffset?.x || 0;
    const oy = obj.pathOffset?.y || 0;
    const toWorld = (x: number, y: number): Point2D => {
      const p = fabric.util.transformPoint(new fabric.Point(x - ox, y - oy), mat);
      return { x: p.x, y: p.y };
    };

    const segs: WorldSegment[] = [];
    let cur: Point2D | null = null;
    let subStart: Point2D | null = null;

    for (let i = 0; i < obj.path.length; i++) {
      const cmd = obj.path[i];
      if (!cmd) continue;
      const op = cmd[0];
      if (op === 'M') {
        cur = toWorld(cmd[1], cmd[2]);
        subStart = cur;
      } else if (op === 'L' && cur) {
        const next = toWorld(cmd[1], cmd[2]);
        if (Math.hypot(next.x - cur.x, next.y - cur.y) > 0.01) {
          segs.push({ type: 'L', from: cur, to: next });
        }
        cur = next;
      } else if (op === 'Q' && cur) {
        const cp1 = toWorld(cmd[1], cmd[2]);
        const next = toWorld(cmd[3], cmd[4]);
        segs.push({ type: 'Q', from: cur, cp1, to: next });
        cur = next;
      } else if (op === 'C' && cur) {
        const cp1 = toWorld(cmd[1], cmd[2]);
        const cp2 = toWorld(cmd[3], cmd[4]);
        const next = toWorld(cmd[5], cmd[6]);
        segs.push({ type: 'C', from: cur, cp1, cp2, to: next });
        cur = next;
      } else if ((op === 'Z' || op === 'z') && cur && subStart) {
        if (Math.hypot(subStart.x - cur.x, subStart.y - cur.y) > 0.25) {
          segs.push({ type: 'L', from: cur, to: subStart });
        }
        cur = subStart;
      }
    }

    return segs;
  }

  return [];
}

export function getObjectWorldEndpoints(
  obj: any
): { start: Point2D; end: Point2D } | null {
  const fabric = getFabric();
  if (!fabric || !obj) return null;

  if (obj.type === 'line') {
    const lp = obj.calcLinePoints();
    const mat = obj.calcTransformMatrix();
    const p1 = fabric.util.transformPoint(new fabric.Point(lp.x1, lp.y1), mat);
    const p2 = fabric.util.transformPoint(new fabric.Point(lp.x2, lp.y2), mat);
    return {
      start: { x: p1.x, y: p1.y },
      end: { x: p2.x, y: p2.y },
    };
  }

  if (obj.type === 'path') {
    const segs = extractWorldPathSegments(obj);
    if (segs.length === 0) return null;
    return {
      start: segs[0].from,
      end: segs[segs.length - 1].to,
    };
  }

  return null;
}

export function reverseWorldSegments(segs: WorldSegment[]): WorldSegment[] {
  const out: WorldSegment[] = [];
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i];
    if (s.type === 'L') {
      out.push({ type: 'L', from: s.to, to: s.from });
    } else if (s.type === 'Q') {
      out.push({ type: 'Q', from: s.to, cp1: s.cp1, to: s.from });
    } else {
      out.push({ type: 'C', from: s.to, cp1: s.cp2, cp2: s.cp1, to: s.from });
    }
  }
  return out;
}

export function segmentsToPathCommands(
  segs: WorldSegment[],
  closed: boolean
): any[] {
  if (segs.length === 0) return [];
  const startPt = segs[0].from;
  const cmds: any[] = [['M', startPt.x, startPt.y]];

  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const isLast = i === segs.length - 1;
    const endPt =
      closed &&
      isLast &&
      Math.hypot(s.to.x - startPt.x, s.to.y - startPt.y) <= 3.5 &&
      segs.length >= 2
        ? startPt
        : s.to;

    if (s.type === 'L') {
      cmds.push(['L', endPt.x, endPt.y]);
    } else if (s.type === 'Q' && s.cp1) {
      cmds.push(['Q', s.cp1.x, s.cp1.y, endPt.x, endPt.y]);
    } else if (s.type === 'C' && s.cp1 && s.cp2) {
      cmds.push(['C', s.cp1.x, s.cp1.y, s.cp2.x, s.cp2.y, endPt.x, endPt.y]);
    }
  }

  if (closed) {
    const lastTo = segs[segs.length - 1].to;
    if (Math.hypot(lastTo.x - startPt.x, lastTo.y - startPt.y) > 3.5) {
      cmds.push(['L', startPt.x, startPt.y]);
    }
    cmds.push(['Z']);
  }

  return cmds;
}

export function findNearestEndpointSnap(
  fc: any,
  worldPt: Point2D,
  excludeObjs: any[],
  zoom: number,
  extraSelfPoint?: Point2D | null
): EndpointSnapMatch | null {
  if (!fc) return null;
  const threshold = 16 / Math.max(0.15, zoom);
  let best: EndpointSnapMatch | null = null;

  if (extraSelfPoint) {
    const dSelf = Math.hypot(worldPt.x - extraSelfPoint.x, worldPt.y - extraSelfPoint.y);
    if (dSelf <= threshold) {
      best = {
        point: { x: extraSelfPoint.x, y: extraSelfPoint.y },
        targetObj: null,
        targetEnd: 'self',
        distance: dSelf,
      };
    }
  }

  const objects = fc.getObjects();
  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    if (excludeObjs.includes(obj)) continue;
    if (!isMergeableOpenLine(obj)) continue;

    const eps = getObjectWorldEndpoints(obj);
    if (!eps) continue;

    const dStart = Math.hypot(worldPt.x - eps.start.x, worldPt.y - eps.start.y);
    if (dStart <= threshold && (!best || dStart < best.distance)) {
      best = {
        point: eps.start,
        targetObj: obj,
        targetEnd: 'start',
        distance: dStart,
      };
    }

    const dEnd = Math.hypot(worldPt.x - eps.end.x, worldPt.y - eps.end.y);
    if (dEnd <= threshold && (!best || dEnd < best.distance)) {
      best = {
        point: eps.end,
        targetObj: obj,
        targetEnd: 'end',
        distance: dEnd,
      };
    }
  }

  return best;
}

export function updateOpenObjectEndpoint(
  obj: any,
  end: 'start' | 'end',
  worldPt: Point2D
): void {
  const fabric = getFabric();
  if (!fabric || !obj) return;

  if (obj.type === 'line') {
    const eps = getObjectWorldEndpoints(obj);
    if (!eps) return;
    const p1 = end === 'start' ? worldPt : eps.start;
    const p2 = end === 'end' ? worldPt : eps.end;
    obj.set({
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
      width: Math.abs(p2.x - p1.x),
      height: Math.abs(p2.y - p1.y),
      left: (p1.x + p2.x) / 2,
      top: (p1.y + p2.y) / 2,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      flipX: false,
      flipY: false,
      skewX: 0,
      skewY: 0,
      originX: 'center',
      originY: 'center',
      dirty: true,
    });
    obj.setCoords();
    return;
  }

  if (obj.type === 'path') {
    const segs = extractWorldPathSegments(obj);
    if (segs.length === 0) return;

    if (end === 'start') {
      segs[0] = { ...segs[0], from: { x: worldPt.x, y: worldPt.y } };
    } else {
      const lastIdx = segs.length - 1;
      segs[lastIdx] = { ...segs[lastIdx], to: { x: worldPt.x, y: worldPt.y } };
    }

    const cmds = segmentsToPathCommands(segs, false);
    obj.set({
      basePathCommands: undefined,
      baseWidth: undefined,
      baseHeight: undefined,
      basePathOffset: undefined,
      cornerRoundRatio: 0,
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
    if (typeof obj._setPath === 'function') {
      obj._setPath(cmds);
    } else {
      obj.set({ path: cmds });
    }
    obj.setCoords();
  }
}

export function buildFabricPathFromWorldSegments(
  segs: WorldSegment[],
  styleSource: any,
  closed: boolean,
  fillSettings: FillSettings,
  selectable = true
): any {
  const fabric = getFabric();
  if (!fabric || segs.length === 0) return null;

  const cmds = segmentsToPathCommands(segs, closed);
  const fillVal = closed ? buildFillValue(fillSettings) : 'transparent';

  const sw =
    typeof styleSource.strokeWidth === 'number' ? styleSource.strokeWidth : 3;
  const strokeVal = sw > 0 ? styleSource.stroke : null;

  const pathObj = new fabric.Path(cmds, {
    fill: fillVal,
    fillMeta: closed ? { ...fillSettings } : undefined,
    isClosedContour: closed,
    stroke: strokeVal,
    strokeColorHex: styleSource.strokeColorHex,
    strokeOpacity:
      typeof styleSource.strokeOpacity === 'number' ? styleSource.strokeOpacity : 1,
    strokeWidth: sw,
    strokeDashArray: styleSource.strokeDashArray,
    strokePattern: styleSource.strokePattern || 'solid',
    doubleLine: Boolean(styleSource.doubleLine),
    brushType: styleSource.brushType || 'standard',
    shadow: styleSource.shadow || null,
    opacity: typeof styleSource.opacity === 'number' ? styleSource.opacity : 1,
    strokeUniform: true,
    strokeLineCap: 'round',
    strokeLineJoin: 'round',
    perPixelTargetFind: !closed,
    targetFindTolerance: 16,
    selectable,
    evented: selectable,
    cornerColor: '#2563EB',
    borderColor: '#2563EB',
  });

  pathObj.setCoords();
  return pathObj;
}

export function mergeTwoOpenObjects(
  objA: any,
  endA: 'start' | 'end',
  objB: any,
  endB: 'start' | 'end',
  fillSettings: FillSettings
): any {
  const segsA = extractWorldPathSegments(objA);
  const segsB = extractWorldPathSegments(objB);
  if (segsA.length === 0 || segsB.length === 0) return null;

  let combined: WorldSegment[];
  if (endA === 'end' && endB === 'start') {
    // Snap exact shared junction
    const junction = segsB[0].from;
    const modA = [...segsA];
    modA[modA.length - 1] = { ...modA[modA.length - 1], to: junction };
    combined = [...modA, ...segsB];
  } else if (endA === 'end' && endB === 'end') {
    const revB = reverseWorldSegments(segsB);
    const junction = revB[0].from;
    const modA = [...segsA];
    modA[modA.length - 1] = { ...modA[modA.length - 1], to: junction };
    combined = [...modA, ...revB];
  } else if (endA === 'start' && endB === 'end') {
    const junction = segsB[segsB.length - 1].to;
    const modA = [...segsA];
    modA[0] = { ...modA[0], from: junction };
    combined = [...segsB, ...modA];
  } else {
    const revA = reverseWorldSegments(segsA);
    const junction = segsB[0].from;
    revA[revA.length - 1] = { ...revA[revA.length - 1], to: junction };
    combined = [...revA, ...segsB];
  }

  const first = combined[0].from;
  const last = combined[combined.length - 1].to;
  const isClosedLoop =
    combined.length >= 2 && Math.hypot(last.x - first.x, last.y - first.y) <= 3.5;

  const styleSource = objA.type === 'path' || !objB ? objA : objB;
  return buildFabricPathFromWorldSegments(
    combined,
    styleSource,
    isClosedLoop,
    fillSettings,
    true
  );
}

export function convertObjectToClosedContour(
  obj: any,
  fillSettings: FillSettings,
  selectable = true
): any {
  const segs = extractWorldPathSegments(obj);
  if (segs.length === 0) return null;
  return buildFabricPathFromWorldSegments(segs, obj, true, fillSettings, selectable);
}

export function convertClosedContourToOpen(
  obj: any,
  selectable = true
): any {
  if (!obj) return null;
  let segs = extractWorldPathSegments(obj);
  if (segs.length === 0) return null;
  // If closed loop ended with a synthetic closing segment back to start, drop only if >= 2 segments remain or keep open path
  if (
    segs.length >= 3 &&
    Math.hypot(
      segs[segs.length - 1].to.x - segs[0].from.x,
      segs[segs.length - 1].to.y - segs[0].from.y
    ) <= 1
  ) {
    segs = segs.slice(0, segs.length - 1);
  }
  const restoredWidth = Math.max(
    1,
    typeof obj.strokeWidth === 'number' ? obj.strokeWidth : 3
  );
  const restoredColor = obj.strokeColorHex || '#000000';
  const restoredOpacity =
    typeof obj.strokeOpacity === 'number' ? obj.strokeOpacity : 1;
  const restoredStroke =
    obj.stroke || applyColorOpacity(restoredColor, restoredOpacity);

  return buildFabricPathFromWorldSegments(
    segs,
    {
      ...obj,
      strokeWidth: restoredWidth,
      stroke: restoredStroke,
    },
    false,
    { mode: 'none', color: '#3B82F6', opacity: 0.35, hatchPattern: 'diagonal' },
    selectable
  );
}

function renderEndpointControl(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(left, top, 6.5, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#10B981';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(left, top, 2.2, 0, Math.PI * 2);
  ctx.fillStyle = '#10B981';
  ctx.fill();
  ctx.restore();
}

export function attachEndpointControls(
  obj: any,
  hooks: EndpointControlHooks
): void {
  const fabric = getFabric();
  if (!fabric || !obj) return;

  if (!isMergeableOpenLine(obj)) {
    detachEndpointControls(obj);
    return;
  }

  const baseControls = fabric.Object.prototype.controls || {};
  const nextControls: Record<string, any> = { ...baseControls };

  const makeEndpointControl = (endKey: 'start' | 'end') =>
    new fabric.Control({
      x: 0,
      y: 0,
      cursorStyle: 'crosshair',
      actionName: 'endpointEdit',
      sizeX: 16,
      sizeY: 16,
      touchSizeX: 34,
      touchSizeY: 34,
      positionHandler: (_dim: any, _finalMatrix: any, fabricObject: any) => {
        const eps = getObjectWorldEndpoints(fabricObject);
        const pt = eps ? (endKey === 'start' ? eps.start : eps.end) : { x: 0, y: 0 };
        const vpt = fabricObject.canvas?.viewportTransform || [1, 0, 0, 1, 0, 0];
        return fabric.util.transformPoint(new fabric.Point(pt.x, pt.y), vpt);
      },
      actionHandler: (_eventData: any, transform: any, x: number, y: number) => {
        return hooks.onDragEndpoint(transform.target, endKey, x, y);
      },
      render: (
        ctx: CanvasRenderingContext2D,
        left: number,
        top: number
      ) => {
        renderEndpointControl(ctx, left, top);
      },
    });

  nextControls.epStart = makeEndpointControl('start');
  nextControls.epEnd = makeEndpointControl('end');
  obj.controls = nextControls;
}

export function detachEndpointControls(obj: any): void {
  const fabric = getFabric();
  if (!fabric || !obj) return;
  obj.controls = fabric.Object.prototype.controls;
}
