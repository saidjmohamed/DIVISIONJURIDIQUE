'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/* ─────────────────────── Types ─────────────────────── */

type FormType = 'penal' | 'civil';

interface PenalFormData {
  courtCouncil: string;
  court: string;
  section: string;
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
  caseNumber: string;
  sessionDate: string;
  judgeName: string;
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

const LS_KEY_PENAL = 'tasis_penal_data';
const LS_KEY_CIVIL = 'tasis_civil_data';

/* ─────────────────────── Legal Text Generation ─────────────────────── */

function generatePenalText(data: PenalFormData): string {
  const capacityLabel = CAPACITY_OPTIONS.find(o => o.value === data.capacity)?.label || '';
  const today = new Date().toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric' });

  let requestLine = '';
  if (data.requestType === 'file_review') {
    requestLine = `\nكما يلتمس الدفاع تمكينه من الاطلاع على ملف القضية طبقاً للقانون.`;
  } else if (data.requestType === 'file_copy') {
    requestLine = `\nكما يلتمس الدفاع الحصول على نسخة من ملف القضية.`;
  } else if (data.requestType === 'contact_institution') {
    requestLine = `\nكما يلتمس الدفاع الترخيص له بالاتصال بالمؤسسة العقابية لزيارة موكله.`;
  }

  return `الجمهورية الجزائرية الديمقراطية الشعبية
وزارة العدل

مجلس قضاء ${data.courtCouncil}
محكمة ${data.court}
${data.section ? `القسم / الغرفة: ${data.section}` : ''}

إعلان تأسيس وتوكيل

أنا الموقع أدناه الأستاذ(ة) ${data.lawyerName}، محام(ية) معتمد(ة) لدى المجلس،

أتشرف بإعلام سيادتكم أنني أتأسس وأنصب نفسي دفاعاً عن ${capacityLabel}:
السيد(ة): ${data.clientName}

في القضية رقم: ${data.caseNumber}
المحددة لجلسة: ${data.sessionDate}
${requestLine}

وبناءً على ذلك، ألتمس من سيادتكم قبول هذا الإعلان بالتأسيس والتوكيل.

وتفضلوا بقبول فائق التقدير والاحترام.

حرر بـ ${data.court} في: ${today}

المحامي(ة)
الأستاذ(ة) ${data.lawyerName}
الإمضاء`;
}

function generateCivilText(data: CivilFormData): string {
  const today = new Date().toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric' });

  return `الجمهورية الجزائرية الديمقراطية الشعبية
وزارة العدل

مجلس قضاء ${data.courtCouncil}
محكمة ${data.court}
${data.section ? `القسم: ${data.section}` : ''}

إعلان تأسيس وتوكيل

السيد(ة) رئيس(ة) المحكمة: ${data.judgeName}

الموضوع: ${data.caseSubject}

أنا الموقع أدناه الأستاذ(ة) ${data.lawyerName}، محام(ية) معتمد(ة) لدى المجلس،

أتشرف بإعلام سيادتكم أنني أتأسس وأنصب نفسي دفاعاً ووكيلاً عن:
السيد(ة): ${data.clientName}

ضد: ${data.opponent}

في القضية رقم: ${data.caseNumber}
المحددة لجلسة: ${data.sessionDate}

وبناءً على ذلك، ألتمس من سيادتكم قبول هذا الإعلان بالتأسيس والتوكيل.

وتفضلوا بقبول فائق التقدير والاحترام.

حرر بـ ${data.court} في: ${today}

المحامي(ة)
الأستاذ(ة) ${data.lawyerName}
الإمضاء`;
}

/* ─────────────────────── PDF Generation ─────────────────────── */

async function generatePdf(text: string, formType: FormType): Promise<Blob> {
  const { PDFDocument, rgb } = await import('pdf-lib');
  const fontkit = (await import('@pdf-lib/fontkit')).default;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // Load Arabic font
  const fontResponse = await fetch('/fonts/NotoSansArabic-Regular.ttf');
  const fontBytes = await fontResponse.arrayBuffer();
  const arabicFont = await pdfDoc.embedFont(fontBytes);

  const PAGE_WIDTH = 595.28; // A4
  const PAGE_HEIGHT = 841.89;
  const MARGIN = 50;
  const FONT_SIZE = 12;
  const HEADER_SIZE = 14;
  const LINE_HEIGHT = FONT_SIZE * 2.2;
  const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

  // Reverse Arabic text for RTL rendering in pdf-lib
  function reverseText(str: string): string {
    return str.split('').reverse().join('');
  }

  // Split text into lines that fit the page width
  function wrapLine(line: string, fontSize: number): string[] {
    if (!line.trim()) return [''];
    const words = line.split(/\s+/);
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
      const test = current ? current + ' ' + word : word;
      const width = arabicFont.widthOfTextAtSize(reverseText(test), fontSize);
      if (width > CONTENT_WIDTH && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  // Build all visual lines
  const rawLines = text.split('\n');
  const allLines: { text: string; isHeader: boolean }[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const isHeader = i <= 1 || line.startsWith('إعلان تأسيس');
    const fontSize = isHeader ? HEADER_SIZE : FONT_SIZE;
    const wrapped = wrapLine(line, fontSize);
    for (const w of wrapped) {
      allLines.push({ text: w, isHeader });
    }
  }

  // Render pages
  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;
  const BOTTOM_MARGIN = 60;

  // Draw header icon ⚖️ on first page
  const iconText = reverseText('⚖');
  try {
    const iconWidth = arabicFont.widthOfTextAtSize(iconText, 28);
    page.drawText(iconText, {
      x: (PAGE_WIDTH - iconWidth) / 2,
      y: y,
      size: 28,
      font: arabicFont,
      color: rgb(0.1, 0.23, 0.36),
    });
  } catch {
    // If the scale symbol can't be rendered with this font, skip it
  }
  y -= 35;

  // Draw a subtle line under header
  page.drawLine({
    start: { x: MARGIN + 100, y: y + 5 },
    end: { x: PAGE_WIDTH - MARGIN - 100, y: y + 5 },
    thickness: 0.5,
    color: rgb(0.6, 0.6, 0.6),
  });
  y -= 15;

  for (const lineObj of allLines) {
    if (y < BOTTOM_MARGIN) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }

    const fontSize = lineObj.isHeader ? HEADER_SIZE : FONT_SIZE;
    const color = lineObj.isHeader ? rgb(0.1, 0.23, 0.36) : rgb(0.1, 0.1, 0.1);
    const reversed = reverseText(lineObj.text);
    const textWidth = arabicFont.widthOfTextAtSize(reversed, fontSize);

    // RTL: right-align text
    const x = PAGE_WIDTH - MARGIN - textWidth;

    if (lineObj.text.trim()) {
      page.drawText(reversed, {
        x: Math.max(MARGIN, x),
        y,
        size: fontSize,
        font: arabicFont,
        color,
      });
    }

    y -= LINE_HEIGHT;
  }

  // Footer line on last page
  y -= 10;
  page.drawLine({
    start: { x: MARGIN, y: Math.max(40, y) },
    end: { x: PAGE_WIDTH - MARGIN, y: Math.max(40, y) },
    thickness: 0.3,
    color: rgb(0.7, 0.7, 0.7),
  });

  const typeLabel = formType === 'penal' ? 'إعلان تأسيس - جزائي' : 'إعلان تأسيس - مدني';
  const footerReversed = reverseText(typeLabel);
  const footerWidth = arabicFont.widthOfTextAtSize(footerReversed, 8);
  page.drawText(footerReversed, {
    x: (PAGE_WIDTH - footerWidth) / 2,
    y: Math.max(25, y - 15),
    size: 8,
    font: arabicFont,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/* ─────────────────────── Component ─────────────────────── */

export default function EstablishmentDeclaration({ onBack }: { onBack: () => void }) {
  const [formType, setFormType] = useState<FormType | null>(null);
  const [penalData, setPenalData] = useState<PenalFormData>({
    courtCouncil: '', court: '', section: '', lawyerName: '', clientName: '',
    capacity: 'non_detained', caseNumber: '', sessionDate: '', requestType: '',
  });
  const [civilData, setCivilData] = useState<CivilFormData>({
    courtCouncil: '', court: '', section: '', caseNumber: '', sessionDate: '',
    judgeName: '', lawyerName: '', clientName: '', opponent: '', caseSubject: '',
  });
  const [generatedText, setGeneratedText] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const downloadRef = useRef<HTMLAnchorElement>(null);

  // Load saved data from localStorage
  useEffect(() => {
    try {
      const savedPenal = localStorage.getItem(LS_KEY_PENAL);
      if (savedPenal) {
        const parsed = JSON.parse(savedPenal);
        setPenalData(prev => ({ ...prev, ...parsed }));
      }
      const savedCivil = localStorage.getItem(LS_KEY_CIVIL);
      if (savedCivil) {
        const parsed = JSON.parse(savedCivil);
        setCivilData(prev => ({ ...prev, ...parsed }));
      }
    } catch { /* ignore */ }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    try { localStorage.setItem(LS_KEY_PENAL, JSON.stringify(penalData)); } catch { /* ignore */ }
  }, [penalData]);
  useEffect(() => {
    try { localStorage.setItem(LS_KEY_CIVIL, JSON.stringify(civilData)); } catch { /* ignore */ }
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
    const required: (keyof PenalFormData)[] = ['courtCouncil', 'court', 'lawyerName', 'clientName', 'caseNumber', 'sessionDate'];
    const newErrors: Record<string, boolean> = {};
    let valid = true;
    for (const key of required) {
      if (!penalData[key].toString().trim()) {
        newErrors[key] = true;
        valid = false;
      }
    }
    setErrors(newErrors);
    return valid;
  }

  function validateCivil(): boolean {
    const required: (keyof CivilFormData)[] = ['courtCouncil', 'court', 'caseNumber', 'sessionDate', 'lawyerName', 'clientName', 'opponent', 'caseSubject'];
    const newErrors: Record<string, boolean> = {};
    let valid = true;
    for (const key of required) {
      if (!civilData[key].toString().trim()) {
        newErrors[key] = true;
        valid = false;
      }
    }
    setErrors(newErrors);
    return valid;
  }

  const handleGenerate = useCallback(async () => {
    if (!formType) return;

    if (formType === 'penal' && !validatePenal()) return;
    if (formType === 'civil' && !validateCivil()) return;

    setLoading(true);
    try {
      const text = formType === 'penal'
        ? generatePenalText(penalData)
        : generateCivilText(civilData);
      setGeneratedText(text);

      const blob = await generatePdf(text, formType);
      setPdfBlob(blob);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formType, penalData, civilData]);

  function downloadPdf() {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    const suffix = formType === 'penal' ? 'جزائي' : 'مدني';
    a.download = `إعلان_تأسيس_${suffix}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function shareWhatsApp() {
    if (!generatedText) return;
    const summary = formType === 'penal'
      ? `إعلان تأسيس وتوكيل (جزائي) - القضية رقم ${penalData.caseNumber} - المحامي ${penalData.lawyerName} - الموكل ${penalData.clientName}`
      : `إعلان تأسيس وتوكيل (مدني) - القضية رقم ${civilData.caseNumber} - المحامي ${civilData.lawyerName} - الموكل ${civilData.clientName}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(summary)}`, '_blank');
  }

  function shareEmail() {
    if (!generatedText) return;
    const subject = formType === 'penal'
      ? `إعلان تأسيس وتوكيل - جزائي - القضية ${penalData.caseNumber}`
      : `إعلان تأسيس وتوكيل - مدني - القضية ${civilData.caseNumber}`;
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
    setPdfBlob(null);
    setErrors({});
  }

  // ─── Input helper ───
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
          <button onClick={downloadPdf} disabled={!pdfBlob}
            className="flex items-center justify-center gap-2 py-3 bg-[#1a3a5c] dark:bg-[#f0c040] text-white dark:text-[#1a3a5c] rounded-xl font-bold hover:opacity-90 transition-all shadow-md disabled:opacity-50">
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

        <a ref={downloadRef} className="hidden" />
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
          <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
            💡 البيانات تُحفظ تلقائياً — يمكنك العودة لاحقاً دون إعادة الإدخال
          </p>
        </div>
      </div>
    );
  }

  // ─── Penal Form ───
  if (formType === 'penal') {
    return (
      <div className="max-w-2xl mx-auto" dir="rtl">
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
              <label className={labelClass}>المحكمة: <span className="text-red-500">*</span></label>
              <input type="text" placeholder="مثال: محكمة بئر مراد رايس" value={penalData.court}
                onChange={e => updatePenal('court', e.target.value)} className={inputClass('court')} />
            </div>
            <div>
              <label className={labelClass}>القسم / الغرفة:</label>
              <input type="text" placeholder="مثال: الغرفة الجزائية الأولى" value={penalData.section}
                onChange={e => updatePenal('section', e.target.value)} className={inputClass('section')} />
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
                  <button key={opt.value} onClick={() => updatePenal('capacity', opt.value)}
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
                  <button key={opt.value} onClick={() => updatePenal('requestType', opt.value)}
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

          <button onClick={handleGenerate} disabled={loading}
            className="w-full py-4 bg-[#1a3a5c] dark:bg-[#f0c040] hover:opacity-90 disabled:opacity-50 text-white dark:text-[#1a3a5c] rounded-xl font-bold transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2">
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 dark:border-[#1a3a5c]/30 border-t-white dark:border-t-[#1a3a5c] rounded-full animate-spin" />
                جاري إنشاء الوثيقة...
              </>
            ) : (
              <>📄 إنشاء إعلان التأسيس</>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ─── Civil Form ───
  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
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
            <label className={labelClass}>المحكمة: <span className="text-red-500">*</span></label>
            <input type="text" placeholder="مثال: محكمة بئر مراد رايس" value={civilData.court}
              onChange={e => updateCivil('court', e.target.value)} className={inputClass('court')} />
          </div>
          <div>
            <label className={labelClass}>القسم:</label>
            <input type="text" placeholder="مثال: القسم المدني" value={civilData.section}
              onChange={e => updateCivil('section', e.target.value)} className={inputClass('section')} />
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
            <label className={labelClass}>اسم الرئيس:</label>
            <input type="text" placeholder="اسم رئيس الجلسة (اختياري)" value={civilData.judgeName}
              onChange={e => updateCivil('judgeName', e.target.value)} className={inputClass('judgeName')} />
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
          <div>
            <label className={labelClass}>موضوع القضية: <span className="text-red-500">*</span></label>
            <input type="text" placeholder="مثال: دعوى تعويض..." value={civilData.caseSubject}
              onChange={e => updateCivil('caseSubject', e.target.value)} className={inputClass('caseSubject')} />
          </div>
        </div>

        {Object.values(errors).some(Boolean) && (
          <p className="text-xs text-red-500 font-bold text-center">يرجى ملء جميع الحقول الإجبارية (*)</p>
        )}

        <button onClick={handleGenerate} disabled={loading}
          className="w-full py-4 bg-[#1a3a5c] dark:bg-[#f0c040] hover:opacity-90 disabled:opacity-50 text-white dark:text-[#1a3a5c] rounded-xl font-bold transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2">
          {loading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/30 dark:border-[#1a3a5c]/30 border-t-white dark:border-t-[#1a3a5c] rounded-full animate-spin" />
              جاري إنشاء الوثيقة...
            </>
          ) : (
            <>📄 إنشاء إعلان التأسيس</>
          )}
        </button>
      </div>
    </div>
  );
}
