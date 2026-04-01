'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  law: string;
  num: number;
  text: string;
}

interface ScoredArticle extends LawArticle {
  _score: number;
}

export default function GlobalLawSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [lawsMeta, setLawsMeta] = useState<LawMeta[]>([]);
  const [activeLaw, setActiveLaw] = useState<string | 'all'>('all');
  const [allArticles, setAllArticles] = useState<LawArticle[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [results, setResults] = useState<ScoredArticle[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Load all articles
  useEffect(() => {
    let cancelled = false;
    async function loadArticles() {
      try {
        const res = await fetch('/laws-json/all.json');
        if (!res.ok) throw new Error('Failed to load');
        const data: LawArticle[] = await res.json();
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

  // Debounce query
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  // Search logic
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

      for (const article of allArticles) {
        if (activeLaw !== 'all' && article.law !== activeLaw) continue;
        
        const textLower = article.text.toLowerCase();
        let score = 0;

        if (textLower === queryLower) score = 100;
        else if (textLower.startsWith(queryLower)) score = 80;
        else if (textLower.includes(queryLower)) score = 50;
        else {
          const words = queryLower.split(/\s+/);
          const matchCount = words.filter(w => textLower.includes(w)).length;
          if (matchCount > 0) score = (matchCount / words.length) * 40;
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
  }, [debouncedQuery, activeLaw, allArticles]);

  const handleCopy = async (article: LawArticle) => {
    const meta = lawsMeta.find(l => l.id === article.law);
    const text = `${meta?.icon || '⚖️'} ${meta?.name || article.law} - المادة ${article.num}\n\n${article.text}`;
    await navigator.clipboard.writeText(text);
    setCopiedId(`${article.law}-${article.num}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleWhatsApp = (article: LawArticle) => {
    const meta = lawsMeta.find(l => l.id === article.law);
    const text = `*[${meta?.name || article.law}] - المادة ${article.num}*\n\n${article.text}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const totalPages = Math.ceil(lawsMeta.length / itemsPerPage);
  const currentLawsMeta = useMemo(() => {
    return lawsMeta.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [lawsMeta, currentPage]);

  return (
    <div className="space-y-8" dir="rtl">
      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
        <strong>💡 مبدأ العمل:</strong> توفر لك هذه الأداة وصولاً سريعاً إلى 116 قانوناً جزائرياً محدثاً. يمكنك البحث في كافة القوانين دفعة واحدة أو تصفح القوانين حسب الفهرس. تتيح لك الأداة تحميل القوانين بصيغة PDF ومشاركتها مباشرة.
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث في 116 قانوناً جزائرياً دفعة واحدة (مثلاً: طلاق، إيجار، سرقة...)"
          className="w-full p-4 pr-12 rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 focus:border-[#1a3a5c] dark:focus:border-[#f0c040] outline-none transition-all shadow-sm text-lg font-bold"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl">🔍</span>
      </div>

      {/* Results or Laws Index */}
      <div className="space-y-6">
        {isSearching ? (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl mb-4">⚖️</div>
            <p className="text-gray-500">جاري البحث في آلاف المواد القانونية...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-lg font-black text-[#1a3a5c] dark:text-[#f0c040] flex items-center gap-2">
              <span>نتائج البحث الشامل</span>
              <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full text-gray-500">{results.length} نتيجة</span>
            </h3>
            {results.map((article, idx) => {
              const meta = lawsMeta.find(l => l.id === article.law);
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
                      <div className="w-10 h-10 bg-gray-50 dark:bg-gray-900 rounded-xl flex items-center justify-center text-xl shadow-inner">
                        {meta?.icon || '⚖️'}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-[#1a3a5c] dark:text-[#f0c040] text-sm sm:text-base">{meta?.name || article.law}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">المادة {article.num}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto justify-end border-t sm:border-none pt-2 sm:pt-0 mt-1 sm:mt-0">
                      <button 
                        onClick={() => handleCopy(article)}
                        className={`flex-1 sm:flex-none px-3 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${copiedId === `${article.law}-${article.num}` ? 'bg-green-500 text-white' : 'bg-gray-50 dark:bg-gray-900 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
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
                      {article.text}
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
          <div className="space-y-6">
            <h3 className="text-lg font-black text-[#1a3a5c] dark:text-[#f0c040] flex items-center gap-2">
              <span>فهرس القوانين الجزائرية (116 قانوناً)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentLawsMeta.map((law) => (
                <motion.div
                  key={law.id}
                  whileHover={{ scale: 1.02 }}
                  className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-[#1a3a5c] dark:hover:border-[#f0c040] transition-all shadow-sm flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center text-2xl group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">
                    {law.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-gray-800 dark:text-white text-sm line-clamp-1">{law.name}</h4>
                    <p className="text-[10px] text-gray-400 font-bold">{law.count} مادة قانونية</p>
                  </div>
                  <button 
                    onClick={() => setActiveLaw(law.id)}
                    className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-[#1a3a5c] hover:text-white transition-all"
                  >
                    🔍
                  </button>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 pt-8">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 disabled:opacity-30 hover:bg-gray-50 transition-all"
                >
                  ➡️
                </button>
                <div className="flex gap-2">
                  {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1;
                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                            currentPage === page 
                            ? 'bg-[#1a3a5c] text-white' 
                            : 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    }
                    if (page === currentPage - 2 || page === currentPage + 2) return <span key={page} className="text-gray-400">...</span>;
                    return null;
                  })}
                </div>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 disabled:opacity-30 hover:bg-gray-50 transition-all"
                >
                  ⬅️
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
