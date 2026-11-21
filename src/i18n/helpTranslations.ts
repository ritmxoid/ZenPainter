import { SupportedLanguage } from '../types/paint';

export interface HelpFeatureTranslation {
  title: string;
  badge?: string;
  desc: string;
}

export interface HelpStepTranslation {
  title: string;
  desc: string;
}

export interface HelpTranslationBundle {
  headerSubtitle: string;
  tabDemo: string;
  tabGuide: string;
  fullscreenEnter: string;
  fullscreenExit: string;
  closeLabel: string;
  play: string;
  pause: string;
  restart: string;
  prev: string;
  next: string;
  searchPlaceholder: string;
  searchEmpty: string;
  demoStrokeStyle: string;
  demoDoubleLine: string;
  demoFill: string;
  demoBorderZero: string;
  demoRadius: string;
  demoSnapMerged: string;
  steps: [
    HelpStepTranslation,
    HelpStepTranslation,
    HelpStepTranslation,
    HelpStepTranslation,
    HelpStepTranslation,
    HelpStepTranslation,
    HelpStepTranslation,
    HelpStepTranslation,
  ];
  features: [
    HelpFeatureTranslation,
    HelpFeatureTranslation,
    HelpFeatureTranslation,
    HelpFeatureTranslation,
    HelpFeatureTranslation,
    HelpFeatureTranslation,
    HelpFeatureTranslation,
    HelpFeatureTranslation,
    HelpFeatureTranslation,
    HelpFeatureTranslation,
    HelpFeatureTranslation,
  ];
  shortcutsTitle: string;
  shortcutRmbKey: string;
  shortcutRmbDesc: string;
  shortcutUndoDesc: string;
  shortcutCopyPasteDesc: string;
  shortcutPanKey: string;
  shortcutPanDesc: string;
  shortcutDeleteDesc: string;
  shortcutSelectHold: string;
  shortcutDeleteHold: string;
  shortcutPin: string;
  shortcutSnap: string;
  shortcutBezier: string;
  shortcutLayers: string;
  shortcutSteps: string;
  dontShowAgain: string;
}

const en: HelpTranslationBundle = {
  headerSubtitle: 'Interactive Demo & Feature Guide',
  tabDemo: 'Live Demo',
  tabGuide: 'All Features',
  fullscreenEnter: 'Fullscreen Demo',
  fullscreenExit: 'Exit Fullscreen',
  closeLabel: 'Close',
  play: 'Play',
  pause: 'Pause',
  restart: 'Restart',
  prev: 'Prev',
  next: 'Next',
  searchPlaceholder: 'Search features or gestures...',
  searchEmpty: 'No matching features found',
  demoStrokeStyle: 'Stroke & Style',
  demoDoubleLine: '×2 Double Line',
  demoFill: 'Fill',
  demoBorderZero: 'Border down to 0 px',
  demoRadius: 'Radius',
  demoSnapMerged: 'Snap: Merged!',
  steps: [
    {
      title: '1. Amorphous Contour',
      desc: 'Cursor draws a smooth closed organic contour on the canvas.',
    },
    {
      title: '2. Style & ×2 Line',
      desc: 'Change stroke color, fill color, and double line ×2.',
    },
    {
      title: '3. Move, Scale & Rotate',
      desc: 'Move, resize corners, and rotate with the top handle.',
    },
    {
      title: '4. Long-Tap Rounding',
      desc: 'Hold a corner node until amber, then drag inward to round.',
    },
    {
      title: '5. Stamp & Image',
      desc: 'Insert a vector stamp and upload a framed image.',
    },
    {
      title: '6. Text & Deform',
      desc: 'Place text, then stretch, scale, and rotate freely.',
    },
    {
      title: '7. Endpoint Snap',
      desc: 'Flower petals & stem snap together into one unified shape.',
    },
    {
      title: '8. UI Prototyping',
      desc: 'Audio player mockup: rounded frame, equalizer & media icons.',
    },
  ],
  features: [
    {
      title: 'Lines, Brush, Bezier & Shapes',
      badge: 'Right-Click Canvas',
      desc: 'First sidebar button (or right-click anywhere on canvas) opens tools: Select, Brush (standard, soft glow, spray), Line, interactive Bezier curve, Circle, Square (plus Grid with customizable rows & columns), Triangle, 8 Arrow styles (single, double, filled, open, anchor, measure), and 12 polygons & stars.',
    },
    {
      title: 'Closed Contours & Endpoint Snapping',
      desc: 'Toggle Closed Contour for Brush, Bezier, or multi-segment polylines (tap the green start dot to close). With Endpoint Snap active, dragging green endpoint handles magnetically snaps and merges open strokes into one path or closed shape.',
    },
    {
      title: 'Double Line (×2), Fill & 0 px Border',
      desc: 'Independent Stroke & Fill opacity sliders (0–100%), line patterns, Photo fill (frame images inside closed shapes, contours & stamps), and crisp Double Line ×2. When Fill (solid, hatch, or photo) is enabled, stroke width goes down to 0 px for borderless filled shapes.',
    },
    {
      title: 'Long-Tap Node Corner Rounding',
      badge: 'Hold ~0.4s',
      desc: 'Select any rectangle, polygon, star, triangle, or polyline/Bezier shape, hold any corner handle ~0.4s until amber highlights appear, and drag inward to smoothly round vertices. Also adjustable via slider.',
    },
    {
      title: 'Live Editing Existing Shapes & Groups',
      desc: 'Select any existing shape or multi-selection (or right-click it) and open Lines & Shapes or the floating pencil button: stroke, fill, patterns, double line, closed contour, polygon shape variant, and opacity update live.',
    },
    {
      title: 'Typography & Free Transform',
      desc: '30+ fonts with Cyrillic & Latin support, search, and categories. Double-tap text on canvas to edit inline, or drag side/corner handles to stretch, scale, and rotate typography freely.',
    },
    {
      title: 'UI Icons, Prototyping & Offline Emojis',
      desc: '70+ recolorable vector UI wireframe icons (media player, navigation, controls) ideal for app prototyping, plus 260+ offline emojis ready without internet.',
    },
    {
      title: 'Images, Layer Order & Flip',
      desc: 'Upload PNG, JPG, WebP, or SVG images. Use the object editor to add a colored frame border, flip horizontally/vertically, duplicate, or reorder layers front/back.',
    },
    {
      title: 'Eraser & 30-Step Undo / Redo',
      desc: 'Adjustable Eraser deletes painted areas, while Delete/Backspace removes selected objects. Up to 30 undo/redo history steps (Ctrl+Z / Ctrl+Y).',
    },
    {
      title: 'Backgrounds, Canvas Sizes, Export & Offline',
      desc: 'The "…" Actions menu includes PNG/JPG export (full canvas or trimmed artwork), backgrounds (White, Grid, Lined, Dark, RGB & gradients), artboard presets (Screen, 1:1, 16:9, 9:16, custom), and 21 languages. Pan with Space+drag or pinch/wheel to zoom.',
    },
    {
      title: 'Marching-Frame Lasso, Clear Canvas & Copy/Paste',
      badge: 'Hold • Ctrl+V',
      desc: 'Long-press the "Select" button to transform it into a marching dashed arrow and outline any fragment of images or shapes for dragging, copying, or deleting. Long-press the "Delete" button to clear the entire canvas (with confirmation). Standard Ctrl+C / Ctrl+V also pastes text and images directly onto the canvas.',
    },
  ],
  shortcutsTitle: 'Shortcuts & Gestures:',
  shortcutRmbKey: 'RMB',
  shortcutRmbDesc: 'Lines & Shapes',
  shortcutUndoDesc: 'Undo / Redo',
  shortcutCopyPasteDesc: 'Copy / Paste text, image, object (or hold empty canvas)',
  shortcutPanKey: 'Space + Drag',
  shortcutPanDesc: 'Pan canvas',
  shortcutDeleteDesc: 'Delete selected',
  shortcutSelectHold: 'Hold "Select" → Marching frame',
  shortcutDeleteHold: 'Hold "Delete" → Clear canvas',
  shortcutPin: 'Pin sidebar',
  shortcutSnap: 'Snap',
  shortcutBezier: 'Bezier',
  shortcutLayers: 'Layers',
  shortcutSteps: '30 steps',
  dontShowAgain: "Don't show again",
};

const ru: HelpTranslationBundle = {
  headerSubtitle: 'Интерактивное демо и справочник функций',
  tabDemo: 'Интерактив',
  tabGuide: 'Все функции',
  fullscreenEnter: 'На весь экран',
  fullscreenExit: 'Обычный размер',
  closeLabel: 'Закрыть',
  play: 'Смотреть',
  pause: 'Пауза',
  restart: 'Сначала',
  prev: 'Назад',
  next: 'Далее',
  searchPlaceholder: 'Поиск функции или жеста...',
  searchEmpty: 'Ничего не найдено',
  demoStrokeStyle: 'Контур и стиль',
  demoDoubleLine: '×2 Двойная линия',
  demoFill: 'Заливка',
  demoBorderZero: 'Контур от 0 px с заливкой',
  demoRadius: 'Скругление',
  demoSnapMerged: 'Магнит: объединено!',
  steps: [
    {
      title: '1. Аморфный контур',
      desc: 'Курсор рисует плавную замкнутую форму на холсте.',
    },
    {
      title: '2. Стиль и ×2 линия',
      desc: 'Меняем цвет контура, заливку и двойную линию.',
    },
    {
      title: '3. Сдвиг, масштаб, поворот',
      desc: 'Перемещение, размер и поворот за верхнюю ручку.',
    },
    {
      title: '4. Долгий тап → скругление',
      desc: 'Удержание узла скругляет углы при движении внутрь.',
    },
    {
      title: '5. Штамп и фото',
      desc: 'Добавляем векторный штамп и картинку в рамке.',
    },
    {
      title: '6. Текст и деформация',
      desc: 'Вписываем текст, растягиваем по осям и поворачиваем.',
    },
    {
      title: '7. Магнит к концам',
      desc: 'Лепестки цветка и стебель примагничиваются в единую фигуру.',
    },
    {
      title: '8. Прототипирование',
      desc: 'Макет аудиоплеера: скруглённый экран, эквалайзер и кнопки.',
    },
  ],
  features: [
    {
      title: 'Линии, кисть, Безье и фигуры',
      badge: 'ПКМ на холсте',
      desc: 'Первая кнопка панели (или клик ПКМ по холсту) открывает режимы: Выбор, Кисть (обычная, размытая, пульверизатор), Линия, Кривая Безье с точками изгиба, Круг, Квадрат (и Сетка с числом строк и столбцов), Треугольник, 8 видов стрелок (обычная, двухсторонняя, с заполнением и др.) и 12 многоугольников/звёзд.',
    },
    {
      title: 'Замкнутые контуры и магнит к концам',
      desc: 'Переключатель «Замкнутый контур» работает для кисти, Безье и многосегментной ломаной (нажмите на зелёную стартовую точку, чтобы замкнуть фигуру). При включённом магните зелёные маркеры на концах линий притягиваются и объединяют сегменты в единый путь.',
    },
    {
      title: 'Двойная линия (×2), заливка и 0 px контур',
      desc: 'Раздельные ползунки прозрачности контура и заливки (0–100%), типы линий, двойная обводка ×2 и заливка «Фото» (вставка картинки внутрь фигур, замкнутых контуров и штампов как в рамку). Если включена заливка, толщину контура можно снизить до 0 px.',
    },
    {
      title: 'Долгий тап по узлу — скругление углов',
      badge: 'Удержание ~0.4с',
      desc: 'Выделите прямоугольник, треугольник, звезду, многоугольник или ломаную/Безье, зажмите угловую точку рамки ~0.4 сек до оранжевой подсветки и потяните внутрь — углы плавно скруглятся. Также скругление доступно ползунком в меню.',
    },
    {
      title: 'Редактирование готовых фигур и групп',
      desc: 'Выделите один или сразу несколько объектов (или кликните ПКМ по фигуре) и откройте «Линии и фигуры» либо иконку карандаша у рамки: все цвета, заливки, штрихи, типы многоугольников, замыкание контура и прозрачность меняются в реальном времени.',
    },
    {
      title: 'Текст и деформация',
      desc: 'Более 30 шрифтов (кириллица и латиница) с поиском и категориями. Дважды кликните по тексту на холсте для правки, либо тяните за угловые и боковые маркеры рамки, чтобы растянуть, сжать или повернуть надпись.',
    },
    {
      title: 'UI-иконки, прототипы и офлайн-эмодзи',
      desc: 'Более 70 векторных UI-иконок (медиаплеер, навигация, формы, стрелки) для быстрого прототипирования интерфейсов и приложений, а также 260+ офлайн-эмодзи по категориям, работающих без интернета.',
    },
    {
      title: 'Фотографии, слои и отражение',
      desc: 'Загружайте PNG, JPG, WebP или SVG. В редакторе объекта доступны цветная рамка вокруг фото, отражение по горизонтали/вертикали, дублирование и перенос на передний или задний план.',
    },
    {
      title: 'Ластик и История (Отмена / Повтор)',
      desc: 'Ластик с настройкой толщины стирает штрихи, а кнопка удаления (или Delete/Backspace) убирает выделенный объект. История хранит до 30 шагов (Ctrl+Z / Ctrl+Y).',
    },
    {
      title: 'Фон, размер холста, экспорт и офлайн-файл',
      desc: 'В меню «…» доступны: экспорт PNG/JPG (весь холст или только область рисунка), фоны (Белый, Клетка, Линейка, Тёмный, RGB-микшер и градиенты), форматы холста (Экран, 1:1, 16:9, 9:16, свой размер) и выбор языка. Навигация: зум колесом/щипком, сдвиг — Пробел+мышь.',
    },
    {
      title: 'Бегущая рамка, очистка холста и Копирование/Вставка',
      badge: 'Удержание • Ctrl+V',
      desc: 'Долгое нажатие на кнопку «Выбор» превращает её в стрелку из бегущей пунктирной линии и активирует выделение фрагментов изображений и фигур произвольным замкнутым контуром для перетаскивания, копирования и удаления. Долгое нажатие на кнопку «Удалить» (или ластик) открывает окно подтверждения полной очистки холста. Также работает стандартное копирование/вставка (Ctrl+C / Ctrl+V) объектов, текста и изображений прямо на холст.',
    },
  ],
  shortcutsTitle: 'Горячие клавиши и жесты:',
  shortcutRmbKey: 'ПКМ',
  shortcutRmbDesc: 'Линии и фигуры',
  shortcutUndoDesc: 'Отмена / Повтор',
  shortcutCopyPasteDesc: 'Копировать / Вставить текст, фото, объект (или долгий тап по пустому холсту)',
  shortcutPanKey: 'Пробел + перетаскивание',
  shortcutPanDesc: 'Двигать холст',
  shortcutDeleteDesc: 'Удалить выделенное',
  shortcutSelectHold: 'Удержание «Выбор» → Бегущая рамка',
  shortcutDeleteHold: 'Удержание «Удалить» → Очистка холста',
  shortcutPin: 'Закрепить панель',
  shortcutSnap: 'Магнит концов',
  shortcutBezier: 'Безье',
  shortcutLayers: 'Слои',
  shortcutSteps: '30 шагов',
  dontShowAgain: "Больше не показывать",
};

const uk: HelpTranslationBundle = {
  headerSubtitle: 'Інтерактивне демо та довідник функцій',
  tabDemo: 'Інтерактив',
  tabGuide: 'Усі функції',
  fullscreenEnter: 'На весь екран',
  fullscreenExit: 'Звичайний розмір',
  closeLabel: 'Закрити',
  play: 'Дивитись',
  pause: 'Пауза',
  restart: 'Спочатку',
  prev: 'Назад',
  next: 'Далі',
  searchPlaceholder: 'Пошук функції або жесту...',
  searchEmpty: 'Нічого не знайдено',
  demoStrokeStyle: 'Контур і стиль',
  demoDoubleLine: '×2 Подвійна лінія',
  demoFill: 'Заливка',
  demoBorderZero: 'Контур від 0 px із заливкою',
  demoRadius: 'Округлення',
  demoSnapMerged: 'Магніт: об’єднано!',
  steps: [
    {
      title: '1. Аморфний контур',
      desc: 'Курсор малює плавну замкнуту форму на полотні.',
    },
    {
      title: '2. Стиль і ×2 лінія',
      desc: 'Змінюємо колір контуру, заливку та подвійну лінію.',
    },
    {
      title: '3. Зсув, масштаб, поворот',
      desc: 'Переміщення, розмір і поворот за верхню ручку.',
    },
    {
      title: '4. Довгий тап → округлення',
      desc: 'Утримання вузла скругляє кути при русі всередину.',
    },
    {
      title: '5. Штамп і фото',
      desc: 'Додаємо векторний штамп і зображення в рамці.',
    },
    {
      title: '6. Текст і деформація',
      desc: 'Вписуємо текст, розтягуємо по осях і повертаємо.',
    },
    {
      title: '7. Магніт до кінців',
      desc: 'Пелюстки квітки і стебло примагнічуються в єдину фігуру.',
    },
    {
      title: '8. Прототипування',
      desc: 'Макет аудіоплеєра: округлений екран, еквалайзер і кнопки.',
    },
  ],
  features: [
    {
      title: 'Лінії, пензель, Безьє і фігури',
      badge: 'ПКМ на полотні',
      desc: 'Перша кнопка панелі (або клік ПКМ по полотну) відкриває режими: Вибір, Пензель (звичайний, м’який, аерограф), Лінія, крива Безьє, Коло, Квадрат (та Сітка з кількістю рядків і стовпців), Трикутник, 8 видів стрілок (звичайна, двобічна, заповнена тощо) та 12 багатокутників/зірок.',
    },
    {
      title: 'Замкнуті контури і магніт до кінців',
      desc: 'Перемикач «Замкнутий контур» працює для пензля, Безьє та багатосегментної ламаної (натисніть на зелену стартову точку, щоб замкнути). За увімкненого магніту зелені маркери на кінцях притягуються та об’єднують сегменти в один шлях.',
    },
    {
      title: 'Подвійна лінія (×2), заливка і 0 px контур',
      desc: 'Окремі повзунки прозорості контуру й заливки (0–100%), типи ліній, подвійне обведення ×2 та заливка «Фото» (зображення всередині фігур, замкнутих контурів і штампів). Коли увімкнено заливку, товщину контуру можна знизити до 0 px.',
    },
    {
      title: 'Довгий тап по вузлу — округлення кутів',
      badge: 'Утримання ~0.4с',
      desc: 'Виділіть прямокутник, трикутник, зірку, багатокутник або ламану/Безьє, затисніть кутову точку рамки ~0.4 сек до помаранчевого підсвічування й потягніть усередину — кути плавно округляться.',
    },
    {
      title: 'Редагування готових фігур і груп',
      desc: 'Виділіть один або кілька об’єктів (чи клікніть ПКМ по фігурі) і відкрийте «Лінії та фігури» або іконку олівця: кольори, заливки, штрихи, тип багатокутника, замикання контуру та прозорість оновлюються наживо.',
    },
    {
      title: 'Текст і деформація',
      desc: 'Понад 30 шрифтів (кирилиця та латиниця) із пошуком і категоріями. Двічі клікніть по тексту на полотні для редагування або тягніть за бокові й кутові маркери для деформації.',
    },
    {
      title: 'UI-іконки, прототипи й офлайн-емодзі',
      desc: 'Понад 70 векторних UI-іконок (медіаплеєр, навігація, елементи керування) для швидкого прототипування інтерфейсів і 260+ офлайн-емодзі без інтернету.',
    },
    {
      title: 'Фотографії, шари та віддзеркалення',
      desc: 'Завантажуйте PNG, JPG, WebP або SVG. У редакторі об’єкта доступні кольорова рамка навколо фото, дзеркальне відбиття по горизонталі/вертикалі, дублювання та порядок шарів.',
    },
    {
      title: 'Гумка та Історія (Скасувати / Повторити)',
      desc: 'Гумка з налаштуванням розміру стирає штрихи, а кнопка видалення (або Delete/Backspace) прибирає виділений об’єкт. Історія зберігає до 30 кроків (Ctrl+Z / Ctrl+Y).',
    },
    {
      title: 'Фон, розмір полотна, експорт і офлайн-файл',
      desc: 'У меню «…» доступні експорт PNG/JPG (усе полотно або лише малюнок), фони (Білий, Сітка, Лінійка, Темний, RGB і градієнти), формати полотна (Екран, 1:1, 16:9, 9:16, свій розмір) та 21 мова. Навігація: зум колесом/щипком, зсув — Пробіл+миша.',
    },
    {
      title: 'Рухома рамка, очищення полотна та Копі/Паст',
      badge: 'Утримання • Ctrl+V',
      desc: 'Довге натискання на кнопку «Вибір» перетворює її на стрілку з рухомої пунктирної лінії та активує виділення фрагментів зображень і фігур довільним замкнутим контуром для перетягування, копіювання та видалення. Довге натискання на кнопку «Видалити» (або гумку) активує повне очищення полотна з підтвердженням. Також працює стандартне Ctrl+C / Ctrl+V для тексту та фото прямо на полотно.',
    },
  ],
  shortcutsTitle: 'Гарячі клавіші та жести:',
  shortcutRmbKey: 'ПКМ',
  shortcutRmbDesc: 'Лінії та фігури',
  shortcutUndoDesc: 'Скасувати / Повторити',
  shortcutCopyPasteDesc: 'Копіювати / Вставити текст, фото, об’єкт (або довгий тап по порожньому полотну)',
  shortcutPanKey: 'Пробіл + перетягування',
  shortcutPanDesc: 'Рухати полотно',
  shortcutDeleteDesc: 'Видалити виділене',
  shortcutSelectHold: 'Утримання «Вибір» → Рухома рамка',
  shortcutDeleteHold: 'Утримання «Видалити» → Очистити полотно',
  shortcutPin: 'Закріпити панель',
  shortcutSnap: 'Магніт кінців',
  shortcutBezier: 'Безьє',
  shortcutLayers: 'Шари',
  shortcutSteps: '30 кроків',
  dontShowAgain: "Більше не показувати",
};

