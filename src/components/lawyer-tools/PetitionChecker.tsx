'use client';
import { useState } from 'react';

interface CheckItem { label: string; article: string; critical?: boolean; }

const petitionTypes: Record<string, { title: string; items: CheckItem[] }> = {
  opening: {
    title: 'عريضة افتتاحية',
    items: [
      { label: 'الجهة القضائية المرفوع أمامها الدعوى', article: 'م.15 ق.إ.م.إ', critical: true },
      { label: 'اسم ولقب المدعي وموطنه', article: 'م.15 ق.إ.م.إ', critical: true },
      { label: 'اسم ولقب المدعى عليه وموطنه', article: 'م.15 ق.إ.م.إ', critical: true },
      { label: 'عرض موجز للوقائع', article: 'م.15 ق.إ.م.إ', critical: true },
      { label: 'الطلبات', article: 'م.15 ق.إ.م.إ', critical: true },
      { label: 'الوسائل التي تؤسس عليها الدعوى', article: 'م.15 ق.إ.م.إ' },
      { label: 'الإشارة إلى المستندات والوثائق المؤيدة', article: 'م.15 ق.إ.م.إ' },
      { label: 'توقيع المحامي على العريضة', article: 'م.10 ق.إ.م.إ', critical: true },
      { label: 'تاريخ العريضة', article: 'م.15 ق.إ.م.إ' },
      { label: 'عدد النسخ بحسب عدد الأطراف', article: 'م.17 ق.إ.م.إ' },
      { label: 'إرفاق التوكيل/التفويض إن وُجد', article: 'م.10 ق.إ.م.إ' },
      { label: 'دفع الرسوم القضائية', article: 'م.17 مكرر ق.إ.م.إ' },
      { label: 'الصفة في التقاضي', article: 'م.13 ق.إ.م.إ', critical: true },
      { label: 'المصلحة القائمة أو المحتملة', article: 'م.13 ق.إ.م.إ', critical: true },
      { label: 'الأهلية للتقاضي', article: 'م.13 ق.إ.م.إ', critical: true },
    ],
  },
  appeal: {
    title: 'عريضة استئنافية',
    items: [
      { label: 'احترام أجل الاستئناف (شهر من التبليغ)', article: 'م.336 ق.إ.م.إ', critical: true },
      { label: 'ذكر أسباب الاستئناف', article: 'م.539 ق.إ.م.إ', critical: true },
      { label: 'إرفاق نسخة من الحكم المستأنف', article: 'م.540 ق.إ.م.إ', critical: true },
      { label: 'الجهة القضائية (المجلس القضائي)', article: 'م.539 ق.إ.م.إ', critical: true },
      { label: 'اسم ولقب المستأنف وموطنه', article: 'م.539 ق.إ.م.إ', critical: true },
      { label: 'اسم ولقب المستأنف عليه وموطنه', article: 'م.539 ق.إ.م.إ', critical: true },
      { label: 'عرض الوقائع والأسباب', article: 'م.539 ق.إ.م.إ' },
      { label: 'الطلبات', article: 'م.539 ق.إ.م.إ' },
      { label: 'توقيع المحامي', article: 'م.10 ق.إ.م.إ', critical: true },
      { label: 'دفع الرسوم القضائية', article: 'م.17 مكرر ق.إ.م.إ' },
    ],
  },
  cassation: {
    title: 'طعن بالنقض',
    items: [
      { label: 'التمثيل بمحام معتمد لدى المحكمة العليا', article: 'م.349 ق.إ.م.إ', critical: true },
      { label: 'احترام أجل الطعن (شهران من التبليغ)', article: 'م.354 ق.إ.م.إ', critical: true },
      { label: 'ذكر أوجه الطعن بالنقض', article: 'م.358 ق.إ.م.إ', critical: true },
      { label: 'إرفاق نسخة من القرار المطعون فيه', article: 'م.356 ق.إ.م.إ', critical: true },
      { label: 'إرفاق نسخة من الحكم الابتدائي', article: 'م.356 ق.إ.م.إ' },
      { label: 'دفع الرسوم والكفالة', article: 'م.355 ق.إ.م.إ', critical: true },
      { label: 'بيانات الأطراف كاملة', article: 'م.349 ق.إ.م.إ' },
      { label: 'عرض الوقائع والإجراءات', article: 'م.349 ق.إ.م.إ' },
    ],
  },
  admin: {
    title: 'دعوى إدارية',
    items: [
      { label: 'التظلم الإداري المسبق (شهران)', article: 'م.830 ق.إ.م.إ', critical: true },
      { label: 'احترام أجل الدعوى (4 أشهر)', article: 'م.829 ق.إ.م.إ', critical: true },
      { label: 'إرفاق قرار الرفض أو إثبات السكوت', article: 'م.830 ق.إ.م.إ', critical: true },
      { label: 'التمثيل بمحام', article: 'م.826 ق.إ.م.إ', critical: true },
      { label: 'تحديد الجهة الإدارية المدعى عليها', article: 'م.828 ق.إ.م.إ', critical: true },
      { label: 'عرض الوقائع والطلبات', article: 'م.15 ق.إ.م.إ' },
      { label: 'الوسائل القانونية', article: 'م.15 ق.إ.م.إ' },
      { label: 'دفع الرسوم القضائية', article: 'م.17 مكرر ق.إ.م.إ' },
    ],
  },
};

export default function PetitionChecker({ onBack }: { onBack: () => void }) {
  const [activeType, setActiveType] = useState('opening');
  const [checked, setChecked] = useState<Record<string, Set<number>>>({});

  const currentItems = petitionTypes[activeType].items;
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
    const text = `التحقق الشكلي: ${petitionTypes[activeType].title}\nالنتيجة: ${progress}%\n${'─'.repeat(40)}\n${lines.join('\n')}`;
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-[#1a3a5c] dark:text-[#f0c040] text-lg">→</button>
        <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">📋 التحقق الشكلي للعرائض</h2>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {Object.entries(petitionTypes).map(([key, val]) => (
          <button key={key} onClick={() => setActiveType(key)}
            className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-full transition-all ${activeType === key ? 'bg-[#1a3a5c] text-white dark:bg-[#f0c040] dark:text-[#1a3a5c]' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
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

      <button onClick={exportChecklist} className="w-full py-2 bg-[#1a3a5c] dark:bg-[#f0c040] text-white dark:text-[#1a3a5c] rounded-lg text-sm font-medium">
        نسخ القائمة
      </button>
    </div>
  );
}
