'use client';

import { useState } from 'react';
import PetitionChecker from './PetitionChecker';
import ComplaintChecker from './ComplaintChecker';
import DeadlineCalculatorTool from './DeadlineCalculatorTool';
import PetitionTemplates from './PetitionTemplates';

const tools = [
  { id: 'petition', title: 'التحقق الشكلي للعرائض', icon: '📋', desc: 'التأكد من استيفاء العريضة لكل الشروط الشكلية وفق ق.إ.م.إ', color: '#2563eb' },
  { id: 'complaint', title: 'التحقق من الشكاوى', icon: '🔍', desc: 'التحقق من صحة الشكاوى المقدمة للنيابة وفق ق.إ.ج', color: '#dc2626' },
  { id: 'deadline', title: 'حاسبة الآجال القضائية', icon: '⏰', desc: 'حساب آجال الطعون والإجراءات القضائية', color: '#059669' },
  { id: 'templates', title: 'نماذج العرائض', icon: '📄', desc: 'نماذج جاهزة للعرائض والشكاوى يمكن نسخها وتعديلها', color: '#d97706' },
];

export default function LawyerToolsTab() {
  const [activeTool, setActiveTool] = useState<string | null>(null);

  if (activeTool === 'petition') return <PetitionChecker onBack={() => setActiveTool(null)} />;
  if (activeTool === 'complaint') return <ComplaintChecker onBack={() => setActiveTool(null)} />;
  if (activeTool === 'deadline') return <DeadlineCalculatorTool onBack={() => setActiveTool(null)} />;
  if (activeTool === 'templates') return <PetitionTemplates onBack={() => setActiveTool(null)} />;

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-[#1a3a5c] dark:text-[#f0c040]">أدوات المحامي</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">أدوات عملية تخدم المحامي الجزائري في عمله اليومي</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 text-right hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
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
  );
}
