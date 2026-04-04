'use client';
import { useState } from 'react';

interface CheckItem { label: string; article: string; critical?: boolean; }

const complaintTypes: Record<string, { title: string; items: CheckItem[] }> = {
  regular: {
    title: 'شكوى عادية',
    items: [
      { label: 'هوية الشاكي كاملة (الاسم، اللقب، تاريخ ومكان الميلاد، العنوان)', article: 'م.36 ق.إ.ج', critical: true },
      { label: 'صفة الشاكي (ضحية، ذوي حقوق، ممثل قانوني)', article: 'م.36 ق.إ.ج', critical: true },
      { label: 'هوية المشتكى منه (إن كانت معلومة)', article: 'م.36 ق.إ.ج' },
      { label: 'وصف الوقائع بدقة (الزمان، المكان، الكيفية)', article: 'م.36 ق.إ.ج', critical: true },
      { label: 'التكييف القانوني المحتمل (جناية/جنحة/مخالفة)', article: 'م.36 ق.إ.ج' },
      { label: 'الأدلة والمستندات المرفقة', article: 'م.36 ق.إ.ج' },
      { label: 'توقيع الشاكي أو محاميه', article: 'م.36 ق.إ.ج', critical: true },
      { label: 'تحديد الضرر اللاحق', article: 'م.36 ق.إ.ج' },
    ],
  },
  civil_party: {
    title: 'شكوى مع ادعاء مدني',
    items: [
      { label: 'هوية الشاكي كاملة', article: 'م.72 ق.إ.ج', critical: true },
      { label: 'صفة الشاكي كضحية أو ذوي حقوق', article: 'م.72 ق.إ.ج', critical: true },
      { label: 'هوية المشتكى منه', article: 'م.72 ق.إ.ج' },
      { label: 'وصف الوقائع بدقة', article: 'م.72 ق.إ.ج', critical: true },
      { label: 'التأسيس كطرف مدني صراحة', article: 'م.72 ق.إ.ج', critical: true },
      { label: 'تحديد مبلغ التعويض المطالب به', article: 'م.72 ق.إ.ج', critical: true },
      { label: 'إيداع كفالة مالية', article: 'م.75 ق.إ.ج', critical: true },
      { label: 'التأكد من عدم وجود حفظ سابق من النيابة', article: 'م.73 ق.إ.ج', critical: true },
      { label: 'اختصاص قاضي التحقيق مكانياً', article: 'م.72 ق.إ.ج', critical: true },
      { label: 'الأدلة والمستندات المرفقة', article: 'م.72 ق.إ.ج' },
      { label: 'توقيع المحامي', article: 'م.72 ق.إ.ج', critical: true },
    ],
  },
  direct: {
    title: 'تكليف مباشر',
    items: [
      { label: 'الوقائع تشكل جنحة (ليست جناية أو مخالفة)', article: 'م.337 مكرر ق.إ.ج', critical: true },
      { label: 'تكليف المتهم بالحضور عن طريق محضر قضائي', article: 'م.337 مكرر ق.إ.ج', critical: true },
      { label: 'احترام أجل التكليف (10 أيام على الأقل)', article: 'م.337 مكرر ق.إ.ج', critical: true },
      { label: 'إيداع كفالة مالية', article: 'م.337 مكرر ق.إ.ج', critical: true },
      { label: 'تحديد الوقائع بدقة', article: 'م.337 مكرر ق.إ.ج', critical: true },
      { label: 'ذكر المواد القانونية المطبقة', article: 'م.337 مكرر ق.إ.ج' },
      { label: 'تحديد مبلغ التعويض المدني', article: 'م.337 مكرر ق.إ.ج' },
      { label: 'هوية المتهم كاملة', article: 'م.337 مكرر ق.إ.ج', critical: true },
      { label: 'توقيع المحامي', article: 'م.337 مكرر ق.إ.ج', critical: true },
    ],
  },
};

export default function ComplaintChecker({ onBack }: { onBack: () => void }) {
  const [activeType, setActiveType] = useState('regular');
  const [checked, setChecked] = useState<Record<string, Set<number>>>({});

  const currentItems = complaintTypes[activeType].items;
  const currentChecked = checked[activeType] || new Set();
  const progress = currentItems.length > 0 ? Math.round((currentChecked.size / currentItems.length) * 100) : 0;
  const criticalMissing = currentItems.filter((item, i) => item.critical && !currentChecked.has(i));

  const toggle = (index: number) => {
    setChecked(prev => {
      const s = new Set(prev[activeType] || []);
      if (s.has(index)) s.delete(index); else s.add(index);
      return { ...prev, [activeType]: s };
    });
  };

  const exportChecklist = () => {
    const lines = currentItems.map((item, i) =>
      `${currentChecked.has(i) ? '✅' : '❌'} ${item.label} (${item.article})`
    );
    const text = `التحقق من الشكوى: ${complaintTypes[activeType].title}\nالنتيجة: ${progress}%\n${'─'.repeat(40)}\n${lines.join('\n')}`;
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-[#1a3a5c] dark:text-[#f0c040] text-lg">→</button>
        <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">🔍 التحقق من صحة الشكاوى</h2>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {Object.entries(complaintTypes).map(([key, val]) => (
          <button key={key} onClick={() => setActiveType(key)}
            className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-full transition-all ${activeType === key ? 'bg-[#dc2626] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
            {val.title}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">نسبة الاكتمال</span>
          <span className={`text-sm font-bold ${progress === 100 ? 'text-green-600' : progress > 60 ? 'text-yellow-600' : 'text-red-600'}`}>{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div className={`h-2 rounded-full transition-all ${progress === 100 ? 'bg-green-500' : progress > 60 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${progress}%` }} />
        </div>
        {criticalMissing.length > 0 && (
          <div className="mt-2 text-xs text-red-600 dark:text-red-400">⚠️ {criticalMissing.length} شرط جوهري مفقود</div>
        )}
      </div>

      <div className="space-y-2 mb-4">
        {currentItems.map((item, i) => (
          <label key={i} onClick={() => toggle(i)}
            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${currentChecked.has(i) ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}>
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${currentChecked.has(i) ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
              {currentChecked.has(i) && <span className="text-xs">✓</span>}
            </div>
            <div className="flex-1">
              <span className={`text-sm ${currentChecked.has(i) ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                {item.critical && !currentChecked.has(i) && <span className="text-red-500 ml-1">*</span>}
                {item.label}
              </span>
              <div className="text-[10px] text-gray-400 mt-0.5">{item.article}</div>
            </div>
          </label>
        ))}
      </div>

      <button onClick={exportChecklist} className="w-full py-2 bg-[#dc2626] text-white rounded-lg text-sm font-medium">
        نسخ القائمة
      </button>
    </div>
  );
}