const be: HelpTranslationBundle = {
  headerSubtitle: 'Інтэрактыўнае дэма і даведнік функцый',
  tabDemo: 'Інтэрактыў',
  tabGuide: 'Усе функцыі',
  fullscreenEnter: 'На ўвесь экран',
  fullscreenExit: 'Звычайны памер',
  closeLabel: 'Закрыць',
  play: 'Глядзець',
  pause: 'Паўза',
  restart: 'Спачатку',
  prev: 'Назад',
  next: 'Далей',
  searchPlaceholder: 'Пошук функцыі або жэсту...',
  searchEmpty: 'Нічога не знойдзена',
  demoStrokeStyle: 'Контур і стыль',
  demoDoubleLine: '×2 Падвойная лінія',
  demoFill: 'Заліўка',
  demoBorderZero: 'Контур ад 0 px з заліўкай',
  demoRadius: 'Акругленне',
  demoSnapMerged: 'Магніт: аб’яднана!',
  steps: [
    {
      title: '1. Аморфны контур',
      desc: 'Курсор малюе плаўную замкнутую форму на палатне.',
    },
    {
      title: '2. Стыль і ×2 лінія',
      desc: 'Мяняем колер контуру, заліўку і падвойную лінію.',
    },
    {
      title: '3. Зрух, маштаб, паварот',
      desc: 'Перамяшчэнне, памер і паварот за верхнюю ручку.',
    },
    {
      title: '4. Доўгі тап → акругленне',
      desc: 'Утрыманне вузла акругляе вуглы пры руху ўнутр.',
    },
    {
      title: '5. Штамп і фота',
      desc: 'Дадаем вектарны штамп і выяву ў рамцы.',
    },
    {
      title: '6. Тэкст і дэфармацыя',
      desc: 'Упісваем тэкст, расцягваем па восях і паварочваем.',
    },
    {
      title: '7. Магніт да канцоў',
      desc: 'Пялёсткі кветкі і сцябло прымагнічваюцца ў адзіную фігуру.',
    },
    {
      title: '8. Прататыпаванне',
      desc: 'Макет аўдыяплэера: акруглены экран, эквалайзер і кнопкі.',
    },
  ],
  features: [
    {
      title: 'Лініі, пэндзаль, Безье і фігуры',
      badge: 'ПКМ на палатне',
      desc: 'Першая кнопка панэлі (або клік ПКМ па палатне) адкрывае рэжымы: Выбар, Пэндзаль (звычайны, мяккі, аэраграф), Лінія, крывая Безье, Кола, Квадрат (і Сетка з колькасцю радкоў і слупкоў), Трохвугольнік, 8 відаў стрэлак і 12 шматкутнікаў/зорак.',
    },
    {
      title: 'Замкнутыя контуры і магніт да канцоў',
      desc: 'Пераключальнік «Замкнуты контур» працуе для пэндзля, Безье і шматсегментнай ламанай (націсніце на зялёны стартавы пункт, каб замкнуць). Пры ўключаным магніце зялёныя маркеры на канцах прыцягваюцца і аб’ядноўваюць сегменты.',
    },
    {
      title: 'Падвойная лінія (×2), заліўка і 0 px контур',
      desc: 'Асобныя паўзункі празрыстасці контуру і заліўкі (0–100%), тыпы ліній, падвойная абводка ×2 і заліўка «Фота» (карцінка ўнутры фігур, замкнёных контураў і штампаў). Калі ўключана заліўка, таўшчыню контуру можна паменшыць да 0 px.',
    },
    {
      title: 'Доўгі тап па вузле — акругленне вуглоў',
      badge: 'Утрыманне ~0.4с',
      desc: 'Вылучыце прамавугольнік, трохвугольнік, зорку, шматкутнік або ламаную/Безье, зацісніце вуглавы пункт рамкі ~0.4 сек да аранжавай падсветкі і пацягніце ўнутр — вуглы плаўна акругляцца.',
    },
    {
      title: 'Рэдагаванне гатовых фігур і груп',
      desc: 'Вылучыце адзін або некалькі аб’ектаў (ці клікніце ПКМ па фігуры) і адкрыйце «Лініі і фігуры» або значок алоўка: колеры, заліўкі, штрыхі, варыянт шматкутніка, замыканне і празрыстасць мяняюцца адразу.',
    },
    {
      title: 'Тэкст і дэфармацыя',
      desc: 'Больш за 30 шрыфтоў (кірыліца і лацініца) з пошукам і катэгорыямі. Двойчы клікніце па тэксце для праўкі або цягніце за вуглавыя і бакавыя маркеры для дэфармацыі.',
    },
    {
      title: 'UI-іконкі, прататыпы і афлайн-эмодзі',
      desc: 'Больш за 70 вектарных UI-іконак (медыяплэер, навігацыя, формы) для хуткага прататыпавання інтэрфейсаў, а таксама 260+ афлайн-эмодзі без інтэрнэту.',
    },
    {
      title: 'Фотаздымкі, слаі і адлюстраванне',
      desc: 'Загружайце PNG, JPG, WebP або SVG. У рэдактары аб’екта даступны каляровая рамка вакол фота, адлюстраванне па гарызанталі/вертыкалі, дубляванне і парадак слаёў.',
    },
    {
      title: 'Гумка і Гісторыя (Адмяніць / Паўтарыць)',
      desc: 'Гумка з наладай памеру сцірае штрыхі, а кнопка выдалення (або Delete/Backspace) прыбірае вылучаны аб’ект. Гісторыя захоўвае да 30 крокаў (Ctrl+Z / Ctrl+Y).',
    },
    {
      title: 'Фон, памер палатна, экспарт і афлайн-файл',
      desc: 'У меню «…» даступны экспарт PNG/JPG (усё палатно ці толькі малюнак), фоны (Белы, Сетка, Лінейка, Цёмны, RGB і градыенты), фарматы палатна (Экран, 1:1, 16:9, 9:16, свой памер) і 21 мова.',
    },
    {
      title: 'Бягучая рамка, ачыстка палатна і Копі/Паст',
      badge: 'Утрыманне • Ctrl+V',
      desc: 'Доўгі націск на кнопку «Выбар» ператварае яе ў стрэлку з бягучай пункцірнай лініі і актывуе вылучэнне фрагментаў выяў і фігур адвольным замкнутым контурам для перацягвання, капіявання і выдалення. Доўгі націск на кнопку «Выдаліць» (ці гумку) актывуе поўную ачыстку палатна з пацвярджэннем. Таксама працуе стандартнае Ctrl+C / Ctrl+V для тэксту і фота прама на палатно.',
    },
  ],
  shortcutsTitle: 'Гарачыя клавішы і жэсты:',
  shortcutRmbKey: 'ПКМ',
  shortcutRmbDesc: 'Лініі і фігуры',
  shortcutUndoDesc: 'Адмяніць / Паўтарыць',
  shortcutCopyPasteDesc: 'Капіяваць / Уставіць тэкст, фота, аб’ект (ці доўгі тап па пустым палатне)',
  shortcutPanKey: 'Прабел + перацягванне',
  shortcutPanDesc: 'Рухаць палатно',
  shortcutDeleteDesc: 'Выдаліць вылучанае',
  shortcutSelectHold: 'Утрыманне «Выбар» → Бягучая рамка',
  shortcutDeleteHold: 'Утрыманне «Выдаліць» → Ачысціць палатно',
  shortcutPin: 'Замацаваць панэль',
  shortcutSnap: 'Магніт канцоў',
  shortcutBezier: 'Безье',
  shortcutLayers: 'Слаі',
  shortcutSteps: '30 крокаў',
  dontShowAgain: "Больш не паказваць",
};

const kk: HelpTranslationBundle = {
  headerSubtitle: 'Интерактивті демо және функциялар анықтамалығы',
  tabDemo: 'Интерактив',
  tabGuide: 'Барлық функция',
  fullscreenEnter: 'Толық экранға',
  fullscreenExit: 'Қалыпты өлшем',
  closeLabel: 'Жабу',
  play: 'Көру',
  pause: 'Кідірту',
  restart: 'Басынан',
  prev: 'Артқа',
  next: 'Алға',
  searchPlaceholder: 'Функция немесе қимылды іздеу...',
  searchEmpty: 'Ештеңе табылмады',
  demoStrokeStyle: 'Контур және стиль',
  demoDoubleLine: '×2 Қос сызық',
  demoFill: 'Бояу',
  demoBorderZero: 'Бояумен контур 0 px дейін',
  demoRadius: 'Дөңгелектеу',
  demoSnapMerged: 'Магнит: біріктірілді!',
  steps: [
    {
      title: '1. Аморфты контур',
      desc: 'Курсор кенепте тегіс тұйық пішін салады.',
    },
    {
      title: '2. Стиль және ×2 сызық',
      desc: 'Контур түсін, бояуын және қос сызықты өзгертеміз.',
    },
    {
      title: '3. Жылжыту, масштаб, бұру',
      desc: 'Жылжыту, өлшемді өзгерту және жоғарғы тұтқадан бұру.',
    },
    {
      title: '4. Ұзақ басу → дөңгелектеу',
      desc: 'Түйінді басып тұрып ішке тартсаңыз, бұрыштар дөңгелектенеді.',
    },
    {
      title: '5. Штамп және фото',
      desc: 'Векторлық штамп пен жақтаудағы суретті қосамыз.',
    },
    {
      title: '6. Мәтін және деформация',
      desc: 'Мәтін енгізіп, осьтер бойынша созып, бұрамыз.',
    },
    {
      title: '7. Ұштарын магниттеу',
      desc: 'Гүл күлтелері мен сабағы бір тұтас пішінге бірігеді.',
    },
    {
      title: '8. Прототиптеу',
      desc: 'Аудиоплеер макеті: дөңгелектелген экран, эквалайзер және батырмалар.',
    },
  ],
  features: [
    {
      title: 'Сызықтар, қылқалам, Безье және пішіндер',
      badge: 'Кенепте ОЖБ',
      desc: 'Панельдің бірінші батырмасы (немесе кенепте оң жақ батырма) Таңдау, Қылқалам (қарапайым, жұмсақ, бүріккіш), Сызық, Безье қисығы, Шеңбер, Шаршы (және жол/баған торкөзі), Үшбұрыш, 8 түрлі көрсеткі және 12 көпбұрышты ашады.',
    },
    {
      title: 'Тұйық контурлар және ұштарын магниттеу',
      desc: '«Тұйық контур» ауыстырғышы қылқалам, Безье және сынық сызық үшін жұмыс істейді (тұйықтау үшін жасыл бастау нүктесін басыңыз). Магнит қосулы болса, жасыл ұш нүктелері өзара тартылып, бірігеді.',
    },
    {
      title: 'Қос сызық (×2), бояу және 0 px контур',
      desc: 'Контур мен бояудың бөлек мөлдірлік жүгірткілері (0–100%), сызық түрлері, ×2 қос жиектеме және «Фото» бояуы (пішін, тұйық контур және штамп ішіне сурет қою). Бояу қосулы кезде контур қалыңдығын 0 px дейін түсіруге болады.',
    },
    {
      title: 'Түйінді ұзақ басу — бұрыштарды дөңгелектеу',
      badge: 'Ұстап тұру ~0.4с',
      desc: 'Тіктөртбұрыш, үшбұрыш, жұлдыз, көпбұрыш немесе Безье/сынық сызықты таңдап, бұрыш түйінін қызғылт сары жанғанша ~0.4 сек ұстап ішке тартыңыз — бұрыштар тегіс дөңгелектенеді.',
    },
    {
      title: 'Дайын пішіндер мен топтарды өңдеу',
      desc: 'Бір немесе бірнеше нысанды таңдаңыз (немесе тінтуірдің оң батырмасын басыңыз): барлық түс, бояу, штрих, көпбұрыш түрі және мөлдірлік нақты уақытта өзгереді.',
    },
    {
      title: 'Мәтін және еркін түрлендіру',
      desc: 'Іздеу мен санаттары бар 30+ қаріп (кириллица және латын). Өңдеу үшін кенептегі мәтінді екі рет басыңыз немесе созу/бұру үшін жақтау нүктелерін тартыңыз.',
    },
    {
      title: 'UI белгішелері, прототип және офлайн-эмодзи',
      desc: 'Қолданба прототиптерін жасауға арналған 70+ векторлық UI белгішесі (медиаплеер, навигация, басқару) және интернетсіз жұмыс істейтін 260+ офлайн-эмодзи.',
    },
    {
      title: 'Суреттер, қабаттар және айналу',
      desc: 'PNG, JPG, WebP немесе SVG жүктеңіз. Нысан өңдегішінде фото жиектемесі, көлденең/тік айналдыру, көшірме жасау және алға/артқа реттеу бар.',
    },
    {
      title: 'Өшіргіш және Тарих (Болдырмау / Қайталау)',
      desc: 'Өлшемі реттелетін өшіргіш сызықтарды өшіреді, ал жою батырмасы (Delete/Backspace) таңдалған нысанды өшіреді. Тарих 30 қадамға дейін сақтайды (Ctrl+Z / Ctrl+Y).',
    },
    {
      title: 'Фон, кенеп өлшемі, экспорт және офлайн-файл',
      desc: '«…» мәзірінде PNG/JPG экспорты (толық кенеп немесе тек сурет), фондар (Ақ, Тор, Сызықты, Қараңғы, RGB, градиент), өлшемдер (Экран, 1:1, 16:9, 9:16, еркін) және 21 тіл бар.',
    },
    {
      title: 'Жүгірмелі жақтау, кенепті тазарту және Көшіру/Қою',
      badge: 'Ұстау • Ctrl+V',
      desc: '«Таңдау» батырмасын ұзақ басу оны жүгірмелі үзік сызықты көрсеткіге айналдырып, сүйреу, көшіру және жою үшін суреттер мен пішіндердің бөліктерін еркін тұйық контурмен бөліп алуды іске қосады. «Жою» батырмасын (немесе өшіргішті) ұзақ басу кенепті толық тазартуды растаумен ашады. Сондай-ақ Ctrl+C / Ctrl+V арқылы мәтін мен суретті тікелей кенепке қоюға болады.',
    },
  ],
  shortcutsTitle: 'Жылдам пернелер мен қимылдар:',
  shortcutRmbKey: 'ОЖБ',
  shortcutRmbDesc: 'Сызықтар мен пішіндер',
  shortcutUndoDesc: 'Болдырмау / Қайталау',
  shortcutCopyPasteDesc: 'Мәтін, фото, нысанды көшіру / қою (немесе бос кенепті ұстап тұру)',
  shortcutPanKey: 'Бос орын + сүйреу',
  shortcutPanDesc: 'Кенепті жылжыту',
  shortcutDeleteDesc: 'Таңдалғанды жою',
  shortcutSelectHold: '«Таңдау» ұстау → Жүгірмелі жақтау',
  shortcutDeleteHold: '«Жою» ұстау → Кенепті тазарту',
  shortcutPin: 'Панельді бекіту',
  shortcutSnap: 'Ұш магниті',
  shortcutBezier: 'Безье',
  shortcutLayers: 'Қабаттар',
  shortcutSteps: '30 қадам',
  dontShowAgain: "Енді көрсетпеу",
};

