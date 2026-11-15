import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Layers, Pencil, Trash2, X } from 'lucide-react';
import { ActionsPopover } from './components/ActionsPopover';
import { EraserPopover } from './components/EraserPopover';
import { HelpModal } from './components/HelpModal';
import { ObjectEditorPopover } from './components/ObjectEditorPopover';
import { RightSidebar } from './components/RightSidebar';
import { ShapesPopover } from './components/ShapesPopover';
import { StampsPopover } from './components/StampsPopover';
import { TextModal } from './components/TextModal';
import {
  getSavedLanguagePreference,
  resolveLanguage,
  saveLanguagePreference,
  TranslationKey,
  translations,
} from './i18n/translations';
import {
  ActivePopover,
  ArrowVariant,
  BackgroundConfig,
  BackgroundMode,
  BrushType,
  CanvasSizeConfig,
  DrawMode,
  EmojiDefinition,
  ExportScope,
  FillSettings,
  LanguagePreference,
  LinePattern,
  PolygonVariant,
  RectGridConfig,
  SelectedObjectInfo,
  SelectedObjectKind,
  StampDefinition,
  StrokeSettings,
} from './types/paint';
import {
  applyColorOpacity,
  applyCornerRoundingToObject,
  buildFillValue,
  buildPolygonPoints,
  createArrowObject,
  drawBackgroundToContext,
  exportCanvasImage,
  getFabric,
  getObjectCornerRoundRatio,
  getObjectScreenRect,
  getScaledDashArray,
  installDoubleLineStrokeHook,
  isBackgroundDark,
  isObjectCornerRoundable,
  parseColorAndOpacity,
} from './utils/canvasHelpers';
import {
  attachEndpointControls,
  buildFabricPathFromWorldSegments,
  convertClosedContourToOpen,
  convertObjectToClosedContour,
  detachEndpointControls,
  EndpointSnapMatch,
  findNearestEndpointSnap,
  getObjectWorldEndpoints,
  hasPathCloseCommand,
  isMergeableOpenLine,
  mergeTwoOpenObjects,
  updateOpenObjectEndpoint,
} from './utils/pathSnapping';

const MAX_HISTORY = 30;
const CUSTOM_JSON_PROPS = [
  'globalCompositeOperation',
  'selectable',
  'evented',
  'strokeUniform',
  'isEraserPath',
  'isArrowGroup',
  'isStampGroup',
  'isSprayGroup',
  'stampColor',
  'strokeColorHex',
  'strokeOpacity',
  'fillMeta',
  'strokePattern',
  'doubleLine',
  'brushType',
  'shadow',
  'perPixelTargetFind',
  'targetFindTolerance',
  'baseLocalPoints',
  'baseWidth',
  'baseHeight',
  'basePathOffset',
  'basePathCommands',
  'cornerRoundRatio',
  'shapeSubtype',
  'isClosedContour',
  'isGridRect',
  'gridRows',
  'gridCols',
  'isArrowObject',
  'arrowVariant',
  'arrowLength',
  'isArrowShaft',
  'isArrowHeadStroke',
  'isArrowHeadFill',
  'isArrowTailDot',
];

interface Point {
  x: number;
  y: number;
}

interface BezierSession {
  pathObj: any;
  p0: Point;
  cp1: Point;
  cp2: Point;
  p3: Point;
  h0: any;
  hc1: any;
  hc2: any;
  h3: any;
  g1: any;
  g2: any;
}

function getEditableTargets(activeObj: any): any[] {
  if (!activeObj) return [];
  if (activeObj.type === 'activeSelection' && typeof activeObj.getObjects === 'function') {
    return activeObj
      .getObjects()
      .filter((o: any) => o && !o.excludeFromExport && !o.isEraserPath);
  }
  if (activeObj.excludeFromExport || activeObj.isEraserPath) return [];
  return [activeObj];
}

function isClosedFillableObject(obj: any): boolean {
  if (!obj || obj.excludeFromExport || obj.isEraserPath || obj.isArrowGroup || obj.isStampGroup || obj.isSprayGroup) {
    return false;
  }
  return (
    obj.type === 'rect' ||
    obj.type === 'triangle' ||
    obj.type === 'ellipse' ||
    obj.type === 'circle' ||
    obj.type === 'polygon' ||
    (obj.type === 'path' && (Boolean(obj.isClosedContour) || hasPathCloseCommand(obj)))
  );
}

function extractObjectInfo(activeObj: any): SelectedObjectInfo | null {
  if (!activeObj || activeObj.excludeFromExport) return null;

  const targets = getEditableTargets(activeObj);
  if (targets.length === 0) return null;

  const obj = targets[0];
  const anyClosed = targets.some((t) => isClosedFillableObject(t));
  const firstClosedTarget = targets.find((t) => isClosedFillableObject(t)) || obj;

  let kind: SelectedObjectKind = 'shape';
  if (targets.length === 1 && obj.type === 'image') {
    kind = 'image';
  } else if (targets.length === 1 && (obj.type === 'i-text' || obj.type === 'text')) {
    kind = 'text';
  } else if (anyClosed) {
    kind = 'closedShape';
  } else if (obj.isStampGroup || obj.type === 'line' || obj.type === 'path' || obj.isArrowGroup) {
    kind = 'line';
  }

  let strokeColor = '#000000';
  let strokeOpacity = 1;
  let strokeWidth = 3;
  let strokePattern: LinePattern = obj.strokePattern || 'solid';
  let doubleLine = Boolean(obj.doubleLine);
  const isSpray = targets.length === 1 && Boolean(obj.isSprayGroup);

  if (isSpray) {
    const firstDot = Array.isArray(obj._objects) ? obj._objects[0] : null;
    const parsed = parseColorAndOpacity(firstDot?.fill, obj.strokeOpacity);
    strokeColor = obj.strokeColorHex || parsed.hex;
    strokeOpacity = parsed.opacity;
    strokeWidth = 3;
    strokePattern = 'solid';
    doubleLine = false;
  } else if (obj.isArrowGroup && Array.isArray(obj._objects) && obj._objects[0]) {
    const shaft =
      obj._objects.find((c: any) => c.isArrowShaft) || obj._objects[0];
    const parsed = parseColorAndOpacity(shaft.stroke, obj.strokeOpacity ?? shaft.strokeOpacity);
    strokeColor = obj.strokeColorHex || shaft.strokeColorHex || parsed.hex;
    strokeOpacity = parsed.opacity;
    strokeWidth = typeof shaft.strokeWidth === 'number' ? shaft.strokeWidth : 3;
    strokePattern = obj.strokePattern || shaft.strokePattern || 'solid';
    doubleLine = Boolean(obj.doubleLine || shaft.doubleLine);
  } else if (obj.isStampGroup) {
    const firstChild = Array.isArray(obj._objects) ? obj._objects[0] : obj;
    const parsed = parseColorAndOpacity(
      obj.stampColor ?? firstChild?.stroke,
      obj.strokeOpacity
    );
    strokeColor = parsed.hex;
    strokeOpacity = parsed.opacity;
    strokeWidth =
      typeof firstChild?.strokeWidth === 'number' ? firstChild.strokeWidth : 2;
    strokePattern = obj.strokePattern || 'solid';
    doubleLine = Boolean(obj.doubleLine);
  } else if (kind === 'image') {
    const parsed = parseColorAndOpacity(obj.stroke, obj.strokeOpacity);
    strokeColor = obj.strokeColorHex || parsed.hex;
    strokeOpacity = parsed.opacity;
    strokeWidth = typeof obj.strokeWidth === 'number' ? obj.strokeWidth : 0;
  } else {
    const parsed = parseColorAndOpacity(obj.stroke, obj.strokeOpacity);
    strokeColor = obj.strokeColorHex || parsed.hex;
    strokeOpacity = parsed.opacity;
    strokeWidth = typeof obj.strokeWidth === 'number' ? obj.strokeWidth : 3;
  }

  let fill: FillSettings = {
    mode: 'none',
    color: '#3B82F6',
    opacity: 0.35,
    hatchPattern: 'diagonal',
  };

  if (firstClosedTarget.fillMeta) {
    fill = { ...firstClosedTarget.fillMeta };
  } else if (
    kind === 'closedShape' &&
    firstClosedTarget.fill &&
    firstClosedTarget.fill !== 'transparent'
  ) {
    if (typeof firstClosedTarget.fill === 'string') {
      const parsedFill = parseColorAndOpacity(firstClosedTarget.fill);
      fill = {
        mode: 'solid',
        color: parsedFill.hex,
        opacity: parsedFill.opacity,
        hatchPattern: 'diagonal',
      };
    } else {
      fill = {
        mode: 'pattern',
        color: '#3B82F6',
        opacity: 0.5,
        hatchPattern: 'diagonal',
      };
    }
  }

  const singlePathOrLine =
    targets.length === 1 &&
    (obj.type === 'path' || obj.type === 'line') &&
    !obj.isSprayGroup &&
    !obj.isArrowGroup &&
    !obj.isStampGroup;
  const isClosedContour =
    singlePathOrLine &&
    obj.type === 'path' &&
    (Boolean(obj.isClosedContour) || hasPathCloseCommand(obj));
  const canToggleClosedContour =
    singlePathOrLine &&
    (isClosedContour ||
      obj.type === 'line' ||
      (obj.type === 'path' && Array.isArray(obj.path) && obj.path.length >= 2));

  const isPolygonMorphable =
    targets.length === 1 && obj.type === 'polygon' && !obj.isArrowObject;
  const polygonVariant =
    isPolygonMorphable &&
    typeof obj.shapeSubtype === 'string' &&
    obj.shapeSubtype !== 'triangle'
      ? (obj.shapeSubtype as PolygonVariant)
      : undefined;

  const isRectEditable = targets.length === 1 && obj.type === 'rect';
  const isGridRect = Boolean(isRectEditable && obj.isGridRect);
  const gridRows = isRectEditable
    ? Math.max(1, Math.min(24, Math.round(Number(obj.gridRows) || 3)))
    : undefined;
  const gridCols = isRectEditable
    ? Math.max(1, Math.min(24, Math.round(Number(obj.gridCols) || 3)))
    : undefined;

  const isArrowMorphable =
    targets.length === 1 && (Boolean(obj.isArrowGroup) || Boolean(obj.isArrowObject));
  const arrowVariant: ArrowVariant | undefined = isArrowMorphable
    ? ((obj.arrowVariant as ArrowVariant) || 'single')
    : undefined;

  const firstRoundRatio = getObjectCornerRoundRatio(obj);

  return {
    kind,
    strokeColor,
    strokeOpacity,
    strokeWidth,
    strokePattern,
    doubleLine,
    brushType: singlePathOrLine ? (obj.brushType || 'standard') : undefined,
    isSpray,
    isClosedContour: Boolean(isClosedContour),
    canToggleClosedContour: Boolean(canToggleClosedContour),
    isPolygonMorphable,
    polygonVariant,
    isRectEditable,
    isGridRect,
    gridRows,
    gridCols,
    isArrowMorphable,
    arrowVariant,
    selectionCount: targets.length,
    fill,
    opacity: typeof obj.opacity === 'number' ? obj.opacity : 1,
    cornerRoundRatio: targets.length === 1 ? firstRoundRatio : firstRoundRatio,
    textColor: typeof obj.fill === 'string' ? obj.fill : '#000000',
    fontFamily: obj.fontFamily || 'Montserrat',
    fontSize: typeof obj.fontSize === 'number' ? obj.fontSize : 36,
    screenRect: getObjectScreenRect(activeObj),
  };
}

