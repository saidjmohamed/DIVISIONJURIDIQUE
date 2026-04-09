'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/* ─────────────────────── Types ─────────────────────── */

type FormType = 'penal' | 'civil';

interface PenalFormData {
  courtCouncil: string;
  court: string;
  section: string;
  addressee: string;
  lawyerName: string;
  clientName: string;
  capacity: 'non_detained' | 'detained' | 'civil_party';
  caseNumber: string;
  sessionDate: string;
  requestType: '' | 'file_review' | 'file_copy' | 'contact_institution';
}

interface CivilFormData {
  courtCouncil: string;
  court: string;
  section: string;
  addressee: string;
  caseNumber: string;
  sessionDate: string;
  lawyerName: string;
  clientName: string;
  opponent: string;
  caseSubject: string;
}

const CAPACITY_OPTIONS = [
  { value: 'non_detained' as const, label: 'متهم غير موقوف' },
  { value: 'detained' as const, label: 'متهم موقوف' },
  { value: 'civil_party' as const, label: 'طرف مدني' },
];

const REQUEST_OPTIONS = [
  { value: '' as const, label: 'بدون طلب إضافي' },
  { value: 'file_review' as const, label: 'الاطلاع على الملف' },
  { value: 'file_copy' as const, label: 'نسخة من الملف' },
  { value: 'contact_institution' as const, label: 'الاتصال بالمؤسسة' },
];

const LS_KEY_PENAL = 'tasis_penal_v3';
const LS_KEY_CIVIL = 'tasis_civil_v3';

/* ─────────────────────── Legal Text Generation ─────────────────────── */

function generatePenalText(data: PenalFormData): string {
  const capacityLabel = CAPACITY_OPTIONS.find(o => o.value === data.capacity)?.label || '';
  const today = new Date().toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric' });

  let requestLine = '';
  if (data.requestType === 'file_review') {
    requestLine = '\nكما يلتمس الدفاع تمكينه من الاطلاع على ملف القضية طبقاً للقانون.';
  } else if (data.requestType === 'file_copy') {
    requestLine = '\nكما يلتمس الدفاع الحصول على نسخة من ملف القضية.';
  } else if (data.requestType === 'contact_institution') {
    requestLine = '\nكما يلتمس الدفاع الترخيص له بالاتصال بالمؤسسة العقابية لزيارة موكله.';
  }

  const courtLine = data.court ? `\nمحكمة ${data.court}` : '';
  const sectionLine = data.section ? `\nالقسم / الغرفة: ${data.section}` : '';

  return `الجمهورية الجزائرية الديمقراطية الشعبية
وزارة العدل

مجلس قضاء ${data.courtCouncil}${courtLine}${sectionLine}

إعلان تأسيس وتوكيل

إلى ${data.addressee}

أنا الموقع أدناه الأستاذ(ة) ${data.lawyerName}، محام(ية) معتمد(ة)،

أتشرف بإعلام سيادتكم أنني أتأسس وأنصب نفسي دفاعاً عن ${capacityLabel}:
السيد(ة): ${data.clientName}

في القضية رقم: ${data.caseNumber}
المحددة لجلسة: ${data.sessionDate}
${requestLine}

وبناءً على ذلك، ألتمس من سيادتكم قبول هذا الإعلان بالتأسيس والتوكيل.

وتفضلوا بقبول فائق التقدير والاحترام.

حرر بـ ${data.court || data.courtCouncil} في: ${today}

المحامي(ة)
الأستاذ(ة) ${data.lawyerName}
الإمضاء`;
}

