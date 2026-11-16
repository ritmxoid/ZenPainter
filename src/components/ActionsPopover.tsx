import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Crop,
  Download,
  Globe,
  Grid,
  HelpCircle,
  Maximize2,
  Moon,
  Palette,
  RectangleHorizontal,
  RectangleVertical,
  RotateCcw,
  Rows3,
  SlidersHorizontal,
  Square,
} from 'lucide-react';
import { LANGUAGE_OPTIONS, TranslationKey } from '../i18n/translations';
import {
  BackgroundConfig,
  BackgroundMode,
  CanvasSizeConfig,
  CanvasSizePreset,
  ExportScope,
  LanguagePreference,
} from '../types/paint';
import { hexToRgb, rgbToHex } from '../utils/canvasHelpers';

interface ActionsPopoverProps {
  t: (key: TranslationKey) => string;
  bgConfig: BackgroundConfig;
  onChangeBgConfig: (next: BackgroundConfig) => void;
  onSelectBgPreset: (mode: BackgroundMode) => void;
  canvasSize: CanvasSizeConfig;
  onChangeCanvasSize: (next: CanvasSizeConfig, fitViewport?: boolean) => void;
  exportScope: ExportScope;
  onChangeExportScope: (scope: ExportScope) => void;
  onExport: (format: 'png' | 'jpg') => void;
  zoomPercent: number;
  onResetView: () => void;
  languagePref: LanguagePreference;
  onChangeLanguage: (pref: LanguagePreference) => void;
  onOpenHelp: () => void;
  onTriggerOfflineDownload: () => void;
  isDarkBg: boolean;
}

const BG_PALETTE_SWATCHES = [
  '#FFFFFF',
  '#FAF7F2',
  '#EFF6FF',
  '#ECFDF5',
  '#F5F3FF',
  '#FFE4E6',
  '#FEF3C7',
  '#334155',
  '#1E1E1E',
  '#0F172A',
] as const;

