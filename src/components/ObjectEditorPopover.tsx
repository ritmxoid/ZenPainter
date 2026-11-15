import React, { useRef } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  FlipHorizontal2,
  FlipVertical2,
  Grid3X3,
  Minus,
  Pencil,
  Plus,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { CYRILLIC_LATIN_FONTS, QUICK_COLOR_SWATCHES } from '../constants/fonts';
import { TranslationKey } from '../i18n/translations';
import {
  FillMode,
  FillSettings,
  HatchPattern,
  LinePattern,
  RectGridConfig,
  SelectedObjectInfo,
} from '../types/paint';

interface ObjectEditorPopoverProps {
  t: (key: TranslationKey) => string;
  info: SelectedObjectInfo;
  onUpdateStroke: (patch: {
    color?: string;
    opacity?: number;
    width?: number;
    pattern?: LinePattern;
    doubleLine?: boolean;
  }) => void;
  onUpdateFill: (next: FillSettings) => void;
  onUpdateGrid?: (next: RectGridConfig) => void;
  onUpdateOpacity: (opacity: number) => void;
  onUpdateCornerRadius: (ratio: number) => void;
  onUpdateText: (patch: {
    color?: string;
    fontFamily?: string;
    fontSize?: number;
  }) => void;
  onEnterTextEdit: () => void;
  onFlip: (axis: 'x' | 'y') => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
  isDarkBg: boolean;
}

