'use client';

import { useState, useRef } from 'react';

/* ─────────────────────── Types ─────────────────────── */

interface MemoDraft {
  title: string;
  header: string;
  body: string;
  conclusion: string;
  legalBasis: string[];
}

type MemoType = 'response' | 'closing' | 'appeal_cassation' | 'appeal' | 'objection' | 'opening';

interface FormData {
  memoType: MemoType;
  court: string;
  plaintiff: string;
  defendant: string;
  facts: string;
  requests: string;
  legalBasis: string;
  lawyerName: string;
}

const MEMO_TYPES: { key: MemoType; label: string; icon: string; desc: string }[] = [
  { key: 'response', label: 'مذكرة جوابية', icon: '↩️', desc: 'رداً على مذكرة الطرف الآخر' },
  { key: 'closing', label: 'مذكرة ختامية', icon: '🏁', desc: 'في ختام المرافعات' },
  { key: 'appeal', label: 'مذكرة استئناف', icon: '⬆️', desc: 'للطعن في حكم ابتدائي' },
  { key: 'appeal_cassation', label: 'مذكرة نقض', icon: '🔝', desc: 'للطعن أمام المحكمة العليا' },
  { key: 'objection', label: 'مذكرة معارضة', icon: '🚫', desc: 'ضد حكم غيابي' },
  { key: 'opening', label: 'مذكرة افتتاحية', icon: '📖', desc: 'في بداية الدعوى' },
];

/* ─────────────────────── Progress Steps ─────────────────────── */

const PROGRESS_STEPS = [
  'تحليل بيانات القضية...',
  'استنباط الأسانيد القانونية المناسبة...',
  'صياغة ترويسة المذكرة...',
  'كتابة الوقائع والحيثيات...',
  'صياغة الحجج القانونية...',
  'إعداد الخاتمة والطلبات...',
  'مراجعة المذكرة النهائية...',
];

/* ─────────────────────── Component ─────────────────────── */

