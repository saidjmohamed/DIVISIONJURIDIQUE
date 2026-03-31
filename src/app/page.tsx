'use client'

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import GlobalLawSearch from '@/components/GlobalLawSearch';

// Lazy load components
const AiAssistant = dynamic(() => import('@/components/AiAssistant'), { ssr: false });
const DeadlineCalculator = dynamic(() => import('@/components/deadlines/DeadlineCalculator'), { ssr: false });
const DeadlinesTable = dynamic(() => import('@/components/deadlines/DeadlinesTable'), { ssr: false });
const DualDeadlineView = dynamic(() => import('@/components/deadlines/DualDeadlineView'), { ssr: false });
const JurisprudenceTab = dynamic(() => import('@/components/jurisprudence/JurisprudenceTab'), { ssr: false });
const LawyerToolsTab = dynamic(() => import('@/components/lawyer-tools/LawyerToolsTab'), { ssr: false });

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'search' | 'deadlines' | 'jurisprudence' | 'lawyer-tools'>('search');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const tabs = [
    { id: 'search', label: 'البحث القانوني', icon: '🔍' },
    { id: 'deadlines', label: 'حساب الآجال', icon: '📅' },
    { id: 'jurisprudence', label: 'الاجتهاد القضائي', icon: '⚖️' },
    { id: 'lawyer-tools', label: 'أدوات المحامي', icon: '💼' },
  ];

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-300" dir="rtl">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-[#1e293b]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1a3a5c] dark:bg-[#f0c040] rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white dark:text-[#1a3a5c] text-xl font-bold">⚖️</span>
              </div>
              <div>
                <h1 className="text-xl font-black text-[#1a3a5c] dark:text-[#f0c040] tracking-tight">الشامل القانوني</h1>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">المنصة القانونية الجزائرية المتكاملة</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all shadow-inner"
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative overflow-hidden pt-12 pb-20">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a3a5c]/5 to-transparent dark:from-[#f0c040]/5 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl sm:text-5xl font-black text-[#1a3a5c] dark:text-white mb-6 leading-tight">
            دليلك الرقمي في <span className="text-[#c2410c] dark:text-[#f0c040]">القانون الجزائري</span>
          </h2>
          <p className="max-w-2xl mx-auto text-gray-600 dark:text-gray-400 text-lg mb-10 leading-relaxed">
            ابحث في القوانين، احسب الآجال القضائية، استخرج بيانات الأحكام، وصغ مذكراتك القانونية بدقة واحترافية في مكان واحد.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <div className="px-6 py-3 bg-white dark:bg-[#1e293b] rounded-2xl shadow-md border border-gray-100 dark:border-gray-800 flex items-center gap-3">
              <span className="text-2xl">📜</span>
              <div className="text-right">
                <p className="text-[10px] text-gray-500 dark:text-gray-400">قوانين محدثة</p>
                <p className="text-sm font-bold text-[#1a3a5c] dark:text-white">116+ قانون</p>
              </div>
            </div>
            <div className="px-6 py-3 bg-white dark:bg-[#1e293b] rounded-2xl shadow-md border border-gray-100 dark:border-gray-800 flex items-center gap-3">
              <span className="text-2xl">🏛️</span>
              <div className="text-right">
                <p className="text-[10px] text-gray-500 dark:text-gray-400">الجهات القضائية</p>
                <p className="text-sm font-bold text-[#1a3a5c] dark:text-white">تغطية وطنية شاملة</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 pb-24">
        {/* Tab Switcher */}
        <div className="bg-white dark:bg-[#1e293b] p-2 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 mb-8 flex flex-wrap justify-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-[#1a3a5c] text-white shadow-lg scale-105'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-[#1e293b] rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 p-6 sm:p-10 min-h-[600px] transition-all duration-500">
          {activeTab === 'search' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8 text-center">
                <h3 className="text-2xl font-bold text-[#1a3a5c] dark:text-white mb-2">البحث في القوانين والجرائد الرسمية</h3>
                <p className="text-gray-500 dark:text-gray-400">ابحث في أكثر من 116 قانوناً جزائرياً محدثاً</p>
              </div>
              <GlobalLawSearch />
            </div>
          )}

          {activeTab === 'deadlines' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-12">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-[#1a3a5c] dark:text-white mb-2">حاسبة الآجال القضائية</h3>
                <p className="text-gray-500 dark:text-gray-400">حساب دقيق للمواعيد القانونية مع مراعاة العطل الرسمية</p>
              </div>
              <div className="grid lg:grid-cols-2 gap-10">
                <DeadlineCalculator />
                <DualDeadlineView />
              </div>
              <div className="pt-10 border-t border-gray-100 dark:border-gray-800">
                <h4 className="text-xl font-bold text-[#1a3a5c] dark:text-white mb-6 text-center">جدول الآجال القانونية الشائع</h4>
                <DeadlinesTable />
              </div>
            </div>
          )}

          {activeTab === 'jurisprudence' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8 text-center">
                <h3 className="text-2xl font-bold text-[#1a3a5c] dark:text-white mb-2">الاجتهاد القضائي</h3>
                <p className="text-gray-500 dark:text-gray-400">قاعدة بيانات لقرارات المحكمة العليا ومجلس الدولة</p>
              </div>
              <JurisprudenceTab />
            </div>
          )}

          {activeTab === 'lawyer-tools' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8 text-center">
                <h3 className="text-2xl font-bold text-[#1a3a5c] dark:text-white mb-2">أدوات المحامي الذكية</h3>
                <p className="text-gray-500 dark:text-gray-400">أدوات برمجية دقيقة للتحقق الشكلي وصياغة المذكرات</p>
              </div>
              <LawyerToolsTab onBack={() => setActiveTab('search')} />
            </div>
          )}
        </div>
      </main>

      {/* AI Assistant Floating Button */}
      <AiAssistant />

      {/* Footer */}
      <footer className="bg-white dark:bg-[#0f172a] border-t border-gray-200 dark:border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-2xl">⚖️</span>
            <span className="text-lg font-bold text-[#1a3a5c] dark:text-white">الشامل القانوني</span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            جميع الحقوق محفوظة © {new Date().getFullYear()} - تم التطوير لخدمة العدالة في الجزائر
          </p>
          <div className="flex justify-center gap-6 text-xs font-medium text-gray-400 dark:text-gray-500">
            <a href="#" className="hover:text-[#1a3a5c] dark:hover:text-[#f0c040] transition-colors">سياسة الخصوصية</a>
            <a href="#" className="hover:text-[#1a3a5c] dark:hover:text-[#f0c040] transition-colors">شروط الاستخدام</a>
            <a href="#" className="hover:text-[#1a3a5c] dark:hover:text-[#f0c040] transition-colors">اتصل بنا</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