const es: HelpTranslationBundle = {
  headerSubtitle: 'Demo interactiva y guía de funciones',
  tabDemo: 'Demo en vivo',
  tabGuide: 'Funciones',
  fullscreenEnter: 'Pantalla completa',
  fullscreenExit: 'Tamaño normal',
  closeLabel: 'Cerrar',
  play: 'Ver',
  pause: 'Pausa',
  restart: 'Reiniciar',
  prev: 'Ant.',
  next: 'Sig.',
  searchPlaceholder: 'Buscar función o gesto...',
  searchEmpty: 'No se encontraron resultados',
  demoStrokeStyle: 'Trazo y estilo',
  demoDoubleLine: '×2 Línea doble',
  demoFill: 'Relleno',
  demoBorderZero: 'Borde desde 0 px con relleno',
  demoRadius: 'Radio',
  demoSnapMerged: 'Imán: ¡Unido!',
  steps: [
    {
      title: '1. Contorno amorfo',
      desc: 'El cursor traza una forma orgánica cerrada y suave.',
    },
    {
      title: '2. Estilo y línea ×2',
      desc: 'Cambia el color del trazo, relleno y línea doble ×2.',
    },
    {
      title: '3. Mover, escalar y girar',
      desc: 'Desplaza, redimensiona y rota desde el asa superior.',
    },
    {
      title: '4. Toque largo → redondear',
      desc: 'Mantén un nodo hasta el brillo ámbar y arrastra adentro.',
    },
    {
      title: '5. Sello e imagen',
      desc: 'Inserta un icono vectorial y una foto con marco.',
    },
    {
      title: '6. Texto y deformación',
      desc: 'Escribe texto, estíralo por ejes y gíralo libremente.',
    },
    {
      title: '7. Imán de extremos',
      desc: 'Los pétalos y el tallo se imantan en una sola figura.',
    },
    {
      title: '8. Prototipado UI',
      desc: 'Reproductor de audio: marco redondeado, ecualizador y botones.',
    },
  ],
  features: [
    {
      title: 'Líneas, pincel, Bézier y formas',
      badge: 'Clic derecho',
      desc: 'El primer botón (o clic derecho en el lienzo) abre: Selección, Pincel (estándar, suave, aerosol), Línea, curva Bézier interactiva, Círculo, Cuadrado (y Cuadrícula con filas y columnas), Triángulo, 8 estilos de flecha y 12 polígonos/estrellas.',
    },
    {
      title: 'Contornos cerrados e imán de extremos',
      desc: 'Activa Contorno cerrado para pincel, Bézier o polilíneas (toca el punto verde inicial para cerrar). Con el imán activo, los extremos verdes se atraen y unen trazos en una sola ruta.',
    },
    {
      title: 'Línea doble (×2), relleno y borde 0 px',
      desc: 'Deslizadores independientes de opacidad para trazo y relleno (0–100%), estilos de línea, línea doble ×2 y relleno «Foto» (enmarca imágenes en formas, contornos y sellos). Con relleno activo, puedes bajar el grosor a 0 px.',
    },
    {
      title: 'Toque largo en nodo para redondear',
      badge: 'Mantener ~0.4s',
      desc: 'Selecciona un rectángulo, polígono, estrella, triángulo o polilínea/Bézier, mantén un nodo ~0.4s hasta que se ilumine en ámbar y arrastra hacia dentro para suavizar esquinas.',
    },
    {
      title: 'Edición en vivo de formas y grupos',
      desc: 'Selecciona uno o varios objetos (o haz clic derecho) y abre Líneas y Formas o el icono del lápiz: colores, rellenos, tramas, variante poligonal y opacidad se actualizan al instante.',
    },
    {
      title: 'Texto y transformación libre',
      desc: 'Más de 30 fuentes (cirílico y latino) con buscador y categorías. Haz doble clic en el texto para editarlo o arrastra los tiradores laterales para deformarlo.',
    },
    {
      title: 'Iconos UI, prototipos y emojis offline',
      desc: 'Más de 70 iconos vectoriales UI recoloreables (reproductor, navegación, controles) ideales para prototipar apps, más 260+ emojis listos sin conexión.',
    },
    {
      title: 'Imágenes, orden de capas y volteo',
      desc: 'Sube PNG, JPG, WebP o SVG. En el editor de objetos añade un marco de color, voltea horizontal/verticalmente, duplica o cambia el orden de capas.',
    },
    {
      title: 'Borrador e Historial (30 pasos)',
      desc: 'El borrador ajustable elimina trazos y Suprimir/Borrar elimina objetos seleccionados. Historial de hasta 30 pasos con Ctrl+Z / Ctrl+Y.',
    },
    {
      title: 'Fondos, tamaños, exportación y archivo offline',
      desc: 'En el menú «…» encontrarás exportación PNG/JPG (lienzo completo o solo dibujo), fondos (Blanco, Cuadrícula, Rayado, Oscuro, RGB y degradados), formatos (Pantalla, 1:1, 16:9, 9:16, libre) y 21 idiomas.',
    },
    {
      title: 'Marco discontinuo, limpiar lienzo y Copiar/Pegar',
      badge: 'Mantener • Ctrl+V',
      desc: 'Mantener pulsado el botón «Seleccionar» lo transforma en una flecha de línea discontinua animada para contornear cualquier fragmento de imágenes o formas y moverlo, copiarlo o eliminarlo. Mantener pulsado «Eliminar» (o el borrador) activa la limpieza total del lienzo con confirmación. También puedes pegar texto e imágenes directamente con Ctrl+C / Ctrl+V.',
    },
  ],
  shortcutsTitle: 'Atajos y gestos:',
  shortcutRmbKey: 'Clic der.',
  shortcutRmbDesc: 'Líneas y Formas',
  shortcutUndoDesc: 'Deshacer / Rehacer',
  shortcutCopyPasteDesc: 'Copiar / Pegar texto, foto u objeto (o mantén en lienzo vacío)',
  shortcutPanKey: 'Espacio + arrastrar',
  shortcutPanDesc: 'Mover lienzo',
  shortcutDeleteDesc: 'Eliminar selección',
  shortcutSelectHold: 'Mantener «Seleccionar» → Marco animado',
  shortcutDeleteHold: 'Mantener «Eliminar» → Limpiar lienzo',
  shortcutPin: 'Fijar barra',
  shortcutSnap: 'Imán',
  shortcutBezier: 'Bézier',
  shortcutLayers: 'Capas',
  shortcutSteps: '30 pasos',
  dontShowAgain: "No volver a mostrar",
};

const pt: HelpTranslationBundle = {
  headerSubtitle: 'Demonstração interativa e guia de recursos',
  tabDemo: 'Demo ao vivo',
  tabGuide: 'Recursos',
  fullscreenEnter: 'Tela cheia',
  fullscreenExit: 'Tamanho normal',
  closeLabel: 'Fechar',
  play: 'Reproduzir',
  pause: 'Pausar',
  restart: 'Reiniciar',
  prev: 'Ant.',
  next: 'Próx.',
  searchPlaceholder: 'Buscar recurso ou gesto...',
  searchEmpty: 'Nenhum resultado encontrado',
  demoStrokeStyle: 'Traço e estilo',
  demoDoubleLine: '×2 Linha dupla',
  demoFill: 'Preenchimento',
  demoBorderZero: 'Contorno até 0 px com preench.',
  demoRadius: 'Raio',
  demoSnapMerged: 'Ímã: Unido!',
  steps: [
    {
      title: '1. Contorno amorfo',
      desc: 'O cursor desenha uma forma orgânica fechada e suave.',
    },
    {
      title: '2. Estilo e linha ×2',
      desc: 'Altere cor do contorno, preenchimento e linha dupla ×2.',
    },
    {
      title: '3. Mover, escalar e girar',
      desc: 'Mova, redimensione pelos cantos e gire pela alça superior.',
    },
    {
      title: '4. Toque longo → arredondar',
      desc: 'Segure um nó até ficar âmbar e arraste para dentro.',
    },
    {
      title: '5. Carimbo e imagem',
      desc: 'Insira um ícone vetorial e uma imagem com moldura.',
    },
    {
      title: '6. Texto e deformação',
      desc: 'Adicione texto, estique nos eixos e gire livremente.',
    },
    {
      title: '7. Ímã nas pontas',
      desc: 'Pétalas da flor e caule se unem em uma única figura.',
    },
    {
      title: '8. Prototipagem UI',
      desc: 'Player de áudio: tela arredondada, equalizador e botões.',
    },
  ],
  features: [
    {
      title: 'Linhas, pincel, Bézier e formas',
      badge: 'Botão direito',
      desc: 'O primeiro botão (ou clique direito na tela) abre: Selecionar, Pincel (padrão, suave, spray), Linha, curva Bézier, Círculo, Quadrado (e Grade com linhas/colunas), Triângulo, 8 estilos de seta e 12 polígonos/estrelas.',
    },
    {
      title: 'Contornos fechados e ímã nas pontas',
      desc: 'Ative Contorno fechado para pincel, Bézier ou polilinhas (toque no ponto verde inicial para fechar). Com o ímã ativo, as pontas verdes se atraem e fundem segmentos em um só caminho.',
    },
    {
      title: 'Linha dupla (×2), preenchimento e borda 0 px',
      desc: 'Controles separados de opacidade para contorno e preenchimento (0–100%), padrões de linha, linha dupla ×2 e preenchimento «Foto» (imagens dentro de formas, contornos e carimbos). Com preenchimento ativo, a borda chega a 0 px.',
    },
    {
      title: 'Toque longo no nó para arredondar',
      badge: 'Segurar ~0.4s',
      desc: 'Selecione um retângulo, polígono, estrela, triângulo ou polilinha/Bézier, segure um nó de canto ~0.4s até brilhar em âmbar e arraste para dentro.',
    },
    {
      title: 'Edição ao vivo de formas e grupos',
      desc: 'Selecione um ou vários objetos (ou clique direito) e abra Linhas e Formas ou o ícone de lápis: cores, preenchimento, traços, polígono e opacidade atualizam na hora.',
    },
    {
      title: 'Tipografia e transformação livre',
      desc: 'Mais de 30 fontes (cirílico e latino) com busca e categorias. Dê dois cliques no texto para editar ou arraste as alças laterais para deformar.',
    },
    {
      title: 'Ícones UI, protótipos e emojis offline',
      desc: 'Mais de 70 ícones vetoriais UI recoloríveis (player de mídia, navegação, controles) para prototipar apps, mais 260+ emojis disponíveis offline.',
    },
    {
      title: 'Imagens, ordem de camadas e espelhar',
      desc: 'Envie PNG, JPG, WebP ou SVG. No editor do objeto adicione moldura colorida, espelhe na horizontal/vertical, duplique ou reordene camadas.',
    },
    {
      title: 'Borracha e Histórico (30 passos)',
      desc: 'A borracha ajustável apaga traços e Delete/Backspace remove objetos selecionados. Até 30 passos de histórico com Ctrl+Z / Ctrl+Y.',
    },
    {
      title: 'Fundos, tamanhos, exportação e offline',
      desc: 'O menu «…» traz exportação PNG/JPG (tela toda ou só desenho), fundos (Branco, Grade, Pautado, Escuro, RGB e gradientes), formatos (Tela, 1:1, 16:9, 9:16, livre) e 21 idiomas.',
    },
    {
      title: 'Seleção tracejada, limpar tela e Copiar/Colar',
      badge: 'Segurar • Ctrl+V',
      desc: 'Segurar o botão «Selecionar» transforma-o numa seta tracejada animada para contornar livremente fragmentos de imagens ou formas para arrastar, copiar ou apagar. Segurar «Excluir» (ou borracha) ativa a limpeza total da tela com confirmação. Ctrl+C / Ctrl+V também cola textos e imagens diretamente na tela.',
    },
  ],
  shortcutsTitle: 'Atalhos e gestos:',
  shortcutRmbKey: 'Botão dir.',
  shortcutRmbDesc: 'Linhas e Formas',
  shortcutUndoDesc: 'Desfazer / Refazer',
  shortcutCopyPasteDesc: 'Copiar / Colar texto, imagem, objeto (ou segure na tela vazia)',
  shortcutPanKey: 'Espaço + arrastar',
  shortcutPanDesc: 'Mover tela',
  shortcutDeleteDesc: 'Excluir seleção',
  shortcutSelectHold: 'Segurar «Selecionar» → Seleção tracejada',
  shortcutDeleteHold: 'Segurar «Excluir» → Limpar tela',
  shortcutPin: 'Fixar barra',
  shortcutSnap: 'Ímã',
  shortcutBezier: 'Bézier',
  shortcutLayers: 'Camadas',
  shortcutSteps: '30 passos',
  dontShowAgain: "Não mostrar novamente",
};

const fr: HelpTranslationBundle = {
  headerSubtitle: 'Démo interactive et guide des fonctions',
  tabDemo: 'Démo',
  tabGuide: 'Toutes les fonctions',
  fullscreenEnter: 'Plein écran',
  fullscreenExit: 'Taille normale',
  closeLabel: 'Fermer',
  play: 'Lire',
  pause: 'Pause',
  restart: 'Rejouer',
  prev: 'Préc.',
  next: 'Suiv.',
  searchPlaceholder: 'Rechercher une fonction ou un geste...',
  searchEmpty: 'Aucun résultat trouvé',
  demoStrokeStyle: 'Contour et style',
  demoDoubleLine: '×2 Ligne double',
  demoFill: 'Remplissage',
  demoBorderZero: 'Contour dès 0 px avec fond',
  demoRadius: 'Arrondi',
  demoSnapMerged: 'Aimant : Fusionné !',
  steps: [
    {
      title: '1. Contour amorphe',
      desc: 'Le curseur trace une forme organique fermée et fluide.',
    },
    {
      title: '2. Style et ligne ×2',
      desc: 'Changez la couleur du trait, le fond et la ligne ×2.',
    },
    {
      title: '3. Déplacer, zoomer, pivoter',
      desc: 'Déplacez, redimensionnez et pivotez par la poignée haute.',
    },
    {
      title: '4. Appui long → arrondi',
      desc: 'Maintenez un nœud jusqu’à l’ambre puis glissez dedans.',
    },
    {
      title: '5. Tampon et image',
      desc: 'Ajoutez une icône vectorielle et une image encadrée.',
    },
    {
      title: '6. Texte et déformation',
      desc: 'Écrivez du texte, étirez et pivotez librement.',
    },
    {
      title: '7. Aimant aux extrémités',
      desc: 'Les pétales et la tige s’aimantent en une seule forme.',
    },
    {
      title: '8. Prototypage UI',
      desc: 'Lecteur audio : cadre arrondi, égaliseur et boutons.',
    },
  ],
  features: [
    {
      title: 'Lignes, pinceau, Bézier et formes',
      badge: 'Clic droit',
      desc: 'Le 1er bouton (ou clic droit sur la toile) ouvre : Sélection, Pinceau (standard, doux, aérographe), Ligne, courbe de Bézier, Cercle, Carré (et Grille à lignes/colonnes), Triangle, 8 styles de flèche et 12 polygones/étoiles.',
    },
    {
      title: 'Contours fermés et aimant aux extrémités',
      desc: 'Activez Contour fermé pour le pinceau, Bézier ou les polylignes (touchez le point vert de départ pour fermer). Avec l’aimant actif, les poignées vertes fusionnent les tracés.',
    },
    {
      title: 'Ligne double (×2), fond et bordure 0 px',
      desc: 'Curseurs d’opacité séparés pour contour et remplissage (0–100 %), styles de trait, ligne double ×2 et remplissage « Photo » (images cadrées dans formes, contours et tampons). Avec un fond actif, la bordure descend jusqu’à 0 px.',
    },
    {
      title: 'Appui long sur un nœud pour arrondir',
      badge: 'Maintenir ~0.4s',
      desc: 'Sélectionnez un rectangle, polygone, étoile, triangle ou polyligne/Bézier, maintenez un coin ~0.4s jusqu’à la lueur ambre et glissez vers l’intérieur pour arrondir.',
    },
    {
      title: 'Édition en direct de formes et groupes',
      desc: 'Sélectionnez un ou plusieurs objets (ou clic droit) et ouvrez Lignes et Formes ou le crayon : couleurs, fonds, motifs, variante de polygone et opacité se mettent à jour en direct.',
    },
    {
      title: 'Typographie et transformation libre',
      desc: 'Plus de 30 polices (cyrillique et latin) avec recherche et catégories. Double-cliquez sur le texte pour éditer ou tirez les poignées pour étirer et pivoter.',
    },
    {
      title: 'Icônes UI, prototypes et emojis hors ligne',
      desc: 'Plus de 70 icônes UI vectorielles recolorables (lecteur média, navigation, contrôles) idéales pour prototyper des applis, et 260+ emojis utilisables sans internet.',
    },
    {
      title: 'Images, ordre des calques et miroir',
      desc: 'Importez PNG, JPG, WebP ou SVG. L’éditeur d’objet permet d’ajouter un cadre coloré, de retourner H/V, de dupliquer et de placer devant ou derrière.',
    },
    {
      title: 'Gomme et Historique (30 étapes)',
      desc: 'La gomme réglable efface les traits et Suppr/Retour supprime l’objet sélectionné. Historique jusqu’à 30 étapes avec Ctrl+Z / Ctrl+Y.',
    },
    {
      title: 'Fonds, formats, export et mode hors ligne',
      desc: 'Le menu « … » inclut l’export PNG/JPG (toile entière ou dessin seul), les fonds (Blanc, Grille, Ligné, Sombre, RGB et dégradés), les formats (Écran, 1:1, 16:9, 9:16, libre) et 21 langues.',
    },
    {
      title: 'Lasso animé, vider la toile et Copier/Coller',
      badge: 'Appui long • Ctrl+V',
      desc: 'Un appui long sur « Sélection » le transforme en flèche pointillée animée pour découper librement des fragments d’images ou de formes afin de les déplacer, copier ou supprimer. Un appui long sur « Supprimer » (ou la gomme) active l’effacement complet de la toile avec confirmation. Ctrl+C / Ctrl+V colle aussi texte et images directement sur la toile.',
    },
  ],
  shortcutsTitle: 'Raccourcis et gestes :',
  shortcutRmbKey: 'Clic droit',
  shortcutRmbDesc: 'Lignes et Formes',
  shortcutUndoDesc: 'Annuler / Rétablir',
  shortcutCopyPasteDesc: 'Copier / Coller texte, image, objet (ou maintien sur zone vide)',
  shortcutPanKey: 'Espace + glisser',
  shortcutPanDesc: 'Déplacer la toile',
  shortcutDeleteDesc: 'Supprimer la sélection',
  shortcutSelectHold: 'Appui long « Sélection » → Cadre animé',
  shortcutDeleteHold: 'Appui long « Supprimer » → Vider la toile',
  shortcutPin: 'Épingler la barre',
  shortcutSnap: 'Aimant',
  shortcutBezier: 'Bézier',
  shortcutLayers: 'Calques',
  shortcutSteps: '30 étapes',
  dontShowAgain: "Ne plus afficher",
};

