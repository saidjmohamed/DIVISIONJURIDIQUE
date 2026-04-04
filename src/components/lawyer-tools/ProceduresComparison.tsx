'use client';

import { useState } from 'react';

/* ─────────────────────── Types ─────────────────────── */

type MainTab = 'comparison' | 'flowchart';
type FlowchartType = 'civil' | 'penal';

interface ComparisonItem {
  aspect: string;
  civil: string;
  penal: string;
}

interface ComparisonGroup {
  id: string;
  title: string;
  colA: string;
  colB: string;
  items: ComparisonItem[];
}

interface FlowStep {
  label: string;
  sub?: string;
  type?: 'start' | 'end' | 'optional' | 'branch' | 'normal';
}

/* ─────────────────────── Data ─────────────────────── */

const COMPARISONS: ComparisonGroup[] = [
  {
    id: 'appeal_civil_vs_penal',
    title: 'الاستئناف المدني vs الجزائي',
    colA: 'مدني',
    colB: 'جزائي',
    items: [
      { aspect: 'الأجل', civil: 'شهر واحد (م.336 ق.إ.م.إ)', penal: '10 أيام (م.418 ق.إ.ج)' },
      { aspect: 'نقطة البداية', civil: 'من التبليغ الرسمي', penal: 'من النطق بالحكم' },
      { aspect: 'الجهة', civil: 'المجلس القضائي', penal: 'المجلس القضائي (غرفة الجنح والمخالفات)' },
      { aspect: 'التمثيل بمحامٍ', civil: 'وجوبي (م.538)', penal: 'اختياري إلا في الجنايات' },
      { aspect: 'الأثر', civil: 'موقف للتنفيذ (م.323)', penal: 'موقف للتنفيذ (م.425)' },
      { aspect: 'الاستئناف الفرعي', civil: 'جائز (م.337)', penal: 'جائز (م.417)' },
    ],
  },
  {
    id: 'first_instance_vs_admin',
    title: 'الدعوى المدنية vs الإدارية',
    colA: 'مدني',
    colB: 'إداري',
    items: [
      { aspect: 'العريضة', civil: 'مكتوبة (م.14 ق.إ.م.إ)', penal: 'مكتوبة وموقعة من محامٍ (م.815 ق.إ.م.إ)' },
      { aspect: 'التمثيل بمحامٍ', civil: 'غير وجوبي أمام المحكمة', penal: 'وجوبي (م.826 ق.إ.م.إ)' },
      { aspect: 'التظلم المسبق', civil: 'غير مطلوب', penal: 'وجوبي خلال شهرين (م.830 ق.إ.م.إ)' },
      { aspect: 'أجل الدعوى', civil: 'التقادم العام', penal: '4 أشهر من رد الإدارة أو سكوتها (م.829)' },
      { aspect: 'الاختصاص', civil: 'محكمة موطن المدعى عليه (م.37)', penal: 'المحكمة الإدارية المختصة إقليمياً' },
      { aspect: 'طبيعة الإجراءات', civil: 'شفوية وتواجهية', penal: 'كتابية أساساً' },
    ],
  },
  {
    id: 'opposition_vs_appeal',
    title: 'المعارضة vs الاستئناف',
    colA: 'معارضة',
    colB: 'استئناف',
    items: [
      { aspect: 'الطبيعة', civil: 'طعن عادي ضد حكم غيابي', penal: 'طعن عادي ضد حكم حضوري أو غيابي' },
      { aspect: 'الأجل', civil: '10 أيام من التبليغ (م.329)', penal: 'شهر واحد من التبليغ (م.336)' },
      { aspect: 'الجهة', civil: 'نفس المحكمة المصدرة', penal: 'المجلس القضائي' },
      { aspect: 'الشرط', civil: 'الحكم غيابي فقط', penal: 'لا شرط خاص' },
      { aspect: 'الأثر', civil: 'إعادة النظر في الحكم', penal: 'إعادة النظر أمام درجة أعلى' },
    ],
  },
  {
    id: 'cassation_civil_vs_penal',
    title: 'النقض المدني vs الجزائي',
    colA: 'مدني',
    colB: 'جزائي',
    items: [
      { aspect: 'الأجل', civil: 'شهران (م.354 ق.إ.م.إ)', penal: '8 أيام (م.498 ق.إ.ج)' },
      { aspect: 'التمثيل', civil: 'محامٍ معتمد لدى المحكمة العليا (م.349)', penal: 'محامٍ معتمد لدى المحكمة العليا' },
      { aspect: 'الأثر', civil: 'غير موقف للتنفيذ (م.361)', penal: 'موقف للتنفيذ في الجزائي (م.499)' },
      { aspect: 'أوجه الطعن', civil: 'م.358 ق.إ.م.إ (10 أوجه)', penal: 'م.500 ق.إ.ج' },
      { aspect: 'الكفالة', civil: 'واجبة (م.355)', penal: 'غير واجبة' },
    ],
  },
  {
    id: 'ordinary_vs_urgent',
    title: 'الإجراء العادي vs الاستعجالي',
    colA: 'عادي',
    colB: 'استعجالي',
    items: [
      { aspect: 'الجهة', civil: 'قاضي الموضوع', penal: 'قاضي الاستعجال (م.299 ق.إ.م.إ)' },
      { aspect: 'طبيعة القرار', civil: 'حكم فاصل في الموضوع', penal: 'أمر استعجالي (مؤقت)' },
      { aspect: 'شرط التدخل', civil: 'لا يشترط الاستعجال', penal: 'يشترط توافر الاستعجال' },
      { aspect: 'حجية القرار', civil: 'حجية نسبية', penal: 'لا حجية في الموضوع' },
      { aspect: 'قابلية الطعن', civil: 'استئناف خلال شهر', penal: 'استئناف خلال 15 يوماً' },
    ],
  },
];

