import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Circle,
  Droplets,
  Grid3X3,
  Image as ImageIcon,
  Magnet,
  Minus,
  MousePointer2,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Spline,
  Square,
  Triangle,
  X,
} from 'lucide-react';
import { QUICK_COLOR_SWATCHES } from '../constants/fonts';
import { TranslationKey } from '../i18n/translations';
import {
  ArrowVariant,
  BrushType,
  DrawMode,
  FillMode,
  FillSettings,
  HatchPattern,
  LinePattern,
  PolygonVariant,
  RectGridConfig,
  SelectedObjectInfo,
  StrokeSettings,
} from '../types/paint';
import { buildPolygonPoints, downscaleImageFileToDataUrl } from '../utils/canvasHelpers';

interface ShapesPopoverProps {
  t: (key: TranslationKey) => string;
  activeMode: DrawMode;
  onSelectMode: (mode: DrawMode) => void;
  rectGrid: RectGridConfig;
  onChangeRectGrid: (next: RectGridConfig) => void;
  onUpdateSelectedGrid?: (next: RectGridConfig) => void;
  polygonVariant: PolygonVariant;
  onSelectPolygonVariant: (variant: PolygonVariant) => void;
  arrowVariant: ArrowVariant;
  onSelectArrowVariant: (variant: ArrowVariant) => void;
  closedContour: boolean;
  onToggleClosedContour: (next: boolean) => void;
  snapEnabled: boolean;
  onToggleSnapEnabled: (next: boolean) => void;
  stroke: StrokeSettings;
  onChangeStroke: (next: StrokeSettings) => void;
  fill: FillSettings;
  onChangeFill: (next: FillSettings) => void;
  selectedInfo?: SelectedObjectInfo | null;
  onUpdateSelectedStroke?: (patch: {
    color?: string;
    opacity?: number;
    width?: number;
    pattern?: LinePattern;
    doubleLine?: boolean;
    brushType?: BrushType;
  }) => void;
  onUpdateSelectedFill?: (nextFill: FillSettings) => void;
  onUpdateSelectedOpacity?: (opacity: number) => void;
  onUpdateSelectedCornerRadius?: (ratio: number) => void;
  onToggleSelectedClosedContour?: (next: boolean) => void;
  onMorphSelectedPolygon?: (variant: PolygonVariant) => void;
  onMorphSelectedArrow?: (variant: ArrowVariant) => void;
  onClearSelection?: () => void;
  isDarkBg: boolean;
}

const CLOSED_SHAPE_MODES: DrawMode[] = ['ellipse', 'rect', 'triangle', 'star'];

const POLYGON_VARIANTS: Array<{ id: PolygonVariant; labelKey: TranslationKey }> = [
  { id: 'star5', labelKey: 'polyStar5' },
  { id: 'star4', labelKey: 'polyStar4' },
  { id: 'star6', labelKey: 'polyStar6' },
  { id: 'star8', labelKey: 'polyStar8' },
  { id: 'diamond', labelKey: 'polyDiamond' },
  { id: 'pentagon', labelKey: 'polyPentagon' },
  { id: 'hexagon', labelKey: 'polyHexagon' },
  { id: 'octagon', labelKey: 'polyOctagon' },
  { id: 'trapezoid', labelKey: 'polyTrapezoid' },
  { id: 'parallelogram', labelKey: 'polyParallelogram' },
  { id: 'cross', labelKey: 'polyCross' },
  { id: 'tagArrow', labelKey: 'polyTagArrow' },
];

const PolygonMiniIcon: React.FC<{ variant: PolygonVariant; className?: string }> = ({
  variant,
  className = 'w-4 h-4',
}) => {
  const pts = buildPolygonPoints(variant, 12, 12, 8.6, 8.6)
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <polygon points={pts} />
    </svg>
  );
};

const ARROW_VARIANTS: Array<{ id: ArrowVariant; labelKey: TranslationKey }> = [
  { id: 'single', labelKey: 'arrowSingle' },
  { id: 'double', labelKey: 'arrowDouble' },
  { id: 'filled', labelKey: 'arrowFilled' },
  { id: 'filledDouble', labelKey: 'arrowFilledDouble' },
  { id: 'open', labelKey: 'arrowOpen' },
  { id: 'openDouble', labelKey: 'arrowOpenDouble' },
  { id: 'circleTail', labelKey: 'arrowCircleTail' },
  { id: 'barTail', labelKey: 'arrowBarTail' },
];

