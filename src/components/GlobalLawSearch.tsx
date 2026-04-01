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

// ─── Constants ───────────────────────────────────────────────────────────────

const FEATURED_LAW_IDS = ['civil', 'commercial', 'family', 'penal', 'qij', 'qima', 'fiscal'];

const ARTICLES_PER_PAGE = 30;

const LAWS_GRID_PER_PAGE = 24;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen) + '...';
}

// ─── Text Highlighter ─────────────────────────────────────────────────────────

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim()) {
    return <>{text}</>;
  }
  const q = query.trim();
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-green-400/40 dark:bg-green-500/50 text-green-900 dark:text-green-200 rounded px-0.5 font-bold">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ─── Featured Carousel Card ──────────────────────────────────────────────────

function FeaturedCard({ law, onClick, preview }: { law: LawMeta; onClick: () => void; preview?: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={onClick}
      className="relative flex-shrink-0 w-[300px] sm:w-[340px] h-[200px] sm:h-[220px] rounded-3xl cursor-pointer overflow-hidden group shadow-lg"
      style={{
        background: `linear-gradient(135deg, ${law.color}, ${hexToRgba(law.color, 0.6)})`,
      }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-white/10 blur-xl" />
      <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl" />

      {/* Border glow on hover */}
      <div
        className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          boxShadow: `inset 0 0 0 2px ${hexToRgba(law.color, 0.8)}, 0 0 30px ${hexToRgba(law.color, 0.4)}`,
        }}
      />

      <div className="relative z-10 h-full flex flex-col justify-between p-5 sm:p-6 text-white">
        {/* Top row */}
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl sm:text-3xl shadow-inner">
            {law.icon}
          </div>
          <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-[10px] sm:text-xs font-bold">
            {law.number ? `ر.ق ${law.number}` : ''}
          </span>
        </div>

        {/* Bottom row */}
        <div>
          <h3 className="font-black text-base sm:text-lg leading-tight mb-1">{law.name}</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-white/80">{law.count} مادة</span>
            {preview && (
              <span className="text-[10px] text-white/50 line-clamp-1 hidden sm:inline">— {truncateText(preview, 40)}</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Small Law Grid Card ─────────────────────────────────────────────────────

function LawGridCard({ law, onClick }: { law: LawMeta; onClick: () => void }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white dark:bg-gray-800/60 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 transition-all shadow-sm hover:shadow-md cursor-pointer group"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-sm flex-shrink-0"
          style={{ backgroundColor: hexToRgba(law.color, 0.12) }}
        >
          {law.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm line-clamp-2 leading-tight">{law.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-gray-400 font-bold">{law.count} مادة</span>
            {law.number && (
              <>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <span className="text-[10px] text-gray-400 font-bold">ر.ق {law.number}</span>
              </>
            )}
          </div>
        </div>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: law.color }}
        >
          ←
        </div>
      </div>
    </motion.div>
  );
}

// ─── Article Row ─────────────────────────────────────────────────────────────

function ArticleRow({
  article,
  lawMeta,
  onCopy,
  onWhatsApp,
  copiedId,
  highlightQuery,
}: {
  article: LawArticle;
  lawMeta: LawMeta;
  onCopy: () => void;
  onWhatsApp: () => void;
  copiedId: string | null;
  highlightQuery?: string;
}) {
  const id = `${lawMeta.id}-${article.num}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800/50 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
    >
      {/* Accent bar */}
      <div
        className="absolute top-0 right-0 w-1 h-full opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: lawMeta.color }}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Article number badge */}
          <span
            className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-black text-white shadow-sm"
            style={{ backgroundColor: lawMeta.color }}
          >
            المادة {article.number || article.num}
          </span>
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-end border-t sm:border-none pt-2 sm:pt-0 mt-1 sm:mt-0">
          <button
            onClick={onCopy}
            className={`flex-1 sm:flex-none px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              copiedId === id
                ? 'bg-green-500 text-white'
                : 'bg-gray-50 dark:bg-gray-900 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {copiedId === id ? (
              <>
                <span>تم النسخ</span>
                <span>✅</span>
              </>
            ) : (
              <>
                <span>نسخ</span>
                <span>📋</span>
              </>
            )}
          </button>
          <button
            onClick={onWhatsApp}
            className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-bold hover:bg-green-100 transition-all flex items-center justify-center gap-1.5"
          >
            <span>واتساب</span>
            <span>📲</span>
          </button>
        </div>
      </div>
      <div className="bg-gray-50/50 dark:bg-gray-900/30 p-3 sm:p-4 rounded-xl border border-gray-100/50 dark:border-gray-800/50">
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm sm:text-base whitespace-pre-line">
          <HighlightedText text={article.text} query={highlightQuery || ''} />
        </p>
      </div>
    </motion.div>
  );
}

