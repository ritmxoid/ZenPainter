import { encodeTransparentCanvasCompact } from '../utils/canvasHelpers';

export type BrushPresetId =
  | 'stroke'
  | 'roller'
  | 'dry'
  | 'watercolor'
  | 'charcoal'
  | 'calligraphy'
  | 'spray';

export type ActiveTool = 'brush' | 'eraser';

export interface BrushPresetMeta {
  id: BrushPresetId;
  name: string;
  subtitle: string;
}

export const BRUSH_PRESETS: BrushPresetMeta[] = [
  {
    id: 'stroke',
    name: 'Мазок',
    subtitle: 'От нажима, рваный хвост',
  },
  {
    id: 'roller',
    name: 'Валик',
    subtitle: 'Ворс, пробелы, лёгкий скос',
  },
  {
    id: 'dry',
    name: 'Сухая кисть',
    subtitle: 'Истощение краски по длине',
  },
  {
    id: 'watercolor',
    name: 'Акварель',
    subtitle: 'Влажный край и лессировка',
  },
  {
    id: 'charcoal',
    name: 'Уголь',
    subtitle: 'Зернистая фактура бумаги',
  },
  {
    id: 'calligraphy',
    name: 'Перо 40°',
    subtitle: 'Плоский срез, контраст линий',
  },
  {
    id: 'spray',
    name: 'Аэрограф',
    subtitle: 'Мягкое облако капель',
  },
];

export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
  time: number;
}

interface Bristle {
  offset: number; // -0.5 .. +0.5 of brush width
  weight: number; // thickness multiplier
  cutoff: number; // 0.05 .. 0.98: higher drops out earlier as stroke tapers
  tailReach: number; // 0.15 .. 1.0: how far into the final ragged tip this hair reaches
  phase: number;
  alphaBias: number;
}

export interface StrokeSession {
  tool: ActiveTool;
  preset: BrushPresetId;
  color: string;
  size: number;
  opacity: number;
  lastPoint: StrokePoint;
  lastAngle: number;
  hasDirection: boolean;
  angularVelocity: number;
  smoothedPressure: number;
  smoothedSpeed: number;
  totalDistance: number;
  bristles: Bristle[];
  rollerStamp: HTMLCanvasElement | null;
  seed: number;
}

