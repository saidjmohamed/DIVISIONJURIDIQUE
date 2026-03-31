'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

interface ChamberInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
  count: number;
}

interface IndexData {
  totalCount: number;
  lastUpdate: string;
  chambers: ChamberInfo[];
}

interface JurisprudenceItem {
  id: string;
  number: string;
  date: string;
  chamber: string;
  chamberId: string;
  subject: string;
  principle: string;
  summary: string;
  fullText: string;
  relatedArticles: string[];
  keywords: string[];
}

// Arabic text normalization for search
function normalizeArabic(text: string): string {
  return text
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[ًٌٍَُِّْ]/g, '')
    .toLowerCase()
    .trim();
}

export default function JurisprudenceTab() {
  const [indexData, setIndexData] = useState<IndexData | null>(null);
  const [allItems, setAllItems] = useState<JurisprudenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChamber, setSelectedChamber] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const ITEMS_PER_PAGE = 20;

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('jurisprudence-favorites');
      if (saved) setFavorites(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

  // Save favorites to localStorage
  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem('jurisprudence-favorites', JSON.stringify([...next]));
      return next;
    });
  }, []);

  // Load data
  useEffect(() => {
    async function loadData() {
      try {
        const indexRes = await fetch('/jurisprudence/index.json');
        const idx: IndexData = await indexRes.json();
        setIndexData(idx);

        const chamberIds = idx.chambers.map(c => c.id);
        const allData: JurisprudenceItem[] = [];

        await Promise.all(
          chamberIds.map(async (cid) => {
            try {
              const res = await fetch(`/jurisprudence/${cid}.json`);
              const items: JurisprudenceItem[] = await res.json();
              allData.push(...items);
            } catch {
              // Skip chambers with missing files
            }
          })
        );

        // Sort by date descending
        allData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAllItems(allData);
      } catch (e) {
        console.error('Failed to load jurisprudence data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Debounced search
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value);
    }, 300);
  }, []);

  // Available years
  const years = useMemo(() => {
    const ySet = new Set(allItems.map(item => new Date(item.date).getFullYear().toString()));
    return Array.from(ySet).sort((a, b) => Number(b) - Number(a));
  }, [allItems]);

  // Filtered items
  const filtered = useMemo(() => {
    let items = allItems;

    if (showFavoritesOnly) {
      items = items.filter(item => favorites.has(item.id));
    }

    if (selectedChamber !== 'all') {
      items = items.filter(item => item.chamberId === selectedChamber);
    }

    if (selectedYear !== 'all') {
      items = items.filter(item => new Date(item.date).getFullYear().toString() === selectedYear);
    }

    if (debouncedQuery.trim()) {
      const q = normalizeArabic(debouncedQuery);
      items = items.filter(item => {
        const searchFields = [
          item.subject,
          item.principle,
          item.summary,
          item.number,
          ...item.keywords,
          ...item.relatedArticles,
        ].join(' ');
        return normalizeArabic(searchFields).includes(q);
      });
    }

    return items;
  }, [allItems, selectedChamber, selectedYear, debouncedQuery, showFavoritesOnly, favorites]);

  // Reset page on filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedChamber, selectedYear, debouncedQuery, showFavoritesOnly]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedItems = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Copy handler
  const handleCopy = useCallback(async (item: JurisprudenceItem) => {
    const text = `اجتهاد المحكمة العليا - قرار رقم ${item.number}\nالتاريخ: ${formatDate(item.date)}\nالغرفة: ${item.chamber}\nالموضوع: ${item.subject}\n\nالمبدأ القانوني:\n${item.principle}\n\nالملخص:\n${item.summary}\n\nالمواد المرتبطة: ${item.relatedArticles.join(' - ')}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(item.id);
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopyFeedback(item.id);
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  }, []);

  // WhatsApp share
  const handleShare = useCallback((item: JurisprudenceItem) => {
    const text = `*اجتهاد المحكمة العليا*\n📋 قرار رقم: ${item.number}\n📅 التاريخ: ${formatDate(item.date)}\n🏛️ الغرفة: ${item.chamber}\n📌 الموضوع: ${item.subject}\n\n⚖️ *المبدأ القانوني:*\n${item.principle}\n\n📖 *الملخص:*\n${item.summary}\n\n📑 المواد: ${item.relatedArticles.join(' - ')}\n\n_من تطبيق الشامل - المنصة القانونية الذكية_`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 animate-pulse">
        <div className="text-5xl">⚖️</div>
        <p className="text-[#1a3a5c] dark:text-[#f0c040] font-bold text-lg">جاري تحميل الاجتهادات...</p>
      </div>
    );
  }

  const chamberMap = new Map(indexData?.chambers.map(c => [c.id, c]) || []);

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center justify-center gap-2 mb-2">
          <span className="text-3xl sm:text-4xl">⚖️</span>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1a3a5c] dark:text-[#f0c040]">
            اجتهادات المحكمة العليا
          </h2>
        </div>
        <div className="flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-[#c9a84c]" />
            {indexData?.totalCount || allItems.length} اجتهاد
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-[#1a3a5c] dark:bg-[#f0c040]" />
            {indexData?.chambers.length || 0} غرف
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" strokeWidth="2" />
            <path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="ابحث في الموضوع، المبدأ، رقم القرار، المواد..."
          className="w-full pr-10 pl-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-[#1a3a5c] dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/50 focus:border-[#c9a84c] transition-all text-sm"
          dir="rtl"
        />
        {searchQuery && (
          <button
            onClick={() => { handleSearchChange(''); searchInputRef.current?.focus(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-3">
        {/* Chamber chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedChamber('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              selectedChamber === 'all' && !showFavoritesOnly
                ? 'bg-[#1a3a5c] text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
              showFavoritesOnly
                ? 'bg-[#c9a84c] text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <span>★</span>
            <span>المفضلة</span>
            {favorites.size > 0 && <span className="opacity-70">({favorites.size})</span>}
          </button>
          {indexData?.chambers.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setSelectedChamber(selectedChamber === ch.id ? 'all' : ch.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                selectedChamber === ch.id
                  ? 'text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              style={selectedChamber === ch.id ? { backgroundColor: ch.color } : {}}
            >
              <span>{ch.icon}</span>
              <span className="hidden sm:inline">{ch.name}</span>
              <span className="sm:hidden">{ch.name.split(' ').slice(-1)[0]}</span>
              <span className="opacity-70">({ch.count})</span>
            </button>
          ))}
        </div>

        {/* Year filter + result count */}
        <div className="flex items-center justify-between gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-[#1a3a5c] dark:text-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#c9a84c]"
            dir="rtl"
          >
            <option value="all">كل السنوات</option>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <span className="text-xs text-gray-500 dark:text-gray-400">
            {filtered.length} نتيجة
          </span>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3 opacity-50">🔍</div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">لم يتم العثور على نتائج</p>
          <button
            onClick={() => { handleSearchChange(''); setSelectedChamber('all'); setSelectedYear('all'); setShowFavoritesOnly(false); }}
            className="mt-3 text-xs text-[#c9a84c] hover:underline"
          >
            إعادة تعيين البحث
          </button>
        </div>
      ) : (
        <>
        <div className="space-y-3">
          {paginatedItems.map((item) => {
            const chamber = chamberMap.get(item.chamberId);
            const isExpanded = expandedId === item.id;
            const isFav = favorites.has(item.id);

            return (
              <div
                key={item.id}
                className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                  isExpanded
                    ? 'border-[#c9a84c]/50 shadow-lg bg-white dark:bg-[#1e293b]'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] hover:shadow-md hover:border-[#c9a84c]/30'
                }`}
              >
                {/* Card header - clickable */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="w-full text-right p-4 focus:outline-none"
                >
                  {/* Top row: number, date, chamber badge, favorite */}
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span
                        role="button"
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}
                        className="text-lg cursor-pointer transition-transform hover:scale-125"
                        style={{ color: isFav ? '#c9a84c' : '#d1d5db' }}
                        title={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                      >
                        {isFav ? '★' : '☆'}
                      </span>
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                        قرار رقم {item.number}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(item.date)}
                      </span>
                    </div>
                    {chamber && (
                      <span
                        className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full text-white font-medium whitespace-nowrap"
                        style={{ backgroundColor: chamber.color }}
                      >
                        {chamber.icon} {chamber.name}
                      </span>
                    )}
                  </div>

                  {/* Subject */}
                  <h3 className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040] mb-1.5 leading-relaxed">
                    {item.subject}
                  </h3>

                  {/* Principle preview */}
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2">
                    {item.principle}
                  </p>

                  {/* Expand indicator */}
                  <div className="flex justify-center mt-2">
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-700 px-4 pb-4 animate-fade-in">
                    {/* Full text with markdown */}
                    <div className="prose prose-sm dark:prose-invert max-w-none mt-3 text-gray-700 dark:text-gray-200 leading-relaxed jurisprudence-markdown" dir="rtl">
                      <ReactMarkdown>{item.fullText}</ReactMarkdown>
                    </div>

                    {/* Keywords */}
                    {item.keywords.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {item.keywords.map((kw, i) => (
                          <span
                            key={i}
                            onClick={() => { handleSearchChange(kw); setExpandedId(null); }}
                            className="cursor-pointer text-[10px] px-2 py-0.5 rounded-full bg-[#1a3a5c]/10 dark:bg-[#f0c040]/10 text-[#1a3a5c] dark:text-[#f0c040] hover:bg-[#1a3a5c]/20 dark:hover:bg-[#f0c040]/20 transition-colors"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Related articles */}
                    {item.relatedArticles.length > 0 && (
                      <div className="mt-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">المواد المرتبطة:</p>
                        <div className="flex flex-wrap gap-1">
                          {item.relatedArticles.map((art, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                              {art}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopy(item); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          copyFeedback === item.id
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {copyFeedback === item.id ? (
                          <>
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            تم النسخ
                          </>
                        ) : (
                          <>
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="2" />
                              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="2" />
                            </svg>
                            نسخ
                          </>
                        )}
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); handleShare(item); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-all"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        مشاركة
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6 flex-wrap" dir="rtl">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#1a3a5c] text-white hover:bg-[#1a3a5c]/80"
            >
              السابق
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
              .reduce<(number | string)[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                typeof p === 'string' ? (
                  <span key={`dots-${i}`} className="px-1 text-gray-400 text-xs">...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      currentPage === p
                        ? 'bg-[#c9a84c] text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#1a3a5c] text-white hover:bg-[#1a3a5c]/80"
            >
              التالي
            </button>
          </div>
        )}
        </>
      )}

      {/* Markdown styles */}
      <style jsx global>{`
        .jurisprudence-markdown h2 {
          font-size: 0.875rem;
          font-weight: 700;
          color: #1a3a5c;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          padding-bottom: 0.25rem;
          border-bottom: 1px solid rgba(201, 168, 76, 0.2);
        }
        .dark .jurisprudence-markdown h2 {
          color: #f0c040;
          border-bottom-color: rgba(240, 192, 64, 0.2);
        }
        .jurisprudence-markdown p {
          margin-bottom: 0.5rem;
          font-size: 0.8125rem;
          line-height: 1.8;
        }
        .jurisprudence-markdown ul {
          padding-right: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .jurisprudence-markdown li {
          font-size: 0.8125rem;
          margin-bottom: 0.25rem;
        }
        .jurisprudence-markdown strong {
          color: #1a3a5c;
        }
        .dark .jurisprudence-markdown strong {
          color: #f0c040;
        }
      `}</style>
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}
