'use client'

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import WelcomeScreen from '@/components/WelcomeScreen';
import ShareBubble from '@/components/ShareBubble';
import DeveloperInfo from '@/components/DeveloperInfo';
import { motion, AnimatePresence } from 'framer-motion';

// Lazy load components with proper loading states
const GlobalLawSearch = dynamic(() => import('@/components/GlobalLawSearch'), { ssr: false });
const AiAssistant = dynamic(() => import('@/components/AiAssistant'), { 
  ssr: false,
  loading: () => <div className="fixed bottom-6 left-6 w-14 h-14 bg-gray-200 animate-pulse rounded-full shadow-lg z-50" />
});
const ElectronicLitigationTab = dynamic(() => import('@/components/ElectronicLitigationTab'), { ssr: false });
const JurisprudenceTab = dynamic(() => import('@/components/jurisprudence/JurisprudenceTab'), { ssr: false });
const LawyerToolsTab = dynamic(() => import('@/components/lawyer-tools/LawyerToolsTab'), { ssr: false });
const JudicialHierarchy = dynamic(() => import('@/components/JudicialHierarchy'), { ssr: false });
const LegalUpdatesTab = dynamic(() => import('@/components/LegalUpdatesTab'), { ssr: false });

export default function HomePage() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [activeTab, setActiveTab] = useState<'search' | 'jurisprudence' | 'lawyer-tools' | 'judicial' | 'e-litigation' | 'legal-updates'>('search');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const hasVisited = sessionStorage.getItem('hasVisited');
    if (hasVisited) {
      setShowWelcome(false);
    }
  }, []);

  const handleStart = () => {
    setShowWelcome(false);
    sessionStorage.setItem('hasVisited', 'true');
  };

  useEffect(() => {
    if (mounted && !showWelcome) {
      const timer = setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab, mounted, showWelcome]);

  const tabs = useMemo(() => [
    { id: 'search', label: 'القوانين', icon: '📜', description: 'تصفح وابحث في 116 قانوناً جزائرياً محدثاً مع إمكانية البحث الشامل في كافة المواد.' },
    { id: 'judicial', label: 'الجهات', icon: '🏛️', description: 'حدد الاختصاص الإقليمي (المحاكم والمجالس) لكل بلديات الوطن بدقة متناهية.' },
    { id: 'e-litigation', label: 'التقاضي', icon: '💻', description: 'منصات التقاضي الإلكتروني التابعة لوزارة العدل الجزائرية والمواقع الرسمية.' },
    { id: 'jurisprudence', label: 'الاجتهاد', icon: '⚖️', description: 'قرارات واجتهادات المحكمة العليا لتوجيه العمل القانوني وتوحيد القضاء.' },
    { id: 'lawyer-tools', label: 'الأدوات', icon: '💼', description: 'أدوات مهنية متخصصة للتحقق من العرائض، صياغة المذكرات، وتحليل الأحكام.' },
    { id: 'legal-updates', label: 'مستجدات', icon: '📰', description: 'مراقبة يومية تلقائية للمستجدات القانونية من الجريدة الرسمية ومجلس الدولة ووزارة العدل.' },
  ], []);

  if (!mounted) return null;

  if (showWelcome) {
    return <WelcomeScreen onStart={handleStart} />;
  }

  const activeTabData = tabs.find(t => t.id === activeTab);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-300 flex flex-col overflow-x-hidden" dir="rtl">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/95 dark:bg-[#1e293b]/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowWelcome(true)}>
              <div className="w-9 h-9 bg-[#1a3a5c] dark:bg-[#f0c040] rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white dark:text-[#1a3a5c] text-lg font-bold">⚖️</span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-base sm:text-xl font-black text-[#1a3a5c] dark:text-[#f0c040] leading-none">الشامل القانوني</h1>
                <p className="text-[8px] sm:text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-1">المنصة القانونية الجزائرية</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-24 flex-grow w-full pt-6">
        {/* Tab Switcher */}
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

        {/* Tab Content Container */}
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 p-3 sm:p-10 min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Tool Description Header */}
              <div className="mb-8 p-6 bg-gradient-to-r from-[#1a3a5c] to-[#2a4a6c] dark:from-[#1e293b] dark:to-[#0f172a] rounded-3xl text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{activeTabData?.icon}</span>
                    <h2 className="text-xl sm:text-2xl font-black">{activeTabData?.label}</h2>
                  </div>
                  <p className="text-blue-100 dark:text-gray-300 font-medium leading-relaxed max-w-2xl text-xs sm:text-sm">
                    {activeTabData?.description}
                  </p>
                </div>
              </div>

              {activeTab === 'search' && <GlobalLawSearch />}

              {activeTab === 'judicial' && <JudicialHierarchy />}
              {activeTab === 'e-litigation' && <ElectronicLitigationTab />}
              {activeTab === 'jurisprudence' && <JurisprudenceTab />}
              {activeTab === 'lawyer-tools' && <LawyerToolsTab onBack={() => setActiveTab('search')} />}
              {activeTab === 'legal-updates' && <LegalUpdatesTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Floating Components */}
      <AiAssistant />
      <ShareBubble />
      <DeveloperInfo />

      {/* Footer */}
      <footer className="bg-white dark:bg-[#0f172a] border-t border-gray-200 dark:border-gray-800 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-[10px] sm:text-sm">
            جميع الحقوق محفوظة © {new Date().getFullYear()} - الأستاذ سايج محمد
          </p>
          <p className="text-amber-600 dark:text-amber-500 text-[8px] sm:text-xs mt-1 font-bold">
            صدقة جارية لروح الوالد سايج عبد النور رحمه الله
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