export const ActionsPopover: React.FC<ActionsPopoverProps> = ({
  t,
  bgConfig,
  onChangeBgConfig,
  onSelectBgPreset,
  canvasSize,
  onChangeCanvasSize,
  exportScope,
  onChangeExportScope,
  onExport,
  zoomPercent,
  onResetView,
  languagePref,
  onChangeLanguage,
  onOpenHelp,
  onTriggerOfflineDownload,
  isDarkBg,
}) => {
  const [mixerOpen, setMixerOpen] = useState(bgConfig.mode === 'custom');
  const [activeStop, setActiveStop] = useState<1 | 2>(1);
  const [widthDraft, setWidthDraft] = useState(String(canvasSize.width));
  const [heightDraft, setHeightDraft] = useState(String(canvasSize.height));
  const lastSecretTapRef = useRef<number>(0);

  const handleSecretAreaClick = () => {
    const now = Date.now();
    if (now - lastSecretTapRef.current <= 450) {
      lastSecretTapRef.current = 0;
      onTriggerOfflineDownload();
    } else {
      lastSecretTapRef.current = now;
    }
  };

  useEffect(() => {
    setWidthDraft(String(canvasSize.width));
    setHeightDraft(String(canvasSize.height));
  }, [canvasSize.width, canvasSize.height]);

  const clampDim = (val: number) => Math.max(100, Math.min(6000, Math.round(val)));

  const handlePresetClick = (preset: CanvasSizePreset) => {
    if (preset === 'fullscreen') {
      onChangeCanvasSize({ preset: 'fullscreen', width: canvasSize.width, height: canvasSize.height }, true);
    } else if (preset === 'square') {
      onChangeCanvasSize({ preset: 'square', width: 1080, height: 1080 }, true);
    } else if (preset === 'landscape') {
      onChangeCanvasSize({ preset: 'landscape', width: 1920, height: 1080 }, true);
    } else if (preset === 'portrait') {
      onChangeCanvasSize({ preset: 'portrait', width: 1080, height: 1920 }, true);
    } else {
      const nextW = clampDim(canvasSize.width || 1200);
      const nextH = clampDim(canvasSize.height || 900);
      onChangeCanvasSize({ preset: 'custom', width: nextW, height: nextH }, canvasSize.preset === 'fullscreen');
    }
  };

  const surface = isDarkBg
    ? 'bg-neutral-900/95 text-neutral-100 border-neutral-700/80 shadow-2xl shadow-black/50'
    : 'bg-white/95 text-slate-900 border-slate-200/90 shadow-xl shadow-slate-900/10';
  const mutedText = isDarkBg ? 'text-neutral-400' : 'text-slate-500';
  const divider = isDarkBg ? 'border-neutral-800' : 'border-slate-100';
  const subSurface = isDarkBg ? 'bg-neutral-800/80' : 'bg-slate-100';

  const currentHex = activeStop === 1 ? bgConfig.color1 : bgConfig.color2;
  const rgb = hexToRgb(currentHex);

  const updateActiveColor = (hex: string) => {
    const nextMode: BackgroundMode =
      bgConfig.mode === 'grid' || bgConfig.mode === 'lined' ? bgConfig.mode : 'custom';
    onChangeBgConfig({
      ...bgConfig,
      mode: nextMode,
      ...(activeStop === 1 ? { color1: hex } : { color2: hex }),
    });
  };

  const handleOpenMixer = () => {
    const willOpen = !mixerOpen;
    setMixerOpen(willOpen);
    if (willOpen && (bgConfig.mode === 'white' || bgConfig.mode === 'dark')) {
      onChangeBgConfig({
        ...bgConfig,
        mode: 'custom',
        color1: bgConfig.mode === 'dark' ? '#1E1E1E' : bgConfig.color1 || '#FFFFFF',
      });
    }
  };

  const previewStyle: React.CSSProperties =
    bgConfig.fillType === 'gradient'
      ? {
          background:
            bgConfig.gradientType === 'radial'
              ? `radial-gradient(circle, ${bgConfig.color1}, ${bgConfig.color2})`
              : `linear-gradient(${bgConfig.gradientAngle}deg, ${bgConfig.color1}, ${bgConfig.color2})`,
          opacity: bgConfig.opacity,
        }
      : {
          backgroundColor: bgConfig.mode === 'dark' ? '#1E1E1E' : bgConfig.color1,
          opacity: bgConfig.opacity,
        };

  return (
    <div
      className={`fixed top-4 right-[70px] sm:right-[76px] z-40 w-[min(312px,calc(100vw-82px))] max-h-[calc(100dvh-32px)] rounded-2xl border backdrop-blur-md flex flex-col overflow-hidden transition-all duration-150 ${surface}`}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="flex-1 min-h-0 bp-scroll overflow-y-auto px-4 pt-4 pb-1 space-y-4">
        {/* Export */}
        <div className="space-y-2.5">
          <div className={`text-xs font-medium ${mutedText}`}>{t('exportTitle')}</div>
          {/* Full Canvas vs Artwork Only trim toggle */}
          <div className={`grid grid-cols-2 gap-1 p-1 rounded-xl ${subSurface}`}>
            <button
              type="button"
              onClick={() => onChangeExportScope('canvas')}
              className={`min-h-[34px] px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                exportScope === 'canvas'
                  ? isDarkBg
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'bg-white text-slate-900 shadow-sm'
                  : isDarkBg
                    ? 'text-neutral-300'
                    : 'text-slate-600'
              }`}
            >
              <Maximize2 className="w-3 h-3 shrink-0" />
              <span className="truncate">{t('exportScopeCanvas')}</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeExportScope('artwork')}
              className={`min-h-[34px] px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                exportScope === 'artwork'
                  ? isDarkBg
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'bg-white text-slate-900 shadow-sm'
                  : isDarkBg
                    ? 'text-neutral-300'
                    : 'text-slate-600'
              }`}
            >
              <Crop className="w-3 h-3 shrink-0" />
              <span className="truncate">{t('exportScopeArtwork')}</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onExport('png')}
              className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                isDarkBg
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-100'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>PNG</span>
            </button>
            <button
              type="button"
              onClick={() => onExport('jpg')}
              className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                isDarkBg
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-100'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>JPG</span>
            </button>
          </div>
        </div>

        <hr className={divider} />

        {/* Canvas Background */}
        <div className="space-y-2.5">
          <div className={`text-xs font-medium ${mutedText}`}>{t('backgroundTitle')}</div>
          <div className="grid grid-cols-2 gap-1.5">
            {/* Split White + Palette/Mixer button on the right */}
            <div
              className={`min-h-[44px] rounded-xl flex items-stretch overflow-hidden transition-colors ${
                bgConfig.mode === 'white'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : isDarkBg
                    ? 'bg-neutral-800/70 text-neutral-200'
                    : 'bg-slate-50 text-slate-700'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  onSelectBgPreset('white');
                  setMixerOpen(false);
                }}
                className={`flex-1 min-w-0 px-2.5 py-2 flex items-center gap-2 text-xs font-medium transition-colors cursor-pointer ${
                  bgConfig.mode === 'white'
                    ? 'hover:bg-blue-700'
                    : isDarkBg
                      ? 'hover:bg-neutral-700'
                      : 'hover:bg-slate-100'
                }`}
              >
                <Square className="w-4 h-4 shrink-0" />
                <span className="truncate">{t('bgWhite')}</span>
              </button>
              <button
                type="button"
                onClick={handleOpenMixer}
                title={t('bgPalette')}
                aria-label={t('bgPalette')}
                aria-expanded={mixerOpen}
                className={`w-10 shrink-0 flex items-center justify-center border-l transition-colors cursor-pointer ${
                  bgConfig.mode === 'white'
                    ? 'border-blue-500 hover:bg-blue-700'
                    : isDarkBg
                      ? 'border-neutral-700 hover:bg-neutral-700'
                      : 'border-slate-200 hover:bg-slate-100'
                } ${
                  mixerOpen || bgConfig.mode === 'custom'
                    ? bgConfig.mode === 'white'
                      ? 'bg-blue-700 text-white'
                      : 'bg-blue-600 text-white'
                    : ''
                }`}
              >
                <Palette className="w-4 h-4" />
              </button>
            </div>

            {/* Grid */}
            <button
              type="button"
              onClick={() => onSelectBgPreset('grid')}
              className={`min-h-[44px] px-2.5 py-2 rounded-xl flex items-center gap-2 text-xs font-medium transition-colors cursor-pointer ${
                bgConfig.mode === 'grid'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : isDarkBg
                    ? 'bg-neutral-800/70 text-neutral-200 hover:bg-neutral-700'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Grid className="w-4 h-4 shrink-0" />
              <span className="truncate">{t('bgGrid')}</span>
            </button>

            {/* Lined */}
            <button
              type="button"
              onClick={() => onSelectBgPreset('lined')}
              className={`min-h-[44px] px-2.5 py-2 rounded-xl flex items-center gap-2 text-xs font-medium transition-colors cursor-pointer ${
                bgConfig.mode === 'lined'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : isDarkBg
                    ? 'bg-neutral-800/70 text-neutral-200 hover:bg-neutral-700'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Rows3 className="w-4 h-4 shrink-0" />
              <span className="truncate">{t('bgLined')}</span>
            </button>

            {/* Dark */}
            <button
              type="button"
              onClick={() => {
                onSelectBgPreset('dark');
                setMixerOpen(false);
              }}
              className={`min-h-[44px] px-2.5 py-2 rounded-xl flex items-center gap-2 text-xs font-medium transition-colors cursor-pointer ${
                bgConfig.mode === 'dark'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : isDarkBg
                    ? 'bg-neutral-800/70 text-neutral-200 hover:bg-neutral-700'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Moon className="w-4 h-4 shrink-0" />
              <span className="truncate">{t('bgDark')}</span>
            </button>
          </div>

          {/* Expandable Background Palette, RGB Mixer, Opacity & Gradient */}
          {mixerOpen && (
            <div
              className={`p-3 rounded-xl border space-y-3 ${
                isDarkBg
                  ? 'bg-neutral-800/40 border-neutral-700/80'
                  : 'bg-slate-50/90 border-slate-200/80'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[11px] font-semibold ${mutedText}`}>
                  {t('bgPalette')}
                </span>
                {/* Live swatch preview over checkerboard */}
                <div
                  className="w-12 h-5 rounded-md border border-black/15 overflow-hidden relative"
                  style={{
                    backgroundImage:
                      'linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)',
                    backgroundSize: '8px 8px',
                    backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <div className="w-full h-full" style={previewStyle} />
                </div>
              </div>

              {/* Solid vs Gradient Tabs */}
              <div className={`grid grid-cols-2 gap-1 p-1 rounded-xl ${subSurface}`}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveStop(1);
                    onChangeBgConfig({
                      ...bgConfig,
                      mode:
                        bgConfig.mode === 'grid' || bgConfig.mode === 'lined'
                          ? bgConfig.mode
                          : 'custom',
                      fillType: 'solid',
                    });
                  }}
                  className={`min-h-[34px] rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    bgConfig.fillType === 'solid'
                      ? isDarkBg
                        ? 'bg-neutral-900 text-white shadow-sm'
                        : 'bg-white text-slate-900 shadow-sm'
                      : isDarkBg
                        ? 'text-neutral-300'
                        : 'text-slate-600'
                  }`}
                >
                  {t('bgTypeSolid')}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onChangeBgConfig({
                      ...bgConfig,
                      mode:
                        bgConfig.mode === 'grid' || bgConfig.mode === 'lined'
                          ? bgConfig.mode
                          : 'custom',
                      fillType: 'gradient',
                    })
                  }
                  className={`min-h-[34px] rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    bgConfig.fillType === 'gradient'
                      ? isDarkBg
                        ? 'bg-neutral-900 text-white shadow-sm'
                        : 'bg-white text-slate-900 shadow-sm'
                      : isDarkBg
                        ? 'text-neutral-300'
                        : 'text-slate-600'
                  }`}
                >
                  {t('bgTypeGradient')}
                </button>
              </div>

              {/* Gradient Stop Selector */}
              {bgConfig.fillType === 'gradient' && (
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveStop(1)}
                    className={`min-h-[36px] px-2.5 rounded-lg border text-[11px] font-medium flex items-center gap-2 cursor-pointer ${
                      activeStop === 1
                        ? 'border-blue-500 ring-1 ring-blue-500'
                        : isDarkBg
                          ? 'border-neutral-700'
                          : 'border-slate-200'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-black/15 shrink-0"
                      style={{ backgroundColor: bgConfig.color1 }}
                    />
                    <span className="truncate">{t('bgColor1')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStop(2)}
                    className={`min-h-[36px] px-2.5 rounded-lg border text-[11px] font-medium flex items-center gap-2 cursor-pointer ${
                      activeStop === 2
                        ? 'border-blue-500 ring-1 ring-blue-500'
                        : isDarkBg
                          ? 'border-neutral-700'
                          : 'border-slate-200'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-black/15 shrink-0"
                      style={{ backgroundColor: bgConfig.color2 }}
                    />
                    <span className="truncate">{t('bgColor2')}</span>
                  </button>
                </div>
              )}

              {/* Palette Picker + Quick Swatches */}
              <div className="flex items-center gap-2 flex-wrap">
                <label
                  className={`relative w-8 h-8 rounded-lg border overflow-hidden cursor-pointer shrink-0 ${
                    isDarkBg ? 'border-neutral-600' : 'border-slate-300'
                  }`}
                >
                  <input
                    type="color"
                    value={currentHex}
                    onChange={(e) => updateActiveColor(e.target.value.toUpperCase())}
                    className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer border-0 p-0"
                  />
                </label>
                <div className="flex items-center gap-1.5 flex-wrap flex-1">
                  {BG_PALETTE_SWATCHES.map((hex) => {
                    const selected = currentHex.toLowerCase() === hex.toLowerCase();
                    return (
                      <button
                        key={hex}
                        type="button"
                        aria-label={hex}
                        onClick={() => updateActiveColor(hex)}
                        className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                          selected
                            ? 'ring-2 ring-blue-500 ring-offset-1 scale-110'
                            : 'hover:scale-105'
                        } ${
                          hex === '#FFFFFF'
                            ? 'border-slate-300'
                            : isDarkBg
                              ? 'border-neutral-600'
                              : 'border-black/15'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* RGB Color Mixer Sliders */}
              <div className="space-y-1.5">
                {(
                  [
                    { ch: 'r', label: 'R', value: rgb.r, accent: 'accent-red-500' },
                    { ch: 'g', label: 'G', value: rgb.g, accent: 'accent-emerald-500' },
                    { ch: 'b', label: 'B', value: rgb.b, accent: 'accent-blue-500' },
                  ] as const
                ).map((item) => (
                  <div key={item.ch} className="flex items-center gap-2">
                    <span className={`w-3 text-[11px] font-semibold ${mutedText}`}>
                      {item.label}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={255}
                      value={item.value}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        const nextRgb = { ...rgb, [item.ch]: v };
                        updateActiveColor(rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b));
                      }}
                      className={`flex-1 h-1.5 rounded-lg cursor-pointer ${item.accent}`}
                    />
                    <span className="w-7 text-right text-[11px] font-medium tabular-nums">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Gradient Type & Angle */}
              {bgConfig.fillType === 'gradient' && (
                <div className="space-y-2 pt-0.5">
                  <div className={`grid grid-cols-2 gap-1 p-1 rounded-xl ${subSurface}`}>
                    <button
                      type="button"
                      onClick={() =>
                        onChangeBgConfig({ ...bgConfig, gradientType: 'linear' })
                      }
                      className={`min-h-[30px] rounded-lg text-[11px] font-medium cursor-pointer ${
                        bgConfig.gradientType === 'linear'
                          ? isDarkBg
                            ? 'bg-neutral-900 text-white shadow-sm'
                            : 'bg-white text-slate-900 shadow-sm'
                          : isDarkBg
                            ? 'text-neutral-300'
                            : 'text-slate-600'
                      }`}
                    >
                      {t('bgLinear')}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onChangeBgConfig({ ...bgConfig, gradientType: 'radial' })
                      }
                      className={`min-h-[30px] rounded-lg text-[11px] font-medium cursor-pointer ${
                        bgConfig.gradientType === 'radial'
                          ? isDarkBg
                            ? 'bg-neutral-900 text-white shadow-sm'
                            : 'bg-white text-slate-900 shadow-sm'
                          : isDarkBg
                            ? 'text-neutral-300'
                            : 'text-slate-600'
                      }`}
                    >
                      {t('bgRadial')}
                    </button>
                  </div>

                  {bgConfig.gradientType === 'linear' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[11px] font-medium ${mutedText}`}>
                          {t('bgAngle')}
                        </span>
                        <span className="text-[11px] font-semibold tabular-nums">
                          {bgConfig.gradientAngle}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={360}
                        value={bgConfig.gradientAngle}
                        onChange={(e) =>
                          onChangeBgConfig({
                            ...bgConfig,
                            gradientAngle: Number(e.target.value),
                          })
                        }
                        className="w-full h-1.5 rounded-lg accent-blue-600 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Background Opacity */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[11px] font-medium ${mutedText}`}>
                    {t('bgOpacity')}
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums">
                    {Math.round(bgConfig.opacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(bgConfig.opacity * 100)}
                  onChange={(e) =>
                    onChangeBgConfig({
                      ...bgConfig,
                      mode:
                        bgConfig.mode === 'grid' || bgConfig.mode === 'lined'
                          ? bgConfig.mode
                          : 'custom',
                      opacity: Number(e.target.value) / 100,
                    })
                  }
                  className="w-full h-1.5 rounded-lg accent-blue-600 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        <hr className={divider} />

        {/* Canvas Dimensions */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs font-medium ${mutedText}`}>{t('canvasSizeTitle')}</span>
            {canvasSize.preset !== 'fullscreen' && (
              <span className={`text-[11px] font-semibold tabular-nums ${mutedText}`}>
                {canvasSize.width}×{canvasSize.height} px
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                { id: 'fullscreen', label: t('sizeFullscreen'), icon: Maximize2 },
                { id: 'square', label: t('sizeSquare'), icon: Square },
                { id: 'landscape', label: t('sizeLandscape'), icon: RectangleHorizontal },
                { id: 'portrait', label: t('sizePortrait'), icon: RectangleVertical },
                { id: 'custom', label: t('sizeCustom'), icon: SlidersHorizontal },
              ] as const
            ).map((opt) => {
              const Icon = opt.icon;
              const selected = canvasSize.preset === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handlePresetClick(opt.id)}
                  className={`min-h-[42px] px-2.5 py-2 rounded-xl flex items-center gap-2 text-xs font-medium transition-colors cursor-pointer ${
                    opt.id === 'custom' ? 'col-span-2' : ''
                  } ${
                    selected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isDarkBg
                        ? 'bg-neutral-800/70 text-neutral-200 hover:bg-neutral-700'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Custom / Editable Width & Height when a fixed artboard is active */}
          {canvasSize.preset !== 'fullscreen' && (
            <div
              className={`p-2.5 rounded-xl border flex items-end gap-1.5 ${
                isDarkBg
                  ? 'bg-neutral-800/40 border-neutral-700/80'
                  : 'bg-slate-50/90 border-slate-200/80'
              }`}
            >
              <label className="flex-1 min-w-0 space-y-1">
                <span className={`block text-[10px] font-medium ${mutedText}`}>
                  {t('sizeWidth')}
                </span>
                <input
                  type="number"
                  min={100}
                  max={6000}
                  value={widthDraft}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setWidthDraft(raw);
                    const parsed = Number(raw);
                    if (Number.isFinite(parsed) && parsed >= 100 && parsed <= 6000) {
                      onChangeCanvasSize(
                        {
                          preset: 'custom',
                          width: Math.round(parsed),
                          height: canvasSize.height,
                        },
                        false
                      );
                    }
                  }}
                  onBlur={() => {
                    const parsed = Number(widthDraft);
                    const nextW = Number.isFinite(parsed)
                      ? clampDim(parsed)
                      : canvasSize.width;
                    setWidthDraft(String(nextW));
                    if (nextW !== canvasSize.width) {
                      onChangeCanvasSize(
                        {
                          preset: 'custom',
                          width: nextW,
                          height: canvasSize.height,
                        },
                        true
                      );
                    }
                  }}
                  className={`w-full min-h-[36px] px-2 rounded-lg border text-xs font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDarkBg
                      ? 'bg-neutral-900 border-neutral-700 text-neutral-100'
                      : 'bg-white border-slate-200 text-slate-900'
                  }`}
                />
              </label>

              <button
                type="button"
                onClick={() =>
                  onChangeCanvasSize(
                    {
                      preset: 'custom',
                      width: canvasSize.height,
                      height: canvasSize.width,
                    },
                    true
                  )
                }
                title="W ↔ H"
                aria-label="Swap dimensions"
                className={`min-h-[36px] w-9 shrink-0 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                  isDarkBg
                    ? 'bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>

              <label className="flex-1 min-w-0 space-y-1">
                <span className={`block text-[10px] font-medium ${mutedText}`}>
                  {t('sizeHeight')}
                </span>
                <input
                  type="number"
                  min={100}
                  max={6000}
                  value={heightDraft}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setHeightDraft(raw);
                    const parsed = Number(raw);
                    if (Number.isFinite(parsed) && parsed >= 100 && parsed <= 6000) {
                      onChangeCanvasSize(
                        {
                          preset: 'custom',
                          width: canvasSize.width,
                          height: Math.round(parsed),
                        },
                        false
                      );
                    }
                  }}
                  onBlur={() => {
                    const parsed = Number(heightDraft);
                    const nextH = Number.isFinite(parsed)
                      ? clampDim(parsed)
                      : canvasSize.height;
                    setHeightDraft(String(nextH));
                    if (nextH !== canvasSize.height) {
                      onChangeCanvasSize(
                        {
                          preset: 'custom',
                          width: canvasSize.width,
                          height: nextH,
                        },
                        true
                      );
                    }
                  }}
                  className={`w-full min-h-[36px] px-2 rounded-lg border text-xs font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDarkBg
                      ? 'bg-neutral-900 border-neutral-700 text-neutral-100'
                      : 'bg-white border-slate-200 text-slate-900'
                  }`}
                />
              </label>
            </div>
          )}
        </div>

        {/* Reset Zoom/Pan */}
        {(zoomPercent !== 100 || canvasSize.preset !== 'fullscreen') && (
          <button
            type="button"
            onClick={onResetView}
            className={`w-full min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
              isDarkBg
                ? 'bg-neutral-800/70 hover:bg-neutral-700 text-neutral-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('resetZoom')}</span>
            </span>
            <span className="tabular-nums font-semibold">{zoomPercent}%</span>
          </button>
        )}

        <hr className={divider} />

        {/* Language Setting */}
        <div className="space-y-2">
          <label
            htmlFor="bestpaint-lang-select"
            className={`flex items-center gap-1.5 text-xs font-medium ${mutedText}`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{t('languageTitle')}</span>
          </label>
          <select
            id="bestpaint-lang-select"
            value={languagePref}
            onChange={(e) => onChangeLanguage(e.target.value as LanguagePreference)}
            className={`w-full min-h-[44px] px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
              isDarkBg
                ? 'bg-neutral-800 border-neutral-700 text-neutral-100'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.value === 'auto' ? t('languageAuto') : opt.label}
              </option>
            ))}
          </select>
        </div>

        <hr className={divider} />

        {/* Help & Interactive Tour */}
        <button
          type="button"
          onClick={onOpenHelp}
          className={`w-full min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            isDarkBg
              ? 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-300'
              : 'bg-sky-50 hover:bg-sky-100 text-sky-700'
          }`}
        >
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span>{t('helpButton')}</span>
        </button>

        {/* Credit Link (...by RitmXoid) + invisible bottom space trigger for offline HTML */}
        <div className="space-y-0.5 pt-1">
          <a
            href="https://ritmxoid.com"
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full min-h-[40px] px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-center transition-colors ${
              isDarkBg
                ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            ...by RitmXoid
          </a>

          {/* Invisible horizontal bottom-margin button (double-tap/double-click to download offline index.html) */}
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={handleSecretAreaClick}
            className="w-full min-h-[44px] bg-transparent text-transparent border-0 outline-none focus:outline-none select-none cursor-default touch-manipulation"
          />
        </div>
      </div>
    </div>
  );
};
