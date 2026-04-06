'use client';

/**
 * 📡 تبويب التحديثات القانونية التلقائية — تطبيق الشامل
 * يعرض آخر القوانين والمراسيم والاجتهادات من الجريدة الرسمية ومجلس الدولة
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── أنواع البيانات ──────────────────────────────────────────────────────────
interface LegalEntry {
  id: string;
  title: string;
  law_number?: string;
  type: string;
  date: string;
  source: string;
  source_url?: string;
  summary: string;
  category: string;
  is_update?: boolean | string;
  related_to?: string;
  created_at?: string;
  saved_at?: string;
  impact?: string;
  keywords?: string | string[];
  key_articles?: string[];
}

// ─── ثوابت ──────────────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  مدني:    '#3b82f6',
  جزائي:  '#ef4444',
  إداري:   '#8b5cf6',
  تجاري:  '#f59e0b',
  عمالي:  '#10b981',
  عائلي:  '#ec4899',
  عقاري:  '#6366f1',
  دستوري: '#0ea5e9',
  أخرى:   '#6b7280',
};

const TYPE_CONFIG: Record<string, { emoji: string; color: string }> = {
  'قانون':              { emoji: '📜', color: '#1a3a5c' },
  'مرسوم تنفيذي':      { emoji: '📋', color: '#2563eb' },
  'مرسوم رئاسي':       { emoji: '👑', color: '#7c3aed' },
  'قرار':               { emoji: '⚖️', color: '#0891b2' },
  'اجتهاد':            { emoji: '🏛️', color: '#059669' },
  'منشور':              { emoji: '📢', color: '#d97706' },
  'خبر رسمي':          { emoji: '📰', color: '#6b7280' },
};

const CATEGORIES = ['مدني', 'جزائي', 'إداري', 'تجاري', 'عمالي', 'عائلي', 'عقاري', 'دستوري'];

const SOURCE_LABELS: Record<string, string> = {
  joradp: 'الجريدة الرسمية',
  conseildetat: 'مجلس الدولة',
  justice: 'وزارة العدل',
};

// ─── بطاقة النص القانوني ────────────────────────────────────────────────────
function LegalCard({ entry }: { entry: LegalEntry }) {
  const [expanded, setExpanded] = useState(false);

  const catColor = CATEGORY_COLORS[entry.category] || '#6b7280';
  const typeConf = TYPE_CONFIG[entry.type] || { emoji: '📄', color: '#6b7280' };

  const keywords: string[] = typeof entry.keywords === 'string'
    ? (() => { try { return JSON.parse(entry.keywords as string); } catch { return []; } })()
    : (entry.keywords || []);

  const isUpdate = entry.is_update === true || entry.is_update === 'true';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-md hover:shadow-lg transition-all duration-200 mb-3"
    >
      {/* شريط التصنيف الجانبي */}
      <div className="flex">
        <div className="w-1 flex-shrink-0 rounded-r-full" style={{ background: catColor }} />

        <div className="flex-1 p-4">
          {/* الرأس */}
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: typeConf.color + '15' }}
            >
              {typeConf.emoji}
            </div>

            <div className="flex-1 min-w-0">
              {/* الشارات */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: typeConf.color + '15', color: typeConf.color }}
                >
                  {entry.type}
                </span>
                {entry.law_number && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-mono">
                    رقم {entry.law_number}
                  </span>
                )}
                {isUpdate && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-bold">
                    🔄 تعديل
                  </span>
                )}
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                  style={{ background: catColor + '15', color: catColor }}
                >
                  {entry.category}
                </span>
              </div>

              {/* العنوان */}
              <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-snug line-clamp-2">
                {entry.title}
              </h3>

              {/* المعلومات الثانوية */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                {entry.date && <span>📅 {entry.date}</span>}
                <span className="truncate max-w-[160px]">📌 {SOURCE_LABELS[entry.source] || entry.source}</span>
              </div>
            </div>
          </div>

          {/* الملخص */}
          <div className={`mt-3 text-xs text-gray-600 dark:text-gray-300 leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
            {entry.summary}
          </div>

          {/* التأثير */}
          {expanded && entry.impact && (
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
              <p className="text-[11px] font-bold text-blue-700 dark:text-blue-400 mb-1">🎯 التأثير القانوني</p>
              <p className="text-xs text-blue-600 dark:text-blue-300">{entry.impact}</p>
            </div>
          )}

          {/* المواد الرئيسية */}
          {expanded && entry.key_articles && entry.key_articles.length > 0 && (
            <div className="mt-3 space-y-1">
              {entry.key_articles.map((article, i) => (
                <div key={i} className="text-[11px] text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
                  <span className="text-[#1a3a5c] dark:text-blue-400 font-bold flex-shrink-0">•</span>
                  {article}
                </div>
              ))}
            </div>
          )}

          {/* الكلمات المفتاحية */}
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {keywords.slice(0, 4).map((kw, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg border border-gray-100 dark:border-gray-700"
                >
                  #{kw}
                </span>
              ))}
            </div>
          )}

          {/* الأزرار */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50 dark:border-gray-700/50">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[11px] font-semibold text-[#1a3a5c] dark:text-blue-400 hover:underline"
            >
              {expanded ? '▲ عرض أقل' : '▼ عرض المزيد'}
            </button>
            {entry.source_url && (
              <a
                href={entry.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mr-auto text-[11px] font-bold text-white bg-[#1a3a5c] dark:bg-blue-600 px-3 py-1 rounded-lg hover:opacity-90 transition-opacity"
              >
                🔗 المصدر الرسمي
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── مكوّن التحميل ──────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 mb-3 animate-pulse">
      <div className="flex gap-3">
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full" />
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-5/6" />
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
      </div>
    </div>
  );
}

// ─── التبويب الرئيسي ─────────────────────────────────────────────────────────
export default function LegalUpdatesTab() {
  const [entries, setEntries] = useState<LegalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const fetchEntries = useCallback(async (reset = false) => {
    setLoading(true);
    setError('');

    try {
      const p = reset ? 0 : page;
      const params = new URLSearchParams({
        page: String(p),
        limit: '15',
        ...(category ? { category } : {}),
      });

      const res = await fetch(`/api/legal-updates?${params}`);
      if (!res.ok) throw new Error(`خطأ ${res.status}`);
      const data = await res.json();

      setEntries(prev => reset ? data.entries : [...prev, ...data.entries]);
      setTotal(data.total);
      setHasMore(data.hasMore);
      setLastUpdate(data.lastUpdate);
      if (reset) setPage(0);

    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل تحميل التحديثات');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, page]);

  useEffect(() => {
    fetchEntries(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return iso; }
  };

  return (
    <div className="space-y-4" dir="rtl">

      {/* بطاقة الحالة */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-gradient-to-l from-[#1a3a5c]/5 to-transparent dark:from-blue-900/10 border border-[#1a3a5c]/10 dark:border-blue-900/20 rounded-2xl">
        <div>
          <p className="text-xs font-bold text-[#1a3a5c] dark:text-blue-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
            وكيل ذكي يراقب المصادر يومياً
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
            الجريدة الرسمية · مجلس الدولة · وزارة العدل
          </p>
        </div>
        <div className="text-left sm:text-right">
          {total > 0 && (
            <p className="text-xs font-bold text-[#1a3a5c] dark:text-blue-300">{total} نص محفوظ</p>
          )}
          {lastUpdate && (
            <p className="text-[10px] text-gray-400">آخر تحديث: {formatDate(lastUpdate)}</p>
          )}
        </div>
      </div>

      {/* فلاتر التصنيف */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setCategory('')}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            category === ''
              ? 'bg-[#1a3a5c] text-white shadow-md'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          الكل
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(category === cat ? '' : cat)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
            style={category === cat ? {
              background: CATEGORY_COLORS[cat],
              color: '#fff',
            } : {
              background: CATEGORY_COLORS[cat] + '15',
              color: CATEGORY_COLORS[cat],
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* المحتوى */}
      <AnimatePresence mode="wait">
        {loading && entries.length === 0 ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </motion.div>

        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-12 gap-3"
          >
            <div className="text-4xl">⚠️</div>
            <p className="text-sm text-red-500 dark:text-red-400 font-bold">{error}</p>
            <button
              onClick={() => fetchEntries(true)}
              className="text-xs font-bold text-white bg-[#1a3a5c] dark:bg-blue-600 px-4 py-2 rounded-xl hover:opacity-90"
            >
              إعادة المحاولة
            </button>
          </motion.div>

        ) : entries.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16 gap-4 text-center"
          >
            <div className="text-6xl">📡</div>
            <div>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                الوكيل التلقائي يعمل كل يوم الساعة 07:00
              </p>
              <p className="text-xs text-gray-400 mt-1">
                ستظهر هنا أحدث القوانين والمراسيم والاجتهادات تلقائياً
              </p>
            </div>
            <div className="flex flex-col gap-1.5 text-xs text-gray-500">
              {['📰 الجريدة الرسمية (JORADP)', '🏛️ مجلس الدولة الجزائري', '⚖️ وزارة العدل'].map(s => (
                <p key={s}>{s}</p>
              ))}
            </div>
          </motion.div>

        ) : (
          <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {entries.map(entry => <LegalCard key={entry.id} entry={entry} />)}

            {/* تحميل المزيد */}
            {hasMore && (
              <button
                onClick={() => { setPage(p => p + 1); fetchEntries(); }}
                disabled={loading}
                className="w-full py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-500 hover:border-[#1a3a5c] hover:text-[#1a3a5c] dark:hover:border-blue-500 dark:hover:text-blue-400 transition-all"
              >
                {loading ? '⏳ جاري التحميل...' : '📥 تحميل المزيد'}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