const ArrowMiniIcon: React.FC<{ variant: ArrowVariant; className?: string }> = ({
  variant,
  className = 'w-4 h-4',
}) => {
  switch (variant) {
    case 'double':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="7" y1="12" x2="17" y2="12" />
          <polygon points="15,8 20.5,12 15,16" fill="currentColor" stroke="none" />
          <polygon points="9,8 3.5,12 9,16" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'filled':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
          <polygon points="3.5,9.5 13.5,9.5 13.5,6.2 20.5,12 13.5,17.8 13.5,14.5 3.5,14.5" fill="currentColor" fillOpacity="0.28" />
        </svg>
      );
    case 'filledDouble':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
          <polygon points="3.2,12 8.8,6.5 8.8,9.5 15.2,9.5 15.2,6.5 20.8,12 15.2,17.5 15.2,14.5 8.8,14.5 8.8,17.5" fill="currentColor" fillOpacity="0.28" />
        </svg>
      );
    case 'open':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="12" x2="19.5" y2="12" />
          <polyline points="14.5,7.2 20,12 14.5,16.8" />
        </svg>
      );
    case 'openDouble':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4.5" y1="12" x2="19.5" y2="12" />
          <polyline points="9,7.5 4,12 9,16.5" />
          <polyline points="15,7.5 20,12 15,16.5" />
        </svg>
      );
    case 'circleTail':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="5.8" cy="12" r="2.3" fill="currentColor" stroke="none" />
          <line x1="7" y1="12" x2="17" y2="12" />
          <polygon points="15,8 20.5,12 15,16" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'barTail':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4.5" y1="7" x2="4.5" y2="17" />
          <line x1="4.5" y1="12" x2="17" y2="12" />
          <polygon points="15,8 20.5,12 15,16" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'single':
    default:
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="12" x2="17" y2="12" />
          <polygon points="15,7.8 20.5,12 15,16.2" fill="currentColor" stroke="none" />
        </svg>
      );
  }
};