export const ObjectEditorPopover: React.FC<ObjectEditorPopoverProps> = ({
  t,
  info,
  onUpdateStroke,
  onUpdateFill,
  onUpdateGrid,
  onUpdateOpacity,
  onUpdateCornerRadius,
  onUpdateText,
  onEnterTextEdit,
  onFlip,
  onBringToFront,
  onSendToBack,
  onDuplicate,
  onDelete,
  onClose,
  isDarkBg,
}) => {
  const patternLongPressTimerRef = useRef<number | null>(null);
  const patternLongPressTriggeredRef = useRef(false);
  const patternPressStartRef = useRef<{ x: number; y: number } | null>(null);

  const clearPatternLongPress = () => {
    if (patternLongPressTimerRef.current !== null) {
      window.clearTimeout(patternLongPressTimerRef.current);
      patternLongPressTimerRef.current = null;
    }
    patternPressStartRef.current = null;
  };

  const linePatterns: Array<{ id: LinePattern; labelKey: TranslationKey; dash: string }> = [
    { id: 'solid', labelKey: 'patternSolid', dash: '' },
    { id: 'dashed', labelKey: 'patternDashed', dash: '6 4' },
    { id: 'dotted', labelKey: 'patternDotted', dash: '1.5 4' },
    { id: 'dashdot', labelKey: 'patternDashDot', dash: '7 3 1.5 3' },
  ];

  const fillModes: Array<{ id: FillMode; labelKey: TranslationKey }> = [
    { id: 'none', labelKey: 'fillNone' },
    { id: 'solid', labelKey: 'fillSolid' },
    { id: 'pattern', labelKey: 'fillPattern' },
  ];

  const hatchOptions: Array<{ id: HatchPattern; labelKey: TranslationKey }> = [
    { id: 'diagonal', labelKey: 'hatchDiagonal' },
    { id: 'crosshatch', labelKey: 'hatchCross' },
    { id: 'dots', labelKey: 'hatchDots' },
    { id: 'horizontal', labelKey: 'hatchHorizontal' },
  ];

  const surface = isDarkBg
    ? 'bg-neutral-900/95 text-neutral-100 border-neutral-700/80 shadow-2xl shadow-black/50'
    : 'bg-white/95 text-slate-900 border-slate-200/90 shadow-xl shadow-slate-900/10';
  const mutedText = isDarkBg ? 'text-neutral-400' : 'text-slate-500';
  const divider = isDarkBg ? 'border-neutral-800' : 'border-slate-100';
  const subSurface = isDarkBg ? 'bg-neutral-800/80' : 'bg-slate-100';

  const title =
    info.kind === 'image'
      ? t('imageTitle')
      : info.kind === 'text'
        ? t('textEditTitle')
        : t('shapeTitle');

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className={`fixed top-4 left-3 sm:left-4 z-50 w-[min(324px,calc(100vw-24px))] max-h-[calc(100dvh-90px)] rounded-2xl border backdrop-blur-md flex flex-col overflow-hidden transition-all duration-150 ${surface}`}
    >
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${divider}`}>
        <span className="text-sm font-semibold truncate">{title}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('closeLabel')}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
            isDarkBg ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-slate-100 text-slate-500'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 min-h-0 bp-scroll overflow-y-auto p-4 space-y-4">
        {/* TEXT CONTROLS */}
        {info.kind === 'text' && (
          <>
            <button
              type="button"
              onClick={onEnterTextEdit}
              className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>{t('editTextInline')}</span>
            </button>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${mutedText}`}>{t('textSize')}</span>
                <span className="text-xs font-semibold tabular-nums">
                  {Math.round(info.fontSize)}px
                </span>
              </div>
              <input
                type="range"
                min={12}
                max={120}
                value={Math.round(info.fontSize)}
                onChange={(e) => onUpdateText({ fontSize: Number(e.target.value) })}
                className="w-full h-2 rounded-lg accent-blue-600 cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <span className={`text-xs font-medium block ${mutedText}`}>{t('textColor')}</span>
              <div className="flex items-center gap-2 flex-wrap">
                <label
                  className={`relative w-8 h-8 rounded-lg border overflow-hidden cursor-pointer shrink-0 ${
                    isDarkBg ? 'border-neutral-600' : 'border-slate-300'
                  }`}
                >
                  <input
                    type="color"
                    value={info.textColor}
                    onChange={(e) => onUpdateText({ color: e.target.value })}
                    className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer border-0 p-0"
                  />
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {QUICK_COLOR_SWATCHES.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => onUpdateText({ color: hex })}
                      className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                        info.textColor.toLowerCase() === hex.toLowerCase()
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
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className={`text-xs font-medium block ${mutedText}`}>{t('textFont')}</span>
              <select
                value={info.fontFamily}
                onChange={(e) => onUpdateText({ fontFamily: e.target.value })}
                className={`w-full min-h-[42px] px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                  isDarkBg
                    ? 'bg-neutral-800 border-neutral-700 text-neutral-100'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                {CYRILLIC_LATIN_FONTS.map((f) => (
                  <option key={f.family} value={f.family}>
                    {f.family}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* STROKE / BORDER CONTROLS (Shapes, Lines, Arrows, Paths, Images) */}
        {info.kind !== 'text' && (
          <div className="space-y-3">
            {!info.isSpray && (
              <>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${mutedText}`}>
                    {info.kind === 'image' ? t('photoBorder') : t('strokeWidth')}
                  </span>
                  <span className="text-xs font-semibold tabular-nums">
                    {info.strokeWidth}px
                  </span>
                </div>
                <input
                  type="range"
                  min={
                    info.kind === 'image' ||
                    (info.kind === 'closedShape' && info.fill.mode !== 'none')
                      ? 0
                      : 1
                  }
                  max={info.kind === 'image' ? 24 : 50}
                  value={info.strokeWidth}
                  onChange={(e) => onUpdateStroke({ width: Number(e.target.value) })}
                  className="w-full h-2 rounded-lg accent-blue-600 cursor-pointer"
                />
              </>
            )}

            {(info.kind !== 'image' || info.strokeWidth > 0) && (
              <div className="space-y-1.5">
                {info.isSpray && (
                  <span className={`text-xs font-medium block ${mutedText}`}>
                    {t('strokeColor')}
                  </span>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <label
                    className={`relative w-8 h-8 rounded-lg border overflow-hidden cursor-pointer shrink-0 ${
                      isDarkBg ? 'border-neutral-600' : 'border-slate-300'
                    }`}
                  >
                    <input
                      type="color"
                      value={info.strokeColor}
                      onChange={(e) => onUpdateStroke({ color: e.target.value })}
                      className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer border-0 p-0"
                    />
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {QUICK_COLOR_SWATCHES.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => onUpdateStroke({ color: hex })}
                        className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                          info.strokeColor.toLowerCase() === hex.toLowerCase()
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
                    ))}
                  </div>
                </div>

                {/* Independent Stroke Opacity */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[11px] font-medium ${mutedText}`}>
                      {t('strokeOpacity')}
                    </span>
                    <span className="text-[11px] font-semibold tabular-nums">
                      {Math.round((info.strokeOpacity ?? 1) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round((info.strokeOpacity ?? 1) * 100)}
                    onChange={(e) =>
                      onUpdateStroke({ opacity: Number(e.target.value) / 100 })
                    }
                    className="w-full h-2 rounded-lg accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {info.kind !== 'image' && !info.isSpray && (
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className={`text-[11px] font-medium ${mutedText}`}>
                    {t('linePattern')}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateStroke({ doubleLine: !info.doubleLine })}
                    title={t('doubleLineHint')}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors cursor-pointer ${
                      info.doubleLine
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isDarkBg
                          ? 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                          : 'bg-slate-100 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    ×2 {t('doubleLineBadge')}
                  </button>
                </div>
                <div className={`grid grid-cols-4 gap-1 p-1 rounded-xl ${subSurface}`}>
                  {linePatterns.map((pat) => {
                    const active = info.strokePattern === pat.id;
                    return (
                      <button
                        key={pat.id}
                        type="button"
                        onPointerDown={(e) => {
                          clearPatternLongPress();
                          patternLongPressTriggeredRef.current = false;
                          patternPressStartRef.current = { x: e.clientX, y: e.clientY };
                          patternLongPressTimerRef.current = window.setTimeout(() => {
                            patternLongPressTriggeredRef.current = true;
                            patternLongPressTimerRef.current = null;
                            if (
                              typeof navigator !== 'undefined' &&
                              typeof navigator.vibrate === 'function'
                            ) {
                              navigator.vibrate(16);
                            }
                            onUpdateStroke({
                              pattern: pat.id,
                              doubleLine: !info.doubleLine,
                            });
                          }, 360);
                        }}
                        onPointerMove={(e) => {
                          const st = patternPressStartRef.current;
                          if (st && Math.hypot(e.clientX - st.x, e.clientY - st.y) > 8) {
                            clearPatternLongPress();
                          }
                        }}
                        onPointerUp={clearPatternLongPress}
                        onPointerCancel={clearPatternLongPress}
                        onContextMenu={(e) => e.preventDefault()}
                        onClick={() => {
                          if (patternLongPressTriggeredRef.current) {
                            patternLongPressTriggeredRef.current = false;
                            return;
                          }
                          onUpdateStroke({ pattern: pat.id });
                        }}
                        title={`${t(pat.labelKey)} — ${t('doubleLineHint')}`}
                        className={`min-h-[42px] px-1.5 py-1 rounded-lg flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors cursor-pointer ${
                          active
                            ? isDarkBg
                              ? 'bg-neutral-900 text-white shadow-sm ring-1 ring-blue-500/40'
                              : 'bg-white text-slate-900 shadow-sm ring-1 ring-blue-500/30'
                            : isDarkBg
                              ? 'text-neutral-300 hover:text-white'
                              : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <svg width="26" height="8" viewBox="0 0 26 8" className="overflow-visible">
                          {info.doubleLine ? (
                            <>
                              <line
                                x1="2"
                                y1="2"
                                x2="24"
                                y2="2"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap={pat.id === 'dotted' ? 'round' : 'butt'}
                                strokeDasharray={pat.dash || undefined}
                              />
                              <line
                                x1="2"
                                y1="6"
                                x2="24"
                                y2="6"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap={pat.id === 'dotted' ? 'round' : 'butt'}
                                strokeDasharray={pat.dash || undefined}
                              />
                            </>
                          ) : (
                            <line
                              x1="2"
                              y1="4"
                              x2="24"
                              y2="4"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeDasharray={pat.dash || undefined}
                            />
                          )}
                        </svg>
                        <span className="truncate max-w-full">{t(pat.labelKey)}</span>
                      </button>
                    );
                  })}
                </div>
                <div className={`text-[10px] mt-1 px-0.5 ${mutedText}`}>
                  {t('doubleLineHint')}
                </div>
              </div>
            )}
          </div>
        )}

        {/* FILL CONTROLS (Closed Shapes only) */}
        {info.kind === 'closedShape' && (
          <>
            <hr className={divider} />
            <div className="space-y-3">
              <div className={`text-xs font-medium ${mutedText}`}>{t('sectionFill')}</div>
              <div className={`grid grid-cols-3 gap-1 p-1 rounded-xl ${subSurface}`}>
                {fillModes.map((fm) => {
                  const active = info.fill.mode === fm.id;
                  return (
                    <button
                      key={fm.id}
                      type="button"
                      onClick={() => onUpdateFill({ ...info.fill, mode: fm.id })}
                      className={`min-h-[36px] px-2 rounded-lg text-xs font-medium transition-colors cursor-pointer truncate ${
                        active
                          ? isDarkBg
                            ? 'bg-neutral-900 text-white shadow-sm'
                            : 'bg-white text-slate-900 shadow-sm'
                          : isDarkBg
                            ? 'text-neutral-300 hover:text-white'
                            : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t(fm.labelKey)}
                    </button>
                  );
                })}
              </div>

              {info.fill.mode !== 'none' && (
                <div className="space-y-3 pt-1">
                  {info.fill.mode === 'pattern' && (
                    <div className="grid grid-cols-4 gap-1.5">
                      {hatchOptions.map((h) => {
                        const active = info.fill.hatchPattern === h.id;
                        return (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() =>
                              onUpdateFill({ ...info.fill, hatchPattern: h.id })
                            }
                            className={`min-h-[40px] p-1.5 rounded-xl border text-[10px] font-medium transition-colors cursor-pointer truncate ${
                              active
                                ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                : isDarkBg
                                  ? 'border-neutral-700 bg-neutral-800/50 text-neutral-300 hover:bg-neutral-800'
                                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {t(h.labelKey)}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    <label
                      className={`relative w-8 h-8 rounded-lg border overflow-hidden cursor-pointer shrink-0 ${
                        isDarkBg ? 'border-neutral-600' : 'border-slate-300'
                      }`}
                    >
                      <input
                        type="color"
                        value={info.fill.color}
                        onChange={(e) =>
                          onUpdateFill({ ...info.fill, color: e.target.value })
                        }
                        className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer border-0 p-0"
                      />
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {QUICK_COLOR_SWATCHES.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => onUpdateFill({ ...info.fill, color: hex })}
                          className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                            info.fill.color.toLowerCase() === hex.toLowerCase()
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
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[11px] font-medium ${mutedText}`}>
                        {t('fillOpacity')}
                      </span>
                      <span className="text-[11px] font-semibold tabular-nums">
                        {Math.round(info.fill.opacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(info.fill.opacity * 100)}
                      onChange={(e) =>
                        onUpdateFill({
                          ...info.fill,
                          opacity: Number(e.target.value) / 100,
                        })
                      }
                      className="w-full h-2 rounded-lg accent-blue-600 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Rectangle Grid Settings */}
        {info.isRectEditable && onUpdateGrid && (
          <>
            <hr className={divider} />
            <div className="space-y-2.5">
              <div className={`text-xs font-medium ${mutedText}`}>{t('rectOptionsLabel')}</div>
              <div className={`grid grid-cols-2 gap-1 p-1 rounded-xl ${subSurface}`}>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateGrid({
                      enabled: false,
                      rows: info.gridRows ?? 3,
                      cols: info.gridCols ?? 3,
                    })
                  }
                  className={`min-h-[34px] px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    !info.isGridRect
                      ? isDarkBg
                        ? 'bg-neutral-900 text-white shadow-sm'
                        : 'bg-white text-slate-900 shadow-sm'
                      : isDarkBg
                        ? 'text-neutral-300 hover:text-white'
                        : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>{t('rectPlain')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (info.strokeWidth === 0) {
                      onUpdateStroke({ width: 1 });
                    }
                    onUpdateGrid({
                      enabled: true,
                      rows: Math.max(2, info.gridRows ?? 3),
                      cols: Math.max(2, info.gridCols ?? 3),
                    });
                  }}
                  className={`min-h-[34px] px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    info.isGridRect
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isDarkBg
                        ? 'text-neutral-300 hover:text-white'
                        : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Grid3X3 className="w-3.5 h-3.5" />
                  <span>{t('rectGrid')}</span>
                </button>
              </div>
              {info.isGridRect && (
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className={`rounded-lg p-1.5 border ${
                      isDarkBg ? 'border-neutral-700 bg-neutral-800/60' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className={`text-[10px] font-medium mb-1 text-center ${mutedText}`}>
                      {t('gridRows')}
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateGrid({
                            enabled: true,
                            rows: Math.max(1, (info.gridRows ?? 3) - 1),
                            cols: info.gridCols ?? 3,
                          })
                        }
                        className={`w-7 h-7 rounded-md flex items-center justify-center cursor-pointer ${
                          isDarkBg ? 'bg-neutral-900 hover:bg-neutral-700' : 'bg-white hover:bg-slate-100'
                        }`}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold tabular-nums">{info.gridRows ?? 3}</span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateGrid({
                            enabled: true,
                            rows: Math.min(24, (info.gridRows ?? 3) + 1),
                            cols: info.gridCols ?? 3,
                          })
                        }
                        className={`w-7 h-7 rounded-md flex items-center justify-center cursor-pointer ${
                          isDarkBg ? 'bg-neutral-900 hover:bg-neutral-700' : 'bg-white hover:bg-slate-100'
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div
                    className={`rounded-lg p-1.5 border ${
                      isDarkBg ? 'border-neutral-700 bg-neutral-800/60' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className={`text-[10px] font-medium mb-1 text-center ${mutedText}`}>
                      {t('gridCols')}
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateGrid({
                            enabled: true,
                            rows: info.gridRows ?? 3,
                            cols: Math.max(1, (info.gridCols ?? 3) - 1),
                          })
                        }
                        className={`w-7 h-7 rounded-md flex items-center justify-center cursor-pointer ${
                          isDarkBg ? 'bg-neutral-900 hover:bg-neutral-700' : 'bg-white hover:bg-slate-100'
                        }`}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold tabular-nums">{info.gridCols ?? 3}</span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateGrid({
                            enabled: true,
                            rows: info.gridRows ?? 3,
                            cols: Math.min(24, (info.gridCols ?? 3) + 1),
                          })
                        }
                        className={`w-7 h-7 rounded-md flex items-center justify-center cursor-pointer ${
                          isDarkBg ? 'bg-neutral-900 hover:bg-neutral-700' : 'bg-white hover:bg-slate-100'
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <hr className={divider} />

        {/* Corner Radius (Rectangles, Triangles & Polygons) */}
        {info.cornerRoundRatio !== null && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-medium ${mutedText}`}>
                {t('cornerRadiusLabel')}
              </span>
              <span className="text-xs font-semibold tabular-nums">
                {Math.round(info.cornerRoundRatio * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(info.cornerRoundRatio * 100)}
              onChange={(e) => onUpdateCornerRadius(Number(e.target.value) / 100)}
              className="w-full h-2 rounded-lg accent-amber-500 cursor-pointer"
            />
          </div>
        )}

        {/* Overall Opacity */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-medium ${mutedText}`}>{t('objectOpacity')}</span>
            <span className="text-xs font-semibold tabular-nums">
              {Math.round(info.opacity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            value={Math.round(info.opacity * 100)}
            onChange={(e) => onUpdateOpacity(Number(e.target.value) / 100)}
            className="w-full h-2 rounded-lg accent-blue-600 cursor-pointer"
          />
        </div>

        {/* Flip & Layering Actions */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onFlip('x')}
            className={`min-h-[40px] px-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              isDarkBg
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <FlipHorizontal2 className="w-3.5 h-3.5" />
            <span>{t('flipHorizontal')}</span>
          </button>
          <button
            type="button"
            onClick={() => onFlip('y')}
            className={`min-h-[40px] px-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              isDarkBg
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <FlipVertical2 className="w-3.5 h-3.5" />
            <span>{t('flipVertical')}</span>
          </button>
          <button
            type="button"
            onClick={onBringToFront}
            className={`min-h-[40px] px-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              isDarkBg
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>{t('objFront')}</span>
          </button>
          <button
            type="button"
            onClick={onSendToBack}
            className={`min-h-[40px] px-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              isDarkBg
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>{t('objBack')}</span>
          </button>
        </div>

        {/* Duplicate & Delete */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={onDuplicate}
            className={`min-h-[42px] px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              isDarkBg
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{t('objDuplicate')}</span>
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="min-h-[42px] px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t('objDelete')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