function seededRand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function hexToRgb(hex: string): {r: number; g: number; b: number} {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) {
    return {r: 255, g: 255, b: 255};
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Generates an offscreen procedural paint-roller nap stamp with irregular edges and porous gaps.
 */
function createRollerStamp(color: string, seed: number): HTMLCanvasElement {
  const w = 64;
  const h = 28;
  const stamp = document.createElement('canvas');
  stamp.width = w;
  stamp.height = h;
  const sctx = stamp.getContext('2d');
  if (!sctx) return stamp;

  const {r, g, b} = hexToRgb(color);
  const img = sctx.createImageData(w, h);
  const data = img.data;

  for (let y = 0; y < h; y++) {
    const ny = (y / (h - 1)) * 2 - 1; // -1..1 along direction of travel
    for (let x = 0; x < w; x++) {
      const nx = (x / (w - 1)) * 2 - 1; // -1..1 across roller width

      // Irregular ragged side borders simulating roller fleece/nap
      const edgeNoiseL = seededRand(seed + y * 3.1 + 11) * 0.24;
      const edgeNoiseR = seededRand(seed + y * 5.7 + 29) * 0.24;
      const withinWidth =
        nx > -1 + edgeNoiseL && nx < 1 - edgeNoiseR ? 1 : 0;

      // Soft longitudinal roll-off
      const longitudinalFade = Math.max(0, 1 - Math.pow(Math.abs(ny), 1.8));

      // Nap clusters & dry paint gaps (пробелы ворса)
      const clusterA = Math.sin(x * 0.42 + seed) * Math.cos(y * 0.55 + seed * 0.3);
      const grain = seededRand(seed + x * 17.3 + y * 31.7);
      const fiber = Math.sin(x * 1.15 + grain * 2.2) * 0.5 + 0.5;

      // Carve organic gaps so the roller never fills 100% solidly
      const poreScore = grain * 0.65 + (clusterA * 0.5 + 0.5) * 0.35;
      const edgeDrop = Math.abs(nx) > 0.72 ? 0.14 : 0;

      let alpha = 0;
      if (withinWidth && poreScore > 0.36 + edgeDrop) {
        alpha =
          longitudinalFade *
          Math.min(1, (poreScore - 0.32) * 1.65) *
          (0.45 + 0.55 * fiber);
      }

      const idx = (y * w + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
    }
  }

  sctx.putImageData(img, 0, 0);
  return stamp;
}

function createBristles(count: number, seed: number): Bristle[] {
  const bristles: Bristle[] = [];
  // Asymmetric bias so one edge thins slightly faster like a real angled brushstroke
  const skewDir = seededRand(seed + 41.2) > 0.5 ? 1 : -1;
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1) - 0.5; // -0.5..+0.5
    const distFromCenter = Math.abs(t) * 2; // 0..1
    const sideBias = Math.max(0, t * skewDir) * 0.42;
    const r1 = seededRand(seed + i * 7.13);
    const r2 = seededRand(seed + i * 19.7);
    const r3 = seededRand(seed + i * 31.4);
    const r4 = seededRand(seed + i * 53.9);

    // Outer and skewed-edge bristles separate & drop out earlier, while core spine bristles carry into the fine tip
    const cutoff = Math.min(
      0.96,
      Math.max(0.08, 0.08 + distFromCenter * 0.48 + sideBias + r1 * 0.24),
    );
    const tailReach = Math.max(0.12, Math.min(1, 1 - cutoff * 0.72 + (r4 - 0.5) * 0.28));

    bristles.push({
      offset: t + (r2 - 0.5) * 0.055,
      weight: 0.055 + r3 * 0.085,
      cutoff,
      tailReach,
      phase: r1 * Math.PI * 2,
      alphaBias: 0.72 + r2 * 0.28,
    });
  }
  return bristles;
}

function effectivePressure(
  rawPressure: number,
  pointerType: string,
  speed: number,
): number {
  const hasRealPressure =
    pointerType === 'pen' ||
    (rawPressure > 0 && rawPressure !== 0.5 && rawPressure !== 1);
  const speedFactor = Math.max(0.24, Math.min(1.08, 1.08 - speed * 0.02));

  if (hasRealPressure) {
    const p = Math.max(0.08, Math.min(1.2, rawPressure * 1.18));
    return p * 0.78 + speedFactor * 0.22;
  }

  return speedFactor;
}

export function beginStroke(
  ctx: CanvasRenderingContext2D,
  point: StrokePoint,
  pointerType: string,
  tool: ActiveTool,
  preset: BrushPresetId,
  color: string,
  size: number,
  opacity: number,
): StrokeSession {
  const seed = Math.random() * 10000;
  const initialPressure = effectivePressure(point.pressure, pointerType, 0);

  const bristleCount =
    preset === 'dry' ? 24 : preset === 'stroke' ? 38 : 0;

  const session: StrokeSession = {
    tool,
    preset,
    color,
    size,
    opacity,
    lastPoint: point,
    lastAngle: 0,
    hasDirection: false,
    angularVelocity: 0,
    smoothedPressure: initialPressure,
    smoothedSpeed: 0,
    totalDistance: 0,
    bristles: bristleCount > 0 ? createBristles(bristleCount, seed) : [],
    rollerStamp:
      tool === 'brush' && preset === 'roller'
        ? createRollerStamp(color, seed)
        : null,
    seed,
  };

  // Draw initial dab so even a single tap leaves a mark
  drawSegment(ctx, session, point, pointerType, 1, true);
  return session;
}

