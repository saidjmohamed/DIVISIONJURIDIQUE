'use client';

/**
 * 📡 تبويب المستجدات القانونية — تطبيق الشامل
 * يعرض آخر القوانين والمراسيم من قناة الشامل والجريدة الرسمية
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
const TYPE_CONFIG: Record<string, { emoji: string; color: string }> = {
  'قانون':          { emoji: '📜', color: '#1a3a5c' },
  'مرسوم تنفيذي':  { emoji: '📋', color: '#2563eb' },
  'مرسوم رئاسي':   { emoji: '👑', color: '#7c3aed' },
  'قرار':           { emoji: '⚖️', color: '#0891b2' },
  'اجتهاد':        { emoji: '🏛️', color: '#059669' },
  'منشور':          { emoji: '📢', color: '#d97706' },
  'خبر رسمي':      { emoji: '📰', color: '#6b7280' },
};

const SOURCE_LABELS: Record<string, string> = {
  joradp:       '📰 الجريدة الرسمية',
  conseildetat: '🏛️ مجلس الدولة',
  justice:      '⚖️ وزارة العدل',
  telegram:     '📡 قناة الشامل',
};

// ─── بطاقة النص القانوني ────────────────────────────────────────────────────
function LegalCard({ entry, index }: { entry: LegalEntry; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const typeConf = TYPE_CONFIG[entry.type] || { emoji: '📄', color: '#6b7280' };
  const isUpdate = entry.is_update === true || entry.is_update === 'true';

  const keywords: string[] = typeof entry.keywords === 'string'
    ? (() => { try { return JSON.parse(entry.keywords as string); } catch { return []; } })()
    : (entry.keywords || []);

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('ar-DZ', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
    } catch { return d; }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 mb-3"
    >
      {/* شريط علوي ملوّن حسب نوع النص */}
      <div className="h-1 w-full" style={{ background: typeConf.color }} />

      <div className="p-4">
        {/* الرأس */}
        <div className="flex items-start gap-3">
          {/* أيقونة النوع */}
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 mt-0.5"
            style={{ background: typeConf.color + '12' }}
          >
            {typeConf.emoji}
          </div>

          <div className="flex-1 min-w-0">
            {/* الشارات */}
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              <span
                className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                style={{ background: typeConf.color + '15', color: typeConf.color }}
              >
                {entry.type}
              </span>

              {entry.law_number && (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-mono font-bold">
                  {entry.law_number}
                </span>
              )}

              {isUpdate && (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-bold">
                  🔄 تعديل
                </span>
              )}
            </div>

            {/* العنوان */}
            <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-snug">
              {entry.title}
            </h3>

            {/* التاريخ والمصدر */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
              {entry.date && (
                <span className="flex items-center gap-1">
                  📅 {formatDate(entry.date)}
                </span>
              )}
              <span className="flex items-center gap-1">
                {SOURCE_LABELS[entry.source] || entry.source}
              </span>
            </div>
          </div>
        </div>

        {/* الملخص */}
        <div
          className={`mt-3 text-xs text-gray-600 dark:text-gray-300 leading-relaxed ${
            expanded ? '' : 'line-clamp-3'
          }`}
        >
          {entry.summary}
        </div>

        {/* --- محتوى موسّع --- */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {/* التأثير القانوني */}
              {entry.impact && (
                <div className="mt-3 p-3 bg-[#1a3a5c]/5 dark:bg-blue-900/15 rounded-xl border border-[#1a3a5c]/10 dark:border-blue-800">
                  <p className="text-[11px] font-bold text-[#1a3a5c] dark:text-blue-300 mb-1">
                    🎯 التأثير القانوني
                  </p>
                  <p className="text-[11px] text-[#1a3a5c]/80 dark:text-blue-300/80 leading-relaxed">
                    {entry.impact}
                  </p>
                </div>
              )}

              {/* المواد الرئيسية */}
              {entry.key_articles && entry.key_articles.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    المواد الرئيسية
                  </p>
                  {entry.key_articles.map((article, i) => (
                    <div key={i} className="text-[11px] text-gray-600 dark:text-gray-400 flex items-start gap-2">
                      <span className="text-[#1a3a5c] dark:text-blue-400 font-bold mt-0.5 flex-shrink-0">•</span>
                      {article}
                    </div>
                  ))}
                </div>
              )}

              {/* الكلمات المفتاحية */}
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {keywords.slice(0, 5).map((kw, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg border border-gray-100 dark:border-gray-700"
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* أزرار الإجراءات */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50 dark:border-gray-700/40">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] font-semibold text-[#1a3a5c] dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            {expanded ? '▲ إخفاء التفاصيل' : '▼ عرض التفاصيل'}
          </button>

          {entry.source_url && (
            <a
              href={entry.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mr-auto text-[11px] font-bold text-white bg-[#1a3a5c] dark:bg-blue-600 px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1"
            >
              🔗 المصدر الرسمي
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden mb-3 animate-pulse">
      <div className="h-1 w-full bg-gray-200 dark:bg-gray-700" />
      <div className="p-4 flex gap-3">
        <div className="w-11 h-11 bg-gray-200 dark:bg-gray-700 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full mt-2" />
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-5/6" />
        </div>
      </div>
    </div>
  );
}

// ─── الشاشة الفارغة ──────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 gap-4 text-center"
    >
      <div className="w-20 h-20 rounded-full bg-[#1a3a5c]/8 dark:bg-blue-900/20 flex items-center justify-center text-4xl">
        📡
      </div>
      <div>
        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
          في انتظار أول تحديث قانوني
        </p>
        <p className="text-xs text-gray-400 mt-1">
          الوكيل يعمل كل يوم الساعة 07:00 صباحاً
        </p>
      </div>
      <div className="flex flex-col gap-1.5 text-xs text-gray-400 mt-1">
        <span>📰 الجريدة الرسمية الجزائرية</span>
        <span>🏛️ مجلس الدولة الجزائري</span>
        <span>⚖️ وزارة العدل</span>
      </div>
    </motion.div>
  );
}

// ─── المكوّن الرئيسي ─────────────────────────────────────────────────────────
export default function LegalUpdatesTab() {
  const [entries, setEntries]       = useState<LegalEntry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [page, setPage]             = useState(0);
  const [hasMore, setHasMore]       = useState(false);
  const [total, setTotal]           = useState(0);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const fetchEntries = useCallback(async (reset = false) => {
    setLoading(true);
    setError('');
    try {
      const p      = reset ? 0 : page;
      const params = new URLSearchParams({ page: String(p), limit: '15' });
      const res    = await fetch(`/api/legal-updates?${params}`);
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
  }, [page]);

  useEffect(() => { fetchEntries(true); }, []);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('ar-DZ', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
    } catch { return iso; }
  };

  return (
    <div className="space-y-4" dir="rtl">

      {/* بطاقة الحالة العلوية */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-l from-[#1a3a5c]/5 to-transparent dark:from-blue-900/10 border border-[#1a3a5c]/10 dark:border-blue-900/20 rounded-2xl">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-[#1a3a5c] dark:text-blue-300">
              وكيل ذكي يراقب المصادر يومياً
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              الجريدة الرسمية · مجلس الدولة · وزارة العدل · قناة الشامل
            </p>
          </div>
        </div>
        <div className="text-left">
          {total > 0 && (
            <p className="text-xs font-bold text-[#1a3a5c] dark:text-blue-300">
              {total} نص
            </p>
          )}
          {lastUpdate && (
            <p className="text-[10px] text-gray-400">
              {formatDate(lastUpdate)}
            </p>
          )}
        </div>
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
            <p className="text-sm text-red-500 font-bold">{error}</p>
            <button
              onClick={() => fetchEntries(true)}
              className="text-xs font-bold text-white bg-[#1a3a5c] px-4 py-2 rounded-xl hover:opacity-90"
            >
              إعادة المحاولة
            </button>
          </motion.div>

        ) : entries.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <EmptyState />
          </motion.div>

        ) : (
          <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {entries.map((entry, i) => (
              <LegalCard key={entry.id} entry={entry} index={i} />
            ))}

            {/* تحميل المزيد */}
            {hasMore && (
              <button
                onClick={() => { setPage(p => p + 1); fetchEntries(); }}
                disabled={loading}
                className="w-full py-3 mt-1 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-400 hover:border-[#1a3a5c] hover:text-[#1a3a5c] dark:hover:border-blue-500 dark:hover:text-blue-400 transition-all"
              >
                {loading ? '⏳ جاري التحميل...' : `📥 تحميل المزيد (${total - entries.length} متبقٍ)`}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
