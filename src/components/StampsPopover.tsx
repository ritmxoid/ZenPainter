import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, Smile, Shapes, X } from 'lucide-react';
import { OFFLINE_EMOJIS } from '../constants/emojis';
import { QUICK_COLOR_SWATCHES } from '../constants/fonts';
import { STAMP_RU_NAMES, WIREFRAME_STAMPS } from '../constants/stamps';
import { TranslationKey } from '../i18n/translations';
import {
  EmojiCategory,
  EmojiDefinition,
  StampCategory,
  StampDefinition,
  StampsTab,
  SupportedLanguage,
} from '../types/paint';
import { trackFunction, trackWindowClose, trackWindowOpen } from '../utils/analytics';

function getEmojiLabel(em: EmojiDefinition, lang: SupportedLanguage): string {
  if (lang === 'ru' || lang === 'uk' || lang === 'be' || lang === 'kk') {
    return em.name;
  }
  const withoutRu = em.keywords.slice(em.name.length).trim();
  const latinWords = withoutRu.match(/[a-zA-Z0-9]+/g);
  if (latinWords && latinWords.length > 0) {
    const first = latinWords[0];
    return first.charAt(0).toUpperCase() + first.slice(1);
  }
  return em.char;
}

function getStampLabel(stamp: StampDefinition, lang: SupportedLanguage): string {
  if (lang === 'ru' || lang === 'uk' || lang === 'be' || lang === 'kk') {
    return STAMP_RU_NAMES[stamp.id] || stamp.name;
  }
  return stamp.name;
}

interface StampsPopoverProps {
  t: (key: TranslationKey) => string;
  lang: SupportedLanguage;
  onAddStamp: (stamp: StampDefinition, color: string) => void;
  onAddEmoji: (emoji: EmojiDefinition) => void;
  defaultColor: string;
  isDarkBg: boolean;
}

