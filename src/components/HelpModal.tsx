import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Eye,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  Magnet,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  MousePointer2,
  PaintBucket,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Shapes,
  Sparkles,
  Spline,
  Stamp,
  Type,
  Undo2,
  X,
} from 'lucide-react';
import { SupportedLanguage } from '../types/paint';
import { getHelpCopy } from '../i18n/helpTranslations';
import { trackFunction, trackWindowClose, trackWindowOpen } from '../utils/analytics';

interface HelpModalProps {
  lang: SupportedLanguage;
  isDarkBg: boolean;
  dontShowAgain: boolean;
  initialFullscreenDemo?: boolean;
  onToggleDontShowAgain: (next: boolean) => void;
  onClose: () => void;
}

interface DemoStepTiming {
  id: number;
  startSec: number;
  endSec: number;
}

const DEMO_TIMINGS: DemoStepTiming[] = [
  { id: 0, startSec: 0, endSec: 3.1 },
  { id: 1, startSec: 3.1, endSec: 6.7 },
  { id: 2, startSec: 6.7, endSec: 9.9 },
  { id: 3, startSec: 9.9, endSec: 13.5 },
  { id: 4, startSec: 13.5, endSec: 16.6 },
  { id: 5, startSec: 16.6, endSec: 20.2 },
  { id: 6, startSec: 20.2, endSec: 24.6 },
  { id: 7, startSec: 24.6, endSec: 29.4 },
];

const TOTAL_DEMO_SEC = DEMO_TIMINGS[DEMO_TIMINGS.length - 1].endSec;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => {
  const x = clamp01(t);
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
};
const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

function buildOrganicBlobPoints(count = 72): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const r =
      62 +
      16 * Math.sin(a * 2 + 0.4) +
      10 * Math.cos(a * 3 - 0.7) +
      6 * Math.sin(a * 5 + 1.1);
    pts.push({
      x: Math.cos(a) * r * 1.15,
      y: Math.sin(a) * r * 0.85,
    });
  }
  return pts;
}

const ORGANIC_BLOB_PTS = buildOrganicBlobPoints(72);

function buildStarDemoPoints(roundRatio: number): Array<{ x: number; y: number }> {
  const base: Array<{ x: number; y: number }> = [];
  const spikes = 5;
  let rot = -Math.PI / 2;
  const step = Math.PI / spikes;
  for (let i = 0; i < spikes; i++) {
    base.push({ x: Math.cos(rot) * 52, y: Math.sin(rot) * 52 });
    rot += step;
    base.push({ x: Math.cos(rot) * 23, y: Math.sin(rot) * 23 });
    rot += step;
  }

  const clamped = clamp01(roundRatio);
  if (clamped <= 0.01) return base;

  const out: Array<{ x: number; y: number }> = [];
  const n = base.length;
  const segs = 6;
  for (let i = 0; i < n; i++) {
    const prev = base[(i - 1 + n) % n];
    const curr = base[i];
    const next = base[(i + 1) % n];
    const ux = prev.x - curr.x;
    const uy = prev.y - curr.y;
    const vx = next.x - curr.x;
    const vy = next.y - curr.y;
    const l1 = Math.hypot(ux, uy) || 1;
    const l2 = Math.hypot(vx, vy) || 1;
    const cut = Math.min(l1, l2) * 0.48 * clamped;
    const ax = curr.x + (ux / l1) * cut;
    const ay = curr.y + (uy / l1) * cut;
    const bx = curr.x + (vx / l2) * cut;
    const by = curr.y + (vy / l2) * cut;
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const omt = 1 - t;
      out.push({
        x: omt * omt * ax + 2 * omt * t * curr.x + t * t * bx,
        y: omt * omt * ay + 2 * omt * t * curr.y + t * t * by,
      });
    }
  }
  return out;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

function drawSelectionBox(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  angleRad: number,
  color: string,
  showRotate = true
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angleRad);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.strokeRect(-halfW, -halfH, halfW * 2, halfH * 2);

  if (showRotate) {
    ctx.beginPath();
    ctx.moveTo(0, -halfH);
    ctx.lineTo(0, -halfH - 18);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -halfH - 21, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.stroke();
  }

  const handles = [
    [-halfW, -halfH],
    [halfW, -halfH],
    [-halfW, halfH],
    [halfW, halfH],
    [0, -halfH],
    [0, halfH],
    [-halfW, 0],
    [halfW, 0],
  ];
  for (const [hx, hy] of handles) {
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.fillRect(hx - 4, hy - 4, 8, 8);
    ctx.strokeRect(hx - 4, hy - 4, 8, 8);
  }
  ctx.restore();
}

function drawSnapGlowRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  intensity = 1
) {
  ctx.save();
  ctx.globalAlpha = clamp01(intensity);
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.24)';
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = '#10B981';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = '#10B981';
  ctx.fill();
  ctx.restore();
}

function drawCursorPointer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  isPressed: boolean,
  ringColor?: string,
  ringProgress?: number
) {
  ctx.save();
  if (ringColor && typeof ringProgress === 'number' && ringProgress > 0) {
    ctx.beginPath();
    ctx.arc(x, y, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp01(ringProgress));
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  } else if (isPressed) {
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(37, 99, 235, 0.22)';
    ctx.fill();
  }

  ctx.translate(x, y);
  ctx.scale(isPressed ? 0.9 : 1, isPressed ? 0.9 : 1);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 17);
  ctx.lineTo(4.6, 13.3);
  ctx.lineTo(8.3, 20.5);
  ctx.lineTo(11, 19.2);
  ctx.lineTo(7.2, 12);
  ctx.lineTo(12.5, 11.4);
  ctx.closePath();

  ctx.shadowColor = 'rgba(15, 23, 42, 0.35)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#0F172A';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

function getPetalPoint(
  cx: number,
  cy: number,
  angle: number,
  len: number,
  spread: number,
  t: number
): { x: number; y: number } {
  const c1x = cx + Math.cos(angle - spread) * len * 0.72;
  const c1y = cy + Math.sin(angle - spread) * len * 0.72;
  const tipX = cx + Math.cos(angle) * len;
  const tipY = cy + Math.sin(angle) * len;
  const c2x = cx + Math.cos(angle + spread) * len * 0.72;
  const c2y = cy + Math.sin(angle + spread) * len * 0.72;

  if (t <= 0.5) {
    const u = t * 2;
    const omu = 1 - u;
    return {
      x: omu * omu * cx + 2 * omu * u * c1x + u * u * tipX,
      y: omu * omu * cy + 2 * omu * u * c1y + u * u * tipY,
    };
  }
  const u = (t - 0.5) * 2;
  const omu = 1 - u;
  return {
    x: omu * omu * tipX + 2 * omu * u * c2x + u * u * cx,
    y: omu * omu * tipY + 2 * omu * u * c2y + u * u * cy,
  };
}

function tracePetalPartial(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angle: number,
  len: number,
  spread: number,
  progress: number
) {
  const steps = Math.max(2, Math.round(clamp01(progress) * 28));
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  for (let i = 1; i <= steps; i++) {
    const pt = getPetalPoint(cx, cy, angle, len, spread, (i / steps) * clamp01(progress));
    ctx.lineTo(pt.x, pt.y);
  }
  if (progress >= 0.995) {
    ctx.closePath();
  }
}