function drawBristleStrokeStep(
  ctx: CanvasRenderingContext2D,
  session: StrokeSession,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  angle: number,
  widthFactor: number,
  lifeProgress: number, // 1 = full start, 0 = ragged needle tip
  isDryBrush: boolean,
  isInitial = false,
) {
  const {size, opacity, color, bristles, totalDistance, seed} = session;
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);
  const tx = Math.cos(angle);
  const ty = Math.sin(angle);

  const baseSpread = isDryBrush ? size * widthFactor : size * 1.38 * widthFactor;
  const paintLoad = isDryBrush
    ? Math.max(0.12, 1 - totalDistance / Math.max(180, size * 15))
    : Math.max(0.12, lifeProgress);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';

  for (let i = 0; i < bristles.length; i++) {
    const b = bristles[i];

    // Progressive bristle drop-out: outer hairs peel away into dry streaks, core hairs taper into long tips
    if (!isDryBrush) {
      if (lifeProgress < b.cutoff * 0.72 && (1 - b.tailReach) > lifeProgress * 1.15) {
        continue;
      }
      // Intermittent dry gaps between bristles as paint thins toward the end
      const splitThreshold = Math.min(1, 0.28 + lifeProgress * 0.92 + (1 - b.cutoff) * 0.35);
      const streakNoise = seededRand(seed + Math.floor(totalDistance * 0.14) + i * 11.7);
      if (lifeProgress < 0.85 && streakNoise > splitThreshold) {
        continue;
      }
    } else {
      const dryGap = seededRand(seed + totalDistance * 0.21 + i * 13.7) > paintLoad + 0.18;
      if (lifeProgress < b.cutoff * 0.85 && dryGap) {
        continue;
      }
    }

    // Bristles gently converge toward the center spine as the stroke narrows toward its tip
    const convergence = isDryBrush ? 1 : 0.42 + 0.58 * Math.pow(lifeProgress, 0.7);
    const wobble =
      Math.sin(totalDistance * 0.075 + b.phase) * baseSpread * 0.025;
    const lateral = b.offset * baseSpread * convergence + wobble;

    // Slight uneven bristle-heel stagger right at the start of the stroke along direction
    const heelStagger =
      isInitial && !isDryBrush
        ? seededRand(seed + i * 29.1) * size * 0.32
        : 0;

    const sx = x0 + nx * lateral - tx * heelStagger;
    const sy = y0 + ny * lateral - ty * heelStagger;
    const ex = x1 + nx * lateral;
    const ey = y1 + ny * lateral;

    const bristleThickness = Math.max(
      0.55,
      baseSpread * b.weight * (0.28 + 0.72 * lifeProgress),
    );
    const bristleAlpha =
      opacity *
      b.alphaBias *
      Math.min(1, 0.32 + 0.78 * Math.pow(lifeProgress, 0.65)) *
      (isDryBrush ? 0.35 + 0.65 * paintLoad : 0.88);

    ctx.globalAlpha = Math.max(0.04, Math.min(1, bristleAlpha));
    ctx.lineWidth = bristleThickness;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }

  ctx.restore();
}

function drawRollerStep(
  ctx: CanvasRenderingContext2D,
  session: StrokeSession,
  x: number,
  y: number,
  angle: number,
  taperFactor: number, // 1 in main body, ~0.75..0.85 toward end
  stepIndex: number,
) {
  const stamp = session.rollerStamp;
  if (!stamp) return;

  const {size, opacity} = session;
  // Roller width narrows slightly toward the end of the stroke
  const rollerWidth = Math.max(8, size * 1.45 * taperFactor);
  const rollerLength = Math.max(6, rollerWidth * 0.36);

  // Subtle lateral jitter so borders look uneven like fleece nap
  const jitter = (seededRand(session.seed + stepIndex * 5.3) - 0.5) * size * 0.08;
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);

  ctx.save();
  ctx.translate(x + nx * jitter, y + ny * jitter);
  ctx.rotate(angle + Math.PI / 2);

  // Vary opacity slightly per stamp for porous roller texture
  const napVariation = 0.72 + seededRand(session.seed + stepIndex * 11.1) * 0.28;
  ctx.globalAlpha = Math.max(0.08, opacity * napVariation * (0.65 + 0.35 * taperFactor));

  // Occasionally flip horizontally so pore pattern stays organic along long lines
  if (stepIndex % 2 === 1) {
    ctx.scale(-1, 1);
  }

  ctx.drawImage(
    stamp,
    -rollerWidth / 2,
    -rollerLength / 2,
    rollerWidth,
    rollerLength,
  );
  ctx.restore();
}

