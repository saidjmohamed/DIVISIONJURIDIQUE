'use client';

import { useState } from 'react';

/* ─────────────────────── Data ─────────────────────── */

interface FeeItem {
  type: string;
  amount: string;
  article: string;
}

interface CourtSection {
  key: string;
  title: string;
  icon: string;
  fees: FeeItem[];
}

const COURT_FEES: CourtSection[] = [
  {
    key: 'firstInstance',
    title: 'المحكمة الابتدائية',
    icon: '🏛️',
    fees: [
      { type: 'رسم التسجيل (الطابع القضائي)', amount: '500 دج', article: 'قانون الطابع' },
      { type: 'رسم التسجيل على العرائض', amount: 'محدد حسب قانون المالية السنوي', article: 'قانون المالية' },
      { type: 'رسم التسجيل على الأحكام', amount: 'متغير حسب قيمة الدعوى', article: 'قانون التسجيل' },
      { type: 'حقوق المحضر القضائي (التبليغ)', amount: 'متغير حسب المسافة', article: 'المرسوم 09-110' },
      { type: 'أتعاب الخبير القضائي', amount: 'تحدده المحكمة', article: 'م.124 ق.إ.م.إ' },
    ],
  },
  {
    key: 'appeal',
    title: 'المجلس القضائي (استئناف)',
    icon: '⚖️',
    fees: [
      { type: 'رسم الاستئناف', amount: '1,000 دج', article: 'قانون المالية' },
      { type: 'طابع قضائي', amount: '500 دج', article: 'قانون الطابع' },
      { type: 'حقوق المحضر القضائي (إعلان الاستئناف)', amount: 'متغير', article: 'المرسوم 09-110' },
      { type: 'رسم تسجيل قرار الاستئناف', amount: 'حسب قيمة موضوع النزاع', article: 'قانون التسجيل' },
    ],
  },
  {
    key: 'cassation',
    title: 'المحكمة العليا (نقض)',
    icon: '🔏',
    fees: [
      { type: 'رسم الطعن بالنقض', amount: '2,000 دج', article: 'قانون المالية' },
      { type: 'طابع قضائي', amount: '1,000 دج', article: 'قانون الطابع' },
      { type: 'كفالة الطعن', amount: 'محددة حسب القانون', article: 'م.355 ق.إ.م.إ' },
      { type: 'رسوم تسجيل القرار', amount: 'حسب الحال', article: 'قانون التسجيل' },
    ],
  },
  {
    key: 'administrative',
    title: 'المحكمة الإدارية',
    icon: '🏢',
    fees: [
      { type: 'رسم التسجيل', amount: '2,000 دج', article: 'قانون المالية' },
      { type: 'طابع قضائي', amount: '500 دج', article: 'قانون الطابع' },
      { type: 'التمثيل بمحامٍ (وجوبي)', amount: '—', article: 'م.826 ق.إ.م.إ' },
    ],
  },
  {
    key: 'stateCouncil',
    title: 'مجلس الدولة (استئناف إداري)',
    icon: '🏛️',
    fees: [
      { type: 'رسم الطعن بالاستئناف الإداري', amount: 'حسب قانون المالية', article: 'قانون المالية' },
      { type: 'طابع قضائي', amount: '1,000 دج', article: 'قانون الطابع' },
    ],
  },
  {
    key: 'commercial',
    title: 'المحكمة التجارية',
    icon: '💼',
    fees: [
      { type: 'رسم التسجيل', amount: 'يختلف حسب قيمة الدعوى', article: 'قانون المالية' },
      { type: 'طابع قضائي', amount: '500 دج', article: 'قانون الطابع' },
      { type: 'رسم تسجيل الحكم التجاري', amount: 'نسبة مئوية من المبلغ', article: 'قانون التسجيل' },
    ],
  },
  {
    key: 'enforcement',
    title: 'رسوم التنفيذ والمحضر',
    icon: '📜',
    fees: [
      { type: 'حقوق المحضر القضائي (التنفيذ)', amount: 'متغير حسب طبيعة التنفيذ', article: 'المرسوم 09-110' },
      { type: 'رسم الصيغة التنفيذية', amount: 'حسب قانون المالية', article: 'قانون المالية' },
      { type: 'رسم تسليم صورة رسمية', amount: 'محدد بموجب القانون', article: 'قانون الطابع' },
      { type: 'رسوم الحجز التنفيذي', amount: 'متغير حسب المبلغ', article: 'المرسوم 09-110' },
    ],
  },
  {
    key: 'criminal',
    title: 'قسم الجزائية',
    icon: '⚔️',
    fees: [
      { type: 'رسم التبليغ (في حالة الإخلاء)', amount: 'محدد بالمرسوم', article: 'المرسوم 09-110' },
      { type: 'رسم الاستئناف الجزائي', amount: 'لا يوجد في الغالب (مجاني للمتهم)', article: 'م.418 ق.إ.ج' },
      { type: 'الكفالة (إن طُلبت)', amount: 'تحددها المحكمة', article: 'م.127 ق.إ.ج' },
      { type: 'غرامة الطعن بالنقض الجزائي', amount: 'لا توجد في الغالب', article: 'م.498 ق.إ.ج' },
    ],
  },
];

/* ─────────────────────── Component ─────────────────────── */