const de: HelpTranslationBundle = {
  headerSubtitle: 'Interaktive Demo & Funktionsübersicht',
  tabDemo: 'Live-Demo',
  tabGuide: 'Alle Funktionen',
  fullscreenEnter: 'Vollbild-Demo',
  fullscreenExit: 'Normale Größe',
  closeLabel: 'Schließen',
  play: 'Abspielen',
  pause: 'Pause',
  restart: 'Neustart',
  prev: 'Zurück',
  next: 'Weiter',
  searchPlaceholder: 'Funktion oder Geste suchen...',
  searchEmpty: 'Keine passenden Funktionen gefunden',
  demoStrokeStyle: 'Kontur & Stil',
  demoDoubleLine: '×2 Doppellinie',
  demoFill: 'Füllung',
  demoBorderZero: 'Kontur bis 0 px mit Füllung',
  demoRadius: 'Radius',
  demoSnapMerged: 'Magnet: Vereint!',
  steps: [
    {
      title: '1. Organische Kontur',
      desc: 'Der Cursor zeichnet eine glatte geschlossene Form.',
    },
    {
      title: '2. Stil & ×2-Linie',
      desc: 'Konturfarbe, Füllung und Doppellinie ×2 anpassen.',
    },
    {
      title: '3. Bewegen, Skalieren, Drehen',
      desc: 'Verschieben, Ecken skalieren und oben frei drehen.',
    },
    {
      title: '4. Langdruck → Abrunden',
      desc: 'Eckpunkt bis Bernstein halten und nach innen ziehen.',
    },
    {
      title: '5. Stempel & Foto',
      desc: 'Vektor-Icon und gerahmtes Bild auf der Leinwand.',
    },
    {
      title: '6. Text & Verformen',
      desc: 'Text einfügen, frei strecken, skalieren und drehen.',
    },
    {
      title: '7. Endpunkt-Magnet',
      desc: 'Blütenblätter und Stiel rasten zu einer Form ein.',
    },
    {
      title: '8. UI-Prototyping',
      desc: 'Audioplayer-Mockup: runder Rahmen, Equalizer & Tasten.',
    },
  ],
  features: [
    {
      title: 'Linien, Pinsel, Bézier & Formen',
      badge: 'Rechtsklick Leinwand',
      desc: 'Die erste Taste (oder Rechtsklick auf die Leinwand) öffnet: Auswahl, Pinsel (Standard, Weich, Sprühdose), Linie, interaktive Bézierkurve, Kreis, Rechteck (samt Raster mit Zeilen & Spalten), Dreieck, 8 Pfeilstile sowie 12 Polygone/Sterne.',
    },
    {
      title: 'Geschlossene Konturen & Endpunkt-Magnet',
      desc: 'Aktivieren Sie «Geschlossene Kontur» für Pinsel, Bézier oder Polylinien (Startpunkt antippen zum Schließen). Mit aktivem Magneten verbinden grüne Endpunkte offene Linien nahtlos.',
    },
    {
      title: 'Doppellinie (×2), Füllung & 0 px Kontur',
      desc: 'Getrennte Deckkraft-Regler für Kontur und Füllung (0–100 %), Linienstile, Doppellinie ×2 und Foto-Füllung (Bilder in Formen, Konturen & Stempeln einrahmen). Bei aktiver Füllung lässt sich die Kontur auf 0 px reduzieren.',
    },
    {
      title: 'Langes Halten auf Eckpunkt zum Abrunden',
      badge: 'Halten ~0,4 s',
      desc: 'Rechteck, Polygon, Stern, Dreieck oder Polylinie/Bézier wählen, einen Eckpunkt ~0,4 s bis zur bernsteinfarbenen Anzeige halten und nach innen ziehen.',
    },
    {
      title: 'Live-Bearbeitung von Formen & Gruppen',
      desc: 'Einzelnes Objekt oder Mehrfachauswahl markieren (oder Rechtsklick) und Linien & Formen oder den Stift öffnen: Farben, Füllung, Muster, Polygonvariante und Deckkraft ändern sich sofort.',
    },
    {
      title: 'Typografie & freie Transformation',
      desc: 'Über 30 Schriften (Kyrillisch & Latein) mit Suche und Kategorien. Doppelklick auf Text zum Bearbeiten oder Seitengriffe ziehen zum freien Strecken und Drehen.',
    },
    {
      title: 'UI-Icons, Prototyping & Offline-Emojis',
      desc: 'Über 70 umfärbbare Vektor-UI-Icons (Mediaplayer, Navigation, Steuerung) für App-Prototypen sowie 260+ Offline-Emojis ohne Internetverbindung.',
    },
    {
      title: 'Bilder, Ebenenreihenfolge & Spiegeln',
      desc: 'PNG, JPG, WebP oder SVG hochladen. Im Objekt-Editor farbigen Fotorahmen ergänzen, horizontal/vertikal spiegeln, duplizieren oder Ebenen nach vorn/hinten legen.',
    },
    {
      title: 'Radiergummi & Verlauf (30 Schritte)',
      desc: 'Einstellbarer Radierer entfernt Striche, Entf/Backspace löscht gewählte Objekte. Bis zu 30 Rückgängig/Wiederholen-Schritte (Strg+Z / Strg+Y).',
    },
    {
      title: 'Hintergründe, Formate, Export & Offline-Datei',
      desc: 'Im «…»-Menü: PNG/JPG-Export (ganze Leinwand oder nur Zeichnung), Hintergründe (Weiß, Raster, Liniert, Dunkel, RGB & Verläufe), Leinwandgrößen (Bildschirm, 1:1, 16:9, 9:16, frei) und 21 Sprachen.',
    },
    {
      title: 'Laufrahmen-Lasso, Leinwand leeren & Kopieren/Einfügen',
      badge: 'Halten • Strg+V',
      desc: 'Langes Drücken auf «Auswahl» verwandelt die Taste in einen animierten gestrichelten Pfeil zum freien Ausschneiden von Bild- oder Formfragmenten zum Verschieben, Kopieren und Löschen. Langes Drücken auf «Löschen» (oder Radierer) aktiviert die vollständige Leinwand-Löschung mit Bestätigung. Strg+C / Strg+V fügt zudem Texte und Bilder direkt ein.',
    },
  ],
  shortcutsTitle: 'Tastenkürzel & Gesten:',
  shortcutRmbKey: 'Rechtsklick',
  shortcutRmbDesc: 'Linien & Formen',
  shortcutUndoDesc: 'Rückgängig / Wiederholen',
  shortcutCopyPasteDesc: 'Text, Bild, Objekt kopieren / einfügen (oder leere Fläche halten)',
  shortcutPanKey: 'Leertaste + Ziehen',
  shortcutPanDesc: 'Leinwand verschieben',
  shortcutDeleteDesc: 'Auswahl löschen',
  shortcutSelectHold: '«Auswahl» halten → Laufrahmen',
  shortcutDeleteHold: '«Löschen» halten → Leinwand leeren',
  shortcutPin: 'Leiste anheften',
  shortcutSnap: 'Magnet',
  shortcutBezier: 'Bézier',
  shortcutLayers: 'Ebenen',
  shortcutSteps: '30 Schritte',
  dontShowAgain: "Nicht mehr anzeigen",
};

const it: HelpTranslationBundle = {
  headerSubtitle: 'Demo interattiva e guida alle funzioni',
  tabDemo: 'Demo live',
  tabGuide: 'Tutte le funzioni',
  fullscreenEnter: 'Schermo intero',
  fullscreenExit: 'Dimensione normale',
  closeLabel: 'Chiudi',
  play: 'Avvia',
  pause: 'Pausa',
  restart: 'Ricomincia',
  prev: 'Prec.',
  next: 'Succ.',
  searchPlaceholder: 'Cerca funzione o gesto...',
  searchEmpty: 'Nessuna funzione trovata',
  demoStrokeStyle: 'Tratto e stile',
  demoDoubleLine: '×2 Linea doppia',
  demoFill: 'Riempimento',
  demoBorderZero: 'Bordo fino a 0 px con sfondo',
  demoRadius: 'Raggio',
  demoSnapMerged: 'Aggancio: Unito!',
  steps: [
    {
      title: '1. Contorno amorfo',
      desc: 'Il cursore disegna una forma organica chiusa e fluida.',
    },
    {
      title: '2. Stile e linea ×2',
      desc: 'Cambia colore bordo, riempimento e doppia linea ×2.',
    },
    {
      title: '3. Sposta, scala, ruota',
      desc: 'Sposta, ridimensiona gli angoli e ruota in alto.',
    },
    {
      title: '4. Tocco lungo → arrotonda',
      desc: 'Tieni premuto un nodo finché diventa ambra e trascina.',
    },
    {
      title: '5. Timbro e foto',
      desc: 'Inserisci un’icona vettoriale e una foto con cornice.',
    },
    {
      title: '6. Testo e deformazione',
      desc: 'Scrivi testo, allungalo sugli assi e ruotalo.',
    },
    {
      title: '7. Aggancio estremi',
      desc: 'Petali del fiore e stelo si uniscono in una sola forma.',
    },
    {
      title: '8. Prototipazione UI',
      desc: 'Player audio: cornice arrotondata, equalizzatore e tasti.',
    },
  ],
  features: [
    {
      title: 'Linee, pennello, Bézier e forme',
      badge: 'Tasto destro',
      desc: 'Il primo pulsante (o tasto destro sulla tela) apre: Seleziona, Pennello (standard, morbido, aerografo), Linea, curva di Bézier, Cerchio, Quadrato (e Griglia con righe/colonne), Triangolo, 8 stili freccia e 12 poligoni/stelle.',
    },
    {
      title: 'Contorni chiusi e aggancio estremi',
      desc: 'Attiva Contorno chiuso per pennello, Bézier o polilinee (tocca il punto verde iniziale per chiudere). Con l’aggancio attivo, le punte verdi uniscono i tratti in un unico percorso.',
    },
    {
      title: 'Linea doppia (×2), riempimento e bordo 0 px',
      desc: 'Opacità indipendente per tratto e riempimento (0–100%), stili linea, doppia linea ×2 e riempimento «Foto» (immagini dentro forme, contorni e timbri). Con riempimento attivo, lo spessore scende fino a 0 px.',
    },
    {
      title: 'Pressione lunga sul nodo per arrotondare',
      badge: 'Tieni ~0.4s',
      desc: 'Seleziona rettangolo, poligono, stella, triangolo o polilinea/Bézier, tieni premuto un nodo ~0.4s finché appare ambra e trascina verso l’interno.',
    },
    {
      title: 'Modifica live di forme e gruppi',
      desc: 'Seleziona uno o più oggetti (o clic destro) e apri Linee e Forme o la matita: colori, riempimento, trame, variante poligono e opacità cambiano in tempo reale.',
    },
    {
      title: 'Testo e trasformazione libera',
      desc: 'Oltre 30 font (cirillico e latino) con ricerca e categorie. Doppio clic sul testo per modificare o trascina le maniglie laterali per deformare e ruotare.',
    },
    {
      title: 'Icone UI, prototipi ed emoji offline',
      desc: 'Oltre 70 icone vettoriali UI ricolorabili (player multimediale, navigazione, controlli) ideali per prototipi di app, più 260+ emoji senza internet.',
    },
    {
      title: 'Immagini, livelli e riflessione',
      desc: 'Carica PNG, JPG, WebP o SVG. Nell’editor oggetto aggiungi cornice colorata, rifletti O/V, duplica o sposta in primo piano / in fondo.',
    },
    {
      title: 'Gomma e Cronologia (30 passi)',
      desc: 'La gomma regolabile cancella i tratti mentre Canc/Backspace elimina gli oggetti selezionati. Cronologia fino a 30 passi (Ctrl+Z / Ctrl+Y).',
    },
    {
      title: 'Sfondi, formati, esportazione e offline',
      desc: 'Nel menu «…»: esportazione PNG/JPG (intera tela o solo disegno), sfondi (Bianco, Griglia, Righe, Scuro, RGB e sfumature), dimensioni (Schermo, 1:1, 16:9, 9:16, libero) e 21 lingue.',
    },
    {
      title: 'Selezione tratteggiata, pulisci tela e Copia/Incolla',
      badge: 'Tieni • Ctrl+V',
      desc: 'Tenendo premuto il pulsante «Seleziona», si trasforma in una freccia tratteggiata animata per ritagliare liberamente frammenti di immagini o forme da trascinare, copiare ed eliminare. Tenendo premuto «Elimina» (o la gomma) si attiva la pulizia completa della tela con conferma. Ctrl+C / Ctrl+V incolla anche testo e immagini direttamente sulla tela.',
    },
  ],
  shortcutsTitle: 'Scorciatoie e gesti:',
  shortcutRmbKey: 'Tasto dx',
  shortcutRmbDesc: 'Linee e Forme',
  shortcutUndoDesc: 'Annulla / Ripeti',
  shortcutCopyPasteDesc: 'Copia / Incolla testo, foto, oggetto (o tieni premuto sul vuoto)',
  shortcutPanKey: 'Spazio + trascina',
  shortcutPanDesc: 'Sposta tela',
  shortcutDeleteDesc: 'Elimina selezione',
  shortcutSelectHold: 'Tieni «Seleziona» → Cornice animata',
  shortcutDeleteHold: 'Tieni «Elimina» → Svuota tela',
  shortcutPin: 'Fissa barra',
  shortcutSnap: 'Aggancio',
  shortcutBezier: 'Bézier',
  shortcutLayers: 'Livelli',
  shortcutSteps: '30 passi',
  dontShowAgain: "Non mostrare più",
};

const pl: HelpTranslationBundle = {
  headerSubtitle: 'Interaktywne demo i przewodnik po funkcjach',
  tabDemo: 'Demo na żywo',
  tabGuide: 'Wszystkie funkcje',
  fullscreenEnter: 'Pełny ekran',
  fullscreenExit: 'Zwykły rozmiar',
  closeLabel: 'Zamknij',
  play: 'Odtwórz',
  pause: 'Pauza',
  restart: 'Od nowa',
  prev: 'Wstecz',
  next: 'Dalej',
  searchPlaceholder: 'Szukaj funkcji lub gestu...',
  searchEmpty: 'Nie znaleziono pasujących funkcji',
  demoStrokeStyle: 'Obrys i styl',
  demoDoubleLine: '×2 Podwójna linia',
  demoFill: 'Wypełnienie',
  demoBorderZero: 'Obrys od 0 px z wypełnieniem',
  demoRadius: 'Zaokrąglenie',
  demoSnapMerged: 'Magnes: Połączono!',
  steps: [
    {
      title: '1. Kształt amorficzny',
      desc: 'Kursor rysuje gładki zamknięty kształt na płótnie.',
    },
    {
      title: '2. Styl i linia ×2',
      desc: 'Zmień kolor obrysu, wypełnienie i podwójną linię ×2.',
    },
    {
      title: '3. Przesuń, skaluj, obróć',
      desc: 'Przesuwaj, skaluj rogi i obracaj górnym uchwytem.',
    },
    {
      title: '4. Przytrzymaj → zaokrąglij',
      desc: 'Przytrzymaj węzeł do koloru bursztynu i ciągnij do środka.',
    },
    {
      title: '5. Stempel i zdjęcie',
      desc: 'Dodaj ikonę wektorową oraz zdjęcie w ramce.',
    },
    {
      title: '6. Tekst i deformacja',
      desc: 'Wpisz tekst, rozciągaj w osiach i obracaj dowolnie.',
    },
    {
      title: '7. Przyciąganie końców',
      desc: 'Płatki kwiatu i łodyga łączą się w jeden kształt.',
    },
    {
      title: '8. Prototypowanie UI',
      desc: 'Makieta odtwarzacza audio: zaokrąglony ekran i przyciski.',
    },
  ],
  features: [
    {
      title: 'Linie, pędzel, Bézier i kształty',
      badge: 'PPM na płótnie',
      desc: 'Pierwszy przycisk (lub PPM na płótnie) otwiera: Wybór, Pędzel (zwykły, miękki, aerograf), Linia, krzywa Béziera, Koło, Kwadrat (oraz Siatka z liczbą wierszy i kolumn), Trójkąt, 8 stylów strzałek i 12 wielokątów/gwiazd.',
    },
    {
      title: 'Zamknięte kontury i przyciąganie końców',
      desc: 'Włącz Zamknięty kontur dla pędzla, Béziera i łamanej (kliknij zielony punkt startowy, aby zamknąć). Przy włączonym magnesie zielone końce linii łączą się w jedną ścieżkę.',
    },
    {
      title: 'Podwójna linia (×2), wypełnienie i obrys 0 px',
      desc: 'Osobne suwaki krycia obrysu i wypełnienia (0–100%), style linii, podwójna linia ×2 oraz wypełnienie «Zdjęcie» (zdjęcia w kształtach, konturach i stemplach). Przy włączonym wypełnieniu grubość obrysu można zmniejszyć do 0 px.',
    },
    {
      title: 'Długie przytrzymanie węzła zaokrągla rogi',
      badge: 'Przytrzymaj ~0.4s',
      desc: 'Zaznacz prostokąt, wielokąt, gwiazdę, trójkąt lub łamaną/Bézier, przytrzymaj narożnik ~0.4s do bursztynowego podświetlenia i pociągnij do środka.',
    },
    {
      title: 'Edycja gotowych kształtów i grup na żywo',
      desc: 'Zaznacz obiekt lub grupę obiektów (albo kliknij PPM) i otwórz Linie i Kształty lub ołówek: kolory, wypełnienie, kreski, wariant wielokąta i krycie zmieniają się od razu.',
    },
    {
      title: 'Tekst i swobodna transformacja',
      desc: 'Ponad 30 czcionek (cyrylica i łacina) z wyszukiwarką i kategoriami. Kliknij dwukrotnie tekst, aby edytować, lub ciągnij uchwyty boczne, aby deformować.',
    },
    {
      title: 'Ikony UI, prototypy i emoji offline',
      desc: 'Ponad 70 wektorowych ikon UI (odtwarzacz, nawigacja, kontrolki) do szybkiego prototypowania aplikacji oraz 260+ emoji działających bez internetu.',
    },
    {
      title: 'Zdjęcia, warstwy i odbicie',
      desc: 'Wgrywaj PNG, JPG, WebP lub SVG. W edytorze obiektu dodaj kolorową ramkę, odbij poziomo/pionowo, duplikuj lub zmień kolejność warstw.',
    },
    {
      title: 'Gumka i Historia (30 kroków)',
      desc: 'Regulowana gumka ściera pociągnięcia, a Delete/Backspace usuwa zaznaczone obiekty. Historia do 30 kroków (Ctrl+Z / Ctrl+Y).',
    },
    {
      title: 'Tła, wymiary, eksport i tryb offline',
      desc: 'W menu «…»: eksport PNG/JPG (całe płótno lub sam rysunek), tła (Białe, Kratka, Linie, Ciemne, RGB i gradienty), rozmiary (Ekran, 1:1, 16:9, 9:16, własny) i 21 języków.',
    },
    {
      title: 'Biegnąca ramka, czyszczenie płótna i Kopiuj/Wklej',
      badge: 'Przytrzymaj • Ctrl+V',
      desc: 'Długie przytrzymanie przycisku «Wybór» zmienia go w strzałkę z biegnącej linii przerywanej i włącza zaznaczanie fragmentów zdjęć lub figur dowolnym zamkniętym konturem do przesuwania, kopiowania i usuwania. Długie przytrzymanie przycisku «Usuń» (lub gumki) otwiera okno pełnego czyszczenia płótna. Działa też Ctrl+C / Ctrl+V dla tekstu i obrazów prosto na płótno.',
    },
  ],
  shortcutsTitle: 'Skróty i gesty:',
  shortcutRmbKey: 'PPM',
  shortcutRmbDesc: 'Linie i Kształty',
  shortcutUndoDesc: 'Cofnij / Ponów',
  shortcutCopyPasteDesc: 'Kopiuj / Wklej tekst, zdjęcie, obiekt (lub przytrzymaj puste tło)',
  shortcutPanKey: 'Spacja + przeciągnij',
  shortcutPanDesc: 'Przesuń płótno',
  shortcutDeleteDesc: 'Usuń zaznaczone',
  shortcutSelectHold: 'Przytrzymaj «Wybór» → Biegnąca ramka',
  shortcutDeleteHold: 'Przytrzymaj «Usuń» → Wyczyść płótno',
  shortcutPin: 'Przypnij pasek',
  shortcutSnap: 'Magnes',
  shortcutBezier: 'Bézier',
  shortcutLayers: 'Warstwy',
  shortcutSteps: '30 kroków',
  dontShowAgain: "Nie pokazuj ponownie",
};

