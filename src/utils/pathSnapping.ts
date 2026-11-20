import { FillSettings } from '../types/paint';
import {
  applyColorOpacity,
  applyCornerRoundingToObject,
  applyFillToObject,
  buildFillValue,
  getFabric,
  getObjectCornerRoundRatio,
  refreshObjectPhotoFill,
} from './canvasHelpers';

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
    obj.isArrowObject ||
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

export function extractWorldPathSegmentsForEdit(obj: any): WorldSegment[] {
  const fabric = getFabric();
  if (!fabric || !obj) return [];

  if (obj.type === 'path' && Array.isArray(obj.basePathCommands) && obj.basePathCommands.length >= 2) {
    const mat = obj.calcTransformMatrix();
    const ox = obj.basePathOffset?.x ?? obj.pathOffset?.x ?? 0;
    const oy = obj.basePathOffset?.y ?? obj.pathOffset?.y ?? 0;
    const toWorld = (x: number, y: number): Point2D => {
      const p = fabric.util.transformPoint(new fabric.Point(x - ox, y - oy), mat);
      return { x: p.x, y: p.y };
    };

    const cmds = obj.basePathCommands;
    const segs: WorldSegment[] = [];
    let cur: Point2D | null = null;
    let subStart: Point2D | null = null;

    for (let i = 0; i < cmds.length; i++) {
      const cmd = cmds[i];
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

  return extractWorldPathSegments(obj);
}

export function isObjectVertexEditable(obj: any): boolean {
  if (
    !obj ||
    obj.excludeFromExport ||
    obj.isEraserPath ||
    obj.isArrowGroup ||
    obj.isArrowObject ||
    obj.isStampGroup ||
    obj.isSprayGroup ||
    obj.isGridRect ||
    obj.isTexturedBrushStroke
  ) {
    return false;
  }
  if (obj.type === 'rect' || obj.type === 'triangle' || obj.type === 'line') {
    return true;
  }
  if (obj.type === 'polygon') {
    const pts =
      Array.isArray(obj.baseLocalPoints) && obj.baseLocalPoints.length >= 3
        ? obj.baseLocalPoints
        : obj.points;
    return Array.isArray(pts) && pts.length >= 3;
  }
  if (obj.type === 'path') {
    return Array.isArray(obj.path) && obj.path.length >= 2;
  }
  return false;
}

export function getObjectEditableWorldVertices(obj: any): Point2D[] {
  const fabric = getFabric();
  if (!fabric || !obj || !isObjectVertexEditable(obj)) return [];

  if (obj.type === 'line') {
    const eps = getObjectWorldEndpoints(obj);
    return eps ? [eps.start, eps.end] : [];
  }

  const mat = obj.calcTransformMatrix();
  const toWorld = (lx: number, ly: number): Point2D => {
    const p = fabric.util.transformPoint(new fabric.Point(lx, ly), mat);
    return { x: p.x, y: p.y };
  };

  if (obj.type === 'rect') {
    const w2 = (obj.width || 0) / 2;
    const h2 = (obj.height || 0) / 2;
    if (w2 < 0.5 || h2 < 0.5) return [];
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
    if (w2 < 0.5 || h2 < 0.5) return [];
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
    const segs = extractWorldPathSegmentsForEdit(obj);
    if (segs.length === 0) return [];
    const isClosed = Boolean(obj.isClosedContour || hasPathCloseCommand(obj));
    if (isClosed) {
      return segs.map((s) => s.from);
    }
    return [segs[0].from, ...segs.map((s) => s.to)];
  }

  return [];
}

export function updateObjectEditableVertex(
  fc: any,
  obj: any,
  vertexIndex: number,
  worldPt: Point2D
): any {
  const fabric = getFabric();
  if (!fabric || !fc || !obj || !isObjectVertexEditable(obj)) return obj;

  if (obj.type === 'line') {
    updateOpenObjectEndpoint(obj, vertexIndex === 0 ? 'start' : 'end', worldPt);
    return obj;
  }

  if (obj.type === 'rect' || obj.type === 'triangle') {
    const verts = getObjectEditableWorldVertices(obj);
    if (vertexIndex < 0 || vertexIndex >= verts.length) return obj;
    verts[vertexIndex] = { x: worldPt.x, y: worldPt.y };

    const savedRatio = getObjectCornerRoundRatio(obj) ?? 0;
    const fillMetaCopy = obj.fillMeta ? { ...obj.fillMeta } : undefined;
    const fillVal = fillMetaCopy
      ? buildFillValue(fillMetaCopy)
      : obj.fill ?? 'transparent';

    const stackIdx = fc.getObjects().indexOf(obj);
    const poly = new fabric.Polygon(verts, {
      fill: fillVal,
      fillMeta: fillMetaCopy,
      stroke: obj.stroke,
      strokeColorHex: obj.strokeColorHex,
      strokeOpacity:
        typeof obj.strokeOpacity === 'number' ? obj.strokeOpacity : 1,
      strokeWidth: typeof obj.strokeWidth === 'number' ? obj.strokeWidth : 0,
      strokeDashArray: obj.strokeDashArray,
      strokePattern: obj.strokePattern || 'solid',
      doubleLine: Boolean(obj.doubleLine),
      brushType: obj.brushType || 'standard',
      shadow: obj.shadow || null,
      opacity: typeof obj.opacity === 'number' ? obj.opacity : 1,
      strokeUniform: true,
      strokeLineJoin: 'round',
      originX: 'left',
      originY: 'top',
      baseLocalPoints: verts.map((p) => ({ x: p.x, y: p.y })),
      cornerRoundRatio: savedRatio,
      selectable: true,
      evented: true,
      cornerColor: '#2563EB',
      borderColor: '#2563EB',
      lockMovementX: Boolean(obj.lockMovementX),
      lockMovementY: Boolean(obj.lockMovementY),
      lockScalingX: Boolean(obj.lockScalingX),
      lockScalingY: Boolean(obj.lockScalingY),
      lockRotation: Boolean(obj.lockRotation),
      hasControls: obj.hasControls !== false,
    });
    poly.baseWidth = poly.width;
    poly.baseHeight = poly.height;
    poly.basePathOffset = {
      x: poly.pathOffset?.x || 0,
      y: poly.pathOffset?.y || 0,
    };

    if (savedRatio > 0.005) {
      applyCornerRoundingToObject(poly, savedRatio);
    }
    if (fillMetaCopy?.mode === 'photo') {
      applyFillToObject(poly, fillMetaCopy, fc);
    }

    fc.remove(obj);
    if (stackIdx >= 0) {
      fc.insertAt(poly, stackIdx, false);
    } else {
      fc.add(poly);
    }
    poly.setCoords();
    fc.setActiveObject(poly);
    return poly;
  }

  if (obj.type === 'polygon') {
    const verts = getObjectEditableWorldVertices(obj);
    if (vertexIndex < 0 || vertexIndex >= verts.length) return obj;
    verts[vertexIndex] = { x: worldPt.x, y: worldPt.y };

    const freshPts = verts.map((p) => ({ x: p.x, y: p.y }));
    obj.set({
      points: freshPts,
      baseLocalPoints: freshPts.map((p) => ({ x: p.x, y: p.y })),
      isPolygonMorphable: false,
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
    if (typeof obj._setPositionDimensions === 'function') {
      obj._setPositionDimensions({});
    }
    obj.baseWidth = obj.width;
    obj.baseHeight = obj.height;
    obj.basePathOffset = {
      x: obj.pathOffset?.x || 0,
      y: obj.pathOffset?.y || 0,
    };
    const ratio = typeof obj.cornerRoundRatio === 'number' ? obj.cornerRoundRatio : 0;
    if (ratio > 0.005) {
      applyCornerRoundingToObject(obj, ratio);
    }
    if (obj.fillMeta?.mode === 'photo') {
      refreshObjectPhotoFill(obj, fc);
    }
    obj.setCoords();
    return obj;
  }

  if (obj.type === 'path') {
    const segs = extractWorldPathSegmentsForEdit(obj);
    if (segs.length === 0) return obj;
    const isClosed = Boolean(obj.isClosedContour || hasPathCloseCommand(obj));
    const maxIdx = isClosed ? segs.length - 1 : segs.length;
    if (vertexIndex < 0 || vertexIndex > maxIdx) return obj;

    const translateSegFrom = (seg: WorldSegment, pt: Point2D): WorldSegment => {
      const dx = pt.x - seg.from.x;
      const dy = pt.y - seg.from.y;
      if (seg.type === 'C' && seg.cp1) {
        return {
          ...seg,
          from: { x: pt.x, y: pt.y },
          cp1: { x: seg.cp1.x + dx, y: seg.cp1.y + dy },
        };
      }
      return { ...seg, from: { x: pt.x, y: pt.y } };
    };

    const translateSegTo = (seg: WorldSegment, pt: Point2D): WorldSegment => {
      const dx = pt.x - seg.to.x;
      const dy = pt.y - seg.to.y;
      if (seg.type === 'C' && seg.cp2) {
        return {
          ...seg,
          to: { x: pt.x, y: pt.y },
          cp2: { x: seg.cp2.x + dx, y: seg.cp2.y + dy },
        };
      }
      return { ...seg, to: { x: pt.x, y: pt.y } };
    };

    if (isClosed) {
      const n = segs.length;
      const prevIdx = (vertexIndex - 1 + n) % n;
      segs[prevIdx] = translateSegTo(segs[prevIdx], worldPt);
      segs[vertexIndex] = translateSegFrom(segs[vertexIndex], worldPt);
    } else if (vertexIndex === 0) {
      segs[0] = translateSegFrom(segs[0], worldPt);
    } else if (vertexIndex === segs.length) {
      const last = segs.length - 1;
      segs[last] = translateSegTo(segs[last], worldPt);
    } else {
      segs[vertexIndex - 1] = translateSegTo(segs[vertexIndex - 1], worldPt);
      segs[vertexIndex] = translateSegFrom(segs[vertexIndex], worldPt);
    }

    const nextBaseCmds = segmentsToPathCommands(segs, isClosed);
    obj.set({
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
      obj._setPath(nextBaseCmds);
    } else {
      obj.set({ path: nextBaseCmds });
    }
    obj.set({ dirty: true });
    obj.basePathCommands = nextBaseCmds.map((cmd: any[]) => [...cmd]);
    obj.baseWidth = obj.width;
    obj.baseHeight = obj.height;
    obj.basePathOffset = {
      x: obj.pathOffset?.x || 0,
      y: obj.pathOffset?.y || 0,
    };

    const ratio = typeof obj.cornerRoundRatio === 'number' ? obj.cornerRoundRatio : 0;
    if (ratio > 0.005) {
      applyCornerRoundingToObject(obj, ratio);
    }
    if (obj.fillMeta?.mode === 'photo') {
      refreshObjectPhotoFill(obj, fc);
    }
    obj.set({ dirty: true });
    obj.setCoords();
    return obj;
  }

  return obj;
}

export interface BezierHandlePoint {
  segIndex: number;
  kind: 'cp1' | 'cp2';
  anchor: Point2D;
  point: Point2D;
}

export function isBezierPathObject(obj: any): boolean {
  if (
    !obj ||
    obj.type !== 'path' ||
    obj.excludeFromExport ||
    obj.isEraserPath ||
    obj.isArrowGroup ||
    obj.isArrowObject ||
    obj.isStampGroup ||
    obj.isSprayGroup
  ) {
    return false;
  }
  const segs = extractWorldPathSegmentsForEdit(obj);
  return segs.some((s) => s.type === 'C');
}

export function getObjectBezierControlHandles(obj: any): BezierHandlePoint[] {
  if (!isBezierPathObject(obj)) return [];
  const segs = extractWorldPathSegmentsForEdit(obj);
  const handles: BezierHandlePoint[] = [];
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (s.type === 'C' && s.cp1 && s.cp2) {
      handles.push({
        segIndex: i,
        kind: 'cp1',
        anchor: s.from,
        point: s.cp1,
      });
      handles.push({
        segIndex: i,
        kind: 'cp2',
        anchor: s.to,
        point: s.cp2,
      });
    }
  }
  return handles;
}

export function updateObjectBezierHandle(
  fc: any,
  obj: any,
  segIndex: number,
  kind: 'cp1' | 'cp2',
  worldPt: Point2D
): void {
  if (!fc || !obj || obj.type !== 'path') return;
  const segs = extractWorldPathSegmentsForEdit(obj);
  if (segIndex < 0 || segIndex >= segs.length) return;
  const seg = segs[segIndex];
  if (!seg || seg.type !== 'C') return;

  segs[segIndex] = {
    ...seg,
    [kind]: { x: worldPt.x, y: worldPt.y },
  };

  const isClosed = Boolean(obj.isClosedContour || hasPathCloseCommand(obj));
  const nextBaseCmds = segmentsToPathCommands(segs, isClosed);
  obj.set({
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
  if (typeof obj._setPath === 'function') {
    obj._setPath(nextBaseCmds);
  } else {
    obj.set({ path: nextBaseCmds });
  }
  obj.basePathCommands = nextBaseCmds.map((cmd: any[]) => [...cmd]);
  obj.baseWidth = obj.width;
  obj.baseHeight = obj.height;
  obj.basePathOffset = {
    x: obj.pathOffset?.x || 0,
    y: obj.pathOffset?.y || 0,
  };

  const ratio = typeof obj.cornerRoundRatio === 'number' ? obj.cornerRoundRatio : 0;
  if (ratio > 0.005) {
    applyCornerRoundingToObject(obj, ratio);
  }
  if (obj.fillMeta?.mode === 'photo') {
    refreshObjectPhotoFill(obj, fc);
  }
  obj.set({ dirty: true });
  obj.setCoords();
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

  if (obj.isTexturedBrushStroke && obj.worldEndpoints) {
    return obj.worldEndpoints;
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
      Math.hypot(s.to.x - startPt.x, s.to.y - startPt.y) <= 6 &&
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
    if (Math.hypot(lastTo.x - startPt.x, lastTo.y - startPt.y) > 6) {
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
  extraSelfPoint?: Point2D | null,
  includeTexturedBrushes = false
): EndpointSnapMatch | null {
  if (!fc) return null;
  const threshold = 18 / Math.max(0.15, zoom);
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
    const isVectorOpen = isMergeableOpenLine(obj);
    const isTextured = Boolean(includeTexturedBrushes && obj.isTexturedBrushStroke && obj.worldEndpoints);
    if (!isVectorOpen && !isTextured) continue;

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
      const dx = worldPt.x - segs[0].from.x;
      const dy = worldPt.y - segs[0].from.y;
      segs[0] =
        segs[0].type === 'C' && segs[0].cp1
          ? {
              ...segs[0],
              from: { x: worldPt.x, y: worldPt.y },
              cp1: { x: segs[0].cp1.x + dx, y: segs[0].cp1.y + dy },
            }
          : { ...segs[0], from: { x: worldPt.x, y: worldPt.y } };
    } else {
      const lastIdx = segs.length - 1;
      const dx = worldPt.x - segs[lastIdx].to.x;
      const dy = worldPt.y - segs[lastIdx].to.y;
      segs[lastIdx] =
        segs[lastIdx].type === 'C' && segs[lastIdx].cp2
          ? {
              ...segs[lastIdx],
              to: { x: worldPt.x, y: worldPt.y },
              cp2: { x: segs[lastIdx].cp2.x + dx, y: segs[lastIdx].cp2.y + dy },
            }
          : { ...segs[lastIdx], to: { x: worldPt.x, y: worldPt.y } };
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
    obj.set({ dirty: true });
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
    isBezierCurve: Boolean(styleSource.isBezierCurve) || segs.some((s) => s.type === 'C'),
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

  if (closed && fillSettings.mode === 'photo') {
    applyFillToObject(pathObj, fillSettings);
  }
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

export function mergeObjectWithEndpointSnaps(
  fc: any,
  targetObj: any,
  fillSettings: FillSettings
): any | null {
  if (!fc || !targetObj || !isMergeableOpenLine(targetObj)) return null;
  const eps = getObjectWorldEndpoints(targetObj);
  if (!eps) return null;

  const zoom = fc.getZoom() || 1;
  const selfThreshold = 20 / Math.max(0.15, zoom);

  const snapStart = findNearestEndpointSnap(fc, eps.start, [targetObj], zoom);
  const snapEnd = findNearestEndpointSnap(fc, eps.end, [targetObj], zoom);

  // Case 1: Both ends snapped to opposite ends of the SAME open object -> fuse & close loop
  if (
    snapStart?.targetObj &&
    snapEnd?.targetObj &&
    snapStart.targetObj === snapEnd.targetObj &&
    snapStart.targetEnd !== snapEnd.targetEnd &&
    isMergeableOpenLine(snapStart.targetObj)
  ) {
    const partner = snapStart.targetObj;
    const segsNew = extractWorldPathSegments(targetObj);
    const segsOld = extractWorldPathSegments(partner);
    if (segsNew.length > 0 && segsOld.length > 0) {
      let combined: WorldSegment[];
      if (snapStart.targetEnd === 'end') {
        const modOld = [...segsOld];
        const modNew = [...segsNew];
        modNew[0] = { ...modNew[0], from: modOld[modOld.length - 1].to };
        modNew[modNew.length - 1] = { ...modNew[modNew.length - 1], to: modOld[0].from };
        combined = [...modOld, ...modNew];
      } else {
        const revOld = reverseWorldSegments(segsOld);
        const modNew = [...segsNew];
        modNew[0] = { ...modNew[0], from: revOld[revOld.length - 1].to };
        modNew[modNew.length - 1] = { ...modNew[modNew.length - 1], to: revOld[0].from };
        combined = [...revOld, ...modNew];
      }
      const closedObj = buildFabricPathFromWorldSegments(
        combined,
        targetObj.type === 'path' ? targetObj : partner,
        true,
        fillSettings,
        true
      );
      if (closedObj) {
        fc.remove(targetObj);
        fc.remove(partner);
        fc.add(closedObj);
        return closedObj;
      }
    }
  }

  // Case 2: Single multi-segment object (e.g., PencilBrush or Polyline) whose own start and end meet
  const segsTarget = extractWorldPathSegments(targetObj);
  if (
    segsTarget.length >= 2 &&
    Math.hypot(eps.end.x - eps.start.x, eps.end.y - eps.start.y) <= selfThreshold
  ) {
    const r = targetObj.getBoundingRect(true, true);
    if (Math.max(r?.width || 0, r?.height || 0) >= 12 / Math.max(0.15, zoom)) {
      const closedSelf = convertObjectToClosedContour(targetObj, fillSettings, true);
      if (closedSelf) {
        fc.remove(targetObj);
        fc.add(closedSelf);
        return closedSelf;
      }
    }
  }

  let current = targetObj;
  let mergedAny = false;

  if (snapStart?.targetObj && snapStart.targetObj !== current && isMergeableOpenLine(snapStart.targetObj)) {
    const mergedA = mergeTwoOpenObjects(
      current,
      'start',
      snapStart.targetObj,
      snapStart.targetEnd === 'self' ? 'start' : snapStart.targetEnd,
      fillSettings
    );
    if (mergedA) {
      fc.remove(current);
      fc.remove(snapStart.targetObj);
      fc.add(mergedA);
      current = mergedA;
      mergedAny = true;
    }
  }

  if (
    snapEnd?.targetObj &&
    snapEnd.targetObj !== current &&
    snapEnd.targetObj !== snapStart?.targetObj &&
    isMergeableOpenLine(snapEnd.targetObj)
  ) {
    // Re-evaluate whether after merging start, the 'end' of `current` corresponds to 'end' or 'start'
    const curEps = getObjectWorldEndpoints(current);
    let endKey: 'start' | 'end' = 'end';
    if (curEps) {
      const dToStart = Math.hypot(curEps.start.x - eps.end.x, curEps.start.y - eps.end.y);
      const dToEnd = Math.hypot(curEps.end.x - eps.end.x, curEps.end.y - eps.end.y);
      endKey = dToStart < dToEnd ? 'start' : 'end';
    }
    const mergedB = mergeTwoOpenObjects(
      current,
      endKey,
      snapEnd.targetObj,
      snapEnd.targetEnd === 'self' ? 'end' : snapEnd.targetEnd,
      fillSettings
    );
    if (mergedB) {
      fc.remove(current);
      fc.remove(snapEnd.targetObj);
      fc.add(mergedB);
      current = mergedB;
      mergedAny = true;
    }
  }

  return mergedAny ? current : null;
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
  obj.setCoords();
}

export function detachEndpointControls(obj: any): void {
  const fabric = getFabric();
  if (!fabric || !obj) return;
  obj.controls = fabric.Object.prototype.controls;
  obj.setCoords();
}
