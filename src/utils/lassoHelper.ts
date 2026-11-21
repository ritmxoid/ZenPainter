import { encodeTransparentCanvasCompact, getFabric } from './canvasHelpers';

export interface LassoPoint {
  x: number;
  y: number;
}

export function drawLassoOverlayOnContext(
  ctx: CanvasRenderingContext2D,
  points: LassoPoint[],
  vpt: number[],
  retinaScale: number,
  fabric: any
): void {
  if (!points || points.length < 2 || !fabric) return;

  const screenPts = points.map((p) =>
    fabric.util.transformPoint(new fabric.Point(p.x, p.y), vpt)
  );

  ctx.save();
  ctx.setTransform(retinaScale, 0, 0, retinaScale, 0, 0);
  ctx.beginPath();
  ctx.moveTo(screenPts[0].x, screenPts[0].y);
  for (let i = 1; i < screenPts.length; i++) {
    ctx.lineTo(screenPts[i].x, screenPts[i].y);
  }
  ctx.closePath();

  // Subtle highlight inside the freehand contour
  ctx.fillStyle = 'rgba(37, 99, 235, 0.09)';
  ctx.fill();

  // Crisp white under-stroke for high contrast on both light and dark canvas backgrounds
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.setLineDash([]);
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.stroke();

  // Animated marching-ants dashed over-stroke
  const offset = -((performance.now() / 42) % 12);
  ctx.setLineDash([6, 6]);
  ctx.lineDashOffset = offset;
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#2563EB';
  ctx.stroke();
  ctx.restore();
}