export default function App() {
  // Language state (auto-adapted to browser language + selectable in settings)
  const [languagePref, setLanguagePref] = useState<LanguagePreference>(() =>
    getSavedLanguagePreference()
  );
  const resolvedLang = useMemo(() => resolveLanguage(languagePref), [languagePref]);
  const t = useCallback(
    (key: TranslationKey): string => translations[resolvedLang][key] || translations.en[key],
    [resolvedLang]
  );

  useEffect(() => {
    document.documentElement.lang = resolvedLang;
  }, [resolvedLang]);

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePopover, setActivePopover] = useState<ActivePopover>(null);
  const [activeMode, setActiveMode] = useState<DrawMode>('brush');
  const [rectGrid, setRectGrid] = useState<RectGridConfig>({
    enabled: false,
    rows: 3,
    cols: 3,
  });
  const [polygonVariant, setPolygonVariant] = useState<PolygonVariant>('star5');
  const [arrowVariant, setArrowVariant] = useState<ArrowVariant>('single');
  const [bgConfig, setBgConfig] = useState<BackgroundConfig>({
    mode: 'white',
    fillType: 'solid',
    color1: '#FFFFFF',
    color2: '#DBEAFE',
    opacity: 1,
    gradientType: 'linear',
    gradientAngle: 135,
  });
  const [canvasSize, setCanvasSize] = useState<CanvasSizeConfig>({
    preset: 'fullscreen',
    width: 1080,
    height: 1080,
  });
  const [exportScope, setExportScope] = useState<ExportScope>('canvas');
  const [zoomPercent, setZoomPercent] = useState(100);
  const [isCanvasEmpty, setIsCanvasEmpty] = useState(true);
  const [selectedInfo, setSelectedInfo] = useState<SelectedObjectInfo | null>(null);
  const [objectEditorOpen, setObjectEditorOpen] = useState(false);
  const [isEditingBezier, setIsEditingBezier] = useState(false);
  const [isEditingContour, setIsEditingContour] = useState(false);
  const [closedContour, setClosedContour] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [isSpacePanning, setIsSpacePanning] = useState(false);
  const [cornerRoundHud, setCornerRoundHud] = useState<{
    percent: number;
    armed: boolean;
  } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [offlineToast, setOfflineToast] = useState(false);
  const offlineToastTimerRef = useRef<number | null>(null);
  const offlineHtmlBlobRef = useRef<Blob | null>(null);

  // Brush / Shape / Eraser settings
  const [stroke, setStroke] = useState<StrokeSettings>({
    color: '#000000',
    opacity: 1,
    width: 3,
    pattern: 'solid',
    brushType: 'standard',
    doubleLine: false,
  });
  const [fill, setFill] = useState<FillSettings>({
    mode: 'none',
    color: '#3B82F6',
    opacity: 0.35,
    hatchPattern: 'diagonal',
  });
  const [eraserSize, setEraserSize] = useState(24);

  // History state
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Refs for Fabric & background canvas
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricElRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Mutable refs for event handlers
  const activeModeRef = useRef<DrawMode>(activeMode);
  const rectGridRef = useRef<RectGridConfig>(rectGrid);
  const polygonVariantRef = useRef<PolygonVariant>(polygonVariant);
  const arrowVariantRef = useRef<ArrowVariant>(arrowVariant);
  const closedContourRef = useRef<boolean>(closedContour);
  const snapEnabledRef = useRef<boolean>(snapEnabled);
  const strokeRef = useRef<StrokeSettings>(stroke);
  const fillRef = useRef<FillSettings>(fill);
  const eraserSizeRef = useRef<number>(eraserSize);
  const bgConfigRef = useRef<BackgroundConfig>(bgConfig);
  const canvasSizeRef = useRef<CanvasSizeConfig>(canvasSize);
  const artboardCenterRef = useRef<{ x: number; y: number }>({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 512,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 384,
  });
  const sidebarOpenRef = useRef<boolean>(sidebarOpen);
  const activePopoverRef = useRef<ActivePopover>(activePopover);

  activeModeRef.current = activeMode;
  rectGridRef.current = rectGrid;
  polygonVariantRef.current = polygonVariant;
  arrowVariantRef.current = arrowVariant;
  closedContourRef.current = closedContour;
  snapEnabledRef.current = snapEnabled;
  strokeRef.current = stroke;
  fillRef.current = fill;
  eraserSizeRef.current = eraserSize;
  bgConfigRef.current = bgConfig;
  canvasSizeRef.current = canvasSize;
  sidebarOpenRef.current = sidebarOpen;
  activePopoverRef.current = activePopover;

  // History refs
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isRestoringRef = useRef<boolean>(false);
  const historyDebounceRef = useRef<number | null>(null);

  // Shape drawing refs
  const isDrawingShapeRef = useRef(false);
  const shapeStartRef = useRef<Point>({ x: 0, y: 0 });
  const tempShapeRef = useRef<any>(null);

  // Bezier & Contour & Endpoint Snap refs
  const bezierSessionRef = useRef<BezierSession | null>(null);
  const contourSessionRef = useRef<{
    points: Point[];
    pathObj: any;
    previewLine: any;
    startMarker: any;
  } | null>(null);
  const snapIndicatorRef = useRef<Point | null>(null);
  const pendingLineStartSnapRef = useRef<EndpointSnapMatch | null>(null);
  const pendingLineEndSnapRef = useRef<EndpointSnapMatch | null>(null);
  const pendingEndpointMergeRef = useRef<{
    obj: any;
    end: 'start' | 'end';
    snap: EndpointSnapMatch;
  } | null>(null);

  // Native long-press corner rounding refs
  const longPressCornerTimerRef = useRef<number | null>(null);
  const pendingCornerPressRef = useRef<{
    obj: any;
    startPt: Point;
    dirX: number;
    dirY: number;
    maxTravel: number;
    preLeft: number;
    preTop: number;
    preScaleX: number;
    preScaleY: number;
  } | null>(null);
  const cornerRoundingDragRef = useRef<{
    obj: any;
    startPt: Point;
    dirX: number;
    dirY: number;
    maxTravel: number;
    startRatio: number;
    movedPx: number;
  } | null>(null);
  const cornerRoundingArmedObjRef = useRef<any>(null);

  // Panning & Pinching refs
  const isSpaceHeldRef = useRef(false);
  const isPanningDragRef = useRef(false);
  const lastPanClientRef = useRef<Point>({ x: 0, y: 0 });
  const isPinchingRef = useRef(false);
  const lastSingleTouchRef = useRef<{ time: number; count: number }>({
    time: 0,
    count: 0,
  });

  const refreshEmptyState = useCallback(() => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;
    const realObjects = fc.getObjects().filter((o: any) => !o.excludeFromExport);
    setIsCanvasEmpty(realObjects.length === 0);
  }, []);

  const refreshSelectedInfo = useCallback(() => {
    const fc = fabricCanvasRef.current;
    if (!fc || bezierSessionRef.current || contourSessionRef.current) {
      setSelectedInfo(null);
      return;
    }
    const active = fc.getActiveObject();
    if (!active || active.excludeFromExport) {
      setSelectedInfo(null);
      setObjectEditorOpen(false);
      return;
    }
    setSelectedInfo(extractObjectInfo(active));
  }, []);

  // Render background layer (White / Grid / Lined / Dark)
  const renderBackground = useCallback(() => {
    const bgCanvas = bgCanvasRef.current;
    const fc = fabricCanvasRef.current;
    if (!bgCanvas) return;

    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (
      bgCanvas.width !== Math.round(width * dpr) ||
      bgCanvas.height !== Math.round(height * dpr)
    ) {
      bgCanvas.width = Math.round(width * dpr);
      bgCanvas.height = Math.round(height * dpr);
      bgCanvas.style.width = `${width}px`;
      bgCanvas.style.height = `${height}px`;
    }

    const ctx = bgCanvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const vpt = fc ? fc.viewportTransform || [1, 0, 0, 1, 0, 0] : [1, 0, 0, 1, 0, 0];
    drawBackgroundToContext(
      ctx,
      bgConfigRef.current,
      vpt,
      width,
      height,
      false,
      canvasSizeRef.current,
      artboardCenterRef.current
    );
    ctx.restore();
  }, []);

  // Push JSON snapshot to 30-step Undo/Redo stack
  const saveHistory = useCallback(() => {
    const fc = fabricCanvasRef.current;
    if (!fc || isRestoringRef.current) return;

    const jsonObj = fc.toJSON(CUSTOM_JSON_PROPS);
    if (Array.isArray(jsonObj.objects)) {
      jsonObj.objects = jsonObj.objects.filter((o: any) => !o.excludeFromExport);
    }
    const serialized = JSON.stringify(jsonObj);

    const current = historyRef.current[historyIndexRef.current];
    if (current === serialized) return;

    const sliced = historyRef.current.slice(0, historyIndexRef.current + 1);
    sliced.push(serialized);
    if (sliced.length > MAX_HISTORY) {
      sliced.shift();
    }

    historyRef.current = sliced;
    historyIndexRef.current = sliced.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
    refreshEmptyState();
  }, [refreshEmptyState]);

  const scheduleHistorySave = useCallback(() => {
    if (historyDebounceRef.current) {
      window.clearTimeout(historyDebounceRef.current);
    }
    historyDebounceRef.current = window.setTimeout(() => {
      historyDebounceRef.current = null;
      saveHistory();
    }, 280);
  }, [saveHistory]);

  // Apply Fabric mode & brush settings whenever mode/stroke/eraser/spacePan changes
  const syncFabricToolState = useCallback(() => {
    const fc = fabricCanvasRef.current;
    const fabric = getFabric();
    if (!fc || !fabric) return;

    const mode = activeModeRef.current;

    if (isSpaceHeldRef.current) {
      fc.isDrawingMode = false;
      fc.selection = false;
      fc.defaultCursor = 'grab';
      fc.forEachObject((obj: any) => {
        if (!obj.excludeFromExport) {
          obj.selectable = false;
          obj.evented = false;
        }
      });
      fc.requestRenderAll();
      return;
    }

    if (mode === 'brush') {
      fc.discardActiveObject();
      fc.isDrawingMode = true;
      fc.selection = false;
      fc.defaultCursor = 'crosshair';

      const brushType = strokeRef.current.brushType;
      const effectiveStroke = applyColorOpacity(
        strokeRef.current.color,
        strokeRef.current.opacity
      );
      if (brushType === 'spray') {
        const spray = new fabric.SprayBrush(fc);
        spray.color = effectiveStroke;
        spray.width = Math.max(18, strokeRef.current.width * 3.8);
        spray.density = Math.max(22, Math.round(strokeRef.current.width * 2.8 + 14));
        spray.dotWidth = Math.max(1.5, Math.min(8, strokeRef.current.width * 0.28 + 1));
        spray.dotWidthVariance = Math.max(1, strokeRef.current.width * 0.22);
        spray.randomOpacity = true;
        spray.optimizeOverlapping = true;
        fc.freeDrawingBrush = spray;
      } else {
        const brush = new fabric.PencilBrush(fc);
        const previewWidth = strokeRef.current.width > 0 ? strokeRef.current.width : 2;
        const previewColor =
          strokeRef.current.width > 0
            ? effectiveStroke
            : isBackgroundDark(bgConfigRef.current)
              ? 'rgba(255, 255, 255, 0.5)'
              : 'rgba(59, 130, 246, 0.55)';
        brush.color = previewColor;
        brush.width = previewWidth;
        brush.strokeLineCap = 'round';
        brush.strokeLineJoin = 'round';
        brush.strokeDashArray = getScaledDashArray(
          strokeRef.current.pattern,
          previewWidth
        );
        if (brushType === 'soft' && strokeRef.current.width > 0) {
          brush.shadow = new fabric.Shadow({
            blur: Math.max(8, strokeRef.current.width * 1.45),
            color: effectiveStroke,
            affectStroke: true,
            offsetX: 0,
            offsetY: 0,
          });
        }
        fc.freeDrawingBrush = brush;
      }

      fc.forEachObject((obj: any) => {
        if (!obj.excludeFromExport) {
          obj.selectable = false;
          obj.evented = false;
        }
      });
    } else if (mode === 'eraser') {
      fc.discardActiveObject();
      fc.isDrawingMode = true;
      fc.selection = false;
      fc.defaultCursor = 'crosshair';
      const brush = new fabric.PencilBrush(fc);
      brush.width = eraserSizeRef.current;
      brush.color = isBackgroundDark(bgConfigRef.current)
        ? 'rgba(255, 255, 255, 0.28)'
        : 'rgba(15, 23, 42, 0.18)';
      brush.strokeLineCap = 'round';
      brush.strokeLineJoin = 'round';
      brush.strokeDashArray = null;
      fc.freeDrawingBrush = brush;
      fc.forEachObject((obj: any) => {
        if (!obj.excludeFromExport) {
          obj.selectable = false;
          obj.evented = false;
        }
      });
    } else if (mode === 'select') {
      fc.isDrawingMode = false;
      fc.selection = true;
      fc.defaultCursor = 'default';
      fc.forEachObject((obj: any) => {
        if (!obj.excludeFromExport) {
          const isEraser = Boolean(obj.isEraserPath);
          obj.selectable = !isEraser;
          obj.evented = !isEraser;
        }
      });
    } else {
      // Shape or line or bezier creation mode
      fc.discardActiveObject();
      fc.isDrawingMode = false;
      fc.selection = false;
      fc.defaultCursor = 'crosshair';
      fc.forEachObject((obj: any) => {
        if (!obj.excludeFromExport) {
          obj.selectable = false;
          obj.evented = false;
        }
      });
    }

    fc.requestRenderAll();
  }, []);

  const attachControlsToObject = useCallback(
    (obj: any) => {
      if (!obj) return;
      if (!isMergeableOpenLine(obj)) {
        detachEndpointControls(obj);
        return;
      }
      attachEndpointControls(obj, {
        onDragEndpoint: (target, endKey, worldX, worldY) => {
          const fc = fabricCanvasRef.current;
          if (!fc || !target) return false;
          const zoom = fc.getZoom() || 1;
          const eps = getObjectWorldEndpoints(target);
          const isMultiOrCurved =
            target.type === 'path' &&
            Array.isArray(target.path) &&
            (target.path.length >= 3 ||
              target.path.some((c: any) => c[0] === 'C' || c[0] === 'Q'));
          const extraSelf = isMultiOrCurved
            ? endKey === 'start'
              ? eps?.end
              : eps?.start
            : null;
          const snap = snapEnabledRef.current
            ? findNearestEndpointSnap(
                fc,
                { x: worldX, y: worldY },
                [target],
                zoom,
                extraSelf
              )
            : null;
          const nextPt = snap ? snap.point : { x: worldX, y: worldY };
          snapIndicatorRef.current = snap ? snap.point : null;
          pendingEndpointMergeRef.current = snap
            ? { obj: target, end: endKey, snap }
            : null;
          updateOpenObjectEndpoint(target, endKey, nextPt);
          refreshSelectedInfo();
          return true;
        },
      });
    },
    [refreshSelectedInfo]
  );

  // Finalize or cancel active multi-segment Closed Contour session
  const finalizeContourSession = useCallback(
    (cancel = false) => {
      const fc = fabricCanvasRef.current;
      const session = contourSessionRef.current;
      if (!fc || !session) return;

      if (session.previewLine) fc.remove(session.previewLine);
      if (session.startMarker) fc.remove(session.startMarker);
      if (session.pathObj) fc.remove(session.pathObj);
      snapIndicatorRef.current = null;
      contourSessionRef.current = null;
      setIsEditingContour(false);

      if (!cancel && session.points.length >= 2) {
        const pts = session.points;
        const segs = [];
        for (let i = 0; i < pts.length - 1; i++) {
          segs.push({ type: 'L' as const, from: pts[i], to: pts[i + 1] });
        }
        const isClosed = pts.length >= 3;
        const finalWidth =
          isClosed && fillRef.current.mode !== 'none'
            ? strokeRef.current.width
            : Math.max(1, strokeRef.current.width);
        const effectiveStroke = applyColorOpacity(
          strokeRef.current.color,
          strokeRef.current.opacity
        );
        const dash = getScaledDashArray(strokeRef.current.pattern, finalWidth);
        const created = buildFabricPathFromWorldSegments(
          segs,
          {
            stroke: finalWidth > 0 ? effectiveStroke : null,
            strokeColorHex: strokeRef.current.color,
            strokeOpacity: strokeRef.current.opacity,
            strokeWidth: finalWidth,
            strokeDashArray: dash || undefined,
            strokePattern: strokeRef.current.pattern,
            doubleLine: strokeRef.current.doubleLine,
            brushType: 'standard',
          },
          isClosed,
          fillRef.current,
          true
        );
        if (created) {
          fc.add(created);
          if (!isClosed) {
            attachControlsToObject(created);
          }
          setActiveMode('select');
          activeModeRef.current = 'select';
          syncFabricToolState();
          created.set({ selectable: true, evented: true });
          created.setCoords();
          fc.setActiveObject(created);
          refreshSelectedInfo();
          saveHistory();
        }
      } else {
        syncFabricToolState();
        refreshEmptyState();
      }
      fc.requestRenderAll();
    },
    [
      attachControlsToObject,
      refreshEmptyState,
      refreshSelectedInfo,
      saveHistory,
      syncFabricToolState,
    ]
  );

  // Finalize or cancel active Bezier editing session
  const finalizeBezierSession = useCallback(
    (cancel = false) => {
      const fc = fabricCanvasRef.current;
      const session = bezierSessionRef.current;
      if (!fc || !session) return;

      snapIndicatorRef.current = null;
      fc.remove(session.h0, session.hc1, session.hc2, session.h3, session.g1, session.g2);
      let createdPath = session.pathObj;
      if (cancel) {
        fc.remove(createdPath);
      }

      bezierSessionRef.current = null;
      setIsEditingBezier(false);

      if (!cancel) {
        if (!createdPath.isClosedContour && snapEnabledRef.current) {
          const eps = getObjectWorldEndpoints(createdPath);
          if (eps) {
            const zoom = fc.getZoom() || 1;
            const s0 = findNearestEndpointSnap(fc, eps.start, [createdPath], zoom);
            if (s0 && s0.targetObj && s0.targetEnd !== 'self' && s0.distance <= 3.5) {
              const merged = mergeTwoOpenObjects(
                createdPath,
                'start',
                s0.targetObj,
                s0.targetEnd,
                fillRef.current
              );
              if (merged) {
                fc.remove(createdPath);
                fc.remove(s0.targetObj);
                fc.add(merged);
                createdPath = merged;
              }
            }
            if (!createdPath.isClosedContour) {
              const epsAfter = getObjectWorldEndpoints(createdPath);
              if (epsAfter) {
                const s1 = findNearestEndpointSnap(fc, epsAfter.end, [createdPath], zoom);
                if (s1 && s1.targetObj && s1.targetEnd !== 'self' && s1.distance <= 3.5) {
                  const merged2 = mergeTwoOpenObjects(
                    createdPath,
                    'end',
                    s1.targetObj,
                    s1.targetEnd,
                    fillRef.current
                  );
                  if (merged2) {
                    fc.remove(createdPath);
                    fc.remove(s1.targetObj);
                    fc.add(merged2);
                    createdPath = merged2;
                  }
                }
              }
            }
          }
        }
        setActiveMode('select');
        activeModeRef.current = 'select';
        syncFabricToolState();
        attachControlsToObject(createdPath);
        createdPath.set({ selectable: true, evented: true });
        createdPath.setCoords();
        fc.setActiveObject(createdPath);
        refreshSelectedInfo();
        saveHistory();
      } else {
        syncFabricToolState();
        refreshEmptyState();
      }
      fc.requestRenderAll();
    },
    [
      attachControlsToObject,
      refreshEmptyState,
      refreshSelectedInfo,
      saveHistory,
      syncFabricToolState,
    ]
  );

  // Restore a JSON snapshot (for Undo / Redo)
  const restoreSnapshot = useCallback(
    (index: number) => {
      const fc = fabricCanvasRef.current;
      const snapshot = historyRef.current[index];
      if (!fc || snapshot === undefined) return;

      if (bezierSessionRef.current) {
        finalizeBezierSession(true);
      }
      if (contourSessionRef.current) {
        finalizeContourSession(true);
      }

      isRestoringRef.current = true;
      fc.loadFromJSON(JSON.parse(snapshot), () => {
        const fabric = getFabric();
        fc.forEachObject((obj: any) => {
          if (obj.type === 'polygon' && obj.basePathOffset && fabric) {
            obj.set({
              width: obj.baseWidth ?? obj.width,
              height: obj.baseHeight ?? obj.height,
              pathOffset: new fabric.Point(obj.basePathOffset.x, obj.basePathOffset.y),
              dirty: true,
            });
          }
          if (
            obj.fill &&
            obj.fill.source &&
            obj.fill.source instanceof HTMLImageElement &&
            !obj.fill.source.complete
          ) {
            obj.fill.source.onload = () => fc.requestRenderAll();
          }
          if (
            obj.type === 'rect' ||
            obj.type === 'triangle' ||
            obj.type === 'ellipse' ||
            obj.type === 'circle' ||
            obj.type === 'polygon' ||
            (obj.type === 'path' &&
              (obj.isClosedContour ||
                (Array.isArray(obj.path) &&
                  obj.path.some((c: any) => c && (c[0] === 'Z' || c[0] === 'z')))))
          ) {
            obj.set({ perPixelTargetFind: false, targetFindTolerance: 16 });
          }
          attachControlsToObject(obj);
        });
        isRestoringRef.current = false;
        syncFabricToolState();
        fc.requestRenderAll();
        refreshEmptyState();
        refreshSelectedInfo();
      });

      historyIndexRef.current = index;
      setCanUndo(index > 0);
      setCanRedo(index < historyRef.current.length - 1);
    },
    [
      attachControlsToObject,
      finalizeBezierSession,
      finalizeContourSession,
      refreshEmptyState,
      refreshSelectedInfo,
      syncFabricToolState,
    ]
  );

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      restoreSnapshot(historyIndexRef.current - 1);
    }
  }, [restoreSnapshot]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      restoreSnapshot(historyIndexRef.current + 1);
    }
  }, [restoreSnapshot]);

  // Initialize Fabric.js Canvas
  useEffect(() => {
    const fabric = getFabric();
    if (!fabric || !fabricElRef.current) return;

    installDoubleLineStrokeHook();

    fabric.Object.prototype.set({
      transparentCorners: false,
      cornerColor: '#2563EB',
      cornerStrokeColor: '#FFFFFF',
      borderColor: '#2563EB',
      cornerSize: 11,
      touchCornerSize: 22,
      cornerStyle: 'circle',
      padding: 6,
      borderScaleFactor: 1.5,
    });

    const fc = new fabric.Canvas(fabricElRef.current, {
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: null,
      preserveObjectStacking: true,
      targetFindTolerance: 16,
      isDrawingMode: true,
      enableRetinaScaling: true,
    });

    const origCheckTarget = fc._checkTarget.bind(fc);
    fc._checkTarget = function (pointer: any, obj: any, globalPointer: any) {
      if (obj && obj === fc._activeObject && obj.visible && obj.evented) {
        if (obj.containsPoint(pointer)) {
          return true;
        }
      }
      return origCheckTarget(pointer, obj, globalPointer);
    };

    fabricCanvasRef.current = fc;
    renderBackground();
    syncFabricToolState();

    // Save blank initial state
    const initialJson = JSON.stringify(fc.toJSON(CUSTOM_JSON_PROPS));
    historyRef.current = [initialJson];
    historyIndexRef.current = 0;

    const clearCornerLongPressTimer = () => {
      if (longPressCornerTimerRef.current !== null) {
        window.clearTimeout(longPressCornerTimerRef.current);
        longPressCornerTimerRef.current = null;
      }
      pendingCornerPressRef.current = null;
    };

    const disarmCornerRounding = () => {
      clearCornerLongPressTimer();
      cornerRoundingDragRef.current = null;
      const armed = cornerRoundingArmedObjRef.current;
      if (armed) {
        armed.set({
          cornerColor: '#2563EB',
          borderColor: '#2563EB',
        });
        cornerRoundingArmedObjRef.current = null;
      }
      setCornerRoundHud(null);
      fc.requestRenderAll();
    };

    const getCanvasRelativePoint = (rawEvt: MouseEvent | TouchEvent): Point => {
      const el = fc.upperCanvasEl as HTMLElement | undefined;
      const rect = el ? el.getBoundingClientRect() : { left: 0, top: 0 };
      if ('touches' in rawEvt) {
        const tPt = rawEvt.touches[0] || rawEvt.changedTouches[0];
        return tPt
          ? { x: tPt.clientX - rect.left, y: tPt.clientY - rect.top }
          : { x: 0, y: 0 };
      }
      return {
        x: rawEvt.clientX - rect.left,
        y: rawEvt.clientY - rect.top,
      };
    };

    let zOrderChangedOnTap = false;

    const bringTargetToFrontLayer = (target: any) => {
      if (!target || target.excludeFromExport || target.isEraserPath) return;
      if (isRestoringRef.current || activeModeRef.current !== 'select') return;
      const objs = fc.getObjects();
      if (objs.length <= 1) return;

      if (target.type === 'activeSelection' && typeof target.getObjects === 'function') {
        const items = target.getObjects();
        let changed = false;
        items.forEach((child: any) => {
          if (child && !child.excludeFromExport && !child.isEraserPath) {
            fc.bringToFront(child);
            changed = true;
          }
        });
        if (changed) {
          zOrderChangedOnTap = true;
          fc.requestRenderAll();
        }
        return;
      }

      const curIdx = objs.indexOf(target);
      if (curIdx >= 0 && curIdx < objs.length - 1) {
        fc.bringToFront(target);
        zOrderChangedOnTap = true;
        fc.requestRenderAll();
      }
    };

    // Selection & transform tracking (keeps top-right Pencil icon synced & elevates touched layer)
    const updateSel = () => refreshSelectedInfo();
    fc.on('selection:created', () => {
      bringTargetToFrontLayer(fc.getActiveObject());
      refreshSelectedInfo();
    });
    fc.on('selection:updated', () => {
      disarmCornerRounding();
      bringTargetToFrontLayer(fc.getActiveObject());
      refreshSelectedInfo();
    });
    fc.on('selection:cleared', () => {
      disarmCornerRounding();
      setSelectedInfo(null);
      setObjectEditorOpen(false);
    });
    fc.on('object:scaling', (e: any) => {
      if (
        e?.target &&
        (e.target.type === 'polygon' ||
          e.target.type === 'rect' ||
          e.target.type === 'path') &&
        typeof e.target.cornerRoundRatio === 'number' &&
        e.target.cornerRoundRatio > 0
      ) {
        applyCornerRoundingToObject(e.target, e.target.cornerRoundRatio);
      }
      updateSel();
    });
    fc.on('object:rotating', updateSel);

    // Re-render background whenever viewport transforms or canvas renders + draw snap indicator
    fc.on('after:render', () => {
      renderBackground();
      const snapPt = snapIndicatorRef.current;
      if (snapPt) {
        const ctx = fc.getContext();
        const r =
          typeof fc.getRetinaScaling === 'function'
            ? fc.getRetinaScaling()
            : window.devicePixelRatio || 1;
        const vpt = fc.viewportTransform || [1, 0, 0, 1, 0, 0];
        const scr = fabric.util.transformPoint(
          new fabric.Point(snapPt.x, snapPt.y),
          vpt
        );
        ctx.save();
        ctx.setTransform(r, 0, 0, r, 0, 0);
        ctx.beginPath();
        ctx.arc(scr.x, scr.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#10B981';
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(scr.x, scr.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#10B981';
        ctx.fill();
        ctx.restore();
      }
    });

    // Freehand / Eraser / Spray path completion
    fc.on('path:created', (e: any) => {
      if (!e?.path) return;
      if (activeModeRef.current === 'eraser') {
        e.path.set({
          globalCompositeOperation: 'destination-out',
          stroke: '#000000',
          strokeDashArray: null,
          selectable: false,
          evented: false,
          isEraserPath: true,
        });
      } else if (e.path.type === 'group') {
        e.path.set({
          isSprayGroup: true,
          brushType: 'spray',
          strokeColorHex: strokeRef.current.color,
          strokeOpacity: strokeRef.current.opacity,
          selectable: false,
          evented: false,
        });
      } else {
        const bType = strokeRef.current.brushType;
        const effectiveStroke = applyColorOpacity(
          strokeRef.current.color,
          strokeRef.current.opacity
        );
        const allowZero = closedContourRef.current && fillRef.current.mode !== 'none';
        const finalWidth = allowZero
          ? strokeRef.current.width
          : Math.max(1, strokeRef.current.width);
        e.path.set({
          stroke: finalWidth > 0 ? effectiveStroke : null,
          strokeWidth: finalWidth,
          strokeColorHex: strokeRef.current.color,
          strokeOpacity: strokeRef.current.opacity,
          strokeUniform: true,
          strokePattern: strokeRef.current.pattern,
          doubleLine: bType === 'soft' ? false : strokeRef.current.doubleLine,
          brushType: bType,
          selectable: false,
          evented: false,
        });
        if (finalWidth === 0) {
          e.path.set({ shadow: null });
        }

        if (closedContourRef.current) {
          const closed = convertObjectToClosedContour(e.path, fillRef.current, false);
          if (closed) {
            const idx = fc.getObjects().indexOf(e.path);
            fc.remove(e.path);
            if (idx >= 0) {
              fc.insertAt(closed, idx, false);
            } else {
              fc.add(closed);
            }
            e.path = closed;
          }
        } else {
          attachControlsToObject(e.path);
        }
      }
      fc.requestRenderAll();
      saveHistory();
    });

    // Object transformation history + endpoint merge completion
    fc.on('object:modified', (e: any) => {
      if (e?.target?.excludeFromExport) return;
      zOrderChangedOnTap = false;
      snapIndicatorRef.current = null;

      const pendingMerge = pendingEndpointMergeRef.current;
      pendingEndpointMergeRef.current = null;
      if (pendingMerge && pendingMerge.obj === e?.target) {
        if (pendingMerge.snap.targetEnd === 'self') {
          const closed = convertObjectToClosedContour(
            pendingMerge.obj,
            fillRef.current,
            true
          );
          if (closed) {
            const idx = fc.getObjects().indexOf(pendingMerge.obj);
            fc.remove(pendingMerge.obj);
            if (idx >= 0) {
              fc.insertAt(closed, idx, false);
            } else {
              fc.add(closed);
            }
            fc.setActiveObject(closed);
            fc.requestRenderAll();
            refreshSelectedInfo();
            saveHistory();
            return;
          }
        } else if (
          pendingMerge.snap.targetObj &&
          fc.getObjects().includes(pendingMerge.snap.targetObj)
        ) {
          const merged = mergeTwoOpenObjects(
            pendingMerge.obj,
            pendingMerge.end,
            pendingMerge.snap.targetObj,
            pendingMerge.snap.targetEnd,
            fillRef.current
          );
          if (merged) {
            fc.remove(pendingMerge.obj);
            fc.remove(pendingMerge.snap.targetObj);
            fc.add(merged);
            attachControlsToObject(merged);
            fc.setActiveObject(merged);
            fc.requestRenderAll();
            refreshSelectedInfo();
            saveHistory();
            return;
          }
        }
      }

      if (
        e?.target &&
        (e.target.type === 'polygon' ||
          e.target.type === 'rect' ||
          e.target.type === 'path') &&
        typeof e.target.cornerRoundRatio === 'number' &&
        e.target.cornerRoundRatio > 0
      ) {
        applyCornerRoundingToObject(e.target, e.target.cornerRoundRatio);
      }
      if (e?.target) {
        attachControlsToObject(e.target);
      }
      refreshSelectedInfo();
      saveHistory();
    });

    let lastTapTime = 0;
    let lastTapTarget: any = null;

    // Mouse / Pointer Down
    fc.on('mouse:down', (opt: any) => {
      const rawEvt = opt.e as MouseEvent | TouchEvent;

      // Hide initial "Just draw" prompt immediately when user starts interacting
      setIsCanvasEmpty(false);

      // Close open tool popovers when user interacts with canvas, keeping sidebar visible until Eye is clicked
      if (sidebarOpenRef.current) {
        setActivePopover(null);
      }

      // Middle mouse button or Space+Drag panning
      if (
        isSpaceHeldRef.current ||
        ('button' in rawEvt && rawEvt.button === 1)
      ) {
        isPanningDragRef.current = true;
        const clientX = 'clientX' in rawEvt ? rawEvt.clientX : 0;
        const clientY = 'clientY' in rawEvt ? rawEvt.clientY : 0;
        lastPanClientRef.current = { x: clientX, y: clientY };
        fc.defaultCursor = 'grabbing';
        return;
      }

      if ('button' in rawEvt && rawEvt.button === 2) {
        return;
      }

      if (isPinchingRef.current) return;

      const mode = activeModeRef.current;

      // Double-tap detection for touch IText editing
      if (mode === 'select' && opt.target && opt.target.type === 'i-text') {
        const now = Date.now();
        if (lastTapTarget === opt.target && now - lastTapTime < 350) {
          opt.target.enterEditing();
          opt.target.selectAll();
          lastTapTime = 0;
          lastTapTarget = null;
          return;
        }
        lastTapTime = now;
        lastTapTarget = opt.target;
      }

      // If editing a Bezier curve:
      if (bezierSessionRef.current) {
        const session = bezierSessionRef.current;
        const tObj = opt.target;
        const isHandle =
          tObj === session.h0 ||
          tObj === session.hc1 ||
          tObj === session.hc2 ||
          tObj === session.h3;
        if (isHandle) {
          return;
        }
        finalizeBezierSession(false);
        if (mode !== 'bezier') return;
      }

      if (mode === 'select') {
        const activeObj = fc.getActiveObject();
        const pressedCorner = opt.transform?.corner || activeObj?.__corner;
        const isCornerNode =
          pressedCorner === 'tl' ||
          pressedCorner === 'tr' ||
          pressedCorner === 'bl' ||
          pressedCorner === 'br';

        if (activeObj && isObjectCornerRoundable(activeObj) && isCornerNode) {
          const startPt = getCanvasRelativePoint(rawEvt);
          const rect = getObjectScreenRect(activeObj);
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const dx = centerX - startPt.x;
          const dy = centerY - startPt.y;
          const len = Math.hypot(dx, dy) || 1;
          const dirX = dx / len;
          const dirY = dy / len;
          const maxTravel = Math.max(26, Math.min(rect.width, rect.height) * 0.42);

          if (cornerRoundingArmedObjRef.current === activeObj) {
            // Already armed via long-tap: drag immediately rounds corners!
            fc._currentTransform = null;
            const startRatio = getObjectCornerRoundRatio(activeObj) ?? 0;
            cornerRoundingDragRef.current = {
              obj: activeObj,
              startPt,
              dirX,
              dirY,
              maxTravel,
              startRatio,
              movedPx: 0,
            };
            setCornerRoundHud({ percent: Math.round(startRatio * 100), armed: true });
            return;
          }

          clearCornerLongPressTimer();
          const preLeft = activeObj.left;
          const preTop = activeObj.top;
          const preScaleX = activeObj.scaleX;
          const preScaleY = activeObj.scaleY;

          pendingCornerPressRef.current = {
            obj: activeObj,
            startPt,
            dirX,
            dirY,
            maxTravel,
            preLeft,
            preTop,
            preScaleX,
            preScaleY,
          };

          longPressCornerTimerRef.current = window.setTimeout(() => {
            const pending = pendingCornerPressRef.current;
            longPressCornerTimerRef.current = null;
            pendingCornerPressRef.current = null;
            if (!pending || isPinchingRef.current) return;

            // Cancel normal scale transform and restore exact pre-press bounds
            fc._currentTransform = null;
            pending.obj.set({
              left: pending.preLeft,
              top: pending.preTop,
              scaleX: pending.preScaleX,
              scaleY: pending.preScaleY,
              cornerColor: '#F59E0B',
              borderColor: '#F59E0B',
            });
            pending.obj.setCoords();

            if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
              navigator.vibrate(18);
            }

            const startRatio = getObjectCornerRoundRatio(pending.obj) ?? 0;
            cornerRoundingArmedObjRef.current = pending.obj;
            cornerRoundingDragRef.current = {
              obj: pending.obj,
              startPt: pending.startPt,
              dirX: pending.dirX,
              dirY: pending.dirY,
              maxTravel: pending.maxTravel,
              startRatio,
              movedPx: 0,
            };
            setCornerRoundHud({ percent: Math.round(startRatio * 100), armed: true });
            fc.requestRenderAll();
            refreshSelectedInfo();
          }, 360);
          return;
        }

        if (cornerRoundingArmedObjRef.current) {
          disarmCornerRounding();
        }
        if (opt.target && !opt.target.excludeFromExport && !opt.target.isEraserPath) {
          bringTargetToFrontLayer(opt.target);
        }
        return;
      }

      if (mode === 'brush' || mode === 'eraser') {
        return;
      }

      // Start drawing a shape / line / bezier / arrow
      const pt = fc.getPointer(rawEvt);
      const zoom = fc.getZoom() || 1;
      const rawWidth = strokeRef.current.width;
      const isClosedShapeMode =
        mode === 'rect' ||
        mode === 'triangle' ||
        mode === 'ellipse' ||
        mode === 'star' ||
        (mode === 'arrow' &&
          (arrowVariantRef.current === 'filled' ||
            arrowVariantRef.current === 'filledDouble'));
      const shapeStrokeWidth =
        isClosedShapeMode && fillRef.current.mode !== 'none'
          ? rawWidth
          : Math.max(1, rawWidth);
      const dash = getScaledDashArray(strokeRef.current.pattern, shapeStrokeWidth);
      const effectiveStroke = applyColorOpacity(
        strokeRef.current.color,
        strokeRef.current.opacity
      );
      const fillVal = buildFillValue(fillRef.current);
      const fillMetaCopy = { ...fillRef.current };
      const commonStroke = {
        stroke: shapeStrokeWidth > 0 ? effectiveStroke : null,
        strokeColorHex: strokeRef.current.color,
        strokeOpacity: strokeRef.current.opacity,
        strokeWidth: shapeStrokeWidth,
        strokeDashArray: dash || undefined,
        strokePattern: strokeRef.current.pattern,
        doubleLine: strokeRef.current.doubleLine,
        strokeUniform: true,
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
        selectable: false,
        evented: false,
      };
      const closedHitProps = {
        perPixelTargetFind: false,
        targetFindTolerance: 16,
      };

      // If in active multi-segment contour session for Line tool:
      if (mode === 'line' && contourSessionRef.current) {
        const cSess = contourSessionRef.current;
        const extraFirst = cSess.points.length >= 3 ? cSess.points[0] : null;
        const snap = snapEnabledRef.current
          ? findNearestEndpointSnap(fc, pt, [cSess.pathObj], zoom, extraFirst)
          : extraFirst &&
              Math.hypot(pt.x - extraFirst.x, pt.y - extraFirst.y) <=
                16 / Math.max(0.15, zoom)
            ? {
                point: extraFirst,
                targetObj: null,
                targetEnd: 'self' as const,
                distance: 0,
              }
            : null;
        const snappedPt = snap ? snap.point : pt;
        if (snap && snap.targetEnd === 'self' && cSess.points.length >= 3) {
          finalizeContourSession(false);
          return;
        }
        const prevLast = cSess.points[cSess.points.length - 1];
        isDrawingShapeRef.current = true;
        shapeStartRef.current = { x: prevLast.x, y: prevLast.y };
        pendingLineStartSnapRef.current = null;
        pendingLineEndSnapRef.current = snap;
        const segPreview = new fabric.Line(
          [prevLast.x, prevLast.y, snappedPt.x, snappedPt.y],
          {
            ...commonStroke,
            stroke: rawWidth > 0 ? effectiveStroke : '#3B82F6',
            strokeWidth: rawWidth > 0 ? rawWidth : 1.5,
          }
        );
        tempShapeRef.current = segPreview;
        fc.add(segPreview);
        fc.requestRenderAll();
        return;
      }

      let startPt = { x: pt.x, y: pt.y };
      pendingLineStartSnapRef.current = null;
      pendingLineEndSnapRef.current = null;
      if ((mode === 'line' || mode === 'bezier') && snapEnabledRef.current) {
        const sSnap = findNearestEndpointSnap(fc, pt, [], zoom);
        if (sSnap) {
          startPt = { x: sSnap.point.x, y: sSnap.point.y };
          pendingLineStartSnapRef.current = sSnap;
        }
      }

      isDrawingShapeRef.current = true;
      shapeStartRef.current = startPt;

      let shape: any = null;
      if (mode === 'line' || mode === 'bezier') {
        shape = new fabric.Line([startPt.x, startPt.y, startPt.x, startPt.y], {
          ...commonStroke,
          originX: 'center',
          originY: 'center',
          strokeDashArray: mode === 'bezier' ? [6, 4] : dash || undefined,
          doubleLine: mode === 'bezier' ? false : strokeRef.current.doubleLine,
        });
      } else if (mode === 'rect') {
        shape = new fabric.Rect({
          left: startPt.x,
          top: startPt.y,
          width: 0,
          height: 0,
          fill: fillVal,
          fillMeta: fillMetaCopy,
          isGridRect: rectGridRef.current.enabled,
          gridRows: rectGridRef.current.rows,
          gridCols: rectGridRef.current.cols,
          ...commonStroke,
          ...closedHitProps,
        });
      } else if (mode === 'triangle') {
        shape = new fabric.Triangle({
          left: startPt.x,
          top: startPt.y,
          width: 0,
          height: 0,
          fill: fillVal,
          fillMeta: fillMetaCopy,
          ...commonStroke,
          ...closedHitProps,
        });
      } else if (mode === 'ellipse') {
        shape = new fabric.Ellipse({
          left: startPt.x,
          top: startPt.y,
          rx: 0,
          ry: 0,
          fill: fillVal,
          fillMeta: fillMetaCopy,
          ...commonStroke,
          ...closedHitProps,
        });
      } else if (mode === 'star') {
        shape = new fabric.Polygon(
          buildPolygonPoints(polygonVariantRef.current, startPt.x, startPt.y, 2, 2),
          {
            fill: fillVal,
            fillMeta: fillMetaCopy,
            ...commonStroke,
            ...closedHitProps,
          }
        );
      } else if (mode === 'arrow') {
        const curVariant = arrowVariantRef.current;
        const isBlockArrow = curVariant === 'filled' || curVariant === 'filledDouble';
        shape = createArrowObject(
          startPt.x,
          startPt.y,
          startPt.x + 1,
          startPt.y + 1,
          effectiveStroke,
          shapeStrokeWidth,
          dash,
          strokeRef.current.doubleLine,
          curVariant,
          isBlockArrow ? fillVal : undefined,
          {
            selectable: false,
            evented: false,
            strokeColorHex: strokeRef.current.color,
            strokeOpacity: strokeRef.current.opacity,
            strokePattern: strokeRef.current.pattern,
            fillMeta: isBlockArrow ? fillMetaCopy : undefined,
          }
        );
      }

      if (shape) {
        tempShapeRef.current = shape;
        fc.add(shape);
        fc.requestRenderAll();
      }
    });

    // Mouse / Pointer Move
    fc.on('mouse:move', (opt: any) => {
      const rawEvt = opt.e as MouseEvent | TouchEvent;

      if (isPanningDragRef.current) {
        const clientX = 'clientX' in rawEvt ? rawEvt.clientX : 0;
        const clientY = 'clientY' in rawEvt ? rawEvt.clientY : 0;
        const dx = clientX - lastPanClientRef.current.x;
        const dy = clientY - lastPanClientRef.current.y;
        lastPanClientRef.current = { x: clientX, y: clientY };
        fc.relativePan(new fabric.Point(dx, dy));
        refreshSelectedInfo();
        return;
      }

      if (cornerRoundingDragRef.current) {
        if (fc._currentTransform) {
          fc._currentTransform = null;
        }
        const drag = cornerRoundingDragRef.current;
        const currPt = getCanvasRelativePoint(rawEvt);
        const dragDist = Math.hypot(currPt.x - drag.startPt.x, currPt.y - drag.startPt.y);
        drag.movedPx = Math.max(drag.movedPx, dragDist);

        const inwardDelta =
          (currPt.x - drag.startPt.x) * drag.dirX +
          (currPt.y - drag.startPt.y) * drag.dirY;
        const nextRatio = Math.max(
          0,
          Math.min(1, drag.startRatio + inwardDelta / drag.maxTravel)
        );
        applyCornerRoundingToObject(drag.obj, nextRatio);
        fc.requestRenderAll();
        refreshSelectedInfo();
        setCornerRoundHud({ percent: Math.round(nextRatio * 100), armed: true });
        return;
      }

      if (pendingCornerPressRef.current) {
        const currPt = getCanvasRelativePoint(rawEvt);
        const pStart = pendingCornerPressRef.current.startPt;
        if (Math.hypot(currPt.x - pStart.x, currPt.y - pStart.y) > 8) {
          clearCornerLongPressTimer();
        }
      }

      if (!isDrawingShapeRef.current || !tempShapeRef.current || isPinchingRef.current) {
        const mode = activeModeRef.current;
        if (!isPinchingRef.current && (mode === 'line' || mode === 'bezier')) {
          const hoverPt = fc.getPointer(rawEvt);
          const zoom = fc.getZoom() || 1;
          const cSess = contourSessionRef.current;
          const extraFirst = cSess && cSess.points.length >= 3 ? cSess.points[0] : null;
          const snap = snapEnabledRef.current
            ? findNearestEndpointSnap(
                fc,
                hoverPt,
                cSess ? [cSess.pathObj] : [],
                zoom,
                extraFirst
              )
            : extraFirst &&
                Math.hypot(hoverPt.x - extraFirst.x, hoverPt.y - extraFirst.y) <=
                  16 / Math.max(0.15, zoom)
              ? {
                  point: extraFirst,
                  targetObj: null,
                  targetEnd: 'self' as const,
                  distance: 0,
                }
              : null;
          const nextSnapPt = snap ? snap.point : null;
          const prevSnap = snapIndicatorRef.current;
          const changed =
            (prevSnap === null) !== (nextSnapPt === null) ||
            (prevSnap &&
              nextSnapPt &&
              (prevSnap.x !== nextSnapPt.x || prevSnap.y !== nextSnapPt.y));
          snapIndicatorRef.current = nextSnapPt;
          if (changed) {
            fc.requestRenderAll();
          }
        } else if (snapIndicatorRef.current && !fc._currentTransform) {
          snapIndicatorRef.current = null;
          fc.requestRenderAll();
        }
        return;
      }

      const pt = fc.getPointer(rawEvt);
      const sx = shapeStartRef.current.x;
      const sy = shapeStartRef.current.y;
      let ex = pt.x;
      let ey = pt.y;

      const shift = 'shiftKey' in rawEvt && rawEvt.shiftKey;
      const mode = activeModeRef.current;

      if (
        shift &&
        (mode === 'rect' || mode === 'ellipse' || mode === 'triangle' || mode === 'star')
      ) {
        const dx = ex - sx;
        const dy = ey - sy;
        const side = Math.max(Math.abs(dx), Math.abs(dy));
        ex = sx + Math.sign(dx || 1) * side;
        ey = sy + Math.sign(dy || 1) * side;
      } else if (shift && (mode === 'line' || mode === 'arrow' || mode === 'bezier')) {
        const dx = ex - sx;
        const dy = ey - sy;
        const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
        const dist = Math.hypot(dx, dy);
        ex = sx + Math.cos(angle) * dist;
        ey = sy + Math.sin(angle) * dist;
      }

      const shape = tempShapeRef.current;

      if (mode === 'line' || mode === 'bezier') {
        const zoom = fc.getZoom() || 1;
        const cSess = contourSessionRef.current;
        const extraFirst = cSess && cSess.points.length >= 3 ? cSess.points[0] : null;
        const exclude = cSess ? [shape, cSess.pathObj] : [shape];
        const endSnap = snapEnabledRef.current
          ? findNearestEndpointSnap(fc, { x: ex, y: ey }, exclude, zoom, extraFirst)
          : extraFirst &&
              Math.hypot(ex - extraFirst.x, ey - extraFirst.y) <=
                16 / Math.max(0.15, zoom)
            ? {
                point: extraFirst,
                targetObj: null,
                targetEnd: 'self' as const,
                distance: 0,
              }
            : null;
        if (endSnap) {
          ex = endSnap.point.x;
          ey = endSnap.point.y;
          snapIndicatorRef.current = endSnap.point;
          pendingLineEndSnapRef.current = endSnap;
        } else {
          snapIndicatorRef.current = null;
          pendingLineEndSnapRef.current = null;
        }
      }

      const left = Math.min(sx, ex);
      const top = Math.min(sy, ey);
      const width = Math.abs(ex - sx);
      const height = Math.abs(ey - sy);
      const effectiveStroke = applyColorOpacity(
        strokeRef.current.color,
        strokeRef.current.opacity
      );

      if (mode === 'line' || mode === 'bezier') {
        shape.set({ x2: ex, y2: ey });
        if (contourSessionRef.current?.previewLine) {
          const firstPt = contourSessionRef.current.points[0];
          contourSessionRef.current.previewLine.set({
            x1: ex,
            y1: ey,
            x2: firstPt.x,
            y2: firstPt.y,
          });
        }
      } else if (mode === 'rect' || mode === 'triangle') {
        shape.set({ left, top, width, height });
      } else if (mode === 'ellipse') {
        shape.set({ left, top, rx: width / 2, ry: height / 2 });
      } else if (mode === 'star') {
        const cx = left + width / 2;
        const cy = top + height / 2;
        const rx = Math.max(2, width / 2);
        const ry = Math.max(2, height / 2);
        const polyStrokeWidth =
          fillRef.current.mode !== 'none'
            ? strokeRef.current.width
            : Math.max(1, strokeRef.current.width);
        const dash = getScaledDashArray(strokeRef.current.pattern, polyStrokeWidth);
        const fillVal = buildFillValue(fillRef.current);
        fc.remove(shape);
        const nextPoly = new fabric.Polygon(
          buildPolygonPoints(polygonVariantRef.current, cx, cy, rx, ry),
          {
            fill: fillVal,
            fillMeta: { ...fillRef.current },
            stroke: polyStrokeWidth > 0 ? effectiveStroke : null,
            strokeColorHex: strokeRef.current.color,
            strokeOpacity: strokeRef.current.opacity,
            strokeWidth: polyStrokeWidth,
            strokeDashArray: dash || undefined,
            strokePattern: strokeRef.current.pattern,
            doubleLine: strokeRef.current.doubleLine,
            strokeUniform: true,
            strokeLineJoin: 'round',
            perPixelTargetFind: false,
            targetFindTolerance: 16,
            selectable: false,
            evented: false,
          }
        );
        tempShapeRef.current = nextPoly;
        fc.add(nextPoly);
      } else if (mode === 'arrow') {
        const curVariant = arrowVariantRef.current;
        const isBlockArrow = curVariant === 'filled' || curVariant === 'filledDouble';
        const arrowStrokeWidth =
          isBlockArrow && fillRef.current.mode !== 'none'
            ? strokeRef.current.width
            : Math.max(1, strokeRef.current.width);
        const dash = getScaledDashArray(strokeRef.current.pattern, arrowStrokeWidth);
        const arrowFillVal = isBlockArrow ? buildFillValue(fillRef.current) : undefined;
        fc.remove(shape);
        const nextArrow = createArrowObject(
          sx,
          sy,
          ex,
          ey,
          effectiveStroke,
          arrowStrokeWidth,
          dash,
          strokeRef.current.doubleLine,
          curVariant,
          arrowFillVal,
          {
            selectable: false,
            evented: false,
            strokeColorHex: strokeRef.current.color,
            strokeOpacity: strokeRef.current.opacity,
            strokePattern: strokeRef.current.pattern,
            fillMeta: isBlockArrow ? { ...fillRef.current } : undefined,
          }
        );
        tempShapeRef.current = nextArrow;
        fc.add(nextArrow);
      }

      fc.requestRenderAll();
    });

    // Mouse / Pointer Up
    fc.on('mouse:up', (opt: any) => {
      clearCornerLongPressTimer();
      snapIndicatorRef.current = null;

      if (cornerRoundingDragRef.current) {
        const drag = cornerRoundingDragRef.current;
        cornerRoundingDragRef.current = null;
        if (drag.movedPx >= 6) {
          drag.obj.set({
            cornerColor: '#2563EB',
            borderColor: '#2563EB',
          });
          drag.obj.setCoords();
          cornerRoundingArmedObjRef.current = null;
          setCornerRoundHud(null);
          fc.requestRenderAll();
          refreshSelectedInfo();
          saveHistory();
        } else {
          // User released right after long-tap activation: keep corner handles armed
          const pct = Math.round((getObjectCornerRoundRatio(drag.obj) ?? 0) * 100);
          setCornerRoundHud({ percent: pct, armed: true });
        }
        return;
      }

      if (isPanningDragRef.current) {
        isPanningDragRef.current = false;
        fc.defaultCursor = isSpaceHeldRef.current ? 'grab' : 'default';
        return;
      }

      if (!isDrawingShapeRef.current || !tempShapeRef.current) {
        if (zOrderChangedOnTap) {
          zOrderChangedOnTap = false;
          saveHistory();
        }
        return;
      }
      isDrawingShapeRef.current = false;

      const pt = fc.getPointer(opt.e);
      const sx = shapeStartRef.current.x;
      const sy = shapeStartRef.current.y;
      const mode = activeModeRef.current;
      const shape = tempShapeRef.current;
      tempShapeRef.current = null;

      const endX = mode === 'line' || mode === 'bezier' ? shape.x2 : pt.x;
      const endY = mode === 'line' || mode === 'bezier' ? shape.y2 : pt.y;
      const dist = Math.hypot(endX - sx, endY - sy);
      const startSnap = pendingLineStartSnapRef.current;
      const endSnap = pendingLineEndSnapRef.current;
      pendingLineStartSnapRef.current = null;
      pendingLineEndSnapRef.current = null;

      // Multi-segment closed contour mode for Line tool
      if (mode === 'line' && contourSessionRef.current) {
        const cSess = contourSessionRef.current;
        fc.remove(shape);
        const nextPt = dist < 4 ? pt : { x: endX, y: endY };
        const finalPt = endSnap ? endSnap.point : nextPt;
        const firstPt = cSess.points[0];

        if (
          cSess.points.length >= 3 &&
          Math.hypot(finalPt.x - firstPt.x, finalPt.y - firstPt.y) <=
            16 / Math.max(0.15, fc.getZoom() || 1)
        ) {
          finalizeContourSession(false);
          return;
        }

        if (
          Math.hypot(
            finalPt.x - cSess.points[cSess.points.length - 1].x,
            finalPt.y - cSess.points[cSess.points.length - 1].y
          ) < 3
        ) {
          fc.requestRenderAll();
          return;
        }

        cSess.points.push(finalPt);
        const segs = [];
        for (let i = 0; i < cSess.points.length - 1; i++) {
          segs.push({ type: 'L' as const, from: cSess.points[i], to: cSess.points[i + 1] });
        }
        const previewW =
          strokeRef.current.width > 0 ? strokeRef.current.width : 1.5;
        const previewStrokeVal =
          strokeRef.current.width > 0
            ? applyColorOpacity(strokeRef.current.color, strokeRef.current.opacity)
            : '#3B82F6';
        const dash = getScaledDashArray(strokeRef.current.pattern, previewW);
        const nextPreviewPath = buildFabricPathFromWorldSegments(
          segs,
          {
            stroke: previewStrokeVal,
            strokeColorHex: strokeRef.current.color,
            strokeOpacity: strokeRef.current.opacity,
            strokeWidth: previewW,
            strokeDashArray: dash || undefined,
            strokePattern: strokeRef.current.pattern,
            doubleLine: strokeRef.current.doubleLine,
            brushType: 'standard',
          },
          false,
          fillRef.current,
          false
        );
        if (nextPreviewPath) {
          fc.remove(cSess.pathObj);
          fc.add(nextPreviewPath);
          cSess.pathObj = nextPreviewPath;
          if (cSess.previewLine) {
            cSess.previewLine.set({
              x1: finalPt.x,
              y1: finalPt.y,
              x2: firstPt.x,
              y2: firstPt.y,
            });
            fc.bringToFront(cSess.previewLine);
          }
          if (cSess.startMarker) {
            fc.bringToFront(cSess.startMarker);
          }
        }
        fc.requestRenderAll();
        return;
      }

      if (dist < 4) {
        fc.remove(shape);
        fc.requestRenderAll();
        refreshEmptyState();
        return;
      }

      if (mode === 'line' && closedContourRef.current) {
        fc.remove(shape);
        const p0 = { x: sx, y: sy };
        const p1 = { x: endX, y: endY };
        const previewW =
          strokeRef.current.width > 0 ? strokeRef.current.width : 1.5;
        const previewStrokeVal =
          strokeRef.current.width > 0
            ? applyColorOpacity(strokeRef.current.color, strokeRef.current.opacity)
            : '#3B82F6';
        const dash = getScaledDashArray(strokeRef.current.pattern, previewW);
        const pathObj = buildFabricPathFromWorldSegments(
          [{ type: 'L', from: p0, to: p1 }],
          {
            stroke: previewStrokeVal,
            strokeColorHex: strokeRef.current.color,
            strokeOpacity: strokeRef.current.opacity,
            strokeWidth: previewW,
            strokeDashArray: dash || undefined,
            strokePattern: strokeRef.current.pattern,
            doubleLine: strokeRef.current.doubleLine,
            brushType: 'standard',
          },
          false,
          fillRef.current,
          false
        );
        const previewLine = new fabric.Line([p1.x, p1.y, p0.x, p0.y], {
          stroke: '#3B82F6',
          strokeWidth: 1.5,
          strokeDashArray: [5, 5],
          selectable: false,
          evented: false,
          excludeFromExport: true,
        });
        const startMarker = new fabric.Circle({
          left: p0.x,
          top: p0.y,
          originX: 'center',
          originY: 'center',
          radius: 7,
          fill: '#10B981',
          stroke: '#FFFFFF',
          strokeWidth: 2,
          selectable: false,
          evented: false,
          excludeFromExport: true,
        });
        fc.add(pathObj, previewLine, startMarker);
        contourSessionRef.current = {
          points: [p0, p1],
          pathObj,
          previewLine,
          startMarker,
        };
        setIsEditingContour(true);
        fc.requestRenderAll();
        return;
      }

      if (mode === 'bezier') {
        const ex = shape.x2;
        const ey = shape.y2;
        fc.remove(shape);

        const dx = ex - sx;
        const dy = ey - sy;
        const len = Math.max(1, Math.hypot(dx, dy));
        const nx = -dy / len;
        const ny = dx / len;
        const curveOffset = Math.min(48, len * 0.22);

        const p0: Point = { x: sx, y: sy };
        const p3: Point = { x: ex, y: ey };
        const cp1: Point = {
          x: sx + dx * 0.33 + nx * curveOffset,
          y: sy + dy * 0.33 + ny * curveOffset,
        };
        const cp2: Point = {
          x: sx + dx * 0.67 - nx * curveOffset,
          y: sy + dy * 0.67 - ny * curveOffset,
        };

        const isClosedBez = closedContourRef.current;
        const bezWidth =
          isClosedBez && fillRef.current.mode !== 'none'
            ? strokeRef.current.width
            : Math.max(1, strokeRef.current.width);
        const dash = getScaledDashArray(strokeRef.current.pattern, bezWidth);
        const effectiveStroke = applyColorOpacity(
          strokeRef.current.color,
          strokeRef.current.opacity
        );
        const makePath = (a: Point, b: Point, c: Point, d: Point) =>
          new fabric.Path(
            `M ${a.x} ${a.y} C ${b.x} ${b.y} ${c.x} ${c.y} ${d.x} ${d.y}${isClosedBez ? ' Z' : ''}`,
            {
              fill: isClosedBez ? buildFillValue(fillRef.current) : 'transparent',
              fillMeta: isClosedBez ? { ...fillRef.current } : undefined,
              isClosedContour: isClosedBez,
              stroke: bezWidth > 0 ? effectiveStroke : null,
              strokeColorHex: strokeRef.current.color,
              strokeOpacity: strokeRef.current.opacity,
              strokeWidth: bezWidth,
              strokeDashArray: dash || undefined,
              strokePattern: strokeRef.current.pattern,
              doubleLine: strokeRef.current.doubleLine,
              strokeUniform: true,
              strokeLineCap: 'round',
              perPixelTargetFind: !isClosedBez,
              targetFindTolerance: 16,
              selectable: false,
              evented: false,
            }
          );

        const pathObj = makePath(p0, cp1, cp2, p3);
        const g1 = new fabric.Line([p0.x, p0.y, cp1.x, cp1.y], {
          stroke: '#3B82F6',
          strokeWidth: 1.5,
          strokeDashArray: [4, 4],
          selectable: false,
          evented: false,
          excludeFromExport: true,
        });
        const g2 = new fabric.Line([p3.x, p3.y, cp2.x, cp2.y], {
          stroke: '#3B82F6',
          strokeWidth: 1.5,
          strokeDashArray: [4, 4],
          selectable: false,
          evented: false,
          excludeFromExport: true,
        });

        const makeHandle = (pos: Point, isControl: boolean) =>
          new fabric.Circle({
            left: pos.x,
            top: pos.y,
            originX: 'center',
            originY: 'center',
            radius: isControl ? 8 : 9,
            fill: isControl ? '#2563EB' : '#FFFFFF',
            stroke: '#2563EB',
            strokeWidth: 2.5,
            hasControls: false,
            hasBorders: false,
            padding: 16,
            selectable: true,
            evented: true,
            excludeFromExport: true,
          });

        const h0 = makeHandle(p0, false);
        const hc1 = makeHandle(cp1, true);
        const hc2 = makeHandle(cp2, true);
        const h3 = makeHandle(p3, false);

        fc.add(pathObj, g1, g2, h0, hc1, hc2, h3);
        bezierSessionRef.current = {
          pathObj,
          p0,
          cp1,
          cp2,
          p3,
          h0,
          hc1,
          hc2,
          h3,
          g1,
          g2,
        };
        setIsEditingBezier(true);
        fc.setActiveObject(hc1);
        fc.requestRenderAll();
        return;
      }

      let finalShape = shape;
      if (mode === 'line') {
        if (
          startSnap &&
          startSnap.targetObj &&
          startSnap.targetEnd !== 'self' &&
          fc.getObjects().includes(startSnap.targetObj)
        ) {
          const merged = mergeTwoOpenObjects(
            finalShape,
            'start',
            startSnap.targetObj,
            startSnap.targetEnd,
            fillRef.current
          );
          if (merged) {
            fc.remove(finalShape);
            fc.remove(startSnap.targetObj);
            fc.add(merged);
            finalShape = merged;
          }
        }
        if (
          endSnap &&
          endSnap.targetObj &&
          endSnap.targetEnd !== 'self' &&
          endSnap.targetObj !== startSnap?.targetObj &&
          fc.getObjects().includes(endSnap.targetObj)
        ) {
          const merged2 = mergeTwoOpenObjects(
            finalShape,
            'end',
            endSnap.targetObj,
            endSnap.targetEnd,
            fillRef.current
          );
          if (merged2) {
            fc.remove(finalShape);
            fc.remove(endSnap.targetObj);
            fc.add(merged2);
            finalShape = merged2;
          }
        }
      } else if (mode === 'triangle') {
        const left = shape.left || 0;
        const top = shape.top || 0;
        const w = Math.max(2, shape.width || 2);
        const h = Math.max(2, shape.height || 2);
        const triPts = [
          { x: left + w / 2, y: top },
          { x: left + w, y: top + h },
          { x: left, y: top + h },
        ];
        fc.remove(shape);
        finalShape = new fabric.Polygon(triPts, {
          fill: shape.fill,
          fillMeta: shape.fillMeta,
          stroke: shape.stroke,
          strokeColorHex: shape.strokeColorHex,
          strokeOpacity: shape.strokeOpacity,
          strokeWidth: shape.strokeWidth,
          strokeDashArray: shape.strokeDashArray,
          strokePattern: shape.strokePattern,
          doubleLine: shape.doubleLine,
          strokeUniform: true,
          strokeLineJoin: 'round',
          perPixelTargetFind: shape.perPixelTargetFind,
          targetFindTolerance: shape.targetFindTolerance,
          selectable: true,
          evented: true,
        });
        finalShape.set({
          baseLocalPoints: finalShape.points.map((p: any) => ({ x: p.x, y: p.y })),
          baseWidth: finalShape.width,
          baseHeight: finalShape.height,
          basePathOffset: {
            x: finalShape.pathOffset?.x || 0,
            y: finalShape.pathOffset?.y || 0,
          },
          cornerRoundRatio: 0,
          shapeSubtype: 'triangle',
        });
        fc.add(finalShape);
      } else if (mode === 'star') {
        finalShape.set({
          baseLocalPoints: finalShape.points.map((p: any) => ({ x: p.x, y: p.y })),
          baseWidth: finalShape.width,
          baseHeight: finalShape.height,
          basePathOffset: {
            x: finalShape.pathOffset?.x || 0,
            y: finalShape.pathOffset?.y || 0,
          },
          cornerRoundRatio: 0,
          shapeSubtype: polygonVariantRef.current,
        });
      } else if (mode === 'rect') {
        finalShape.set({ cornerRoundRatio: 0 });
      }

      // Immediately make newly drawn shape/line/arrow selectable with bounding box handles!
      setActiveMode('select');
      activeModeRef.current = 'select';
      syncFabricToolState();
      attachControlsToObject(finalShape);
      finalShape.set({ selectable: true, evented: true });
      finalShape.setCoords();
      fc.setActiveObject(finalShape);
      fc.requestRenderAll();
      refreshSelectedInfo();
      saveHistory();
    });

    // Live Bezier Handle Dragging + Endpoint Snapping + Bounding Box Sync
    fc.on('object:moving', (opt: any) => {
      const session = bezierSessionRef.current;
      const target = opt.target;

      if (
        session &&
        (target === session.h0 ||
          target === session.hc1 ||
          target === session.hc2 ||
          target === session.h3)
      ) {
        let nx = target.left;
        let ny = target.top;
        let autoCloseSelf = false;
        if ((target === session.h0 || target === session.h3) && snapEnabledRef.current) {
          const otherPt = target === session.h0 ? session.p3 : session.p0;
          const snap = findNearestEndpointSnap(
            fc,
            { x: nx, y: ny },
            [session.pathObj],
            fc.getZoom() || 1,
            otherPt
          );
          if (snap) {
            nx = snap.point.x;
            ny = snap.point.y;
            target.set({ left: nx, top: ny });
            snapIndicatorRef.current = snap.point;
            if (snap.targetEnd === 'self') {
              autoCloseSelf = true;
            }
          } else {
            snapIndicatorRef.current = null;
          }
        }

        if (target === session.h0) {
          session.p0 = { x: nx, y: ny };
        } else if (target === session.hc1) {
          session.cp1 = { x: nx, y: ny };
        } else if (target === session.hc2) {
          session.cp2 = { x: nx, y: ny };
        } else if (target === session.h3) {
          session.p3 = { x: nx, y: ny };
        }

        session.g1.set({
          x1: session.p0.x,
          y1: session.p0.y,
          x2: session.cp1.x,
          y2: session.cp1.y,
        });
        session.g2.set({
          x1: session.p3.x,
          y1: session.p3.y,
          x2: session.cp2.x,
          y2: session.cp2.y,
        });

        const oldPath = session.pathObj;
        const isClosedBez =
          closedContourRef.current ||
          autoCloseSelf ||
          Math.hypot(session.p3.x - session.p0.x, session.p3.y - session.p0.y) <= 3.5;
        const nextPath = new fabric.Path(
          `M ${session.p0.x} ${session.p0.y} C ${session.cp1.x} ${session.cp1.y} ${session.cp2.x} ${session.cp2.y} ${session.p3.x} ${session.p3.y}${isClosedBez ? ' Z' : ''}`,
          {
            fill: isClosedBez ? buildFillValue(fillRef.current) : 'transparent',
            fillMeta: isClosedBez ? { ...fillRef.current } : undefined,
            isClosedContour: isClosedBez,
            stroke: oldPath.stroke,
            strokeColorHex: oldPath.strokeColorHex,
            strokeOpacity: oldPath.strokeOpacity,
            strokeWidth: oldPath.strokeWidth,
            strokeDashArray: oldPath.strokeDashArray,
            strokePattern: oldPath.strokePattern,
            doubleLine: Boolean(oldPath.doubleLine),
            strokeUniform: true,
            strokeLineCap: 'round',
            perPixelTargetFind: !isClosedBez,
            targetFindTolerance: 16,
            selectable: false,
            evented: false,
          }
        );

        const idx = fc.getObjects().indexOf(oldPath);
        fc.remove(oldPath);
        if (idx >= 0) {
          fc.insertAt(nextPath, idx, false);
        } else {
          fc.add(nextPath);
        }
        session.pathObj = nextPath;
        fc.requestRenderAll();
        return;
      }

      if (target && isMergeableOpenLine(target) && snapEnabledRef.current) {
        const eps = getObjectWorldEndpoints(target);
        if (eps) {
          const zoom = fc.getZoom() || 1;
          const sStart = findNearestEndpointSnap(fc, eps.start, [target], zoom);
          const sEnd = findNearestEndpointSnap(fc, eps.end, [target], zoom);
          let chosenEnd: 'start' | 'end' | null = null;
          let chosenSnap: EndpointSnapMatch | null = null;
          let originPt = eps.start;
          if (sStart && (!sEnd || sStart.distance <= sEnd.distance)) {
            chosenEnd = 'start';
            chosenSnap = sStart;
            originPt = eps.start;
          } else if (sEnd) {
            chosenEnd = 'end';
            chosenSnap = sEnd;
            originPt = eps.end;
          }
          if (chosenEnd && chosenSnap) {
            target.set({
              left: (target.left || 0) + (chosenSnap.point.x - originPt.x),
              top: (target.top || 0) + (chosenSnap.point.y - originPt.y),
            });
            target.setCoords();
            snapIndicatorRef.current = chosenSnap.point;
            pendingEndpointMergeRef.current = {
              obj: target,
              end: chosenEnd,
              snap: chosenSnap,
            };
          } else {
            snapIndicatorRef.current = null;
            pendingEndpointMergeRef.current = null;
          }
        }
      }

      refreshSelectedInfo();
    });

    // Save history after finishing IText direct on-canvas editing
    fc.on('text:editing:exited', () => {
      refreshSelectedInfo();
      saveHistory();
    });

    // Desktop Mouse Wheel & Trackpad Pinch Zoom
    fc.on('mouse:wheel', (opt: any) => {
      const evt = opt.e as WheelEvent;
      evt.preventDefault();
      evt.stopPropagation();

      let zoom = fc.getZoom();
      zoom *= 0.999 ** evt.deltaY;
      zoom = Math.max(0.08, Math.min(5, zoom));

      fc.zoomToPoint(new fabric.Point(evt.offsetX, evt.offsetY), zoom);
      setZoomPercent(Math.round(zoom * 100));
      renderBackground();
      refreshSelectedInfo();
    });

    // Mobile 2-Finger Pinch-to-Zoom & Pan Gesture Handler
    const upperEl: HTMLElement | undefined = fc.upperCanvasEl;
    let pinchStartDist = 0;
    let pinchStartZoom = 1;
    let prevPinchMid: Point = { x: 0, y: 0 };

    const getTouchPoint = (touch: Touch): Point => {
      const rect = upperEl!.getBoundingClientRect();
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        lastSingleTouchRef.current = {
          time: Date.now(),
          count: fc.getObjects().length,
        };
      } else if (e.touches.length >= 2) {
        e.preventDefault();
        e.stopPropagation();

        clearCornerLongPressTimer();
        if (cornerRoundingDragRef.current) {
          cornerRoundingDragRef.current = null;
        }

        if (!isPinchingRef.current) {
          isPinchingRef.current = true;

          if (fc._isCurrentlyDrawing) {
            fc._isCurrentlyDrawing = false;
            fc.clearContext(fc.contextTop);
          }
          if (tempShapeRef.current) {
            fc.remove(tempShapeRef.current);
            tempShapeRef.current = null;
            isDrawingShapeRef.current = false;
          }
          if (Date.now() - lastSingleTouchRef.current.time < 220) {
            const objs = fc.getObjects();
            if (objs.length > lastSingleTouchRef.current.count) {
              fc.remove(objs[objs.length - 1]);
            }
          }
        }

        const p1 = getTouchPoint(e.touches[0]);
        const p2 = getTouchPoint(e.touches[1]);
        pinchStartDist = Math.max(1, Math.hypot(p2.x - p1.x, p2.y - p1.y));
        pinchStartZoom = fc.getZoom();
        prevPinchMid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2 && isPinchingRef.current) {
        e.preventDefault();
        e.stopPropagation();

        const p1 = getTouchPoint(e.touches[0]);
        const p2 = getTouchPoint(e.touches[1]);
        const dist = Math.max(1, Math.hypot(p2.x - p1.x, p2.y - p1.y));
        const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

        const dx = mid.x - prevPinchMid.x;
        const dy = mid.y - prevPinchMid.y;
        fc.relativePan(new fabric.Point(dx, dy));

        const nextZoom = Math.max(0.08, Math.min(5, pinchStartZoom * (dist / pinchStartDist)));
        fc.zoomToPoint(new fabric.Point(mid.x, mid.y), nextZoom);
        setZoomPercent(Math.round(nextZoom * 100));

        prevPinchMid = mid;
        renderBackground();
        refreshSelectedInfo();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isPinchingRef.current) {
        if (e.touches.length < 2) {
          e.preventDefault();
          e.stopPropagation();
        }
        if (e.touches.length === 0) {
          isPinchingRef.current = false;
        }
      }
    };

    const handleCanvasContextMenu = (e: Event) => {
      e.preventDefault();
      const pe = e as PointerEvent;
      if (
        pe.pointerType === 'touch' ||
        pendingCornerPressRef.current ||
        cornerRoundingDragRef.current
      ) {
        return;
      }
      setObjectEditorOpen(false);
      let selectedNew = false;
      if (activeModeRef.current === 'select' && typeof fc.findTarget === 'function') {
        const hit = fc.findTarget(e, false);
        if (
          hit &&
          !hit.excludeFromExport &&
          !hit.isEraserPath &&
          hit !== fc.getActiveObject()
        ) {
          fc.setActiveObject(hit);
          fc.requestRenderAll();
          refreshSelectedInfo();
          selectedNew = true;
        }
      }
      if (!selectedNew && sidebarOpenRef.current && activePopoverRef.current === 'shapes') {
        setActivePopover(null);
      } else {
        setSidebarOpen(true);
        setActivePopover('shapes');
      }
    };

    if (upperEl) {
      upperEl.addEventListener('touchstart', handleTouchStart, {
        passive: false,
        capture: true,
      });
      upperEl.addEventListener('touchmove', handleTouchMove, {
        passive: false,
        capture: true,
      });
      upperEl.addEventListener('touchend', handleTouchEnd, {
        passive: false,
        capture: true,
      });
      upperEl.addEventListener('touchcancel', handleTouchEnd, {
        passive: false,
        capture: true,
      });
      upperEl.addEventListener('contextmenu', handleCanvasContextMenu);
    }

    const handleResize = () => {
      fc.setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
      renderBackground();
      refreshSelectedInfo();
      fc.requestRenderAll();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearCornerLongPressTimer();
      window.removeEventListener('resize', handleResize);
      if (upperEl) {
        upperEl.removeEventListener('touchstart', handleTouchStart, true);
        upperEl.removeEventListener('touchmove', handleTouchMove, true);
        upperEl.removeEventListener('touchend', handleTouchEnd, true);
        upperEl.removeEventListener('touchcancel', handleTouchEnd, true);
        upperEl.removeEventListener('contextmenu', handleCanvasContextMenu);
      }
      fc.dispose();
      fabricCanvasRef.current = null;
    };
  }, [
    attachControlsToObject,
    finalizeBezierSession,
    finalizeContourSession,
    refreshEmptyState,
    refreshSelectedInfo,
    renderBackground,
    saveHistory,
    syncFabricToolState,
  ]);

  useEffect(() => {
    syncFabricToolState();
  }, [activeMode, stroke, eraserSize, isSpacePanning, bgConfig, syncFabricToolState]);

  useEffect(() => {
    renderBackground();
  }, [bgConfig, canvasSize, renderBackground]);

  // Keyboard shortcuts
  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      const activeObj = fabricCanvasRef.current?.getActiveObject();
      if (activeObj && activeObj.isEditing) return true;
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        isSpaceHeldRef.current = true;
        setIsSpacePanning(true);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        const active = fc.getActiveObjects();
        if (
          active &&
          active.length > 0 &&
          !bezierSessionRef.current &&
          !contourSessionRef.current
        ) {
          e.preventDefault();
          active.forEach((obj: any) => fc.remove(obj));
          fc.discardActiveObject();
          fc.requestRenderAll();
          setSelectedInfo(null);
          setObjectEditorOpen(false);
          saveHistory();
        }
        return;
      }

      if (e.key === 'Escape') {
        if (bezierSessionRef.current) {
          finalizeBezierSession(false);
        }
        if (contourSessionRef.current) {
          finalizeContourSession(true);
        }
        setActivePopover(null);
        setObjectEditorOpen(false);
        setHelpOpen(false);
      } else if (e.key === 'Enter' && bezierSessionRef.current) {
        e.preventDefault();
        finalizeBezierSession(false);
      } else if (e.key === 'Enter' && contourSessionRef.current) {
        e.preventDefault();
        finalizeContourSession(false);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpaceHeldRef.current = false;
        isPanningDragRef.current = false;
        setIsSpacePanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [finalizeBezierSession, finalizeContourSession, handleRedo, handleUndo, saveHistory]);

  // Sidebar & Tool Handlers
  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => {
      if (prev) {
        setActivePopover(null);
      } else {
        setObjectEditorOpen(false);
      }
      return !prev;
    });
  };

  const handleTogglePopover = (pop: ActivePopover) => {
    setObjectEditorOpen(false);
    setActivePopover((prev) => (prev === pop ? null : pop));
  };

  const ensureOfflineBlob = useCallback(async (): Promise<Blob | null> => {
    if (offlineHtmlBlobRef.current) return offlineHtmlBlobRef.current;
    if (typeof window === 'undefined' || window.location.protocol === 'file:') {
      return null;
    }
    try {
      const res = await fetch('./bestpaint-offline.html', { cache: 'no-store' });
      if (!res.ok) return null;
      const htmlText = await res.text();
      if (htmlText.length < 200000 || !/^<!doctype html/i.test(htmlText.trimStart())) {
        return null;
      }
      const blob = new Blob([htmlText], { type: 'text/html;charset=utf-8' });
      offlineHtmlBlobRef.current = blob;
      return blob;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (activePopover === 'actions') {
      void ensureOfflineBlob();
    }
  }, [activePopover, ensureOfflineBlob]);

  const showOfflineSavedToast = useCallback(() => {
    setActivePopover(null);
    setOfflineToast(true);
    if (offlineToastTimerRef.current) {
      window.clearTimeout(offlineToastTimerRef.current);
    }
    offlineToastTimerRef.current = window.setTimeout(() => {
      setOfflineToast(false);
      offlineToastTimerRef.current = null;
    }, 2600);
  }, []);

  const handleTriggerOfflineDownload = useCallback(() => {
    if (typeof window === 'undefined' || window.location.protocol === 'file:') {
      return;
    }

    const triggerBlobDownload = (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'index.html';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      showOfflineSavedToast();
    };

    if (offlineHtmlBlobRef.current) {
      triggerBlobDownload(offlineHtmlBlobRef.current);
      return;
    }

    void ensureOfflineBlob().then((blob) => {
      if (blob) {
        triggerBlobDownload(blob);
      }
    });
  }, [ensureOfflineBlob, showOfflineSavedToast]);

  const handleSelectMode = (mode: DrawMode) => {
    if (bezierSessionRef.current && mode !== 'bezier') {
      finalizeBezierSession(false);
    }
    if (contourSessionRef.current && mode !== 'line') {
      finalizeContourSession(false);
    }
    if (mode !== 'select') {
      setObjectEditorOpen(false);
    }
    setActiveMode(mode);
  };

  const handleActivateEraser = () => {
    if (bezierSessionRef.current) {
      finalizeBezierSession(false);
    }
    if (contourSessionRef.current) {
      finalizeContourSession(false);
    }
    setObjectEditorOpen(false);
    setActiveMode('eraser');
    setActivePopover((prev) => (prev === 'eraser' ? null : 'eraser'));
  };

  const handleAddText = async (payload: {
    text: string;
    color: string;
    fontFamily: string;
    fontSize: number;
  }) => {
    const fc = fabricCanvasRef.current;
    const fabric = getFabric();
    if (!fc || !fabric) return;

    if (bezierSessionRef.current) {
      finalizeBezierSession(false);
    }
    if (contourSessionRef.current) {
      finalizeContourSession(false);
    }

    try {
      await Promise.race([
        document.fonts.load(`${payload.fontSize}px "${payload.fontFamily}"`),
        new Promise((res) => setTimeout(res, 600)),
      ]);
    } catch {
      // Safe fallback
    }

    const center = fc.getCenter();
    const vpt = fc.viewportTransform || [1, 0, 0, 1, 0, 0];
    const inv = fabric.util.invertTransform(vpt);
    const worldCenter = fabric.util.transformPoint(
      new fabric.Point(center.left, center.top),
      inv
    );

    const textObj = new fabric.IText(payload.text, {
      left: worldCenter.x,
      top: worldCenter.y,
      originX: 'center',
      originY: 'center',
      fontFamily: payload.fontFamily,
      fontSize: payload.fontSize,
      fill: payload.color,
      editable: true,
      hasControls: true,
      hasBorders: true,
      selectable: true,
      evented: true,
    });

    setActiveMode('select');
    activeModeRef.current = 'select';
    fc.add(textObj);
    syncFabricToolState();
    fc.setActiveObject(textObj);
    textObj.setCoords();
    fc.requestRenderAll();
    refreshSelectedInfo();
    saveHistory();

    setActivePopover(null);
  };

  const handleAddEmoji = (emoji: EmojiDefinition) => {
    const fc = fabricCanvasRef.current;
    const fabric = getFabric();
    if (!fc || !fabric) return;

    if (bezierSessionRef.current) {
      finalizeBezierSession(false);
    }
    if (contourSessionRef.current) {
      finalizeContourSession(false);
    }

    const zoom = fc.getZoom() || 1;
    const center = fc.getCenter();
    const vpt = fc.viewportTransform || [1, 0, 0, 1, 0, 0];
    const inv = fabric.util.invertTransform(vpt);
    const worldCenter = fabric.util.transformPoint(
      new fabric.Point(center.left, center.top),
      inv
    );

    const emojiObj = new fabric.IText(emoji.char, {
      left: worldCenter.x,
      top: worldCenter.y,
      originX: 'center',
      originY: 'center',
      fontFamily:
        '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif',
      fontSize: Math.round(60 / Math.max(0.25, zoom)),
      fill: '#000000',
      editable: true,
      hasControls: true,
      hasBorders: true,
      selectable: true,
      evented: true,
    });

    setActiveMode('select');
    activeModeRef.current = 'select';
    fc.add(emojiObj);
    syncFabricToolState();
    fc.setActiveObject(emojiObj);
    emojiObj.setCoords();
    fc.requestRenderAll();
    refreshSelectedInfo();
    saveHistory();

    setActivePopover(null);
  };

  const handleAddStamp = (stamp: StampDefinition, color: string) => {
    const fc = fabricCanvasRef.current;
    const fabric = getFabric();
    if (!fc || !fabric) return;

    if (bezierSessionRef.current) {
      finalizeBezierSession(false);
    }
    if (contourSessionRef.current) {
      finalizeContourSession(false);
    }

    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${stamp.paths}</svg>`;

    fabric.loadSVGFromString(svgString, (objects: any[], options: any) => {
      if (!objects || objects.length === 0) return;
      const group = fabric.util.groupSVGElements(objects, options);
      if (!group) return;

      const items = Array.isArray(group._objects) ? group._objects : [group];
      items.forEach((child: any) => {
        child.set({
          stroke: color,
          strokeWidth: 2,
          strokeUniform: true,
          strokeLineCap: 'round',
          strokeLineJoin: 'round',
        });
      });

      const zoom = fc.getZoom() || 1;
      const center = fc.getCenter();
      const vpt = fc.viewportTransform || [1, 0, 0, 1, 0, 0];
      const inv = fabric.util.invertTransform(vpt);
      const worldCenter = fabric.util.transformPoint(
        new fabric.Point(center.left, center.top),
        inv
      );

      const baseDim = Math.max(group.width || 24, group.height || 24, 1);
      const targetSize = 72 / zoom;
      const scale = targetSize / baseDim;

      group.set({
        left: worldCenter.x,
        top: worldCenter.y,
        originX: 'center',
        originY: 'center',
        scaleX: scale,
        scaleY: scale,
        isStampGroup: true,
        stampColor: color,
        strokeColorHex: color,
        strokeOpacity: 1,
        strokePattern: 'solid',
        strokeUniform: true,
        selectable: true,
        evented: true,
      });

      setActiveMode('select');
      activeModeRef.current = 'select';
      fc.add(group);
      syncFabricToolState();
      fc.setActiveObject(group);
      group.setCoords();
      fc.requestRenderAll();
      refreshSelectedInfo();
      saveHistory();

      setActivePopover(null);
    });
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const fc = fabricCanvasRef.current;
    const fabric = getFabric();
    if (!fc || !fabric) return;

    if (bezierSessionRef.current) {
      finalizeBezierSession(false);
    }
    if (contourSessionRef.current) {
      finalizeContourSession(false);
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;

      fabric.Image.fromURL(
        dataUrl,
        (img: any) => {
          if (!img) return;
          const zoom = fc.getZoom() || 1;
          const maxW = (fc.getWidth() * 0.65) / zoom;
          const maxH = (fc.getHeight() * 0.65) / zoom;
          const scale = Math.min(1, maxW / (img.width || 1), maxH / (img.height || 1));

          const center = fc.getCenter();
          const vpt = fc.viewportTransform || [1, 0, 0, 1, 0, 0];
          const inv = fabric.util.invertTransform(vpt);
          const worldCenter = fabric.util.transformPoint(
            new fabric.Point(center.left, center.top),
            inv
          );

          img.set({
            left: worldCenter.x,
            top: worldCenter.y,
            originX: 'center',
            originY: 'center',
            scaleX: scale,
            scaleY: scale,
            strokeUniform: true,
            strokeWidth: 0,
            stroke: '#000000',
            strokeColorHex: '#000000',
            strokeOpacity: 1,
            selectable: true,
            evented: true,
          });

          setActiveMode('select');
          activeModeRef.current = 'select';
          fc.add(img);
          syncFabricToolState();
          fc.setActiveObject(img);
          img.setCoords();
          fc.requestRenderAll();
          refreshSelectedInfo();
          saveHistory();

          setActivePopover(null);
        },
        { crossOrigin: 'anonymous' }
      );
    };
    reader.readAsDataURL(file);
  };

  // Selected Object Editing Handlers (Live Re-Editing for single or multi-selection!)
  const handleUpdateSelectedStroke = (patch: {
    color?: string;
    opacity?: number;
    width?: number;
    pattern?: LinePattern;
    doubleLine?: boolean;
    brushType?: BrushType;
  }) => {
    const fc = fabricCanvasRef.current;
    const activeObj = fc?.getActiveObject();
    const fabric = getFabric();
    if (!fc || !activeObj || !selectedInfo) return;

    const targets = getEditableTargets(activeObj);
    if (targets.length === 0) return;

    const nextColor = patch.color ?? selectedInfo.strokeColor;
    const nextStrokeOpacity = patch.opacity ?? selectedInfo.strokeOpacity ?? 1;
    const effectiveStroke = applyColorOpacity(nextColor, nextStrokeOpacity);
    const nextWidth = patch.width ?? selectedInfo.strokeWidth;
    const nextPattern = patch.pattern ?? selectedInfo.strokePattern;
    const nextDoubleLine = patch.doubleLine ?? selectedInfo.doubleLine;
    const dash = getScaledDashArray(nextPattern, nextWidth);

    targets.forEach((obj: any) => {
      if (obj.isSprayGroup) {
        const items = Array.isArray(obj._objects) ? obj._objects : [];
        items.forEach((child: any) => {
          child.set({ fill: effectiveStroke, dirty: true });
        });
        obj.set({
          strokeColorHex: nextColor,
          strokeOpacity: nextStrokeOpacity,
          dirty: true,
        });
      } else if (obj.isArrowGroup && Array.isArray(obj._objects)) {
        const safeArrowW = Math.max(1, nextWidth);
        const arrowDash = getScaledDashArray(nextPattern, safeArrowW);
        obj._objects.forEach((child: any, idx: number) => {
          if (child.isArrowShaft || (!child.isArrowHeadStroke && !child.isArrowHeadFill && !child.isArrowTailDot && idx === 0 && child.type === 'line')) {
            child.set({
              stroke: effectiveStroke,
              strokeColorHex: nextColor,
              strokeOpacity: nextStrokeOpacity,
              strokeWidth: safeArrowW,
              strokeDashArray: arrowDash || undefined,
              strokePattern: nextPattern,
              doubleLine: nextDoubleLine,
              strokeUniform: true,
              dirty: true,
            });
          } else if (child.isArrowHeadStroke) {
            child.set({
              stroke: effectiveStroke,
              strokeWidth: safeArrowW,
              strokeUniform: true,
              dirty: true,
            });
          } else if (child.isArrowHeadFill || child.isArrowTailDot || idx > 0) {
            child.set({ fill: effectiveStroke, dirty: true });
          }
        });
        obj.set({
          strokeColorHex: nextColor,
          strokeOpacity: nextStrokeOpacity,
          strokePattern: nextPattern,
          doubleLine: nextDoubleLine,
          dirty: true,
        });
      } else if (obj.isStampGroup) {
        const items = Array.isArray(obj._objects) ? obj._objects : [obj];
        items.forEach((child: any) => {
          child.set({
            stroke: effectiveStroke,
            strokeWidth: nextWidth,
            strokeDashArray: dash || undefined,
            strokePattern: nextPattern,
            doubleLine: nextDoubleLine,
            strokeUniform: true,
            dirty: true,
          });
        });
        obj.set({
          stampColor: nextColor,
          strokeColorHex: nextColor,
          strokeOpacity: nextStrokeOpacity,
          strokePattern: nextPattern,
          doubleLine: nextDoubleLine,
          dirty: true,
        });
      } else if (obj.type === 'image') {
        obj.set({
          stroke: nextWidth > 0 ? effectiveStroke : null,
          strokeColorHex: nextColor,
          strokeOpacity: nextStrokeOpacity,
          strokeWidth: nextWidth,
          doubleLine: nextDoubleLine,
          strokeUniform: true,
          dirty: true,
        });
      } else if (obj.type === 'i-text' || obj.type === 'text') {
        if (patch.color !== undefined || patch.opacity !== undefined) {
          obj.set({
            fill: effectiveStroke,
            dirty: true,
          });
        }
      } else {
        const nextBrushType =
          patch.brushType !== undefined ? patch.brushType : obj.brushType || 'standard';
        const effectiveDouble =
          nextBrushType === 'soft' ? false : nextDoubleLine;
        const allowsZeroStroke =
          isClosedFillableObject(obj) &&
          obj.fillMeta?.mode !== 'none' &&
          obj.fill !== 'transparent' &&
          Boolean(obj.fill);
        const targetStrokeWidth = allowsZeroStroke
          ? nextWidth
          : Math.max(1, nextWidth);

        obj.set({
          stroke: targetStrokeWidth > 0 ? effectiveStroke : null,
          strokeColorHex: nextColor,
          strokeOpacity: nextStrokeOpacity,
          strokeWidth: targetStrokeWidth,
          strokeDashArray: dash || undefined,
          strokePattern: nextPattern,
          doubleLine: effectiveDouble,
          brushType: nextBrushType,
          strokeUniform: true,
          dirty: true,
        });
        if (nextBrushType === 'soft' && fabric && targetStrokeWidth > 0) {
          obj.set({
            shadow: new fabric.Shadow({
              blur: Math.max(8, targetStrokeWidth * 1.45),
              color: effectiveStroke,
              affectStroke: true,
              offsetX: 0,
              offsetY: 0,
            }),
            dirty: true,
          });
        } else if (patch.brushType === 'standard' || targetStrokeWidth === 0) {
          obj.set({ shadow: null, dirty: true });
        }
      }
      obj.setCoords();
    });

    activeObj.setCoords();
    fc.requestRenderAll();
    refreshSelectedInfo();
    scheduleHistorySave();
  };

  const handleUpdateSelectedFill = (nextFill: FillSettings) => {
    const fc = fabricCanvasRef.current;
    const activeObj = fc?.getActiveObject();
    if (!fc || !activeObj) return;

    const targets = getEditableTargets(activeObj).filter((t) =>
      isClosedFillableObject(t)
    );
    if (targets.length === 0) return;

    const fillVal = buildFillValue(nextFill);
    targets.forEach((obj: any) => {
      const updatePatch: any = {
        fill: fillVal,
        fillMeta: { ...nextFill },
        perPixelTargetFind: false,
        targetFindTolerance: 16,
        dirty: true,
      };
      if (nextFill.mode === 'none' && (!obj.strokeWidth || obj.strokeWidth === 0)) {
        const restoreColor = obj.strokeColorHex || '#000000';
        const restoreOpacity =
          typeof obj.strokeOpacity === 'number' ? obj.strokeOpacity : 1;
        updatePatch.strokeWidth = 1;
        updatePatch.stroke = applyColorOpacity(restoreColor, restoreOpacity);
      }
      obj.set(updatePatch);
      obj.setCoords();
    });
    fc.requestRenderAll();
    refreshSelectedInfo();
    scheduleHistorySave();
  };

  const handleUpdateSelectedOpacity = (opacity: number) => {
    const fc = fabricCanvasRef.current;
    const activeObj = fc?.getActiveObject();
    if (!fc || !activeObj) return;

    const targets = getEditableTargets(activeObj);
    if (targets.length === 0) return;
    targets.forEach((obj: any) => {
      obj.set({ opacity, dirty: true });
    });
    fc.requestRenderAll();
    refreshSelectedInfo();
    scheduleHistorySave();
  };

  const handleUpdateSelectedCornerRadius = (ratio: number) => {
    const fc = fabricCanvasRef.current;
    const activeObj = fc?.getActiveObject();
    if (!fc || !activeObj) return;

    const targets = getEditableTargets(activeObj);
    let updated = false;
    targets.forEach((obj: any) => {
      if (applyCornerRoundingToObject(obj, ratio)) {
        obj.setCoords();
        updated = true;
      }
    });
    if (updated) {
      activeObj.setCoords();
      fc.requestRenderAll();
      refreshSelectedInfo();
      scheduleHistorySave();
    }
  };

  const handleToggleSelectedClosedContour = (nextClosed: boolean) => {
    const fc = fabricCanvasRef.current;
    const obj = fc?.getActiveObject();
    if (!fc || !obj || obj.type === 'activeSelection') return;

    setClosedContour(nextClosed);
    const idx = fc.getObjects().indexOf(obj);
    const converted = nextClosed
      ? convertObjectToClosedContour(obj, fillRef.current, true)
      : convertClosedContourToOpen(obj, true);
    if (!converted) return;

    fc.remove(obj);
    if (idx >= 0) {
      fc.insertAt(converted, idx, false);
    } else {
      fc.add(converted);
    }
    attachControlsToObject(converted);
    converted.setCoords();
    fc.setActiveObject(converted);
    fc.requestRenderAll();
    refreshSelectedInfo();
    saveHistory();
  };

  const handleMorphSelectedPolygon = (variant: PolygonVariant) => {
    const fc = fabricCanvasRef.current;
    const obj = fc?.getActiveObject();
    const fabric = getFabric();
    if (!fc || !fabric || !obj || obj.type !== 'polygon') return;

    const center = obj.getCenterPoint();
    const baseW = (obj.baseWidth ?? obj.width ?? 40) * Math.abs(obj.scaleX || 1);
    const baseH = (obj.baseHeight ?? obj.height ?? 40) * Math.abs(obj.scaleY || 1);
    const rx = Math.max(8, baseW / 2);
    const ry = Math.max(8, baseH / 2);

    const pts = buildPolygonPoints(variant, center.x, center.y, rx, ry);
    const nextPoly = new fabric.Polygon(pts, {
      fill: obj.fill,
      fillMeta: obj.fillMeta ? { ...obj.fillMeta } : undefined,
      stroke: obj.stroke,
      strokeColorHex: obj.strokeColorHex,
      strokeOpacity: obj.strokeOpacity,
      strokeWidth: obj.strokeWidth,
      strokeDashArray: obj.strokeDashArray,
      strokePattern: obj.strokePattern,
      doubleLine: obj.doubleLine,
      opacity: obj.opacity,
      angle: obj.angle || 0,
      flipX: Boolean(obj.flipX),
      flipY: Boolean(obj.flipY),
      strokeUniform: true,
      strokeLineJoin: 'round',
      perPixelTargetFind: false,
      targetFindTolerance: 16,
      selectable: true,
      evented: true,
      cornerColor: '#2563EB',
      borderColor: '#2563EB',
    });

    nextPoly.set({
      baseLocalPoints: nextPoly.points.map((p: any) => ({ x: p.x, y: p.y })),
      baseWidth: nextPoly.width,
      baseHeight: nextPoly.height,
      basePathOffset: {
        x: nextPoly.pathOffset?.x || 0,
        y: nextPoly.pathOffset?.y || 0,
      },
      cornerRoundRatio: obj.cornerRoundRatio || 0,
      shapeSubtype: variant,
    });
    if (typeof obj.cornerRoundRatio === 'number' && obj.cornerRoundRatio > 0) {
      applyCornerRoundingToObject(nextPoly, obj.cornerRoundRatio);
    }

    const idx = fc.getObjects().indexOf(obj);
    fc.remove(obj);
    if (idx >= 0) {
      fc.insertAt(nextPoly, idx, false);
    } else {
      fc.add(nextPoly);
    }
    nextPoly.setCoords();
    fc.setActiveObject(nextPoly);
    fc.requestRenderAll();
    refreshSelectedInfo();
    saveHistory();
  };

  const handleUpdateSelectedGrid = (nextGrid: RectGridConfig) => {
    const fc = fabricCanvasRef.current;
    const activeObj = fc?.getActiveObject();
    if (!fc || !activeObj) return;

    const targets = getEditableTargets(activeObj).filter((t) => t.type === 'rect');
    if (targets.length === 0) return;

    const rows = Math.max(1, Math.min(24, Math.round(nextGrid.rows)));
    const cols = Math.max(1, Math.min(24, Math.round(nextGrid.cols)));

    targets.forEach((obj: any) => {
      const patch: any = {
        isGridRect: nextGrid.enabled,
        gridRows: rows,
        gridCols: cols,
        dirty: true,
      };
      if (nextGrid.enabled && (!obj.strokeWidth || obj.strokeWidth === 0)) {
        const restoreColor = obj.strokeColorHex || '#000000';
        const restoreOpacity =
          typeof obj.strokeOpacity === 'number' ? obj.strokeOpacity : 1;
        patch.strokeWidth = 1;
        patch.stroke = applyColorOpacity(restoreColor, restoreOpacity);
      }
      obj.set(patch);
      obj.setCoords();
    });

    activeObj.setCoords();
    fc.requestRenderAll();
    refreshSelectedInfo();
    scheduleHistorySave();
  };

  const handleMorphSelectedArrow = (variant: ArrowVariant) => {
    const fc = fabricCanvasRef.current;
    const obj = fc?.getActiveObject();
    if (!fc || !obj || (!obj.isArrowGroup && !obj.isArrowObject)) return;

    const center = obj.getCenterPoint();
    const baseLen =
      typeof obj.arrowLength === 'number' && obj.arrowLength > 0
        ? obj.arrowLength
        : Math.max(24, obj.width || 80);
    const effLen = Math.max(24, baseLen * Math.abs(obj.scaleX || 1));
    const rad = ((obj.angle || 0) * Math.PI) / 180;
    const dirSign = obj.flipX ? -1 : 1;
    const ux = Math.cos(rad) * dirSign;
    const uy = Math.sin(rad) * dirSign;
    const x1 = center.x - ux * (effLen / 2);
    const y1 = center.y - uy * (effLen / 2);
    const x2 = center.x + ux * (effLen / 2);
    const y2 = center.y + uy * (effLen / 2);

    const shaft =
      obj.isArrowGroup && Array.isArray(obj._objects)
        ? obj._objects.find((c: any) => c.isArrowShaft) || obj._objects[0]
        : null;
    const strokeColorHex = obj.strokeColorHex || shaft?.strokeColorHex || strokeRef.current.color;
    const strokeOpacityVal =
      typeof obj.strokeOpacity === 'number'
        ? obj.strokeOpacity
        : typeof shaft?.strokeOpacity === 'number'
          ? shaft.strokeOpacity
          : 1;
    const effectiveStroke = applyColorOpacity(strokeColorHex, strokeOpacityVal);
    const rawStrokeW =
      typeof obj.strokeWidth === 'number' && !obj.isArrowGroup
        ? obj.strokeWidth
        : typeof shaft?.strokeWidth === 'number'
          ? shaft.strokeWidth
          : strokeRef.current.width;
    const isBlockVariant = variant === 'filled' || variant === 'filledDouble';
    const nextFillMeta: FillSettings =
      obj.fillMeta && obj.fillMeta.mode !== 'none'
        ? { ...obj.fillMeta }
        : fillRef.current.mode !== 'none'
          ? { ...fillRef.current }
          : {
              mode: 'solid',
              color: strokeColorHex,
              opacity: 0.35,
              hatchPattern: 'diagonal',
            };
    const nextWidth = isBlockVariant ? rawStrokeW : Math.max(1, rawStrokeW);
    const nextPattern: LinePattern = obj.strokePattern || shaft?.strokePattern || 'solid';
    const dash = getScaledDashArray(nextPattern, nextWidth);
    const nextDouble = Boolean(obj.doubleLine || shaft?.doubleLine);
    const nextFillVal = isBlockVariant ? buildFillValue(nextFillMeta) : undefined;

    const nextArrow = createArrowObject(
      x1,
      y1,
      x2,
      y2,
      effectiveStroke,
      nextWidth,
      dash,
      nextDouble,
      variant,
      nextFillVal,
      {
        opacity: typeof obj.opacity === 'number' ? obj.opacity : 1,
        flipY: Boolean(obj.flipY),
        strokeColorHex,
        strokeOpacity: strokeOpacityVal,
        strokePattern: nextPattern,
        fillMeta: isBlockVariant ? nextFillMeta : undefined,
        cornerRoundRatio:
          isBlockVariant && typeof obj.cornerRoundRatio === 'number'
            ? obj.cornerRoundRatio
            : 0,
      }
    );

    if (
      isBlockVariant &&
      typeof obj.cornerRoundRatio === 'number' &&
      obj.cornerRoundRatio > 0
    ) {
      applyCornerRoundingToObject(nextArrow, obj.cornerRoundRatio);
    }

    const idx = fc.getObjects().indexOf(obj);
    fc.remove(obj);
    if (idx >= 0) {
      fc.insertAt(nextArrow, idx, false);
    } else {
      fc.add(nextArrow);
    }
    attachControlsToObject(nextArrow);
    nextArrow.setCoords();
    fc.setActiveObject(nextArrow);
    fc.requestRenderAll();
    refreshSelectedInfo();
    saveHistory();
  };

  const handleUpdateSelectedText = async (patch: {
    color?: string;
    fontFamily?: string;
    fontSize?: number;
  }) => {
    const fc = fabricCanvasRef.current;
    const obj = fc?.getActiveObject();
    if (!fc || !obj) return;

    if (patch.fontFamily) {
      try {
        await Promise.race([
          document.fonts.load(`36px "${patch.fontFamily}"`),
          new Promise((res) => setTimeout(res, 500)),
        ]);
      } catch {
        // ignore
      }
    }

    obj.set({
      ...(patch.color !== undefined ? { fill: patch.color } : {}),
      ...(patch.fontFamily !== undefined ? { fontFamily: patch.fontFamily } : {}),
      ...(patch.fontSize !== undefined ? { fontSize: patch.fontSize } : {}),
      dirty: true,
    });
    obj.setCoords();
    fc.requestRenderAll();
    refreshSelectedInfo();
    scheduleHistorySave();
  };

  const handleEnterTextEdit = () => {
    const fc = fabricCanvasRef.current;
    const obj = fc?.getActiveObject();
    if (!fc || !obj || obj.type !== 'i-text') return;
    setObjectEditorOpen(false);
    obj.enterEditing();
    obj.selectAll();
    fc.requestRenderAll();
  };

  const handleFlipSelected = (axis: 'x' | 'y') => {
    const fc = fabricCanvasRef.current;
    const obj = fc?.getActiveObject();
    if (!fc || !obj) return;

    if (axis === 'x') {
      obj.set({ flipX: !obj.flipX });
    } else {
      obj.set({ flipY: !obj.flipY });
    }
    obj.setCoords();
    fc.requestRenderAll();
    refreshSelectedInfo();
    saveHistory();
  };

  const handleDeleteSelected = () => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;
    const active = fc.getActiveObjects();
    if (!active || active.length === 0) return;
    active.forEach((obj: any) => fc.remove(obj));
    fc.discardActiveObject();
    fc.requestRenderAll();
    setSelectedInfo(null);
    setObjectEditorOpen(false);
    saveHistory();
  };

  const handleDuplicateSelected = () => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;
    const active = fc.getActiveObject();
    if (!active) return;

    const fabric = getFabric();
    active.clone((cloned: any) => {
      fc.discardActiveObject();
      cloned.set({
        left: (cloned.left || 0) + 24,
        top: (cloned.top || 0) + 24,
        evented: true,
        selectable: true,
        cornerColor: '#2563EB',
        borderColor: '#2563EB',
      });
      if (cloned.type === 'polygon' && cloned.basePathOffset && fabric) {
        cloned.set({
          width: cloned.baseWidth ?? cloned.width,
          height: cloned.baseHeight ?? cloned.height,
          pathOffset: new fabric.Point(cloned.basePathOffset.x, cloned.basePathOffset.y),
          dirty: true,
        });
      }
      if (cloned.type === 'activeSelection') {
        cloned.canvas = fc;
        cloned.forEachObject((obj: any) => {
          attachControlsToObject(obj);
          fc.add(obj);
        });
        cloned.setCoords();
      } else {
        attachControlsToObject(cloned);
        fc.add(cloned);
      }
      fc.setActiveObject(cloned);
      fc.requestRenderAll();
      refreshSelectedInfo();
      saveHistory();
    }, CUSTOM_JSON_PROPS);
  };

  const handleBringToFront = () => {
    const fc = fabricCanvasRef.current;
    const active = fc?.getActiveObject();
    if (!fc || !active) return;
    fc.bringToFront(active);
    fc.requestRenderAll();
    saveHistory();
  };

  const handleSendToBack = () => {
    const fc = fabricCanvasRef.current;
    const active = fc?.getActiveObject();
    if (!fc || !active) return;
    fc.sendToBack(active);
    fc.requestRenderAll();
    saveHistory();
  };

  const handleClearCanvas = () => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;
    if (bezierSessionRef.current) {
      finalizeBezierSession(true);
    }
    if (contourSessionRef.current) {
      finalizeContourSession(true);
    }
    fc.clear();
    fc.backgroundColor = null;
    fc.requestRenderAll();
    setSelectedInfo(null);
    setObjectEditorOpen(false);
    saveHistory();
    setActivePopover(null);
  };

  const fitCanvasToArtboard = useCallback(
    (nextSize: CanvasSizeConfig) => {
      const fc = fabricCanvasRef.current;
      if (!fc) return;
      if (nextSize.preset === 'fullscreen') {
        fc.setViewportTransform([1, 0, 0, 1, 0, 0]);
        setZoomPercent(100);
        renderBackground();
        refreshSelectedInfo();
        fc.requestRenderAll();
        return;
      }
      const vw = fc.getWidth();
      const vh = fc.getHeight();
      const pad = vw < 640 ? 36 : 72;
      const fitZoom = Math.max(
        0.08,
        Math.min(1, (vw - pad) / nextSize.width, (vh - pad) / nextSize.height)
      );
      const center = artboardCenterRef.current;
      const tx = vw / 2 - center.x * fitZoom;
      const ty = vh / 2 - center.y * fitZoom;
      fc.setViewportTransform([fitZoom, 0, 0, fitZoom, tx, ty]);
      setZoomPercent(Math.round(fitZoom * 100));
      renderBackground();
      refreshSelectedInfo();
      fc.requestRenderAll();
    },
    [refreshSelectedInfo, renderBackground]
  );

  const handleChangeCanvasSize = (next: CanvasSizeConfig, fitViewport = true) => {
    const fc = fabricCanvasRef.current;
    const fabric = getFabric();
    if (
      fc &&
      fabric &&
      canvasSizeRef.current.preset === 'fullscreen' &&
      next.preset !== 'fullscreen'
    ) {
      const hasObjects = fc
        .getObjects()
        .some((o: any) => !o.excludeFromExport && !o.isEraserPath);
      if (!hasObjects) {
        const vpt = fc.viewportTransform || [1, 0, 0, 1, 0, 0];
        const inv = fabric.util.invertTransform(vpt);
        const worldPt = fabric.util.transformPoint(
          new fabric.Point(fc.getWidth() / 2, fc.getHeight() / 2),
          inv
        );
        artboardCenterRef.current = { x: worldPt.x, y: worldPt.y };
      }
    }
    canvasSizeRef.current = next;
    setCanvasSize(next);
    if (fitViewport) {
      fitCanvasToArtboard(next);
    } else {
      renderBackground();
    }
  };

  const handleResetView = () => {
    fitCanvasToArtboard(canvasSizeRef.current);
  };

  const handleChangeLanguage = (pref: LanguagePreference) => {
    setLanguagePref(pref);
    saveLanguagePreference(pref);
  };

  const syncDefaultStrokeContrast = useCallback(
    (nextBg: BackgroundConfig) => {
      const willBeDark = isBackgroundDark(nextBg);
      if (willBeDark && stroke.color.toLowerCase() === '#000000') {
        setStroke((prev) => ({ ...prev, color: '#FFFFFF' }));
      } else if (!willBeDark && stroke.color.toLowerCase() === '#ffffff') {
        setStroke((prev) => ({ ...prev, color: '#000000' }));
      }
    },
    [stroke.color]
  );

  const handleSelectBgPreset = (mode: BackgroundMode) => {
    let next: BackgroundConfig;
    if (mode === 'white') {
      next = {
        ...bgConfig,
        mode: 'white',
        fillType: 'solid',
        color1: '#FFFFFF',
        opacity: 1,
      };
    } else if (mode === 'dark') {
      next = {
        ...bgConfig,
        mode: 'dark',
        fillType: 'solid',
        color1: '#1E1E1E',
        opacity: 1,
      };
    } else {
      // grid or lined: keep custom color/gradient if already customized, otherwise crisp white
      const baseColor = bgConfig.mode === 'dark' ? '#FFFFFF' : bgConfig.color1;
      next = {
        ...bgConfig,
        mode,
        color1: baseColor,
      };
    }
    setBgConfig(next);
    syncDefaultStrokeContrast(next);
  };

  const handleChangeBgConfig = (next: BackgroundConfig) => {
    setBgConfig(next);
    syncDefaultStrokeContrast(next);
  };

  const isDarkBg = useMemo(() => isBackgroundDark(bgConfig), [bgConfig]);
  const showCheckerboard =
    canvasSize.preset === 'fullscreen' &&
    bgConfig.mode !== 'white' &&
    bgConfig.mode !== 'dark' &&
    bgConfig.opacity < 1;

  // Compute safe screen position for the top-right Pencil button on selected object
  const pencilBadgePos = useMemo(() => {
    if (!selectedInfo) return null;
    const { left, top, width } = selectedInfo.screenRect;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
    let badgeLeft = Math.max(12, Math.min(vw - 48, left + width + 8));
    let badgeTop = Math.max(12, Math.min(vh - 96, top - 38));
    // Avoid overlapping the top-right Eye trigger (top: 16..52, right: 16..52)
    if (badgeTop < 64 && badgeLeft > vw - 72) {
      badgeLeft = Math.max(12, vw - 96);
    }
    return { left: badgeLeft, top: badgeTop };
  }, [selectedInfo]);

  return (
    <div
      className={`relative w-screen h-dvh overflow-hidden select-none ${
        isDarkBg ? 'dark bg-[#1E1E1E]' : 'bg-white'
      }`}
      style={
        showCheckerboard
          ? {
              backgroundColor: '#f8fafc',
              backgroundImage:
                'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
            }
          : undefined
      }
    >
      {/* Synced Background Canvas (White / Custom / Gradient / Grid / Lined / Dark) */}
      <canvas
        ref={bgCanvasRef}
        className="absolute inset-0 pointer-events-none block"
      />

      {/* Empty Canvas Semi-Transparent Prompt ("Просто рисуй" / localized) */}
      {isCanvasEmpty && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center px-6 z-10">
          <span
            className={`text-2xl sm:text-3xl font-medium tracking-tight select-none transition-opacity duration-200 ${
              isDarkBg ? 'text-white/20' : 'text-slate-900/20'
            }`}
          >
            {t('emptyCanvasHint')}
          </span>
        </div>
      )}

      {/* Interactive Fabric.js Canvas */}
      <div className="absolute inset-0">
        <canvas ref={fabricElRef} className="block" />
      </div>

      {/* Hidden File Input for Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={handleImageFileChange}
        className="hidden"
      />

      {/* Top-Right Corner Pencil Button on Selected Shape / Photo / Text */}
      {!isEditingBezier && !isEditingContour && selectedInfo && pencilBadgePos && (
        <button
          type="button"
          onClick={() => {
            setActivePopover(null);
            setObjectEditorOpen((prev) => !prev);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          title={t('editObject')}
          aria-label={t('editObject')}
          style={{
            left: `${pencilBadgePos.left}px`,
            top: `${pencilBadgePos.top}px`,
          }}
          className={`fixed z-30 w-9 h-9 rounded-full border shadow-lg flex items-center justify-center transition-colors cursor-pointer after:content-[''] after:absolute after:-inset-1.5 ${
            objectEditorOpen
              ? 'bg-blue-600 text-white border-blue-500'
              : isDarkBg
                ? 'bg-neutral-900/95 text-neutral-100 border-neutral-600 hover:bg-neutral-800'
                : 'bg-white/95 text-slate-800 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}

      {/* Floating Eye Trigger + 6-Button Right Sidebar */}
      <RightSidebar
        t={t}
        isOpen={sidebarOpen}
        onToggleOpen={handleToggleSidebar}
        activePopover={activePopover}
        onTogglePopover={handleTogglePopover}
        activeMode={activeMode}
        onActivateEraser={handleActivateEraser}
        onTriggerImageUpload={() => fileInputRef.current?.click()}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        isDarkBg={isDarkBg}
      />

      {offlineToast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-3.5 py-2 rounded-2xl border backdrop-blur-md flex items-center gap-2 shadow-xl pointer-events-none ${
            isDarkBg
              ? 'bg-neutral-900/95 border-emerald-500/40 text-emerald-300'
              : 'bg-white/95 border-emerald-200 text-emerald-700'
          }`}
        >
          <Check className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs font-semibold whitespace-nowrap">
            {t('offlineSavedToast')}
          </span>
        </div>
      )}

      {/* Selected Object Live Re-Editor Popover */}
      {selectedInfo && objectEditorOpen && (
        <ObjectEditorPopover
          t={t}
          info={selectedInfo}
          onUpdateStroke={handleUpdateSelectedStroke}
          onUpdateFill={handleUpdateSelectedFill}
          onUpdateGrid={handleUpdateSelectedGrid}
          onUpdateOpacity={handleUpdateSelectedOpacity}
          onUpdateCornerRadius={handleUpdateSelectedCornerRadius}
          onUpdateText={handleUpdateSelectedText}
          onEnterTextEdit={handleEnterTextEdit}
          onFlip={handleFlipSelected}
          onBringToFront={handleBringToFront}
          onSendToBack={handleSendToBack}
          onDuplicate={handleDuplicateSelected}
          onDelete={handleDeleteSelected}
          onClose={() => setObjectEditorOpen(false)}
          isDarkBg={isDarkBg}
        />
      )}

      {/* Tool Popovers */}
      {sidebarOpen && activePopover === 'shapes' && (
        <ShapesPopover
          t={t}
          activeMode={activeMode}
          onSelectMode={handleSelectMode}
          rectGrid={rectGrid}
          onChangeRectGrid={setRectGrid}
          onUpdateSelectedGrid={handleUpdateSelectedGrid}
          polygonVariant={polygonVariant}
          onSelectPolygonVariant={setPolygonVariant}
          arrowVariant={arrowVariant}
          onSelectArrowVariant={setArrowVariant}
          closedContour={closedContour}
          onToggleClosedContour={setClosedContour}
          snapEnabled={snapEnabled}
          onToggleSnapEnabled={setSnapEnabled}
          stroke={stroke}
          onChangeStroke={setStroke}
          fill={fill}
          onChangeFill={setFill}
          selectedInfo={selectedInfo}
          onUpdateSelectedStroke={handleUpdateSelectedStroke}
          onUpdateSelectedFill={handleUpdateSelectedFill}
          onUpdateSelectedOpacity={handleUpdateSelectedOpacity}
          onUpdateSelectedCornerRadius={handleUpdateSelectedCornerRadius}
          onToggleSelectedClosedContour={handleToggleSelectedClosedContour}
          onMorphSelectedPolygon={handleMorphSelectedPolygon}
          onMorphSelectedArrow={handleMorphSelectedArrow}
          onClearSelection={() => {
            const fc = fabricCanvasRef.current;
            if (!fc) return;
            fc.discardActiveObject();
            fc.requestRenderAll();
            setSelectedInfo(null);
            setObjectEditorOpen(false);
          }}
          isDarkBg={isDarkBg}
        />
      )}

      {sidebarOpen && activePopover === 'text' && (
        <TextModal
          t={t}
          onAddText={handleAddText}
          defaultColor={stroke.color}
          isDarkBg={isDarkBg}
        />
      )}

      {sidebarOpen && activePopover === 'stamps' && (
        <StampsPopover
          t={t}
          lang={resolvedLang}
          onAddStamp={handleAddStamp}
          onAddEmoji={handleAddEmoji}
          defaultColor={stroke.color}
          isDarkBg={isDarkBg}
        />
      )}

      {sidebarOpen && activePopover === 'eraser' && (
        <EraserPopover
          t={t}
          size={eraserSize}
          onChangeSize={setEraserSize}
          hasSelectedObject={Boolean(selectedInfo)}
          onDeleteSelected={handleDeleteSelected}
          isDarkBg={isDarkBg}
        />
      )}

      {sidebarOpen && activePopover === 'actions' && (
        <ActionsPopover
          t={t}
          bgConfig={bgConfig}
          onChangeBgConfig={handleChangeBgConfig}
          onSelectBgPreset={handleSelectBgPreset}
          canvasSize={canvasSize}
          onChangeCanvasSize={handleChangeCanvasSize}
          exportScope={exportScope}
          onChangeExportScope={setExportScope}
          onExport={(fmt) => {
            exportCanvasImage(
              fabricCanvasRef.current,
              bgConfig,
              fmt,
              canvasSize,
              artboardCenterRef.current,
              exportScope
            );
            setActivePopover(null);
          }}
          onClearCanvas={handleClearCanvas}
          zoomPercent={zoomPercent}
          onResetView={handleResetView}
          languagePref={languagePref}
          onChangeLanguage={handleChangeLanguage}
          onOpenHelp={() => {
            setActivePopover(null);
            setHelpOpen(true);
          }}
          onTriggerOfflineDownload={handleTriggerOfflineDownload}
          isDarkBg={isDarkBg}
        />
      )}

      {/* Live Corner Rounding Floating Pill (on Long-Tap of Selection Corner Handle) */}
      {cornerRoundHud && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-3.5 py-2 rounded-2xl border backdrop-blur-md flex items-center gap-2.5 shadow-xl ${
            isDarkBg
              ? 'bg-neutral-900/95 border-amber-500/60 text-neutral-100'
              : 'bg-white/95 border-amber-400 text-slate-900'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
          <span className="text-xs font-semibold whitespace-nowrap">
            {t('cornerRadiusLabel')}:{' '}
            <span className="tabular-nums text-amber-500">{cornerRoundHud.percent}%</span>
          </span>
          <span className={`text-[11px] hidden sm:inline ${isDarkBg ? 'text-neutral-400' : 'text-slate-500'}`}>
            • {t('cornerRoundActiveHint')}
          </span>
          <button
            type="button"
            onClick={() => {
              const fc = fabricCanvasRef.current;
              const armed = cornerRoundingArmedObjRef.current;
              if (armed) {
                armed.set({
                  cornerColor: '#2563EB',
                  borderColor: '#2563EB',
                });
                cornerRoundingArmedObjRef.current = null;
              }
              cornerRoundingDragRef.current = null;
              setCornerRoundHud(null);
              if (fc) {
                fc.requestRenderAll();
                saveHistory();
              }
            }}
            className="min-h-[30px] px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-semibold cursor-pointer"
          >
            {t('cornerRoundDone')}
          </button>
        </div>
      )}

      {/* Contextual Floating Bar for Bezier Curve Editing */}
      {isEditingBezier && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-3 py-2 rounded-2xl border backdrop-blur-md flex items-center gap-2 shadow-xl ${
            isDarkBg
              ? 'bg-neutral-900/95 border-neutral-700 text-neutral-100'
              : 'bg-white/95 border-slate-200 text-slate-800'
          }`}
        >
          <span className="text-xs font-medium px-1.5 hidden sm:inline">
            {t('bezierHint')}
          </span>
          <button
            type="button"
            onClick={() => finalizeBezierSession(false)}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{t('bezierDone')}</span>
          </button>
          <button
            type="button"
            onClick={() => finalizeBezierSession(true)}
            className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1 cursor-pointer ${
              isDarkBg
                ? 'bg-neutral-800 hover:bg-neutral-700 text-red-400'
                : 'bg-slate-100 hover:bg-slate-200 text-red-600'
            }`}
          >
            <X className="w-3.5 h-3.5" />
            <span>{t('bezierCancel')}</span>
          </button>
        </div>
      )}

      {/* Contextual Floating Bar for Multi-Segment Closed Contour */}
      {isEditingContour && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-3 py-2 rounded-2xl border backdrop-blur-md flex items-center gap-2 shadow-xl ${
            isDarkBg
              ? 'bg-neutral-900/95 border-neutral-700 text-neutral-100'
              : 'bg-white/95 border-slate-200 text-slate-800'
          }`}
        >
          <span className="text-xs font-medium px-1.5 hidden sm:inline">
            {t('contourHint')}
          </span>
          <button
            type="button"
            onClick={() => finalizeContourSession(false)}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{t('contourClose')}</span>
          </button>
          <button
            type="button"
            onClick={() => finalizeContourSession(true)}
            className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1 cursor-pointer ${
              isDarkBg
                ? 'bg-neutral-800 hover:bg-neutral-700 text-red-400'
                : 'bg-slate-100 hover:bg-slate-200 text-red-600'
            }`}
          >
            <X className="w-3.5 h-3.5" />
            <span>{t('contourCancel')}</span>
          </button>
        </div>
      )}

      {/* Contextual Object Bar when an object is actively selected */}
      {!isEditingBezier && !isEditingContour && activeMode === 'select' && selectedInfo && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-30 px-2 py-1.5 rounded-2xl border backdrop-blur-md flex items-center gap-1 shadow-xl max-w-[calc(100vw-24px)] overflow-x-auto ${
            isDarkBg
              ? 'bg-neutral-900/95 border-neutral-700 text-neutral-100'
              : 'bg-white/95 border-slate-200 text-slate-800'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setActivePopover(null);
              setObjectEditorOpen((prev) => !prev);
            }}
            className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              objectEditorOpen
                ? 'bg-blue-600 text-white'
                : isDarkBg
                  ? 'bg-neutral-800 hover:bg-neutral-700'
                  : 'bg-slate-100 hover:bg-slate-200'
            }`}
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>{t('editObject')}</span>
          </button>
          <button
            type="button"
            onClick={handleDuplicateSelected}
            className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              isDarkBg ? 'hover:bg-neutral-800' : 'hover:bg-slate-100'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{t('objDuplicate')}</span>
          </button>
          <button
            type="button"
            onClick={handleBringToFront}
            className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              isDarkBg ? 'hover:bg-neutral-800' : 'hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t('objFront')}</span>
          </button>
          <button
            type="button"
            onClick={handleDeleteSelected}
            className="min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t('objDelete')}</span>
          </button>
        </div>
      )}

      {helpOpen && (
        <HelpModal
          lang={resolvedLang}
          isDarkBg={isDarkBg}
          onClose={() => setHelpOpen(false)}
        />
      )}
    </div>
  );
}
