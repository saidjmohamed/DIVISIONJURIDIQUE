'use client';

import { useState } from 'react';

/* ─────────────────────── Types ─────────────────────── */

type MemoType = 'response' | 'closing' | 'appeal' | 'appeal_cassation' | 'objection' | 'opening' | 'preliminary_plea';

interface FormData {
  memoType: MemoType;
  court: string;
  caseNumber: string;
  plaintiff: string;
  defendant: string;
  facts: string;
  requests: string;
  legalBasis: string;
  lawyerName: string;
}

const MEMO_TYPES: { key: MemoType; label: string; icon: string; desc: string }[] = [
  { key: 'opening', label: 'عريضة افتتاحية', icon: '📖', desc: 'لبدء دعوى قضائية جديدة (المادة 14 ق.إ.م.إ)' },
  { key: 'response', label: 'مذكرة جوابية', icon: '↩️', desc: 'للرد على ادعاءات الخصم وتقديم الدفوع' },
  { key: 'preliminary_plea', label: 'مذكرة دفع شكلي', icon: '🛡️', desc: 'للدفع بعدم الاختصاص أو بطلان الإجراءات' },
  { key: 'closing', label: 'مذكرة ختامية', icon: '🏁', desc: 'لتلخيص الموقف القانوني قبل حجز القضية للنطق بالحكم' },
  { key: 'appeal', label: 'مذكرة استئناف', icon: '⬆️', desc: 'للطعن في حكم ابتدائي أمام المجلس القضائي' },
  { key: 'appeal_cassation', label: 'مذكرة طعن بالنقض', icon: '🔝', desc: 'للطعن أمام المحكمة العليا (أوجه النقض الحصرية)' },
  { key: 'objection', label: 'مذكرة معارضة', icon: '🚫', desc: 'للطعن في الأحكام الغيابية (المادة 327 ق.إ.م.إ)' },
];

/* ─────────────────────── Templates ─────────────────────── */

