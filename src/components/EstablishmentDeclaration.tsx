'use client';

import { useState, useEffect, useRef } from 'react';

/* ─────────────────────── Types ─────────────────────── */

type FormType = 'penal' | 'civil';

interface PenalFormData {
  courtCouncil: string;
  court: string;
  section: string;
  addressee: string;
  addresseeCourt: string;
  beneficiary: string;
  capacity: 'non_detained' | 'detained' | 'civil_party';
  caseNumber: string;
  sessionDate: string;
  requestReview: boolean;
  requestContact: boolean;
  requestContactInstitution: string;
  requestCopy: boolean;
  lawyerName: string;
}

interface CivilFormData {
  courtCouncil: string;
  court: string;
  section: string;
  caseNumber: string;
  sessionDate: string;
  addressee: string;
  addresseeCourt: string;
  beneficiary: string;
  opponent: string;
  attendance: string;
  representedBy: string;
  lawyerName: string;
}

const CAPACITY_OPTIONS = [
  { value: 'non_detained' as const, label: 'متهم غير موقوف' },
  { value: 'detained' as const, label: 'متهم موقوف' },
  { value: 'civil_party' as const, label: 'طرف مدني' },
];

const LS_KEY_PENAL = 'tasis_penal_v4';
const LS_KEY_CIVIL = 'tasis_civil_v4';

/* ─────────────────────── PDF HTML Builder ─────────────────────── */