interface GuideVisualMeta {
  icon: React.ReactNode;
  accent: string;
}

const GUIDE_VISUALS: GuideVisualMeta[] = [
  { icon: <Shapes className="w-4 h-4" />, accent: 'text-blue-500 bg-blue-500/12' },
  { icon: <RefreshCw className="w-4 h-4" />, accent: 'text-emerald-500 bg-emerald-500/12' },
  { icon: <PaintBucket className="w-4 h-4" />, accent: 'text-cyan-500 bg-cyan-500/12' },
  { icon: <MousePointer2 className="w-4 h-4" />, accent: 'text-amber-500 bg-amber-500/12' },
  { icon: <Pencil className="w-4 h-4" />, accent: 'text-indigo-500 bg-indigo-500/12' },
  { icon: <Type className="w-4 h-4" />, accent: 'text-violet-500 bg-violet-500/12' },
  { icon: <Stamp className="w-4 h-4" />, accent: 'text-pink-500 bg-pink-500/12' },
  { icon: <ImageIcon className="w-4 h-4" />, accent: 'text-teal-500 bg-teal-500/12' },
  { icon: <Eraser className="w-4 h-4" />, accent: 'text-rose-500 bg-rose-500/12' },
  { icon: <MoreHorizontal className="w-4 h-4" />, accent: 'text-slate-500 bg-slate-500/12' },
];

