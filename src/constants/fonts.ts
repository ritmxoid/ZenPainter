import { FontDefinition } from '../types/paint';

export const QUICK_COLOR_SWATCHES = [
  '#000000',
  '#FFFFFF',
  '#475569',
  '#EF4444',
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
] as const;

export const CYRILLIC_LATIN_FONTS: FontDefinition[] = [
  // Sans-serif (8)
  { family: 'Roboto', category: 'sans' },
  { family: 'Montserrat', category: 'sans' },
  { family: 'Open Sans', category: 'sans' },
  { family: 'Inter', category: 'sans' },
  { family: 'Nunito', category: 'sans' },
  { family: 'PT Sans', category: 'sans' },
  { family: 'Rubik', category: 'sans' },
  { family: 'Jost', category: 'sans' },

  // Serif (6)
  { family: 'Playfair Display', category: 'serif' },
  { family: 'Lora', category: 'serif' },
  { family: 'Merriweather', category: 'serif' },
  { family: 'PT Serif', category: 'serif' },
  { family: 'Cormorant Garamond', category: 'serif' },
  { family: 'EB Garamond', category: 'serif' },

  // Handwritten / Calligraphic (8)
  { family: 'Caveat', category: 'handwritten' },
  { family: 'Marck Script', category: 'handwritten' },
  { family: 'Pacifico', category: 'handwritten' },
  { family: 'Bad Script', category: 'handwritten' },
  { family: 'Amatic SC', category: 'handwritten' },
  { family: 'Kelly Slab', category: 'handwritten' },
  { family: 'Neucha', category: 'handwritten' },
  { family: 'Pangolin', category: 'handwritten' },

  // Display / Artistic (9)
  { family: 'Lobster', category: 'display' },
  { family: 'Comfortaa', category: 'display' },
  { family: 'Rubik Mono One', category: 'display' },
  { family: 'Oswald', category: 'display' },
  { family: 'Press Start 2P', category: 'display' },
  { family: 'Philosopher', category: 'display' },
  { family: 'Poiret One', category: 'display' },
  { family: 'Yeseva One', category: 'display' },
  { family: 'Ruslan Display', category: 'display' },
];
