import React from 'react';
import { Trash2 } from 'lucide-react';
import { TranslationKey } from '../i18n/translations';

interface EraserPopoverProps {
  t: (key: TranslationKey) => string;
  size: number;
  onChangeSize: (size: number) => void;
  hasSelectedObject: boolean;
  onDeleteSelected: () => void;
  isDarkBg: boolean;
}

export const EraserPopover: React.FC<EraserPopoverProps> = ({
  t,
  size,
  onChangeSize,
  hasSelectedObject,
  onDeleteSelected,
  isDarkBg,
}) => {
  const surface = isDarkBg
    ? 'bg-neutral-900/95 text-neutral-100 border-neutral-700/80 shadow-2xl shadow-black/50'
    : 'bg-white/95 text-slate-900 border-slate-200/90 shadow-xl shadow-slate-900/10';
  const mutedText = isDarkBg ? 'text-neutral-400' : 'text-slate-500';

  const previewDiameter = Math.min(40, Math.max(8, size * 0.6));

  return (
    <div
      className={`fixed top-4 right-[70px] sm:right-[76px] z-40 w-[min(272px,calc(100vw-82px))] rounded-2xl border backdrop-blur-md p-4 space-y-3.5 transition-all duration-150 ${surface}`}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{t('eraserTitle')}</span>
        <span className="text-xs font-semibold tabular-nums">{size}px</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border border-dashed border-slate-400/50">
          <div
            className={`rounded-full border ${
              isDarkBg ? 'border-neutral-300 bg-neutral-700/60' : 'border-slate-500 bg-slate-200/70'
            }`}
            style={{ width: previewDiameter, height: previewDiameter }}
          />
        </div>
        <div className="flex-1 space-y-1">
          <div className={`text-[11px] font-medium ${mutedText}`}>{t('eraserSize')}</div>
          <input
            type="range"
            min={5}
            max={80}
            value={size}
            onChange={(e) => onChangeSize(Number(e.target.value))}
            aria-label={t('eraserSize')}
            className="w-full h-2 rounded-lg accent-blue-600 cursor-pointer"
          />
        </div>
      </div>

      {hasSelectedObject && (
        <button
          type="button"
          onClick={onDeleteSelected}
          className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          <span>{t('deleteSelected')}</span>
        </button>
      )}
    </div>
  );
};
