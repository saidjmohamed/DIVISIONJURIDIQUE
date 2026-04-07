'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LawMeta {
  id: string;
  name: string;
  fullName?: string;
  file: string;
  count: number;
  number: string;
  icon: string;
  color: string;
  category?: string;
}

interface LawArticle {
  num: number;
  number: string;
  text: string;
}

interface LawArticleWithLaw extends LawArticle {
  law: string;
}

interface ScoredArticle extends LawArticleWithLaw {
  _score: number;
}

// ─── تصنيفات القوانين ────────────────────────────────────────────────────────
// النظام الآن ديناميكي: يستخدم حقل category من index.json
// هذه القائمة تحدد ترتيب التصنيفات وأيقوناتها وألوانها فقط

const CATEGORIES: { id: string; label: string; icon: string; color: string; ids: string[] }[] = [
  {
    id: 'main',
    label: 'القوانين الأساسية',
    icon: '⚖️',
    color: '#1a3a5c',
    ids: ['civil', 'commercial', 'family', 'penal', 'qij', 'qima', 'maritime', 'fiscal'],
  },
  {
    id: 'الجزائي',
    label: 'القانون الجزائي',
    icon: '🔒',
    color: '#dc2626',
    ids: [], // ديناميكي من category
  },
  {
    id: 'الإجراءات',
    label: 'قوانين الإجراءات',
    icon: '📋',
    color: '#7c3aed',
    ids: [],
  },
  {
    id: 'المدني والتجاري',
    label: 'المدني والتجاري',
    icon: '🏢',
    color: '#2563eb',
    ids: [],
  },
  {
    id: 'الضرائب والجمارك',
    label: 'الضرائب والجمارك',
    icon: '💰',
    color: '#059669',
    ids: [],
  },
  {
    id: 'الإداري والدستوري',
    label: 'الإداري والدستوري',
    icon: '🏛️',
    color: '#0891b2',
    ids: [],
  },
  {
    id: 'العمل والاجتماعي',
    label: 'العمل والاجتماعي',
    icon: '👷',
    color: '#d97706',
    ids: [],
  },
  {
    id: 'العقار والتعمير',
    label: 'العقار والتعمير',
    icon: '🏗️',
    color: '#b45309',
    ids: [],
  },
  {
    id: 'البيئة والفلاحة',
    label: 'البيئة والفلاحة',
    icon: '🌿',
    color: '#16a34a',
    ids: [],
  },
  {
    id: 'الصحة والأسرة',
    label: 'الصحة والأسرة',
    icon: '❤️',
    color: '#db2777',
    ids: [],
  },
  {
    id: 'النقل والمرور',
    label: 'النقل والمرور',
    icon: '🚗',
    color: '#6d28d9',
    ids: [],
  },
  {
    id: 'الأمن والدفاع',
    label: 'الأمن والدفاع',
    icon: '🛡️',
    color: '#1e3a5f',
    ids: [],
  },
  {
    id: 'الإعلام والاتصال',
    label: 'الإعلام والاتصال',
    icon: '📡',
    color: '#0284c7',
    ids: [],
  },
  {
    id: 'الملكية الفكرية',
    label: 'الملكية الفكرية',
    icon: '💡',
    color: '#7e22ce',
    ids: [],
  },
  {
    id: 'القضاء والمحاكم',
    label: 'القضاء والمحاكم',
    icon: '🏛',
    color: '#4338ca',
    ids: [],
  },
  {
    id: 'الاقتصاد والاستثمار',
    label: 'الاقتصاد والاستثمار',
    icon: '📈',
    color: '#065f46',
    ids: [],
  },
  {
    id: 'أخرى',
    label: 'أخرى',
    icon: '📄',
    color: '#6b7280',
    ids: [],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getCategoryForLaw(law: LawMeta): { label: string; icon: string; color: string } | null {
  // أولاً: تحقق من قائمة ids الثابتة (للقوانين الأساسية)
  for (const cat of CATEGORIES) {
    if (cat.ids.includes(law.id)) return { label: cat.label, icon: cat.icon, color: cat.color };
  }
  // ثانياً: استخدم حقل category من البيانات
  if (law.category) {
    const cat = CATEGORIES.find(c => c.id === law.category);
    if (cat) return { label: cat.label, icon: cat.icon, color: cat.color };
  }
  return null;
}

// ─── HighlightedText ──────────────────────────────────────────────────────────

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim()) return <>{text}</>;
  const q = query.trim();
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-amber-300/70 dark:bg-amber-500/50 text-amber-900 dark:text-amber-100 rounded px-0.5 font-black not-italic"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ totalLaws, totalArticles }: { totalLaws: number; totalArticles: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {[
        { label: 'قانون', value: totalLaws, icon: '📚', color: '#1a3a5c' },
        { label: 'مادة قانونية', value: totalArticles.toLocaleString('ar-DZ'), icon: '📋', color: '#16a34a' },
        { label: 'تصنيف', value: CATEGORIES.length, icon: '🗂️', color: '#7c3aed' },
        { label: 'بحث فوري', value: '✓', icon: '⚡', color: '#dc2626' },
      ].map((s, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800/60 rounded-2xl p-3 sm:p-4 border border-gray-100 dark:border-gray-700/50 shadow-sm flex items-center gap-3"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ backgroundColor: hexToRgba(s.color, 0.12) }}
          >
            {s.icon}
          </div>
          <div>
            <p className="font-black text-lg text-gray-800 dark:text-gray-100 leading-none">{s.value}</p>
            <p className="text-xs text-gray-400 font-medium mt-0.5">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Category Filter ──────────────────────────────────────────────────────────

function CategoryFilter({
  activeCategory,
  onChange,
  lawsMeta,
}: {
  activeCategory: string;
  onChange: (id: string) => void;
  lawsMeta: LawMeta[];
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
      <button
        onClick={() => onChange('all')}
        className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black transition-all whitespace-nowrap ${
          activeCategory === 'all'
            ? 'bg-[#1a3a5c] text-white shadow-md'
            : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-gray-400'
        }`}
      >
        <span>🗂️</span>
        <span>الكل ({lawsMeta.length})</span>
      </button>
      {CATEGORIES.map((cat) => {
        // عد القوانين في كل تصنيف: دعم ids الثابتة وحقل category الديناميكي
        const count = lawsMeta.filter((l) =>
          cat.ids.includes(l.id) || (l.category && l.category === cat.id)
        ).length;
        if (count === 0) return null;
        return (
          <button
            key={cat.id}
            onClick={() => onChange(cat.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black transition-all whitespace-nowrap ${
              activeCategory === cat.id
                ? 'text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-gray-400'
            }`}
            style={activeCategory === cat.id ? { backgroundColor: cat.color } : {}}
          >
            <span>{cat.icon}</span>
            <span>
              {cat.label} ({count})
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Law Grid Card ────────────────────────────────────────────────────────────

function LawGridCard({ law, onClick }: { law: LawMeta; onClick: () => void }) {
  const cat = getCategoryForLaw(law);
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -3 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white dark:bg-gray-800/60 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-500 transition-all shadow-sm hover:shadow-lg cursor-pointer group relative overflow-hidden"
    >
      {/* top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl opacity-80"
        style={{ backgroundColor: law.color }}
      />
      <div className="flex items-start gap-3 pt-1">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm flex-shrink-0"
          style={{ backgroundColor: hexToRgba(law.color, 0.13) }}
        >
          {law.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-black text-gray-800 dark:text-gray-100 text-sm leading-snug line-clamp-2">
            {law.name}
          </h4>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {law.number && (
              <span
                className="text-[10px] font-black px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: law.color }}
              >
                {law.number}
              </span>
            )}
            <span className="text-[10px] text-gray-400 font-bold bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
              {law.count} مادة
            </span>
            {cat && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: hexToRgba(cat.color, 0.1), color: cat.color }}
              >
                {cat.icon} {cat.label}
              </span>
            )}
          </div>
        </div>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-white text-sm font-black flex-shrink-0 shadow-md"
          style={{ backgroundColor: law.color }}
        >
          ←
        </div>
      </div>
    </motion.div>
  );
}

// ─── Article Card (Full Text) ─────────────────────────────────────────────────

function ArticleCard({
  article,
  lawMeta,
  onCopy,
  onWhatsApp,
  copiedId,
  highlightQuery,
  isSearchResult,
}: {
  article: LawArticle;
  lawMeta: LawMeta;
  onCopy: () => void;
  onWhatsApp: () => void;
  copiedId: string | null;
  highlightQuery?: string;
  isSearchResult?: boolean;
}) {
  const id = `${lawMeta.id}-${article.num}`;
  const isMatched = highlightQuery && article.text.toLowerCase().includes(highlightQuery.toLowerCase());

  return (
    <div
      id={`article-${article.num}`}
      className={`rounded-2xl border transition-colors group relative overflow-hidden ${
        isSearchResult && isMatched
          ? 'border-amber-300 dark:border-amber-600 bg-amber-50/40 dark:bg-amber-900/10 shadow-md'
          : 'border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/40 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      {/* Left accent */}
      <div
        className="absolute top-0 right-0 w-1 h-full"
        style={{ backgroundColor: isSearchResult && isMatched ? '#f59e0b' : hexToRgba(lawMeta.color, 0.7) }}
      />

      <div className="p-4 sm:p-5">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-black text-white shadow-sm"
              style={{ backgroundColor: isSearchResult && isMatched ? '#f59e0b' : lawMeta.color }}
            >
              المادة {article.number || article.num}
            </span>
            {isSearchResult && isMatched && (
              <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-lg">
                ✓ نتيجة البحث
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                copiedId === id
                  ? 'bg-green-500 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-900 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {copiedId === id ? (
                <>✅ تم النسخ</>
              ) : (
                <>📋 نسخ</>
              )}
            </button>
            <button
              onClick={onWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-bold hover:bg-green-100 dark:hover:bg-green-900/40 transition-all"
            >
              📲 واتساب
            </button>
          </div>
        </div>

        {/* Article full text */}
        <div className="bg-gray-50/60 dark:bg-gray-900/40 p-4 rounded-xl border border-gray-100/60 dark:border-gray-800/60">
          <p className="text-gray-700 dark:text-gray-200 leading-loose text-sm sm:text-base whitespace-pre-line font-medium">
            {highlightQuery ? (
              <HighlightedText text={article.text} query={highlightQuery} />
            ) : (
              article.text
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Individual Law View — عرض ورقي متدفق ────────────────────────────────────

function IndividualLawView({ law, onBack }: { law: LawMeta; onBack: () => void }) {
  const [articles, setArticles] = useState<LawArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [jumpInput, setJumpInput] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll للأعلى فور فتح القانون
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // تحميل مواد القانون
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setArticles([]);
    fetch(`/laws-json/${law.file}`)
      .then((r) => r.json())
      .then((data: LawArticle[]) => {
        if (!cancelled) {
          setArticles(data);
          window.scrollTo({ top: 0, behavior: 'instant' });
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [law.file]);

  // Debounce البحث
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [searchQuery]);

  // فلترة المواد عند البحث
  const filteredArticles = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return articles;
    const nums = q.match(/\d+/g);
    const words = q.replace(/\d+/g, ' ').trim().split(/\s+/).filter((w) => w.length > 0);
    return articles.filter((a) => {
      const txt = a.text.toLowerCase();
      const artNum = String(a.num);
      const artNumber = String(a.number || a.num);
      if (txt.includes(q) || artNum === q) return true;
      if (nums && nums.length > 0) {
        const numMatch = nums.some((n) => artNum === n || artNumber === n);
        if (numMatch && words.length === 0) return true;
        if (numMatch && words.every((w) => txt.includes(w))) return true;
      }
      if (words.length > 0) return words.every((w) => txt.includes(w));
      return false;
    });
  }, [articles, debouncedQuery]);

  // نسخ مادة
  const handleCopy = useCallback((article: LawArticle) => {
    const text = `${law.icon} ${law.name}\nالمادة ${article.number || article.num}\n\n${article.text}`;
    navigator.clipboard.writeText(text);
    const id = `${law.id}-${article.num}`;
    setActiveArticleId(id);
    setTimeout(() => setActiveArticleId(null), 2000);
  }, [law]);

  // مشاركة واتساب
  const handleWhatsApp = useCallback((article: LawArticle) => {
    const text = `*${law.icon} ${law.name}*\n*المادة ${article.number || article.num}*\n\n${article.text}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }, [law]);

  // الانتقال لمادة محددة
  const handleJump = () => {
    const n = parseInt(jumpInput);
    if (!n) return;
    const target = articles.find((a) => a.num === n || String(a.number) === String(n));
    const el = target
      ? document.getElementById(`art-${target.num}`)
      : document.getElementById(`art-${n}`);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 130;
      window.scrollTo({ top, behavior: 'smooth' });
      el.classList.add('law-jump-highlight');
      setTimeout(() => el.classList.remove('law-jump-highlight'), 2500);
    }
    setJumpInput('');
  };

  const cat = getCategoryForLaw(law);
  const matchCount = debouncedQuery ? filteredArticles.length : 0;
  const displayArticles = debouncedQuery ? filteredArticles : articles;

  return (
    <div dir="rtl">

      {/* ── شريط التحكم العلوي ── */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-black text-gray-600 dark:text-gray-300 transition-all group flex-shrink-0"
        >
          <span className="group-hover:translate-x-1 transition-transform">→</span>
          <span>القوانين</span>
        </button>
        <div className="flex-1 relative min-w-0">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`🔍  ابحث في ${law.name}...`}
            className="w-full px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-[#1a3a5c] dark:focus:border-[#f0c040] outline-none text-sm font-bold transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-100 text-lg font-black leading-none"
            >
              ×
            </button>
          )}
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <input
            type="number"
            value={jumpInput}
            onChange={(e) => setJumpInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJump()}
            placeholder="م. رقم"
            className="w-20 px-3 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-amber-400 outline-none text-sm font-bold text-center"
          />
          <button
            onClick={handleJump}
            className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-white font-black text-sm shadow-sm transition-all"
            title="انتقل للمادة"
          >
            ⤵
          </button>
        </div>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex-shrink-0 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm font-black transition-all"
          title="العودة للأعلى"
        >
          ↑
        </button>
      </div>

      {/* ── ورقة القانون ── */}
      <div className="law-paper" dir="rtl">

        {/* غلاف القانون — كصفحة العنوان */}
        <div className="law-cover" style={{ borderColor: law.color }}>
          <div className="law-cover-icon" style={{ color: law.color }}>{law.icon}</div>
          <div className="law-cover-emblem">الجمهورية الجزائرية الديمقراطية الشعبية</div>
          <h1 className="law-cover-title">{law.name}</h1>
          <div className="law-cover-meta">
            {law.number && <span>رقم {law.number}</span>}
            {law.number && <span className="law-cover-dot">•</span>}
            <span>{law.count} مادة</span>
            {cat && <><span className="law-cover-dot">•</span><span>{cat.icon} {cat.label}</span></>}
          </div>
          {debouncedQuery && (
            <div className="law-search-badge">
              {matchCount > 0
                ? `🔍 ${matchCount} مادة تتضمن «${debouncedQuery}»`
                : `🔍 لا توجد نتائج لـ «${debouncedQuery}»`}
            </div>
          )}
        </div>

        {/* حالة التحميل */}
        {isLoading ? (
          <div className="law-loading">
            <span className="law-loading-icon">{law.icon}</span>
            <p>جاري فتح القانون...</p>
          </div>
        ) : displayArticles.length === 0 ? (
          <div className="law-no-results">
            <p>لم يُعثر على نتائج لـ «{debouncedQuery}»</p>
            <button onClick={() => setSearchQuery('')}>مسح البحث</button>
          </div>
        ) : (
          /* ── قائمة المواد — متدفقة كالورق ── */
          <div className="law-body">
            {displayArticles.map((article) => {
              const artId = `art-${article.num}`;
              const copyId = `${law.id}-${article.num}`;
              const isCopied = activeArticleId === copyId;
              const isHighlighted = debouncedQuery
                ? article.text.toLowerCase().includes(debouncedQuery.toLowerCase())
                : false;

              return (
                <div
                  key={`${law.id}-${article.num}`}
                  id={artId}
                  className={`law-article${
                    isHighlighted ? ' law-article--match' : ''
                  }`}
                >
                  {/* رقم المادة */}
                  <div className="law-article-header">
                    <span
                      className="law-article-number"
                      style={{ color: law.color }}
                    >
                      المادة {article.number || article.num}
                    </span>
                    {isHighlighted && (
                      <span className="law-article-match-badge">نتيجة البحث</span>
                    )}
                    {/* أزرار سريعة تظهر عند hover */}
                    <div className="law-article-actions">
                      <button
                        onClick={() => handleCopy(article)}
                        className={`law-btn${ isCopied ? ' law-btn--copied' : '' }`}
                        title="نسخ المادة"
                      >
                        {isCopied ? '✅' : '📋'}
                      </button>
                      <button
                        onClick={() => handleWhatsApp(article)}
                        className="law-btn law-btn--whatsapp"
                        title="مشاركة عبر واتساب"
                      >
                        📲
                      </button>
                    </div>
                  </div>

                  {/* نص المادة كاملاً */}
                  <p className="law-article-text">
                    {debouncedQuery ? (
                      <HighlightedText text={article.text} query={debouncedQuery} />
                    ) : (
                      article.text
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* ذيل الورقة */}
        {!isLoading && displayArticles.length > 0 && (
          <div className="law-footer">
            <span>— نهاية {law.name} —</span>
          </div>
        )}
      </div>

      {/* زر العودة للأعلى عائم */}
      <div className="law-fab">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="law-fab-btn"
        >
          ↑ أعلى
        </button>
      </div>

      {/* ── CSS القانون الورقي ── */}
      <style jsx global>{`
        /* ورقة القانون الرئيسية */
        .law-paper {
          background: #fff;
          color: #1a1a1a;
          font-family: 'Amiri', 'Scheherazade New', 'Traditional Arabic', serif;
          border-radius: 12px;
          box-shadow: 0 4px 32px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06);
          border: 1px solid #e5e7eb;
          overflow: hidden;
          margin-bottom: 24px;
        }
        .dark .law-paper {
          background: #1e293b;
          color: #f1f5f9;
          border-color: #334155;
          box-shadow: 0 4px 32px rgba(0,0,0,0.40);
        }

        /* صفحة الغلاف */
        .law-cover {
          text-align: center;
          padding: 48px 32px 36px;
          border-bottom: 3px solid;
          background: linear-gradient(180deg, #f8fafc 0%, #fff 100%);
        }
        .dark .law-cover {
          background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
        }
        .law-cover-icon {
          font-size: 56px;
          margin-bottom: 16px;
          line-height: 1;
        }
        .law-cover-emblem {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #6b7280;
          margin-bottom: 12px;
          text-transform: uppercase;
        }
        .dark .law-cover-emblem { color: #94a3b8; }
        .law-cover-title {
          font-size: 26px;
          font-weight: 900;
          line-height: 1.4;
          margin-bottom: 16px;
          color: #0f172a;
        }
        .dark .law-cover-title { color: #f1f5f9; }
        @media (max-width: 640px) {
          .law-cover-title { font-size: 18px; }
          .law-cover { padding: 32px 20px 24px; }
        }
        .law-cover-meta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
          font-size: 13px;
          font-weight: 700;
          color: #4b5563;
        }
        .dark .law-cover-meta { color: #94a3b8; }
        .law-cover-dot { color: #d1d5db; }
        .law-search-badge {
          margin-top: 16px;
          display: inline-block;
          padding: 6px 16px;
          border-radius: 999px;
          background: #fef3c7;
          color: #92400e;
          font-size: 13px;
          font-weight: 800;
        }
        .dark .law-search-badge { background: #451a03; color: #fcd34d; }

        /* متن القانون */
        .law-body {
          padding: 0 32px 32px;
        }
        @media (max-width: 640px) {
          .law-body { padding: 0 16px 24px; }
        }

        /* مادة واحدة */
        .law-article {
          padding: 20px 0;
          border-bottom: 1px solid #f1f5f9;
          position: relative;
          transition: background 0.15s;
        }
        .dark .law-article {
          border-bottom-color: #1e293b;
        }
        .law-article:last-child {
          border-bottom: none;
        }
        .law-article--match {
          background: #fffbeb;
          margin: 0 -32px;
          padding: 20px 32px;
          border-right: 4px solid #f59e0b;
        }
        .dark .law-article--match {
          background: #1c1505;
          border-right-color: #d97706;
        }
        @media (max-width: 640px) {
          .law-article--match {
            margin: 0 -16px;
            padding: 16px 16px;
          }
        }

        /* تمييز بالـ jump */
        .law-jump-highlight {
          outline: 3px solid #f59e0b !important;
          outline-offset: 4px;
          border-radius: 8px;
          transition: outline 0.3s;
        }

        /* رأس المادة (رقم + أزرار) */
        .law-article-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .law-article-number {
          font-size: 14px;
          font-weight: 900;
          flex-shrink: 0;
        }
        .law-article-match-badge {
          font-size: 10px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 999px;
          background: #fef3c7;
          color: #92400e;
        }
        .dark .law-article-match-badge {
          background: #451a03;
          color: #fcd34d;
        }
        /* أزرار الإجراءات — مخفية افتراضياً وتظهر عند hover على الجهاز */
        .law-article-actions {
          display: flex;
          gap: 6px;
          margin-right: auto; /* يدفعها لليسار في RTL = يمين الشاشة */
          opacity: 0;
          transition: opacity 0.15s;
        }
        .law-article:hover .law-article-actions {
          opacity: 1;
        }
        /* على الموبايل: دائماً ظاهرة */
        @media (max-width: 768px) {
          .law-article-actions { opacity: 1; }
        }
        .law-btn {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          color: #6b7280;
          transition: background 0.15s;
        }
        .dark .law-btn { background: #374151; color: #9ca3af; }
        .law-btn:hover { background: #e5e7eb; }
        .dark .law-btn:hover { background: #4b5563; }
        .law-btn--copied { background: #d1fae5 !important; color: #065f46 !important; }
        .law-btn--whatsapp:hover { background: #dcfce7; color: #15803d; }

        /* نص المادة */
        .law-article-text {
          font-size: 15px;
          line-height: 2;
          color: #1f2937;
          white-space: pre-line;
          text-align: justify;
        }
        .dark .law-article-text { color: #e2e8f0; }
        @media (max-width: 640px) {
          .law-article-text { font-size: 14px; line-height: 1.9; }
        }

        /* التحميل */
        .law-loading {
          text-align: center;
          padding: 64px 32px;
          color: #6b7280;
          font-weight: 800;
        }
        .law-loading-icon {
          font-size: 48px;
          display: block;
          margin-bottom: 16px;
          animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        /* لا نتائج */
        .law-no-results {
          text-align: center;
          padding: 48px 32px;
          color: #6b7280;
          font-weight: 800;
        }
        .law-no-results button {
          margin-top: 12px;
          color: #1a3a5c;
          font-weight: 900;
          text-decoration: underline;
          background: none;
          border: none;
          cursor: pointer;
        }

        /* ذيل الورقة */
        .law-footer {
          text-align: center;
          padding: 24px 32px;
          font-size: 12px;
          font-weight: 700;
          color: #9ca3af;
          border-top: 1px solid #f1f5f9;
          letter-spacing: 0.05em;
        }
        .dark .law-footer { border-top-color: #1e293b; }

        /* زر عائم */
        .law-fab {
          position: sticky;
          bottom: 24px;
          display: flex;
          justify-content: center;
          pointer-events: none;
          margin-top: -8px;
        }
        .law-fab-btn {
          pointer-events: all;
          padding: 10px 24px;
          border-radius: 999px;
          background: #1a3a5c;
          color: #fff;
          font-weight: 900;
          font-size: 13px;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(26,58,92,0.35);
          transition: all 0.2s;
          opacity: 0.85;
        }
        .dark .law-fab-btn { background: #f0c040; color: #1a1a1a; }
        .law-fab-btn:hover { opacity: 1; transform: translateY(-2px); box-shadow: 0 6px 24px rgba(26,58,92,0.45); }
      `}</style>
    </div>
  );
}

// ─── Global Search Results ────────────────────────────────────────────────────

function GlobalSearchResults({
  results,
  lawsMeta,
  query,
  onSelectLaw,
}: {
  results: ScoredArticle[];
  lawsMeta: LawMeta[];
  query: string;
  onSelectLaw: (law: LawMeta) => void;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? results : results.slice(0, 30);

  const handleCopy = (article: ScoredArticle) => {
    const meta = lawsMeta.find((l) => l.id === article.law);
    const text = `${meta?.icon || '⚖️'} ${meta?.name || article.law}\nالمادة ${article.num}\n\n${article.text}`;
    navigator.clipboard.writeText(text);
    setCopiedId(`${article.law}-${article.num}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleWhatsApp = (article: ScoredArticle) => {
    const meta = lawsMeta.find((l) => l.id === article.law);
    const text = `*${meta?.icon || '⚖️'} ${meta?.name || article.law}*\n*المادة ${article.num}*\n\n${article.text}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Group by law
  const grouped = useMemo(() => {
    const map = new Map<string, ScoredArticle[]>();
    for (const r of visible) {
      if (!map.has(r.law)) map.set(r.law, []);
      map.get(r.law)!.push(r);
    }
    return map;
  }, [visible]);

  return (
    <div className="space-y-4">
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔍</span>
          <div>
            <h3 className="font-black text-[#1a3a5c] dark:text-[#f0c040] text-lg">
              نتائج البحث الشامل
            </h3>
            <p className="text-gray-400 text-xs">
              {results.length} نتيجة في {grouped.size} قانون لـ &quot;{query}&quot;
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {results.length > 30 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="px-4 py-2 rounded-xl bg-[#1a3a5c] dark:bg-[#f0c040] text-white dark:text-gray-900 text-xs font-black shadow-sm"
            >
              {showAll ? 'عرض أقل' : `عرض الكل (${results.length})`}
            </button>
          )}
        </div>
      </div>

      {/* Grouped results */}
      {Array.from(grouped.entries()).map(([lawId, articles]) => {
        const meta = lawsMeta.find((l) => l.id === lawId);
        const lawColor = meta?.color || '#2563eb';
        return (
          <div key={lawId} className="space-y-2">
            {/* Law name header */}
            <button
              onClick={() => meta && onSelectLaw(meta)}
              className="flex items-center gap-3 w-full text-right hover:opacity-80 transition-opacity"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-sm flex-shrink-0"
                style={{ backgroundColor: hexToRgba(lawColor, 0.15) }}
              >
                {meta?.icon || '⚖️'}
              </div>
              <span className="font-black text-sm" style={{ color: lawColor }}>
                {meta?.name || lawId}
              </span>
              <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full mr-auto">
                {articles.length} مادة
              </span>
              <span className="text-gray-400 text-xs">فتح القانون →</span>
            </button>

            {articles.map((article) => {
              const lawMeta: LawMeta = meta || {
                id: article.law,
                name: article.law,
                file: '',
                count: 0,
                number: '',
                icon: '⚖️',
                color: '#2563eb',
              };
              const id = `${article.law}-${article.num}`;
              return (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800/40 rounded-2xl border border-amber-200/60 dark:border-amber-700/40 shadow-sm p-4 sm:p-5 relative overflow-hidden"
                >
                  <div
                    className="absolute top-0 right-0 w-1 h-full"
                    style={{ backgroundColor: lawMeta.color }}
                  />
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <span
                      className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-black text-white"
                      style={{ backgroundColor: lawMeta.color }}
                    >
                      المادة {article.number || article.num}
                    </span>
                    <div className="flex gap-2 mr-auto">
                      <button
                        onClick={() => handleCopy(article)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          copiedId === id
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-900 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {copiedId === id ? '✅ تم النسخ' : '📋 نسخ'}
                      </button>
                      <button
                        onClick={() => handleWhatsApp(article)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-bold hover:bg-green-100 transition-all"
                      >
                        📲 واتساب
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-50/60 dark:bg-gray-900/40 p-4 rounded-xl">
                    <p className="text-gray-700 dark:text-gray-200 leading-loose text-sm whitespace-pre-line font-medium">
                      <HighlightedText text={article.text} query={query} />
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GlobalLawSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [lawsMeta, setLawsMeta] = useState<LawMeta[]>([]);
  const [allArticles, setAllArticles] = useState<LawArticleWithLaw[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [results, setResults] = useState<ScoredArticle[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLaw, setSelectedLaw] = useState<LawMeta | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [gridSearch, setGridSearch] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [totalArticles, setTotalArticles] = useState(0);

  // Load metadata
  useEffect(() => {
    fetch('/laws-json/index.json')
      .then((r) => r.json())
      .then((data: LawMeta[]) => setLawsMeta(data))
      .catch(() => {});
  }, []);

  // Load all articles for global search
  useEffect(() => {
    let cancelled = false;
    fetch('/laws-json/all.json')
      .then((r) => r.json())
      .then((data: LawArticleWithLaw[]) => {
        if (!cancelled) {
          setAllArticles(data);
          setTotalArticles(data.length);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoadingData(false); });
    return () => { cancelled = true; };
  }, []);

  // Debounce query
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(query), 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  // Global search
  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q) { setResults([]); setIsSearching(false); return; }
    setIsSearching(true);
    const raf = requestAnimationFrame(() => {
      const scored: ScoredArticle[] = [];
      const ql = q.toLowerCase();
      const nums = ql.match(/\d+/g);
      const words = ql.replace(/\d+/g, ' ').trim().split(/\s+/).filter((w) => w.length > 0);
      for (const a of allArticles) {
        const tl = a.text.toLowerCase();
        const an = String(a.num);
        let score = 0;
        if (tl === ql) score = 100;
        else if (tl.startsWith(ql)) score = 80;
        else if (tl.includes(ql)) score = 50;
        else {
          const nm = nums && nums.some((n) => an === n || an.includes(n));
          const wm = words.length > 0 && words.every((w) => tl.includes(w));
          if (nm && words.length === 0) score = 70;
          else if (nm && wm) score = 65;
          else if (wm) score = (words.length / Math.max(ql.split(/\s+/).length, 1)) * 45;
        }
        if (score > 0) scored.push({ ...a, _score: score });
      }
      scored.sort((a, b) => b._score - a._score);
      setResults(scored.slice(0, 200));
      setIsSearching(false);
    });
    return () => cancelAnimationFrame(raf);
  }, [debouncedQuery, allArticles]);

  // Filtered laws for grid
  const filteredLaws = useMemo(() => {
    let list = lawsMeta;
    if (activeCategory !== 'all') {
      const cat = CATEGORIES.find((c) => c.id === activeCategory);
      if (cat) list = list.filter((l) =>
        cat.ids.includes(l.id) || (l.category && l.category === cat.id)
      );
    }
    if (gridSearch.trim()) {
      const gs = gridSearch.trim().toLowerCase();
      list = list.filter(
        (l) => l.name.toLowerCase().includes(gs) || l.number?.toLowerCase().includes(gs)
      );
    }
    return list;
  }, [lawsMeta, activeCategory, gridSearch]);

  // ─── Individual Law View
  if (selectedLaw) {
    return (
      <div dir="rtl">
        <IndividualLawView law={selectedLaw} onBack={() => { setSelectedLaw(null); window.scrollTo({ top: 0, behavior: 'instant' }); }} />
      </div>
    );
  }

  // ─── Main View
  return (
    <div className="space-y-6" dir="rtl">
      {/* Stats */}
      {!isLoadingData && (
        <StatsBar totalLaws={lawsMeta.length} totalArticles={totalArticles} />
      )}

      {/* Global Search */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`🔍  ابحث في ${lawsMeta.length} قانوناً جزائرياً دفعة واحدة... (كلمة، عبارة، أو رقم المادة)`}
          className="w-full p-4 sm:p-5 pr-5 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-[#1a3a5c] dark:focus:border-[#f0c040] outline-none transition-all shadow-sm text-sm sm:text-base font-bold"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-black transition-all"
          >
            ×
          </button>
        )}
      </div>

      {/* Search Results or Grid */}
      <AnimatePresence mode="wait">
        {isSearching ? (
          <motion.div key="searching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <div className="text-5xl mb-4 animate-spin">⚖️</div>
            <p className="text-gray-500 font-black text-lg">جاري البحث في {totalArticles.toLocaleString('ar-DZ')} مادة قانونية...</p>
          </motion.div>
        ) : results.length > 0 ? (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <GlobalSearchResults
              results={results}
              lawsMeta={lawsMeta}
              query={debouncedQuery}
              onSelectLaw={setSelectedLaw}
            />
          </motion.div>
        ) : debouncedQuery ? (
          <motion.div
            key="no-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-gray-50 dark:bg-gray-800/40 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700"
          >
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-gray-500 font-black">لم يُعثر على نتائج لـ &quot;{debouncedQuery}&quot;</p>
            <p className="text-gray-400 text-sm mt-1">جرّب كلمات مختلفة أو تحقق من الإملاء</p>
          </motion.div>
        ) : (
          <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            {/* Grid search + category filter */}
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={gridSearch}
                  onChange={(e) => setGridSearch(e.target.value)}
                  placeholder="ابحث في أسماء القوانين..."
                  className="w-full p-3.5 pr-10 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-[#1a3a5c] dark:focus:border-[#f0c040] outline-none transition-all text-sm font-bold"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">🗂️</span>
                {gridSearch && (
                  <button
                    onClick={() => setGridSearch('')}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl font-black"
                  >
                    ×
                  </button>
                )}
              </div>
              <CategoryFilter
                activeCategory={activeCategory}
                onChange={setActiveCategory}
                lawsMeta={lawsMeta}
              />
            </div>

            {/* Laws count */}
            <div className="flex items-center justify-between">
              <h3 className="font-black text-gray-600 dark:text-gray-300 text-sm">
                {activeCategory === 'all' && !gridSearch
                  ? `جميع القوانين — ${lawsMeta.length} قانون`
                  : `${filteredLaws.length} قانون`}
              </h3>
              {(activeCategory !== 'all' || gridSearch) && (
                <button
                  onClick={() => { setActiveCategory('all'); setGridSearch(''); }}
                  className="text-xs font-bold text-[#1a3a5c] dark:text-[#f0c040] hover:underline"
                >
                  مسح الفلتر
                </button>
              )}
            </div>

            {/* Grid */}
            {isLoadingData ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : filteredLaws.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/40 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 font-black">لا توجد قوانين في هذا التصنيف</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredLaws.map((law) => (
                  <LawGridCard key={law.id} law={law} onClick={() => setSelectedLaw(law)} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