function generateCivilText(data: CivilFormData): string {
  const today = new Date().toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric' });

  const courtLine = data.court ? `\nمحكمة ${data.court}` : '';
  const sectionLine = data.section ? `\nالقسم: ${data.section}` : '';

  return `الجمهورية الجزائرية الديمقراطية الشعبية
وزارة العدل

مجلس قضاء ${data.courtCouncil}${courtLine}${sectionLine}

إعلان تأسيس وتوكيل

إلى ${data.addressee}

الموضوع: ${data.caseSubject}

أنا الموقع أدناه الأستاذ(ة) ${data.lawyerName}، محام(ية) معتمد(ة)،

أتشرف بإعلام سيادتكم أنني أتأسس وأنصب نفسي دفاعاً ووكيلاً عن:
السيد(ة): ${data.clientName}

ضد: ${data.opponent}

في القضية رقم: ${data.caseNumber}
المحددة لجلسة: ${data.sessionDate}

وبناءً على ذلك، ألتمس من سيادتكم قبول هذا الإعلان بالتأسيس والتوكيل.

وتفضلوا بقبول فائق التقدير والاحترام.

حرر بـ ${data.court || data.courtCouncil} في: ${today}

المحامي(ة)
الأستاذ(ة) ${data.lawyerName}
الإمضاء`;
}

/* ─────────────────────── PDF via Print Window ─────────────────────── */

