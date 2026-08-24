'use client'

import { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import WelcomeScreen from '@/components/WelcomeScreen';
import ShareBubble from '@/components/ShareBubble';
import DeveloperInfo from '@/components/DeveloperInfo';
import VisitorCounter from '@/components/VisitorCounter';
import ModernTabs from '@/components/ModernTabs';
import TabContent from '@/components/TabContent';
import TabDescription from '@/components/TabDescription';

const GlobalLawSearch = dynamic(() => import('@/components/GlobalLawSearch'), { ssr: false });
const AiAssistant = dynamic(() => import('@/components/AiAssistant'), { ssr: false, loading: () => <div className="fixed bottom-6 left-6 w-14 h-14 bg-gray-200 animate-pulse rounded-full shadow-lg z-50" /> });
const ElectronicLitigationTab = dynamic(() => import('@/components/ElectronicLitigationTab'), { ssr: false });
const JurisprudenceTab = dynamic(() => import('@/components/jurisprudence/JurisprudenceTab'), { ssr: false });
const LawyerToolsTab = dynamic(() => import('@/components/lawyer-tools/LawyerToolsTab'), { ssr: false });
const JudicialHierarchy = dynamic(() => import('@/components/JudicialHierarchy'), { ssr: false });
const JudicialInstitutionsInfo = dynamic(() => import('@/components/JudicialInstitutionsInfo'), { ssr: false });
const PlatformUpdates = dynamic(() => import('@/components/PlatformUpdates'), { ssr: false });

export default function HomePage() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [activeTab, setActiveTab] = useState<'judicial-info' | 'judicial' | 'search' | 'jurisprudence' | 'platform-updates' | 'e-litigation' | 'lawyer-tools'>('judicial-info');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const tabsScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); const hasVisited = sessionStorage.getItem('hasVisited'); if (hasVisited) setShowWelcome(false); }, []);
  const handleStart = () => { setShowWelcome(false); sessionStorage.setItem('hasVisited', 'true'); };
  useEffect(() => { if (mounted && !showWelcome) { const timer = setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' }), 100); return () => clearTimeout(timer); } }, [activeTab, mounted, showWelcome]);
  useEffect(() => { if (tabsScrollRef.current) { const activeBtn = tabsScrollRef.current.querySelector('[data-active="true"]') as HTMLElement; if (activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); } }, [activeTab]);

  const tabs = useMemo(() => [
    { id: 'judicial-info', label: 'دليل الهيئات والمندوبيات', icon: '📞', description: 'الدليل الرئيسي لأرقام مندوبيات المحامين ومعلومات الهيئات القضائية، بمساهمة الزملاء وتحديثاتهم.' },
    { id: 'judicial', label: 'التقسيم القضائي للبلديات', icon: '🏛️', description: 'حدد الاختصاص الإقليمي للمحاكم والمجالس لكل بلدية في الوطن.' },
    { id: 'search', label: 'القوانين', icon: '📜', description: 'تصفح وابحث في القوانين الجزائرية المحدثة.' },
    { id: 'jurisprudence', label: 'الاجتهاد القضائي', icon: '⚖️', description: 'قرارات واجتهادات المحكمة العليا لتوجيه العمل القانوني.' },
    { id: 'platform-updates', label: 'آخر تحديثات المنصة', icon: '🆕', description: 'تابع آخر الإضافات والتحسينات التي تمت على منصة الشامل القانوني.' },
    { id: 'e-litigation', label: 'التقاضي الإلكتروني', icon: '💻', description: 'منصات التقاضي الإلكتروني وأدوات تجهيز الملفات.' },
    { id: 'lawyer-tools', label: 'أدوات المحامي', icon: '💼', description: 'أدوات مهنية متخصصة للعمل القانوني.' },
  ], []);
  const modernTabsData = useMemo(() => tabs.map(tab => ({ id: tab.id, label: tab.label, icon: tab.icon })), [tabs]);

  if (!mounted) return null;
  if (showWelcome) return <WelcomeScreen onStart={handleStart} />;
  const activeTabData = tabs.find(t => t.id === activeTab);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-300 flex flex-col overflow-x-hidden" dir="rtl">
      <nav className="sticky top-0 z-50 bg-white/95 dark:bg-[#1e293b]/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4"><div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowWelcome(true)}><div className="w-9 h-9 bg-[#1a3a5c] dark:bg-[#f0c040] rounded-xl flex items-center justify-center shadow-lg"><span className="text-white dark:text-[#1a3a5c] text-lg font-bold">⚖️</span></div><div className="flex flex-col"><h1 className="text-base sm:text-xl font-black text-[#1a3a5c] dark:text-[#f0c040] leading-none">الشامل القانوني</h1><p className="text-[8px] sm:text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-1">منصة قانونية جزائرية مستقلة</p></div></div>
          <div className="flex items-center gap-2"><VisitorCounter /><button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">{theme === 'dark' ? '☀️' : '🌙'}</button></div>
        </div></div>
      </nav>
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-24 flex-grow w-full pt-6">
        <div className="sticky top-[64px] z-40 mb-6"><ModernTabs tabs={modernTabsData} activeTab={activeTab} onTabChange={(tabId) => setActiveTab(tabId as typeof activeTab)} variant="default" /></div>
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 p-3 sm:p-10 min-h-[400px]">
          <TabDescription icon={activeTabData?.icon || '📋'} title={activeTabData?.label || 'محتوى'} description={activeTabData?.description || ''} />
          <TabContent activeTab={activeTab}>
            {activeTab === 'search' && <GlobalLawSearch />}
            {activeTab === 'judicial' && <JudicialHierarchy />}
            {activeTab === 'judicial-info' && <JudicialInstitutionsInfo />}
            {activeTab === 'jurisprudence' && <JurisprudenceTab />}
            {activeTab === 'platform-updates' && <PlatformUpdates />}
            {activeTab === 'e-litigation' && <ElectronicLitigationTab />}
            {activeTab === 'lawyer-tools' && <LawyerToolsTab onBack={() => setActiveTab('judicial-info')} />}
          </TabContent>
        </div>
      </main>
      <AiAssistant /><ShareBubble /><DeveloperInfo />
      <footer className="bg-white dark:bg-[#0f172a] border-t border-gray-200 dark:border-gray-800 py-6 mt-auto"><div className="max-w-7xl mx-auto px-4 text-center"><p className="text-gray-500 dark:text-gray-400 text-[10px] sm:text-sm">جميع الحقوق محفوظة © {new Date().getFullYear()} - الأستاذ سايج محمد</p><p className="text-amber-600 dark:text-amber-500 text-[8px] sm:text-xs mt-1 font-bold">صدقة جارية لروح الوالد سايج عبد النور رحمه الله</p></div></footer>
      <style jsx global>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}input,button{touch-action:manipulation}[dir="rtl"] .border-blue-100.bg-blue-50.p-5>div:first-child>div:first-child>p.mt-2.text-sm.leading-7{font-size:0;line-height:1.9rem}[dir="rtl"] .border-blue-100.bg-blue-50.p-5>div:first-child>div:first-child>p.mt-2.text-sm.leading-7::after{content:"🤝 هذا العمل مبادرة جماعية من الزملاء المحامين، هدفها تسهيل الوصول إلى أرقام مندوبيات المحامين ومعلومات الهيئات القضائية عبر مختلف أنحاء الوطن. 🎯 هدفنا الأساسي هو الحفاظ على أرقام مندوبيات المحامين مُحدّثة ودقيقة، حتى يستفيد منها جميع الزملاء عند الحاجة. 📱 إذا كان لديك رقم غير موجود، أو لاحظت رقمًا خاطئًا أو تغيّر رقمًا سابقًا، يمكنك التواصل معنا للمساهمة في تحديث الدليل وإثرائه. ساهم بمعلومة صحيحة، ليستفيد منها الجميع. 🤝";font-size:14px;line-height:1.9rem;display:block;color:inherit}`}</style>
    </div>
  );
}