const nl: HelpTranslationBundle = {
  headerSubtitle: 'Interactieve demo & functiegids',
  tabDemo: 'Live demo',
  tabGuide: 'Alle functies',
  fullscreenEnter: 'Volledig scherm',
  fullscreenExit: 'Normaal formaat',
  closeLabel: 'Sluiten',
  play: 'Afspelen',
  pause: 'Pauze',
  restart: 'Opnieuw',
  prev: 'Vorige',
  next: 'Volgende',
  searchPlaceholder: 'Zoek functie of gebaar...',
  searchEmpty: 'Geen resultaten gevonden',
  demoStrokeStyle: 'Lijn & stijl',
  demoDoubleLine: '×2 Dubbele lijn',
  demoFill: 'Vulling',
  demoBorderZero: 'Rand tot 0 px bij vulling',
  demoRadius: 'Radius',
  demoSnapMerged: 'Magneet: Samengevoegd!',
  steps: [
    {
      title: '1. Organische contour',
      desc: 'De cursor tekent een vloeiende gesloten vorm.',
    },
    {
      title: '2. Stijl & ×2-lijn',
      desc: 'Pas lijnkleur, vulling en dubbele lijn ×2 aan.',
    },
    {
      title: '3. Verplaatsen, schalen, draaien',
      desc: 'Verplaats, schaal hoeken en draai via het bovenpunt.',
    },
    {
      title: '4. Lang indrukken → afronden',
      desc: 'Houd een hoekpunt vast tot amber en sleep naar binnen.',
    },
    {
      title: '5. Stempel & foto',
      desc: 'Voeg een vectoricoon en ingelijste afbeelding toe.',
    },
    {
      title: '6. Tekst & vervormen',
      desc: 'Typ tekst, rek langs assen en roteer vrij.',
    },
    {
      title: '7. Eindpunt-magneet',
      desc: 'Bloemblaadjes en steel klikken samen tot één vorm.',
    },
    {
      title: '8. UI-prototyping',
      desc: 'Audiospeler-mockup: afgerond frame, equalizer & knoppen.',
    },
  ],
  features: [
    {
      title: 'Lijnen, penseel, Bézier & vormen',
      badge: 'Rechtsklik canvas',
      desc: 'De eerste knop (of rechtsklik op het canvas) opent: Selecteer, Penseel (standaard, zacht, spuitbus), Lijn, interactieve Béziercurve, Cirkel, Vierkant (en Raster met rijen & kolommen), Driehoek, 8 pijlstijlen en 12 veelhoeken/sterren.',
    },
    {
      title: 'Gesloten contouren & eindpunt-magneet',
      desc: 'Schakel Gesloten contour in voor penseel, Bézier of polylijnen (tik het groene startpunt aan om te sluiten). Met de magneet actief klikken groene eindpunten samen tot één pad.',
    },
    {
      title: 'Dubbele lijn (×2), vulling & 0 px rand',
      desc: 'Aparte dekking-schuifregelaars voor lijn en vulling (0–100%), lijnstijlen, dubbele lijn ×2 en Foto-vulling (afbeeldingen in vormen, contouren & stempels). Bij vulling kan de lijndikte omlaag naar 0 px.',
    },
    {
      title: 'Lang indrukken op punt rondt hoeken af',
      badge: 'Houd ~0,4s vast',
      desc: 'Selecteer een rechthoek, veelhoek, ster, driehoek of polylijn/Bézier, houd een hoekpunt ~0,4s vast tot amber oplicht en sleep naar binnen.',
    },
    {
      title: 'Bestaande vormen & groepen live bewerken',
      desc: 'Selecteer één of meerdere objecten (of rechtsklik) en open Lijnen & Vormen of het potlood: kleuren, vulling, patronen, veelhoektype en dekking veranderen direct.',
    },
    {
      title: 'Typografie & vrije transformatie',
      desc: '30+ lettertypes (Cyrillisch & Latijn) met zoekfunctie en categorieën. Dubbeltik op tekst om te bewerken of sleep zijhandgrepen om te vervormen.',
    },
    {
      title: 'UI-iconen, prototypes & offline emoji',
      desc: '70+ herkleurbare vector-UI-iconen (mediaspeler, navigatie, bediening) voor app-prototyping, plus 260+ offline emoji zonder internet.',
    },
    {
      title: 'Afbeeldingen, lagen & spiegelen',
      desc: 'Upload PNG, JPG, WebP of SVG. Voeg in de objecteditor een gekleurde rand toe, spiegel H/V, dupliceer of plaats naar voren/achteren.',
    },
    {
      title: 'Gum & Geschiedenis (30 stappen)',
      desc: 'Instelbare gum wist streken en Delete/Backspace verwijdert geselecteerde objecten. Tot 30 stappen ongedaan maken / opnieuw (Ctrl+Z / Ctrl+Y).',
    },
    {
      title: 'Achtergronden, formaten, export & offline',
      desc: 'Het «…»-menu bevat PNG/JPG-export (heel canvas of alleen tekening), achtergronden (Wit, Raster, Gelijnd, Donker, RGB & verlopen), formaten (Scherm, 1:1, 16:9, 9:16, vrij) en 21 talen.',
    },
    {
      title: 'Lopend kader, canvas wissen & Kopiëren/Plakken',
      badge: 'Vasthouden • Ctrl+V',
      desc: 'Lang indrukken van de knop «Selecteren» verandert deze in een pijl van een lopende stippellijn om vrije fragmenten van afbeeldingen of vormen te omlijnen om te verplaatsen, kopiëren of verwijderen. Lang indrukken van «Verwijderen» (of gum) activeert volledig canvas wissen met bevestiging. Ctrl+C / Ctrl+V plakt ook tekst en foto’s direct op het canvas.',
    },
  ],
  shortcutsTitle: 'Sneltoetsen & gebaren:',
  shortcutRmbKey: 'Rechtsklik',
  shortcutRmbDesc: 'Lijnen & Vormen',
  shortcutUndoDesc: 'Ongedaan / Opnieuw',
  shortcutCopyPasteDesc: 'Tekst, foto, object kopiëren / plakken (of houd leeg canvas vast)',
  shortcutPanKey: 'Spatie + slepen',
  shortcutPanDesc: 'Canvas pannen',
  shortcutDeleteDesc: 'Selectie verwijderen',
  shortcutSelectHold: '«Selecteren» vasthouden → Lopend kader',
  shortcutDeleteHold: '«Verwijderen» vasthouden → Canvas wissen',
  shortcutPin: 'Werkbalk vastzetten',
  shortcutSnap: 'Magneet',
  shortcutBezier: 'Bézier',
  shortcutLayers: 'Lagen',
  shortcutSteps: '30 stappen',
  dontShowAgain: "Niet meer tonen",
};

const tr: HelpTranslationBundle = {
  headerSubtitle: 'Etkileşimli demo ve özellik rehberi',
  tabDemo: 'Canlı Demo',
  tabGuide: 'Tüm Özellikler',
  fullscreenEnter: 'Tam Ekran',
  fullscreenExit: 'Normal Boyut',
  closeLabel: 'Kapat',
  play: 'Oynat',
  pause: 'Duraklat',
  restart: 'Baştan',
  prev: 'Geri',
  next: 'İleri',
  searchPlaceholder: 'Özellik veya hareket ara...',
  searchEmpty: 'Eşleşen özellik bulunamadı',
  demoStrokeStyle: 'Çizgi ve stil',
  demoDoubleLine: '×2 Çift çizgi',
  demoFill: 'Dolgu',
  demoBorderZero: 'Dolgulu kenarlık 0 px’e iner',
  demoRadius: 'Yarıçap',
  demoSnapMerged: 'Mıknatıs: Birleşti!',
  steps: [
    {
      title: '1. Amorf kontur',
      desc: 'İmleç tuvalde akıcı, kapalı organik bir form çizer.',
    },
    {
      title: '2. Stil ve ×2 çizgi',
      desc: 'Çizgi rengini, dolguyu ve ×2 çift çizgiyi değiştirin.',
    },
    {
      title: '3. Taşı, ölçekle, döndür',
      desc: 'Taşıyın, köşelerden boyutlandırın ve üstten döndürün.',
    },
    {
      title: '4. Uzun bas → köşe yuvarla',
      desc: 'Düğümü kehribar olana dek tutun ve içe sürükleyin.',
    },
    {
      title: '5. Damga ve fotoğraf',
      desc: 'Vektör simge ve çerçeveli görsel ekleyin.',
    },
    {
      title: '6. Metin ve deformasyon',
      desc: 'Metin ekleyin, eksenlerde esnetin ve döndürün.',
    },
    {
      title: '7. Uç mıknatısı',
      desc: 'Çiçek yaprakları ve sap tek bir şekilde birleşir.',
    },
    {
      title: '8. UI prototipleme',
      desc: 'Ses oynatıcı taslağı: yuvarlak çerçeve, ekolayzır ve tuşlar.',
    },
  ],
  features: [
    {
      title: 'Çizgiler, fırça, Bézier ve şekiller',
      badge: 'Tuvalde sağ tık',
      desc: 'İlk düğme (veya tuvalde sağ tık): Seç, Fırça (standart, yumuşak, sprey), Çizgi, etkileşimli Bézier eğrisi, Daire, Kare (ve satır/sütunlu Izgara), Üçgen, 8 Ok stili ve 12 çokgen/yıldız sunar.',
    },
    {
      title: 'Kapalı konturlar ve uç mıknatısı',
      desc: 'Fırça, Bézier veya çoklu çizgi için Kapalı Kontur’u açın (kapatmak için yeşil başlangıç noktasına dokunun). Mıknatıs açıkken yeşil uç noktalar birbirini çekip birleştirir.',
    },
    {
      title: 'Çift çizgi (×2), dolgu ve 0 px kenarlık',
      desc: 'Çizgi ve dolgu için ayrı opaklık (0–100%), çizgi desenleri, ×2 çift çizgi ve Fotoğraf dolgusu (şekiller, konturlar ve damgalar içine görsel yerleştirme). Dolgu açıkken çizgi kalınlığını 0 px’e indirebilirsiniz.',
    },
    {
      title: 'Düğüme uzun basarak köşe yuvarlama',
      badge: '~0.4 sn basılı tut',
      desc: 'Dikdörtgen, çokgen, yıldız, üçgen veya poligon/Bézier seçin; köşe noktasını kehribar yanana dek ~0.4 sn basılı tutup içe çekin.',
    },
    {
      title: 'Hazır şekil ve grupları canlı düzenleme',
      desc: 'Bir veya birden çok nesne seçip (ya da sağ tıklayıp) Çizgiler ve Şekiller’i veya kalem simgesini açın: renk, dolgu, desen, çokgen tipi ve opaklık anında değişir.',
    },
    {
      title: 'Yazı tipi ve serbest dönüştürme',
      desc: 'Arama ve kategorilerle 30+ yazı tipi (Kiril ve Latin). Düzenlemek için metne çift tıklayın veya esnetmek için yan tutamaçları sürükleyin.',
    },
    {
      title: 'UI simgeleri, prototipler ve çevrimdışı emoji',
      desc: 'Uygulama prototipleri için yeniden renklendirilebilir 70+ vektör UI simgesi (medya oynatıcı, gezinme, kontroller) ve internetsiz 260+ emoji.',
    },
    {
      title: 'Görseller, katman sırası ve çevirme',
      desc: 'PNG, JPG, WebP veya SVG yükleyin. Nesne düzenleyicide renkli çerçeve ekleyin, yatay/dikey çevirin, çoğaltın veya öne/arkaya alın.',
    },
    {
      title: 'Silgi ve Geçmiş (30 adım)',
      desc: 'Ayarlanabilir silgi fırça izlerini siler; Delete/Backspace seçili nesneyi kaldırır. 30 adıma kadar geri al/yinele (Ctrl+Z / Ctrl+Y).',
    },
    {
      title: 'Arka plan, boyutlar, dışa aktarma ve çevrimdışı',
      desc: '«…» menüsünde PNG/JPG dışa aktarma (tüm tuval veya yalnızca çizim), arka planlar (Beyaz, Izgara, Çizgili, Koyu, RGB ve gradyan), tuval boyutları ve 21 dil bulunur.',
    },
    {
      title: 'Kayan seçim çerçevesi, tuvali temizle ve Kopyala/Yapıştır',
      badge: 'Basılı tut • Ctrl+V',
      desc: '«Seç» düğmesine uzun basmak onu kayan kesikli çizgili bir oka dönüştürür; görsel veya şekil parçalarını serbest kapalı konturla seçip taşıma, kopyalama ve silmeyi etkinleştirir. «Sil» düğmesine (veya silgiye) uzun basmak onay pencereli tam tuval temizlemeyi açar. Ctrl+C / Ctrl+V metin ve görselleri doğrudan tuvale yapıştırır.',
    },
  ],
  shortcutsTitle: 'Kısayollar ve hareketler:',
  shortcutRmbKey: 'Sağ Tık',
  shortcutRmbDesc: 'Çizgiler ve Şekiller',
  shortcutUndoDesc: 'Geri Al / Yinele',
  shortcutCopyPasteDesc: 'Metin, görsel, nesne kopyala / yapıştır (veya boş tuvale basılı tut)',
  shortcutPanKey: 'Boşluk + Sürükle',
  shortcutPanDesc: 'Tuvali kaydır',
  shortcutDeleteDesc: 'Seçileni sil',
  shortcutSelectHold: '«Seç» basılı tut → Kayan çerçeve',
  shortcutDeleteHold: '«Sil» basılı tut → Tuvali temizle',
  shortcutPin: 'Çubuğu sabitle',
  shortcutSnap: 'Mıknatıs',
  shortcutBezier: 'Bézier',
  shortcutLayers: 'Katmanlar',
  shortcutSteps: '30 adım',
  dontShowAgain: "Bir daha gösterme",
};