function generateMemo(data: FormData): string {
  const today = new Date().toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric' });
  const lawyerLine = data.lawyerName ? data.lawyerName : 'الأستاذ / ...........';
  const caseNum = data.caseNumber ? data.caseNumber : '.......................';
  const legalBasisLine = data.legalBasis.trim() ? data.legalBasis.trim() : 'نصوص قانون الإجراءات المدنية والإدارية والقانون المدني';

  const header = `الجمهورية الجزائرية الديمقراطية الشعبية
وزارة العدل

إلى السيد رئيس ${data.court}
${data.memoType === 'appeal' ? 'المجلس القضائي لـ ' + data.court : ''}
${data.memoType === 'appeal_cassation' ? 'المحكمة العليا - غرفة ...........' : ''}

القضية رقم: ${caseNum}
الجدول: .......................

لفائدة: ${data.plaintiff} (المدعي/المستأنف)
ضد: ${data.defendant} (المدعى عليه/المستأنف عليه)

الموضوع: ${MEMO_TYPES.find(m => m.key === data.memoType)?.label}
--------------------------------------------------

سيدي الرئيس، حضرات السادة القضاة،

يتشرف الأستاذ ${lawyerLine}، محام لدى المجلس، القائم في حق ${data.plaintiff}، بتقديم هذه المذكرة الموقرة:

`;

  const footer = `
--------------------------------------------------
لهذه الأسباب ومن أجلها:
يلتمس العارض من عدالة المحكمة الموقرة التفضل بالقضاء بـ:
${data.requests}

مع كافة التحفظات
عن العارض/ وكيله الأستاذ: ${lawyerLine}
الجزائر في: ${today}
`;

  switch (data.memoType) {
    case 'opening':
      return header + `أولاً: من حيث الشكل:
حيث أن الدعوى الحالية استوفت كافة الشروط الشكلية المنصوص عليها في المواد 13، 14، 15 من قانون الإجراءات المدنية والإدارية، مما يتعين قبولها شكلاً.

ثانياً: من حيث الوقائع:
${data.facts}

ثالثاً: من حيث القانون:
حيث أن طلبات العارض تجد سندها القانوني في ${legalBasisLine}.
حيث أن [يفصل المحامي هنا الأسانيد القانونية].
` + footer;

    case 'response':
      return header + `أولاً: الرد على الوقائع:
حيث أن ما جاء في عريضة الخصم من وقائع لا يمت للحقيقة بصلة، والواقع هو:
${data.facts}

ثانياً: الدفوع الموضوعية:
حيث أن ${legalBasisLine} تنص على [يكتب النص القانوني].
حيث أن ادعاءات الخصم تفتقر إلى الدليل المادي والقانوني.
` + footer;

    case 'preliminary_plea':
      return header + `أولاً: الدفوع الشكلية (قبل أي دفاع في الموضوع):
حيث يلتمس العارض الدفع بـ [عدم الاختصاص النوعي / بطلان إجراءات التبليغ / انعدام الصفة].
حيث أن المادة [رقم المادة] من ق.إ.م.إ تنص على [نص المادة].

ثانياً: من حيث الوقائع المرتبطة بالدفع:
${data.facts}
` + footer;

    case 'closing':
      return header + `حيث أن القضية استوفت كافة مراحل التحقيق والتبادل، يتشرف الدفاع بتلخيص طلباته الختامية:

أولاً: تذكير موجز بالوقائع:
${data.facts}

ثانياً: الخلاصة القانونية:
بناءً على ما تم تقديمه من مستندات ودفوع، واستناداً إلى ${legalBasisLine}، يتبين لعدالتكم صحة موقف العارض.
` + footer;

    case 'appeal':
      return header + `ضد الحكم الابتدائي الصادر عن محكمة ........... بتاريخ ........... تحت رقم ...........

أولاً: أسباب الاستئناف (أوجه الطعن):
الوجه الأول: الخطأ في تطبيق القانون.
الوجه الثاني: القصور في التسبيب وفساد الاستدلال.
الوجه الثالث: [يضيف المحامي أوجه أخرى].

ثانياً: مناقشة أوجه الطعن:
حيث أن الحكم المستأنف قد جانبه الصواب عندما قضى بـ [يذكر عيب الحكم]، في حين أن ${legalBasisLine} تقتضي خلاف ذلك.
${data.facts}
` + footer;

    case 'appeal_cassation':
      return header + `ضد القرار الصادر عن المجلس القضائي لـ ........... بتاريخ ........... تحت رقم ...........

أولاً: أوجه الطعن بالنقض (المادة 358 ق.إ.م.إ):
الوجه الأول: مخالفة قاعدة جوهرية في الإجراءات.
الوجه الثاني: انعدام الأساس القانوني.
الوجه الثالث: تناقض القرارات.

ثانياً: شرح الأوجه:
حيث يعيب الطاعن على القرار المطعون فيه [يشرح المحامي وجه النقض بدقة].
استناداً إلى ${legalBasisLine}.
` + footer;

    case 'objection':
      return header + `ضد الحكم الغيابي الصادر بتاريخ ........... تحت رقم ...........

أولاً: في الشكل:
حيث أن المعارضة الحالية قدمت في الأجل القانوني (المادة 327 ق.إ.م.إ) كون العارض لم يبلغ شخصياً بالحكم الغيابي.

ثانياً: في الموضوع:
حيث أن العارض يطعن في الحكم الغيابي للأسباب التالية:
${data.facts}
` + footer;

    default:
      return header + data.facts + footer;
  }
}

/* ─────────────────────── Component ─────────────────────── */

