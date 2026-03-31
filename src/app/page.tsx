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
  loading: () => <div className="fixed bottom-6 left-6 w-14 h-14 bg-gray-200 animate-pulse rounded-full shadow-lg z-50" />
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
    { id: 'judicial', label: 'الجهات', icon: '🏛️' },
    { id: 'jurisprudence', label: 'الاجتهاد', icon: '⚖️' },
    { id: 'lawyer-tools', label: 'الأدوات', icon: '💼' },
  ], []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-300 flex flex-col overflow-x-hidden" dir="rtl">
      {/* Navigation Bar - Mobile Optimized */}
      <nav className="sticky top-0 z-50 bg-white/95 dark:bg-[#1e293b]/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-[#1a3a5c] dark:bg-[#f0c040] rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white dark:text-[#1a3a5c] text-lg font-bold">⚖️</span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-base sm:text-xl font-black text-[#1a3a5c] dark:text-[#f0c040] leading-none">الشامل القانوني</h1>
                <p className="text-[8px] sm:text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-1">المنصة القانونية الجزائرية</p>
              </div>
            </div>

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Very Compact for Mobile */}
      <header className="relative pt-6 pb-8 sm:pt-12 sm:pb-20">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a3a5c]/5 to-transparent dark:from-[#f0c040]/5 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-2xl sm:text-5xl font-black text-[#1a3a5c] dark:text-white mb-3 leading-tight">
            دليلك في <span className="text-[#c2410c] dark:text-[#f0c040]">القانون الجزائري</span>
          </h2>
          
          {/* Sadaqa Jariya Section - Compact */}
          <div className="max-w-md mx-auto mb-6">
            <div className="bg-white/60 dark:bg-[#1e293b]/60 backdrop-blur-sm p-3 sm:p-6 rounded-2xl border border-amber-200/50 dark:border-amber-900/30 shadow-sm">
              <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 mb-1">صدقة جارية لروح والدي الغالي</p>
              <h3 className="text-lg sm:text-2xl font-black text-amber-700 dark:text-amber-500">سايج عبد النور</h3>
              <p className="text-[8px] sm:text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">رحمه الله وأسكنه فسيح جناته</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-24 flex-grow w-full">
        {/* Tab Switcher - Fixed/Sticky on Mobile with better spacing */}
        <div className="bg-white dark:bg-[#1e293b] p-1 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 mb-6 flex overflow-x-auto no-scrollbar gap-1 sticky top-[72px] z-40">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-bold transition-all duration-200 whitespace-nowrap flex-1 min-w-[90px] ${
                activeTab === tab.id
                  ? 'bg-[#1a3a5c] text-white shadow-md'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              <span className="text-xs sm:text-sm">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Container - Responsive Padding */}
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 p-3 sm:p-10 min-h-[400px]">
          {activeTab === 'search' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="mb-4 sm:mb-8 text-center">
                <h3 className="text-lg sm:text-2xl font-bold text-[#1a3a5c] dark:text-white">البحث القانوني</h3>
                <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400">ابحث في 116 قانوناً جزائرياً</p>
              </div>
              <GlobalLawSearch />
            </div>
          )}

          {activeTab === 'deadlines' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6 sm:space-y-12">
              <div className="text-center">
                <h3 className="text-lg sm:text-2xl font-bold text-[#1a3a5c] dark:text-white">حاسبة الآجال</h3>
                <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400">حساب المواعيد القانونية بدقة</p>
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                <DeadlineCalculator />
                <DualDeadlineView />
              </div>
              <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                <h4 className="text-base sm:text-xl font-bold text-[#1a3a5c] dark:text-white mb-4 text-center">جدول الآجال الشائع</h4>
                <div className="overflow-x-auto -mx-3 px-3">
                  <DeadlinesTable />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'judicial' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="mb-4 sm:mb-8 text-center">
                <h3 className="text-lg sm:text-2xl font-bold text-[#1a3a5c] dark:text-white">الجهات القضائية</h3>
                <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400">تحديد الاختصاص الإقليمي لكل بلدية</p>
              </div>
              <JudicialHierarchy />
            </div>
          )}

          {activeTab === 'jurisprudence' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="mb-4 sm:mb-8 text-center">
                <h3 className="text-lg sm:text-2xl font-bold text-[#1a3a5c] dark:text-white">الاجتهاد القضائي</h3>
                <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400">قرارات المحكمة العليا ومجلس الدولة</p>
              </div>
              <JurisprudenceTab />
            </div>
          )}

          {activeTab === 'lawyer-tools' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="mb-4 sm:mb-8 text-center">
                <h3 className="text-lg sm:text-2xl font-bold text-[#1a3a5c] dark:text-white">أدوات المحامي</h3>
                <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400">التحقق الشكلي وصياغة المذكرات</p>
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

      {/* Footer - Compact */}
      <footer className="bg-white dark:bg-[#0f172a] border-t border-gray-200 dark:border-gray-800 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-[10px] sm:text-sm">
            جميع الحقوق محفوظة © {new Date().getFullYear()} - الشامل القانوني
          </p>
        </div>
      </footer>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        input, button { touch-action: manipulation; }
      `}</style>
    </div>
  );
}