function getOpaquePixelBounds(
  canvas: HTMLCanvasElement,
  alphaThreshold = 5
): { minX: number; minY: number; width: number; height: number } | null {
  const w = canvas.width;
  const h = canvas.height;
  if (w <= 0 || h <= 0) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const data = ctx.getImageData(0, 0, w, h).data;

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    const rowOff = y * w * 4;
    for (let x = 0; x < w; x++) {
      if (data[rowOff + x * 4 + 3] > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return {
    minX,
    minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

function cropCanvasToDataUrl(
  src: HTMLCanvasElement,
  bounds: { minX: number; minY: number; width: number; height: number }
): string {
  const out = document.createElement('canvas');
  out.width = Math.max(1, bounds.width);
  out.height = Math.max(1, bounds.height);
  const ctx = out.getContext('2d');
  if (ctx) {
    ctx.drawImage(
      src,
      bounds.minX,
      bounds.minY,
      bounds.width,
      bounds.height,
      0,
      0,
      bounds.width,
      bounds.height
    );
  }
  return encodeTransparentCanvasCompact(out);
}

function tracePolygonInLocal(
  ctx: CanvasRenderingContext2D,
  points: LassoPoint[],
  originX: number,
  originY: number,
  scale: number
): void {
  if (points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo((points[0].x - originX) * scale, (points[0].y - originY) * scale);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo((points[i].x - originX) * scale, (points[i].y - originY) * scale);
  }
  ctx.closePath();
}

function loadFabricImage(fabric: any, dataUrl: string): Promise<any> {
  return new Promise((resolve) => {
    fabric.Image.fromURL(
      dataUrl,
      (img: any) => resolve(img || null),
      { crossOrigin: 'anonymous' }
    );
  });
}

export async function extractLassoFragment(
  fc: any,
  rawPoints: LassoPoint[],
  onCompleted: (fragmentImage: any) => void
): Promise<boolean> {
  const fabric = getFabric();
  if (!fc || !fabric || !rawPoints || rawPoints.length < 3) return false;

  let polyMinX = Infinity;
  let polyMinY = Infinity;
  let polyMaxX = -Infinity;
  let polyMaxY = -Infinity;
  for (const p of rawPoints) {
    if (p.x < polyMinX) polyMinX = p.x;
    if (p.y < polyMinY) polyMinY = p.y;
    if (p.x > polyMaxX) polyMaxX = p.x;
    if (p.y > polyMaxY) polyMaxY = p.y;
  }

  const lassoW = polyMaxX - polyMinX;
  const lassoH = polyMaxY - polyMinY;
  if (!Number.isFinite(lassoW) || !Number.isFinite(lassoH) || lassoW < 8 || lassoH < 8) {
    return false;
  }

  const allObjects: any[] = fc.getObjects().slice();
  const candidates: Array<{ obj: any; index: number; bounds: { left: number; top: number; width: number; height: number } }> = [];

  for (let i = 0; i < allObjects.length; i++) {
    const obj = allObjects[i];
    if (!obj || obj.excludeFromExport || obj.isEraserPath || obj.visible === false) continue;
    obj.setCoords();
    const br = obj.getBoundingRect(true, true);
    if (!br || br.width <= 0 || br.height <= 0) continue;
    const pad = Math.max(
      8,
      (typeof obj.strokeWidth === 'number' ? obj.strokeWidth : 2) * 1.6 +
        (obj.doubleLine ? 12 : 0) +
        (obj.shadow?.blur ? obj.shadow.blur * 1.6 : 0)
    );
    const bounds = {
      left: br.left - pad,
      top: br.top - pad,
      width: br.width + pad * 2,
      height: br.height + pad * 2,
    };
    const intersects =
      bounds.left < polyMaxX &&
      bounds.left + bounds.width > polyMinX &&
      bounds.top < polyMaxY &&
      bounds.top + bounds.height > polyMinY;
    if (intersects) {
      candidates.push({ obj, index: i, bounds });
    }
  }

  if (candidates.length === 0) return false;

  const zoom = Math.max(1, fc.getZoom() || 1);
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const desiredMult = Math.min(3, Math.max(2, Math.ceil(zoom * dpr)));
  const maxLassoDim = Math.max(lassoW, lassoH, 1);
  const fragMult = Math.min(desiredMult, 2048 / maxLassoDim);

  const savedVpt = fc.viewportTransform ? [...fc.viewportTransform] : [1, 0, 0, 1, 0, 0];
  const savedVis = allObjects.map((o) => o.visible);

  fc.discardActiveObject();
  fc.viewportTransform = [1, 0, 0, 1, 0, 0];

  let fragDataUrl = '';
  let fragWorldLeft = polyMinX;
  let fragWorldTop = polyMinY;
  let fragTightWidth = 0;
  let fragTightHeight = 0;

  interface CutReplacement {
    oldObj: any;
    index: number;
    removeOnly: boolean;
    dataUrl?: string;
    worldLeft?: number;
    worldTop?: number;
    scale?: number;
    srcWidth?: number;
    srcHeight?: number;
  }
  const replacements: CutReplacement[] = [];

  try {
    // 1) Capture clipped fragment across all visible artwork inside the lasso contour
    const lassoWorldRect = {
      left: polyMinX,
      top: polyMinY,
      width: lassoW,
      height: lassoH,
    };
    const rawSceneEl: HTMLCanvasElement = fc.toCanvasElement(fragMult, lassoWorldRect);

    const clippedFragCanvas = document.createElement('canvas');
    clippedFragCanvas.width = Math.max(1, Math.round(lassoW * fragMult));
    clippedFragCanvas.height = Math.max(1, Math.round(lassoH * fragMult));
    const fragCtx = clippedFragCanvas.getContext('2d');
    if (!fragCtx) return false;

    fragCtx.save();
    tracePolygonInLocal(fragCtx, rawPoints, polyMinX, polyMinY, fragMult);
    fragCtx.clip();
    fragCtx.drawImage(rawSceneEl, 0, 0, clippedFragCanvas.width, clippedFragCanvas.height);
    fragCtx.restore();

    const fragTight = getOpaquePixelBounds(clippedFragCanvas, 5);
    if (!fragTight || fragTight.width < 2 || fragTight.height < 2) {
      return false;
    }

    fragDataUrl = cropCanvasToDataUrl(clippedFragCanvas, fragTight);
    fragWorldLeft = polyMinX + fragTight.minX / fragMult;
    fragWorldTop = polyMinY + fragTight.minY / fragMult;
    fragTightWidth = fragTight.width;
    fragTightHeight = fragTight.height;

    // 2) Punch out the lasso area cleanly from each touched object
    for (const cand of candidates) {
      for (let j = 0; j < allObjects.length; j++) {
        const o = allObjects[j];
        if (!o || o.excludeFromExport) continue;
        if (o === cand.obj) {
          o.visible = true;
        } else if (o.isEraserPath && j > cand.index) {
          o.visible = Boolean(savedVis[j]);
        } else {
          o.visible = false;
        }
      }

      const maxObjDim = Math.max(cand.bounds.width, cand.bounds.height, 1);
      const objMult = Math.min(desiredMult, 2048 / maxObjDim);
      const candCanvas: HTMLCanvasElement = fc.toCanvasElement(objMult, cand.bounds);

      // Check if candCanvas actually has opaque pixels inside the lasso polygon
      const overlapTestCanvas = document.createElement('canvas');
      overlapTestCanvas.width = candCanvas.width;
      overlapTestCanvas.height = candCanvas.height;
      const otCtx = overlapTestCanvas.getContext('2d');
      if (!otCtx) continue;
      otCtx.save();
      tracePolygonInLocal(otCtx, rawPoints, cand.bounds.left, cand.bounds.top, objMult);
      otCtx.clip();
      otCtx.drawImage(candCanvas, 0, 0);
      otCtx.restore();

      const touchedInside = getOpaquePixelBounds(overlapTestCanvas, 5);
      if (!touchedInside) {
        // BBox overlapped, but no pixels of this object were inside the lasso -> leave vector intact
        continue;
      }

      // Erase lasso polygon out of candCanvas
      const cCtx = candCanvas.getContext('2d');
      if (!cCtx) continue;
      cCtx.save();
      cCtx.globalCompositeOperation = 'destination-out';
      cCtx.fillStyle = '#000000';
      tracePolygonInLocal(cCtx, rawPoints, cand.bounds.left, cand.bounds.top, objMult);
      cCtx.fill();
      cCtx.restore();

      const remainingBounds = getOpaquePixelBounds(candCanvas, 5);
      if (!remainingBounds || remainingBounds.width < 2 || remainingBounds.height < 2) {
        replacements.push({
          oldObj: cand.obj,
          index: cand.index,
          removeOnly: true,
        });
      } else {
        replacements.push({
          oldObj: cand.obj,
          index: cand.index,
          removeOnly: false,
          dataUrl: cropCanvasToDataUrl(candCanvas, remainingBounds),
          worldLeft: cand.bounds.left + remainingBounds.minX / objMult,
          worldTop: cand.bounds.top + remainingBounds.minY / objMult,
          scale: 1 / objMult,
          srcWidth: remainingBounds.width,
          srcHeight: remainingBounds.height,
        });
      }
    }
  } finally {
    for (let j = 0; j < allObjects.length; j++) {
      if (allObjects[j]) {
        allObjects[j].visible = savedVis[j];
      }
    }
    fc.viewportTransform = savedVpt;
  }

  if (!fragDataUrl) return false;

  const [fragImg, ...repImages] = await Promise.all([
    loadFabricImage(fabric, fragDataUrl),
    ...replacements.map((rep) =>
      rep.removeOnly || !rep.dataUrl ? Promise.resolve(null) : loadFabricImage(fabric, rep.dataUrl)
    ),
  ]);

  if (!fragImg) return false;

  // Apply cutout replacements cleanly from highest index downward so indices stay stable
  const indexed = replacements
    .map((rep, idx) => ({ rep, img: repImages[idx] }))
    .sort((a, b) => b.rep.index - a.rep.index);

  for (const { rep, img } of indexed) {
    const curIdx = fc.getObjects().indexOf(rep.oldObj);
    if (curIdx < 0) continue;
    fc.remove(rep.oldObj);
    if (!rep.removeOnly && img) {
      const baseScale = rep.scale ?? 1;
      const rScaleX = rep.srcWidth && img.width ? baseScale * (rep.srcWidth / img.width) : baseScale;
      const rScaleY = rep.srcHeight && img.height ? baseScale * (rep.srcHeight / img.height) : baseScale;
      img.set({
        left: rep.worldLeft,
        top: rep.worldTop,
        originX: 'left',
        originY: 'top',
        scaleX: rScaleX,
        scaleY: rScaleY,
        opacity: 1,
        strokeUniform: true,
        strokeWidth: 0,
        stroke: '#000000',
        strokeColorHex: '#000000',
        strokeOpacity: 1,
        perPixelTargetFind: true,
        targetFindTolerance: 8,
        selectable: true,
        evented: true,
      });
      img.setCoords();
      fc.insertAt(img, curIdx, false);
    }
  }

  const fragScaleX = fragImg.width ? (1 / fragMult) * (fragTightWidth / fragImg.width) : 1 / fragMult;
  const fragScaleY = fragImg.height ? (1 / fragMult) * (fragTightHeight / fragImg.height) : 1 / fragMult;
  fragImg.set({
    left: fragWorldLeft,
    top: fragWorldTop,
    originX: 'left',
    originY: 'top',
    scaleX: fragScaleX,
    scaleY: fragScaleY,
    opacity: 1,
    strokeUniform: true,
    strokeWidth: 0,
    stroke: '#000000',
    strokeColorHex: '#000000',
    strokeOpacity: 1,
    perPixelTargetFind: true,
    targetFindTolerance: 8,
    selectable: true,
    evented: true,
  });
  fc.add(fragImg);
  fragImg.setCoords();

  onCompleted(fragImg);
  return true;
}
