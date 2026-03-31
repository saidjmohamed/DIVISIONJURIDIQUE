'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface LawMeta {
  id: string;
  name: string;
  fullName?: string;
  file: string;
  count: number;
  number: string;
  icon: string;
  color: string;
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
      setResults(scored.slice(0, 50));
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

  return (
    <div className="space-y-6" dir="rtl">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث في 116 قانوناً جزائرياً (مثلاً: طلاق، إيجار، سرقة...)"
          className="w-full p-4 pr-12 rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 focus:border-[#1a3a5c] dark:focus:border-[#f0c040] outline-none transition-all shadow-sm text-lg"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl">🔍</span>
      </div>

      {/* Laws Filter */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 overflow-x-auto pb-2 no-scrollbar">
        <button
          onClick={() => setActiveLaw('all')}
          className={`px-3 py-2 sm:px-4 sm:py-2 rounded-xl font-bold transition-all whitespace-nowrap text-xs sm:text-sm ${
            activeLaw === 'all' 
            ? 'bg-[#1a3a5c] text-white shadow-md' 
            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
          }`}
        >
          الكل ({lawsMeta.length})
        </button>
        {lawsMeta.slice(0, 15).map((law) => (
          <button
            key={law.id}
            onClick={() => setActiveLaw(law.id)}
            className={`px-3 py-2 sm:px-4 sm:py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm ${
              activeLaw === law.id 
              ? 'bg-[#1a3a5c] text-white shadow-md' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
            }`}
          >
            <span>{law.icon}</span>
            <span>{law.name}</span>
          </button>
        ))}
        {lawsMeta.length > 15 && (
          <select 
            onChange={(e) => setActiveLaw(e.target.value)}
            className="px-3 py-2 sm:px-4 sm:py-2 rounded-xl font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 outline-none border-none text-xs sm:text-sm"
            value={activeLaw !== 'all' && !lawsMeta.slice(0, 15).find(l => l.id === activeLaw) ? activeLaw : ''}
          >
            <option value="" disabled>بقية القوانين...</option>
            {lawsMeta.slice(15).map(law => (
              <option key={law.id} value={law.id}>{law.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Results */}
      <div className="space-y-4">
        {isSearching ? (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl mb-4">⚖️</div>
            <p className="text-gray-500">جاري البحث في آلاف المواد القانونية...</p>
          </div>
        ) : results.length > 0 ? (
          results.map((article, idx) => {
            const meta = lawsMeta.find(l => l.id === article.law);
            return (
              <div key={`${article.law}-${article.num}-${idx}`} className="bg-white dark:bg-gray-800/50 p-4 sm:p-6 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
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
              </div>
            );
          })
        ) : debouncedQuery ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 font-bold">لم يتم العثور على نتائج تطابق بحثك</p>
          </div>
        ) : (
          <div className="text-center py-12 opacity-50">
            <div className="text-6xl mb-4">📖</div>
            <p className="text-lg font-bold">ابدأ البحث في القوانين الجزائرية</p>
          </div>
        )}
      </div>
    </div>
  );
}