export const HelpModal: React.FC<HelpModalProps> = ({
  lang,
  isDarkBg,
  dontShowAgain,
  initialFullscreenDemo = false,
  onToggleDontShowAgain,
  onClose,
}) => {
  const copy = useMemo(() => getHelpCopy(lang), [lang]);
  const [activeTab, setActiveTab] = useState<'demo' | 'guide'>('demo');
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreenDemo, setIsFullscreenDemo] = useState(Boolean(initialFullscreenDemo));
  const [timeSec, setTimeSec] = useState(0);
  const [guideQuery, setGuideQuery] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);

  useEffect(() => {
    trackWindowOpen('help_tutorial_modal', {
      initial_tab: 'demo',
      fullscreen: Boolean(initialFullscreenDemo),
      dont_show_again: dontShowAgain,
      language: lang,
    });
    return () => trackWindowClose('help_tutorial_modal');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentStepIndex = useMemo(() => {
    const idx = DEMO_TIMINGS.findIndex(
      (s) => timeSec >= s.startSec && timeSec < s.endSec
    );
    return idx >= 0 ? idx : DEMO_TIMINGS.length - 1;
  }, [timeSec]);

  // Animation clock
  useEffect(() => {
    if (activeTab !== 'demo' || !isPlaying) {
      lastTsRef.current = null;
      return;
    }

    let rafId = 0;
    const tick = (now: number) => {
      if (lastTsRef.current !== null) {
        const dt = Math.min(0.08, (now - lastTsRef.current) / 1000);
        let next = timeRef.current + dt;
        if (next >= TOTAL_DEMO_SEC) {
          next = next % TOTAL_DEMO_SEC;
        }
        timeRef.current = next;
        setTimeSec(next);
      }
      lastTsRef.current = now;
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafId);
      lastTsRef.current = null;
    };
  }, [activeTab, isPlaying]);

  // Render interactive stage frame
  useEffect(() => {
    if (activeTab !== 'demo') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 640;
    const H = 360;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
      canvas.width = W * dpr;
      canvas.height = H * dpr;
    }

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Studio grid background
    ctx.fillStyle = isDarkBg ? '#18181B' : '#F8FAFC';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = isDarkBg ? 'rgba(255,255,255,0.06)' : 'rgba(148,163,184,0.22)';
    ctx.lineWidth = 1;
    for (let x = 24; x < W; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, H);
      ctx.stroke();
    }
    for (let y = 24; y < H; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(W, y + 0.5);
      ctx.stroke();
    }

    const t = timeSec;

    let curX = 230;
    let curY = 185;
    let pressed = false;
    let ringColor: string | undefined;
    let ringProg: number | undefined;
    let activeToolIdx = 0;
    let highlightTool = false;

    // =========================================================================
    // CHAPTERS 1-6 (0.0 .. 20.2s)
    // =========================================================================
    if (t < 20.5) {
      const stageAlpha = t > 20.15 ? clamp01((20.5 - t) / 0.35) : 1;
      ctx.save();
      ctx.globalAlpha = stageAlpha;

      const drawProg = easeInOut(t / 2.45);
      const isBlobClosed = t >= 2.45;
      const strokeChanged = t >= 4.2;
      const fillChanged = t >= 5.1;
      const doubleLineOn = t >= 6.0;

      let blobCx = 230;
      let blobCy = 185;
      let blobScale = 1;
      let blobAngle = 0;

      if (t >= 6.7) {
        const moveT = easeInOut((t - 6.9) / 0.85);
        const scaleT = easeInOut((t - 7.85) / 0.85);
        const rotT = easeInOut((t - 8.8) / 0.9);
        blobCx = lerp(230, 172, moveT);
        blobCy = lerp(185, 166, moveT);
        blobScale = lerp(1, 1.12, scaleT);
        blobAngle = lerp(0, -0.22, rotT);
      }

      const blobStrokeColor = strokeChanged
        ? '#0EA5E9'
        : isDarkBg
          ? '#E2E8F0'
          : '#0F172A';
      const blobFillColor = fillChanged ? 'rgba(56, 189, 248, 0.28)' : 'transparent';

      // Amorphous Blob
      ctx.save();
      ctx.translate(blobCx, blobCy);
      ctx.rotate(blobAngle);
      ctx.scale(blobScale, blobScale);

      const ptLimit = isBlobClosed
        ? ORGANIC_BLOB_PTS.length
        : Math.max(2, Math.floor(drawProg * ORGANIC_BLOB_PTS.length));

      ctx.beginPath();
      ctx.moveTo(ORGANIC_BLOB_PTS[0].x, ORGANIC_BLOB_PTS[0].y);
      for (let i = 1; i < ptLimit; i++) {
        ctx.lineTo(ORGANIC_BLOB_PTS[i].x, ORGANIC_BLOB_PTS[i].y);
      }
      if (isBlobClosed) {
        ctx.closePath();
        if (fillChanged) {
          ctx.fillStyle = blobFillColor;
          ctx.fill();
        }
      }

      if (doubleLineOn) {
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = blobStrokeColor;
        ctx.lineWidth = 7.2;
        ctx.stroke();

        ctx.strokeStyle = isDarkBg ? '#18181B' : '#F8FAFC';
        ctx.lineWidth = 3.2;
        ctx.stroke();

        if (fillChanged) {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
          ctx.lineWidth = 3.2;
          ctx.stroke();
        }
      } else {
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = blobStrokeColor;
        ctx.lineWidth = 3.4;
        ctx.stroke();
      }
      ctx.restore();

      if (t >= 2.4 && t <= 3.0) {
        const p = (t - 2.4) / 0.6;
        const sx = blobCx + ORGANIC_BLOB_PTS[0].x;
        const sy = blobCy + ORGANIC_BLOB_PTS[0].y;
        ctx.beginPath();
        ctx.arc(sx, sy, lerp(4, 16, p), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(16, 185, 129, ${(1 - p) * 0.9})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      if (t >= 6.7 && t < 9.95) {
        drawSelectionBox(ctx, blobCx, blobCy, 82 * blobScale, 66 * blobScale, blobAngle, '#2563EB');
      }

      // Star polygon + long-tap corner rounding
      let starCornerRatio = 0;
      const starCx = 396;
      const starCy = 114;
      if (t >= 9.9) {
        const appearT = easeOutCubic((t - 9.9) / 0.4);
        if (t >= 11.35) {
          starCornerRatio = easeInOut((t - 11.35) / 1.55);
        }
        const starPts = buildStarDemoPoints(starCornerRatio);

        ctx.save();
        ctx.translate(starCx, starCy);
        ctx.scale(appearT, appearT);
        ctx.beginPath();
        ctx.moveTo(starPts[0].x, starPts[0].y);
        for (let i = 1; i < starPts.length; i++) {
          ctx.lineTo(starPts[i].x, starPts[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(139, 92, 246, 0.24)';
        ctx.fill();
        ctx.strokeStyle = '#7C3AED';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.restore();

        if (t < 13.55) {
          const isAmberArmed = t >= 11.1;
          drawSelectionBox(
            ctx,
            starCx,
            starCy,
            56,
            56,
            0,
            isAmberArmed ? '#F59E0B' : '#2563EB',
            true
          );

          if (isAmberArmed) {
            const pct = Math.round(starCornerRatio * 100);
            ctx.save();
            roundRectPath(ctx, starCx - 56, starCy - 86, 112, 22, 11);
            ctx.fillStyle = isDarkBg ? 'rgba(24,24,27,0.92)' : 'rgba(255,255,255,0.96)';
            ctx.fill();
            ctx.strokeStyle = '#F59E0B';
            ctx.lineWidth = 1.3;
            ctx.stroke();
            ctx.fillStyle = isDarkBg ? '#FBBF24' : '#B45309';
            ctx.font = '600 11px Inter, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
              `${copy.demoRadius}: ${pct}%`,
              starCx,
              starCy - 75
            );
            ctx.restore();
          }
        }
      }

      // Stamp & Photo Card
      if (t >= 14.1) {
        const sScale = easeOutCubic((t - 14.1) / 0.45);
        ctx.save();
        ctx.translate(360, 252);
        ctx.scale(sScale, sScale);
        roundRectPath(ctx, -26, -26, 52, 52, 14);
        ctx.fillStyle = isDarkBg ? 'rgba(236, 72, 153, 0.16)' : 'rgba(236, 72, 153, 0.12)';
        ctx.fill();
        ctx.strokeStyle = '#EC4899';
        ctx.lineWidth = 2.4;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, 12);
        ctx.bezierCurveTo(-16, 2, -16, -12, -7, -12);
        ctx.bezierCurveTo(-2, -12, 0, -7, 0, -7);
        ctx.bezierCurveTo(0, -7, 2, -12, 7, -12);
        ctx.bezierCurveTo(16, -12, 16, 2, 0, 12);
        ctx.strokeStyle = '#EC4899';
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.restore();
      }

      if (t >= 15.2) {
        const pScale = easeOutCubic((t - 15.2) / 0.5);
        ctx.save();
        ctx.translate(492, 230);
        ctx.rotate(0.06);
        ctx.scale(pScale, pScale);
        ctx.shadowColor = 'rgba(15, 23, 42, 0.18)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;
        roundRectPath(ctx, -56, -44, 112, 88, 10);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = isDarkBg ? '#475569' : '#CBD5E1';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.save();
        roundRectPath(ctx, -48, -36, 96, 62, 6);
        ctx.clip();
        const sky = ctx.createLinearGradient(0, -36, 0, 26);
        sky.addColorStop(0, '#38BDF8');
        sky.addColorStop(1, '#BAE6FD');
        ctx.fillStyle = sky;
        ctx.fillRect(-48, -36, 96, 62);
        ctx.beginPath();
        ctx.arc(24, -18, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#FBBF24';
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-48, 26);
        ctx.lineTo(-14, -10);
        ctx.lineTo(14, 18);
        ctx.lineTo(32, -2);
        ctx.lineTo(48, 26);
        ctx.closePath();
        ctx.fillStyle = '#0F766E';
        ctx.fill();
        ctx.restore();
        ctx.restore();
      }

      // Text + Deform
      if (t >= 17.2) {
        const txtAppear = easeOutCubic((t - 17.2) / 0.35);
        const deformT = easeInOut((t - 18.0) / 1.45);
        const tx = 205;
        const ty = 294;
        const sx = lerp(1, 1.32, deformT) * txtAppear;
        const sy = lerp(1, 0.86, deformT) * txtAppear;
        const tAng = lerp(0, -0.09, deformT);

        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(tAng);
        ctx.scale(sx, sy);
        ctx.font = '700 28px Montserrat, Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isDarkBg ? '#F8FAFC' : '#0F172A';
        ctx.fillText('ZenPainter', 0, 0);
        ctx.restore();

        if (t >= 17.5) {
          drawSelectionBox(ctx, tx, ty, 88 * sx, 22 * sy, tAng, '#2563EB', true);
        }
      }

      // Floating Mini Popover in Step 1
      if (t >= 3.35 && t <= 6.65) {
        const popAlpha =
          t < 3.65 ? (t - 3.35) / 0.3 : t > 6.35 ? (6.65 - t) / 0.3 : 1;
        const px = 420;
        const py = 54;
        const pw = 162;
        const ph = 186;
        ctx.save();
        ctx.globalAlpha = clamp01(popAlpha) * stageAlpha;
        roundRectPath(ctx, px, py, pw, ph, 14);
        ctx.fillStyle = isDarkBg ? 'rgba(23, 23, 23, 0.96)' : 'rgba(255, 255, 255, 0.97)';
        ctx.fill();
        ctx.strokeStyle = isDarkBg ? '#404040' : '#E2E8F0';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        ctx.fillStyle = isDarkBg ? '#94A3B8' : '#64748B';
        ctx.font = '600 10px Inter, sans-serif';
        ctx.fillText(copy.demoStrokeStyle, px + 12, py + 18);

        ['#0F172A', '#EF4444', '#0EA5E9', '#10B981'].forEach((c, idx) => {
          const sx = px + 22 + idx * 34;
          const sy = py + 38;
          ctx.beginPath();
          ctx.arc(sx, sy, 9, 0, Math.PI * 2);
          ctx.fillStyle = c;
          ctx.fill();
          if (strokeChanged && idx === 2) {
            ctx.strokeStyle = '#2563EB';
            ctx.lineWidth = 2.2;
            ctx.stroke();
          }
        });

        roundRectPath(ctx, px + 12, py + 62, pw - 24, 28, 8);
        ctx.fillStyle = doubleLineOn ? '#2563EB' : isDarkBg ? '#262626' : '#F1F5F9';
        ctx.fill();
        ctx.fillStyle = doubleLineOn ? '#FFFFFF' : isDarkBg ? '#E2E8F0' : '#334155';
        ctx.font = '600 10.5px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(copy.demoDoubleLine, px + pw / 2, py + 80, pw - 32);

        ctx.textAlign = 'left';
        ctx.fillStyle = isDarkBg ? '#94A3B8' : '#64748B';
        ctx.font = '600 10px Inter, sans-serif';
        ctx.fillText(copy.demoFill, px + 12, py + 112);

        ['#CBD5E1', '#F59E0B', '#38BDF8', '#EC4899'].forEach((c, idx) => {
          const fx = px + 22 + idx * 34;
          const fy = py + 132;
          ctx.beginPath();
          ctx.arc(fx, fy, 9, 0, Math.PI * 2);
          ctx.fillStyle = c;
          ctx.fill();
          if (fillChanged && idx === 2) {
            ctx.strokeStyle = '#2563EB';
            ctx.lineWidth = 2.2;
            ctx.stroke();
          }
        });

        ctx.fillStyle = isDarkBg ? '#64748B' : '#94A3B8';
        ctx.font = '500 9.5px Inter, sans-serif';
        ctx.fillText(copy.demoBorderZero, px + 12, py + 166, pw - 24);
        ctx.restore();
      }

      // Sidebar active highlight + Cursor coordinates for Steps 1-6
      activeToolIdx =
        t >= 16.6 && t < 18.0
          ? 1
          : t >= 14.8 && t < 16.6
            ? 3
            : t >= 13.5 && t < 14.8
              ? 2
              : 0;
      highlightTool = (t >= 3.1 && t < 6.7) || (t >= 13.5 && t < 17.8);

      if (t < 2.45) {
        const idxF = drawProg * (ORGANIC_BLOB_PTS.length - 1);
        const i0 = Math.floor(idxF);
        const i1 = Math.min(ORGANIC_BLOB_PTS.length - 1, i0 + 1);
        const f = idxF - i0;
        curX = blobCx + lerp(ORGANIC_BLOB_PTS[i0].x, ORGANIC_BLOB_PTS[i1].x, f);
        curY = blobCy + lerp(ORGANIC_BLOB_PTS[i0].y, ORGANIC_BLOB_PTS[i1].y, f);
        pressed = true;
      } else if (t < 3.6) {
        const p = easeInOut((t - 2.45) / 0.8);
        curX = lerp(blobCx + ORGANIC_BLOB_PTS[0].x, 611, p);
        curY = lerp(blobCy + ORGANIC_BLOB_PTS[0].y, 74, p);
        pressed = t > 3.25 && t < 3.45;
      } else if (t < 4.5) {
        const p = easeInOut((t - 3.6) / 0.55);
        curX = lerp(611, 510, p);
        curY = lerp(74, 92, p);
        pressed = t > 4.15 && t < 4.35;
      } else if (t < 5.4) {
        const p = easeInOut((t - 4.5) / 0.55);
        curX = lerp(510, 510, p);
        curY = lerp(92, 186, p);
        pressed = t > 5.05 && t < 5.25;
      } else if (t < 6.7) {
        const p = easeInOut((t - 5.4) / 0.55);
        curX = lerp(510, 501, p);
        curY = lerp(186, 130, p);
        pressed = t > 5.95 && t < 6.2;
      } else if (t < 7.8) {
        const p = easeInOut((t - 6.7) / 0.35);
        curX = lerp(501, blobCx, p);
        curY = lerp(130, blobCy, p);
        pressed = t > 6.9;
      } else if (t < 8.75) {
        const p = easeInOut((t - 7.8) / 0.25);
        const hx = blobCx + 82 * blobScale;
        const hy = blobCy + 66 * blobScale;
        curX = t < 8.05 ? lerp(blobCx, hx, p) : hx;
        curY = t < 8.05 ? lerp(blobCy, hy, p) : hy;
        pressed = t > 8.0;
      } else if (t < 9.9) {
        const p = easeInOut((t - 8.75) / 0.25);
        const rx = blobCx + Math.sin(-blobAngle) * -(66 * blobScale + 21);
        const ry = blobCy + Math.cos(-blobAngle) * -(66 * blobScale + 21);
        curX = t < 9.0 ? lerp(blobCx + 82, rx, p) : rx;
        curY = t < 9.0 ? lerp(blobCy + 66, ry, p) : ry;
        pressed = t > 8.95;
      } else if (t < 11.35) {
        const p = easeInOut((t - 9.9) / 0.65);
        curX = lerp(blobCx, starCx + 56, p);
        curY = lerp(blobCy - 85, starCy - 56, p);
        if (t >= 10.65) {
          pressed = true;
          ringColor = '#F59E0B';
          ringProg = (t - 10.65) / 0.55;
        }
      } else if (t < 13.5) {
        const dragT = easeInOut((t - 11.35) / 1.55);
        curX = lerp(starCx + 56, starCx + 24, dragT);
        curY = lerp(starCy - 56, starCy - 24, dragT);
        pressed = t < 13.0;
        ringColor = t < 13.0 ? '#F59E0B' : undefined;
        ringProg = t < 13.0 ? 1 : undefined;
      } else if (t < 14.9) {
        const p = easeInOut((t - 13.5) / 0.55);
        curX = lerp(starCx + 24, 611, p);
        curY = lerp(starCy - 24, 154, p);
        pressed = t > 14.05 && t < 14.3;
      } else if (t < 16.6) {
        const p = easeInOut((t - 14.9) / 0.45);
        curX = lerp(611, 611, p);
        curY = lerp(154, 194, p);
        pressed = t > 15.15 && t < 15.45;
      } else if (t < 18.0) {
        const p = easeInOut((t - 16.6) / 0.5);
        curX = lerp(611, 611, p);
        curY = lerp(194, 114, p);
        pressed = t > 17.1 && t < 17.35;
      } else {
        const p = easeInOut((t - 18.0) / 1.45);
        curX = lerp(293, 326, p);
        curY = lerp(272, 266, p);
        pressed = t < 19.6;
      }

      ctx.restore();
    }

    // =========================================================================
    // CHAPTER 7: ENDPOINT SNAP — FLOWER PETALS + STEM MERGE (20.2 .. 24.6s)
    // =========================================================================
    if (t >= 20.2 && t < 24.9) {
      const fAlpha =
        t < 20.5 ? (t - 20.2) / 0.3 : t > 24.55 ? clamp01((24.9 - t) / 0.35) : 1;
      const localT = t - 20.2; // 0 .. 4.4s
      const flowerCx = 300;
      const flowerCy = 136;
      const petalAngles = [
        -Math.PI / 2,
        -Math.PI / 2 + (Math.PI * 2) / 5,
        -Math.PI / 2 + (Math.PI * 4) / 5,
        -Math.PI / 2 + (Math.PI * 6) / 5,
        -Math.PI / 2 + (Math.PI * 8) / 5,
      ];
      const petalLen = 68;
      const petalSpread = 0.42;

      ctx.save();
      ctx.globalAlpha = fAlpha;

      // Stem first appears separately below & slightly shifted, then cursor snaps its top endpoint to flower center!
      const stemSeparateStart = 2.25;
      const stemDragStart = 2.95;
      const stemDragEnd = 3.85;
      const stemSnapped = localT >= stemDragEnd;

      // Draw 5 Flower Petals
      // First 4 petals appear sequentially (0..1.35s), 5th petal is drawn live by cursor (1.35..2.25s) and snaps closed at flowerCx, flowerCy!
      const prePetals = 4;
      for (let i = 0; i < prePetals; i++) {
        const pProg = clamp01((localT - i * 0.28) / 0.32);
        if (pProg <= 0) continue;
        tracePetalPartial(ctx, flowerCx, flowerCy, petalAngles[i], petalLen, petalSpread, pProg);
        if (pProg >= 0.995) {
          ctx.fillStyle = 'rgba(244, 114, 182, 0.25)';
          ctx.fill();
        }
        ctx.strokeStyle = '#EC4899';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }

      // 5th petal drawn live by cursor closing onto center node
      const fifthProg = clamp01((localT - 1.25) / 0.95);
      if (fifthProg > 0) {
        tracePetalPartial(
          ctx,
          flowerCx,
          flowerCy,
          petalAngles[4],
          petalLen,
          petalSpread,
          fifthProg
        );
        if (fifthProg >= 0.995) {
          ctx.fillStyle = 'rgba(244, 114, 182, 0.25)';
          ctx.fill();
        }
        ctx.strokeStyle = '#EC4899';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }

      // Flower core golden circle once petals are closed
      if (localT >= 2.15) {
        const cScale = easeOutCubic((localT - 2.15) / 0.3);
        ctx.beginPath();
        ctx.arc(flowerCx, flowerCy, 14 * cScale, 0, Math.PI * 2);
        ctx.fillStyle = '#FBBF24';
        ctx.fill();
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 2.4;
        ctx.stroke();
      }

      // Stem + Leaf
      const stemBaseX = 300;
      const stemBaseY = 308;
      const snapTargetX = flowerCx;
      const snapTargetY = flowerCy + 14;
      const detachedTopX = 338;
      const detachedTopY = 204;

      if (localT >= stemSeparateStart) {
        const dragT = easeInOut((localT - stemDragStart) / (stemDragEnd - stemDragStart));
        const curStemTopX = lerp(detachedTopX, snapTargetX, dragT);
        const curStemTopY = lerp(detachedTopY, snapTargetY, dragT);

        // Stem curve
        ctx.beginPath();
        ctx.moveTo(curStemTopX, curStemTopY);
        ctx.quadraticCurveTo(
          (curStemTopX + stemBaseX) / 2 - 14,
          (curStemTopY + stemBaseY) / 2,
          stemBaseX,
          stemBaseY
        );
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Leaf snapped onto stem
        const leafProg = clamp01((localT - 3.6) / 0.5);
        if (leafProg > 0) {
          ctx.save();
          ctx.translate(300, 256);
          ctx.scale(leafProg, leafProg);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(36, -24, 52, -14);
          ctx.quadraticCurveTo(34, 10, 0, 0);
          ctx.closePath();
          ctx.fillStyle = 'rgba(16, 185, 129, 0.28)';
          ctx.fill();
          ctx.strokeStyle = '#10B981';
          ctx.lineWidth = 2.8;
          ctx.stroke();
          ctx.restore();
        }

        // Green endpoint handle on stem before snapping
        if (!stemSnapped) {
          ctx.beginPath();
          ctx.arc(curStemTopX, curStemTopY, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.strokeStyle = '#10B981';
          ctx.lineWidth = 2.4;
          ctx.stroke();
        }

        // Snap Glow at junction when stem gets close or petal closes
        if (localT >= 3.55 && localT <= 4.35) {
          const glow = localT < 3.9 ? 1 : clamp01((4.35 - localT) / 0.45);
          drawSnapGlowRing(ctx, snapTargetX, snapTargetY, glow);
        }

        // Cursor trajectory for stem drag
        if (localT < stemDragStart) {
          const moveP = easeInOut((localT - 2.25) / 0.65);
          curX = lerp(flowerCx, detachedTopX, moveP);
          curY = lerp(flowerCy, detachedTopY, moveP);
          pressed = false;
        } else {
          curX = curStemTopX;
          curY = curStemTopY;
          pressed = !stemSnapped;
        }
      } else {
        // Cursor drawing 5th petal and snapping to center
        if (fifthProg > 0) {
          const pt = getPetalPoint(
            flowerCx,
            flowerCy,
            petalAngles[4],
            petalLen,
            petalSpread,
            fifthProg
          );
          curX = pt.x;
          curY = pt.y;
          pressed = fifthProg < 0.99;
          if (fifthProg >= 0.85) {
            drawSnapGlowRing(ctx, flowerCx, flowerCy, clamp01((fifthProg - 0.85) / 0.15));
          }
        } else {
          const idx = Math.min(3, Math.floor(localT / 0.3));
          const pt = getPetalPoint(
            flowerCx,
            flowerCy,
            petalAngles[idx],
            petalLen,
            petalSpread,
            0.5
          );
          curX = pt.x;
          curY = pt.y;
          pressed = true;
        }
      }

      // Snap pill indicator
      if ((fifthProg >= 0.85 && localT < 2.35) || (localT >= 3.65 && localT <= 4.3)) {
        ctx.save();
        roundRectPath(ctx, 378, 128, 134, 24, 12);
        ctx.fillStyle = isDarkBg ? 'rgba(6, 78, 59, 0.92)' : 'rgba(236, 253, 245, 0.96)';
        ctx.fill();
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.fillStyle = isDarkBg ? '#6EE7B7' : '#047857';
        ctx.font = '600 10.5px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(copy.demoSnapMerged, 445, 140, 122);
        ctx.restore();
      }

      activeToolIdx = 0;
      highlightTool = true;
      ctx.restore();
    }

    // =========================================================================
    // CHAPTER 8: UI PROTOTYPING — AUDIO PLAYER MOCKUP (24.6 .. 29.4s)
    // =========================================================================
    if (t >= 24.6) {
      const localT = t - 24.6; // 0 .. 4.8s
      const pAlpha = clamp01(localT / 0.3);
      const px = 220;
      const py = 54;
      const pw = 186;
      const ph = 276;

      ctx.save();
      ctx.globalAlpha = pAlpha;

      // 1) Draw vertical rectangle (0..1.05s) -> Round corners (1.05..1.85s)
      const rectDrawT = easeInOut(localT / 1.0);
      const cornerRoundT = localT >= 1.05 ? easeInOut((localT - 1.05) / 0.8) : 0;
      const curW = lerp(14, pw, rectDrawT);
      const curH = lerp(18, ph, rectDrawT);
      const curRadius = lerp(2, 24, cornerRoundT);

      // Subtle device drop shadow once rounded
      if (cornerRoundT > 0.1) {
        ctx.shadowColor = 'rgba(15, 23, 42, 0.22)';
        ctx.shadowBlur = 18 * cornerRoundT;
        ctx.shadowOffsetY = 6 * cornerRoundT;
      }
      roundRectPath(ctx, px, py, curW, curH, curRadius);
      ctx.fillStyle = isDarkBg ? '#0F172A' : '#FFFFFF';
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = cornerRoundT > 0.05 && localT < 2.0 ? '#F59E0B' : '#334155';
      ctx.lineWidth = 2.6;
      ctx.stroke();

      // Selection box during rect draw + corner rounding
      if (localT < 2.0) {
        drawSelectionBox(
          ctx,
          px + curW / 2,
          py + curH / 2,
          curW / 2,
          curH / 2,
          0,
          localT >= 1.0 ? '#F59E0B' : '#2563EB',
          false
        );
      }

      // 2) Inner Audio Player Artwork & Equalizer Card (2.0..3.1s)
      if (localT >= 2.0) {
        const cardProg = easeOutCubic((localT - 2.0) / 0.45);
        const ax = px + 16;
        const ay = py + 24;
        const aw = pw - 32;
        const ah = 114;

        ctx.save();
        ctx.globalAlpha = pAlpha * cardProg;
        roundRectPath(ctx, ax, ay, aw, ah, 14);
        const eqGrad = ctx.createLinearGradient(ax, ay, ax + aw, ay + ah);
        eqGrad.addColorStop(0, '#0F172A');
        eqGrad.addColorStop(1, '#1E1B4B');
        ctx.fillStyle = eqGrad;
        ctx.fill();

        // Live animated Audio Equalizer bars inside middle box
        const eqReveal = clamp01((localT - 2.2) / 0.55);
        const barCount = 11;
        const barW = 7;
        const gap = 5;
        const startX = ax + (aw - (barCount * barW + (barCount - 1) * gap)) / 2;
        const baseY = ay + ah - 18;
        for (let b = 0; b < barCount; b++) {
          const wave =
            0.35 +
            0.65 * Math.abs(Math.sin(localT * 4.8 + b * 0.75) * Math.cos(b * 0.45));
          const bh = Math.max(8, wave * 68 * eqReveal);
          const bx = startX + b * (barW + gap);
          const barGrad = ctx.createLinearGradient(0, baseY - bh, 0, baseY);
          barGrad.addColorStop(0, '#38BDF8');
          barGrad.addColorStop(0.6, '#818CF8');
          barGrad.addColorStop(1, '#F59E0B');
          roundRectPath(ctx, bx, baseY - bh, barW, bh, 3.5);
          ctx.fillStyle = barGrad;
          ctx.fill();
        }
        ctx.restore();
      }

      // 3) Track Title & Scrubber Bar (2.8..3.4s)
      if (localT >= 2.75) {
        const txtAlpha = clamp01((localT - 2.75) / 0.4);
        ctx.save();
        ctx.globalAlpha = pAlpha * txtAlpha;
        ctx.fillStyle = isDarkBg ? '#F8FAFC' : '#0F172A';
        ctx.font = '700 13px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ZenBeat Player', px + pw / 2, py + 162);

        ctx.fillStyle = isDarkBg ? '#94A3B8' : '#64748B';
        ctx.font = '500 10px Inter, system-ui, sans-serif';
        ctx.fillText('RitmXoid • UI Prototype', px + pw / 2, py + 178);

        // Progress Scrubber
        roundRectPath(ctx, px + 20, py + 196, pw - 40, 5, 2.5);
        ctx.fillStyle = isDarkBg ? '#334155' : '#E2E8F0';
        ctx.fill();
        const progW = (pw - 40) * clamp01(0.25 + (localT - 2.75) * 0.28);
        roundRectPath(ctx, px + 20, py + 196, progW, 5, 2.5);
        ctx.fillStyle = '#38BDF8';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px + 20 + progW, py + 198.5, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#2563EB';
        ctx.fill();
        ctx.restore();
      }

      // 4) Transport Buttons: Prev, Play/Pause, Next (3.15..4.8s)
      const btnsCenterY = py + 238;
      const btnCenterX = px + pw / 2;
      if (localT >= 3.15) {
        const prevScale = easeOutCubic((localT - 3.15) / 0.3);
        ctx.save();
        ctx.translate(btnCenterX - 50, btnsCenterY);
        ctx.scale(prevScale, prevScale);
        ctx.fillStyle = isDarkBg ? '#E2E8F0' : '#334155';
        ctx.beginPath();
        ctx.rect(-10, -8, 2.8, 16);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(7, -8);
        ctx.lineTo(7, 8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      if (localT >= 3.55) {
        const playScale = easeOutCubic((localT - 3.55) / 0.3);
        const showPause = localT >= 4.25;
        ctx.save();
        ctx.translate(btnCenterX, btnsCenterY);
        ctx.scale(playScale, playScale);
        ctx.beginPath();
        ctx.arc(0, 0, 21, 0, Math.PI * 2);
        ctx.fillStyle = '#2563EB';
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        if (showPause) {
          roundRectPath(ctx, -6.5, -7, 4.5, 14, 1.5);
          ctx.fill();
          roundRectPath(ctx, 2, -7, 4.5, 14, 1.5);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(-4, -8);
          ctx.lineTo(9, 0);
          ctx.lineTo(-4, 8);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      if (localT >= 3.9) {
        const nextScale = easeOutCubic((localT - 3.9) / 0.3);
        ctx.save();
        ctx.translate(btnCenterX + 50, btnsCenterY);
        ctx.scale(nextScale, nextScale);
        ctx.fillStyle = isDarkBg ? '#E2E8F0' : '#334155';
        ctx.beginPath();
        ctx.rect(7.2, -8, 2.8, 16);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.lineTo(-7, -8);
        ctx.lineTo(-7, 8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Cursor movement across Step 8
      if (localT < 1.0) {
        curX = px + curW;
        curY = py + curH;
        pressed = true;
      } else if (localT < 1.95) {
        const drag = easeInOut((localT - 1.05) / 0.8);
        curX = lerp(px + pw, px + pw - 22, drag);
        curY = lerp(py, py + 22, drag);
        pressed = true;
        ringColor = '#F59E0B';
        ringProg = clamp01((localT - 1.0) / 0.3);
      } else if (localT < 3.1) {
        const p = easeInOut((localT - 1.95) / 0.6);
        curX = lerp(px + pw - 22, 611, p);
        curY = lerp(py + 22, 154, p);
        pressed = localT > 2.4 && localT < 2.6;
      } else if (localT < 4.15) {
        const p = easeInOut((localT - 3.1) / 0.85);
        curX = lerp(btnCenterX - 50, btnCenterX + 50, p);
        curY = btnsCenterY;
        pressed = true;
      } else {
        const p = easeInOut((localT - 4.15) / 0.4);
        curX = lerp(btnCenterX + 50, btnCenterX, p);
        curY = btnsCenterY;
        pressed = localT >= 4.25 && localT <= 4.45;
      }

      activeToolIdx = localT >= 2.0 ? 2 : 0;
      highlightTool = true;
      ctx.restore();
    }

    // Mini Right Toolbar Overlay inside Demo Stage (always visible on top)
    const barX = 594;
    const barY = 48;
    const barW = 34;
    const barH = 264;
    ctx.save();
    roundRectPath(ctx, barX, barY, barW, barH, 14);
    ctx.fillStyle = isDarkBg ? 'rgba(23, 23, 23, 0.92)' : 'rgba(255, 255, 255, 0.94)';
    ctx.fill();
    ctx.strokeStyle = isDarkBg ? 'rgba(64,64,64,0.85)' : 'rgba(226,232,240,0.95)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    const toolColors = ['#2563EB', '#7C3AED', '#EC4899', '#0D9488', '#F43F5E', '#64748B'];
    for (let i = 0; i < 6; i++) {
      const iy = barY + 14 + i * 40;
      const isAct = i === activeToolIdx && highlightTool;
      if (isAct) {
        roundRectPath(ctx, barX + 5, iy, 24, 24, 7);
        ctx.fillStyle = toolColors[i];
        ctx.fill();
      }
      ctx.strokeStyle = isAct ? '#FFFFFF' : isDarkBg ? '#CBD5E1' : '#475569';
      ctx.lineWidth = 1.7;
      const cx = barX + 17;
      const cy = iy + 12;
      if (i === 0) {
        ctx.strokeRect(cx - 5, cy - 5, 10, 10);
      } else if (i === 1) {
        ctx.font = '700 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fillText('T', cx, cy + 0.5);
      } else if (i === 2) {
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.stroke();
      } else if (i === 3) {
        ctx.strokeRect(cx - 5, cy - 4, 10, 8);
      } else if (i === 4) {
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy + 4);
        ctx.lineTo(cx + 4, cy - 4);
        ctx.stroke();
      } else {
        for (const dx of [-4, 0, 4]) {
          ctx.beginPath();
          ctx.arc(cx + dx, cy, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = ctx.strokeStyle;
          ctx.fill();
        }
      }
    }
    ctx.restore();

    drawCursorPointer(ctx, curX, curY, pressed, ringColor, ringProg);

    ctx.restore();
  }, [activeTab, copy, isDarkBg, timeSec]);

  const guideItems = useMemo(
    () =>
      copy.features.map((feat, idx) => ({
        ...feat,
        icon: GUIDE_VISUALS[idx].icon,
        accent: GUIDE_VISUALS[idx].accent,
      })),
    [copy]
  );

  const filteredGuide = useMemo(() => {
    const q = guideQuery.trim().toLowerCase();
    if (!q) return guideItems;
    return guideItems.filter((item) => {
      const hay = `${item.title} ${item.desc} ${item.badge || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [guideItems, guideQuery]);

  const activeStep = copy.steps[currentStepIndex] || copy.steps[0];

  const jumpToStep = (idx: number) => {
    const clamped = Math.max(0, Math.min(DEMO_TIMINGS.length - 1, idx));
    const targetSec = DEMO_TIMINGS[clamped].startSec + 0.02;
    timeRef.current = targetSec;
    setTimeSec(targetSec);
    trackFunction('help_demo_jump_step', 'help', { step_index: clamped + 1 });
  };

  const surface = isDarkBg
    ? 'bg-neutral-900/98 text-neutral-100 border-neutral-700/90 shadow-2xl shadow-black/70'
    : 'bg-white/98 text-slate-900 border-slate-200 shadow-2xl shadow-slate-900/20';
  const mutedText = isDarkBg ? 'text-neutral-400' : 'text-slate-500';
  const divider = isDarkBg ? 'border-neutral-800' : 'border-slate-100';
  const subSurface = isDarkBg ? 'bg-neutral-800/80' : 'bg-slate-100';

  return (
    <div
      onClick={onClose}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
    >
      <div
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
        onClick={(e) => e.stopPropagation()}
        className={`${
          isFullscreenDemo && activeTab === 'demo'
            ? 'w-[calc(100vw-12px)] sm:w-[calc(100vw-28px)] h-[calc(100dvh-12px)] sm:h-[calc(100dvh-28px)]'
            : 'w-[min(760px,100%)] max-h-[calc(100dvh-20px)]'
        } rounded-2xl border flex flex-col overflow-hidden transition-all duration-150 ${surface}`}
      >
        {/* Header with ZenPainter by RitmXoid Identity & Tabs */}
        <div className={`px-4 py-2.5 border-b flex items-center justify-between gap-2 flex-wrap ${divider}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <svg
              viewBox="0 0 64 64"
              className="w-8 h-8 rounded-xl shrink-0 shadow-sm"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="zp-help-bg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#0F172A" />
                  <stop offset="100%" stopColor="#1E293B" />
                </linearGradient>
                <linearGradient id="zp-help-enso" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#38BDF8" />
                  <stop offset="55%" stopColor="#818CF8" />
                  <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
              </defs>
              <rect width="64" height="64" rx="16" fill="url(#zp-help-bg)" />
              <path
                d="M46.5 21.5A18.5 18.5 0 1 0 49 38"
                fill="none"
                stroke="url(#zp-help-enso)"
                strokeWidth="6.5"
                strokeLinecap="round"
              />
              <path d="M39.5 17.5L46.5 24.5L30.5 40.5L22 42L23.5 33.5Z" fill="#FFFFFF" />
              <circle cx="49" cy="38" r="3" fill="#FBBF24" />
            </svg>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold tracking-tight">
                  ZenPainter
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    isDarkBg
                      ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                      : 'bg-sky-50 text-sky-700 border border-sky-200'
                  }`}
                >
                  by RitmXoid
                </span>
              </div>
              <p className={`text-[11px] truncate ${mutedText}`}>
                {copy.headerSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <div className={`grid grid-cols-2 gap-1 p-1 rounded-xl ${subSurface}`}>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('demo');
                  trackFunction('help_switch_tab', 'help', { tab: 'demo' });
                }}
                className={`min-h-[32px] px-2.5 sm:px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'demo'
                    ? isDarkBg
                      ? 'bg-neutral-900 text-white shadow-sm'
                      : 'bg-white text-slate-900 shadow-sm'
                    : isDarkBg
                      ? 'text-neutral-300 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="truncate">{copy.tabDemo}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsFullscreenDemo(false);
                  setActiveTab('guide');
                  trackFunction('help_switch_tab', 'help', { tab: 'guide' });
                }}
                className={`min-h-[32px] px-2.5 sm:px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'guide'
                    ? isDarkBg
                      ? 'bg-neutral-900 text-white shadow-sm'
                      : 'bg-white text-slate-900 shadow-sm'
                    : isDarkBg
                      ? 'text-neutral-300 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="truncate">{copy.tabGuide}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={copy.closeLabel}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                isDarkBg ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-slate-100 text-slate-500'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 bp-scroll overflow-y-auto p-3 sm:p-4 flex flex-col gap-3">
          {activeTab === 'demo' ? (
            <>
              {/* Animated Canvas Showcase Stage */}
              <div
                dir="ltr"
                className={`relative rounded-2xl border overflow-hidden flex items-center justify-center ${
                  isFullscreenDemo ? 'flex-1 min-h-[240px]' : ''
                } ${isDarkBg ? 'border-neutral-700 bg-neutral-950' : 'border-slate-200 bg-slate-50'}`}
              >
                <canvas
                  ref={canvasRef}
                  className={
                    isFullscreenDemo
                      ? 'absolute inset-0 w-full h-full object-contain block'
                      : 'w-full aspect-[16/9] block'
                  }
                />

                {/* Compact Semi-Transparent Step Caption Pill (non-obstructive) */}
                <div
                  dir={lang === 'ar' ? 'rtl' : 'ltr'}
                  className={`absolute top-2 left-2 max-w-[68%] px-2.5 py-1 rounded-xl border backdrop-blur-sm pointer-events-none ${
                    isDarkBg
                      ? 'bg-neutral-900/45 border-neutral-600/45 text-neutral-100'
                      : 'bg-white/45 border-slate-300/60 text-slate-900'
                  }`}
                >
                  <div className="text-[10.5px] font-bold text-blue-500 leading-tight truncate">
                    {activeStep.title}
                  </div>
                  <div className={`text-[9.5px] leading-tight truncate ${isDarkBg ? 'text-neutral-200/85' : 'text-slate-700/90'}`}>
                    {activeStep.desc}
                  </div>
                </div>

                {/* Top-Right Fullscreen Demo Toggle Button */}
                <button
                  type="button"
                  onClick={() =>
                    setIsFullscreenDemo((f) => {
                      const next = !f;
                      trackFunction('help_demo_fullscreen', 'help', { fullscreen: next });
                      return next;
                    })
                  }
                  title={isFullscreenDemo ? copy.fullscreenExit : copy.fullscreenEnter}
                  aria-label={isFullscreenDemo ? copy.fullscreenExit : copy.fullscreenEnter}
                  className={`absolute top-2 right-2 w-8 h-8 rounded-xl border backdrop-blur-sm flex items-center justify-center transition-colors cursor-pointer ${
                    isDarkBg
                      ? 'bg-neutral-900/55 border-neutral-600/50 text-neutral-100 hover:bg-neutral-800/80'
                      : 'bg-white/60 border-slate-300/70 text-slate-700 hover:bg-white/90'
                  }`}
                >
                  {isFullscreenDemo ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>

                {/* Progress Bar along bottom of canvas */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 dark:bg-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 via-blue-600 to-amber-500 transition-[width] duration-75"
                    style={{ width: `${(timeSec / TOTAL_DEMO_SEC) * 100}%` }}
                  />
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setIsPlaying((p) => {
                        const next = !p;
                        trackFunction('help_demo_play_toggle', 'help', { playing: next });
                        return next;
                      })
                    }
                    className="min-h-[36px] px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>{copy.pause}</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>{copy.play}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      jumpToStep(0);
                      setIsPlaying(true);
                      trackFunction('help_demo_restart', 'help');
                    }}
                    title={copy.restart}
                    className={`min-h-[36px] px-2.5 rounded-xl border text-xs font-medium flex items-center gap-1 cursor-pointer ${
                      isDarkBg
                        ? 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{copy.restart}</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      jumpToStep(
                        (currentStepIndex - 1 + DEMO_TIMINGS.length) % DEMO_TIMINGS.length
                      )
                    }
                    aria-label={copy.prev}
                    className={`min-h-[36px] px-2.5 rounded-xl border flex items-center gap-1 text-xs font-medium cursor-pointer ${
                      isDarkBg
                        ? 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>{copy.prev}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => jumpToStep((currentStepIndex + 1) % DEMO_TIMINGS.length)}
                    aria-label={copy.next}
                    className={`min-h-[36px] px-2.5 rounded-xl border flex items-center gap-1 text-xs font-medium cursor-pointer ${
                      isDarkBg
                        ? 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span>{copy.next}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 8 Clickable Scenario Chapters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 shrink-0">
                {copy.steps.map((step, idx) => {
                  const active = idx === currentStepIndex;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => jumpToStep(idx)}
                      className={`p-2 rounded-xl border text-start transition-colors cursor-pointer ${
                        active
                          ? 'border-blue-500 bg-blue-500/10'
                          : isDarkBg
                            ? 'border-neutral-800 bg-neutral-800/40 hover:bg-neutral-800'
                            : 'border-slate-200/80 bg-slate-50/70 hover:bg-slate-100'
                      }`}
                    >
                      <div
                        className={`text-[11px] font-semibold truncate ${
                          active
                            ? 'text-blue-500'
                            : isDarkBg
                              ? 'text-neutral-200'
                              : 'text-slate-800'
                        }`}
                      >
                        {step.title}
                      </div>
                      <div className={`text-[10px] line-clamp-2 mt-0.5 ${mutedText}`}>
                        {step.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {/* Search Bar for Features */}
              <div className="relative">
                <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${mutedText}`} />
                <input
                  type="text"
                  value={guideQuery}
                  onChange={(e) => setGuideQuery(e.target.value)}
                  placeholder={copy.searchPlaceholder}
                  className={`w-full min-h-[40px] pl-9 pr-3 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDarkBg
                      ? 'bg-neutral-800 border-neutral-700 text-neutral-100 placeholder-neutral-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* Feature Cards Grid */}
              {filteredGuide.length === 0 ? (
                <div className={`py-8 text-center text-xs font-medium ${mutedText}`}>
                  {copy.searchEmpty}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredGuide.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border space-y-1.5 ${
                        isDarkBg
                          ? 'bg-neutral-800/45 border-neutral-800'
                          : 'bg-slate-50/80 border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${item.accent}`}
                          >
                            {item.icon}
                          </span>
                          <h3 className="text-xs font-bold leading-snug">
                            {item.title}
                          </h3>
                        </div>
                        {item.badge && (
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[9.5px] font-semibold shrink-0 ${
                              isDarkBg
                                ? 'bg-neutral-700 text-neutral-200'
                                : 'bg-white border border-slate-200 text-slate-600'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] leading-relaxed ${mutedText}`}>
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Shortcuts Bar */}
              <div
                className={`p-3 rounded-xl border flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] ${
                  isDarkBg
                    ? 'bg-neutral-800/35 border-neutral-800 text-neutral-300'
                    : 'bg-blue-50/60 border-blue-100 text-slate-700'
                }`}
              >
                <span className="flex items-center gap-1 font-semibold text-blue-500">
                  <HelpCircle className="w-3.5 h-3.5" />
                  {copy.shortcutsTitle}
                </span>
                <span>• <b>{copy.shortcutRmbKey}</b> — {copy.shortcutRmbDesc}</span>
                <span>• <b>Ctrl+Z / Ctrl+Y</b> — {copy.shortcutUndoDesc}</span>
                <span>• <b>Space + Drag</b> — {copy.shortcutPanDesc}</span>
                <span>• <b>Delete</b> — {copy.shortcutDeleteDesc}</span>
                <span className="flex items-center gap-1">
                  • <Eye className="w-3 h-3" /> {copy.shortcutPin}
                </span>
                <span className="flex items-center gap-1">
                  • <Magnet className="w-3 h-3" /> {copy.shortcutSnap}
                </span>
                <span className="flex items-center gap-1">
                  • <Spline className="w-3 h-3" /> {copy.shortcutBezier}
                </span>
                <span className="flex items-center gap-1">
                  • <Layers className="w-3 h-3" /> {copy.shortcutLayers}
                </span>
                <span className="flex items-center gap-1">
                  • <Undo2 className="w-3 h-3" /> {copy.shortcutSteps}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer with "Don't show again" checkbox */}
        <div
          className={`px-4 py-2.5 border-t flex items-center justify-between gap-3 shrink-0 ${
            isDarkBg ? 'border-neutral-800 bg-neutral-900/80' : 'border-slate-100 bg-slate-50/70'
          }`}
        >
          <label className="flex items-center gap-2 cursor-pointer select-none min-h-[32px]">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => onToggleDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
            />
            <span className={`text-xs font-medium ${isDarkBg ? 'text-neutral-300' : 'text-slate-700'}`}>
              {copy.dontShowAgain}
            </span>
          </label>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[32px] px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
          >
            {copy.closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