const CIVIL_FLOW: FlowStep[] = [
  { label: 'إيداع العريضة', sub: 'م.14 ق.إ.م.إ', type: 'start' },
  { label: 'التكليف بالحضور', sub: 'عن طريق المحضر القضائي', type: 'normal' },
  { label: 'أول جلسة', sub: 'تحديد الجدول الزمني', type: 'normal' },
  { label: 'تبادل المذكرات', sub: 'الدفوع والمستجوبات', type: 'normal' },
  { label: 'المرافعات الختامية', sub: 'مرافعة الخصوم', type: 'normal' },
  { label: 'حجز القضية', sub: 'للمداولة', type: 'normal' },
  { label: 'النطق بالحكم', sub: 'جلسة الحكم', type: 'normal' },
  { label: 'التبليغ الرسمي', sub: 'بداية أجل الطعن', type: 'normal' },
  { label: 'استئناف / تنفيذ', sub: 'م.336 أو م.323 ق.إ.م.إ', type: 'branch' },
];

const PENAL_FLOW: FlowStep[] = [
  { label: 'شكوى / محضر ضبطية', sub: 'م.1 ق.إ.ج', type: 'start' },
  { label: 'النيابة العامة', sub: 'ملائمة المتابعة أو الحفظ', type: 'normal' },
  { label: 'التحقيق القضائي', sub: 'اختياري في الجنح، وجوبي في الجنايات', type: 'optional' },
  { label: 'قرار الإحالة', sub: 'قرار غرفة الاتهام أو وكيل الجمهورية', type: 'normal' },
  { label: 'المحاكمة', sub: 'جلسات الموضوع', type: 'normal' },
  { label: 'النطق بالحكم', sub: 'بالإدانة أو البراءة', type: 'normal' },
  { label: 'استئناف / نقض / تنفيذ', sub: 'م.418 أو م.498 أو م.587 ق.إ.ج', type: 'branch' },
];

/* ─────────────────────── Component ─────────────────────── */

