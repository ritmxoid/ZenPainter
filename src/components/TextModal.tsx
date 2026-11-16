import React, { useEffect, useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { CYRILLIC_LATIN_FONTS, QUICK_COLOR_SWATCHES } from '../constants/fonts';
import { TranslationKey } from '../i18n/translations';
import { FontCategory } from '../types/paint';
import { trackFunction, trackWindowClose, trackWindowOpen } from '../utils/analytics';

interface TextModalProps {
  t: (key: TranslationKey) => string;
  onAddText: (payload: {
    text: string;
    color: string;
    fontFamily: string;
    fontSize: number;
  }) => void;
  defaultColor: string;
  isDarkBg: boolean;
}

export const TextModal: React.FC<TextModalProps> = ({
  t,
  onAddText,
  defaultColor,
  isDarkBg,
}) => {
  const [text, setText] = useState('');
  const [color, setColor] = useState(defaultColor);
  const [fontSize, setFontSize] = useState(36);
  const [fontFamily, setFontFamily] = useState('Montserrat');
  const [category, setCategory] = useState<'all' | FontCategory>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    trackWindowOpen('text_modal', { default_color: defaultColor });
    return () => trackWindowClose('text_modal');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredFonts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return CYRILLIC_LATIN_FONTS.filter((f) => {
      if (category !== 'all' && f.category !== category) return false;
      if (q && !f.family.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [category, search]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = text.trim() || t('textDefaultContent');
    onAddText({ text: content, color, fontFamily, fontSize });
  };

  const categories: Array<{ id: 'all' | FontCategory; labelKey: TranslationKey }> = [
    { id: 'all', labelKey: 'fontCatAll' },
    { id: 'sans', labelKey: 'fontCatSans' },
    { id: 'serif', labelKey: 'fontCatSerif' },
    { id: 'handwritten', labelKey: 'fontCatHandwritten' },
    { id: 'display', labelKey: 'fontCatDisplay' },
  ];

  const surface = isDarkBg
    ? 'bg-neutral-900/95 text-neutral-100 border-neutral-700/80 shadow-2xl shadow-black/50'
    : 'bg-white/95 text-slate-900 border-slate-200/90 shadow-xl shadow-slate-900/10';
  const mutedText = isDarkBg ? 'text-neutral-400' : 'text-slate-500';
  const inputBg = isDarkBg
    ? 'bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-500'
    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400';
  const subSurface = isDarkBg ? 'bg-neutral-800/80' : 'bg-slate-100';

  return (
    <form
      onSubmit={handleSubmit}
      className={`fixed top-4 right-[70px] sm:right-[76px] z-40 w-[min(350px,calc(100vw-82px))] max-h-[calc(100dvh-32px)] rounded-2xl border backdrop-blur-md flex flex-col overflow-hidden transition-all duration-150 ${surface}`}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="flex-1 min-h-0 bp-scroll overflow-y-auto p-4 space-y-3.5">
        <div className="text-sm font-semibold">{t('textTitle')}</div>

        {/* Text Input */}
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={t('textPlaceholder')}
          style={{ fontFamily }}
          className={`w-full px-3 py-2.5 rounded-xl border text-base resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
        />

        {/* Color & Size */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs font-medium ${mutedText}`}>{t('textSize')}</span>
            <span className="text-xs font-semibold tabular-nums">{fontSize}px</span>
          </div>
          <input
            type="range"
            min={14}
            max={96}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-full h-2 rounded-lg accent-blue-600 cursor-pointer"
          />

          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            <label
              className={`relative w-8 h-8 rounded-lg border overflow-hidden cursor-pointer shrink-0 ${
                isDarkBg ? 'border-neutral-600' : 'border-slate-300'
              }`}
              title={t('textColor')}
            >
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer border-0 p-0"
              />
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {QUICK_COLOR_SWATCHES.map((hex) => {
                const selected = color.toLowerCase() === hex.toLowerCase();
                return (
                  <button
                    key={hex}
                    type="button"
                    aria-label={hex}
                    onClick={() => setColor(hex)}
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
        </div>

        {/* Font Selector */}
        <div className="space-y-2">
          <div className={`text-xs font-medium ${mutedText}`}>{t('textFont')}</div>

          {/* Search */}
          <div className="relative">
            <Search
              className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${mutedText}`}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('fontSearchPlaceholder')}
              className={`w-full pl-8 pr-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
            />
          </div>

          {/* Category Filter */}
          <div className={`flex items-center gap-1 p-1 rounded-xl overflow-x-auto ${subSurface}`}>
            {categories.map((cat) => {
              const active = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategory(cat.id);
                    trackFunction('filter_font_category', 'text', { category: cat.id });
                  }}
                  className={`flex-1 min-w-fit min-h-[32px] px-2 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? isDarkBg
                        ? 'bg-neutral-900 text-white shadow-sm'
                        : 'bg-white text-slate-900 shadow-sm'
                      : isDarkBg
                        ? 'text-neutral-300 hover:text-white'
                        : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t(cat.labelKey)}
                </button>
              );
            })}
          </div>

          {/* Font List */}
          <div
            className={`bp-scroll max-h-44 overflow-y-auto rounded-xl border divide-y ${
              isDarkBg
                ? 'border-neutral-800 divide-neutral-800/80 bg-neutral-950/40'
                : 'border-slate-200 divide-slate-100 bg-slate-50/50'
            }`}
          >
            {filteredFonts.map((font) => {
              const selected = fontFamily === font.family;
              return (
                <button
                  key={font.family}
                  type="button"
                  onClick={() => {
                    setFontFamily(font.family);
                    trackFunction('select_font_family', 'text', { font_family: font.family });
                  }}
                  className={`w-full min-h-[44px] px-3 py-2 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                    selected
                      ? isDarkBg
                        ? 'bg-blue-600/20 text-blue-300'
                        : 'bg-blue-50 text-blue-700'
                      : isDarkBg
                        ? 'hover:bg-neutral-800 text-neutral-100'
                        : 'hover:bg-white text-slate-800'
                  }`}
                >
                  <span
                    className="text-sm truncate"
                    style={{ fontFamily: `'${font.family}', sans-serif` }}
                  >
                    {font.family}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs ${mutedText}`}
                      style={{ fontFamily: `'${font.family}', sans-serif` }}
                    >
                      Аа Aa
                    </span>
                    {selected && <Check className="w-4 h-4 text-blue-500" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <p className={`text-[11px] leading-snug ${mutedText}`}>{t('textHint')}</p>
      </div>

      {/* Footer CTA */}
      <div
        className={`p-3 border-t ${
          isDarkBg ? 'border-neutral-800 bg-neutral-900' : 'border-slate-100 bg-white'
        }`}
      >
        <button
          type="submit"
          className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-sm font-semibold transition-all cursor-pointer"
        >
          {t('textAddButton')}
        </button>
      </div>
    </form>
  );
};