function drawWatercolorStep(
  ctx: CanvasRenderingContext2D,
  session: StrokeSession,
  x: number,
  y: number,
  radius: number,
  stepSeed: number,
) {
  const {color, opacity} = session;
  const {r, g, b} = hexToRgb(color);

  ctx.save();
  const jitterX = (seededRand(stepSeed) - 0.5) * radius * 0.18;
  const jitterY = (seededRand(stepSeed + 3.1) - 0.5) * radius * 0.18;
  const cx = x + jitterX;
  const cy = y + jitterY;

  const grad = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius);
  const baseAlpha = Math.max(0.02, opacity * 0.14);
  grad.addColorStop(0, `rgba(${r},${g},${b},${baseAlpha * 0.75})`);
  grad.addColorStop(0.75, `rgba(${r},${g},${b},${baseAlpha * 0.95})`);
  // Slight pigment pooling at the outer wet edge
  grad.addColorStop(0.94, `rgba(${r},${g},${b},${baseAlpha * 1.45})`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCharcoalStep(
  ctx: CanvasRenderingContext2D,
  session: StrokeSession,
  x: number,
  y: number,
  radius: number,
  stepSeed: number,
) {
  const {color, opacity} = session;
  ctx.save();
  ctx.fillStyle = color;

  const grainCount = Math.max(12, Math.round(radius * 2.2));
  for (let i = 0; i < grainCount; i++) {
    const r1 = seededRand(stepSeed + i * 3.7);
    const r2 = seededRand(stepSeed + i * 7.9);
    const r3 = seededRand(stepSeed + i * 13.1);

    // Gaussian-like concentration near stroke spine
    const dist = Math.pow(r1, 0.85) * radius;
    const theta = r2 * Math.PI * 2;
    const px = x + Math.cos(theta) * dist;
    const py = y + Math.sin(theta) * dist;

    // Paper tooth modulation
    const paperTooth =
      Math.sin(px * 0.55) * Math.cos(py * 0.55) * 0.5 + 0.5;
    if (paperTooth < 0.25 && r3 > 0.35) continue;

    ctx.globalAlpha = Math.max(
      0.04,
      opacity * (1 - dist / (radius * 1.15)) * (0.25 + r3 * 0.55),
    );
    const speck = 0.8 + r3 * 1.7;
    ctx.fillRect(px, py, speck, speck);
  }
  ctx.restore();
}

function drawCalligraphyStep(
  ctx: CanvasRenderingContext2D,
  session: StrokeSession,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  widthFactor: number,
) {
  const {color, opacity, size} = session;
  const nibAngle = -Math.PI * 0.22; // ~40 degrees chisel nib
  const halfLen = (size * widthFactor * 0.65) / 2;
  const dx = Math.cos(nibAngle) * halfLen;
  const dy = Math.sin(nibAngle) * halfLen;

  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;
  ctx.beginPath();
  ctx.moveTo(x0 - dx, y0 - dy);
  ctx.lineTo(x0 + dx, y0 + dy);
  ctx.lineTo(x1 + dx, y1 + dy);
  ctx.lineTo(x1 - dx, y1 - dy);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawSprayStep(
  ctx: CanvasRenderingContext2D,
  session: StrokeSession,
  x: number,
  y: number,
  radius: number,
  stepSeed: number,
) {
  const {color, opacity} = session;
  ctx.save();
  ctx.fillStyle = color;
  const dots = Math.max(16, Math.round(radius * 2.5));
  for (let i = 0; i < dots; i++) {
    const r1 = seededRand(stepSeed + i * 4.3);
    const r2 = seededRand(stepSeed + i * 9.7);
    const r3 = seededRand(stepSeed + i * 15.1);
    const d = r1 * r1 * radius * 1.35;
    const theta = r2 * Math.PI * 2;
    const px = x + Math.cos(theta) * d;
    const py = y + Math.sin(theta) * d;
    ctx.globalAlpha = opacity * (1 - d / (radius * 1.5)) * (0.25 + r3 * 0.55);
    const dotSize = 0.7 + r3 * 1.5;
    ctx.beginPath();
    ctx.arc(px, py, dotSize, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawSegment(
  ctx: CanvasRenderingContext2D,
  session: StrokeSession,
  point: StrokePoint,
  pointerType: string,
  tailProgress = 1,
  isInitial = false,
) {
  const prev = session.lastPoint;
  const dx = point.x - prev.x;
  const dy = point.y - prev.y;
  const dist = Math.hypot(dx, dy);
  const dt = Math.max(1, point.time - prev.time);
  const instantSpeed = dist / dt;

  session.smoothedSpeed = session.smoothedSpeed * 0.65 + instantSpeed * 0.35;
  const targetPressure = effectivePressure(
    point.pressure,
    pointerType,
    session.smoothedSpeed,
  );
  session.smoothedPressure = session.smoothedPressure * 0.55 + targetPressure * 0.45;

  const rawAngle = dist > 0.4 ? Math.atan2(dy, dx) : session.lastAngle;
  let isFirstMove = false;
  if (dist > 0.4) {
    if (session.hasDirection) {
      let dAng = rawAngle - session.lastAngle;
      while (dAng > Math.PI) dAng -= Math.PI * 2;
      while (dAng < -Math.PI) dAng += Math.PI * 2;
      const clampedStepAng = Math.max(-0.22, Math.min(0.22, dAng));
      session.angularVelocity = session.angularVelocity * 0.68 + clampedStepAng * 0.32;
    } else {
      session.hasDirection = true;
      isFirstMove = true;
    }
    session.lastAngle = rawAngle;
  }
  const angle = session.lastAngle;

  if (session.tool === 'eraser') {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(4, session.size * 1.3);
    if (isInitial || dist < 0.5) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
    ctx.restore();
    session.lastPoint = point;
    return;
  }

  const stepSpacing =
    session.preset === 'roller'
      ? Math.max(2, session.size * 0.16)
      : session.preset === 'stroke' || session.preset === 'dry'
        ? Math.max(1.5, session.size * 0.14)
        : session.preset === 'calligraphy'
          ? Math.max(1.5, session.size * 0.15)
          : Math.max(2.5, session.size * 0.22);

  const steps = isInitial ? 1 : Math.max(1, Math.ceil(dist / stepSpacing));

  for (let s = 1; s <= steps; s++) {
    const t = isInitial ? 1 : s / steps;
    const x0 = prev.x + dx * ((s - 1) / steps);
    const y0 = prev.y + dy * ((s - 1) / steps);
    const x1 = prev.x + dx * t;
    const y1 = prev.y + dy * t;
    const stepDist = isInitial ? 0 : dist / steps;
    session.totalDistance += stepDist;

    const stepIndex = Math.round(session.totalDistance);

    if (session.preset === 'stroke') {
      // Progressive paint depletion & distinct tapering along the stroke body + release tail
      const taperDist = Math.max(120, session.size * 16);
      const distNorm = Math.min(1, Math.max(0, (session.totalDistance - session.size * 1.5) / taperDist));
      const distanceLife = 1 - Math.pow(distNorm, 1.15) * 0.68;
      const lifeProgress = Math.max(0.04, distanceLife * tailProgress);
      const pressureScale = 0.4 + session.smoothedPressure * 0.85;
      const widthFactor = pressureScale * (0.22 + 0.78 * Math.pow(lifeProgress, 0.8));

      drawBristleStrokeStep(
        ctx,
        session,
        x0,
        y0,
        x1,
        y1,
        angle,
        isInitial ? widthFactor * 0.5 : widthFactor,
        lifeProgress,
        false,
        isFirstMove && s === 1,
      );
    } else if (session.preset === 'dry') {
      const pressureScale = 0.42 + session.smoothedPressure * 0.85;
      const widthFactor = pressureScale * (0.28 + 0.72 * tailProgress);
      drawBristleStrokeStep(
        ctx,
        session,
        x0,
        y0,
        x1,
        y1,
        angle,
        widthFactor,
        tailProgress,
        true,
        isInitial && s === 1,
      );
    } else if (session.preset === 'roller') {
      // Roller keeps mostly consistent width with slight 20-25% narrowing toward stroke end
      const speedSlim = Math.max(0.78, 1 - session.smoothedSpeed * 0.04);
      const rollerTaper = speedSlim * (0.76 + 0.24 * tailProgress);
      drawRollerStep(ctx, session, x1, y1, angle, rollerTaper, stepIndex);
    } else if (session.preset === 'watercolor') {
      const r = Math.max(3, (session.size * 0.75) * (0.65 + session.smoothedPressure * 0.45));
      drawWatercolorStep(ctx, session, x1, y1, r, session.seed + stepIndex * 1.7);
    } else if (session.preset === 'charcoal') {
      const r = Math.max(2, (session.size * 0.55) * (0.6 + session.smoothedPressure * 0.5));
      drawCharcoalStep(ctx, session, x1, y1, r, session.seed + stepIndex * 2.3);
    } else if (session.preset === 'calligraphy') {
      const widthFactor = 0.75 + session.smoothedPressure * 0.35;
      drawCalligraphyStep(ctx, session, x0, y0, x1, y1, widthFactor);
    } else if (session.preset === 'spray') {
      const r = Math.max(6, session.size * 0.95);
      drawSprayStep(ctx, session, x1, y1, r, session.seed + stepIndex * 3.1);
    }
  }

  session.lastPoint = point;
}

/**
 * Renders a natural tapered, ragged release tail on pointerup for Stroke & Roller.
 */
export function finishStroke(
  ctx: CanvasRenderingContext2D,
  session: StrokeSession,
  pointerType: string,
) {
  if (session.tool !== 'brush') return;
  if (session.totalDistance < 4) return;
  if (session.preset !== 'stroke' && session.preset !== 'roller' && session.preset !== 'dry') {
    return;
  }

  const tailLen =
    session.preset === 'roller'
      ? Math.min(22, Math.max(8, session.size * 0.45))
      : session.preset === 'stroke'
        ? Math.min(72, Math.max(28, session.size * 2.2 + session.smoothedSpeed * 8))
        : Math.min(34, Math.max(12, session.size * 0.8 + session.smoothedSpeed * 4));

  const steps = session.preset === 'roller' ? 5 : session.preset === 'stroke' ? 12 : 7;
  const stepLen = tailLen / steps;
  let angle = session.lastAngle;
  let angVel = Math.max(-0.08, Math.min(0.08, session.angularVelocity * 0.55));

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const progress = session.preset === 'stroke' ? Math.pow(1 - t, 1.25) : 1 - t;
    angle += angVel;
    angVel *= 0.88;
    const nextPoint: StrokePoint = {
      x: session.lastPoint.x + Math.cos(angle) * stepLen,
      y: session.lastPoint.y + Math.sin(angle) * stepLen,
      pressure: Math.max(0.04, session.lastPoint.pressure * progress),
      time: session.lastPoint.time + 10,
    };
    drawSegment(ctx, session, nextPoint, pointerType, progress, false);
  }
}

export function cropOpaqueCanvasBounds(
  src: HTMLCanvasElement,
  alphaThreshold = 3,
): {
  dataUrl: string;
  minX: number;
  minY: number;
  width: number;
  height: number;
} | null {
  const w = src.width;
  const h = src.height;
  if (w <= 0 || h <= 0) return null;
  const ctx = src.getContext('2d');
  if (!ctx) return null;
  const data = ctx.getImageData(0, 0, w, h).data;

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    for (let x = 0; x < w; x++) {
      if (data[row + x * 4 + 3] > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;
  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  const out = document.createElement('canvas');
  out.width = cropW;
  out.height = cropH;
  const octx = out.getContext('2d');
  if (!octx) return null;
  octx.drawImage(src, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

  return {
    dataUrl: encodeTransparentCanvasCompact(out),
    minX,
    minY,
    width: cropW,
    height: cropH,
  };
}

