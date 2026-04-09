'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/* ─────────────────────── Types ─────────────────────── */

type FormType = 'penal' | 'civil';

// الجهة الموجه إليها — محكمة
type CourtLevel = 'tribunal' | 'council';

interface PenalFormData {
  courtLevel: CourtLevel;
  courtCouncil: string;
  court: string;
  section: string;
  // الجهة الموجه إليها
  addressee: string; // حقل حر أو اختيار
  lawyerName: string;
  clientName: string;
  capacity: 'non_detained' | 'detained' | 'civil_party';
  caseNumber: string;
  sessionDate: string;
  requestType: '' | 'file_review' | 'file_copy' | 'contact_institution';
}

interface CivilFormData {
  courtLevel: CourtLevel;
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

// الجهات الموجه إليها — محكمة (جزائي)
const TRIBUNAL_PENAL_ADDRESSEES = [
  'السيد الرئيس الفاصل في قضايا الجنح',
  'السيد الرئيس الفاصل في قضايا المخالفات',
  'السيد الرئيس الفاصل في قضايا الأحداث',
  'السيد قاضي التحقيق',
];

// الجهات الموجه إليها — مجلس (جزائي)
const COUNCIL_PENAL_ADDRESSEES = [
  'السيد الرئيس والسادة المستشارين المشكلين للغرفة الجزائية',
  'السيد الرئيس والسادة المستشارين المشكلين لغرفة الاتهام',
  'السيد الرئيس والسادة المستشارين المشكلين للغرفة الجزائية للأحداث',
];

// الجهات الموجه إليها — محكمة (مدني)
const TRIBUNAL_CIVIL_ADDRESSEES = [
  'السيد الرئيس الفاصل في القضايا المدنية',
  'السيد الرئيس الفاصل في القضايا العقارية',
  'السيد الرئيس الفاصل في القضايا الاجتماعية',
  'السيد الرئيس الفاصل في القضايا التجارية',
  'السيد الرئيس الفاصل في شؤون الأسرة',
  'السيد الرئيس الفاصل في القضايا الاستعجالية',
];

// الجهات الموجه إليها — مجلس (مدني)
const COUNCIL_CIVIL_ADDRESSEES = [
  'السيد الرئيس والسادة المستشارين المشكلين للغرفة المدنية',
  'السيد الرئيس والسادة المستشارين المشكلين للغرفة العقارية',
  'السيد الرئيس والسادة المستشارين المشكلين للغرفة الاجتماعية',
  'السيد الرئيس والسادة المستشارين المشكلين للغرفة التجارية',
  'السيد الرئيس والسادة المستشارين المشكلين لغرفة شؤون الأسرة',
  'السيد الرئيس والسادة المستشارين المشكلين للغرفة الاستعجالية',
];

const LS_KEY_PENAL = 'tasis_penal_data_v2';
const LS_KEY_CIVIL = 'tasis_civil_data_v2';

/* ─────────────────────── Legal Text Generation ─────────────────────── */

function generatePenalText(data: PenalFormData): string {
  const capacityLabel = CAPACITY_OPTIONS.find(o => o.value === data.capacity)?.label || '';
  const today = new Date().toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric' });
  const levelLabel = data.courtLevel === 'council' ? 'مجلس قضاء' : 'محكمة';

  let requestLine = '';
  if (data.requestType === 'file_review') {
    requestLine = '\nكما يلتمس الدفاع تمكينه من الاطلاع على ملف القضية طبقاً للقانون.';
  } else if (data.requestType === 'file_copy') {
    requestLine = '\nكما يلتمس الدفاع الحصول على نسخة من ملف القضية.';
  } else if (data.requestType === 'contact_institution') {
    requestLine = '\nكما يلتمس الدفاع الترخيص له بالاتصال بالمؤسسة العقابية لزيارة موكله.';
  }

  const locationLine = data.courtLevel === 'council'
    ? `مجلس قضاء ${data.courtCouncil}`
    : `مجلس قضاء ${data.courtCouncil}\nمحكمة ${data.court}`;

  const sectionLine = data.section ? `\n${data.courtLevel === 'council' ? 'الغرفة' : 'القسم / الغرفة'}: ${data.section}` : '';

  return `الجمهورية الجزائرية الديمقراطية الشعبية
وزارة العدل

${locationLine}${sectionLine}

إعلان تأسيس وتوكيل

إلى ${data.addressee}

أنا الموقع أدناه الأستاذ(ة) ${data.lawyerName}، محام(ية) معتمد(ة) لدى ${data.courtLevel === 'council' ? 'المجلس' : 'المحكمة'}،

أتشرف بإعلام سيادتكم أنني أتأسس وأنصب نفسي دفاعاً عن ${capacityLabel}:
السيد(ة): ${data.clientName}

في القضية رقم: ${data.caseNumber}
المحددة لجلسة: ${data.sessionDate}
${requestLine}

وبناءً على ذلك، ألتمس من سيادتكم قبول هذا الإعلان بالتأسيس والتوكيل.

وتفضلوا بقبول فائق التقدير والاحترام.

حرر بـ ${data.courtLevel === 'council' ? data.courtCouncil : data.court} في: ${today}

المحامي(ة)
الأستاذ(ة) ${data.lawyerName}
الإمضاء`;
}

function generateCivilText(data: CivilFormData): string {
  const today = new Date().toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric' });

  const locationLine = data.courtLevel === 'council'
    ? `مجلس قضاء ${data.courtCouncil}`
    : `مجلس قضاء ${data.courtCouncil}\nمحكمة ${data.court}`;

  const sectionLine = data.section ? `\n${data.courtLevel === 'council' ? 'الغرفة' : 'القسم'}: ${data.section}` : '';

  return `الجمهورية الجزائرية الديمقراطية الشعبية
وزارة العدل

${locationLine}${sectionLine}

إعلان تأسيس وتوكيل

إلى ${data.addressee}

الموضوع: ${data.caseSubject}

أنا الموقع أدناه الأستاذ(ة) ${data.lawyerName}، محام(ية) معتمد(ة) لدى ${data.courtLevel === 'council' ? 'المجلس' : 'المحكمة'}،

أتشرف بإعلام سيادتكم أنني أتأسس وأنصب نفسي دفاعاً ووكيلاً عن:
السيد(ة): ${data.clientName}

ضد: ${data.opponent}

في القضية رقم: ${data.caseNumber}
المحددة لجلسة: ${data.sessionDate}

وبناءً على ذلك، ألتمس من سيادتكم قبول هذا الإعلان بالتأسيس والتوكيل.

وتفضلوا بقبول فائق التقدير والاحترام.

حرر بـ ${data.courtLevel === 'council' ? data.courtCouncil : data.court} في: ${today}

المحامي(ة)
الأستاذ(ة) ${data.lawyerName}
الإمضاء`;
}

/* ─────────────────────── PDF Generation via HTML ─────────────────────── */

async function generatePdf(text: string, formType: FormType): Promise<Blob> {
  const { default: html2canvas } = await import('html2canvas');
  const { default: jsPDF } = await import('jspdf');

  // Create a hidden container with proper Arabic HTML
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed; left: -9999px; top: 0;
    width: 595px; /* A4 width at 72dpi */
    background: white;
    font-family: 'Noto Sans Arabic', 'Segoe UI', 'Arial', sans-serif;
    direction: rtl;
    padding: 0;
  `;

  const lines = text.split('\n');
  let html = `
    <div style="padding: 50px 45px 40px 45px; min-height: 842px; box-sizing: border-box;">
      <!-- Header: Justice Icon -->
      <div style="text-align: center; margin-bottom: 8px;">
        <svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M32 4 L32 56 M16 56 L48 56 M12 20 L52 20 M12 20 L6 36 C6 42 12 42 18 42 L18 36 L12 20 M52 20 L46 36 C46 42 52 42 58 42 L58 36 L52 20 M32 4 C34 4 36 6 36 8 C36 10 34 12 32 12 C30 12 28 10 28 8 C28 6 30 4 32 4" stroke="#1a3a5c" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <!-- Divider -->
      <div style="border-top: 1px solid #c0c0c0; margin: 0 120px 20px 120px;"></div>
  `;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      html += '<div style="height: 12px;"></div>';
      continue;
    }

    // Republic header
    if (trimmed === 'الجمهورية الجزائرية الديمقراطية الشعبية') {
      html += `<div style="text-align: center; font-size: 15px; font-weight: 700; color: #1a3a5c; margin-bottom: 2px;">${trimmed}</div>`;
    }
    // Ministry
    else if (trimmed === 'وزارة العدل') {
      html += `<div style="text-align: center; font-size: 13px; font-weight: 600; color: #1a3a5c; margin-bottom: 10px;">${trimmed}</div>`;
    }
    // Title
    else if (trimmed === 'إعلان تأسيس وتوكيل') {
      html += `<div style="text-align: center; font-size: 16px; font-weight: 700; color: #1a3a5c; margin: 16px 0; padding: 8px 0; border-top: 2px solid #1a3a5c; border-bottom: 2px solid #1a3a5c;">${trimmed}</div>`;
    }
    // "إلى" addressee line
    else if (trimmed.startsWith('إلى ')) {
      html += `<div style="text-align: center; font-size: 13px; font-weight: 700; color: #2c3e50; margin: 8px 0 12px 0;">${trimmed}</div>`;
    }
    // Court info lines
    else if (trimmed.startsWith('مجلس قضاء') || trimmed.startsWith('محكمة ') || trimmed.startsWith('القسم') || trimmed.startsWith('الغرفة')) {
      html += `<div style="text-align: center; font-size: 12px; font-weight: 600; color: #34495e; margin-bottom: 2px;">${trimmed}</div>`;
    }
    // Lawyer signature section
    else if (trimmed === 'المحامي(ة)' || trimmed.startsWith('الأستاذ(ة)') || trimmed === 'الإمضاء') {
      html += `<div style="text-align: left; font-size: 12px; font-weight: 600; color: #1a3a5c; margin-top: 2px; padding-left: 50px;">${trimmed}</div>`;
    }
    // Date line
    else if (trimmed.startsWith('حرر بـ')) {
      html += `<div style="text-align: left; font-size: 11px; color: #555; margin-top: 16px; padding-left: 50px;">${trimmed}</div>`;
    }
    // Subject/topic line
    else if (trimmed.startsWith('الموضوع:')) {
      html += `<div style="font-size: 12px; font-weight: 700; color: #2c3e50; margin: 4px 0;">${trimmed}</div>`;
    }
    // Case info
    else if (trimmed.startsWith('في القضية رقم:') || trimmed.startsWith('المحددة لجلسة:')) {
      html += `<div style="font-size: 12px; color: #333; margin: 2px 0; font-weight: 600;">${trimmed}</div>`;
    }
    // Client/opponent
    else if (trimmed.startsWith('السيد(ة):') || trimmed.startsWith('ضد:')) {
      html += `<div style="font-size: 12px; color: #333; margin: 2px 0; font-weight: 700;">${trimmed}</div>`;
    }
    // Regular text
    else {
      html += `<div style="font-size: 12px; color: #333; line-height: 1.8; margin: 3px 0;">${trimmed}</div>`;
    }
  }

  // Footer
  const typeLabel = formType === 'penal' ? 'إعلان تأسيس - جزائي' : 'إعلان تأسيس - مدني';
  html += `
      <div style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 8px; text-align: center;">
        <span style="font-size: 9px; color: #999;">${typeLabel} — منصة الشامل</span>
      </div>
    </div>
  `;

  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 3, // High resolution
      useCORS: true,
      backgroundColor: '#ffffff',
      width: 595,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = 210; // A4 mm
    const pdfHeight = 297;
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    // If content fits on one page
    if (imgHeight <= pdfHeight) {
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
    } else {
      // Multi-page
      let remainingHeight = imgHeight;
      let position = 0;
      while (remainingHeight > 0) {
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        remainingHeight -= pdfHeight;
        if (remainingHeight > 0) {
          pdf.addPage();
          position -= pdfHeight;
        }
      }
    }

    return pdf.output('blob');
  } finally {
    document.body.removeChild(container);
  }
}

/* ─────────────────────── Component ─────────────────────── */

export default function EstablishmentDeclaration({ onBack }: { onBack: () => void }) {
  const [formType, setFormType] = useState<FormType | null>(null);
  const [penalData, setPenalData] = useState<PenalFormData>({
    courtLevel: 'tribunal', courtCouncil: '', court: '', section: '',
    addressee: '', lawyerName: '', clientName: '',
    capacity: 'non_detained', caseNumber: '', sessionDate: '', requestType: '',
  });
  const [civilData, setCivilData] = useState<CivilFormData>({
    courtLevel: 'tribunal', courtCouncil: '', court: '', section: '',
    addressee: '', caseNumber: '', sessionDate: '',
    lawyerName: '', clientName: '', opponent: '', caseSubject: '',
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
    setPenalData(prev => {
      const updated = { ...prev, [key]: value };
      // Reset addressee when switching court level
      if (key === 'courtLevel') {
        updated.addressee = '';
      }
      return updated;
    });
    setErrors(prev => ({ ...prev, [key]: false }));
  }

  function updateCivil<K extends keyof CivilFormData>(key: K, value: CivilFormData[K]) {
    setCivilData(prev => {
      const updated = { ...prev, [key]: value };
      if (key === 'courtLevel') {
        updated.addressee = '';
      }
      return updated;
    });
    setErrors(prev => ({ ...prev, [key]: false }));
  }

  function validatePenal(): boolean {
    const required: (keyof PenalFormData)[] = ['courtCouncil', 'addressee', 'lawyerName', 'clientName', 'caseNumber', 'sessionDate'];
    if (penalData.courtLevel === 'tribunal') required.push('court');
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
    const required: (keyof CivilFormData)[] = ['courtCouncil', 'addressee', 'caseNumber', 'sessionDate', 'lawyerName', 'clientName', 'opponent', 'caseSubject'];
    if (civilData.courtLevel === 'tribunal') required.push('court');
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

  // ─── Shared Styles ───
  const inputClass = (key: string) =>
    `w-full text-sm border ${errors[key] ? 'border-red-400 ring-2 ring-red-200' : 'border-gray-200 dark:border-gray-600'} rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-[#1a3a5c]/40 dark:focus:ring-[#f0c040]/40 outline-none transition-all`;

  const labelClass = 'block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1';

  const toggleBtnClass = (active: boolean) =>
    `p-2.5 rounded-lg border text-xs font-bold transition-all ${
      active
        ? 'bg-[#1a3a5c] dark:bg-[#f0c040] text-white dark:text-[#1a3a5c] border-[#1a3a5c] dark:border-[#f0c040]'
        : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-[#1a3a5c]/50'
    }`;

  // ─── Court Level + Addressee Picker (shared) ───
  function renderCourtLevelAndAddressee(
    courtLevel: CourtLevel,
    addressee: string,
    addressees: string[],
    onCourtLevelChange: (v: CourtLevel) => void,
    onAddresseeChange: (v: string) => void,
    formTypeStr: 'penal' | 'civil'
  ) {
    const penalAddressees = courtLevel === 'council' ? COUNCIL_PENAL_ADDRESSEES : TRIBUNAL_PENAL_ADDRESSEES;
    const civilAddressees = courtLevel === 'council' ? COUNCIL_CIVIL_ADDRESSEES : TRIBUNAL_CIVIL_ADDRESSEES;
    const list = formTypeStr === 'penal' ? penalAddressees : civilAddressees;

    return (
      <>
        {/* مستوى الجهة القضائية */}
        <div className="col-span-full">
          <label className={labelClass}>الجهة القضائية: <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => onCourtLevelChange('tribunal')} className={toggleBtnClass(courtLevel === 'tribunal')}>
              🏛️ محكمة (درجة أولى)
            </button>
            <button type="button" onClick={() => onCourtLevelChange('council')} className={toggleBtnClass(courtLevel === 'council')}>
              🏛️ مجلس قضاء (استئناف)
            </button>
          </div>
        </div>

        {/* الجهة الموجه إليها */}
        <div className="col-span-full">
          <label className={labelClass}>الجهة الموجه إليها: <span className="text-red-500">*</span></label>
          <div className={`grid ${list.length > 3 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-2`}>
            {list.map(opt => (
              <button key={opt} type="button" onClick={() => onAddresseeChange(opt)}
                className={`p-2.5 rounded-lg border text-[11px] font-bold transition-all text-right leading-relaxed ${
                  addressee === opt
                    ? 'bg-[#1a3a5c] dark:bg-[#f0c040] text-white dark:text-[#1a3a5c] border-[#1a3a5c] dark:border-[#f0c040]'
                    : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-[#1a3a5c]/50'
                }`}>
                {opt}
              </button>
            ))}
          </div>
          {errors['addressee'] && <p className="text-xs text-red-500 mt-1">يرجى اختيار الجهة الموجه إليها</p>}
        </div>
      </>
    );
  }

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

            {renderCourtLevelAndAddressee(
              penalData.courtLevel, penalData.addressee, [],
              (v) => updatePenal('courtLevel', v),
              (v) => updatePenal('addressee', v),
              'penal'
            )}

            <div>
              <label className={labelClass}>مجلس القضاء: <span className="text-red-500">*</span></label>
              <input type="text" placeholder="مثال: الجزائر" value={penalData.courtCouncil}
                onChange={e => updatePenal('courtCouncil', e.target.value)} className={inputClass('courtCouncil')} />
            </div>
            {penalData.courtLevel === 'tribunal' && (
              <div>
                <label className={labelClass}>المحكمة: <span className="text-red-500">*</span></label>
                <input type="text" placeholder="مثال: بئر مراد رايس" value={penalData.court}
                  onChange={e => updatePenal('court', e.target.value)} className={inputClass('court')} />
              </div>
            )}
            <div>
              <label className={labelClass}>{penalData.courtLevel === 'council' ? 'الغرفة:' : 'القسم / الغرفة:'}</label>
              <input type="text" placeholder={penalData.courtLevel === 'council' ? 'مثال: الغرفة الجزائية' : 'مثال: الغرفة الجزائية الأولى'} value={penalData.section}
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
                  <button key={opt.value} type="button" onClick={() => updatePenal('capacity', opt.value)} className={toggleBtnClass(penalData.capacity === opt.value)}>
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

          {renderCourtLevelAndAddressee(
            civilData.courtLevel, civilData.addressee, [],
            (v) => updateCivil('courtLevel', v),
            (v) => updateCivil('addressee', v),
            'civil'
          )}

          <div>
            <label className={labelClass}>مجلس القضاء: <span className="text-red-500">*</span></label>
            <input type="text" placeholder="مثال: الجزائر" value={civilData.courtCouncil}
              onChange={e => updateCivil('courtCouncil', e.target.value)} className={inputClass('courtCouncil')} />
          </div>
          {civilData.courtLevel === 'tribunal' && (
            <div>
              <label className={labelClass}>المحكمة: <span className="text-red-500">*</span></label>
              <input type="text" placeholder="مثال: بئر مراد رايس" value={civilData.court}
                onChange={e => updateCivil('court', e.target.value)} className={inputClass('court')} />
            </div>
          )}
          <div>
            <label className={labelClass}>{civilData.courtLevel === 'council' ? 'الغرفة:' : 'القسم:'}</label>
            <input type="text" placeholder={civilData.courtLevel === 'council' ? 'مثال: الغرفة المدنية' : 'مثال: القسم المدني'} value={civilData.section}
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