function buildPenalPdfHtml(data: PenalFormData): string {
  const capacityLabel = CAPACITY_OPTIONS.find(o => o.value === data.capacity)?.label || '';

  let requestsHtml = '';
  if (data.requestReview) {
    requestsHtml += `<div style="margin:4px 0;font-size:13px">( ✗ ) تمكيننا من الإطلاع على نسخة كاملة من ملف القضية</div>`;
  } else {
    requestsHtml += `<div style="margin:4px 0;font-size:13px">(    ) تمكيننا من الإطلاع على نسخة كاملة من ملف القضية</div>`;
  }
  if (data.requestContact) {
    requestsHtml += `<div style="margin:4px 0;font-size:13px">( ✗ ) تسليمنا رخصة للإتصال بموكلنا بمؤسسة إعادة التربية بـ ${data.requestContactInstitution || '...'}</div>`;
  } else {
    requestsHtml += `<div style="margin:4px 0;font-size:13px">(    ) تسليمنا رخصة للإتصال بموكلنا بمؤسسة إعادة التربية بـ ...</div>`;
  }
  if (data.requestCopy) {
    requestsHtml += `<div style="margin:4px 0;font-size:13px">( ✗ ) تمكيننا من الإطلاع على نسخة كاملة من ملف القضية</div>`;
  } else {
    requestsHtml += `<div style="margin:4px 0;font-size:13px">(    ) تمكيننا من الإطلاع على نسخة كاملة من ملف القضية</div>`;
  }

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>إعلان تأسيس وتوكيل - جزائي</title>
<style>
  @page { size: A4; margin: 25mm 20mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Noto Sans Arabic', 'Segoe UI', 'Arial', 'Tahoma', sans-serif;
    direction: rtl;
    color: #1a1a1a;
    font-size: 14px;
    line-height: 2;
    padding: 0;
  }
  .page {
    max-width: 700px;
    margin: 0 auto;
    padding: 20px 30px;
  }
  .header-block {
    text-align: center;
    margin-bottom: 30px;
  }
  .header-block div {
    font-size: 15px;
    font-weight: 700;
    margin: 4px 0;
  }
  .addressee-block {
    margin: 20px 0;
    text-align: center;
    font-size: 15px;
    font-weight: 700;
  }
  .subject-block {
    text-align: center;
    font-size: 16px;
    font-weight: 700;
    text-decoration: underline;
    margin: 20px 0;
  }
  .field-line {
    font-size: 14px;
    margin: 6px 0;
    font-weight: 700;
    text-decoration: underline;
  }
  .body-text {
    font-size: 13px;
    line-height: 2.2;
    margin: 10px 0;
    text-align: justify;
  }
  .requests-block {
    margin: 16px 0;
  }
  .closing {
    margin-top: 20px;
    font-size: 13px;
  }
  .signature-block {
    margin-top: 40px;
    text-align: left;
    padding-left: 60px;
  }
  .signature-block div {
    font-size: 14px;
    font-weight: 600;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header-block">
    <div>مجلس قضاء: ${data.courtCouncil || '...'}</div>
    <div>محكمة: ${data.court || '...'}</div>
    <div>القسم/الغرفة: ${data.section || '...'}</div>
  </div>

  <div class="addressee-block">
    <div>إلى السيد ${data.addressee || '...'}</div>
    <div>لدى محكمة ${data.addresseeCourt || data.court || '...'}</div>
  </div>

  <div class="subject-block">الموضوع: رسالة تأسيس وتوكيل</div>

  <div class="field-line">لفائدة: ${data.beneficiary || '...'} بصفة ${capacityLabel}</div>

  <div style="margin:10px 0">
    <div style="font-size:13px;margin:3px 0">* ${data.capacity === 'non_detained' ? '( ✗ )' : '(    )'} متهم غير موقوف</div>
    <div style="font-size:13px;margin:3px 0">* ${data.capacity === 'detained' ? '( ✗ )' : '(    )'} متهم موقوف</div>
    <div style="font-size:13px;margin:3px 0">* ${data.capacity === 'civil_party' ? '( ✗ )' : '(    )'} طرف مدني</div>
  </div>

  <div class="body-text">
    <div style="text-align:left;margin-bottom:10px">سيدي،</div>
    <div>لي الشرف أن أحيط سيادتكم علماً عن تأسيسي وتوكيلي للدفاع عن حقوق ومصالح موكلي في القضية رقم ${data.caseNumber || '...'} والمقررة لجلسة يوم ${data.sessionDate || '...'}.</div>
    <div style="margin-top:8px">لذلك فإني ألتمس منكم :</div>
  </div>

  <div class="requests-block">
    ${requestsHtml}
  </div>

  <div class="closing">تقبلوا مني فائق التقدير والاحترام.</div>

  <div class="signature-block">
    <div>الأستاذ(ة) ${data.lawyerName || '...'}</div>
  </div>
</div>
</body>
</html>`;
}

function buildCivilPdfHtml(data: CivilFormData): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>رسالة تأسيس - مدني</title>
<style>
  @page { size: A4; margin: 25mm 20mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Noto Sans Arabic', 'Segoe UI', 'Arial', 'Tahoma', sans-serif;
    direction: rtl;
    color: #1a1a1a;
    font-size: 14px;
    line-height: 2;
    padding: 0;
  }
  .page {
    max-width: 700px;
    margin: 0 auto;
    padding: 20px 30px;
  }
  .header-block {
    text-align: center;
    margin-bottom: 24px;
  }
  .header-block div {
    font-size: 15px;
    font-weight: 700;
    margin: 4px 0;
  }
  .subject-block {
    text-align: right;
    font-size: 16px;
    font-weight: 700;
    text-decoration: underline;
    margin: 20px 0;
  }
  .addressee-block {
    margin: 14px 0;
    font-size: 14px;
  }
  .field-line {
    font-size: 14px;
    margin: 10px 0;
    font-weight: 700;
    text-decoration: underline;
  }
  .body-text {
    font-size: 13px;
    line-height: 2.2;
    margin: 16px 0;
    text-align: justify;
  }
  .closing {
    margin-top: 24px;
    font-size: 13px;
    text-align: center;
  }
  .signature-block {
    margin-top: 40px;
    text-align: left;
    padding-left: 60px;
  }
  .signature-block div {
    font-size: 14px;
    font-weight: 600;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header-block">
    <div>مجلس قضاء: ${data.courtCouncil || '...'}</div>
    <div>محكمة: ${data.court || '...'}</div>
    <div>قسم/غرفة: ${data.section || '...'}</div>
    <div>قضية رقم: ${data.caseNumber || '...'}</div>
    <div>جلسة: ${data.sessionDate || '...'}</div>
  </div>

  <div class="subject-block">الموضوع : رسالة تأسيس</div>

  <div class="addressee-block">
    <div>إلى السيد(ة)/رئيس(ة) ${data.addressee || '...'}</div>
    <div>لدى ${data.addresseeCourt || '...'}</div>
  </div>

  <div class="field-line">لفائدة: ${data.beneficiary || '...'}</div>
  <div class="field-line">ضد: ${data.opponent || '...'}</div>
  ${data.attendance ? `<div class="field-line">بحضور: ${data.attendance}</div>` : '<div class="field-line">بحضور: ............</div>'}

  <div class="body-text">
    <div>- يشرفني ان اعلمكم بأننا وكلنا من طرف ${data.representedBy || data.beneficiary || '...'} لتمثيل... في القضية المشار إليها أعلاه.</div>
    <div style="margin-top:8px">- لذا يرجى من عدالتكم الموقرة وسيادتكم المحترمة، الأخذ بعين الاعتبار توكلنا هذا.</div>
  </div>

  <div class="closing">تقبلوا منا أسمى عبارات التقدير والاحترام</div>

  <div class="signature-block">
    <div>الأستاذ/ ${data.lawyerName || '...'}</div>
  </div>
</div>
</body>
</html>`;
}

function openPrintablePdf(html: string) {
  const printWindow = window.open('', '_blank', 'width=800,height=1100');
  if (!printWindow) {
    const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'إعلان_تأسيس.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    setTimeout(() => printWindow.print(), 300);
  };
  setTimeout(() => {
    try { printWindow.print(); } catch { /* ignore */ }
  }, 1000);
}

/* ─────────────────────── Component ─────────────────────── */

export default function EstablishmentDeclaration({ onBack }: { onBack: () => void }) {
  const [formType, setFormType] = useState<FormType | null>(null);
  const [penalData, setPenalData] = useState<PenalFormData>({
    courtCouncil: '', court: '', section: '', addressee: '', addresseeCourt: '',
    beneficiary: '', lawyerName: '',
    capacity: 'non_detained', caseNumber: '', sessionDate: '',
    requestReview: false, requestContact: false, requestContactInstitution: '', requestCopy: false,
  });
  const [civilData, setCivilData] = useState<CivilFormData>({
    courtCouncil: '', court: '', section: '', addressee: '', addresseeCourt: '',
    caseNumber: '', sessionDate: '',
    beneficiary: '', opponent: '', attendance: '', representedBy: '', lawyerName: '',
  });
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const formRef = useRef<HTMLDivElement>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const s1 = localStorage.getItem(LS_KEY_PENAL);
      if (s1) setPenalData(prev => ({ ...prev, ...JSON.parse(s1) }));
      const s2 = localStorage.getItem(LS_KEY_CIVIL);
      if (s2) setCivilData(prev => ({ ...prev, ...JSON.parse(s2) }));
    } catch { /* ignore */ }
  }, []);

  // Debounced localStorage save
  const savePenalTimeout = useRef<ReturnType<typeof setTimeout>>();
  const saveCivilTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(savePenalTimeout.current);
    savePenalTimeout.current = setTimeout(() => {
      try { localStorage.setItem(LS_KEY_PENAL, JSON.stringify(penalData)); } catch { /* */ }
    }, 500);
    return () => clearTimeout(savePenalTimeout.current);
  }, [penalData]);

  useEffect(() => {
    clearTimeout(saveCivilTimeout.current);
    saveCivilTimeout.current = setTimeout(() => {
      try { localStorage.setItem(LS_KEY_CIVIL, JSON.stringify(civilData)); } catch { /* */ }
    }, 500);
    return () => clearTimeout(saveCivilTimeout.current);
  }, [civilData]);

  function updatePenal<K extends keyof PenalFormData>(key: K, value: PenalFormData[K]) {
    setPenalData(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: false }));
  }

  function updateCivil<K extends keyof CivilFormData>(key: K, value: CivilFormData[K]) {
    setCivilData(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: false }));
  }

  function validatePenal(): boolean {
    const required: (keyof PenalFormData)[] = ['courtCouncil', 'addressee', 'beneficiary', 'caseNumber', 'sessionDate', 'lawyerName'];
    const newErrors: Record<string, boolean> = {};
    let valid = true;
    for (const key of required) {
      if (!penalData[key].toString().trim()) { newErrors[key] = true; valid = false; }
    }
    setErrors(newErrors);
    return valid;
  }

  function validateCivil(): boolean {
    const required: (keyof CivilFormData)[] = ['courtCouncil', 'addressee', 'beneficiary', 'opponent', 'caseNumber', 'sessionDate', 'lawyerName'];
    const newErrors: Record<string, boolean> = {};
    let valid = true;
    for (const key of required) {
      if (!civilData[key].toString().trim()) { newErrors[key] = true; valid = false; }
    }
    setErrors(newErrors);
    return valid;
  }

  function generatePenalPreview(data: PenalFormData): string {
    const cap = CAPACITY_OPTIONS.find(o => o.value === data.capacity)?.label || '';
    let requests = '';
    if (data.requestReview) requests += '\n(✗) تمكيننا من الإطلاع على نسخة كاملة من ملف القضية';
    if (data.requestContact) requests += `\n(✗) تسليمنا رخصة للإتصال بموكلنا بمؤسسة إعادة التربية بـ ${data.requestContactInstitution || '...'}`;
    if (data.requestCopy) requests += '\n(✗) تمكيننا من نسخة كاملة من ملف القضية';
    return `مجلس قضاء: ${data.courtCouncil}
محكمة: ${data.court || '...'}
القسم/الغرفة: ${data.section || '...'}

إلى السيد ${data.addressee}
لدى محكمة ${data.addresseeCourt || data.court || '...'}

الموضوع: رسالة تأسيس وتوكيل

لفائدة: ${data.beneficiary} بصفة ${cap}

سيدي،
لي الشرف أن أحيط سيادتكم علماً عن تأسيسي وتوكيلي للدفاع عن حقوق ومصالح موكلي في القضية رقم ${data.caseNumber} والمقررة لجلسة يوم ${data.sessionDate}.

لذلك فإني ألتمس منكم :${requests}

تقبلوا مني فائق التقدير والاحترام.

الأستاذ(ة) ${data.lawyerName}`;
  }

  function generateCivilPreview(data: CivilFormData): string {
    return `مجلس قضاء: ${data.courtCouncil}
محكمة: ${data.court || '...'}
قسم/غرفة: ${data.section || '...'}
قضية رقم: ${data.caseNumber}
جلسة: ${data.sessionDate}

الموضوع : رسالة تأسيس

إلى السيد(ة)/رئيس(ة) ${data.addressee}
لدى ${data.addresseeCourt || '...'}

لفائدة: ${data.beneficiary}
ضد: ${data.opponent}
${data.attendance ? `بحضور: ${data.attendance}` : ''}

- يشرفني ان اعلمكم بأننا وكلنا من طرف ${data.representedBy || data.beneficiary} لتمثيل... في القضية المشار إليها أعلاه.
- لذا يرجى من عدالتكم الموقرة وسيادتكم المحترمة، الأخذ بعين الاعتبار توكلنا هذا.

تقبلوا منا أسمى عبارات التقدير والاحترام

الأستاذ/ ${data.lawyerName}`;
  }

  function handleGenerate() {
    if (!formType) return;
    if (formType === 'penal') {
      if (!validatePenal()) return;
      setPreviewText(generatePenalPreview(penalData));
      setGeneratedHtml(buildPenalPdfHtml(penalData));
    } else {
      if (!validateCivil()) return;
      setPreviewText(generateCivilPreview(civilData));
      setGeneratedHtml(buildCivilPdfHtml(civilData));
    }
  }

  function handleDownloadPdf() {
    if (!generatedHtml) return;
    openPrintablePdf(generatedHtml);
  }

  function shareWhatsApp() {
    if (!previewText) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(previewText)}`, '_blank');
  }

  function shareEmail() {
    if (!previewText) return;
    const subject = formType === 'penal' ? 'رسالة تأسيس وتوكيل - جزائي' : 'رسالة تأسيس - مدني';
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(previewText)}`, '_self');
  }

  function copyText() {
    if (!previewText) return;
    navigator.clipboard.writeText(previewText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  function reset() {
    setGeneratedHtml(null);
    setPreviewText(null);
    setErrors({});
  }

  // ─── Styles ───
  const inputClass = (key: string) =>
    `w-full text-sm border ${errors[key] ? 'border-red-400 ring-2 ring-red-200' : 'border-gray-200 dark:border-gray-600'} rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-[#1a3a5c]/40 dark:focus:ring-[#f0c040]/40 outline-none transition-all`;

  const labelClass = 'block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1';

  const checkboxClass = 'w-4 h-4 rounded border-gray-300 text-[#1a3a5c] focus:ring-[#1a3a5c] dark:focus:ring-[#f0c040]';

  // ─── Result View ───
  if (previewText && generatedHtml) {
    return (
      <div className="max-w-2xl mx-auto" dir="rtl">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={reset} className="text-[#1a3a5c] dark:text-[#f0c040] text-lg font-bold">→</button>
          <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">
            {formType === 'penal' ? '⚖️ رسالة تأسيس وتوكيل — جزائي' : '📜 رسالة تأسيس — مدني'}
          </h2>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg mb-4">
          <div className="bg-[#1a3a5c] dark:bg-[#f0c040] p-4 text-white dark:text-[#1a3a5c] flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-base">⚖️</span>
              <span className="text-xs font-bold">
                {formType === 'penal' ? 'رسالة تأسيس وتوكيل' : 'رسالة تأسيس'}
              </span>
            </div>
            <button onClick={copyText} className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-all">
              {copied ? '✅ تم النسخ' : '📋 نسخ النص'}
            </button>
          </div>
          <div className="p-6">
            <pre className="whitespace-pre-wrap font-serif text-sm text-gray-800 dark:text-gray-200 leading-relaxed bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 max-h-[400px] overflow-y-auto" dir="rtl">
              {previewText}
            </pre>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <button onClick={handleDownloadPdf}
            className="flex items-center justify-center gap-2 py-3 bg-[#1a3a5c] dark:bg-[#f0c040] text-white dark:text-[#1a3a5c] rounded-xl font-bold hover:opacity-90 transition-all shadow-md">
            <span>📥</span> تحميل PDF
          </button>
          <button onClick={shareWhatsApp}
            className="flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-md">
            <span>💬</span> واتساب
          </button>
          <button onClick={shareEmail}
            className="flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md">
            <span>📧</span> بريد إلكتروني
          </button>
        </div>

        <button onClick={reset} className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
          تعديل البيانات
        </button>
      </div>
    );
  }

  // ─── Form Type Selector ───
  if (!formType) {
    return (
      <div className="max-w-2xl mx-auto" dir="rtl">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="text-[#1a3a5c] dark:text-[#f0c040] text-lg font-bold">→</button>
          <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">📋 إعلان تأسيس وتوكيل</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          اختر نوع النموذج لإنشاء رسالة تأسيس رسمية جاهزة للطباعة
        </p>
        <div className="space-y-3">
          <button onClick={() => setFormType('penal')}
            className="w-full flex items-center gap-4 p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-[#1a3a5c]/30 dark:hover:border-[#f0c040]/30 transition-all text-right group">
            <span className="w-12 h-12 bg-red-50 dark:bg-red-950/30 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">⚖️</span>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-1">نموذج جزائي</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">رسالة تأسيس وتوكيل أمام القسم الجزائي</p>
            </div>
            <span className="text-gray-300 dark:text-gray-600 group-hover:text-[#1a3a5c] dark:group-hover:text-[#f0c040] transition-colors text-xl">←</span>
          </button>
          <button onClick={() => setFormType('civil')}
            className="w-full flex items-center gap-4 p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-[#1a3a5c]/30 dark:hover:border-[#f0c040]/30 transition-all text-right group">
            <span className="w-12 h-12 bg-blue-50 dark:bg-blue-950/30 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">📜</span>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-1">نموذج مدني</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">رسالة تأسيس أمام القسم المدني</p>
            </div>
            <span className="text-gray-300 dark:text-gray-600 group-hover:text-[#1a3a5c] dark:group-hover:text-[#f0c040] transition-colors text-xl">←</span>
          </button>
        </div>
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
          <p className="text-xs text-blue-700 dark:text-blue-300 text-center">💡 البيانات تُحفظ تلقائياً — يمكنك العودة لاحقاً دون إعادة الإدخال</p>
        </div>
      </div>
    );
  }

  // ─── Penal Form ───
  if (formType === 'penal') {
    return (
      <div className="max-w-2xl mx-auto" dir="rtl" ref={formRef}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => { setFormType(null); setErrors({}); }} className="text-[#1a3a5c] dark:text-[#f0c040] text-lg font-bold">→</button>
          <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">⚖️ رسالة تأسيس وتوكيل — جزائي</h2>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>مجلس القضاء <span className="text-red-500">*</span></label>
              <input type="text" placeholder="مثال: وهران" value={penalData.courtCouncil}
                onChange={e => updatePenal('courtCouncil', e.target.value)} className={inputClass('courtCouncil')} />
            </div>
            <div>
              <label className={labelClass}>المحكمة</label>
              <input type="text" placeholder="مثال: فلاوسن" value={penalData.court}
                onChange={e => updatePenal('court', e.target.value)} className={inputClass('court')} />
            </div>
            <div>
              <label className={labelClass}>القسم / الغرفة</label>
              <input type="text" placeholder="مثال: جنح" value={penalData.section}
                onChange={e => updatePenal('section', e.target.value)} className={inputClass('section')} />
            </div>
          </div>

          {/* Addressee */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-full">
                <label className={labelClass}>إلى السيد <span className="text-red-500">*</span></label>
                <input type="text" placeholder="مثال: الرئيس / قاضي التحقيق / وكيل الجمهورية ..." value={penalData.addressee}
                  onChange={e => updatePenal('addressee', e.target.value)} className={inputClass('addressee')} />
              </div>
              <div className="col-span-full">
                <label className={labelClass}>لدى محكمة</label>
                <input type="text" placeholder="مثال: فلاوسن" value={penalData.addresseeCourt}
                  onChange={e => updatePenal('addresseeCourt', e.target.value)} className={inputClass('addresseeCourt')} />
              </div>
            </div>
          </div>

          {/* Beneficiary & Capacity */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
            <div>
              <label className={labelClass}>لفائدة <span className="text-red-500">*</span></label>
              <input type="text" placeholder="اسم الموكل الكامل" value={penalData.beneficiary}
                onChange={e => updatePenal('beneficiary', e.target.value)} className={inputClass('beneficiary')} />
            </div>
            <div className="mt-3">
              <label className={labelClass}>الصفة <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-3 gap-2">
                {CAPACITY_OPTIONS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => updatePenal('capacity', opt.value)}
                    className={`p-2.5 rounded-lg border text-xs font-bold transition-all ${
                      penalData.capacity === opt.value
                        ? 'bg-[#1a3a5c] dark:bg-[#f0c040] text-white dark:text-[#1a3a5c] border-[#1a3a5c] dark:border-[#f0c040]'
                        : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-[#1a3a5c]/50'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Case info */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>رقم القضية <span className="text-red-500">*</span></label>
                <input type="text" placeholder="مثال: 24/00123" value={penalData.caseNumber}
                  onChange={e => updatePenal('caseNumber', e.target.value)} className={inputClass('caseNumber')} />
              </div>
              <div>
                <label className={labelClass}>تاريخ الجلسة <span className="text-red-500">*</span></label>
                <input type="date" value={penalData.sessionDate}
                  onChange={e => updatePenal('sessionDate', e.target.value)} className={inputClass('sessionDate')} />
              </div>
            </div>
          </div>

          {/* Requests */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
            <label className={labelClass}>الطلبات:</label>
            <div className="space-y-3 mt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={penalData.requestReview}
                  onChange={e => updatePenal('requestReview', e.target.checked)} className={checkboxClass} />
                <span className="text-xs text-gray-700 dark:text-gray-300">تمكيننا من الإطلاع على نسخة كاملة من ملف القضية</span>
              </label>
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={penalData.requestContact}
                    onChange={e => updatePenal('requestContact', e.target.checked)} className={checkboxClass} />
                  <span className="text-xs text-gray-700 dark:text-gray-300">تسليمنا رخصة للإتصال بموكلنا بمؤسسة إعادة التربية</span>
                </label>
                {penalData.requestContact && (
                  <input type="text" placeholder="اسم المؤسسة" value={penalData.requestContactInstitution}
                    onChange={e => updatePenal('requestContactInstitution', e.target.value)}
                    className={`mt-2 mr-7 ${inputClass('requestContactInstitution')}`} />
                )}
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={penalData.requestCopy}
                  onChange={e => updatePenal('requestCopy', e.target.checked)} className={checkboxClass} />
                <span className="text-xs text-gray-700 dark:text-gray-300">تمكيننا من نسخة كاملة من ملف القضية</span>
              </label>
            </div>
          </div>

          {/* Lawyer */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
            <label className={labelClass}>اسم المحامي <span className="text-red-500">*</span></label>
            <input type="text" placeholder="الأستاذ(ة) ..." value={penalData.lawyerName}
              onChange={e => updatePenal('lawyerName', e.target.value)} className={inputClass('lawyerName')} />
          </div>

          {Object.values(errors).some(Boolean) && (
            <p className="text-xs text-red-500 font-bold text-center">يرجى ملء جميع الحقول الإجبارية (*)</p>
          )}

          <button type="button" onClick={handleGenerate}
            className="w-full py-4 bg-[#1a3a5c] dark:bg-[#f0c040] hover:opacity-90 text-white dark:text-[#1a3a5c] rounded-xl font-bold transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2">
            📄 إنشاء رسالة التأسيس
          </button>
        </div>
      </div>
    );
  }

  // ─── Civil Form ───
  return (
    <div className="max-w-2xl mx-auto" dir="rtl" ref={formRef}>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => { setFormType(null); setErrors({}); }} className="text-[#1a3a5c] dark:text-[#f0c040] text-lg font-bold">→</button>
        <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">📜 رسالة تأسيس — مدني</h2>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm space-y-4">
        {/* Header fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>مجلس القضاء <span className="text-red-500">*</span></label>
            <input type="text" placeholder="مثال: الجزائر" value={civilData.courtCouncil}
              onChange={e => updateCivil('courtCouncil', e.target.value)} className={inputClass('courtCouncil')} />
          </div>
          <div>
            <label className={labelClass}>المحكمة</label>
            <input type="text" placeholder="مثال: بئر مراد رايس" value={civilData.court}
              onChange={e => updateCivil('court', e.target.value)} className={inputClass('court')} />
          </div>
          <div>
            <label className={labelClass}>قسم / غرفة</label>
            <input type="text" placeholder="مثال: القسم المدني" value={civilData.section}
              onChange={e => updateCivil('section', e.target.value)} className={inputClass('section')} />
          </div>
          <div>
            <label className={labelClass}>قضية رقم <span className="text-red-500">*</span></label>
            <input type="text" placeholder="مثال: 24/00123" value={civilData.caseNumber}
              onChange={e => updateCivil('caseNumber', e.target.value)} className={inputClass('caseNumber')} />
          </div>
          <div>
            <label className={labelClass}>جلسة <span className="text-red-500">*</span></label>
            <input type="date" value={civilData.sessionDate}
              onChange={e => updateCivil('sessionDate', e.target.value)} className={inputClass('sessionDate')} />
          </div>
        </div>

        {/* Addressee */}
        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className={labelClass}>إلى السيد(ة)/رئيس(ة) <span className="text-red-500">*</span></label>
              <input type="text" placeholder="مثال: رئيس المحكمة / رئيس الغرفة المدنية ..." value={civilData.addressee}
                onChange={e => updateCivil('addressee', e.target.value)} className={inputClass('addressee')} />
            </div>
            <div>
              <label className={labelClass}>لدى</label>
              <input type="text" placeholder="مثال: محكمة بئر مراد رايس" value={civilData.addresseeCourt}
                onChange={e => updateCivil('addresseeCourt', e.target.value)} className={inputClass('addresseeCourt')} />
            </div>
          </div>
        </div>

        {/* Parties */}
        <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-4">
          <div>
            <label className={labelClass}>لفائدة <span className="text-red-500">*</span></label>
            <input type="text" placeholder="اسم الموكل" value={civilData.beneficiary}
              onChange={e => updateCivil('beneficiary', e.target.value)} className={inputClass('beneficiary')} />
          </div>
          <div>
            <label className={labelClass}>ضد <span className="text-red-500">*</span></label>
            <input type="text" placeholder="اسم الخصم" value={civilData.opponent}
              onChange={e => updateCivil('opponent', e.target.value)} className={inputClass('opponent')} />
          </div>
          <div>
            <label className={labelClass}>بحضور</label>
            <input type="text" placeholder="اختياري" value={civilData.attendance}
              onChange={e => updateCivil('attendance', e.target.value)} className={inputClass('attendance')} />
          </div>
          <div>
            <label className={labelClass}>الموكل من طرف</label>
            <input type="text" placeholder="اختياري — إن كان مختلفاً عن المستفيد" value={civilData.representedBy}
              onChange={e => updateCivil('representedBy', e.target.value)} className={inputClass('representedBy')} />
          </div>
        </div>

        {/* Lawyer */}
        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
          <label className={labelClass}>اسم المحامي <span className="text-red-500">*</span></label>
          <input type="text" placeholder="الأستاذ/ ..." value={civilData.lawyerName}
            onChange={e => updateCivil('lawyerName', e.target.value)} className={inputClass('lawyerName')} />
        </div>

        {Object.values(errors).some(Boolean) && (
          <p className="text-xs text-red-500 font-bold text-center">يرجى ملء جميع الحقول الإجبارية (*)</p>
        )}

        <button type="button" onClick={handleGenerate}
          className="w-full py-4 bg-[#1a3a5c] dark:bg-[#f0c040] hover:opacity-90 text-white dark:text-[#1a3a5c] rounded-xl font-bold transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2">
          📄 إنشاء رسالة التأسيس
        </button>
      </div>
    </div>
  );
}
