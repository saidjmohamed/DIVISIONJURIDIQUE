'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Eye, TrendingUp, BarChart3, ExternalLink } from 'lucide-react';

interface VisitorStats {
  visitors: number | string;
  pageviews?: number;
  period: string;
  source?: string;
  message?: string;
  dashboardUrl?: string;
  _cached?: boolean;
}

export default function VisitorCounter() {
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/visitors?period=24h');
      const data: VisitorStats = await res.json();
      setStats(data);
    } catch {
      setStats({ visitors: 0, period: '24h', source: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    // تحديث كل 30 ثانية للبيانات الحظية
    const interval = setInterval(fetchStats, 30_000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const formatNumber = (n: number | string): string => {
    if (typeof n === 'string') return n;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <div className="relative">
      {/* الزر الرئيسي */}
      <motion.button
        onClick={() => setShowDetails(!showDetails)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all text-xs"
      >
        {/* نقطة خضراء نابضة */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>

        {loading ? (
          <span className="text-gray-400">جارٍ التحميل...</span>
        ) : stats && typeof stats.visitors === 'number' ? (
          <>
            <Users className="w-3.5 h-3.5 text-[#1a3a5c] dark:text-[#f0c040]" />
            <span className="font-bold text-[#1a3a5c] dark:text-[#f0c040]">
              {formatNumber(stats.visitors)}
            </span>
            <span className="text-gray-500 dark:text-gray-400">زائر</span>
          </>
        ) : (
          <>
            <BarChart3 className="w-3.5 h-3.5 text-[#1a3a5c] dark:text-[#f0c040]" />
            <span className="font-bold text-[#1a3a5c] dark:text-[#f0c040]">إحصائيات</span>
          </>
        )}
      </motion.button>

      {/* النافذة المنبثقة */}
      <AnimatePresence>
        {showDetails && (
          <>
            {/* خلفية معتمة */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setShowDetails(false)}
            />

            {/* محتوى النافذة */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="absolute left-0 top-full mt-2 z-50 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* رأس النافذة */}
              <div className="bg-gradient-to-l from-[#1a3a5c] to-[#2d5986] p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-white" />
                  <h3 className="text-white font-bold text-sm">إحصائيات الزوار</h3>
                </div>
                <p className="text-blue-200 text-xs mt-1">بيانات الزيارات الحية للمنصة</p>
              </div>

              <div className="p-4">
                {stats?.source === 'no-token' || stats?.source === 'error' ? (
                  /* حالة: لم يتم الإعداد */
                  <div className="text-center py-4">
                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <TrendingUp className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                      Vercel Web Analytics مفعّل ✅
                    </p>
                    <p className="text-xs text-gray-400 mb-4">
                      لعرض الأرقام هنا، اضبط متغيرات البيئة في Vercel
                    </p>
                    <a
                      href="https://vercel.com/saidjs-projects-a98f4303/hiyaat-dz/analytics"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a3a5c] hover:bg-[#2d5986] text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      فتح لوحة التحليلات
                    </a>
                  </div>
                ) : stats && typeof stats.visitors === 'number' ? (
                  /* حالة: أرقام متاحة */
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-center">
                        <Users className="w-5 h-5 text-[#6366f1] mx-auto mb-1" />
                        <p className="text-lg font-black text-[#1a3a5c] dark:text-white">
                          {formatNumber(stats.visitors)}
                        </p>
                        <p className="text-[10px] text-gray-400">زائر</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-center">
                        <Eye className="w-5 h-5 text-green-500 mx-auto mb-1" />
                        <p className="text-lg font-black text-[#1a3a5c] dark:text-white">
                          {formatNumber(stats.pageviews || 0)}
                        </p>
                        <p className="text-[10px] text-gray-400">مشاهدة صفحة</p>
                      </div>
                    </div>

                    {/* رابط لوحة التحكم */}
                    <a
                      href="https://vercel.com/saidjs-projects-a98f4303/hiyaat-dz/analytics"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-xs font-bold text-[#1a3a5c] dark:text-white transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      عرض التحليلات الكاملة في Vercel
                    </a>
                  </div>
                ) : (
                  /* حالة: التحميل */
                  <div className="text-center py-4">
                    <div className="w-8 h-8 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs text-gray-400">جارٍ تحميل الإحصائيات...</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