const ar: HelpTranslationBundle = {
  headerSubtitle: 'عرض تفاعلي ودليل جميع المزايا',
  tabDemo: 'عرض تفاعلي',
  tabGuide: 'كل المزايا',
  fullscreenEnter: 'ملء الشاشة',
  fullscreenExit: 'الحجم العادي',
  closeLabel: 'إغلاق',
  play: 'تشغيل',
  pause: 'إيقاف',
  restart: 'إعادة',
  prev: 'السابق',
  next: 'التالي',
  searchPlaceholder: 'ابحث عن ميزة أو إيماءة...',
  searchEmpty: 'لم يتم العثور على نتائج',
  demoStrokeStyle: 'الحد والنمط',
  demoDoubleLine: '×2 خط مزدوج',
  demoFill: 'تعبئة',
  demoBorderZero: 'الحد حتى 0 px مع التعبئة',
  demoRadius: 'الاستدارة',
  demoSnapMerged: 'التقاط: تم الدمج!',
  steps: [
    {
      title: '1. مسار عضوي مغلق',
      desc: 'يرسم المؤشر شكلاً انسيابياً مغلقاً على اللوحة.',
    },
    {
      title: '2. النمط والخط ×2',
      desc: 'تغيير لون الحد والتعبئة وتفعيل الخط المزدوج ×2.',
    },
    {
      title: '3. تحريك وتكبير وتدوير',
      desc: 'انقل الشكل، غيّر حجمه وأدره من المقبض العلوي.',
    },
    {
      title: '4. ضغط مطوّل ← تدوير الزوايا',
      desc: 'اضغط على نقطة زاوية حتى تصفر واسحب للداخل.',
    },
    {
      title: '5. ختم وصورة',
      desc: 'إضافة أيقونة متجهة وصورة بإطار.',
    },
    {
      title: '6. نص وتشويه حر',
      desc: 'أضف نصاً ومدّده على المحاور وأدره بحرية.',
    },
    {
      title: '7. مغناطيس الأطراف',
      desc: 'تلتصق بتلات الزهرة والساق معاً في شكل واحد.',
    },
    {
      title: '8. تصميم واجهات UI',
      desc: 'نموذج مشغل صوت: إطار دائري ومعادل صوت وأزرار.',
    },
  ],
  features: [
    {
      title: 'الخطوط والفرشاة وبيزييه والأشكال',
      badge: 'زر الفأرة الأيمن',
      desc: 'الزر الأول (أو النقر بالزر الأيمن على اللوحة) يفتح: تحديد، فرشاة (عادية، ناعمة، بخاخ)، خط، منحنى بيزييه، دائرة، مربع (وشبكة بصفوف وأعمدة قابلة للتعديل)، مثلث، 8 أنماط سهم و12 مضلعاً ونجمة.',
    },
    {
      title: 'المسارات المغلقة ومغناطيس الأطراف',
      desc: 'فعّل «مسار مغلق» للفرشاة أو بيزييه أو الخطوط المتعددة (اضغط نقطة البداية الخضراء للإغلاق). مع المغناطيس تنجذب النقاط الخضراء وتندمج في مسار واحد.',
    },
    {
      title: 'الخط المزدوج (×2)، التعبئة وحد 0 px',
      desc: 'منزلقات مستقلة لشفافية الحد والتعبئة (0–100%)، أنماط الخطوط، الخط المزدوج ×2 وتعبئة «صورة» (وضع صورة داخل الأشكال والمسارات المغلقة والأختام). عند تفعيل التعبئة يمكنك خفض سماكة الحد إلى 0 px.',
    },
    {
      title: 'الضغط المطوّل لتدوير الزوايا',
      badge: 'اضغط ~0.4 ث',
      desc: 'حدد مستطيلاً أو مضلعاً أو نجمة أو مثلثاً أو بيزييه، اضغط باستمرار على مقبض زاوية ~0.4 ث حتى يضيء باللون الكهرماني ثم اسحب للداخل.',
    },
    {
      title: 'تحرير حي للأشكال والمجموعات',
      desc: 'حدد عنصراً أو عدة عناصر (أو انقر بالزر الأيمن) وافتح الخطوط والأشكال أو أيقونة القلم لتحديث الألوان والتعبئة والأنماط والشفافية مباشرة.',
    },
    {
      title: 'النصوص والتحويل الحر',
      desc: 'أكثر من 30 خطاً مع البحث والتصنيفات. انقر مرتين على النص للتعديل أو اسحب المقابض الجانبية للمط والتدوير.',
    },
    {
      title: 'أيقونات الواجهة والرموز دون إنترنت',
      desc: 'أكثر من 70 أيقونة متجهة قابلة للتلوين لتصميم نماذج التطبيقات (مشغل، تنقل، أزرار) إضافة إلى أكثر من 260 رمز تعبيري تعمل دون إنترنت.',
    },
    {
      title: 'الصور وترتيب الطبقات والقلب',
      desc: 'ارفع صور PNG أو JPG أو WebP أو SVG. أضف إطاراً ملوناً حول الصورة، اقلبها أفقياً/عمودياً، كررها أو رتب الطبقات للأمام والخلف.',
    },
    {
      title: 'الممحاة والسجل (30 خطوة)',
      desc: 'الممحاة القابلة للتعديل تمسح الخطوط، وDelete يحذف العنصر المحدد. سجل تراجع وإعادة حتى 30 خطوة (Ctrl+Z / Ctrl+Y).',
    },
    {
      title: 'الخلفيات والأحجام والتصدير والملف المحلي',
      desc: 'تضم قائمة «…» تصدير PNG/JPG، الخلفيات (أبيض، شبكة، مسطر، داكن، RGB وتدرجات)، مقاسات اللوحة (الشاشة، 1:1، 16:9، 9:16، مخصص) و21 لغة.',
    },
    {
      title: 'الإطار المتحرك، مسح اللوحة والنسخ/اللصق',
      badge: 'ضغط مطوّل • Ctrl+V',
      desc: 'الضغط المطوّل على زر «تحديد» يحوّله إلى سهم بخط متقطع متحرك ويفعّل تحديد أجزاء من الصور والأشكال بمسار مغلق حر للسحب والنسخ والحذف. الضغط المطوّل على زر «حذف» (أو الممحاة) يفتح تأكيد مسح اللوحة بالكامل. كما يعمل Ctrl+C / Ctrl+V للصق النصوص والصور مباشرة على اللوحة.',
    },
  ],
  shortcutsTitle: 'الاختصارات والإيماءات:',
  shortcutRmbKey: 'زر أيمن',
  shortcutRmbDesc: 'الخطوط والأشكال',
  shortcutUndoDesc: 'تراجع / إعادة',
  shortcutCopyPasteDesc: 'نسخ / لصق نص أو صورة أو عنصر (أو ضغط مطوّل على فراغ اللوحة)',
  shortcutPanKey: 'مسافة + سحب',
  shortcutPanDesc: 'تحريك اللوحة',
  shortcutDeleteDesc: 'حذف المحدد',
  shortcutSelectHold: 'إطالة «تحديد» ← إطار متحرك',
  shortcutDeleteHold: 'إطالة «حذف» ← مسح اللوحة',
  shortcutPin: 'تثبيت الشريط',
  shortcutSnap: 'مغناطيس',
  shortcutBezier: 'بيزييه',
  shortcutLayers: 'الطبقات',
  shortcutSteps: '30 خطوة',
  dontShowAgain: "عدم الإظهار مجدداً",
};

const hi: HelpTranslationBundle = {
  headerSubtitle: 'इंटरैक्टिव डेमो और फ़ीचर गाइड',
  tabDemo: 'लाइव डेमो',
  tabGuide: 'सभी फ़ीचर',
  fullscreenEnter: 'फ़ुलस्क्रीन डेमो',
  fullscreenExit: 'सामान्य आकार',
  closeLabel: 'बंद करें',
  play: 'चलाएं',
  pause: 'रोकें',
  restart: 'फिर से',
  prev: 'पिछला',
  next: 'अगला',
  searchPlaceholder: 'फ़ीचर या जेस्चर खोजें...',
  searchEmpty: 'कोई परिणाम नहीं मिला',
  demoStrokeStyle: 'बॉर्डर और स्टाइल',
  demoDoubleLine: '×2 डबल लाइन',
  demoFill: 'भराव',
  demoBorderZero: 'भराव के साथ बॉर्डर 0 px तक',
  demoRadius: 'गोलाई',
  demoSnapMerged: 'स्नैप: जुड़ गया!',
  steps: [
    {
      title: '1. मुक्त बंद आकृति',
      desc: 'कर्सर कैनवास पर एक स्मूथ बंद आकृति बनाता है।',
    },
    {
      title: '2. स्टाइल और ×2 लाइन',
      desc: 'स्ट्रोक रंग, भराव और ×2 डबल लाइन बदलें।',
    },
    {
      title: '3. मूव, स्केल, रोटेट',
      desc: 'खिसकाएं, कोनों से आकार बदलें और ऊपर से घुमाएं।',
    },
    {
      title: '4. लॉन्ग-टैप → गोलाई',
      desc: 'कोने के नोड को दबाकर रखें और अंदर खींचें।',
    },
    {
      title: '5. स्टैम्प और इमेज',
      desc: 'वेक्टर आइकन और फ़्रेम वाली तस्वीर जोड़ें।',
    },
    {
      title: '6. टेक्स्ट और डिफ़ॉर्म',
      desc: 'टेक्स्ट लिखें, अक्षों पर खींचें और घुमाएं।',
    },
    {
      title: '7. एंडपॉइंट मैग्नेट',
      desc: 'फूल की पंखुड़ियां और डंठल एक आकृति में जुड़ते हैं।',
    },
    {
      title: '8. UI प्रोटोटाइपिंग',
      desc: 'ऑडियो प्लेयर मॉकअप: गोल फ़्रेम, इक्वलाइज़र व बटन।',
    },
  ],
  features: [
    {
      title: 'लाइन्स, ब्रश, बेज़ियर और शेप्स',
      badge: 'कैनवास पर राइट-क्लिक',
      desc: 'पहला बटन (या कैनवास पर राइट-क्लिक) खोलता है: चयन, ब्रश (सामान्य, सॉफ्ट, स्प्रे), लाइन, इंटरैक्टिव बेज़ियर वक्र, वृत्त, वर्ग (तथा पंक्ति-स्तंभ ग्रिड), त्रिभुज, 8 तीर शैलियाँ और 12 बहुभुज/तारे।',
    },
    {
      title: 'बंद कंटूर और एंडपॉइंट स्नैपिंग',
      desc: 'ब्रश, बेज़ियर या पॉलीलाइन के लिए बंद कंटूर चालू करें (बंद करने के लिए हरे शुरुआती बिंदु पर टैप करें)। स्नैप चालू होने पर हरे सिरे आपस में जुड़कर एक पथ बनाते हैं।',
    },
    {
      title: 'डबल लाइन (×2), भराव और 0 px बॉर्डर',
      desc: 'स्ट्रोक और भराव के लिए अलग पारदर्शिता (0–100%), लाइन पैटर्न, ×2 डबल लाइन और «फ़ोटो» भराव (बंद आकृतियों, कंटूर व स्टाम्प में फ़ोटो भरना)। भराव चालू होने पर बॉर्डर 0 px तक कम हो सकता है।',
    },
    {
      title: 'कोने गोल करने के लिए नोड पर लॉन्ग-टैप',
      badge: '~0.4s दबाएं',
      desc: 'आयत, बहुभुज, तारा, त्रिभुज या बेज़ियर चुनें, एम्बर चमक आने तक कोने को ~0.4s दबाकर रखें और अंदर की ओर खींचें।',
    },
    {
      title: 'मौजूदा आकृतियों व समूहों का लाइव संपादन',
      desc: 'एक या अधिक आकृतियां चुनें (या राइट-क्लिक करें) और लाइन्स व शेप्स या पेंसिल आइकन खोलें: रंग, भराव, पैटर्न, बहुभुज प्रकार और पारदर्शिता तुरंत बदलें।',
    },
    {
      title: 'टेक्स्ट और फ्री ट्रांसफ़ॉर्म',
      desc: 'खोज और श्रेणियों के साथ 30+ फ़ॉन्ट्स। संपादन के लिए टेक्स्ट पर डबल-टैप करें या खींचने व घुमाने के लिए किनारे के हैंडल उपयोग करें।',
    },
    {
      title: 'UI आइकन, प्रोटोटाइप और ऑफ़लाइन इमोजी',
      desc: 'ऐप प्रोटोटाइपिंग के लिए 70+ रंग बदलने योग्य वेक्टर UI आइकन (मीडिया प्लेयर, नेविगेशन, कंट्रोल) और बिना इंटरनेट चलने वाले 260+ इमोजी।',
    },
    {
      title: 'फ़ोटो, लेयर क्रम और फ़्लिप',
      desc: 'PNG, JPG, WebP या SVG अपलोड करें। ऑब्जेक्ट एडिटर में रंगीन फ़्रेम जोड़ें, क्षैतिज/ऊर्ध्वाधर पलटें, डुप्लिकेट करें या लेयर आगे/पीछे करें।',
    },
    {
      title: 'इरेज़र और इतिहास (30 चरण)',
      desc: 'समायोज्य इरेज़र स्ट्रोक मिटाता है और Delete/Backspace चयनित ऑब्जेक्ट हटाता है। 30 चरणों तक Undo/Redo (Ctrl+Z / Ctrl+Y)।',
    },
    {
      title: 'बैकग्राउंड, कैनवास आकार, एक्सपोर्ट व ऑफ़लाइन',
      desc: '«…» मेनू में PNG/JPG एक्सपोर्ट, बैकग्राउंड (सफेद, ग्रिड, लाइन, डार्क, RGB व ग्रेडिएंट), आकार (स्क्रीन, 1:1, 16:9, 9:16, कस्टम) और 21 भाषाएं हैं।',
    },
    {
      title: 'मार्चिंग फ़्रेम, कैनवास साफ़ करें और कॉपी/पेस्ट',
      badge: 'दबाएं • Ctrl+V',
      desc: '«चुनें» बटन को दबाकर रखने से यह चलती डैश-लाइन वाले तीर में बदल जाता है और खींचने, कॉपी करने व हटाने के लिए चित्रों/आकृतियों के किसी भी हिस्से को बंद कंटूर से चुनने की सुविधा चालू होती है। «हटाएं» बटन (या इरेज़र) को दबाकर रखने से पुष्टि के साथ पूरा कैनवास साफ़ होता है। Ctrl+C / Ctrl+V से टेक्स्ट और फ़ोटो सीधे कैनवास पर पेस्ट होते हैं।',
    },
  ],
  shortcutsTitle: 'शॉर्टकट और जेस्चर:',
  shortcutRmbKey: 'राइट-क्लिक',
  shortcutRmbDesc: 'लाइन्स व शेप्स',
  shortcutUndoDesc: 'पूर्ववत / फिर से',
  shortcutCopyPasteDesc: 'टेक्स्ट, फ़ोटो, आकृति कॉपी / पेस्ट (या खाली कैनवास पर दबाए रखें)',
  shortcutPanKey: 'स्पेस + ड्रैग',
  shortcutPanDesc: 'कैनवास खिसकाएं',
  shortcutDeleteDesc: 'चयन हटाएं',
  shortcutSelectHold: '«चुनें» दबाए रखें → मार्चिंग फ़्रेम',
  shortcutDeleteHold: '«हटाएं» दबाए रखें → कैनवास साफ़',
  shortcutPin: 'बार पिन करें',
  shortcutSnap: 'स्नैप',
  shortcutBezier: 'बेज़ियर',
  shortcutLayers: 'लेयर्स',
  shortcutSteps: '30 चरण',
  dontShowAgain: "फिर से न दिखाएं",
};

const zh: HelpTranslationBundle = {
  headerSubtitle: '交互演示与全功能指南',
  tabDemo: '动态演示',
  tabGuide: '全部功能',
  fullscreenEnter: '全屏演示',
  fullscreenExit: '退出全屏',
  closeLabel: '关闭',
  play: '播放',
  pause: '暂停',
  restart: '重播',
  prev: '上一步',
  next: '下一步',
  searchPlaceholder: '搜索功能或手势...',
  searchEmpty: '未找到匹配的功能',
  demoStrokeStyle: '描边与样式',
  demoDoubleLine: '×2 双线描边',
  demoFill: '填充',
  demoBorderZero: '有填充时描边可降至 0 px',
  demoRadius: '圆角',
  demoSnapMerged: '磁吸：已合并！',
  steps: [
    {
      title: '1. 自由闭合轮廓',
      desc: '光标在画布上绘制平滑的闭合有机形状。',
    },
    {
      title: '2. 样式与 ×2 双线',
      desc: '调整描边颜色、填充颜色以及双线效果。',
    },
    {
      title: '3. 移动、缩放与旋转',
      desc: '拖动移动、四角缩放，并通过顶部控制点旋转。',
    },
    {
      title: '4. 长按节点 → 圆角',
      desc: '长按角点至琥珀色亮起，向内拖动平滑倒圆。',
    },
    {
      title: '5. 图标与图片',
      desc: '插入矢量图标图章以及带相框的图片。',
    },
    {
      title: '6. 文本与自由变形',
      desc: '输入文字，自由拉伸比例并旋转角度。',
    },
    {
      title: '7. 端点磁吸合并',
      desc: '花瓣闭合与花茎端点磁吸连接为完整图形。',
    },
    {
      title: '8. 界面原型设计',
      desc: '音频播放器原型：圆角机框、均衡器与播放按钮。',
    },
  ],
  features: [
    {
      title: '线条、画笔、贝塞尔与形状',
      badge: '画布右键菜单',
      desc: '工具栏首个按钮（或在画布任意位置右键）可切换：选择、画笔（标准/柔边/喷枪）、直线、交互式贝塞尔曲线、圆形、方形（及可调行列数的网格）、三角形、8 种箭头样式及 12 种多边形/星形。',
    },
    {
      title: '闭合轮廓与端点磁吸',
      desc: '画笔、贝塞尔和多段折线均支持「闭合轮廓」（点击绿色起点即可闭合）。开启端点磁吸后，拖动绿色端点会自动吸附并合并线段。',
    },
    {
      title: '双线 (×2)、填充与 0 px 描边',
      desc: '描边与填充拥有独立透明度滑块（0–100%）、多种线型、×2 双线模式以及「照片」填充（将图片装入封闭形状、轮廓与图章内）。开启填充后，描边宽度可降至 0 px 实现无边框填充。',
    },
    {
      title: '长按节点圆角变形',
      badge: '长按约 0.4 秒',
      desc: '选中矩形、多边形、星形、三角形或折线/贝塞尔，长按任意角点约 0.4 秒至琥珀色高亮并向内拖动，即可平滑圆角；也可在面板滑块微调。',
    },
    {
      title: '实时编辑已有图形与多选组',
      desc: '选中单个或多个对象（或右键点击），打开「线条与形状」或浮动铅笔按钮：颜色、填充、图案、双线、多边形变体和透明度均可实时修改。',
    },
    {
      title: '文本排版与自由变形',
      desc: '内置 30+ 字体（支持西里尔文与拉丁文）并支持搜索和分类。双击画布文字即可编辑，拖动边框句柄可自由拉伸、缩放和旋转。',
    },
    {
      title: 'UI 图标、原型设计与离线 Emoji',
      desc: '提供 70+ 可换色矢量 UI 线框图标（播放器、导航、表单控件）助力快速做界面原型，并内置 260+ 离线表情无需联网即可使用。',
    },
    {
      title: '图片导入、图层顺序与翻转',
      desc: '支持上传 PNG、JPG、WebP 或 SVG。在对象编辑器中可添加彩色相框、水平/垂直翻转、复制以及置顶/置底图层。',
    },
    {
      title: '橡皮擦与 30 步历史记录',
      desc: '可调大小的橡皮擦可擦除笔迹，Delete/Backspace 可删除选中对象。支持最多 30 步撤销与重做（Ctrl+Z / Ctrl+Y）。',
    },
    {
      title: '背景、画布尺寸、导出与离线版',
      desc: '「…」菜单支持导出 PNG/JPG（整张画布或仅作品区域）、多样背景（白底、网格、横线、深色、RGB 与渐变）、画布尺寸预设以及 21 种语言。',
    },
    {
      title: '蚁行线选区、清空画布与复制/粘贴',
      badge: '长按 • Ctrl+V',
      desc: '长按「选择」按钮会将其变为带动态虚线的箭头，可自由圈选图片或图形片段进行拖动、复制和删除。长按「删除」按钮（或橡皮擦）会打开确认清空整张画布的窗口。还支持直接用 Ctrl+C / Ctrl+V 将文本和图片粘贴到画布上。',
    },
  ],
  shortcutsTitle: '快捷键与手势：',
  shortcutRmbKey: '鼠标右键',
  shortcutRmbDesc: '线条与形状',
  shortcutUndoDesc: '撤销 / 重做',
  shortcutCopyPasteDesc: '复制 / 粘贴文本、图片或对象（或长按画布空白处）',
  shortcutPanKey: '空格 + 拖动',
  shortcutPanDesc: '拖动画布',
  shortcutDeleteDesc: '删除选中',
  shortcutSelectHold: '长按「选择」→ 蚁行线框选',
  shortcutDeleteHold: '长按「删除」→ 清空画布',
  shortcutPin: '固定工具栏',
  shortcutSnap: '端点磁吸',
  shortcutBezier: '贝塞尔',
  shortcutLayers: '图层',
  shortcutSteps: '30 步历史',
  dontShowAgain: "不再显示",
};