export default function MemoDrafter({ onBack }: { onBack: () => void }) {
  const [formData, setFormData] = useState<FormData>({
    memoType: 'response',
    court: '',
    plaintiff: '',
    defendant: '',
    facts: '',
    requests: '',
    legalBasis: '',
    lawyerName: '',
  });
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [memo, setMemo] = useState<MemoDraft | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Progress ── */
  function startProgress() {
    setProgressStep(0);
    let step = 0;
    progressInterval.current = setInterval(() => {
      step++;
      if (step < PROGRESS_STEPS.length) setProgressStep(step);
    }, 2500);
  }

  function stopProgress() {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }

  /* ── Submit ── */
  async function generateMemo() {
    setLoading(true);
    setError(null);
    setMemo(null);
    startProgress();

    try {
      const res = await fetch('/api/memo-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const resText = await res.text();
      let data;
      try {
        data = JSON.parse(resText);
      } catch {
        throw new Error(resText.slice(0, 200) || '');
      }
      if (!res.ok || data.error) throw new Error(data.error || 'حدث خطأ أثناء الصياغة');
      if (!data.memo) throw new Error('لم يتم الحصول على نتائج الصياغة');
      setMemo(data.memo as MemoDraft);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      stopProgress();
      setLoading(false);
    }
  }

  /* ── Copy ── */
  function copyFullMemo() {
    if (!memo) return;
    const fullText = [
      memo.header,
      '',
      memo.title,
      '',
      memo.body,
      '',
      memo.conclusion,
      '',
      '─'.repeat(50),
      '⚠️ تنبيه: هذه المذكرة للإرشاد فقط وتستوجب مراجعة المحامي قبل الاستخدام الفعلي.',
    ].join('\n');
    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function copySectionText(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSection(key);
      setTimeout(() => setCopiedSection(null), 1500);
    });
  }

  /* ── Form update ── */
  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData(prev => ({ ...prev, [key]: value }));
  }

  /* ── Validate ── */
  const isValid = formData.court.trim() && formData.plaintiff.trim() && formData.defendant.trim() &&
    formData.facts.trim() && formData.requests.trim();

  /* ── Reset ── */
  function reset() {
    setMemo(null);
    setError(null);
  }

  /* ─────────────────────── Render ─────────────────────── */

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-[#1a3a5c] dark:text-[#f0c040] text-lg">→</button>
        <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">✍️ مساعد صياغة المذكرات</h2>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
        أدخل بيانات القضية وسيقوم الذكاء الاصطناعي بصياغة مذكرة قانونية كاملة وفق الأسلوب القانوني الجزائري المعتمد.
      </p>

      <div className="flex items-start gap-2 bg-green-50 dark:bg-green-900/15 border border-green-200 dark:border-green-800 rounded-xl p-3 mb-4">
        <span className="text-sm flex-shrink-0 mt-0.5">🔒</span>
        <p className="text-[11px] text-green-700 dark:text-green-400 leading-relaxed">
          خصوصيتك محمية: لا يتم حفظ بيانات القضية على أي سيرفر. يتم معالجتها فورياً ثم حذفها تلقائياً.
        </p>
      </div>

      {/* Form */}
      {!memo && !loading && (
        <div className="space-y-4">
          {/* Memo Type */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
              نوع المذكرة <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {MEMO_TYPES.map(mt => (
                <button
                  key={mt.key}
                  type="button"
                  onClick={() => updateField('memoType', mt.key)}
                  className={`text-right p-3 rounded-xl border transition-all ${
                    formData.memoType === mt.key
                      ? 'bg-[#6d28d9] border-[#6d28d9] text-white'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-[#6d28d9]/50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-base">{mt.icon}</span>
                    <span className="text-xs font-bold">{mt.label}</span>
                  </div>
                  <p className={`text-[10px] ${formData.memoType === mt.key ? 'text-purple-200' : 'text-gray-400 dark:text-gray-500'}`}>
                    {mt.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Court */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              اسم المحكمة <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.court}
              onChange={e => updateField('court', e.target.value)}
              placeholder="مثال: المحكمة الابتدائية بالجزائر العاصمة"
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#6d28d9] dark:focus:border-purple-500 transition-colors"
            />
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                المدعي / الطاعن <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.plaintiff}
                onChange={e => updateField('plaintiff', e.target.value)}
                placeholder="الاسم الكامل"
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#6d28d9] dark:focus:border-purple-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                المدعى عليه <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.defendant}
                onChange={e => updateField('defendant', e.target.value)}
                placeholder="الاسم الكامل"
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#6d28d9] dark:focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          {/* Facts */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              ملخص وقائع القضية <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.facts}
              onChange={e => updateField('facts', e.target.value)}
              placeholder="اكتب ملخصاً واضحاً لوقائع القضية: ما حدث، متى، وكيف..."
              rows={4}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#6d28d9] dark:focus:border-purple-500 transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Requests */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              الطلبات <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.requests}
              onChange={e => updateField('requests', e.target.value)}
              placeholder="حدد الطلبات بدقة: ما الذي تطلبه من المحكمة؟ (رفض الدعوى، الحكم بالتعويض، إلغاء الحكم المستأنف...)"
              rows={3}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#6d28d9] dark:focus:border-purple-500 transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Legal Basis (optional) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              الأسانيد القانونية
              <span className="text-gray-400 dark:text-gray-500 font-normal mr-1">(اختياري — سيستنبطها الذكاء الاصطناعي تلقائياً)</span>
            </label>
            <textarea
              value={formData.legalBasis}
              onChange={e => updateField('legalBasis', e.target.value)}
              placeholder="مثال: م.106 ق.م، م.123 ق.م، م.336 ق.إ.م.إ..."
              rows={2}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#6d28d9] dark:focus:border-purple-500 transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Lawyer Name (optional) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              اسم المحامي
              <span className="text-gray-400 dark:text-gray-500 font-normal mr-1">(اختياري)</span>
            </label>
            <input
              type="text"
              value={formData.lawyerName}
              onChange={e => updateField('lawyerName', e.target.value)}
              placeholder="مثال: الأستاذ محمد بن يوسف"
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#6d28d9] dark:focus:border-purple-500 transition-colors"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              <button onClick={() => setError(null)} className="text-xs text-red-500 dark:text-red-400 underline mt-1">
                حاول مرة أخرى
              </button>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={generateMemo}
            disabled={!isValid}
            className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              isValid
                ? 'bg-[#6d28d9] hover:bg-[#5b21b6] text-white active:scale-[0.98]'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            <span>✍️</span>
            <span>صياغة المذكرة تلقائياً</span>
          </button>

          <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
            الحقول المعلّمة بـ <span className="text-red-500">*</span> إلزامية
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full border-2 border-[#6d28d9] border-t-transparent animate-spin" />
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">جاري صياغة المذكرة...</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{PROGRESS_STEPS[progressStep]}</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-[#6d28d9] rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(((progressStep + 1) / PROGRESS_STEPS.length) * 90, 90)}%` }}
            />
          </div>
          <div className="mt-4 space-y-1.5">
            {PROGRESS_STEPS.map((step, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 text-xs transition-all duration-500 ${
                  i < progressStep ? 'text-green-600 dark:text-green-400' :
                  i === progressStep ? 'text-[#6d28d9] dark:text-purple-400 font-medium' :
                  'text-gray-300 dark:text-gray-600'
                }`}
              >
                <span className="flex-shrink-0">{i < progressStep ? '✅' : i === progressStep ? '⏳' : '○'}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Memo Result */}
      {memo && (
        <div className="space-y-4">
          {/* Title card */}
          <div className="bg-[#6d28d9] dark:bg-[#6d28d9]/80 rounded-xl p-4 text-white">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-purple-200 text-[10px] mb-1">المذكرة المُصاغة</p>
                <h3 className="font-bold text-base leading-relaxed">{memo.title}</h3>
              </div>
              <span className="text-3xl opacity-80">✍️</span>
            </div>
          </div>

          {/* Header */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
              <h4 className="text-xs font-bold text-[#1a3a5c] dark:text-[#f0c040]">الترويسة</h4>
              <button
                onClick={() => copySectionText(memo.header, 'header')}
                className="text-[10px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {copiedSection === 'header' ? '✅ تم' : '📋 نسخ'}
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-loose whitespace-pre-wrap font-medium">{memo.header}</p>
            </div>
          </div>

          {/* Body */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
              <h4 className="text-xs font-bold text-[#1a3a5c] dark:text-[#f0c040]">نص المذكرة</h4>
              <button
                onClick={() => copySectionText(memo.body, 'body')}
                className="text-[10px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {copiedSection === 'body' ? '✅ تم' : '📋 نسخ'}
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-loose whitespace-pre-wrap">{memo.body}</p>
            </div>
          </div>

          {/* Conclusion */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
              <h4 className="text-xs font-bold text-[#1a3a5c] dark:text-[#f0c040]">الخاتمة والطلبات</h4>
              <button
                onClick={() => copySectionText(memo.conclusion, 'conclusion')}
                className="text-[10px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {copiedSection === 'conclusion' ? '✅ تم' : '📋 نسخ'}
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-loose whitespace-pre-wrap font-medium">{memo.conclusion}</p>
            </div>
          </div>

          {/* Legal Basis */}
          {memo.legalBasis && memo.legalBasis.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040] mb-2">📚 الأسانيد القانونية المستند إليها</h4>
              <div className="flex flex-wrap gap-2">
                {memo.legalBasis.map((basis, i) => (
                  <span
                    key={i}
                    className="text-xs px-3 py-1.5 bg-[#6d28d9]/10 dark:bg-purple-900/30 text-[#6d28d9] dark:text-purple-300 rounded-full border border-[#6d28d9]/20 dark:border-purple-700/50"
                  >
                    {basis}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3">
            <p className="text-[10px] text-yellow-700 dark:text-yellow-400 leading-relaxed">
              ⚠️ تنبيه: هذه المذكرة مُصاغة بالذكاء الاصطناعي للإرشاد فقط. يجب على المحامي مراجعتها وتعديلها قبل استخدامها الفعلي أمام المحكمة.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={copyFullMemo}
              className="flex-1 py-2.5 bg-[#6d28d9] hover:bg-[#5b21b6] text-white rounded-xl text-sm font-medium transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
            >
              <span>{copied ? '✅' : '📋'}</span>
              <span>{copied ? 'تم النسخ' : 'نسخ المذكرة كاملة'}</span>
            </button>
            <button
              onClick={reset}
              className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 transition-all active:scale-[0.98]"
            >
              🔄 صياغة مذكرة أخرى
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
