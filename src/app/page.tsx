'use client'

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import GlobalLawSearch from '@/components/GlobalLawSearch';
import ShareBubble from '@/components/ShareBubble';
import DeveloperInfo from '@/components/DeveloperInfo';

// Lazy load components with proper loading states
const AiAssistant = dynamic(() => import('@/components/AiAssistant'), { 
  ssr: false,
  loading: () => <div className="fixed bottom-6 left-6 w-14 h-14 bg-gray-200 animate-pulse rounded-full shadow-lg" />
});

const DeadlineCalculator = dynamic(() => import('@/components/deadlines/DeadlineCalculator'), { ssr: false });
const DeadlinesTable = dynamic(() => import('@/components/deadlines/DeadlinesTable'), { ssr: false });
const DualDeadlineView = dynamic(() => import('@/components/deadlines/DualDeadlineView'), { ssr: false });
const JurisprudenceTab = dynamic(() => import('@/components/jurisprudence/JurisprudenceTab'), { ssr: false });
const LawyerToolsTab = dynamic(() => import('@/components/lawyer-tools/LawyerToolsTab'), { ssr: false });
const JudicialHierarchy = dynamic(() => import('@/components/JudicialHierarchy'), { ssr: false });

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'search' | 'deadlines' | 'jurisprudence' | 'lawyer-tools' | 'judicial'>('search');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fix: Scroll to top on tab change
  useEffect(() => {
    if (mounted) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab, mounted]);

  const tabs = useMemo(() => [
    { id: 'search', label: 'البحث', icon: '🔍' },
    { id: 'deadlines', label: 'الآجال', icon: '📅' },
    { id: 'judicial', label: 'الجهات القضائية', icon: '🏛️' },
    { id: 'jurisprudence', label: 'الاجتهاد', icon: '⚖️' },
    { id: 'lawyer-tools', label: 'الأدوات', icon: '💼' },
  ], []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-300 flex flex-col" dir="rtl">
      {/* Navigation Bar - Mobile Optimized */}
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-[#1e293b]/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#1a3a5c] dark:bg-[#f0c040] rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white dark:text-[#1a3a5c] text-lg sm:text-xl font-bold">⚖️</span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg sm:text-xl font-black text-[#1a3a5c] dark:text-[#f0c040] leading-none">الشامل القانوني</h1>
                <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-1">المنصة القانونية الجزائرية</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 sm:p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all shadow-inner"
                aria-label="Toggle Theme"
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Compact for Mobile */}
      <header className="relative overflow-hidden pt-8 pb-12 sm:pt-12 sm:pb-20">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a3a5c]/5 to-transparent dark:from-[#f0c040]/5 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl sm:text-5xl font-black text-[#1a3a5c] dark:text-white mb-4 sm:mb-6 leading-tight">
            دليلك الرقمي في <span className="text-[#c2410c] dark:text-[#f0c040]">القانون الجزائري</span>
          </h2>
          <p className="max-w-2xl mx-auto text-gray-600 dark:text-gray-400 text-sm sm:text-lg mb-8 sm:mb-10 leading-relaxed px-2">
            ابحث في القوانين، احسب الآجال القضائية، استخرج بيانات الأحكام، وصغ مذكراتك القانونية بدقة واحترافية.
          </p>
          
          {/* Sadaqa Jariya Section */}
          <div className="max-w-md mx-auto mb-8 sm:mb-12 animate-in fade-in zoom-in duration-1000">
            <div className="bg-white/50 dark:bg-[#1e293b]/50 backdrop-blur-sm p-4 sm:p-6 rounded-3xl border border-amber-200/50 dark:border-amber-900/30 shadow-xl shadow-amber-900/5">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2 font-medium">هذا التطبيق صدقة جارية لروح والدي الغالي</p>
              <h3 className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-500 mb-1">سايج عبد النور</h3>
              <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">رحمه الله وأسكنه فسيح جناته — نسألكم الدعاء له</p>
              <div className="w-12 h-1 bg-amber-400/30 mx-auto mt-4 rounded-full"></div>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            <div className="px-4 py-2 sm:px-6 sm:py-3 bg-white dark:bg-[#1e293b] rounded-2xl shadow-md border border-gray-100 dark:border-gray-800 flex items-center gap-2 sm:gap-3">
              <span className="text-xl sm:text-2xl">📜</span>
              <div className="text-right">
                <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400">قوانين محدثة</p>
                <p className="text-xs sm:text-sm font-bold text-[#1a3a5c] dark:text-white">116+ قانون</p>
              </div>
            </div>
            <div className="px-4 py-2 sm:px-6 sm:py-3 bg-white dark:bg-[#1e293b] rounded-2xl shadow-md border border-gray-100 dark:border-gray-800 flex items-center gap-2 sm:gap-3">
              <span className="text-xl sm:text-2xl">🏛️</span>
              <div className="text-right">
                <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400">الجهات القضائية</p>
                <p className="text-xs sm:text-sm font-bold text-[#1a3a5c] dark:text-white">تغطية وطنية</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Mobile-First Layout */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 -mt-6 sm:-mt-12 pb-24 flex-grow w-full">
        {/* Tab Switcher - Scrollable on Mobile */}
        <div className="bg-white dark:bg-[#1e293b] p-1.5 sm:p-2 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 mb-6 sm:mb-8 flex overflow-x-auto no-scrollbar gap-1.5 sm:gap-2 sticky top-[72px] z-40">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl font-bold transition-all duration-300 whitespace-nowrap flex-1 min-w-[100px] sm:min-w-0 ${
                activeTab === tab.id
                  ? 'bg-[#1a3a5c] text-white shadow-lg scale-[1.02]'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <span className="text-lg sm:text-xl">{tab.icon}</span>
              <span className="text-sm sm:text-base">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Container */}
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 p-4 sm:p-10 min-h-[500px] transition-all duration-500">
          {activeTab === 'search' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-6 sm:mb-8 text-center">
                <h3 className="text-xl sm:text-2xl font-bold text-[#1a3a5c] dark:text-white mb-2">البحث القانوني</h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">ابحث في القوانين والجرائد الرسمية الجزائرية</p>
              </div>
              <GlobalLawSearch />
            </div>
          )}

          {activeTab === 'deadlines' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 sm:space-y-12">
              <div className="text-center">
                <h3 className="text-xl sm:text-2xl font-bold text-[#1a3a5c] dark:text-white mb-2">حاسبة الآجال القضائية</h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">حساب دقيق للمواعيد القانونية مع مراعاة العطل</p>
              </div>
              <div className="grid lg:grid-cols-2 gap-6 sm:gap-10">
                <DeadlineCalculator />
                <DualDeadlineView />
              </div>
              <div className="pt-8 sm:pt-10 border-t border-gray-100 dark:border-gray-800">
                <h4 className="text-lg sm:text-xl font-bold text-[#1a3a5c] dark:text-white mb-6 text-center">جدول الآجال الشائع</h4>
                <div className="overflow-x-auto">
                  <DeadlinesTable />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'judicial' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-6 sm:mb-8 text-center">
                <h3 className="text-xl sm:text-2xl font-bold text-[#1a3a5c] dark:text-white mb-2">الجهات القضائية والاختصاص</h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">تحديد المحكمة والمجلس المختص إقليمياً لكل بلدية</p>
              </div>
              <JudicialHierarchy />
            </div>
          )}

          {activeTab === 'jurisprudence' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-6 sm:mb-8 text-center">
                <h3 className="text-xl sm:text-2xl font-bold text-[#1a3a5c] dark:text-white mb-2">الاجتهاد القضائي</h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">قرارات المحكمة العليا ومجلس الدولة</p>
              </div>
              <JurisprudenceTab />
            </div>
          )}

          {activeTab === 'lawyer-tools' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-6 sm:mb-8 text-center">
                <h3 className="text-xl sm:text-2xl font-bold text-[#1a3a5c] dark:text-white mb-2">أدوات المحامي</h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">التحقق الشكلي، الاختصاص، وصياغة المذكرات</p>
              </div>
              <LawyerToolsTab onBack={() => setActiveTab('search')} />
            </div>
          )}
        </div>
      </main>

      {/* Floating Components */}
      <AiAssistant />
      <ShareBubble />
      <DeveloperInfo />

      {/* Footer */}
      <footer className="bg-white dark:bg-[#0f172a] border-t border-gray-200 dark:border-gray-800 py-8 sm:py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-xl sm:text-2xl">⚖️</span>
            <span className="text-base sm:text-lg font-bold text-[#1a3a5c] dark:text-white">الشامل القانوني</span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-[10px] sm:text-sm mb-6">
            جميع الحقوق محفوظة © {new Date().getFullYear()} - تم التطوير لخدمة العدالة في الجزائر
          </p>
          <div className="flex justify-center gap-4 sm:gap-6 text-[10px] sm:text-xs font-medium text-gray-400 dark:text-gray-500">
            <a href="#" className="hover:text-[#1a3a5c] dark:hover:text-[#f0c040] transition-colors">سياسة الخصوصية</a>
            <a href="#" className="hover:text-[#1a3a5c] dark:hover:text-[#f0c040] transition-colors">شروط الاستخدام</a>
            <a href="#" className="hover:text-[#1a3a5c] dark:hover:text-[#f0c040] transition-colors">اتصل بنا</a>
          </div>
        </div>
      </footer>

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