function buildPdfHtml(text: string, formType: FormType): string {
  const lines = text.split('\n');
  const typeLabel = formType === 'penal' ? 'إعلان تأسيس - جزائي' : 'إعلان تأسيس - مدني';

  let bodyHtml = '';
  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      bodyHtml += '<div style="height:14px"></div>';
    } else if (t === 'الجمهورية الجزائرية الديمقراطية الشعبية') {
      bodyHtml += `<div style="text-align:center;font-size:16px;font-weight:700;color:#1a3a5c;margin-bottom:2px">${t}</div>`;
    } else if (t === 'وزارة العدل') {
      bodyHtml += `<div style="text-align:center;font-size:14px;font-weight:600;color:#1a3a5c;margin-bottom:12px">${t}</div>`;
    } else if (t === 'إعلان تأسيس وتوكيل') {
      bodyHtml += `<div style="text-align:center;font-size:18px;font-weight:700;color:#1a3a5c;margin:18px 0;padding:10px 0;border-top:2px solid #1a3a5c;border-bottom:2px solid #1a3a5c">${t}</div>`;
    } else if (t.startsWith('إلى ')) {
      bodyHtml += `<div style="text-align:center;font-size:14px;font-weight:700;color:#2c3e50;margin:10px 0 14px">${t}</div>`;
    } else if (t.startsWith('مجلس قضاء') || t.startsWith('محكمة ') || t.startsWith('القسم') || t.startsWith('الغرفة')) {
      bodyHtml += `<div style="text-align:center;font-size:13px;font-weight:600;color:#34495e;margin-bottom:3px">${t}</div>`;
    } else if (t === 'المحامي(ة)' || t.startsWith('الأستاذ(ة)') || t === 'الإمضاء') {
      bodyHtml += `<div style="text-align:left;font-size:13px;font-weight:600;color:#1a3a5c;margin-top:3px;padding-left:60px">${t}</div>`;
    } else if (t.startsWith('حرر بـ')) {
      bodyHtml += `<div style="text-align:left;font-size:12px;color:#555;margin-top:18px;padding-left:60px">${t}</div>`;
    } else if (t.startsWith('الموضوع:')) {
      bodyHtml += `<div style="font-size:13px;font-weight:700;color:#2c3e50;margin:6px 0">${t}</div>`;
    } else if (t.startsWith('في القضية رقم:') || t.startsWith('المحددة لجلسة:')) {
      bodyHtml += `<div style="font-size:13px;color:#333;margin:3px 0;font-weight:600">${t}</div>`;
    } else if (t.startsWith('السيد(ة):') || t.startsWith('ضد:')) {
      bodyHtml += `<div style="font-size:13px;color:#333;margin:3px 0;font-weight:700">${t}</div>`;
    } else {
      bodyHtml += `<div style="font-size:13px;color:#333;line-height:2;margin:4px 0">${t}</div>`;
    }
  }

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>${typeLabel}</title>
<style>
  @page { size: A4; margin: 20mm 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Noto Sans Arabic', 'Segoe UI', 'Arial', 'Tahoma', sans-serif;
    direction: rtl;
    color: #333;
    padding: 0;
  }
  .page {
    max-width: 700px;
    margin: 0 auto;
    padding: 10px 20px;
  }
  .icon-header {
    text-align: center;
    margin-bottom: 10px;
    font-size: 36px;
    color: #1a3a5c;
  }
  .divider {
    border-top: 1px solid #ccc;
    margin: 0 100px 16px;
  }
  .footer {
    margin-top: 32px;
    border-top: 1px solid #ddd;
    padding-top: 8px;
    text-align: center;
    font-size: 10px;
    color: #999;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="icon-header">⚖</div>
  <div class="divider"></div>
  ${bodyHtml}
  <div class="footer">${typeLabel} — منصة الشامل</div>
</div>
</body>
</html>`;
}

function openPrintablePdf(text: string, formType: FormType) {
  const html = buildPdfHtml(text, formType);
  const printWindow = window.open('', '_blank', 'width=800,height=1100');
  if (!printWindow) {
    // Fallback: if popup blocked, try iframe approach
    const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `إعلان_تأسيس_${formType === 'penal' ? 'جزائي' : 'مدني'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  // Wait for content to render then trigger print dialog (Save as PDF)
  printWindow.onload = () => {
    setTimeout(() => printWindow.print(), 300);
  };
  // Fallback if onload doesn't fire
  setTimeout(() => {
    try { printWindow.print(); } catch { /* ignore */ }
  }, 1000);
}

/* ─────────────────────── Component ─────────────────────── */

export default function EstablishmentDeclaration({ onBack }: { onBack: () => void }) {
  const [formType, setFormType] = useState<FormType | null>(null);
  const [penalData, setPenalData] = useState<PenalFormData>({
    courtCouncil: '', court: '', section: '', addressee: '',
    lawyerName: '', clientName: '',
    capacity: 'non_detained', caseNumber: '', sessionDate: '', requestType: '',
  });
  const [civilData, setCivilData] = useState<CivilFormData>({
    courtCouncil: '', court: '', section: '', addressee: '',
    caseNumber: '', sessionDate: '',
    lawyerName: '', clientName: '', opponent: '', caseSubject: '',
  });
  const [generatedText, setGeneratedText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const s1 = localStorage.getItem(LS_KEY_PENAL);
      if (s1) setPenalData(prev => ({ ...prev, ...JSON.parse(s1) }));
      const s2 = localStorage.getItem(LS_KEY_CIVIL);
      if (s2) setCivilData(prev => ({ ...prev, ...JSON.parse(s2) }));
    } catch { /* ignore */ }
  }, []);

  // Debounced localStorage save — prevents excessive saves on every keystroke
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
    const required: (keyof PenalFormData)[] = ['courtCouncil', 'addressee', 'lawyerName', 'clientName', 'caseNumber', 'sessionDate'];
    const newErrors: Record<string, boolean> = {};
    let valid = true;
    for (const key of required) {
      if (!penalData[key].toString().trim()) { newErrors[key] = true; valid = false; }
    }
    setErrors(newErrors);
    return valid;
  }

  function validateCivil(): boolean {
    const required: (keyof CivilFormData)[] = ['courtCouncil', 'addressee', 'caseNumber', 'sessionDate', 'lawyerName', 'clientName', 'opponent', 'caseSubject'];
    const newErrors: Record<string, boolean> = {};
    let valid = true;
    for (const key of required) {
      if (!civilData[key].toString().trim()) { newErrors[key] = true; valid = false; }
    }
    setErrors(newErrors);
    return valid;
  }

  function handleGenerate() {
    if (!formType) return;
    if (formType === 'penal' && !validatePenal()) return;
    if (formType === 'civil' && !validateCivil()) return;

    const text = formType === 'penal' ? generatePenalText(penalData) : generateCivilText(civilData);
    setGeneratedText(text);
  }

  function handleDownloadPdf() {
    if (!generatedText || !formType) return;
    openPrintablePdf(generatedText, formType);
  }

  function shareWhatsApp() {
    if (!generatedText) return;
    const d = formType === 'penal' ? penalData : civilData;
    const summary = `إعلان تأسيس وتوكيل (${formType === 'penal' ? 'جزائي' : 'مدني'}) - القضية رقم ${d.caseNumber} - المحامي ${d.lawyerName} - الموكل ${d.clientName}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(summary)}`, '_blank');
  }

  function shareEmail() {
    if (!generatedText) return;
    const d = formType === 'penal' ? penalData : civilData;
    const subject = `إعلان تأسيس وتوكيل - ${formType === 'penal' ? 'جزائي' : 'مدني'} - القضية ${d.caseNumber}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(generatedText)}`, '_self');
  }

  function copyText() {
    if (!generatedText) return;
    navigator.clipboard.writeText(generatedText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  function reset() {
    setGeneratedText(null);
    setErrors({});
  }

  // ─── Styles ───
  const inputClass = (key: string) =>
    `w-full text-sm border ${errors[key] ? 'border-red-400 ring-2 ring-red-200' : 'border-gray-200 dark:border-gray-600'} rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-[#1a3a5c]/40 dark:focus:ring-[#f0c040]/40 outline-none transition-all`;

  const labelClass = 'block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1';

  // ─── Result View ───
  if (generatedText) {
    return (
      <div className="max-w-2xl mx-auto" dir="rtl">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={reset} className="text-[#1a3a5c] dark:text-[#f0c040] text-lg font-bold">→</button>
          <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">📋 إعلان التأسيس الجاهز</h2>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg mb-4">
          <div className="bg-[#1a3a5c] dark:bg-[#f0c040] p-4 text-white dark:text-[#1a3a5c] flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-base">⚖️</span>
              <span className="text-xs font-bold">
                {formType === 'penal' ? 'إعلان تأسيس — جزائي' : 'إعلان تأسيس — مدني'}
              </span>
            </div>
            <button onClick={copyText} className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-all">
              {copied ? '✅ تم النسخ' : '📋 نسخ النص'}
            </button>
          </div>
          <div className="p-6">
            <pre className="whitespace-pre-wrap font-serif text-sm text-gray-800 dark:text-gray-200 leading-relaxed bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 max-h-[400px] overflow-y-auto" dir="rtl">
              {generatedText}
            </pre>
          </div>
        </div>

        {/* Action Buttons */}
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
          اختر نوع النموذج لإنشاء إعلان تأسيس وتوكيل رسمي جاهز للطباعة
        </p>
        <div className="space-y-3">
          <button onClick={() => setFormType('penal')}
            className="w-full flex items-center gap-4 p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-[#1a3a5c]/30 dark:hover:border-[#f0c040]/30 transition-all text-right group">
            <span className="w-12 h-12 bg-red-50 dark:bg-red-950/30 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">⚖️</span>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-1">نموذج جزائي</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">إعلان تأسيس أمام القسم الجزائي — متهم أو طرف مدني</p>
            </div>
            <span className="text-gray-300 dark:text-gray-600 group-hover:text-[#1a3a5c] dark:group-hover:text-[#f0c040] transition-colors text-xl">←</span>
          </button>
          <button onClick={() => setFormType('civil')}
            className="w-full flex items-center gap-4 p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-[#1a3a5c]/30 dark:hover:border-[#f0c040]/30 transition-all text-right group">
            <span className="w-12 h-12 bg-blue-50 dark:bg-blue-950/30 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">📜</span>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-1">نموذج مدني</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">إعلان تأسيس أمام القسم المدني — مدعي أو مدعى عليه</p>
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
          <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">⚖️ إعلان تأسيس — نموذج جزائي</h2>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>مجلس القضاء: <span className="text-red-500">*</span></label>
              <input type="text" placeholder="مثال: الجزائر" value={penalData.courtCouncil}
                onChange={e => updatePenal('courtCouncil', e.target.value)} className={inputClass('courtCouncil')} />
            </div>
            <div>
              <label className={labelClass}>المحكمة:</label>
              <input type="text" placeholder="مثال: بئر مراد رايس (اختياري)" value={penalData.court}
                onChange={e => updatePenal('court', e.target.value)} className={inputClass('court')} />
            </div>
            <div>
              <label className={labelClass}>القسم / الغرفة:</label>
              <input type="text" placeholder="مثال: الغرفة الجزائية (اختياري)" value={penalData.section}
                onChange={e => updatePenal('section', e.target.value)} className={inputClass('section')} />
            </div>
            <div className="col-span-full">
              <label className={labelClass}>الجهة الموجه إليها: <span className="text-red-500">*</span></label>
              <input type="text" placeholder="مثال: السيد الرئيس الفاصل في قضايا الجنح / السيد قاضي التحقيق / السيد وكيل الجمهورية ..." value={penalData.addressee}
                onChange={e => updatePenal('addressee', e.target.value)} className={inputClass('addressee')} />
            </div>
            <div>
              <label className={labelClass}>اسم المحامي: <span className="text-red-500">*</span></label>
              <input type="text" placeholder="الأستاذ(ة) ..." value={penalData.lawyerName}
                onChange={e => updatePenal('lawyerName', e.target.value)} className={inputClass('lawyerName')} />
            </div>
            <div>
              <label className={labelClass}>اسم الموكل: <span className="text-red-500">*</span></label>
              <input type="text" placeholder="الاسم الكامل" value={penalData.clientName}
                onChange={e => updatePenal('clientName', e.target.value)} className={inputClass('clientName')} />
            </div>
            <div>
              <label className={labelClass}>رقم القضية: <span className="text-red-500">*</span></label>
              <input type="text" placeholder="مثال: 24/00123" value={penalData.caseNumber}
                onChange={e => updatePenal('caseNumber', e.target.value)} className={inputClass('caseNumber')} />
            </div>
            <div>
              <label className={labelClass}>تاريخ الجلسة: <span className="text-red-500">*</span></label>
              <input type="date" value={penalData.sessionDate}
                onChange={e => updatePenal('sessionDate', e.target.value)} className={inputClass('sessionDate')} />
            </div>

            <div className="col-span-full">
              <label className={labelClass}>الصفة: <span className="text-red-500">*</span></label>
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

            <div className="col-span-full">
              <label className={labelClass}>نوع الطلب (اختياري):</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {REQUEST_OPTIONS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => updatePenal('requestType', opt.value)}
                    className={`p-2 rounded-lg border text-[10px] font-bold transition-all ${
                      penalData.requestType === opt.value
                        ? 'bg-[#1a3a5c] dark:bg-[#f0c040] text-white dark:text-[#1a3a5c] border-[#1a3a5c] dark:border-[#f0c040]'
                        : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-[#1a3a5c]/50'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {Object.values(errors).some(Boolean) && (
            <p className="text-xs text-red-500 font-bold text-center">يرجى ملء جميع الحقول الإجبارية (*)</p>
          )}

          <button type="button" onClick={handleGenerate} disabled={loading}
            className="w-full py-4 bg-[#1a3a5c] dark:bg-[#f0c040] hover:opacity-90 disabled:opacity-50 text-white dark:text-[#1a3a5c] rounded-xl font-bold transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2">
            {loading ? (
              <><span className="inline-block w-4 h-4 border-2 border-white/30 dark:border-[#1a3a5c]/30 border-t-white dark:border-t-[#1a3a5c] rounded-full animate-spin" /> جاري إنشاء الوثيقة...</>
            ) : (<>📄 إنشاء إعلان التأسيس</>)}
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
        <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">📜 إعلان تأسيس — نموذج مدني</h2>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>مجلس القضاء: <span className="text-red-500">*</span></label>
            <input type="text" placeholder="مثال: الجزائر" value={civilData.courtCouncil}
              onChange={e => updateCivil('courtCouncil', e.target.value)} className={inputClass('courtCouncil')} />
          </div>
          <div>
            <label className={labelClass}>المحكمة:</label>
            <input type="text" placeholder="مثال: بئر مراد رايس (اختياري)" value={civilData.court}
              onChange={e => updateCivil('court', e.target.value)} className={inputClass('court')} />
          </div>
          <div>
            <label className={labelClass}>القسم:</label>
            <input type="text" placeholder="مثال: القسم المدني (اختياري)" value={civilData.section}
              onChange={e => updateCivil('section', e.target.value)} className={inputClass('section')} />
          </div>
          <div className="col-span-full">
            <label className={labelClass}>الجهة الموجه إليها: <span className="text-red-500">*</span></label>
            <input type="text" placeholder="مثال: السيد الرئيس الفاصل في القضايا المدنية / السيد الرئيس والسادة المستشارين ..." value={civilData.addressee}
              onChange={e => updateCivil('addressee', e.target.value)} className={inputClass('addressee')} />
          </div>
          <div>
            <label className={labelClass}>رقم القضية: <span className="text-red-500">*</span></label>
            <input type="text" placeholder="مثال: 24/00123" value={civilData.caseNumber}
              onChange={e => updateCivil('caseNumber', e.target.value)} className={inputClass('caseNumber')} />
          </div>
          <div>
            <label className={labelClass}>تاريخ الجلسة: <span className="text-red-500">*</span></label>
            <input type="date" value={civilData.sessionDate}
              onChange={e => updateCivil('sessionDate', e.target.value)} className={inputClass('sessionDate')} />
          </div>
          <div>
            <label className={labelClass}>اسم المحامي: <span className="text-red-500">*</span></label>
            <input type="text" placeholder="الأستاذ(ة) ..." value={civilData.lawyerName}
              onChange={e => updateCivil('lawyerName', e.target.value)} className={inputClass('lawyerName')} />
          </div>
          <div>
            <label className={labelClass}>اسم الموكل: <span className="text-red-500">*</span></label>
            <input type="text" placeholder="الاسم الكامل" value={civilData.clientName}
              onChange={e => updateCivil('clientName', e.target.value)} className={inputClass('clientName')} />
          </div>
          <div>
            <label className={labelClass}>الخصم: <span className="text-red-500">*</span></label>
            <input type="text" placeholder="اسم الخصم" value={civilData.opponent}
              onChange={e => updateCivil('opponent', e.target.value)} className={inputClass('opponent')} />
          </div>
          <div className="col-span-full">
            <label className={labelClass}>موضوع القضية: <span className="text-red-500">*</span></label>
            <input type="text" placeholder="مثال: دعوى تعويض..." value={civilData.caseSubject}
              onChange={e => updateCivil('caseSubject', e.target.value)} className={inputClass('caseSubject')} />
          </div>
        </div>

        {Object.values(errors).some(Boolean) && (
          <p className="text-xs text-red-500 font-bold text-center">يرجى ملء جميع الحقول الإجبارية (*)</p>
        )}

        <button type="button" onClick={handleGenerate} disabled={loading}
          className="w-full py-4 bg-[#1a3a5c] dark:bg-[#f0c040] hover:opacity-90 disabled:opacity-50 text-white dark:text-[#1a3a5c] rounded-xl font-bold transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2">
          {loading ? (
            <><span className="inline-block w-4 h-4 border-2 border-white/30 dark:border-[#1a3a5c]/30 border-t-white dark:border-t-[#1a3a5c] rounded-full animate-spin" /> جاري إنشاء الوثيقة...</>
          ) : (<>📄 إنشاء إعلان التأسيس</>)}
        </button>
      </div>
    </div>
  );
}
