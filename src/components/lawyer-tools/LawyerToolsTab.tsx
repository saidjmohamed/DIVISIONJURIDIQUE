'use client';

import { useState } from 'react';
import SmartPetitionChecker from './SmartPetitionChecker';
import PetitionChecker from './PetitionChecker';
import ComplaintChecker from './ComplaintChecker';
import DeadlineCalculatorTool from './DeadlineCalculatorTool';
import PetitionTemplates from './PetitionTemplates';
import JudgmentAnalyzer from './JudgmentAnalyzer';
import ContractReviewer from './ContractReviewer';
import DocSummarizer from './DocSummarizer';
import MemoDrafter from './MemoDrafter';
import CompensationCalculator from './CompensationCalculator';
import CourtFeesGuide from './CourtFeesGuide';
import ProceduresComparison from './ProceduresComparison';
import LegalDictionary from './LegalDictionary';

const tools = [
  // AI Tools section
  { id: 'judgment-analyzer', title: 'تحليل الأحكام القضائية', icon: '⚖️', desc: 'استخراج المعلومات الجوهرية من الأحكام وتحديد طرق الطعن المتاحة وفق ق.إ.م.إ', color: '#1a3a5c', badge: 'AI' },
  { id: 'contract-reviewer', title: 'مراجعة العقود', icon: '📑', desc: 'فحص العقود قانونياً للكشف عن الإشكاليات والمخاطر وفق القانون المدني الجزائري', color: '#059669', badge: 'AI' },
  { id: 'doc-summarizer', title: 'تلخيص المستندات', icon: '📄', desc: 'تلخيص أي مستند قانوني واستخراج النقاط الأساسية والمراجع القانونية', color: '#d97706', badge: 'AI' },
  { id: 'memo-drafter', title: 'صياغة المذكرات', icon: '✍️', desc: 'صياغة مذكرات قانونية كاملة (جوابية، ختامية، استئناف، نقض) بأسلوب جزائري رسمي', color: '#6d28d9', badge: 'AI' },
  // Existing tools
  { id: 'smart-petition', title: 'التحقق الذكي من العرائض والشكاوى', icon: '🤖', desc: 'رفع العريضة أو الشكوى (PDF/Word) وتحليلها تلقائياً للتحقق من الشروط الشكلية وفق ق.إ.م.إ وق.إ.ج', color: '#7c3aed', badge: 'AI' },
  { id: 'petition', title: 'التحقق الشكلي للعرائض', icon: '📋', desc: 'التأكد من استيفاء العريضة لكل الشروط الشكلية وفق ق.إ.م.إ', color: '#2563eb', badge: null },
  { id: 'complaint', title: 'التحقق من الشكاوى', icon: '🔍', desc: 'التحقق من صحة الشكاوى المقدمة للنيابة وفق ق.إ.ج', color: '#dc2626', badge: null },
  { id: 'deadline', title: 'حاسبة الآجال القضائية', icon: '⏰', desc: 'حساب آجال الطعون والإجراءات القضائية', color: '#059669', badge: null },
  { id: 'compensation', title: 'حاسبة التعويضات والفوائد', icon: '💰', desc: 'حساب التعويضات عن الأضرار الجسدية والفوائد القانونية وفق القانون المدني', color: '#059669', badge: null },
  { id: 'court-fees', title: 'دليل الرسوم القضائية', icon: '🏦', desc: 'جدول الرسوم القضائية حسب نوع المحكمة ودرجة التقاضي', color: '#d97706', badge: null },
  { id: 'procedures', title: 'مقارنة الإجراءات ومسار القضية', icon: '🔄', desc: 'مقارنة بين الإجراءات القضائية وعرض مسار الدعوى بصرياً', color: '#0891b2', badge: null },
  { id: 'dictionary', title: 'معجم المصطلحات القانونية', icon: '📖', desc: 'قاموس عربي-فرنسي للمصطلحات القانونية مع الشرح والمراجع', color: '#6366f1', badge: null },
  { id: 'templates', title: 'نماذج العرائض', icon: '📄', desc: 'نماذج جاهزة للعرائض والشكاوى يمكن نسخها وتعديلها', color: '#d97706', badge: null },
];

export default function LawyerToolsTab() {
  const [activeTool, setActiveTool] = useState<string | null>(null);

  if (activeTool === 'judgment-analyzer') return <JudgmentAnalyzer onBack={() => setActiveTool(null)} />;
  if (activeTool === 'contract-reviewer') return <ContractReviewer onBack={() => setActiveTool(null)} />;
  if (activeTool === 'doc-summarizer') return <DocSummarizer onBack={() => setActiveTool(null)} />;
  if (activeTool === 'memo-drafter') return <MemoDrafter onBack={() => setActiveTool(null)} />;
  if (activeTool === 'smart-petition') return <SmartPetitionChecker onBack={() => setActiveTool(null)} />;
  if (activeTool === 'petition') return <PetitionChecker onBack={() => setActiveTool(null)} />;
  if (activeTool === 'complaint') return <ComplaintChecker onBack={() => setActiveTool(null)} />;
  if (activeTool === 'deadline') return <DeadlineCalculatorTool onBack={() => setActiveTool(null)} />;
  if (activeTool === 'templates') return <PetitionTemplates onBack={() => setActiveTool(null)} />;
  if (activeTool === 'compensation') return <CompensationCalculator onBack={() => setActiveTool(null)} />;
  if (activeTool === 'court-fees') return <CourtFeesGuide onBack={() => setActiveTool(null)} />;
  if (activeTool === 'procedures') return <ProceduresComparison onBack={() => setActiveTool(null)} />;
  if (activeTool === 'dictionary') return <LegalDictionary onBack={() => setActiveTool(null)} />;

  // Split tools into AI and classic sections
  const aiTools = tools.filter(t => t.badge === 'AI');
  const classicTools = tools.filter(t => !t.badge);

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-[#1a3a5c] dark:text-[#f0c040]">أدوات المحامي</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">أدوات عملية تخدم المحامي الجزائري في عمله اليومي</p>
      </div>

      {/* AI Tools Section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040]">🤖 أدوات الذكاء الاصطناعي</span>
          <span className="text-[10px] px-2 py-0.5 bg-[#6d28d9]/15 dark:bg-[#6d28d9]/30 text-[#6d28d9] dark:text-purple-300 rounded-full font-medium border border-[#6d28d9]/20">
            مدعوم بـ Gemini
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {aiTools.map(tool => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-right hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden"
            >
              {/* AI badge */}
              <div className="absolute top-2 left-2">
                <span className="text-[9px] px-1.5 py-0.5 bg-[#6d28d9] text-white rounded-full font-bold">AI</span>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{tool.icon}</span>
                <h3 className="font-bold text-[#1a3a5c] dark:text-white text-sm leading-tight">{tool.title}</h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{tool.desc}</p>
              <div className="mt-3 flex justify-end">
                <span className="text-xs px-3 py-1 rounded-full text-white" style={{ backgroundColor: tool.color }}>فتح</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Classic Tools Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040]">🛠️ الأدوات الكلاسيكية</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {classicTools.map(tool => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-right hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{tool.icon}</span>
                <h3 className="font-bold text-[#1a3a5c] dark:text-white text-sm">{tool.title}</h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{tool.desc}</p>
              <div className="mt-3 flex justify-end">
                <span className="text-xs px-3 py-1 rounded-full text-white" style={{ backgroundColor: tool.color }}>فتح</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
