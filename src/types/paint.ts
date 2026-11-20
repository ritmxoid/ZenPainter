export type DrawMode =
  | 'select'
  | 'lasso'
  | 'brush'
  | 'line'
  | 'polyline'
  | 'bezier'
  | 'ellipse'
  | 'rect'
  | 'triangle'
  | 'star'
  | 'arrow'
  | 'eraser';

export type LinePattern = 'solid' | 'dashed' | 'dotted' | 'dashdot';

export type BrushType =
  | 'standard'
  | 'soft'
  | 'spray'
  | 'stroke'
  | 'roller'
  | 'dry'
  | 'watercolor'
  | 'charcoal'
  | 'calligraphy';

export type FillMode = 'none' | 'solid' | 'pattern' | 'photo';

export type HatchPattern = 'diagonal' | 'crosshatch' | 'dots' | 'horizontal';

export type BackgroundMode = 'white' | 'grid' | 'lined' | 'dark' | 'custom';

export type BackgroundFillType = 'solid' | 'gradient';
export type GradientType = 'linear' | 'radial';

export interface BackgroundConfig {
  mode: BackgroundMode;
  fillType: BackgroundFillType;
  color1: string;
  color2: string;
  opacity: number;
  gradientType: GradientType;
  gradientAngle: number;
}

export type CanvasSizePreset = 'fullscreen' | 'square' | 'landscape' | 'portrait' | 'custom';

export interface CanvasSizeConfig {
  preset: CanvasSizePreset;
  width: number;
  height: number;
}

export type ExportScope = 'canvas' | 'artwork';

export type ActivePopover = 'shapes' | 'text' | 'stamps' | 'eraser' | 'actions' | null;

export type StampCategory = 'nav' | 'media' | 'comm' | 'commerce';

export type StampsTab = 'icons' | 'emoji';

export type EmojiCategory = 'smileys' | 'gestures' | 'nature' | 'objects' | 'symbols';

export interface EmojiDefinition {
  char: string;
  name: string;
  keywords: string;
  category: EmojiCategory;
}

export interface StampDefinition {
  id: string;
  name: string;
  keywords: string;
  category: StampCategory;
  paths: string;
}

export type SupportedLanguage =
  | 'en'
  | 'ru'
  | 'uk'
  | 'be'
  | 'kk'
  | 'es'
  | 'pt'
  | 'fr'
  | 'de'
  | 'it'
  | 'pl'
  | 'nl'
  | 'tr'
  | 'ar'
  | 'hi'
  | 'zh'
  | 'ja'
  | 'ko'
  | 'vi'
  | 'id'
  | 'th';
export type LanguagePreference = 'auto' | SupportedLanguage;

export interface StrokeSettings {
  color: string;
  opacity: number;
  width: number;
  pattern: LinePattern;
  brushType: BrushType;
  doubleLine: boolean;
}

export interface FillSettings {
  mode: FillMode;
  color: string;
  opacity: number;
  hatchPattern: HatchPattern;
  photoDataUrl?: string;
}

export type FontCategory = 'sans' | 'serif' | 'handwritten' | 'display';

export interface FontDefinition {
  family: string;
  category: FontCategory;
}

export type PolygonVariant =
  | 'star5'
  | 'star4'
  | 'star6'
  | 'star8'
  | 'diamond'
  | 'pentagon'
  | 'hexagon'
  | 'octagon'
  | 'trapezoid'
  | 'parallelogram'
  | 'cross'
  | 'tagArrow';

export type ArrowVariant =
  | 'single'
  | 'double'
  | 'filled'
  | 'filledDouble'
  | 'open'
  | 'openDouble'
  | 'circleTail'
  | 'barTail';

export interface RectGridConfig {
  enabled: boolean;
  rows: number;
  cols: number;
}

export type SelectedObjectKind = 'shape' | 'closedShape' | 'line' | 'image' | 'text';

export interface SelectedObjectInfo {
  kind: SelectedObjectKind;
  strokeColor: string;
  strokeOpacity: number;
  strokeWidth: number;
  strokePattern: LinePattern;
  doubleLine: boolean;
  brushType?: BrushType;
  isSpray?: boolean;
  isClosedContour?: boolean;
  canToggleClosedContour?: boolean;
  isPolygonMorphable?: boolean;
  polygonVariant?: PolygonVariant;
  isRectEditable?: boolean;
  isGridRect?: boolean;
  gridRows?: number;
  gridCols?: number;
  isArrowMorphable?: boolean;
  arrowVariant?: ArrowVariant;
  selectionCount?: number;
  fill: FillSettings;
  opacity: number;
  cornerRoundRatio: number | null;
  textColor: string;
  fontFamily: string;
  fontSize: number;
  screenRect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}