const ja: HelpTranslationBundle = {
  headerSubtitle: 'インタラクティブデモ & 機能ガイド',
  tabDemo: 'ライブデモ',
  tabGuide: 'すべての機能',
  fullscreenEnter: '全画面表示',
  fullscreenExit: '通常サイズ',
  closeLabel: '閉じる',
  play: '再生',
  pause: '一時停止',
  restart: '最初から',
  prev: '前へ',
  next: '次へ',
  searchPlaceholder: '機能や操作を検索...',
  searchEmpty: '該当する機能が見つかりません',
  demoStrokeStyle: '線とスタイル',
  demoDoubleLine: '×2 二重線',
  demoFill: '塗りつぶし',
  demoBorderZero: '塗り有効時は線幅 0 px 可',
  demoRadius: '角丸',
  demoSnapMerged: 'スナップ：結合完了！',
  steps: [
    {
      title: '1. 自由な閉じた輪郭',
      desc: 'カーソルが滑らかな閉じた有機的フォルムを描きます。',
    },
    {
      title: '2. スタイルと ×2 二重線',
      desc: '線の色・塗りつぶし・二重線 ×2 を切り替えます。',
    },
    {
      title: '3. 移動・拡大縮小・回転',
      desc: '位置移動や角のサイズ変更、上部ハンドルで回転。',
    },
    {
      title: '4. 長押し → 角丸',
      desc: '角ノードを長押しして内側へドラッグすると丸くなります。',
    },
    {
      title: '5. スタンプと画像',
      desc: 'ベクターアイコンとフレーム付き写真を配置します。',
    },
    {
      title: '6. テキストと自由変形',
      desc: '文字を入力し、縦横比率や角度を自由に変形。',
    },
    {
      title: '7. 端点の磁石スナップ',
      desc: '花びらと茎の端点が吸着し、ひとつの図形に結合します。',
    },
    {
      title: '8. UI プロトタイピング',
      desc: 'オーディオプレーヤー試作：角丸画面・イコライザー・ボタン。',
    },
  ],
  features: [
    {
      title: '線・ブラシ・ベジェ・図形',
      badge: 'キャンバス右クリック',
      desc: '最初のボタン（またはキャンバス上で右クリック）から選択・ブラシ（標準/ソフト/スプレー）・直線・ベジェ曲線・円・四角（行数/列数を指定できるグリッド付）・三角・8種の矢印・12種類の多角形/星が使えます。',
    },
    {
      title: '閉じた輪郭と端点スナップ',
      desc: 'ブラシ・ベジェ・折れ線で「閉じた輪郭」をオンにできます（緑の始点をタップして閉じる）。スナップ有効時は緑の端点ハンドルが吸着して1本のパスに結合します。',
    },
    {
      title: '二重線 (×2)・塗りつぶし・線幅 0 px',
      desc: '線と塗りに独立した不透明度スライダー（0–100%）、線種、二重線 ×2、「写真」塗り（閉じた図形・輪郭・スタンプに画像を枠入れ）を搭載。塗りが有効なら線幅を 0 px にできます。',
    },
    {
      title: 'ノード長押しで角丸加工',
      badge: '約 0.4 秒長押し',
      desc: '長方形・多角形・星・三角形・折れ線/ベジェを選択し、角のハンドルを約 0.4 秒長押ししてアンバー色になったら内側へドラッグします。',
    },
    {
      title: '既存図形・グループのリアルタイム編集',
      desc: '1つまたは複数の図形を選択（または右クリック）し、「線と図形」または鉛筆ボタンから線・塗り・パターン・多角形タイプ・透明度を即座に変更できます。',
    },
    {
      title: 'テキストと自由変形',
      desc: '検索とカテゴリ付きの30以上のフォントを搭載。キャンバス上の文字をダブルクリックで編集、枠のハンドルをドラッグして自由に伸縮・回転できます。',
    },
    {
      title: 'UI アイコン・試作・オフライン絵文字',
      desc: 'アプリ試作に最適な色変更可能な70種以上のUIアイコン（プレーヤー・ナビ・操作部品）と、ネット不要の260種以上の絵文字を内蔵しています。',
    },
    {
      title: '画像・レイヤー順・反転',
      desc: 'PNG・JPG・WebP・SVG を読み込み可能。オブジェクト編集でカラーフレーム追加、水平/垂直反転、複製、最前面/最背面移動ができます。',
    },
    {
      title: '消しゴムと履歴（30ステップ）',
      desc: 'サイズ調整できる消しゴムで描画を消し、Delete/Backspace で選択オブジェクトを削除。最大30回の元に戻す/やり直し（Ctrl+Z / Ctrl+Y）に対応。',
    },
    {
      title: '背景・サイズ・書き出し・オフライン版',
      desc: '「…」メニューで PNG/JPG 書き出し（全体または作品のみ）、背景（白/方眼/罫線/ダーク/RGB/グラデーション）、キャンバスサイズ、21言語を切り替えられます。',
    },
    {
      title: 'マーチング枠選択・全消去・コピー/ペースト',
      badge: '長押し • Ctrl+V',
      desc: '「選択」ボタンを長押しすると動く破線の矢印に変わり、画像や図形の一部を自由な閉じた輪郭で切り抜いて移動・コピー・削除できます。「削除」ボタン（または消しゴム）の長押しで確認付きでキャンバスを全消去します。Ctrl+C / Ctrl+V でテキストや画像を直接貼り付けられます。',
    },
  ],
  shortcutsTitle: 'ショートカット & 操作：',
  shortcutRmbKey: '右クリック',
  shortcutRmbDesc: '線と図形',
  shortcutUndoDesc: '元に戻す / やり直し',
  shortcutCopyPasteDesc: 'テキスト・画像・図形をコピー / 貼付（空白部分の長押しも可）',
  shortcutPanKey: 'Space + ドラッグ',
  shortcutPanDesc: 'キャンバス移動',
  shortcutDeleteDesc: '選択を削除',
  shortcutSelectHold: '「選択」長押し → マーチング枠選択',
  shortcutDeleteHold: '「削除」長押し → キャンバス全消去',
  shortcutPin: 'ツールバー固定',
  shortcutSnap: 'スナップ',
  shortcutBezier: 'ベジェ',
  shortcutLayers: 'レイヤー',
  shortcutSteps: '30ステップ',
  dontShowAgain: "今後表示しない",
};

const ko: HelpTranslationBundle = {
  headerSubtitle: '인터랙티브 데모 및 기능 가이드',
  tabDemo: '실시간 데모',
  tabGuide: '전체 기능',
  fullscreenEnter: '전체 화면',
  fullscreenExit: '기본 크기',
  closeLabel: '닫기',
  play: '재생',
  pause: '일시정지',
  restart: '처음부터',
  prev: '이전',
  next: '다음',
  searchPlaceholder: '기능 또는 제스처 검색...',
  searchEmpty: '일치하는 기능이 없습니다',
  demoStrokeStyle: '선 및 스타일',
  demoDoubleLine: '×2 이중선',
  demoFill: '채우기',
  demoBorderZero: '채우기 시 테두리 0 px 가능',
  demoRadius: '둥글기',
  demoSnapMerged: '자석: 병합됨!',
  steps: [
    {
      title: '1. 자유로운 닫힌 윤곽',
      desc: '커서가 캔버스 위에 부드러운 닫힌 형태를 그립니다.',
    },
    {
      title: '2. 스타일 및 ×2 선',
      desc: '선 색상, 채우기, ×2 이중선을 변경합니다.',
    },
    {
      title: '3. 이동, 크기 조절, 회전',
      desc: '이동, 모서리 크기 조절 및 상단 핸들로 회전합니다.',
    },
    {
      title: '4. 길게 누르기 → 모서리 둥글게',
      desc: '노드를 주황빛이 될 때까지 눌러 안쪽으로 드래그합니다.',
    },
    {
      title: '5. 스탬프 및 사진',
      desc: '벡터 아이콘과 프레임이 있는 이미지를 삽입합니다.',
    },
    {
      title: '6. 텍스트 및 자유 변형',
      desc: '텍스트를 입력하고 축 비율과 각도를 자유롭게 변형합니다.',
    },
    {
      title: '7. 끝점 자석 스냅',
      desc: '꽃잎과 줄기 끝점이 자석처럼 붙어 하나의 도형이 됩니다.',
    },
    {
      title: '8. UI 프로토타이핑',
      desc: '오디오 플레이어 목업: 둥근 화면, 이퀄라이저 및 버튼.',
    },
  ],
  features: [
    {
      title: '선, 브러시, 베지어 및 도형',
      badge: '캔버스 우클릭',
      desc: '첫 번째 버튼(또는 캔버스 우클릭)으로 선택, 브러시(기본/부드러운/스프레이), 직선, 베지어 곡선, 원, 사각형(행/열 설정 가능한 격자 포함), 삼각형, 8종 화살표 및 12종 다각형/별을 엽니다.',
    },
    {
      title: '닫힌 윤곽 및 끝점 자석 스냅',
      desc: '브러시, 베지어, 다중 선에서 닫힌 윤곽을 켤 수 있습니다(초록 시작점을 탭해 닫기). 자석 스냅을 켜면 초록 끝점이 붙어 하나의 경로로 합쳐집니다.',
    },
    {
      title: '이중선(×2), 채우기 및 0 px 테두리',
      desc: '선과 채우기의 투명도를 따로 조절(0–100%)하고, 선 스타일, ×2 이중선 및 «사진» 채우기(닫힌 도형·윤곽·스탬프 내부 채우기)를 지원합니다. 채우기가 켜져 있으면 선 두께를 0 px까지 줄일 수 있습니다.',
    },
    {
      title: '노드 길게 눌러 모서리 둥글게 하기',
      badge: '약 0.4초 누르기',
      desc: '사각형, 다각형, 별, 삼각형 또는 꺾은선/베지어를 선택하고 모서리 핸들을 약 0.4초간 길게 눌러 주황색이 되면 안쪽으로 드래그하세요.',
    },
    {
      title: '기존 도형 및 그룹 실시간 편집',
      desc: '하나 또는 여러 개체를 선택(또는 우클릭)하고 선과 도형이나 연필 아이콘을 열면 색상, 채우기, 패턴, 다각형 형태 및 투명도가 즉시 반영됩니다.',
    },
    {
      title: '텍스트 및 자유 변형',
      desc: '검색과 카테고리가 있는 30여 종 글꼴을 지원합니다. 캔버스 텍스트를 두 번 클릭해 수정하거나 측면/모서리 핸들을 끌어 자유롭게 늘리고 회전하세요.',
    },
    {
      title: 'UI 아이콘, 프로토타입 및 오프라인 이모지',
      desc: '앱 프로토타이핑에 유용한 색상 변경 가능 벡터 UI 아이콘 70여 종(미디어 플레이어, 내비게이션, 컨트롤)과 인터넷 없이 쓰는 260여 종 이모지를 제공합니다.',
    },
    {
      title: '이미지, 레이어 순서 및 뒤집기',
      desc: 'PNG, JPG, WebP, SVG 업로드 지원. 개체 편집기에서 컬러 테두리 추가, 좌우/상하 뒤집기, 복제, 맨 앞/맨 뒤 순서 조정이 가능합니다.',
    },
    {
      title: '지우개 및 작업 내역 (30단계)',
      desc: '크기 조절 가능한 지우개로 획을 지우고 Delete/Backspace로 선택 개체를 삭제합니다. 최대 30단계 실행 취소/다시 실행(Ctrl+Z / Ctrl+Y) 지원.',
    },
    {
      title: '배경, 캔버스 크기, 내보내기 및 오프라인',
      desc: '«…» 메뉴에서 PNG/JPG 내보내기(전체 또는 그림 영역만), 배경(흰색, 격자, 줄, 어두움, RGB 및 그라데이션), 캔버스 프리셋 및 21개 언어를 설정할 수 있습니다.',
    },
    {
      title: '점선 선택 프레임, 캔버스 비우기 및 복사/붙여넣기',
      badge: '길게 누르기 • Ctrl+V',
      desc: '«선택» 버튼을 길게 누르면 움직이는 점선 화살표로 바뀌며 이미지나 도형 조각을 자유로운 닫힌 윤곽으로 선택해 이동, 복사, 삭제할 수 있습니다. «삭제» 버튼(또는 지우개)을 길게 누르면 확인 창과 함께 캔버스를 전체 비웁니다. Ctrl+C / Ctrl+V 로 텍스트와 이미지도 캔버스에 바로 붙여넣을 수 있습니다.',
    },
  ],
  shortcutsTitle: '단축키 및 제스처:',
  shortcutRmbKey: '우클릭',
  shortcutRmbDesc: '선과 도형',
  shortcutUndoDesc: '실행 취소 / 다시',
  shortcutCopyPasteDesc: '텍스트·이미지·개체 복사 / 붙여넣기 (빈 캔버스 길게 누르기도 가능)',
  shortcutPanKey: '스페이스 + 드래그',
  shortcutPanDesc: '캔버스 이동',
  shortcutDeleteDesc: '선택 삭제',
  shortcutSelectHold: '«선택» 길게 누르기 → 점선 선택 프레임',
  shortcutDeleteHold: '«삭제» 길게 누르기 → 캔버스 비우기',
  shortcutPin: '도구 모음 고정',
  shortcutSnap: '끝점 자석',
  shortcutBezier: '베지어',
  shortcutLayers: '레이어',
  shortcutSteps: '30단계',
  dontShowAgain: "다시 보지 않기",
};

const vi: HelpTranslationBundle = {
  headerSubtitle: 'Minh họa tương tác & hướng dẫn tính năng',
  tabDemo: 'Demo trực quan',
  tabGuide: 'Tất cả tính năng',
  fullscreenEnter: 'Toàn màn hình',
  fullscreenExit: 'Thu nhỏ lại',
  closeLabel: 'Đóng',
  play: 'Phát',
  pause: 'Tạm dừng',
  restart: 'Xem lại',
  prev: 'Trước',
  next: 'Tiếp',
  searchPlaceholder: 'Tìm tính năng hoặc thao tác...',
  searchEmpty: 'Không tìm thấy kết quả phù hợp',
  demoStrokeStyle: 'Viền & kiểu nét',
  demoDoubleLine: '×2 Nét đôi',
  demoFill: 'Tô nền',
  demoBorderZero: 'Viền xuống 0 px khi có nền',
  demoRadius: 'Bo góc',
  demoSnapMerged: 'Hút điểm: Đã nối!',
  steps: [
    {
      title: '1. Đường viền khép kín',
      desc: 'Con trỏ vẽ một hình hữu cơ khép kín mượt mà.',
    },
    {
      title: '2. Kiểu nét & nét đôi ×2',
      desc: 'Đổi màu viền, màu tô nền và kiểu nét đôi ×2.',
    },
    {
      title: '3. Di chuyển, thu phóng, xoay',
      desc: 'Kéo di chuyển, chỉnh kích thước góc và xoay từ đỉnh.',
    },
    {
      title: '4. Nhấn giữ → bo góc',
      desc: 'Giữ nút góc đến khi hiện cam rồi kéo vào trong.',
    },
    {
      title: '5. Biểu tượng & ảnh',
      desc: 'Chèn biểu tượng vector và ảnh có khung viền.',
    },
    {
      title: '6. Chữ & biến dạng',
      desc: 'Nhập chữ, kéo giãn theo trục và xoay tự do.',
    },
    {
      title: '7. Hút điểm đầu cuối',
      desc: 'Cánh hoa và cuống tự hút nối thành một hình thống nhất.',
    },
    {
      title: '8. Thiết kế mẫu UI',
      desc: 'Mô phỏng trình phát nhạc: khung bo góc, sóng âm & nút bấm.',
    },
  ],
  features: [
    {
      title: 'Đường nét, cọ, Bézier & hình khối',
      badge: 'Chuột phải khung vẽ',
      desc: 'Nút đầu tiên (hoặc chuột phải lên khung vẽ) mở: Chọn, Cọ (thường, mềm, phun), Đường thẳng, Đường cong Bézier, Tròn, Vuông (và Lưới tùy chỉnh hàng/cột), Tam giác, 8 kiểu mũi tên và 12 đa giác/ngôi sao.',
    },
    {
      title: 'Đường khép kín & hút điểm đầu cuối',
      desc: 'Bật «Đường khép kín» cho cọ, Bézier hoặc đường gấp khúc (chạm điểm đầu màu xanh lá để khép). Khi bật hút điểm, các đầu mút xanh sẽ hút và nối thành một đường liền.',
    },
    {
      title: 'Nét đôi (×2), tô nền & viền 0 px',
      desc: 'Thanh trượt độ mờ riêng cho viền và nền (0–100%), kiểu nét đứt, nét đôi ×2 và tô nền «Ảnh» (lồng ảnh vào hình kín, nét viền và tem). Khi có nền, độ dày viền có thể giảm về 0 px.',
    },
    {
      title: 'Nhấn giữ nút góc để bo tròn',
      badge: 'Giữ ~0.4 giây',
      desc: 'Chọn hình chữ nhật, đa giác, ngôi sao, tam giác hoặc đường gấp khúc/Bézier, giữ điểm góc ~0.4 giây đến khi hiện màu hổ phách rồi kéo vào trong.',
    },
    {
      title: 'Chỉnh sửa trực tiếp hình & nhóm có sẵn',
      desc: 'Chọn một hoặc nhiều đối tượng (hoặc chuột phải) rồi mở Đường nét & Hình hoặc nút bút chì: màu sắc, nền, họa tiết, biến thể đa giác và độ mờ cập nhật tức thì.',
    },
    {
      title: 'Chữ & biến dạng tự do',
      desc: 'Hơn 30 phông chữ có tìm kiếm và phân loại. Nhấp đúp chữ trên khung vẽ để sửa hoặc kéo các điểm biên để kéo giãn và xoay.',
    },
    {
      title: 'Biểu tượng UI, nguyên mẫu & Emoji ngoại tuyến',
      desc: 'Hơn 70 biểu tượng UI vector đổi màu (trình phát nhạc, điều hướng, điều khiển) lý tưởng để dựng prototype ứng dụng, cùng 260+ emoji dùng không cần mạng.',
    },
    {
      title: 'Hình ảnh, thứ tự lớp & lật',
      desc: 'Tải lên PNG, JPG, WebP hoặc SVG. Trong trình sửa đối tượng có thêm khung màu cho ảnh, lật ngang/dọc, nhân bản và đưa lên trước/ra sau.',
    },
    {
      title: 'Tẩy & Lịch sử (30 bước)',
      desc: 'Tẩy chỉnh được kích cỡ giúp xóa nét vẽ, còn Delete/Backspace xóa đối tượng đang chọn. Lưu tới 30 bước hoàn tác / làm lại (Ctrl+Z / Ctrl+Y).',
    },
    {
      title: 'Nền, kích thước, xuất ảnh & bản ngoại tuyến',
      desc: 'Menu «…» gồm xuất PNG/JPG (toàn khung hoặc chỉ hình vẽ), nền (Trắng, Lưới, Kẻ dòng, Tối, RGB & chuyển sắc), kích thước khung và 21 ngôn ngữ.',
    },
    {
      title: 'Khung nét đứt chạy, xóa sạch khung vẽ & Sao chép/Dán',
      badge: 'Nhấn giữ • Ctrl+V',
      desc: 'Nhấn giữ nút «Chọn» sẽ biến nút thành mũi tên nét đứt chuyển động, cho phép khoanh vùng tự do một mảnh ảnh hoặc hình để kéo, sao chép hoặc xóa. Nhấn giữ nút «Xóa» (hoặc tẩy) mở hộp thoại xác nhận xóa toàn bộ khung vẽ. Ctrl+C / Ctrl+V cũng dán thẳng chữ và ảnh lên khung vẽ.',
    },
  ],
  shortcutsTitle: 'Phím tắt & thao tác:',
  shortcutRmbKey: 'Chuột phải',
  shortcutRmbDesc: 'Đường nét & Hình',
  shortcutUndoDesc: 'Hoàn tác / Làm lại',
  shortcutCopyPasteDesc: 'Sao chép / Dán chữ, ảnh, đối tượng (hoặc nhấn giữ vùng trống)',
  shortcutPanKey: 'Space + Kéo',
  shortcutPanDesc: 'Kéo khung vẽ',
  shortcutDeleteDesc: 'Xóa mục đã chọn',
  shortcutSelectHold: 'Nhấn giữ «Chọn» → Khung chọn chạy',
  shortcutDeleteHold: 'Nhấn giữ «Xóa» → Xóa sạch khung vẽ',
  shortcutPin: 'Ghim thanh công cụ',
  shortcutSnap: 'Hút điểm',
  shortcutBezier: 'Bézier',
  shortcutLayers: 'Các lớp',
  shortcutSteps: '30 bước',
  dontShowAgain: "Không hiển thị lại",
};