export const StampsPopover: React.FC<StampsPopoverProps> = ({
  t,
  lang,
  onAddStamp,
  onAddEmoji,
  defaultColor,
  isDarkBg,
}) => {
  const [activeTab, setActiveTab] = useState<StampsTab>('icons');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | StampCategory>('all');
  const [emojiCategory, setEmojiCategory] = useState<'all' | EmojiCategory>('all');
  const [color, setColor] = useState(defaultColor);
  const catStripRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    trackWindowOpen('stamps_popover', { active_tab: activeTab });
    return () => trackWindowClose('stamps_popover');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateCatScrollArrows = useCallback(() => {
    const el = catStripRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateCatScrollArrows();
    const el = catStripRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(updateCatScrollArrows);
    ro.observe(el);
    return () => ro.disconnect();
  }, [activeTab, updateCatScrollArrows]);

  const scrollCategoryBar = (dir: -1 | 1) => {
    const el = catStripRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 130, behavior: 'smooth' });
  };

  const categories: Array<{ id: 'all' | StampCategory; labelKey: TranslationKey }> = [
    { id: 'all', labelKey: 'stampCatAll' },
    { id: 'nav', labelKey: 'stampCatNav' },
    { id: 'media', labelKey: 'stampCatMedia' },
    { id: 'comm', labelKey: 'stampCatComm' },
    { id: 'commerce', labelKey: 'stampCatCommerce' },
  ];

  const emojiCategories: Array<{ id: 'all' | EmojiCategory; labelKey: TranslationKey }> = [
    { id: 'all', labelKey: 'emojiCatAll' },
    { id: 'smileys', labelKey: 'emojiCatSmileys' },
    { id: 'gestures', labelKey: 'emojiCatGestures' },
    { id: 'nature', labelKey: 'emojiCatNature' },
    { id: 'objects', labelKey: 'emojiCatObjects' },
    { id: 'symbols', labelKey: 'emojiCatSymbols' },
  ];

  const filteredStamps = useMemo(() => {
    const q = search.trim().toLowerCase();
    return WIREFRAME_STAMPS.filter((s) => {
      if (category !== 'all' && s.category !== category) return false;
      if (!q) return true;
      return (
        getStampLabel(s, lang).toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.keywords.toLowerCase().includes(q)
      );
    });
  }, [category, lang, search]);

  const filteredEmojis = useMemo(() => {
    const q = search.trim().toLowerCase();
    return OFFLINE_EMOJIS.filter((em) => {
      if (emojiCategory !== 'all' && em.category !== emojiCategory) return false;
      if (!q) return true;
      return (
        em.char.includes(q) ||
        em.name.toLowerCase().includes(q) ||
        em.keywords.toLowerCase().includes(q)
      );
    });
  }, [emojiCategory, search]);

  const surface = isDarkBg
    ? 'bg-neutral-900/95 text-neutral-100 border-neutral-700/80 shadow-2xl shadow-black/50'
    : 'bg-white/95 text-slate-900 border-slate-200/90 shadow-xl shadow-slate-900/10';
  const mutedText = isDarkBg ? 'text-neutral-400' : 'text-slate-500';
  const inputBg = isDarkBg
    ? 'bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-500'
    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400';
  const subSurface = isDarkBg ? 'bg-neutral-800/80' : 'bg-slate-100';

  const activeCount = activeTab === 'icons' ? filteredStamps.length : filteredEmojis.length;

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className={`fixed top-4 right-[70px] sm:right-[76px] z-40 w-[min(356px,calc(100vw-82px))] max-h-[calc(100dvh-32px)] rounded-2xl border backdrop-blur-md flex flex-col overflow-hidden transition-all duration-150 ${surface}`}
    >
      <div className="p-4 pb-3 space-y-2.5 border-b border-black/5 dark:border-white/10">
        {/* Top Mode Tabs: UI Icons vs Emoji */}
        <div className="flex items-center justify-between gap-2">
          <div className={`flex-1 grid grid-cols-2 gap-1 p-1 rounded-xl ${subSurface}`}>
            <button
              type="button"
              onClick={() => {
                setActiveTab('icons');
                setSearch('');
                trackFunction('switch_stamps_tab', 'stamps', { tab: 'icons' });
              }}
              className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'icons'
                  ? isDarkBg
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'bg-white text-slate-900 shadow-sm'
                  : isDarkBg
                    ? 'text-neutral-300 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shapes className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t('stampsTabIcons')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('emoji');
                setSearch('');
                trackFunction('switch_stamps_tab', 'stamps', { tab: 'emoji' });
              }}
              className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'emoji'
                  ? isDarkBg
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'bg-white text-slate-900 shadow-sm'
                  : isDarkBg
                    ? 'text-neutral-300 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smile className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t('stampsTabEmoji')}</span>
            </button>
          </div>
          <span className={`text-[11px] font-medium tabular-nums shrink-0 ${mutedText}`}>
            {activeCount}
          </span>
        </div>

        {/* Live Search Bar */}
        <div className="relative">
          <Search
            className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${mutedText}`}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              activeTab === 'icons'
                ? t('stampsSearchPlaceholder')
                : t('emojiSearchPlaceholder')
            }
            className={`w-full min-h-[40px] pl-8 pr-8 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label={t('clearSearch')}
              className={`absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center cursor-pointer ${mutedText} hover:text-blue-500`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter Tabs (touch pan-x + mouse wheel + arrow buttons) */}
        <div className={`relative flex items-center gap-0.5 p-1 rounded-xl ${subSurface}`}>
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollCategoryBar(-1)}
              aria-label={t('scrollLeft')}
              className={`shrink-0 w-7 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                isDarkBg
                  ? 'text-neutral-300 hover:bg-neutral-700/70 hover:text-white'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900 shadow-xs'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <div
            ref={catStripRef}
            onScroll={updateCatScrollArrows}
            onWheel={(e) => {
              if (Math.abs(e.deltaY) >= Math.abs(e.deltaX) && e.deltaY !== 0) {
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
            className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto bp-scroll-x"
          >
            {activeTab === 'icons'
              ? categories.map((cat) => {
                  const active = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setCategory(cat.id);
                        trackFunction('filter_stamps_category', 'stamps', { tab: 'icons', category: cat.id });
                      }}
                      className={`shrink-0 min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
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
                })
              : emojiCategories.map((cat) => {
                  const active = emojiCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setEmojiCategory(cat.id);
                        trackFunction('filter_stamps_category', 'stamps', { tab: 'emoji', category: cat.id });
                      }}
                      className={`shrink-0 min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
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
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollCategoryBar(1)}
              aria-label={t('scrollRight')}
              className={`shrink-0 w-7 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                isDarkBg
                  ? 'text-neutral-300 hover:bg-neutral-700/70 hover:text-white'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900 shadow-xs'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Color Selector (for monochrome UI icons) */}
        {activeTab === 'icons' && (
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            <label
              className={`relative w-7 h-7 rounded-lg border overflow-hidden cursor-pointer shrink-0 ${
                isDarkBg ? 'border-neutral-600' : 'border-slate-300'
              }`}
              title={t('stampsColor')}
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
        )}
      </div>

      {/* Scrollable Grid (UI Icons or Offline Emojis) */}
      <div className="flex-1 min-h-0 bp-scroll overflow-y-auto p-3">
        {activeTab === 'icons' ? (
          filteredStamps.length === 0 ? (
            <div className={`py-10 text-center text-xs font-medium ${mutedText}`}>
              {t('stampsEmpty')}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              {filteredStamps.map((stamp) => {
                const stampLabel = getStampLabel(stamp, lang);
                return (
                  <button
                    key={stamp.id}
                    type="button"
                    onClick={() => onAddStamp(stamp, color)}
                    title={stampLabel}
                    aria-label={stampLabel}
                    className={`min-h-[58px] px-1.5 py-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 ${
                      isDarkBg
                        ? 'border-neutral-800 bg-neutral-800/40 hover:bg-neutral-800 hover:border-neutral-600 text-neutral-100'
                        : 'border-slate-200/80 bg-slate-50/70 hover:bg-blue-50/70 hover:border-blue-300 text-slate-800'
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="22"
                      height="22"
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="shrink-0"
                      dangerouslySetInnerHTML={{ __html: stamp.paths }}
                    />
                    <span className={`text-[10px] leading-tight truncate max-w-full ${mutedText}`}>
                      {stampLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          )
        ) : filteredEmojis.length === 0 ? (
          <div className={`py-10 text-center text-xs font-medium ${mutedText}`}>
            {t('emojiEmpty')}
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-1.5">
            {filteredEmojis.map((em, idx) => {
              const label = getEmojiLabel(em, lang);
              return (
                <button
                  key={`${em.char}-${idx}`}
                  type="button"
                  onClick={() => onAddEmoji(em)}
                  title={label}
                  aria-label={label}
                style={{
                  fontFamily:
                    '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif',
                }}
                className={`h-11 rounded-xl border flex items-center justify-center text-[22px] leading-none transition-all cursor-pointer active:scale-90 ${
                  isDarkBg
                    ? 'border-neutral-800 bg-neutral-800/40 hover:bg-neutral-800 hover:border-neutral-600'
                    : 'border-slate-200/80 bg-slate-50/70 hover:bg-blue-50/80 hover:border-blue-300'
                }`}
                >
                  {em.char}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
