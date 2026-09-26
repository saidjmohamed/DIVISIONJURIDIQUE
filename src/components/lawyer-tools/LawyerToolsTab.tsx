'use client';

import { useState } from 'react';
import DeadlinesFullView from './DeadlinesFullView';
import CompensationCalculator from './CompensationCalculator';
import ProceduresComparison from './ProceduresComparison';
import LegalDictionary from './LegalDictionary';
import AiPromptsGuide from './AiPromptsGuide';
import HtmlToMarkdown from './HtmlToMarkdown';
import ReversePromptBuilder from './ReversePromptBuilder';

const tools = [
  { id: 'deadlines-full', title: 'الآجال القضائية', icon: '📅', desc: 'حاسبة الآجال الكاملة وحوسبة المواعيد وعرض جدول الآجال الشائع.', color: '#059669' },
  { id: 'compensation', title: 'حاسبة التعويضات والفوائد', icon: '💰', desc: 'حساب التعويضات عن الأضرار والفوائد القانونية وفق المعايير المعتمدة.', color: '#059669' },
  { id: 'procedures', title: 'مقارنة الإجراءات ومسار القضية', icon: '🔄', desc: 'مقارنة الإجراءات القضائية وعرض مسار الدعوى بصرياً.', color: '#0891b2' },
  { id: 'ai-prompts', title: 'دليل برومبتات الذكاء الاصطناعي', icon: '💡', desc: 'برومبتات جاهزة للنسخ للتحليل والصياغة والبحث والاستراتيجية والترجمة.', color: '#8b5cf6' },
  { id: 'dictionary', title: 'معجم المصطلحات القانونية', icon: '📖', desc: 'قاموس عربي-فرنسي للمصطلحات القانونية مع الشرح والمراجع.', color: '#6366f1' },
  { id: 'html-to-md', title: 'تحويل HTML إلى Markdown', icon: '📝', desc: 'تحويل ملفات HTML إلى Markdown بالجملة، ويعمل بالكامل أوفلاين.', color: '#6366f1' },
  { id: 'reverse-prompt', title: 'برومبت وصف عكسي لأي مذكرة', icon: '🧩', desc: 'استخراج برومبت يصف بنية وشكل وصياغة المذكرة دون كشف موضوع القضية أو الأطراف.', color: '#9333ea', badge: 'جديد' },
];

export default function LawyerToolsTab({ onBack }: { onBack?: () => void }) {
  const [activeTool, setActiveTool] = useState<string | null>(null);

  if (activeTool === 'deadlines-full') return <DeadlinesFullView onBack={() => setActiveTool(null)} />;
  if (activeTool === 'compensation') return <CompensationCalculator onBack={() => setActiveTool(null)} />;
  if (activeTool === 'procedures') return <ProceduresComparison onBack={() => setActiveTool(null)} />;
  if (activeTool === 'dictionary') return <LegalDictionary onBack={() => setActiveTool(null)} />;
  if (activeTool === 'ai-prompts') return <AiPromptsGuide onBack={() => setActiveTool(null)} />;
  if (activeTool === 'html-to-md') return <HtmlToMarkdown onBack={() => setActiveTool(null)} />;
  if (activeTool === 'reverse-prompt') return <ReversePromptBuilder onBack={() => setActiveTool(null)} />;

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4" dir="rtl">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black text-[#1a3a5c] dark:text-[#f0c040]">أدوات المحامي</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">أدوات عملية مركزة للعمل القانوني اليومي.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-right hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{tool.icon}</span>
              <h3 className="font-bold text-[#1a3a5c] dark:text-white text-sm leading-tight">{tool.title}</h3>
              {tool.badge && <span className="mr-auto text-[10px] px-2 py-0.5 bg-[#6366f1] text-white rounded-full font-bold">{tool.badge}</span>}
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
