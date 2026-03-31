'use client';

import { useState } from 'react';
import SmartPetitionChecker from './SmartPetitionChecker';
import PetitionChecker from './PetitionChecker';
import ComplaintChecker from './ComplaintChecker';
import DeadlineCalculatorTool from './DeadlineCalculatorTool';
import PetitionTemplates from './PetitionTemplates';
import JudgmentAnalyzer from './JudgmentAnalyzer';
import ContractReviewer from './ContractReviewer';
import MemoDrafter from './MemoDrafter';
import CompensationCalculator from './CompensationCalculator';
import ProceduresComparison from './ProceduresComparison';
import LegalDictionary from './LegalDictionary';
import AiPromptsGuide from './AiPromptsGuide';

const tools = [
  { id: 'smart-petition', title: 'التحقق الشكلي الآلي من العرائض والشكاوى', icon: '📋', desc: 'رفع العريضة أو الشكوى (PDF/Word) والتحقق الآلي من الشروط الشكلية وفق ق.إ.م.إ وق.إ.ج', color: '#7c3aed' },
  { id: 'judgment-analyzer', title: 'استخراج بيانات الأحكام', icon: '⚖️', desc: 'استخراج المعلومات الأساسية من الأحكام القضائية وعرض طرق الطعن المتاحة وفق ق.إ.م.إ', color: '#1a3a5c' },
  { id: 'contract-reviewer', title: 'فحص العقود', icon: '📑', desc: 'فحص البنود الأساسية للعقود للكشف عن الإشكاليات والمخاطر وفق القانون المدني الجزائري', color: '#059669' },
  { id: 'memo-drafter', title: 'قوالب المذكرات القانونية', icon: '✍️', desc: 'قوالب جاهزة للمذكرات القانونية (جوابية، ختامية، استئناف، نقض، معارضة، افتتاحية)', color: '#6d28d9' },
  { id: 'petition', title: 'التحقق الشكلي للعرائض', icon: '📋', desc: 'التأكد من استيفاء العريضة لكل الشروط الشكلية وفق ق.إ.م.إ', color: '#2563eb' },
  { id: 'complaint', title: 'التحقق من الشكاوى', icon: '🔍', desc: 'التحقق من صحة الشكاوى المقدمة للنيابة وفق ق.إ.ج', color: '#dc2626' },
  { id: 'deadline', title: 'حاسبة الآجال القضائية', icon: '⏰', desc: 'حساب آجال الطعون والإجراءات القضائية', color: '#059669' },
  { id: 'compensation', title: 'حاسبة التعويضات والفوائد', icon: '💰', desc: 'حساب التعويضات عن الأضرار الجسدية والفوائد القانونية وفق القانون المدني', color: '#059669' },
  { id: 'procedures', title: 'مقارنة الإجراءات ومسار القضية', icon: '🔄', desc: 'مقارنة بين الإجراءات القضائية وعرض مسار الدعوى بصرياً', color: '#0891b2' },
  { id: 'ai-prompts', title: 'دليل برومبتات الذكاء الاصطناعي', icon: '💡', desc: '20 برومبت جاهز للنسخ — تحليل قضايا، صياغة، بحث، استراتيجية، ترجمة', color: '#8b5cf6' },
  { id: 'dictionary', title: 'معجم المصطلحات القانونية', icon: '📖', desc: 'قاموس عربي-فرنسي للمصطلحات القانونية مع الشرح والمراجع', color: '#6366f1' },
  { id: 'templates', title: 'نماذج العرائض', icon: '📄', desc: 'نماذج جاهزة للعرائض والشكاوى يمكن نسخها وتعديلها', color: '#d97706' },
];

export default function LawyerToolsTab() {
  const [activeTool, setActiveTool] = useState<string | null>(null);

  if (activeTool === 'judgment-analyzer') return <JudgmentAnalyzer onBack={() => setActiveTool(null)} />;
  if (activeTool === 'contract-reviewer') return <ContractReviewer onBack={() => setActiveTool(null)} />;
  if (activeTool === 'memo-drafter') return <MemoDrafter onBack={() => setActiveTool(null)} />;
  if (activeTool === 'smart-petition') return <SmartPetitionChecker onBack={() => setActiveTool(null)} />;
  if (activeTool === 'petition') return <PetitionChecker onBack={() => setActiveTool(null)} />;
  if (activeTool === 'complaint') return <ComplaintChecker onBack={() => setActiveTool(null)} />;
  if (activeTool === 'deadline') return <DeadlineCalculatorTool onBack={() => setActiveTool(null)} />;
  if (activeTool === 'templates') return <PetitionTemplates onBack={() => setActiveTool(null)} />;
  if (activeTool === 'compensation') return <CompensationCalculator onBack={() => setActiveTool(null)} />;
  if (activeTool === 'procedures') return <ProceduresComparison onBack={() => setActiveTool(null)} />;
  if (activeTool === 'dictionary') return <LegalDictionary onBack={() => setActiveTool(null)} />;
  if (activeTool === 'ai-prompts') return <AiPromptsGuide onBack={() => setActiveTool(null)} />;

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-[#1a3a5c] dark:text-[#f0c040]">أدوات المحامي</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">أدوات عملية تخدم المحامي الجزائري في عمله اليومي</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-right hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
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
  );
}