export default function CourtFeesGuide({ onBack }: { onBack: () => void }) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['firstInstance']));
  const [search, setSearch] = useState('');

  function toggleSection(key: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function expandAll() {
    setOpenSections(new Set(COURT_FEES.map((s) => s.key)));
  }

  function collapseAll() {
    setOpenSections(new Set());
  }

  const searchLower = search.trim().toLowerCase();

  const filteredSections = COURT_FEES.map((section) => ({
    ...section,
    fees: searchLower
      ? section.fees.filter(
          (f) =>
            f.type.toLowerCase().includes(searchLower) ||
            f.amount.toLowerCase().includes(searchLower) ||
            f.article.toLowerCase().includes(searchLower)
        )
      : section.fees,
  })).filter((s) =>
    searchLower
      ? s.fees.length > 0 || s.title.toLowerCase().includes(searchLower)
      : true
  );

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-[#1a3a5c] dark:text-[#f0c040] text-lg font-bold">→</button>
        <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">💰 دليل الرسوم القضائية</h2>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
        الرسوم القضائية المعمول بها وفق قانون المالية والأمر 66-154 والمرسوم 09-110
      </p>

      {/* Search */}
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="ابحث عن رسم أو جهة..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 pr-9 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#d97706]/40"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">🔍</span>
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
          >
            ✕
          </button>
        )}
      </div>

      {/* Expand/Collapse controls */}
      {!search && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={expandAll}
            className="text-[11px] px-3 py-1 rounded-lg bg-[#d97706] text-white font-medium hover:bg-[#b45309] transition-all"
          >
            فتح الكل
          </button>
          <button
            onClick={collapseAll}
            className="text-[11px] px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
          >
            طي الكل
          </button>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-2">
        {filteredSections.map((section) => {
          const isOpen = openSections.has(section.key) || !!searchLower;
          return (
            <div
              key={section.key}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.key)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{section.icon}</span>
                  <span className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040]">{section.title}</span>
                  <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                    {section.fees.length} رسوم
                  </span>
                </div>
                <span className={`text-gray-400 dark:text-gray-500 text-xs transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              {/* Fee table */}
              {isOpen && section.fees.length > 0 && (
                <div className="border-t border-gray-100 dark:border-gray-700">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-amber-50 dark:bg-amber-900/15">
                        <th className="text-right text-[10px] font-semibold text-amber-700 dark:text-amber-400 px-4 py-2">نوع الرسم</th>
                        <th className="text-center text-[10px] font-semibold text-amber-700 dark:text-amber-400 px-3 py-2">المبلغ</th>
                        <th className="text-center text-[10px] font-semibold text-amber-700 dark:text-amber-400 px-3 py-2">المرجع</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.fees.map((fee, i) => (
                        <tr
                          key={i}
                          className={`border-t border-gray-50 dark:border-gray-700/50 ${
                            i % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-700/20'
                          }`}
                        >
                          <td className="text-right text-xs text-gray-700 dark:text-gray-300 px-4 py-2.5 leading-relaxed">{fee.type}</td>
                          <td className="text-center text-xs font-semibold text-[#d97706] dark:text-amber-400 px-3 py-2.5 whitespace-nowrap">{fee.amount}</td>
                          <td className="text-center text-[10px] text-gray-400 dark:text-gray-500 px-3 py-2.5 whitespace-nowrap">{fee.article}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {isOpen && section.fees.length === 0 && searchLower && (
                <div className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500 text-center border-t border-gray-100 dark:border-gray-700">
                  لا توجد نتائج في هذا القسم
                </div>
              )}
            </div>
          );
        })}

        {filteredSections.length === 0 && (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500">
            <div className="text-3xl mb-2">🔍</div>
            <p className="text-sm">لا توجد نتائج لـ "{search}"</p>
          </div>
        )}
      </div>

      {/* Notes section */}
      <div className="mt-5 space-y-2">
        <h3 className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040] mb-3">📌 ملاحظات مهمة</h3>

        {[
          {
            icon: '⚠️',
            color: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400',
            text: 'الرسوم تتغير حسب قانون المالية السنوي — تحقق دائماً من آخر تحديث لقانون المالية الجاري.',
          },
          {
            icon: '🆓',
            color: 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400',
            text: 'الدولة والولاية والبلدية والمؤسسات العمومية ذات الطابع الإداري معفاة من الرسوم القضائية وفق أحكام الإعفاء القانوني.',
          },
          {
            icon: '🤝',
            color: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400',
            text: 'يمكن الاستفادة من المساعدة القضائية في حالات العسر المالي، تُقدَّم الطلبات إلى لجنة المساعدة القضائية بالمجلس القضائي المختص.',
          },
          {
            icon: '📋',
            color: 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400',
            text: 'لا تشمل هذه الأرقام أتعاب المحامين والتي تُحدد باتفاق أو وفق جدول النقابة الوطنية للمحامين.',
          },
        ].map((note, i) => (
          <div key={i} className={`flex items-start gap-2 rounded-xl p-3 border ${note.color}`}>
            <span className="flex-shrink-0 mt-0.5">{note.icon}</span>
            <p className="text-[11px] leading-relaxed">{note.text}</p>
          </div>
        ))}
      </div>

      {/* Source note */}
      <div className="mt-4 text-center">
        <p className="text-[10px] text-gray-400 dark:text-gray-500">
          المصادر: قانون الطابع، قانون التسجيل، قانون المالية، المرسوم التنفيذي 09-110، ق.إ.م.إ
        </p>
      </div>
    </div>
  );
}
