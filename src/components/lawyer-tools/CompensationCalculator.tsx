'use client';

import { useState } from 'react';

/* ─────────────────────── Types ─────────────────────── */

type ActiveTab = 'physical' | 'interest';

interface PhysicalInputs {
  ipp: string;
  age: string;
  salary: string;
  sickDays: string;
  medicalCosts: string;
}

interface InterestInputs {
  principal: string;
  startDate: string;
  endDate: string;
}

interface PhysicalResult {
  pointValue: number;
  permanentDisability: number;
  sickDayCompensation: number;
  medicalCosts: number;
  moralDamageMin: number;
  moralDamageMax: number;
  totalMin: number;
  totalMax: number;
}

interface InterestResult {
  principal: number;
  days: number;
  interest: number;
  total: number;
}

/* ─────────────────────── Helpers ─────────────────────── */

function getPointValue(age: number): number {
  if (age < 20) return 1_500_000;
  if (age <= 30) return 1_200_000;
  if (age <= 40) return 1_000_000;
  if (age <= 50) return 800_000;
  if (age <= 60) return 600_000;
  return 400_000;
}

function getMoralDamage(ipp: number): { min: number; max: number } {
  if (ipp < 10) return { min: 100_000, max: 300_000 };
  if (ipp <= 30) return { min: 300_000, max: 800_000 };
  if (ipp <= 50) return { min: 800_000, max: 2_000_000 };
  return { min: 2_000_000, max: 5_000_000 };
}

function formatDZD(amount: number): string {
  return new Intl.NumberFormat('ar-DZ', { maximumFractionDigits: 0 }).format(amount) + ' دج';
}

function daysBetween(d1: string, d2: string): number {
  const t1 = new Date(d1).getTime();
  const t2 = new Date(d2).getTime();
  if (isNaN(t1) || isNaN(t2)) return 0;
  return Math.max(0, Math.floor((t2 - t1) / (1000 * 60 * 60 * 24)));
}

/* ─────────────────────── Component ─────────────────────── */