const id: HelpTranslationBundle = {
  headerSubtitle: 'Demo interaktif & panduan lengkap fitur',
  tabDemo: 'Demo Langsung',
  tabGuide: 'Semua Fitur',
  fullscreenEnter: 'Layar Penuh',
  fullscreenExit: 'Ukuran Normal',
  closeLabel: 'Tutup',
  play: 'Putar',
  pause: 'Jeda',
  restart: 'Ulang',
  prev: 'Sblm',
  next: 'Lanjut',
  searchPlaceholder: 'Cari fitur atau gestur...',
  searchEmpty: 'Tidak ada fitur yang cocok',
  demoStrokeStyle: 'Garis & gaya',
  demoDoubleLine: '×2 Garis ganda',
  demoFill: 'Isian',
  demoBorderZero: 'Garis tepi 0 px saat terisi',
  demoRadius: 'Radius',
  demoSnapMerged: 'Magnet: Tergabung!',
  steps: [
    {
      title: '1. Kontur amorf',
      desc: 'Kursor menggambar bentuk organik tertutup yang halus.',
    },
    {
      title: '2. Gaya & garis ×2',
      desc: 'Ubah warna garis, isian, dan aktifkan garis ganda ×2.',
    },
    {
      title: '3. Geser, skala, putar',
      desc: 'Pindahkan, ubah ukuran sudut, dan putar dari tuas atas.',
    },
    {
      title: '4. Tekan lama → lengkung',
      desc: 'Tahan titik sudut hingga kuning lalu seret ke dalam.',
    },
    {
      title: '5. Stempel & foto',
      desc: 'Tambahkan ikon vektor dan gambar berbingkai.',
    },
    {
      title: '6. Teks & deformasi',
      desc: 'Ketik teks, rentangkan sumbu, dan putar bebas.',
    },
    {
      title: '7. Magnet ujung garis',
      desc: 'Kelopak bunga dan batang menyatu menjadi satu bentuk.',
    },
    {
      title: '8. Prototipe UI',
      desc: 'Mockup pemutar audio: layar bulat, ekualiser & tombol.',
    },
  ],
  features: [
    {
      title: 'Garis, kuas, Bezier & bentuk',
      badge: 'Klik kanan kanvas',
      desc: 'Tombol pertama (atau klik kanan di kanvas) membuka: Pilih, Kuas (standar, halus, semprot), Garis, kurva Bezier interaktif, Lingkaran, Persegi (serta Kisi baris/kolom), Segitiga, 8 gaya panah, dan 12 poligon/bintang.',
    },
    {
      title: 'Kontur tertutup & magnet ujung',
      desc: 'Aktifkan Kontur Tertutup untuk kuas, Bezier, atau garis bersegmen (ketuk titik hijau awal untuk menutup). Saat magnet aktif, ujung hijau saling menarik dan menyatu.',
    },
    {
      title: 'Garis ganda (×2), isian & tepi 0 px',
      desc: 'Penggeser opasitas terpisah untuk garis dan isian (0–100%), pola garis, garis ganda ×2, serta isian «Foto» (isi gambar ke dalam bentuk, kontur & stempel). Saat terisi, ketebalan garis bisa turun ke 0 px.',
    },
    {
      title: 'Tekan lama simpul untuk membulatkan sudut',
      badge: 'Tahan ~0.4 dtk',
      desc: 'Pilih persegi panjang, poligon, bintang, segitiga, atau poligon/Bezier, tahan titik sudut ~0.4 dtk hingga menyala kuning lalu seret ke dalam.',
    },
    {
      title: 'Edit langsung bentuk & grup yang ada',
      desc: 'Pilih satu atau beberapa objek (atau klik kanan) lalu buka Garis & Bentuk atau ikon pensil: warna, isian, pola, varian poligon, dan opasitas berubah langsung.',
    },
    {
      title: 'Tipografi & transformasi bebas',
      desc: '30+ font dengan pencarian dan kategori. Ketuk dua kali teks di kanvas untuk mengedit, atau seret pegangan sisi untuk meregangkan dan memutar bebas.',
    },
    {
      title: 'Ikon UI, prototipe & emoji offline',
      desc: '70+ ikon vektor UI yang bisa diwarnai ulang (pemutar media, navigasi, kontrol) untuk prototipe aplikasi, serta 260+ emoji offline tanpa internet.',
    },
    {
      title: 'Gambar, urutan lapisan & balik',
      desc: 'Unggah PNG, JPG, WebP, atau SVG. Di editor objek tersedia bingkai foto berwarna, balik horizontal/vertikal, duplikat, dan atur lapisan depan/belakang.',
    },
    {
      title: 'Penghapus & Riwayat (30 langkah)',
      desc: 'Penghapus yang dapat diatur ukurannya menghapus goresan, sedangkan Delete/Backspace menghapus objek terpilih. Riwayat hingga 30 langkah (Ctrl+Z / Ctrl+Y).',
    },
    {
      title: 'Latar, ukuran kanvas, ekspor & file offline',
      desc: 'Menu «…» menyediakan ekspor PNG/JPG (kanvas penuh atau area gambar), latar (Putih, Kisi, Bergaris, Gelap, RGB & gradien), ukuran kanvas, dan 21 bahasa.',
    },
    {
      title: 'Bingkai putus-putus, bersihkan kanvas & Salin/Tempel',
      badge: 'Tahan • Ctrl+V',
      desc: 'Tekan lama tombol «Pilih» mengubahnya menjadi panah garis putus-putus bergerak untuk menyeleksi potongan gambar atau bentuk dengan kontur tertutup bebas agar bisa digeser, disalin, atau dihapus. Tekan lama tombol «Hapus» (atau penghapus) mengaktifkan pembersihan seluruh kanvas dengan konfirmasi. Ctrl+C / Ctrl+V juga menempelkan teks & gambar langsung ke kanvas.',
    },
  ],
  shortcutsTitle: 'Pintasan & gestur:',
  shortcutRmbKey: 'Klik kanan',
  shortcutRmbDesc: 'Garis & Bentuk',
  shortcutUndoDesc: 'Urung / Ulangi',
  shortcutCopyPasteDesc: 'Salin / Tempel teks, foto, objek (atau tahan area kosong kanvas)',
  shortcutPanKey: 'Spasi + Seret',
  shortcutPanDesc: 'Geser kanvas',
  shortcutDeleteDesc: 'Hapus pilihan',
  shortcutSelectHold: 'Tahan «Pilih» → Bingkai bergerak',
  shortcutDeleteHold: 'Tahan «Hapus» → Bersihkan kanvas',
  shortcutPin: 'Sematkan bilah',
  shortcutSnap: 'Magnet',
  shortcutBezier: 'Bezier',
  shortcutLayers: 'Lapisan',
  shortcutSteps: '30 langkah',
  dontShowAgain: "Jangan tampilkan lagi",
};

const th: HelpTranslationBundle = {
  headerSubtitle: 'ตัวอย่างโต้ตอบและคู่มือการใช้งานทั้งหมด',
  tabDemo: 'เดโมโต้ตอบ',
  tabGuide: 'ฟีเจอร์ทั้งหมด',
  fullscreenEnter: 'เต็มหน้าจอ',
  fullscreenExit: 'ขนาดปกติ',
  closeLabel: 'ปิด',
  play: 'เล่น',
  pause: 'พัก',
  restart: 'เริ่มใหม่',
  prev: 'ก่อนหน้า',
  next: 'ถัดไป',
  searchPlaceholder: 'ค้นหาฟีเจอร์หรือคำสั่ง...',
  searchEmpty: 'ไม่พบฟีเจอร์ที่ตรงกัน',
  demoStrokeStyle: 'เส้นขอบและสไตล์',
  demoDoubleLine: '×2 เส้นคู่',
  demoFill: 'สีเติม',
  demoBorderZero: 'เติมสีแล้วลดเส้นขอบเหลือ 0 px ได้',
  demoRadius: 'ความมน',
  demoSnapMerged: 'แม่เหล็ก: รวมเป็นหนึ่งเดียว!',
  steps: [
    {
      title: '1. เส้นรอบรูปอิสระปิด',
      desc: 'เคอร์เซอร์วาดรูปทรงอิสระแบบเส้นปิดที่ลื่นไหล',
    },
    {
      title: '2. สไตล์และเส้นคู่ ×2',
      desc: 'เปลี่ยนสีเส้น สีเติม และเปิดเส้นคู่ ×2',
    },
    {
      title: '3. ย้าย ย่อขยาย หมุน',
      desc: 'เลื่อนตำแหน่ง ย่อขยายมุม และหมุนจากจุดจับด้านบน',
    },
    {
      title: '4. กดค้าง → ทำมุมมน',
      desc: 'กดจุดมุมค้างจนเป็นสีส้มแล้วลากเข้าด้านใน',
    },
    {
      title: '5. แสตมป์และรูปภาพ',
      desc: 'แทรกไอคอนเวกเตอร์และรูปภาพพร้อมกรอบ',
    },
    {
      title: '6. ข้อความและการดัดรูป',
      desc: 'พิมพ์ข้อความ ยืดสัดส่วนตามแกน และหมุนได้อย่างอิสระ',
    },
    {
      title: '7. แม่เหล็กดูดปลายเส้น',
      desc: 'กลีบดอกไม้และก้านดูดเชื่อมกันเป็นรูปทรงเดียว',
    },
    {
      title: '8. ออกแบบต้นแบบ UI',
      desc: 'ม็อกอัปเครื่องเล่นเพลง: กรอบมน อีควอไลเซอร์ และปุ่มควบคุม',
    },
  ],
  features: [
    {
      title: 'เส้น พู่กัน เบซิเยร์ และรูปทรง',
      badge: 'คลิกขวาบนแคนวาส',
      desc: 'ปุ่มแรก (หรือคลิกขวาบนแคนวาส) เปิดโหมด: เลือก, พู่กัน (ปกติ/ฟุ้ง/สเปรย์), เส้นตรง, เส้นโค้งเบซิเยร์, วงกลม, สี่เหลี่ยม (และตารางปรับแถว/คอลัมน์ได้), สามเหลี่ยม, ลูกศร 8 รูปแบบ และ 12 รูปหลายเหลี่ยม/ดาว',
    },
    {
      title: 'เส้นปิดและแม่เหล็กดูดปลายเส้น',
      desc: 'เปิด «เส้นขอบปิด» สำหรับพู่กัน เบซิเยร์ หรือเส้นหลายท่อน (แตะจุดเริ่มต้นสีเขียวเพื่อปิด) เมื่อเปิดแม่เหล็ก ปลายเส้นสีเขียวจะดูดเชื่อมรวมเป็นเส้นเดียว',
    },
    {
      title: 'เส้นคู่ (×2) สีเติม และเส้นขอบ 0 px',
      desc: 'ปรับความทึบแยกอิสระสำหรับเส้นขอบและสีเติม (0–100%) รูปแบบเส้นประ เส้นคู่ ×2 และเติม «รูปภาพ» (ใส่รูปภาพในรูปทรงปิด เส้นโครง และสแตมป์) เมื่อเปิดสีเติม สามารถลดความหนาเส้นขอบเหลือ 0 px ได้',
    },
    {
      title: 'กดจุดมุมค้างเพื่อทำมุมมน',
      badge: 'กดค้าง ~0.4 วิ',
      desc: 'เลือกสี่เหลี่ยม รูปหลายเหลี่ยม ดาว สามเหลี่ยม หรือเบซิเยร์ กดจุดมุมค้าง ~0.4 วินาทีจนขึ้นสีส้ม แล้วลากเข้าด้านในเพื่อให้มุมโค้งมน',
    },
    {
      title: 'แก้ไขรูปทรงและกลุ่มที่มีอยู่แบบเรียลไทม์',
      desc: 'เลือกวัตถุเดียวหรือหลายวัตถุ (หรือคลิกขวา) แล้วเปิด เส้นและรูปทรง หรือไอคอนดินสอ: สี สีเติม ลวดลาย รูปแบบหลายเหลี่ยม และความทึบเปลี่ยนทันที',
    },
    {
      title: 'ข้อความและการปรับรูปทรงอิสระ',
      desc: 'ฟอนต์มากกว่า 30 แบบพร้อมค้นหาและหมวดหมู่ ดับเบิลคลิกข้อความเพื่อแก้ไข หรือลากจุดจับด้านข้างเพื่อยืด ขยาย และหมุนได้อิสระ',
    },
    {
      title: 'ไอคอน UI ต้นแบบ และอีโมจิออฟไลน์',
      desc: 'ไอคอน UI เวกเตอร์เปลี่ยนสีได้กว่า 70 แบบ (เครื่องเล่นเพลง การนำทาง ปุ่ม) สำหรับทำต้นแบบแอป พร้อมอีโมจิออฟไลน์กว่า 260 ตัวใช้ได้โดยไม่ต้องมีเน็ต',
    },
    {
      title: 'รูปภาพ ลำดับเลเยอร์ และการพลิก',
      desc: 'อัปโหลด PNG, JPG, WebP หรือ SVG ในตัวแก้ไขวัตถุสามารถใส่กรอบสี พลิกแนวนอน/แนวตั้ง ทำซ้ำ หรือย้ายเลเยอร์ไปหน้าสุด/หลังสุดได้',
    },
    {
      title: 'ยางลบและประวัติย้อนกลับ (30 ขั้น)',
      desc: 'ยางลบปรับขนาดได้ใช้ลบเส้นวาด และปุ่ม Delete/Backspace ใช้ลบวัตถุที่เลือก รองรับย้อนกลับ/ทำซ้ำสูงสุด 30 ขั้น (Ctrl+Z / Ctrl+Y)',
    },
    {
      title: 'พื้นหลัง ขนาดแคนวาส ส่งออก และไฟล์ออฟไลน์',
      desc: 'เมนู «…» มีส่งออก PNG/JPG (ทั้งแคนวาสหรือเฉพาะภาพ) พื้นหลัง (ขาว ตาราง เส้นบรรทัด มืด RGB และไล่สี) ขนาดหน้าจอ และรองรับ 21 ภาษา',
    },
    {
      title: 'กรอบเส้นประวิ่ง ล้างแคนวาส และ คัดลอก/วาง',
      badge: 'กดค้าง • Ctrl+V',
      desc: 'กดค้างปุ่ม «เลือก» เพื่อเปลี่ยนเป็นลูกศรเส้นประวิ่งและเลือกบางส่วนของรูปภาพหรือรูปทรงด้วยเส้นปิดอิสระเพื่อย้าย คัดลอก และลบได้ กดค้างปุ่ม «ลบ» (หรือยางลบ) เพื่อเปิดหน้าต่างยืนยันการล้างแคนวาสทั้งหมด และรองรับ Ctrl+C / Ctrl+V เพื่อวางข้อความและรูปภาพลงบนแคนวาสโดยตรง',
    },
  ],
  shortcutsTitle: 'คีย์ลัดและท่าทาง:',
  shortcutRmbKey: 'คลิกขวา',
  shortcutRmbDesc: 'เส้นและรูปทรง',
  shortcutUndoDesc: 'เลิกทำ / ทำซ้ำ',
  shortcutCopyPasteDesc: 'คัดลอก / วางข้อความ รูปภาพ วัตถุ (หรือกดค้างพื้นที่ว่างบนแคนวาส)',
  shortcutPanKey: 'Space + ลาก',
  shortcutPanDesc: 'เลื่อนแคนวาส',
  shortcutDeleteDesc: 'ลบที่เลือก',
  shortcutSelectHold: 'กดค้าง «เลือก» → กรอบเส้นประวิ่ง',
  shortcutDeleteHold: 'กดค้าง «ลบ» → ล้างแคนวาสทั้งหมด',
  shortcutPin: 'ปักหมุดแถบ',
  shortcutSnap: 'แม่เหล็ก',
  shortcutBezier: 'เบซิเยร์',
  shortcutLayers: 'เลเยอร์',
  shortcutSteps: '30 ขั้น',
  dontShowAgain: "ไม่ต้องแสดงอีก",
};

export const HELP_TRANSLATIONS: Record<SupportedLanguage, HelpTranslationBundle> = {
  en,
  ru,
  uk,
  be,
  kk,
  es,
  pt,
  fr,
  de,
  it,
  pl,
  nl,
  tr,
  ar,
  hi,
  zh,
  ja,
  ko,
  vi,
  id,
  th,
};

export function getHelpCopy(lang: SupportedLanguage): HelpTranslationBundle {
  return HELP_TRANSLATIONS[lang] || en;
}