export default function ProceduresComparison({ onBack }: { onBack: () => void }) {
  const [mainTab, setMainTab] = useState<MainTab>('comparison');
  const [selectedComparison, setSelectedComparison] = useState(COMPARISONS[0].id);
  const [flowType, setFlowType] = useState<FlowchartType>('civil');

  const activeComparison = COMPARISONS.find((c) => c.id === selectedComparison) ?? COMPARISONS[0];
  const activeFlow = flowType === 'civil' ? CIVIL_FLOW : PENAL_FLOW;

  function stepStyle(type?: FlowStep['type']) {
    switch (type) {
      case 'start':
        return 'bg-[#0891b2] text-white border-[#0891b2]';
      case 'branch':
        return 'bg-amber-500 text-white border-amber-500';
      case 'optional':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 border-dashed';
      default:
        return 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600';
    }
  }

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-[#1a3a5c] dark:text-[#f0c040] text-lg font-bold">→</button>
        <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">🔄 مقارنة الإجراءات القضائية</h2>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
        مقارنة تفصيلية بين الإجراءات القضائية المختلفة ومسارات القضايا
      </p>

      {/* Main tab switcher */}
      <div className="flex gap-2 mb-5">
        {([
          { key: 'comparison' as MainTab, label: 'مقارنة الإجراءات', icon: '⚖️' },
          { key: 'flowchart' as MainTab, label: 'مسار القضية', icon: '🗺️' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMainTab(tab.key)}
            className={`flex-1 text-xs px-3 py-2.5 rounded-xl transition-all font-medium ${
              mainTab === tab.key
                ? 'bg-[#1a3a5c] text-white dark:bg-[#f0c040] dark:text-[#1a3a5c]'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Comparison Tab ─── */}
      {mainTab === 'comparison' && (
        <div className="space-y-4">
          {/* Dropdown selector */}
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">اختر المقارنة</label>
            <select
              value={selectedComparison}
              onChange={(e) => setSelectedComparison(e.target.value)}
              className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0891b2]/40 appearance-none"
            >
              {COMPARISONS.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          {/* Comparison table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_1fr_1fr] bg-[#0891b2] text-white">
              <div className="px-3 py-2.5 text-xs font-bold text-center">الجانب</div>
              <div className="px-3 py-2.5 text-xs font-bold text-center border-r border-cyan-700/50 border-l border-cyan-700/50">
                {activeComparison.colA}
              </div>
              <div className="px-3 py-2.5 text-xs font-bold text-center">{activeComparison.colB}</div>
            </div>

            {/* Rows */}
            {activeComparison.items.map((item, i) => (
              <div
                key={i}
                className={`grid grid-cols-[1fr_1fr_1fr] border-t border-gray-100 dark:border-gray-700 ${
                  i % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-700/20'
                }`}
              >
                <div className="px-3 py-2.5 text-xs font-semibold text-[#1a3a5c] dark:text-[#f0c040] flex items-center">
                  {item.aspect}
                </div>
                <div className="px-3 py-2.5 text-xs text-gray-700 dark:text-gray-300 border-r border-gray-100 dark:border-gray-700/50 border-l border-gray-100 dark:border-gray-700/50 leading-relaxed">
                  {item.civil}
                </div>
                <div className="px-3 py-2.5 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                  {item.penal}
                </div>
              </div>
            ))}
          </div>

          {/* Quick reference chips */}
          <div className="bg-cyan-50 dark:bg-cyan-900/15 border border-cyan-200 dark:border-cyan-800 rounded-xl p-3">
            <p className="text-[11px] font-bold text-cyan-700 dark:text-cyan-400 mb-2">آجال الطعن الرئيسية</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'معارضة مدنية', value: '10 أيام' },
                { label: 'استئناف مدني', value: 'شهر' },
                { label: 'استئناف جزائي', value: '10 أيام' },
                { label: 'نقض مدني', value: 'شهران' },
                { label: 'نقض جزائي', value: '8 أيام' },
                { label: 'التظلم الإداري', value: 'شهران' },
                { label: 'الدعوى الإدارية', value: '4 أشهر' },
              ].map((chip, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-cyan-200 dark:border-cyan-800 rounded-lg px-2 py-1"
                >
                  <span className="text-[10px] text-gray-600 dark:text-gray-400">{chip.label}:</span>
                  <span className="text-[10px] font-bold text-cyan-700 dark:text-cyan-400">{chip.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Flowchart Tab ─── */}
      {mainTab === 'flowchart' && (
        <div className="space-y-4">
          {/* Flow type selector */}
          <div className="flex gap-2">
            {([
              { key: 'civil' as FlowchartType, label: 'القضية المدنية', icon: '⚖️' },
              { key: 'penal' as FlowchartType, label: 'القضية الجزائية', icon: '⚔️' },
            ] as const).map((type) => (
              <button
                key={type.key}
                onClick={() => setFlowType(type.key)}
                className={`flex-1 text-xs px-3 py-2 rounded-xl transition-all font-medium ${
                  flowType === type.key
                    ? 'bg-[#0891b2] text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                }`}
              >
                {type.icon} {type.label}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2">
            {[
              { color: 'bg-[#0891b2]', label: 'بداية / انطلاق' },
              { color: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600', label: 'مرحلة عادية', text: 'text-gray-700 dark:text-gray-200' },
              { color: 'bg-gray-100 dark:bg-gray-700 border border-dashed border-gray-300 dark:border-gray-600', label: 'مرحلة اختيارية', text: 'text-gray-600 dark:text-gray-300' },
              { color: 'bg-amber-500', label: 'فرع / اختيار' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded ${item.color}`} />
                <span className="text-[10px] text-gray-500 dark:text-gray-400">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Flowchart — vertical layout */}
          <div className="space-y-1">
            {activeFlow.map((step, i) => (
              <div key={i} className="flex flex-col items-center">
                {/* Step box */}
                <div className={`w-full rounded-xl border px-4 py-3 ${stepStyle(step.type)}`}>
                  <div className="flex items-center gap-2">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      step.type === 'start' ? 'bg-white/20 text-white' :
                      step.type === 'branch' ? 'bg-white/20 text-white' :
                      step.type === 'optional' ? 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400' :
                      'bg-[#0891b2]/10 text-[#0891b2] dark:bg-cyan-900/30 dark:text-cyan-400'
                    }`}>
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-xs font-bold">{step.label}</div>
                      {step.sub && (
                        <div className={`text-[10px] mt-0.5 ${
                          step.type === 'start' || step.type === 'branch'
                            ? 'text-white/80'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}>
                          {step.sub}
                        </div>
                      )}
                    </div>
                    {step.type === 'optional' && (
                      <span className="mr-auto text-[9px] bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full">
                        اختياري
                      </span>
                    )}
                  </div>
                </div>

                {/* Arrow connector */}
                {i < activeFlow.length - 1 && (
                  <div className="flex flex-col items-center py-0.5">
                    <div className="w-0.5 h-4 bg-[#0891b2]/40 dark:bg-cyan-700/40" />
                    <div className="text-[#0891b2]/60 dark:text-cyan-700/60 text-xs leading-none">▼</div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Timeline summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h4 className="text-xs font-bold text-[#1a3a5c] dark:text-[#f0c040] mb-3">
              {flowType === 'civil' ? '⏱️ الآجال الرئيسية للدعوى المدنية' : '⏱️ الآجال الرئيسية للدعوى الجزائية'}
            </h4>
            {flowType === 'civil' ? (
              <div className="space-y-1.5">
                {[
                  { label: 'أجل الاستئناف', value: 'شهر من التبليغ (م.336 ق.إ.م.إ)' },
                  { label: 'أجل المعارضة', value: '10 أيام من التبليغ (م.329)' },
                  { label: 'أجل النقض', value: 'شهران من التبليغ (م.354)' },
                  { label: 'أجل التنفيذ', value: 'بعد انقضاء أجل الطعن أو قرار الاستئناف' },
                ].map((t, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 text-xs">
                    <span className="text-gray-600 dark:text-gray-400">{t.label}</span>
                    <span className="font-semibold text-[#0891b2] dark:text-cyan-400 text-left">{t.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1.5">
                {[
                  { label: 'أجل الاستئناف الجزائي', value: '10 أيام من النطق بالحكم (م.418)' },
                  { label: 'أجل الطعن بالنقض', value: '8 أيام من النطق (م.498)' },
                  { label: 'الحبس المؤقت (أقصى مدة)', value: '4 أشهر قابلة للتجديد (م.123)' },
                  { label: 'أجل التحقيق', value: 'حسب تعقيد القضية وغرفة الاتهام' },
                ].map((t, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 text-xs">
                    <span className="text-gray-600 dark:text-gray-400">{t.label}</span>
                    <span className="font-semibold text-[#0891b2] dark:text-cyan-400 text-left">{t.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