// ─── Pagination Component ────────────────────────────────────────────────────

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | 'ellipsis')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== 'ellipsis') {
      pages.push('ellipsis');
    }
  }

  return (
    <div className="flex justify-center items-center gap-2 pt-6">
      <button
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm font-bold"
      >
        ➡️
      </button>
      {pages.map((page, idx) =>
        page === 'ellipsis' ? (
          <span key={`e-${idx}`} className="text-gray-400 px-1">
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
              currentPage === page
                ? 'bg-[#1a3a5c] dark:bg-[#f0c040] text-white dark:text-gray-900 shadow-md'
                : 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {page}
          </button>
        )
      )}
      <button
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm font-bold"
      >
        ⬅️
      </button>
    </div>
  );
}

// ─── Individual Law View ─────────────────────────────────────────────────────

function IndividualLawView({
  law,
  onBack,
}: {
  law: LawMeta;
  onBack: () => void;
}) {
  const [articles, setArticles] = useState<LawArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lawSearchQuery, setLawSearchQuery] = useState('');
  const [debouncedLawQuery, setDebouncedLawQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load law articles on mount
  useEffect(() => {
    let cancelled = false;
    async function loadLawArticles() {
      setIsLoading(true);
      try {
        const res = await fetch(`/laws-json/${law.file}`);
        if (!res.ok) throw new Error('Failed to load law file');
        const data: LawArticle[] = await res.json();
        if (!cancelled) setArticles(data);
      } catch (err) {
        console.error('Failed to load law articles:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadLawArticles();
    return () => { cancelled = true; };
  }, [law.file]);

  // Debounce law-specific search
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedLawQuery(lawSearchQuery);
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [lawSearchQuery]);

  // Filter articles by search
  const filteredArticles = useMemo(() => {
    const q = debouncedLawQuery.trim().toLowerCase();
    if (!q) return articles;
    
    // استخراج الأرقام من الاستعلام
    const queryNumbers = q.match(/\d+/g);
    
    // الكلمات النصية بدون أرقام
    const textWords = q.replace(/\d+/g, ' ').trim().split(/\s+/).filter(w => w.length > 0);
    
    return articles.filter((a) => {
      const textLower = a.text.toLowerCase();
      const artNum = String(a.num);
      const artNumber = String(a.number || a.num);
      
      // مطابقة كاملة للاستعلام (النص الكامل يطابق)
      if (textLower.includes(q) || artNum.includes(q)) return true;
      
      // مطابقة رقم المادة إذا وُجد رقم في الاستعلام
      if (queryNumbers && queryNumbers.length > 0) {
        const matchesNumber = queryNumbers.some(n => 
          artNum === n || artNum.includes(n) || artNumber.includes(n)
        );
        if (matchesNumber && textWords.length === 0) return true;
        if (matchesNumber && textWords.length > 0) {
          // إذا كان هناك كلمات نصية أيضاً، تحقق أنها موجودة في النص
          const allTextWordsMatch = textWords.every(w => textLower.includes(w));
          if (allTextWordsMatch) return true;
        }
      }
      
      // مطابقة جميع الكلمات النصية في نص المادة
      if (textWords.length > 0) {
        return textWords.every(w => textLower.includes(w));
      }
      
      return false;
    });
  }, [articles, debouncedLawQuery]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedLawQuery]);

  // Scroll to top when page changes
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const totalPages = Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE);
  const paginatedArticles = filteredArticles.slice(
    (currentPage - 1) * ARTICLES_PER_PAGE,
    currentPage * ARTICLES_PER_PAGE
  );

  const handleCopy = useCallback(
    (article: LawArticle) => {
      const text = `${law.icon} ${law.name} - المادة ${article.number || article.num}\n\n${article.text}`;
      navigator.clipboard.writeText(text);
      const id = `${law.id}-${article.num}`;
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    },
    [law]
  );

  const handleWhatsApp = useCallback(
    (article: LawArticle) => {
      const text = `*[${law.name}] - المادة ${article.number || article.num}*\n\n${article.text}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    },
    [law]
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
    >
      {/* Back button + Law Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-base font-black text-gray-600 dark:text-gray-300 hover:text-[#1a3a5c] dark:hover:text-[#f0c040] transition-all mb-5 group shadow-sm"
        >
          <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
          <span>العودة إلى القوانين</span>
        </button>

        <div
          className="relative rounded-3xl p-5 sm:p-6 text-white overflow-hidden shadow-xl"
          style={{
            background: `linear-gradient(135deg, ${law.color}, ${hexToRgba(law.color, 0.7)})`,
          }}
        >
          {/* Decorative */}
          <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-white/5 blur-3xl" />

          <div className="relative z-10 flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl sm:text-4xl shadow-inner">
              {law.icon}
            </div>
            <div>
              <h2 className="font-black text-lg sm:text-2xl leading-tight">{law.name}</h2>
              <div className="flex items-center gap-3 mt-1 text-white/80 text-sm">
                {law.number && <span className="font-bold">ر.ق {law.number}</span>}
                <span>•</span>
                <span className="font-bold">{law.count} مادة</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Law-specific search */}
      <div className="relative mb-6">
        <input
          type="text"
          value={lawSearchQuery}
          onChange={(e) => setLawSearchQuery(e.target.value)}
          placeholder={`ابحث في ${law.name} (مثلاً: طلاق، إيجار، سرقة...)`}
          className="w-full p-4 pr-12 rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 focus:border-[#1a3a5c] dark:focus:border-[#f0c040] outline-none transition-all shadow-sm text-base font-bold"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="text-center py-16">
          <div className="animate-spin text-4xl mb-4">{law.icon}</div>
          <p className="text-gray-500 font-bold">جاري تحميل مواد القانون...</p>
        </div>
      ) : (
        <div ref={scrollRef} className="max-h-[70vh] overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {/* Results count */}
          {debouncedLawQuery && (
            <p className="text-xs font-bold text-gray-400 mb-2">
              تم العثور على {filteredArticles.length} مادة
            </p>
          )}

          {paginatedArticles.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 font-bold">لم يتم العثور على نتائج تطابق بحثك</p>
            </div>
          ) : (
            paginatedArticles.map((article) => (
              <ArticleRow
                key={article.num}
                article={article}
                lawMeta={law}
                onCopy={() => handleCopy(article)}
                onWhatsApp={() => handleWhatsApp(article)}
                copiedId={copiedId}
                highlightQuery={debouncedLawQuery}
              />
            ))
          )}

          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(100, 100, 100, 0.3);
          border-radius: 999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 100, 100, 0.5);
        }
      `}</style>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function GlobalLawSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [lawsMeta, setLawsMeta] = useState<LawMeta[]>([]);
  const [allArticles, setAllArticles] = useState<LawArticleWithLaw[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [results, setResults] = useState<ScoredArticle[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedLaw, setSelectedLaw] = useState<LawMeta | null>(null);
  const [allLawsPage, setAllLawsPage] = useState(1);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Load laws metadata
  useEffect(() => {
    async function loadMeta() {
      try {
        const res = await fetch('/laws-json/index.json');
        if (res.ok) {
          const data = await res.json();
          setLawsMeta(data);
        }
      } catch (err) {
        console.error('Failed to load laws index', err);
      }
    }
    loadMeta();
  }, []);

  // Load all articles for global search
  useEffect(() => {
    let cancelled = false;
    async function loadArticles() {
      try {
        const res = await fetch('/laws-json/all.json');
        if (!res.ok) throw new Error('Failed to load');
        const data: LawArticleWithLaw[] = await res.json();
        if (!cancelled) setAllArticles(data);
      } catch (err) {
        console.error('GlobalLawSearch: failed to load all.json', err);
      } finally {
        if (!cancelled) setIsLoadingData(false);
      }
    }
    loadArticles();
    return () => { cancelled = true; };
  }, []);

  // Load preview snippets for featured laws
  useEffect(() => {
    if (lawsMeta.length === 0) return;
    FEATURED_LAW_IDS.forEach(async (id) => {
      const law = lawsMeta.find((l) => l.id === id);
      if (!law) return;
      try {
        const res = await fetch(`/laws-json/${law.file}`);
        if (res.ok) {
          const data: LawArticle[] = await res.json();
          if (data.length > 0) {
            setPreviews((prev) => ({ ...prev, [id]: truncateText(data[0].text, 50) }));
          }
        }
      } catch {
        // silently fail
      }
    });
  }, [lawsMeta]);

  // Debounce query
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  // Global search logic
  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const raf = requestAnimationFrame(() => {
      const scored: ScoredArticle[] = [];
      const queryLower = q.toLowerCase();
      const queryNumbers = queryLower.match(/\d+/g);
      const textWords = queryLower.replace(/\d+/g, ' ').trim().split(/\s+/).filter(w => w.length > 0);

      for (const article of allArticles) {
        const textLower = article.text.toLowerCase();
        const artNum = String(article.num);
        let score = 0;

        // مطابقة كاملة
        if (textLower === queryLower) score = 100;
        else if (textLower.startsWith(queryLower)) score = 80;
        else if (textLower.includes(queryLower)) score = 50;
        else {
          // مطابقة رقم المادة
          const numMatch = queryNumbers && queryNumbers.some(n =>
            artNum === n || artNum.includes(n)
          );

          // مطابقة الكلمات النصية (كلها يجب أن تتطابق)
          const allWordsMatch = textWords.length > 0
            ? textWords.every(w => textLower.includes(w))
            : false;

          if (numMatch && textWords.length === 0) score = 70;
          else if (numMatch && allWordsMatch) score = 65;
          else if (allWordsMatch) {
            const matchCount = textWords.length;
            score = (matchCount / Math.max(queryLower.split(/\s+/).length, 1)) * 45;
          }
        }

        if (score > 0) {
          scored.push({ ...article, _score: score });
        }
      }

      scored.sort((a, b) => b._score - a._score);
      setResults(scored.slice(0, 100));
      setIsSearching(false);
    });

    return () => cancelAnimationFrame(raf);
  }, [debouncedQuery, allArticles]);

  const handleCopy = useCallback(
    (article: LawArticleWithLaw) => {
      const meta = lawsMeta.find((l) => l.id === article.law);
      const text = `${meta?.icon || '⚖️'} ${meta?.name || article.law} - المادة ${article.num}\n\n${article.text}`;
      navigator.clipboard.writeText(text);
      setCopiedId(`${article.law}-${article.num}`);
      setTimeout(() => setCopiedId(null), 2000);
    },
    [lawsMeta]
  );

  const handleWhatsApp = useCallback(
    (article: LawArticleWithLaw) => {
      const meta = lawsMeta.find((l) => l.id === article.law);
      const text = `*[${meta?.name || article.law}] - المادة ${article.num}*\n\n${article.text}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    },
    [lawsMeta]
  );

  // Featured laws
  const featuredLaws = useMemo(
    () => FEATURED_LAW_IDS.map((id) => lawsMeta.find((l) => l.id === id)).filter(Boolean) as LawMeta[],
    [lawsMeta]
  );

  // Non-featured laws for grid
  const nonFeaturedLaws = useMemo(
    () => lawsMeta.filter((l) => !FEATURED_LAW_IDS.includes(l.id)),
    [lawsMeta]
  );

  // Grid pagination
  const allLawsTotalPages = Math.ceil(nonFeaturedLaws.length / LAWS_GRID_PER_PAGE);
  const paginatedGridLaws = useMemo(
    () => nonFeaturedLaws.slice((allLawsPage - 1) * LAWS_GRID_PER_PAGE, allLawsPage * LAWS_GRID_PER_PAGE),
    [nonFeaturedLaws, allLawsPage]
  );

  // Carousel scroll
  const scrollCarousel = useCallback((direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const scrollAmount = 360;
    carouselRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  }, []);

  // When a law is selected, switch to law view
  const handleSelectLaw = useCallback((law: LawMeta) => {
    setSelectedLaw(law);
  }, []);

  // Back from law view
  const handleBackToLaws = useCallback(() => {
    setSelectedLaw(null);
  }, []);

  // ─── Individual Law View ───────────────────────────────────────────────────
  if (selectedLaw) {
    return (
      <div className="space-y-6" dir="rtl">
        <IndividualLawView law={selectedLaw} onBack={handleBackToLaws} />
      </div>
    );
  }

  // ─── Main View: Cards + Search ─────────────────────────────────────────────
  return (
    <div className="space-y-8" dir="rtl">
      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
        <strong>💡 مبدأ العمل:</strong> توفر لك هذه الأداة وصولاً سريعاً إلى {lawsMeta.length} قانوناً جزائرياً محدثاً. يمكنك البحث في كافة القوانين دفعة واحدة أو تصفح أي قانون بالضغط على بطاقته.
      </div>

      {/* Global Search Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`ابحث في ${lawsMeta.length} قانوناً جزائرياً دفعة واحدة (مثلاً: طلاق، إيجار، سرقة...)`}
          className="w-full p-4 pr-12 rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 focus:border-[#1a3a5c] dark:focus:border-[#f0c040] outline-none transition-all shadow-sm text-lg font-bold"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl">🔍</span>
      </div>

      {/* Results or Laws Index */}
      <div className="space-y-6">
        {isSearching ? (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl mb-4">⚖️</div>
            <p className="text-gray-500 font-bold">جاري البحث في آلاف المواد القانونية...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-lg font-black text-[#1a3a5c] dark:text-[#f0c040] flex items-center gap-2">
              <span>نتائج البحث الشامل</span>
              <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full text-gray-500">{results.length} نتيجة</span>
            </h3>
            {results.map((article, idx) => {
              const meta = lawsMeta.find((l) => l.id === article.law);
              const lawMetaForArticle: LawMeta = meta || {
                id: article.law,
                name: article.law,
                file: '',
                count: 0,
                number: '',
                icon: '⚖️',
                color: '#2563eb',
              };
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={`${article.law}-${article.num}-${idx}`}
                  className="bg-white dark:bg-gray-800/50 p-4 sm:p-6 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-1 h-full bg-[#1a3a5c] dark:bg-[#f0c040] opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div
                        className="w-10 h-10 bg-gray-50 dark:bg-gray-900 rounded-xl flex items-center justify-center text-xl shadow-inner cursor-pointer hover:scale-110 transition-transform"
                        style={{ backgroundColor: meta ? hexToRgba(meta.color, 0.15) : undefined }}
                        onClick={() => meta && handleSelectLaw(meta)}
                        title="فتح القانون"
                      >
                        {meta?.icon || '⚖️'}
                      </div>
                      <div className="flex flex-col">
                        <span
                          className="font-black text-[#1a3a5c] dark:text-[#f0c040] text-sm sm:text-base cursor-pointer hover:underline"
                          onClick={() => meta && handleSelectLaw(meta)}
                          title={`فتح ${meta?.name || article.law}`}
                        >{meta?.name || article.law}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">المادة {article.num}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto justify-end border-t sm:border-none pt-2 sm:pt-0 mt-1 sm:mt-0">
                      <button
                        onClick={() => handleCopy(article)}
                        className={`flex-1 sm:flex-none px-3 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                          copiedId === `${article.law}-${article.num}`
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-50 dark:bg-gray-900 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <span>{copiedId === `${article.law}-${article.num}` ? 'تم النسخ' : 'نسخ'}</span>
                        <span>{copiedId === `${article.law}-${article.num}` ? '✅' : '📋'}</span>
                      </button>
                      <button
                        onClick={() => handleWhatsApp(article)}
                        className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm font-bold hover:bg-green-100 transition-all flex items-center justify-center gap-2"
                      >
                        <span>واتساب</span>
                        <span>📲</span>
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-50/50 dark:bg-gray-900/30 p-4 rounded-xl border border-gray-100/50 dark:border-gray-800/50">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm sm:text-base whitespace-pre-line">
                      <HighlightedText text={article.text} query={debouncedQuery} />
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : debouncedQuery ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 font-bold">لم يتم العثور على نتائج تطابق بحثك</p>
          </div>
        ) : (
          /* ─── Default: Show Featured + All Laws Grid ─── */
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-10"
            >
              {/* Featured Laws Carousel */}
              {featuredLaws.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-[#1a3a5c] dark:text-[#f0c040] flex items-center gap-2">
                      <span className="text-xl">⭐</span>
                      <span>القوانين الرئيسية</span>
                    </h3>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => scrollCarousel('left')}
                        className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm"
                      >
                        <span className="text-sm">→</span>
                      </button>
                      <button
                        onClick={() => scrollCarousel('right')}
                        className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm"
                      >
                        <span className="text-sm">←</span>
                      </button>
                    </div>
                  </div>

                  <div
                    ref={carouselRef}
                    className="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth"
                    style={{ scrollSnapType: 'x mandatory' }}
                  >
                    {featuredLaws.map((law) => (
                      <div key={law.id} style={{ scrollSnapAlign: 'start' }}>
                        <FeaturedCard
                          law={law}
                          onClick={() => handleSelectLaw(law)}
                          preview={previews[law.id]}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* All Laws Grid */}
              {nonFeaturedLaws.length > 0 && (
                <section>
                  <h3 className="text-lg font-black text-[#1a3a5c] dark:text-[#f0c040] flex items-center gap-2 mb-4">
                    <span className="text-xl">📚</span>
                    <span>جميع القوانين</span>
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full text-gray-500">{nonFeaturedLaws.length} قانون</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {paginatedGridLaws.map((law) => (
                      <LawGridCard key={law.id} law={law} onClick={() => handleSelectLaw(law)} />
                    ))}
                  </div>

                  <Pagination
                    currentPage={allLawsPage}
                    totalPages={allLawsTotalPages}
                    onPageChange={setAllLawsPage}
                  />
                </section>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
