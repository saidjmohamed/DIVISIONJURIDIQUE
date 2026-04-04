'use client';
import { useState } from 'react';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';

/* ─────────────────────── Types ─────────────────────── */

interface CheckItem {
  label: string;
  article: string;
  critical?: boolean;
}

interface ChecklistCategory {
  key: string;
  title: string;
  icon: string;
  color: string;
  items: CheckItem[];
}

/* ─────────────────────── Data ─────────────────────── */

const PETITION_DATA: ChecklistCategory[] = [
  {
    key: 'opening', title: 'عريضة افتتاحية', icon: '📋', color: '#2563eb',
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
  {
    key: 'appeal', title: 'عريضة استئنافية', icon: '⏫', color: '#2563eb',
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
  {
    key: 'cassation', title: 'طعن بالنقض', icon: '🔝', color: '#2563eb',
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
  {
    key: 'admin', title: 'دعوى إدارية', icon: '🏛️', color: '#2563eb',
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
];

const COMPLAINT_DATA: ChecklistCategory[] = [
  {
    key: 'regular', title: 'شكوى عادية', icon: '🔍', color: '#dc2626',
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
  {
    key: 'civil_party', title: 'شكوى مع ادعاء مدني', icon: '⚖️', color: '#dc2626',
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
  {
    key: 'direct', title: 'تكليف مباشر', icon: '📝', color: '#dc2626',
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
];

type Mode = 'petition' | 'complaint';

/* ─────────────────────── Component ─────────────────────── */

export default function FormChecklist({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<Mode>('petition');
  const [activeKey, setActiveKey] = useState('opening');
  const [checked, setChecked] = useState<Record<string, Set<number>>>({});
  const { copied, copy } = useCopyToClipboard();

  const categories = mode === 'petition' ? PETITION_DATA : COMPLAINT_DATA;
  const activeCat = categories.find(c => c.key === activeKey) || categories[0];
  const currentChecked = checked[activeKey] || new Set();
  const progress = activeCat.items.length > 0 ? Math.round((currentChecked.size / activeCat.items.length) * 100) : 0;
  const criticalMissing = activeCat.items.filter((item, i) => item.critical && !currentChecked.has(i));

  const toggle = (index: number) => {
    setChecked(prev => {
      const s = new Set(prev[activeKey] || []);
      if (s.has(index)) s.delete(index); else s.add(index);
      return { ...prev, [activeKey]: s };
    });
  };

  const exportChecklist = () => {
    const lines = activeCat.items.map((item, i) =>
      `${currentChecked.has(i) ? '✅' : '❌'} ${item.label} (${item.article})`
    );
    const title = mode === 'petition' ? 'التحقق الشكلي للعرائض' : 'التحقق من الشكاوى';
    copy(`${title}: ${activeCat.title}\nالنتيجة: ${progress}%\n${'─'.repeat(40)}\n${lines.join('\n')}`);
  };

  // Reset checked when switching mode
  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setChecked({});
    setActiveKey(newMode === 'petition' ? 'opening' : 'regular');
  };

  const barColor = progress === 100 ? 'bg-green-500' : progress > 60 ? 'bg-yellow-500' : 'bg-red-500';
  const accentColor = mode === 'petition' ? '#2563eb' : '#dc2626';

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-[#1a3a5c] dark:text-[#f0c040] text-lg hover:opacity-70 transition-opacity">→</button>
        <div>
          <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">📋 قائمة الفحص الشكلي</h2>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">تحقق يدوي من الشروط الشكلية المطلوبة — عرائض وشكاوى</p>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => switchMode('petition')}
          className={`flex-1 text-xs py-2.5 rounded-xl transition-all font-bold ${
            mode === 'petition'
              ? 'bg-[#2563eb] text-white shadow-md'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
          }`}
        >
          ⚖️ العرائض المدنية والإدارية
        </button>
        <button
          onClick={() => switchMode('complaint')}
          className={`flex-1 text-xs py-2.5 rounded-xl transition-all font-bold ${
            mode === 'complaint'
              ? 'bg-[#dc2626] text-white shadow-md'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
          }`}
        >
          🔍 الشكاوى الجزائية
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button key={cat.key} onClick={() => setActiveKey(cat.key)}
            className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-full transition-all ${
              activeKey === cat.key
                ? 'text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
            style={activeKey === cat.key ? { backgroundColor: accentColor } : {}}
          >
            {cat.icon} {cat.title}
          </button>
        ))}
      </div>

      {/* Progress */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">نسبة الاكتمال</span>
          <span className={`text-sm font-bold ${progress === 100 ? 'text-green-600' : progress > 60 ? 'text-yellow-600' : 'text-red-600'}`}>
            {progress}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${progress}%` }} />
        </div>
        {criticalMissing.length > 0 && (
          <div className="mt-2 text-xs text-red-600 dark:text-red-400">
            ⚠️ {criticalMissing.length} شرط جوهري مفقود
          </div>
        )}
      </div>

      {/* Checklist */}
      <div className="space-y-2 mb-4">
        {activeCat.items.map((item, i) => (
          <label key={i} onClick={() => toggle(i)}
            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
              currentChecked.has(i)
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
            }`}>
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
              currentChecked.has(i) ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-gray-600'
            }`}>
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

      {/* Export */}
      <button onClick={exportChecklist}
        className="w-full py-2.5 rounded-lg text-sm font-bold transition-all active:scale-[0.98]"
        style={{ backgroundColor: accentColor, color: 'white' }}
      >
        {copied ? '✅ تم النسخ' : '📋 نسخ القائمة'}
      </button>
    </div>
  );
}