export default function MemoDrafter({ onBack }: { onBack: () => void }) {
  const [formData, setFormData] = useState<FormData>({
    memoType: 'response',
    court: '',
    caseNumber: '',
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
        <div className="flex items-center gap-3 mb-4">
          <button onClick={reset} className="text-[#1a3a5c] dark:text-[#f0c040] text-lg font-bold">→</button>
          <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">✍️ المذكرة الجاهزة</h2>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg mb-6">
          <div className="bg-[#6d28d9] p-4 text-white flex justify-between items-center">
            <span className="text-xs font-bold">{MEMO_TYPES.find(m => m.key === formData.memoType)?.label}</span>
            <button onClick={copyMemo} className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-all">
              {copied ? '✅ تم النسخ' : '📋 نسخ النص'}
            </button>
          </div>
          <div className="p-6">
            <pre className="whitespace-pre-wrap font-serif text-sm text-gray-800 dark:text-gray-200 leading-relaxed bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 max-h-[500px] overflow-y-auto">
              {memo}
            </pre>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={reset} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-200 transition-all">
            تعديل البيانات
          </button>
          <button onClick={copyMemo} className="flex-1 py-3 bg-[#6d28d9] text-white rounded-xl font-bold hover:bg-[#5b21b6] transition-all shadow-md">
            نسخ المذكرة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-[#1a3a5c] dark:text-[#f0c040] text-lg font-bold">→</button>
        <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">✍️ صياغة المذكرات القانونية</h2>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="col-span-full">
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">نوع المذكرة:</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MEMO_TYPES.map(type => (
                <button
                  key={type.key}
                  onClick={() => updateField('memoType', type.key)}
                  className={`p-2 rounded-lg border text-[10px] font-bold transition-all ${
                    formData.memoType === type.key
                      ? 'bg-[#6d28d9] text-white border-[#6d28d9]'
                      : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-[#6d28d9]/50'
                  }`}
                >
                  <span className="block text-base mb-1">{type.icon}</span>
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">الجهة القضائية:</label>
            <input
              type="text"
              placeholder="مثال: محكمة بئر مراد رايس"
              value={formData.court}
              onChange={e => updateField('court', e.target.value)}
              className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-[#6d28d9]/40 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">رقم القضية (اختياري):</label>
            <input
              type="text"
              placeholder="مثال: 24/00123"
              value={formData.caseNumber}
              onChange={e => updateField('caseNumber', e.target.value)}
              className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-[#6d28d9]/40 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">المدعي / المستأنف:</label>
            <input
              type="text"
              placeholder="الاسم الكامل"
              value={formData.plaintiff}
              onChange={e => updateField('plaintiff', e.target.value)}
              className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-[#6d28d9]/40 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">المدعى عليه / المستأنف عليه:</label>
            <input
              type="text"
              placeholder="الاسم الكامل"
              value={formData.defendant}
              onChange={e => updateField('defendant', e.target.value)}
              className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-[#6d28d9]/40 outline-none"
            />
          </div>

          <div className="col-span-full">
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">الوقائع / الدفوع الأساسية:</label>
            <textarea
              rows={4}
              placeholder="اكتب ملخص الوقائع أو الدفوع التي تريد إدراجها..."
              value={formData.facts}
              onChange={e => updateField('facts', e.target.value)}
              className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-[#6d28d9]/40 outline-none resize-none"
            />
          </div>

          <div className="col-span-full">
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">الطلبات الختامية:</label>
            <textarea
              rows={3}
              placeholder="مثال: القضاء برفض الدعوى لعدم التأسيس..."
              value={formData.requests}
              onChange={e => updateField('requests', e.target.value)}
              className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-[#6d28d9]/40 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">السند القانوني (اختياري):</label>
            <input
              type="text"
              placeholder="مثال: المادة 124 من القانون المدني"
              value={formData.legalBasis}
              onChange={e => updateField('legalBasis', e.target.value)}
              className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-[#6d28d9]/40 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">اسم المحامي:</label>
            <input
              type="text"
              placeholder="الأستاذ / ..........."
              value={formData.lawyerName}
              onChange={e => updateField('lawyerName', e.target.value)}
              className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-[#6d28d9]/40 outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!isValid}
          className="w-full py-4 bg-[#6d28d9] hover:bg-[#5b21b6] disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-md active:scale-[0.98]"
        >
          ✨ إنشاء المذكرة القانونية
        </button>
      </div>
    </div>
  );
}