export const ShapesPopover: React.FC<ShapesPopoverProps> = ({
  t,
  activeMode,
  onSelectMode,
  rectGrid,
  onChangeRectGrid,
  onUpdateSelectedGrid,
  polygonVariant,
  onSelectPolygonVariant,
  arrowVariant,
  onSelectArrowVariant,
  closedContour,
  onToggleClosedContour,
  snapEnabled,
  onToggleSnapEnabled,
  stroke,
  onChangeStroke,
  fill,
  onChangeFill,
  selectedInfo,
  onUpdateSelectedStroke,
  onUpdateSelectedFill,
  onUpdateSelectedOpacity,
  onUpdateSelectedCornerRadius,
  onToggleSelectedClosedContour,
  onMorphSelectedPolygon,
  onMorphSelectedArrow,
  onClearSelection,
  isDarkBg,
}) => {
  const isEditingSelection = Boolean(selectedInfo);
  const [rectExpanded, setRectExpanded] = useState(
    activeMode === 'rect' || Boolean(selectedInfo?.isGridRect)
  );
  const [polygonsExpanded, setPolygonsExpanded] = useState(
    activeMode === 'star' || Boolean(selectedInfo?.isPolygonMorphable)
  );
  const [arrowsExpanded, setArrowsExpanded] = useState(
    activeMode === 'arrow' || Boolean(selectedInfo?.isArrowMorphable)
  );
  const patternLongPressTimerRef = useRef<number | null>(null);
  const patternLongPressTriggeredRef = useRef(false);
  const patternPressStartRef = useRef<{ x: number; y: number } | null>(null);
  const fillPhotoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (selectedInfo?.isPolygonMorphable) {
      setPolygonsExpanded(true);
      setArrowsExpanded(false);
      setRectExpanded(false);
    } else if (selectedInfo?.isArrowMorphable) {
      setArrowsExpanded(true);
      setPolygonsExpanded(false);
      setRectExpanded(false);
    } else if (selectedInfo?.isGridRect) {
      setRectExpanded(true);
      setPolygonsExpanded(false);
      setArrowsExpanded(false);
    }
  }, [
    selectedInfo?.isPolygonMorphable,
    selectedInfo?.isArrowMorphable,
    selectedInfo?.isGridRect,
  ]);

  const clearPatternLongPress = () => {
    if (patternLongPressTimerRef.current !== null) {
      window.clearTimeout(patternLongPressTimerRef.current);
      patternLongPressTimerRef.current = null;
    }
    patternPressStartRef.current = null;
  };

  const brushTypes: Array<{
    id: BrushType;
    labelKey: TranslationKey;
    icon: React.ReactNode;
  }> = [
    { id: 'standard', labelKey: 'brushStandard', icon: <Pencil className="w-3.5 h-3.5" /> },
    { id: 'soft', labelKey: 'brushSoft', icon: <Droplets className="w-3.5 h-3.5" /> },
    { id: 'spray', labelKey: 'brushSpray', icon: <Sparkles className="w-3.5 h-3.5" /> },
  ];

  const activePolyId =
    isEditingSelection && selectedInfo?.isPolygonMorphable && selectedInfo.polygonVariant
      ? selectedInfo.polygonVariant
      : polygonVariant;
  const activeVariantMeta =
    POLYGON_VARIANTS.find((v) => v.id === activePolyId) || POLYGON_VARIANTS[0];

  const activeArrowId: ArrowVariant =
    isEditingSelection && selectedInfo?.isArrowMorphable && selectedInfo.arrowVariant
      ? selectedInfo.arrowVariant
      : arrowVariant;
  const activeArrowMeta =
    ARROW_VARIANTS.find((v) => v.id === activeArrowId) || ARROW_VARIANTS[0];

  const displayRectGrid: RectGridConfig =
    isEditingSelection && selectedInfo?.isRectEditable
      ? {
          enabled: Boolean(selectedInfo.isGridRect),
          rows: selectedInfo.gridRows ?? rectGrid.rows,
          cols: selectedInfo.gridCols ?? rectGrid.cols,
        }
      : rectGrid;

  const modeOptions: Array<{
    id: DrawMode;
    labelKey: TranslationKey;
    icon: React.ReactNode;
  }> = [
    { id: 'select', labelKey: 'modeSelect', icon: <MousePointer2 className="w-4 h-4" /> },
    { id: 'brush', labelKey: 'modeBrush', icon: <Pencil className="w-4 h-4" /> },
    { id: 'line', labelKey: 'modeLine', icon: <Minus className="w-4 h-4" /> },
    { id: 'bezier', labelKey: 'modeBezier', icon: <Spline className="w-4 h-4" /> },
    { id: 'ellipse', labelKey: 'modeEllipse', icon: <Circle className="w-4 h-4" /> },
    {
      id: 'rect',
      labelKey:
        (activeMode === 'rect' || (isEditingSelection && selectedInfo?.isRectEditable)) &&
        displayRectGrid.enabled
          ? 'rectGrid'
          : 'modeRect',
      icon: displayRectGrid.enabled ? (
        <Grid3X3 className="w-4 h-4" />
      ) : (
        <Square className="w-4 h-4" />
      ),
    },
    { id: 'triangle', labelKey: 'modeTriangle', icon: <Triangle className="w-4 h-4" /> },
    {
      id: 'star',
      labelKey:
        activeMode === 'star' || (isEditingSelection && selectedInfo?.isPolygonMorphable)
          ? activeVariantMeta.labelKey
          : 'modeStar',
      icon: <PolygonMiniIcon variant={activePolyId} />,
    },
    {
      id: 'arrow',
      labelKey:
        activeMode === 'arrow' || (isEditingSelection && selectedInfo?.isArrowMorphable)
          ? activeArrowMeta.labelKey
          : 'modeArrow',
      icon: <ArrowMiniIcon variant={activeArrowId} />,
    },
  ];

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
    { id: 'photo', labelKey: 'fillPhoto' },
  ];

  const hatchOptions: Array<{ id: HatchPattern; labelKey: TranslationKey }> = [
    { id: 'diagonal', labelKey: 'hatchDiagonal' },
    { id: 'crosshatch', labelKey: 'hatchCross' },
    { id: 'dots', labelKey: 'hatchDots' },
    { id: 'horizontal', labelKey: 'hatchHorizontal' },
  ];

  const displayStroke: StrokeSettings = isEditingSelection
    ? {
        color: selectedInfo!.strokeColor,
        opacity: selectedInfo!.strokeOpacity ?? 1,
        width: selectedInfo!.strokeWidth,
        pattern: selectedInfo!.strokePattern,
        doubleLine: selectedInfo!.doubleLine,
        brushType: selectedInfo!.brushType ?? stroke.brushType,
      }
    : stroke;

  const displayFill: FillSettings =
    isEditingSelection && selectedInfo?.kind === 'closedShape'
      ? selectedInfo.fill
      : fill;

  const applyStrokeUpdate = (patch: Partial<StrokeSettings>) => {
    onChangeStroke({ ...stroke, ...patch });
    if (isEditingSelection) {
      onUpdateSelectedStroke?.({
        color: patch.color,
        opacity: patch.opacity,
        width: patch.width,
        pattern: patch.pattern,
        doubleLine: patch.doubleLine,
        brushType: patch.brushType,
      });
    }
  };

  const applyFillUpdate = (nextFill: FillSettings) => {
    onChangeFill(nextFill);
    if (nextFill.mode === 'none' && stroke.width === 0) {
      onChangeStroke({ ...stroke, width: 1 });
    }
    if (isEditingSelection && selectedInfo?.kind === 'closedShape') {
      onUpdateSelectedFill?.(nextFill);
    }
  };

  const applyRectGridUpdate = (nextGrid: RectGridConfig) => {
    const clamped: RectGridConfig = {
      enabled: nextGrid.enabled,
      rows: Math.max(1, Math.min(24, Math.round(nextGrid.rows))),
      cols: Math.max(1, Math.min(24, Math.round(nextGrid.cols))),
    };
    onChangeRectGrid(clamped);
    if (clamped.enabled && displayStroke.width === 0) {
      applyStrokeUpdate({ width: 1 });
    }
    if (isEditingSelection && selectedInfo?.isRectEditable) {
      onUpdateSelectedGrid?.(clamped);
    }
  };

  const canCloseContour =
    activeMode === 'line' ||
    activeMode === 'bezier' ||
    (activeMode === 'brush' && stroke.brushType !== 'spray') ||
    Boolean(isEditingSelection && selectedInfo?.canToggleClosedContour);
  const displayClosedContour =
    isEditingSelection && selectedInfo?.canToggleClosedContour
      ? Boolean(selectedInfo.isClosedContour)
      : closedContour;
  const canSnapEndpoints =
    activeMode === 'line' || activeMode === 'bezier' || activeMode === 'select';
  const isFilledArrowActive =
    (activeMode === 'arrow' &&
      (arrowVariant === 'filled' || arrowVariant === 'filledDouble')) ||
    Boolean(
      isEditingSelection &&
        selectedInfo?.isArrowMorphable &&
        (selectedInfo.arrowVariant === 'filled' ||
          selectedInfo.arrowVariant === 'filledDouble')
    );
  const isClosedShape =
    CLOSED_SHAPE_MODES.includes(activeMode) ||
    isFilledArrowActive ||
    (canCloseContour && displayClosedContour) ||
    Boolean(isEditingSelection && selectedInfo?.kind === 'closedShape');
  const canZeroStroke =
    selectedInfo?.kind === 'image' ||
    (isClosedShape && displayFill.mode !== 'none');
  const showBrushTypes =
    activeMode === 'brush' ||
    Boolean(
      isEditingSelection &&
        selectedInfo?.brushType &&
        selectedInfo.brushType !== 'spray'
    );

  const surface = isDarkBg
    ? 'bg-neutral-900/95 text-neutral-100 border-neutral-700/80 shadow-2xl shadow-black/50'
    : 'bg-white/95 text-slate-900 border-slate-200/90 shadow-xl shadow-slate-900/10';
  const mutedText = isDarkBg ? 'text-neutral-400' : 'text-slate-500';
  const divider = isDarkBg ? 'border-neutral-800' : 'border-slate-100';
  const subSurface = isDarkBg ? 'bg-neutral-800/80' : 'bg-slate-100';

  return (
    <div
      className={`fixed top-4 right-[70px] sm:right-[76px] z-40 w-[min(336px,calc(100vw-82px))] max-h-[calc(100dvh-32px)] rounded-2xl border backdrop-blur-md flex flex-col overflow-hidden transition-all duration-150 ${surface}`}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="flex-1 min-h-0 bp-scroll overflow-y-auto p-4 space-y-4">
        {/* Live Selected Object Banner */}
        {isEditingSelection && selectedInfo && (
          <div
            className={`px-2.5 py-1.5 rounded-xl border flex items-center justify-between gap-2 text-xs font-semibold ${
              isDarkBg
                ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              <span className="truncate">
                {t('editObject')}
                {selectedInfo.selectionCount && selectedInfo.selectionCount > 1
                  ? ` (${selectedInfo.selectionCount})`
                  : ''}
              </span>
            </div>
            {onClearSelection && (
              <button
                type="button"
                onClick={onClearSelection}
                aria-label={t('clearSelection')}
                className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-blue-500/20 cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Mode Selector */}
        <div>
          <div className={`text-xs font-medium mb-2 ${mutedText}`}>{t('sectionMode')}</div>
          <div className="grid grid-cols-3 gap-1.5">
            {modeOptions.map((item) => {
              const active = activeMode === item.id;
              const isRectItem = item.id === 'rect';
              const isStarItem = item.id === 'star';
              const isArrowItem = item.id === 'arrow';
              const hasSubMenu = isRectItem || isStarItem || isArrowItem;
              const isExpanded = isRectItem
                ? rectExpanded
                : isStarItem
                  ? polygonsExpanded
                  : isArrowItem
                    ? arrowsExpanded
                    : false;

              const toggleSubMenu = () => {
                if (isRectItem) {
                  setRectExpanded((prev) => !prev);
                  setPolygonsExpanded(false);
                  setArrowsExpanded(false);
                } else if (isStarItem) {
                  setPolygonsExpanded((prev) => !prev);
                  setRectExpanded(false);
                  setArrowsExpanded(false);
                } else if (isArrowItem) {
                  setArrowsExpanded((prev) => !prev);
                  setRectExpanded(false);
                  setPolygonsExpanded(false);
                }
              };

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (isRectItem) {
                      if (isEditingSelection && selectedInfo?.isRectEditable) {
                        toggleSubMenu();
                      } else if (activeMode !== 'rect') {
                        onSelectMode('rect');
                        setRectExpanded(true);
                        setPolygonsExpanded(false);
                        setArrowsExpanded(false);
                      } else {
                        toggleSubMenu();
                      }
                    } else if (isStarItem) {
                      if (isEditingSelection && selectedInfo?.isPolygonMorphable) {
                        toggleSubMenu();
                      } else if (activeMode !== 'star') {
                        onSelectMode('star');
                        setPolygonsExpanded(true);
                        setRectExpanded(false);
                        setArrowsExpanded(false);
                      } else {
                        toggleSubMenu();
                      }
                    } else if (isArrowItem) {
                      const isBlockVariant =
                        arrowVariant === 'filled' || arrowVariant === 'filledDouble';
                      if (
                        stroke.width === 0 &&
                        !(isBlockVariant && fill.mode !== 'none')
                      ) {
                        onChangeStroke({ ...stroke, width: 1 });
                      }
                      if (isEditingSelection && selectedInfo?.isArrowMorphable) {
                        toggleSubMenu();
                      } else if (activeMode !== 'arrow') {
                        onSelectMode('arrow');
                        setArrowsExpanded(true);
                        setRectExpanded(false);
                        setPolygonsExpanded(false);
                      } else {
                        toggleSubMenu();
                      }
                    } else {
                      setRectExpanded(false);
                      setPolygonsExpanded(false);
                      setArrowsExpanded(false);
                      const supportsClosedWithFill =
                        CLOSED_SHAPE_MODES.includes(item.id) ||
                        (closedContour &&
                          (item.id === 'line' ||
                            item.id === 'bezier' ||
                            (item.id === 'brush' && stroke.brushType !== 'spray')));
                      if (
                        stroke.width === 0 &&
                        !(supportsClosedWithFill && fill.mode !== 'none')
                      ) {
                        onChangeStroke({ ...stroke, width: 1 });
                      }
                      onSelectMode(item.id);
                    }
                  }}
                  className={`relative min-h-[44px] px-2 py-1.5 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isDarkBg
                        ? 'bg-neutral-800/70 text-neutral-200 hover:bg-neutral-700'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.icon}
                  <span className="truncate max-w-full leading-tight">{t(item.labelKey)}</span>
                  {hasSubMenu && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSubMenu();
                      }}
                      className="absolute top-1 right-1 p-0.5 rounded hover:bg-black/10"
                    >
                      <ChevronDown
                        className={`w-3 h-3 opacity-75 transition-transform duration-150 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Expandable Sub-Panel for Rectangle / Grid */}
          {rectExpanded && (
            <div
              className={`mt-2.5 p-2.5 rounded-xl border ${
                isDarkBg
                  ? 'border-neutral-700/80 bg-neutral-800/60'
                  : 'border-slate-200/80 bg-slate-50/90'
              }`}
            >
              <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 px-0.5 ${mutedText}`}>
                {t('rectOptionsLabel')}
              </div>
              <div className={`grid grid-cols-2 gap-1 p-1 rounded-xl ${subSurface}`}>
                <button
                  type="button"
                  onClick={() => applyRectGridUpdate({ ...displayRectGrid, enabled: false })}
                  className={`min-h-[34px] px-2 py-1 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
                    !displayRectGrid.enabled
                      ? isDarkBg
                        ? 'bg-neutral-900 text-white shadow-sm'
                        : 'bg-white text-slate-900 shadow-sm'
                      : isDarkBg
                        ? 'text-neutral-300 hover:text-white'
                        : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Square className="w-3.5 h-3.5" />
                  <span className="truncate">{t('rectPlain')}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyRectGridUpdate({
                      enabled: true,
                      rows: Math.max(2, displayRectGrid.rows || 3),
                      cols: Math.max(2, displayRectGrid.cols || 3),
                    })
                  }
                  className={`min-h-[34px] px-2 py-1 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
                    displayRectGrid.enabled
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isDarkBg
                        ? 'text-neutral-300 hover:text-white'
                        : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Grid3X3 className="w-3.5 h-3.5" />
                  <span className="truncate">{t('rectGrid')}</span>
                </button>
              </div>

              {displayRectGrid.enabled && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div
                    className={`rounded-lg p-1.5 border ${
                      isDarkBg
                        ? 'border-neutral-700 bg-neutral-900/60'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className={`text-[10px] font-medium mb-1 text-center ${mutedText}`}>
                      {t('gridRows')}
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        aria-label={`${t('gridRows')} -`}
                        onClick={() =>
                          applyRectGridUpdate({
                            ...displayRectGrid,
                            rows: Math.max(1, displayRectGrid.rows - 1),
                          })
                        }
                        className={`w-7 h-7 rounded-md flex items-center justify-center cursor-pointer transition-colors ${
                          isDarkBg
                            ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold tabular-nums min-w-[22px] text-center">
                        {displayRectGrid.rows}
                      </span>
                      <button
                        type="button"
                        aria-label={`${t('gridRows')} +`}
                        onClick={() =>
                          applyRectGridUpdate({
                            ...displayRectGrid,
                            rows: Math.min(24, displayRectGrid.rows + 1),
                          })
                        }
                        className={`w-7 h-7 rounded-md flex items-center justify-center cursor-pointer transition-colors ${
                          isDarkBg
                            ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div
                    className={`rounded-lg p-1.5 border ${
                      isDarkBg
                        ? 'border-neutral-700 bg-neutral-900/60'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className={`text-[10px] font-medium mb-1 text-center ${mutedText}`}>
                      {t('gridCols')}
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        aria-label={`${t('gridCols')} -`}
                        onClick={() =>
                          applyRectGridUpdate({
                            ...displayRectGrid,
                            cols: Math.max(1, displayRectGrid.cols - 1),
                          })
                        }
                        className={`w-7 h-7 rounded-md flex items-center justify-center cursor-pointer transition-colors ${
                          isDarkBg
                            ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold tabular-nums min-w-[22px] text-center">
                        {displayRectGrid.cols}
                      </span>
                      <button
                        type="button"
                        aria-label={`${t('gridCols')} +`}
                        onClick={() =>
                          applyRectGridUpdate({
                            ...displayRectGrid,
                            cols: Math.min(24, displayRectGrid.cols + 1),
                          })
                        }
                        className={`w-7 h-7 rounded-md flex items-center justify-center cursor-pointer transition-colors ${
                          isDarkBg
                            ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Expandable Sub-Buttons for Polygons & Diverse Stars */}
          {polygonsExpanded && (
            <div
              className={`mt-2.5 p-2 rounded-xl border ${
                isDarkBg
                  ? 'border-neutral-700/80 bg-neutral-800/60'
                  : 'border-slate-200/80 bg-slate-50/90'
              }`}
            >
              <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 px-0.5 ${mutedText}`}>
                {t('moreShapesLabel')}
              </div>
              <div className="grid grid-cols-4 gap-1">
                {POLYGON_VARIANTS.map((variant) => {
                  const selected =
                    isEditingSelection && selectedInfo?.isPolygonMorphable
                      ? selectedInfo.polygonVariant === variant.id
                      : activeMode === 'star' && polygonVariant === variant.id;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => {
                        onSelectPolygonVariant(variant.id);
                        if (
                          isEditingSelection &&
                          selectedInfo?.isPolygonMorphable &&
                          onMorphSelectedPolygon
                        ) {
                          onMorphSelectedPolygon(variant.id);
                        } else {
                          onSelectMode('star');
                        }
                      }}
                      title={t(variant.labelKey)}
                      className={`min-h-[44px] px-1 py-1.5 rounded-lg flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-all cursor-pointer ${
                        selected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : isDarkBg
                            ? 'bg-neutral-900/70 text-neutral-200 hover:bg-neutral-700'
                            : 'bg-white text-slate-700 hover:bg-blue-50 border border-slate-200/60'
                      }`}
                    >
                      <PolygonMiniIcon variant={variant.id} className="w-4 h-4 shrink-0" />
                      <span className="truncate max-w-full leading-tight">
                        {t(variant.labelKey)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Expandable Sub-Buttons for Arrow Styles */}
          {arrowsExpanded && (
            <div
              className={`mt-2.5 p-2 rounded-xl border ${
                isDarkBg
                  ? 'border-neutral-700/80 bg-neutral-800/60'
                  : 'border-slate-200/80 bg-slate-50/90'
              }`}
            >
              <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 px-0.5 ${mutedText}`}>
                {t('arrowStylesLabel')}
              </div>
              <div className="grid grid-cols-4 gap-1">
                {ARROW_VARIANTS.map((variant) => {
                  const selected =
                    isEditingSelection && selectedInfo?.isArrowMorphable
                      ? selectedInfo.arrowVariant === variant.id
                      : activeMode === 'arrow' && arrowVariant === variant.id;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => {
                        const isBlockVariant =
                          variant.id === 'filled' || variant.id === 'filledDouble';
                        onSelectArrowVariant(variant.id);
                        if (isBlockVariant && fill.mode === 'none' && !isEditingSelection) {
                          onChangeFill({ ...fill, mode: 'solid' });
                        } else if (!isBlockVariant && stroke.width === 0 && !isEditingSelection) {
                          onChangeStroke({ ...stroke, width: 2 });
                        }
                        if (
                          isEditingSelection &&
                          selectedInfo?.isArrowMorphable &&
                          onMorphSelectedArrow
                        ) {
                          onMorphSelectedArrow(variant.id);
                        } else {
                          onSelectMode('arrow');
                        }
                      }}
                      title={t(variant.labelKey)}
                      className={`min-h-[44px] px-1 py-1.5 rounded-lg flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-all cursor-pointer ${
                        selected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : isDarkBg
                            ? 'bg-neutral-900/70 text-neutral-200 hover:bg-neutral-700'
                            : 'bg-white text-slate-700 hover:bg-blue-50 border border-slate-200/60'
                      }`}
                    >
                      <ArrowMiniIcon variant={variant.id} className="w-4 h-4 shrink-0" />
                      <span className="truncate max-w-full leading-tight">
                        {t(variant.labelKey)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Brush Type Selector (Standard / Soft Edge / Spray) */}
          {showBrushTypes && (
            <div className="mt-2.5">
              <div className={`text-[11px] font-medium mb-1.5 ${mutedText}`}>
                {t('brushTypeLabel')}
              </div>
              <div
                className={`grid gap-1 p-1 rounded-xl ${subSurface} ${
                  isEditingSelection ? 'grid-cols-2' : 'grid-cols-3'
                }`}
              >
                {(isEditingSelection
                  ? brushTypes.filter((b) => b.id !== 'spray')
                  : brushTypes
                ).map((bt) => {
                  const active = displayStroke.brushType === bt.id;
                  return (
                    <button
                      key={bt.id}
                      type="button"
                      onClick={() =>
                        applyStrokeUpdate(
                          bt.id === 'spray' && displayStroke.width === 0
                            ? { brushType: bt.id, width: 1 }
                            : { brushType: bt.id }
                        )
                      }
                      className={`min-h-[40px] px-1.5 py-1 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
                        active
                          ? isDarkBg
                            ? 'bg-neutral-900 text-white shadow-sm'
                            : 'bg-white text-slate-900 shadow-sm'
                          : isDarkBg
                            ? 'text-neutral-300 hover:text-white'
                            : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {bt.icon}
                      <span className="truncate">{t(bt.labelKey)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Closed Contour & Endpoint Snapping Toggles */}
          {(canCloseContour || canSnapEndpoints) && (
            <div className="mt-2.5 flex items-center gap-1.5">
              {canCloseContour && (
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !displayClosedContour;
                    if (!nextVal && stroke.width === 0) {
                      onChangeStroke({ ...stroke, width: 1 });
                    }
                    if (
                      isEditingSelection &&
                      selectedInfo?.canToggleClosedContour &&
                      onToggleSelectedClosedContour
                    ) {
                      onToggleSelectedClosedContour(nextVal);
                    } else {
                      onToggleClosedContour(nextVal);
                    }
                  }}
                  className={`flex-1 min-h-[38px] px-2.5 py-1.5 rounded-xl border text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    displayClosedContour
                      ? 'border-blue-500 bg-blue-600 text-white shadow-sm'
                      : isDarkBg
                        ? 'border-neutral-700 bg-neutral-800/70 text-neutral-300 hover:bg-neutral-800'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{t('closedContourLabel')}</span>
                </button>
              )}
              {canSnapEndpoints && (
                <button
                  type="button"
                  onClick={() => onToggleSnapEnabled(!snapEnabled)}
                  className={`flex-1 min-h-[38px] px-2.5 py-1.5 rounded-xl border text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    snapEnabled
                      ? 'border-emerald-500/80 bg-emerald-600 text-white shadow-sm'
                      : isDarkBg
                        ? 'border-neutral-700 bg-neutral-800/70 text-neutral-300 hover:bg-neutral-800'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Magnet className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{t('snapEndpointsLabel')}</span>
                </button>
              )}
            </div>
          )}
        </div>

        <hr className={divider} />

        {/* Stroke Settings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${mutedText}`}>
              {selectedInfo?.kind === 'image' ? t('photoBorder') : t('sectionStroke')}
            </span>
            <span className="text-xs font-semibold tabular-nums">{displayStroke.width}px</span>
          </div>

          <input
            type="range"
            min={canZeroStroke ? 0 : 1}
            max={50}
            value={canZeroStroke ? displayStroke.width : Math.max(1, displayStroke.width)}
            onChange={(e) => applyStrokeUpdate({ width: Number(e.target.value) })}
            aria-label={t('strokeWidth')}
            className="w-full h-2 rounded-lg accent-blue-600 cursor-pointer"
          />

          {/* Stroke Color Picker + 8 Swatches */}
          <div className="flex items-center gap-2 flex-wrap">
            <label
              className={`relative w-8 h-8 rounded-lg border overflow-hidden cursor-pointer shrink-0 ${
                isDarkBg ? 'border-neutral-600' : 'border-slate-300'
              }`}
              title={t('strokeColor')}
            >
              <input
                type="color"
                value={displayStroke.color}
                onChange={(e) => applyStrokeUpdate({ color: e.target.value })}
                className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer border-0 p-0"
              />
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {QUICK_COLOR_SWATCHES.map((hex) => {
                const selected = displayStroke.color.toLowerCase() === hex.toLowerCase();
                return (
                  <button
                    key={hex}
                    type="button"
                    aria-label={hex}
                    onClick={() => applyStrokeUpdate({ color: hex })}
                    className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
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

          {/* Stroke Opacity */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[11px] font-medium ${mutedText}`}>
                {t('strokeOpacity')}
              </span>
              <span className="text-[11px] font-semibold tabular-nums">
                {Math.round((displayStroke.opacity ?? 1) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round((displayStroke.opacity ?? 1) * 100)}
              onChange={(e) =>
                applyStrokeUpdate({ opacity: Number(e.target.value) / 100 })
              }
              className="w-full h-2 rounded-lg accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Line Pattern (Long-tap toggles Double Line) */}
          {selectedInfo?.kind !== 'image' && !selectedInfo?.isSpray && (
            <div
              className={
                !isEditingSelection && activeMode === 'brush' && stroke.brushType === 'spray'
                  ? 'opacity-50 pointer-events-none'
                  : ''
              }
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className={`text-[11px] font-medium ${mutedText}`}>
                  {t('linePattern')}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    applyStrokeUpdate({ doubleLine: !displayStroke.doubleLine })
                  }
                  title={t('doubleLineHint')}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors cursor-pointer ${
                    displayStroke.doubleLine
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
                  const active = displayStroke.pattern === pat.id;
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
                          applyStrokeUpdate({
                            pattern: pat.id,
                            doubleLine: !displayStroke.doubleLine,
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
                        applyStrokeUpdate({ pattern: pat.id });
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
                      <svg width="28" height="8" viewBox="0 0 28 8" className="overflow-visible">
                        {displayStroke.doubleLine ? (
                          <>
                            <line
                              x1="2"
                              y1="2"
                              x2="26"
                              y2="2"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap={pat.id === 'dotted' ? 'round' : 'butt'}
                              strokeDasharray={pat.dash || undefined}
                            />
                            <line
                              x1="2"
                              y1="6"
                              x2="26"
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
                            x2="26"
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

        <hr className={divider} />

        {/* Fill Settings */}
        <div className={`space-y-3 ${!isClosedShape ? 'opacity-65' : ''}`}>
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs font-medium ${mutedText}`}>{t('sectionFill')}</span>
            {!isClosedShape && (
              <span className={`text-[11px] truncate ${mutedText}`}>
                {t('fillClosedHint')}
              </span>
            )}
          </div>

          <div className={`grid grid-cols-4 gap-1 p-1 rounded-xl ${subSurface}`}>
            {fillModes.map((fm) => {
              const active = displayFill.mode === fm.id;
              return (
                <button
                  key={fm.id}
                  type="button"
                  onClick={() => {
                    if (fm.id === 'photo' && !displayFill.photoDataUrl) {
                      fillPhotoInputRef.current?.click();
                      return;
                    }
                    applyFillUpdate({ ...displayFill, mode: fm.id });
                  }}
                  className={`min-h-[36px] px-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer truncate ${
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

          <input
            ref={fillPhotoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              void downscaleImageFileToDataUrl(file).then((photoDataUrl) => {
                applyFillUpdate({
                  ...displayFill,
                  mode: 'photo',
                  photoDataUrl,
                });
              });
            }}
            className="hidden"
          />

          {(displayFill.mode !== 'none' || Boolean(displayFill.photoDataUrl)) &&
            displayFill.mode !== 'none' && (
              <div className="space-y-3 pt-1">
                {displayFill.mode === 'pattern' && (
                  <div className="grid grid-cols-4 gap-1.5">
                    {hatchOptions.map((h) => {
                      const active = displayFill.hatchPattern === h.id;
                      return (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() =>
                            applyFillUpdate({ ...displayFill, hatchPattern: h.id })
                          }
                          className={`min-h-[44px] p-1.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors cursor-pointer ${
                            active
                              ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : isDarkBg
                                ? 'border-neutral-700 bg-neutral-800/50 text-neutral-300 hover:bg-neutral-800'
                                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <HatchPreviewSvg pattern={h.id} color={displayFill.color} />
                          <span className="truncate max-w-full">{t(h.labelKey)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {displayFill.mode === 'photo' && (
                  <div
                    className={`p-2 rounded-xl border flex items-center gap-2.5 ${
                      isDarkBg
                        ? 'border-neutral-700 bg-neutral-800/60'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    {displayFill.photoDataUrl ? (
                      <img
                        src={displayFill.photoDataUrl}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover border border-black/10 shrink-0"
                      />
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${
                          isDarkBg ? 'border-neutral-700 bg-neutral-900' : 'border-slate-200 bg-white'
                        }`}
                      >
                        <ImageIcon className={`w-4 h-4 ${mutedText}`} />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => fillPhotoInputRef.current?.click()}
                      className="flex-1 min-h-[36px] px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{t('fillPhotoPick')}</span>
                    </button>
                  </div>
                )}

                {/* Fill Color & Swatches */}
                {displayFill.mode !== 'photo' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <label
                      className={`relative w-8 h-8 rounded-lg border overflow-hidden cursor-pointer shrink-0 ${
                        isDarkBg ? 'border-neutral-600' : 'border-slate-300'
                      }`}
                    >
                      <input
                        type="color"
                        value={displayFill.color}
                        onChange={(e) =>
                          applyFillUpdate({ ...displayFill, color: e.target.value })
                        }
                        className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer border-0 p-0"
                      />
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {QUICK_COLOR_SWATCHES.map((hex) => {
                        const selected =
                          displayFill.color.toLowerCase() === hex.toLowerCase();
                        return (
                          <button
                            key={hex}
                            type="button"
                            aria-label={hex}
                            onClick={() => applyFillUpdate({ ...displayFill, color: hex })}
                            className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
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
                )}

                {/* Fill Opacity */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[11px] font-medium ${mutedText}`}>
                      {t('fillOpacity')}
                    </span>
                    <span className="text-[11px] font-semibold tabular-nums">
                      {Math.round(displayFill.opacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(displayFill.opacity * 100)}
                    onChange={(e) =>
                      applyFillUpdate({
                        ...displayFill,
                        opacity: Number(e.target.value) / 100,
                      })
                    }
                    className="w-full h-2 rounded-lg accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>
            )}
        </div>

        {/* Corner Rounding & Overall Opacity when editing selected object */}
        {isEditingSelection && selectedInfo && (
          <>
            <hr className={divider} />
            <div className="space-y-3">
              {selectedInfo.cornerRoundRatio !== null && onUpdateSelectedCornerRadius && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[11px] font-medium ${mutedText}`}>
                      {t('cornerRadiusLabel')}
                    </span>
                    <span className="text-[11px] font-semibold tabular-nums">
                      {Math.round(selectedInfo.cornerRoundRatio * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(selectedInfo.cornerRoundRatio * 100)}
                    onChange={(e) =>
                      onUpdateSelectedCornerRadius(Number(e.target.value) / 100)
                    }
                    className="w-full h-2 rounded-lg accent-amber-500 cursor-pointer"
                  />
                </div>
              )}

              {onUpdateSelectedOpacity && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[11px] font-medium ${mutedText}`}>
                      {t('objectOpacity')}
                    </span>
                    <span className="text-[11px] font-semibold tabular-nums">
                      {Math.round(selectedInfo.opacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={Math.round(selectedInfo.opacity * 100)}
                    onChange={(e) =>
                      onUpdateSelectedOpacity(Number(e.target.value) / 100)
                    }
                    className="w-full h-2 rounded-lg accent-blue-600 cursor-pointer"
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const HatchPreviewSvg: React.FC<{ pattern: HatchPattern; color: string }> = ({
  pattern,
  color,
}) => {
  const id = `hatch-prev-${pattern}`;
  return (
    <svg width="24" height="18" viewBox="0 0 24 18" className="rounded border border-black/10">
      <defs>
        {pattern === 'diagonal' && (
          <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M-1,7 l8,-8 M-1,1 l2,-2 M5,7 l2,-2" stroke={color} strokeWidth="1.4" />
          </pattern>
        )}
        {pattern === 'crosshatch' && (
          <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse">
            <path
              d="M-1,7 l8,-8 M-1,-1 l8,8"
              stroke={color}
              strokeWidth="1.2"
            />
          </pattern>
        )}
        {pattern === 'dots' && (
          <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.3" fill={color} />
          </pattern>
        )}
        {pattern === 'horizontal' && (
          <pattern id={id} width="6" height="5" patternUnits="userSpaceOnUse">
            <line x1="0" y1="2.5" x2="6" y2="2.5" stroke={color} strokeWidth="1.3" />
          </pattern>
        )}
      </defs>
      <rect width="24" height="18" fill={`url(#${id})`} />
    </svg>
  );
};
