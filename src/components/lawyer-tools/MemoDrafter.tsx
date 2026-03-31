'use client';

import { useState } from 'react';

/* ─────────────────────── Types ─────────────────────── */

type MemoType = 'response' | 'closing' | 'appeal' | 'appeal_cassation' | 'objection' | 'opening';

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

/* ─────────────────────── Templates ─────────────────────── */

function generateMemo(data: FormData): string {
  const today = new Date().toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric' });
  const lawyerLine = data.lawyerName ? data.lawyerName : 'الأستاذ / ...........';
  const legalBasisLine = data.legalBasis.trim()
    ? data.legalBasis.trim()
    : 'المبادئ العامة للقانون المدني والإجرائي الجزائري';

  switch (data.memoType) {
    case 'response':
      return `الجمهورية الجزائرية الديمقراطية الشعبية
وزارة العدل

مذكرة جوابية

لدى ${data.court}
في القضية رقم: .......................

لفائدة المدعى عليه / الطرف المجيب: ${data.defendant}
ضد المدعي: ${data.plaintiff}

الموضوع: مذكرة جوابية على عريضة المدعي

سيدي الرئيس، حضرات السادة القضاة،

يتشرف الدفاع باسم موكله المدعى عليه السيد / السيدة ${data.defendant}، بتقديم هذه المذكرة الجوابية على العريضة الافتتاحية للمدعي، موضحاً ما يلي:

أولاً — في الشكل:
يلتمس الدفاع من المحكمة الموقرة التصريح بعدم قبول الدعوى شكلاً لـ[يكمل المحامي]، أو على الأقل قبولها لأنها استوفت الشروط الشكلية المقررة قانوناً.

ثانياً — في الوقائع:
${data.facts}

ثالثاً — في القانون:
استناداً إلى ${legalBasisLine}،
يؤكد الدفاع أن ادعاءات المدعي لا سند لها من القانون ولا من الواقع، وذلك للأسباب التالية:
[يفصّل المحامي حججه القانونية]

لهذه الأسباب مجتمعةً:
يلتمس الدفاع من المحكمة الموقرة التفضل بالقضاء:
${data.requests}

وتقبلوا منا فائق الاحترام والتقدير.

الجزائر في: ${today}
المحامي
${lawyerLine}`;

    case 'closing':
      return `الجمهورية الجزائرية الديمقراطية الشعبية
وزارة العدل

مذكرة ختامية

لدى ${data.court}
في القضية رقم: .......................

لفائدة: ${data.defendant}
ضد: ${data.plaintiff}

الموضوع: مذكرة ختامية في ختام المرافعات

سيدي الرئيس، حضرات السادة القضاة،

في ختام هذه المرافعات وتلخيصاً لما أُثير من وسائل دفاع، يتشرف الدفاع بتقديم هذه المذكرة الختامية:

أولاً — ملخص الوقائع:
${data.facts}

ثانياً — تدحيض حجج الخصم:
يؤكد الدفاع أن ما تمسك به الطرف الآخر من حجج لا يرتكز على سند قانوني أو واقعي صحيح، وذلك للأسباب التفصيلية المبينة في المذكرات السابقة.

ثالثاً — الموقف القانوني للدفاع:
بالرجوع إلى ${legalBasisLine}، يتضح جلياً أن موقف موكلنا هو الموقف السليم قانوناً وواقعاً.

للأسباب المذكورة أعلاه وفي المذكرات السابقة:
يلتمس الدفاع من المحكمة الموقرة التفضل بالقضاء:
${data.requests}

وتقبلوا منا فائق الاحترام والتقدير.

الجزائر في: ${today}
المحامي
${lawyerLine}`;

    case 'appeal':
      return `الجمهورية الجزائرية الديمقراطية الشعبية
وزارة العدل

مذكرة استئناف

لدى المجلس القضائي / ${data.court}
في القضية رقم: .......................

لفائدة المستأنف: ${data.defendant}
ضد المستأنف عليه: ${data.plaintiff}

الموضوع: استئناف الحكم الابتدائي الصادر عن ................... بتاريخ ...................

سيدي الرئيس، حضرات السادة القضاة،

يتقدم الدفاع عن المستأنف السيد / السيدة ${data.defendant} باستئنافه للحكم الابتدائي المذكور، مستنداً إلى الأسباب الآتية:

أولاً — ملخص وقائع النزاع:
${data.facts}

ثانياً — أسباب الاستئناف وعيوب الحكم المستأنف:
الوجه الأول: [يكتب المحامي أول وجه من أوجه الطعن]
الوجه الثاني: [يكتب المحامي الوجه الثاني]

إن المحكمة الابتدائية قد أخطأت في تطبيق القانون و/أو في تقدير الوقائع إذ:
[يفصّل المحامي]

ثالثاً — الأساس القانوني:
استناداً إلى ${legalBasisLine}، وإلى المادة 336 من قانون الإجراءات المدنية والإدارية.

لهذه الأسباب:
يلتمس الدفاع من المجلس القضائي الموقر التفضل بالقضاء:
${data.requests}

وتقبلوا منا فائق الاحترام والتقدير.

الجزائر في: ${today}
المحامي
${lawyerLine}`;

    case 'appeal_cassation':
      return `الجمهورية الجزائرية الديمقراطية الشعبية
وزارة العدل

مذكرة طعن بالنقض

لدى المحكمة العليا — ${data.court}
في القضية رقم: .......................

لفائدة الطاعن بالنقض: ${data.defendant}
ضد المطعون ضده: ${data.plaintiff}

الموضوع: مذكرة في الطعن بالنقض ضد القرار الصادر عن ................... بتاريخ ...................

سيدي الرئيس الأول، حضرات السادة المستشارين،

يتشرف الدفاع، المعتمد لدى المحكمة العليا، بتقديم هذه المذكرة في الطعن بالنقض المرفوع من موكله ضد القرار المطعون فيه، مستنداً إلى الأوجه الآتية:

أولاً — ملخص وقائع القضية:
${data.facts}

ثانياً — أوجه الطعن بالنقض:
الوجه الأول — مخالفة القانون:
يعيب الطاعن على القرار المطعون فيه مخالفته لـ[المادة...] إذ أن [يفصّل المحامي].

الوجه الثاني — القصور في التسبيب:
أغفل القرار الرد على الدفوع الجوهرية المقدمة من الطاعن، مما يجعله مشوباً بالقصور في التسبيب الموجب للنقض.

الوجه الثالث — [يضيف المحامي أوجهاً أخرى إن وجدت]

ثالثاً — الأساس القانوني:
استناداً إلى ${legalBasisLine}، وإلى المادتين 354 و358 ق.إ.م.إ.

لهذه الأسباب:
يلتمس الدفاع من المحكمة العليا الموقرة التفضل بـ:
نقض وإبطال القرار المطعون فيه و:
${data.requests}

وتقبلوا منا فائق الاحترام والتقدير.

الجزائر في: ${today}
المحامي المعتمد لدى المحكمة العليا
${lawyerLine}`;

    case 'objection':
      return `الجمهورية الجزائرية الديمقراطية الشعبية
وزارة العدل

مذكرة معارضة

لدى ${data.court}
في القضية رقم: .......................

لفائدة المعارض: ${data.defendant}
ضد: ${data.plaintiff}

الموضوع: معارضة في الحكم الغيابي الصادر بتاريخ ...................

سيدي الرئيس، حضرات السادة القضاة،

يتشرف الدفاع عن المعارض السيد / السيدة ${data.defendant} بتقديم هذه المعارضة في الحكم الغيابي الصادر ضده بتاريخ ...................، استناداً إلى المادتين 327–328 من قانون الإجراءات المدنية والإدارية.

أولاً — في الشكل:
المعارضة مقدمة في الأجل القانوني وعلى الشكل المقرر قانوناً، يتعين قبولها شكلاً.

ثانياً — في الموضوع:
الوقائع:
${data.facts}

الحجج القانونية:
استناداً إلى ${legalBasisLine}، يؤكد المعارض أن الحكم الغيابي الصادر ضده مبني على وقائع منقوصة وعلى تطبيق خاطئ للقانون.

لهذه الأسباب:
يلتمس الدفاع من المحكمة الموقرة التفضل بالقضاء:
في الشكل: قبول المعارضة شكلاً
في الموضوع:
${data.requests}

وتقبلوا منا فائق الاحترام والتقدير.

الجزائر في: ${today}
المحامي
${lawyerLine}`;

    case 'opening':
    default:
      return `الجمهورية الجزائرية الديمقراطية الشعبية
وزارة العدل

عريضة افتتاحية

لدى ${data.court}

لفائدة المدعي / الطالب: ${data.plaintiff}
ضد المدعى عليه / المطلوب: ${data.defendant}

الموضوع: دعوى قضائية في موضوع [يحدده المحامي]

سيدي الرئيس، حضرات السادة القضاة،

يتشرف الدفاع باسم موكله السيد / السيدة ${data.plaintiff} بعرض ما يلي:

أولاً — في الوقائع:
${data.facts}

ثانياً — في القانون:
استناداً إلى ${legalBasisLine}، وإلى المادة 15 من قانون الإجراءات المدنية والإدارية، يتضح جلياً أن المدعي يملك الصفة والمصلحة والأهلية للتقاضي وأن طلبه مؤسس قانوناً وواقعاً.

لهذه الأسباب:
يلتمس الدفاع من المحكمة الموقرة التفضل بالقضاء:
${data.requests}

مع احتفاظ الدفاع بحق تقديم مذكرات تكميلية عند الاقتضاء.

وتقبلوا منا فائق الاحترام والتقدير.

الجزائر في: ${today}
المحامي
${lawyerLine}`;
  }
}

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
  const [memo, setMemo] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData(prev => ({ ...prev, [key]: value }));
  }

  const isValid = formData.court.trim() && formData.plaintiff.trim() && formData.defendant.trim() &&
    formData.facts.trim() && formData.requests.trim();

  function handleGenerate() {
    if (!isValid) return;
    const text = generateMemo(formData);
    setMemo(text);
  }

  function copyMemo() {
    if (!memo) return;
    navigator.clipboard.writeText(memo).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function reset() {
    setMemo(null);
    setCopied(false);
  }

  if (memo) {
    return (
      <div className="max-w-2xl mx-auto" dir="rtl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="text-[#1a3a5c] dark:text-[#f0c040] text-lg">→</button>
          <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">✍️ قوالب المذكرات القانونية</h2>
        </div>

        {/* Title bar */}
        <div className="bg-[#6d28d9] dark:bg-[#6d28d9]/80 rounded-xl p-4 text-white mb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-purple-200 text-[10px] mb-1">المذكرة المُنشأة</p>
              <h3 className="font-bold text-base leading-relaxed">
                {MEMO_TYPES.find(m => m.key === formData.memoType)?.label}
              </h3>
              <p className="text-purple-200 text-[10px] mt-0.5">لدى {formData.court}</p>
            </div>
            <span className="text-3xl opacity-80">✍️</span>
          </div>
        </div>

        {/* Memo text */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-4">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
            <h4 className="text-xs font-bold text-[#1a3a5c] dark:text-[#f0c040]">نص المذكرة</h4>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">يمكن تعديل النص بعد النسخ</p>
          </div>
          <div className="p-4">
            <pre className="text-sm text-gray-800 dark:text-gray-200 leading-loose whitespace-pre-wrap font-sans">{memo}</pre>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 mb-4">
          <p className="text-[10px] text-yellow-700 dark:text-yellow-400 leading-relaxed">
            ⚠️ تنبيه: هذا القالب للإرشاد فقط. يجب على المحامي مراجعته وتكييفه مع ملابسات القضية قبل استخدامه الفعلي أمام المحكمة.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={copyMemo}
            className="flex-1 py-2.5 bg-[#6d28d9] hover:bg-[#5b21b6] text-white rounded-xl text-sm font-medium transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
          >
            <span>{copied ? '✅' : '📋'}</span>
            <span>{copied ? 'تم النسخ' : 'نسخ المذكرة كاملة'}</span>
          </button>
          <button
            onClick={reset}
            className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 transition-all active:scale-[0.98]"
          >
            🔄 مذكرة أخرى
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-[#1a3a5c] dark:text-[#f0c040] text-lg">→</button>
        <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">✍️ قوالب المذكرات القانونية</h2>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
        أدخل بيانات القضية وسيتم إدراجها في قالب مذكرة قانونية جاهز وفق الأسلوب الجزائري المعتمد.
      </p>

      <div className="flex items-start gap-2 bg-green-50 dark:bg-green-900/15 border border-green-200 dark:border-green-800 rounded-xl p-3 mb-4">
        <span className="text-sm flex-shrink-0 mt-0.5">✅</span>
        <p className="text-[11px] text-green-700 dark:text-green-400 leading-relaxed">
          المذكرة تُنشأ محلياً على جهازك — لا يتم إرسال أي بيانات لأي خادم
        </p>
      </div>

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

        {/* Legal Basis */}
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
            الأسانيد القانونية
            <span className="text-gray-400 dark:text-gray-500 font-normal mr-1">(اختياري)</span>
          </label>
          <textarea
            value={formData.legalBasis}
            onChange={e => updateField('legalBasis', e.target.value)}
            placeholder="مثال: م.106 ق.م، م.123 ق.م، م.336 ق.إ.م.إ..."
            rows={2}
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#6d28d9] dark:focus:border-purple-500 transition-colors resize-none leading-relaxed"
          />
        </div>

        {/* Lawyer Name */}
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

        {/* Submit */}
        <button
          onClick={handleGenerate}
          disabled={!isValid}
          className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            isValid
              ? 'bg-[#6d28d9] hover:bg-[#5b21b6] text-white active:scale-[0.98]'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
          }`}
        >
          <span>✍️</span>
          <span>إنشاء المذكرة</span>
        </button>

        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
          الحقول المعلّمة بـ <span className="text-red-500">*</span> إلزامية
        </p>
      </div>
    </div>
  );
}
