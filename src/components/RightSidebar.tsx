import React, { useRef, useState } from 'react';
import {
  Eraser,
  Eye,
  EyeOff,
  ImagePlus,
  MoreVertical,
  MousePointer2,
  Redo2,
  Shapes,
  Stamp,
  Type,
  Undo2,
} from 'lucide-react';
import { TranslationKey } from '../i18n/translations';
import { ActivePopover, DrawMode } from '../types/paint';

interface RightSidebarProps {
  t: (key: TranslationKey) => string;
  isOpen: boolean;
  onToggleOpen: () => void;
  activePopover: ActivePopover;
  onTogglePopover: (pop: ActivePopover) => void;
  activeMode: DrawMode;
  onSelectMode: (mode: DrawMode) => void;
  onSelectAll: () => void;
  onActivateEraser: () => void;
  onTriggerImageUpload: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isDarkBg: boolean;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  t,
  isOpen,
  onToggleOpen,
  activePopover,
  onTogglePopover,
  activeMode,
  onSelectMode,
  onSelectAll,
  onActivateEraser,
  onTriggerImageUpload,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isDarkBg,
}) => {
  const longPressTimerRef = useRef<number | null>(null);
  const longPressedRef = useRef(false);

  const selectLongPressTimerRef = useRef<number | null>(null);
  const selectLongPressedRef = useRef(false);
  const selectPressStartRef = useRef<{ x: number; y: number } | null>(null);
  const [selectPressing, setSelectPressing] = useState(false);

  const handleUndoPointerDown = () => {
    longPressedRef.current = false;
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = window.setTimeout(() => {
      longPressedRef.current = true;
      if (canRedo) {
        onRedo();
      }
    }, 450);
  };

  const handleUndoPointerUp = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleUndoClick = () => {
    if (longPressedRef.current) {
      longPressedRef.current = false;
      return;
    }
    if (canUndo) {
      onUndo();
    }
  };

  const clearSelectLongPress = () => {
    if (selectLongPressTimerRef.current !== null) {
      window.clearTimeout(selectLongPressTimerRef.current);
      selectLongPressTimerRef.current = null;
    }
    selectPressStartRef.current = null;
    setSelectPressing(false);
  };

  const handleSelectPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    clearSelectLongPress();
    selectLongPressedRef.current = false;
    selectPressStartRef.current = { x: e.clientX, y: e.clientY };
    setSelectPressing(true);
    selectLongPressTimerRef.current = window.setTimeout(() => {
      selectLongPressedRef.current = true;
      selectLongPressTimerRef.current = null;
      setSelectPressing(false);
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(18);
      }
      onSelectAll();
    }, 420);
  };

  const handleSelectPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const start = selectPressStartRef.current;
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) {
      clearSelectLongPress();
    }
  };

  const handleSelectClick = () => {
    if (selectLongPressedRef.current) {
      selectLongPressedRef.current = false;
      return;
    }
    onSelectMode('select');
  };

  const isShapesToolActive = activeMode !== 'eraser';

  const eyeClass = isDarkBg
    ? 'bg-neutral-800/75 hover:bg-neutral-800 text-neutral-200 border-neutral-700/80 shadow-lg shadow-black/30'
    : 'bg-white/75 hover:bg-white text-slate-600 hover:text-slate-900 border-slate-200/80 shadow-md shadow-slate-900/5';

  const barSurface = isDarkBg
    ? 'bg-neutral-900/90 border-neutral-700/80 shadow-2xl shadow-black/50'
    : 'bg-white/92 border-slate-200/90 shadow-xl shadow-slate-900/10';

  const btnBase = isDarkBg
    ? 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900';

  const btnActive = 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white shadow-sm';

  return (
    <>
      {/* 36x36px Floating Eye Trigger in top-right (16px margin) */}
      <button
        type="button"
        onClick={onToggleOpen}
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        aria-label={t('toggleMenu')}
        title={t('toggleMenu')}
        className={`fixed top-4 right-4 z-50 w-9 h-9 rounded-xl border backdrop-blur-md flex items-center justify-center transition-all duration-150 cursor-pointer after:content-[''] after:absolute after:-inset-1.5 ${
          isOpen
            ? isDarkBg
              ? 'bg-neutral-800 text-white border-neutral-600'
              : 'bg-white text-slate-900 border-slate-300'
            : eyeClass
        }`}
      >
        {isOpen ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>

      {/* Right Sidebar Column + Floating Quick-Select Button Directly Underneath */}
      <div
        aria-hidden={!isOpen}
        className={`fixed top-[62px] right-3 sm:right-3.5 z-40 max-h-[calc(100dvh-74px)] flex flex-col items-end gap-2 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen
            ? 'translate-x-0 opacity-100 pointer-events-auto'
            : 'translate-x-[calc(100%+24px)] opacity-0 pointer-events-none'
        }`}
      >
        {/* Compact Vertical Right Sidebar (7 Icon Buttons) */}
        <aside
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className={`flex-1 min-h-0 overflow-y-auto bp-scroll rounded-2xl border backdrop-blur-md p-1.5 flex flex-col items-center gap-1 ${barSurface}`}
        >
          {/* 1. Lines & Shapes */}
          <button
            type="button"
            onClick={() => onTogglePopover('shapes')}
            title={t('toolShapes')}
            aria-label={t('toolShapes')}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
              activePopover === 'shapes' || (isShapesToolActive && activePopover === null)
                ? btnActive
                : btnBase
            }`}
          >
            <Shapes className="w-5 h-5" />
          </button>

          {/* 2. Text Tool */}
          <button
            type="button"
            onClick={() => onTogglePopover('text')}
            title={t('toolText')}
            aria-label={t('toolText')}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
              activePopover === 'text' ? btnActive : btnBase
            }`}
          >
            <Type className="w-5 h-5" />
          </button>

          {/* 3. UI Wireframing Icons / Stamps */}
          <button
            type="button"
            onClick={() => onTogglePopover('stamps')}
            title={t('toolStamps')}
            aria-label={t('toolStamps')}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
              activePopover === 'stamps' ? btnActive : btnBase
            }`}
          >
            <Stamp className="w-5 h-5" />
          </button>

          {/* 4. Image Upload */}
          <button
            type="button"
            onClick={onTriggerImageUpload}
            title={t('toolImage')}
            aria-label={t('toolImage')}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer shrink-0 ${btnBase}`}
          >
            <ImagePlus className="w-5 h-5" />
          </button>

          {/* 5. Eraser */}
          <button
            type="button"
            onClick={onActivateEraser}
            title={t('toolEraser')}
            aria-label={t('toolEraser')}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
              activePopover === 'eraser' || activeMode === 'eraser' ? btnActive : btnBase
            }`}
          >
            <Eraser className="w-5 h-5" />
          </button>

          {/* 6. Undo (tap / long-press redo) + Small Secondary Redo */}
          <div className="w-11 flex flex-col items-center gap-0.5 pt-0.5 pb-0.5 shrink-0">
            <button
              type="button"
              onPointerDown={handleUndoPointerDown}
              onPointerUp={handleUndoPointerUp}
              onPointerLeave={handleUndoPointerUp}
              onPointerCancel={handleUndoPointerUp}
              onClick={handleUndoClick}
              disabled={!canUndo}
              title={t('toolUndo')}
              aria-label={t('toolUndo')}
              className={`w-11 h-9 rounded-xl flex items-center justify-center transition-colors ${
                canUndo
                  ? `${btnBase} cursor-pointer`
                  : 'opacity-30 cursor-not-allowed'
              }`}
            >
              <Undo2 className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              title={t('toolRedo')}
              aria-label={t('toolRedo')}
              className={`w-9 h-6 rounded-lg flex items-center justify-center transition-colors ${
                canRedo
                  ? `${btnBase} cursor-pointer`
                  : 'opacity-25 cursor-not-allowed'
              }`}
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 7. Canvas Actions */}
          <button
            type="button"
            onClick={() => onTogglePopover('actions')}
            title={t('toolActions')}
            aria-label={t('toolActions')}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
              activePopover === 'actions' ? btnActive : btnBase
            }`}
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </aside>

        {/* Floating Quick-Select Button (shown below sidebar whenever any drawing/eraser tool is active; long-tap selects all) */}
        {activeMode !== 'select' && (
          <button
            type="button"
            onPointerDown={handleSelectPointerDown}
            onPointerMove={handleSelectPointerMove}
            onPointerUp={clearSelectLongPress}
            onPointerCancel={clearSelectLongPress}
            onPointerLeave={clearSelectLongPress}
            onTouchStart={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
            onClick={handleSelectClick}
            title={t('selectAllHint')}
            aria-label={t('modeSelect')}
            className={`w-14 h-14 rounded-2xl border backdrop-blur-md flex items-center justify-center shrink-0 transition-transform duration-150 cursor-pointer touch-manipulation ${barSurface} ${
              isDarkBg
                ? 'text-neutral-200 hover:text-white hover:bg-neutral-800/95'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            } ${selectPressing ? 'scale-92 ring-2 ring-blue-500/70' : 'active:scale-95'}`}
          >
            <MousePointer2 className="w-6 h-6" />
          </button>
        )}
      </div>
    </>
  );
};