export default function CompensationCalculator({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('physical');

  /* ── Physical inputs ── */
  const [physInputs, setPhysInputs] = useState<PhysicalInputs>({
    ipp: '',
    age: '',
    salary: '',
    sickDays: '',
    medicalCosts: '',
  });
  const [physResult, setPhysResult] = useState<PhysicalResult | null>(null);
  const [physCopied, setPhysCopied] = useState(false);

  /* ── Interest inputs ── */
  const [intInputs, setIntInputs] = useState<InterestInputs>({
    principal: '',
    startDate: '',
    endDate: new Date().toISOString().split('T')[0],
  });
  const [intResult, setIntResult] = useState<InterestResult | null>(null);
  const [intCopied, setIntCopied] = useState(false);

  /* ── Physical calculation ── */
  function calculatePhysical() {
    const ipp = parseFloat(physInputs.ipp);
    const age = parseInt(physInputs.age, 10);
    const salary = parseFloat(physInputs.salary) || 0;
    const sickDays = parseFloat(physInputs.sickDays) || 0;
    const medicalCosts = parseFloat(physInputs.medicalCosts) || 0;

    if (isNaN(ipp) || isNaN(age) || ipp < 0 || ipp > 100 || age <= 0) return;

    const pointValue = getPointValue(age);
    const permanentDisability = (ipp / 100) * pointValue * ipp; // IPP% × point_value × IPP (standard formula)
    const sickDayCompensation = sickDays * (salary / 30);
    const moral = getMoralDamage(ipp);

    setPhysResult({
      pointValue,
      permanentDisability,
      sickDayCompensation,
      medicalCosts,
      moralDamageMin: moral.min,
      moralDamageMax: moral.max,
      totalMin: permanentDisability + sickDayCompensation + medicalCosts + moral.min,
      totalMax: permanentDisability + sickDayCompensation + medicalCosts + moral.max,
    });
  }

  function copyPhysical() {
    if (!physResult) return;
    const text = [
      'حاسبة التعويض عن الأضرار الجسدية',
      '─────────────────────────',
      `نسبة العجز: ${physInputs.ipp}%`,
      `العمر: ${physInputs.age} سنة`,
      `الراتب الشهري: ${formatDZD(parseFloat(physInputs.salary) || 0)}`,
      '',
      'التفاصيل:',
      `• قيمة النقطة المرجعية (point d'IPP): ${formatDZD(physResult.pointValue)}`,
      `• التعويض عن العجز الدائم: ${formatDZD(physResult.permanentDisability)}`,
      `• تعويض الأيام المرضية (${physInputs.sickDays} يوم): ${formatDZD(physResult.sickDayCompensation)}`,
      `• مصاريف العلاج: ${formatDZD(physResult.medicalCosts)}`,
      `• الضرر المعنوي (Pretium Doloris): ${formatDZD(physResult.moralDamageMin)} - ${formatDZD(physResult.moralDamageMax)}`,
      '',
      `الإجمالي المقدر: ${formatDZD(physResult.totalMin)} - ${formatDZD(physResult.totalMax)}`,
      '',
      'تنبيه: هذه القيم تقديرية وتختلف حسب السلطة التقديرية للقاضي',
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setPhysCopied(true);
      setTimeout(() => setPhysCopied(false), 2000);
    }).catch(() => {});
  }

  /* ── Interest calculation ── */
  function calculateInterest() {
    const principal = parseFloat(intInputs.principal);
    if (isNaN(principal) || principal <= 0) return;
    const days = daysBetween(intInputs.startDate, intInputs.endDate);
    const interest = principal * 0.03 * (days / 365);
    setIntResult({ principal, days, interest, total: principal + interest });
  }

  function copyInterest() {
    if (!intResult) return;
    const text = [
      'حاسبة الفوائد القانونية',
      '─────────────────────────',
      `المبلغ الأصلي: ${formatDZD(intResult.principal)}`,
      `تاريخ المطالبة: ${intInputs.startDate}`,
      `تاريخ الحساب: ${intInputs.endDate}`,
      `عدد الأيام: ${intResult.days} يوم`,
      `نسبة الفائدة: 3% سنوياً (م.186 ق.م)`,
      `الفوائد: ${formatDZD(intResult.interest)}`,
      `─────────────────────────`,
      `المجموع الإجمالي: ${formatDZD(intResult.total)}`,
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setIntCopied(true);
      setTimeout(() => setIntCopied(false), 2000);
    }).catch(() => {});
  }

  const physValid =
    physInputs.ipp !== '' &&
    physInputs.age !== '' &&
    !isNaN(parseFloat(physInputs.ipp)) &&
    !isNaN(parseInt(physInputs.age, 10)) &&
    parseFloat(physInputs.ipp) >= 0 &&
    parseFloat(physInputs.ipp) <= 100 &&
    parseInt(physInputs.age, 10) > 0;

  const intValid =
    intInputs.principal !== '' &&
    !isNaN(parseFloat(intInputs.principal)) &&
    parseFloat(intInputs.principal) > 0 &&
    intInputs.startDate !== '' &&
    intInputs.endDate !== '';

  /* ── Render ── */
  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-[#1a3a5c] dark:text-[#f0c040] text-lg font-bold">→</button>
        <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">⚖️ حاسبة التعويضات والفوائد القانونية</h2>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
        حساب التعويضات وفق القانون المدني (م.124 مكرر، م.182، المرسوم 19-300) والفوائد القانونية (م.186 ق.م)
      </p>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-5">
        {([
          { key: 'physical' as ActiveTab, label: 'التعويض الجسدي', icon: '🩺' },
          { key: 'interest' as ActiveTab, label: 'الفوائد القانونية', icon: '📊' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 text-xs px-3 py-2.5 rounded-xl transition-all font-medium ${
              activeTab === tab.key
                ? 'bg-[#1a3a5c] text-white dark:bg-[#f0c040] dark:text-[#1a3a5c]'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Physical Compensation Tab ─── */}
      {activeTab === 'physical' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3">
            <h3 className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040] mb-1">بيانات المصاب</h3>

            {/* IPP + Age row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">نسبة العجز الدائم (IPP) %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="مثال: 25"
                  value={physInputs.ipp}
                  onChange={(e) => setPhysInputs({ ...physInputs, ipp: e.target.value })}
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#059669]/40"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">العمر (سنة)</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  placeholder="مثال: 35"
                  value={physInputs.age}
                  onChange={(e) => setPhysInputs({ ...physInputs, age: e.target.value })}
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#059669]/40"
                />
              </div>
            </div>

            {/* Salary */}
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">الراتب الشهري (دج)</label>
              <input
                type="number"
                min="0"
                placeholder="مثال: 45000"
                value={physInputs.salary}
                onChange={(e) => setPhysInputs({ ...physInputs, salary: e.target.value })}
                className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#059669]/40"
              />
            </div>

            {/* Sick days + Medical */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">عدد الأيام المرضية</label>
                <input
                  type="number"
                  min="0"
                  placeholder="مثال: 90"
                  value={physInputs.sickDays}
                  onChange={(e) => setPhysInputs({ ...physInputs, sickDays: e.target.value })}
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#059669]/40"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">مصاريف العلاج (دج)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="مثال: 150000"
                  value={physInputs.medicalCosts}
                  onChange={(e) => setPhysInputs({ ...physInputs, medicalCosts: e.target.value })}
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#059669]/40"
                />
              </div>
            </div>

            <button
              onClick={calculatePhysical}
              disabled={!physValid}
              className="w-full py-2.5 bg-[#059669] hover:bg-[#047857] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
            >
              🧮 احسب التعويض
            </button>
          </div>

          {/* Point value reference table */}
          <div className="bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3">
            <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mb-2">جدول قيم النقطة المرجعية حسب الممارسة القضائية الجزائرية</p>
            <div className="grid grid-cols-3 gap-1">
              {[
                { label: 'أقل من 20 سنة', value: '1,500,000 دج' },
                { label: '20 – 30 سنة', value: '1,200,000 دج' },
                { label: '30 – 40 سنة', value: '1,000,000 دج' },
                { label: '40 – 50 سنة', value: '800,000 دج' },
                { label: '50 – 60 سنة', value: '600,000 دج' },
                { label: 'أكثر من 60 سنة', value: '400,000 دج' },
              ].map((row, i) => (
                <div key={i} className="text-center bg-white/60 dark:bg-gray-800/40 rounded-lg p-1.5">
                  <div className="text-[10px] text-gray-600 dark:text-gray-400">{row.label}</div>
                  <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">{row.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Results */}
          {physResult && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-[#059669]/30 dark:border-emerald-700/40 overflow-hidden">
              <div className="bg-[#059669] px-4 py-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">نتيجة الحساب</h3>
                <span className="text-xs text-emerald-100">م.124 مكرر، م.182 ق.م</span>
              </div>

              <div className="p-4 space-y-2">
                {[
                  {
                    label: `قيمة النقطة المرجعية (العمر: ${physInputs.age} سنة)`,
                    value: formatDZD(physResult.pointValue),
                    sub: "point d'IPP",
                    highlight: false,
                  },
                  {
                    label: `التعويض عن العجز الدائم (${physInputs.ipp}%)`,
                    value: formatDZD(physResult.permanentDisability),
                    sub: 'نسبة العجز × نقطة IPP × نسبة العجز',
                    highlight: false,
                  },
                  {
                    label: `تعويض الأيام المرضية (${physInputs.sickDays || 0} يوم)`,
                    value: formatDZD(physResult.sickDayCompensation),
                    sub: 'عدد الأيام × (الراتب / 30)',
                    highlight: false,
                  },
                  {
                    label: 'مصاريف العلاج',
                    value: formatDZD(physResult.medicalCosts),
                    sub: 'حسب المدخل',
                    highlight: false,
                  },
                  {
                    label: `الضرر المعنوي (Pretium Doloris) — نسبة ${physInputs.ipp}%`,
                    value: `${formatDZD(physResult.moralDamageMin)} - ${formatDZD(physResult.moralDamageMax)}`,
                    sub: 'تقديري حسب نسبة العجز',
                    highlight: false,
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div>
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.label}</div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{item.sub}</div>
                    </div>
                    <div className="text-xs font-bold text-[#059669] dark:text-emerald-400 text-left whitespace-nowrap">{item.value}</div>
                  </div>
                ))}

                {/* Total */}
                <div className="mt-2 pt-2 border-t-2 border-[#059669]/30 dark:border-emerald-700/40">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100">المجموع الإجمالي المقدر</span>
                    <div className="text-left">
                      <div className="text-sm font-bold text-[#059669] dark:text-emerald-400">
                        {formatDZD(physResult.totalMin)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        إلى {formatDZD(physResult.totalMax)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Copy button */}
                <button
                  onClick={copyPhysical}
                  className="w-full mt-2 py-2 bg-[#1a3a5c] dark:bg-[#f0c040] text-white dark:text-[#1a3a5c] rounded-lg text-xs font-medium transition-all active:scale-[0.98]"
                >
                  {physCopied ? '✅ تم النسخ' : '📋 نسخ النتائج'}
                </button>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
            <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
              ⚠️ هذه القيم تقديرية وتختلف حسب السلطة التقديرية للقاضي. الحساب مبني على الممارسة القضائية الجزائرية الشائعة ولا يُعدّ إلزامياً.
            </p>
          </div>
        </div>
      )}

      {/* ─── Interest Tab ─── */}
      {activeTab === 'interest' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040]">الفوائد القانونية</h3>
              <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full">م.186 ق.م — 3% سنوياً</span>
            </div>

            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">المبلغ المحكوم به (دج)</label>
              <input
                type="number"
                min="0"
                placeholder="مثال: 500000"
                value={intInputs.principal}
                onChange={(e) => setIntInputs({ ...intInputs, principal: e.target.value })}
                className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#059669]/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">تاريخ المطالبة القضائية</label>
                <input
                  type="date"
                  value={intInputs.startDate}
                  onChange={(e) => setIntInputs({ ...intInputs, startDate: e.target.value })}
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#059669]/40"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">تاريخ الحساب</label>
                <input
                  type="date"
                  value={intInputs.endDate}
                  onChange={(e) => setIntInputs({ ...intInputs, endDate: e.target.value })}
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#059669]/40"
                />
              </div>
            </div>

            <button
              onClick={calculateInterest}
              disabled={!intValid}
              className="w-full py-2.5 bg-[#059669] hover:bg-[#047857] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
            >
              🧮 احسب الفوائد
            </button>
          </div>

          {/* Interest info box */}
          <div className="bg-blue-50 dark:bg-blue-900/15 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
            <p className="text-[11px] font-bold text-blue-700 dark:text-blue-400 mb-1">نسبة الفائدة القانونية في الجزائر</p>
            <p className="text-[11px] text-blue-600 dark:text-blue-300 leading-relaxed">
              حددت المادة 186 من القانون المدني الجزائري نسبة الفائدة القانونية بـ <strong>3% سنوياً</strong>. تسري من تاريخ المطالبة القضائية وليس من تاريخ نشوء الحق، وتُحسب على المبلغ الأصلي المحكوم به.
            </p>
          </div>

          {/* Results */}
          {intResult && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-[#059669]/30 dark:border-emerald-700/40 overflow-hidden">
              <div className="bg-[#059669] px-4 py-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">نتيجة الحساب</h3>
                <span className="text-xs text-emerald-100">م.186 ق.م</span>
              </div>

              <div className="p-4 space-y-2">
                {[
                  { label: 'المبلغ الأصلي', value: formatDZD(intResult.principal), sub: '' },
                  { label: 'نسبة الفائدة', value: '3% سنوياً', sub: 'م.186 ق.م' },
                  { label: 'عدد الأيام', value: `${intResult.days} يوم`, sub: `من ${intInputs.startDate} إلى ${intInputs.endDate}` },
                  {
                    label: 'الفوائد المستحقة',
                    value: formatDZD(intResult.interest),
                    sub: 'المبلغ × 3% × (الأيام / 365)',
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div>
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.label}</div>
                      {item.sub && <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{item.sub}</div>}
                    </div>
                    <div className="text-xs font-bold text-[#059669] dark:text-emerald-400 whitespace-nowrap">{item.value}</div>
                  </div>
                ))}

                {/* Total */}
                <div className="mt-2 pt-2 border-t-2 border-[#059669]/30 dark:border-emerald-700/40 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-100">المجموع الإجمالي</span>
                  <span className="text-base font-extrabold text-[#059669] dark:text-emerald-400">
                    {formatDZD(intResult.total)}
                  </span>
                </div>

                <button
                  onClick={copyInterest}
                  className="w-full mt-2 py-2 bg-[#1a3a5c] dark:bg-[#f0c040] text-white dark:text-[#1a3a5c] rounded-lg text-xs font-medium transition-all active:scale-[0.98]"
                >
                  {intCopied ? '✅ تم النسخ' : '📋 نسخ النتائج'}
                </button>
              </div>
            </div>
          )}

          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
            <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
              ⚠️ هذا الحساب تقديري. قد تختلف النسبة بموجب قوانين المالية اللاحقة أو القوانين الخاصة. راجع آخر تحديثات قانون المالية.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
