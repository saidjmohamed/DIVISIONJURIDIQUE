'use client';

import { extractTextFromFile } from '@/lib/extract-text';
import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';

/* ─────────────────────── Types ─────────────────────── */

interface ExtractedField {
  label: string;
  value: string;
  found: boolean;
}

interface JudgmentExtraction {
  court: ExtractedField;
  caseNumber: ExtractedField;
  date: ExtractedField;
  plaintiff: ExtractedField;
  defendant: ExtractedField;
  ruling: ExtractedField;
  legalArticles: string[];
}

interface AppealOption {
  type: string;
  deadline: string;
  article: string;
  conditions: string;
}

/* ─────────────────────── Static Appeal Options ─────────────────────── */

const APPEAL_OPTIONS: AppealOption[] = [
  {
    type: 'الاستئناف',
    deadline: 'شهر من تاريخ التبليغ',
    article: 'م.336 ق.إ.م.إ',
    conditions: 'يُرفع أمام المجلس القضائي ضد الأحكام الابتدائية الفاصلة في الموضوع. يوقفه الطعن التنفيذ إلا في حالة النفاذ المعجل. يُقدَّم بعريضة موقعة من محامٍ.',
  },
  {
    type: 'الطعن بالنقض',
    deadline: 'شهران من تاريخ التبليغ',
    article: 'م.354 ق.إ.م.إ',
    conditions: 'يُرفع أمام المحكمة العليا ضد قرارات المجالس القضائية. يشترط التمثيل بمحامٍ معتمد لدى المحكمة العليا. يجب دفع الكفالة المقررة (م.355).',
  },
  {
    type: 'المعارضة',
    deadline: '10 أيام (حاضر) / شهر (غائب) من التبليغ',
    article: 'م.327–328 ق.إ.م.إ',
    conditions: 'تُرفع ضد الأحكام الغيابية. يشترط أن يكون المحكوم عليه لم يُبلَّغ شخصياً. تُقدَّم أمام نفس المحكمة التي أصدرت الحكم الغيابي.',
  },
  {
    type: 'اعتراض الغير الخارج عن الخصومة',
    deadline: 'لا أجل محدد (مدة التقادم العامة)',
    article: 'م.380 ق.إ.م.إ',
    conditions: 'يُرفع من طرف ثالث تضرر من الحكم ولم يكن طرفاً فيه. يُقدَّم أمام نفس المحكمة أو الجهة التي أصدرت الحكم المطعون فيه.',
  },
  {
    type: 'التماس إعادة النظر',
    deadline: 'شهران من اكتشاف الحالة',
    article: 'م.390 ق.إ.م.إ',
    conditions: 'يُقبل فقط في حالات حصرية: التدليس، اكتشاف وثيقة حاسمة، شهادة زور مُدانة. يُقدَّم أمام نفس الجهة القضائية التي أصدرت الحكم النهائي.',
  },
];

/* ─────────────────────── Regex Extraction ─────────────────────── */

function extractCourt(text: string): ExtractedField {
  // Try to match "محكمة [...words...]" or "المجلس القضائي [...]"
  const patterns = [
    /المجلس القضائي\s+[لـ]?\s*([\w\s]+)/,
    /محكمة\s+([\w\s]+?)(?:\s*[-–\n]|$)/m,
    /لدى\s+محكمة\s+([\w\s]+?)(?:\s*[-–\n,،]|$)/m,
    /أمام\s+محكمة\s+([\w\s]+?)(?:\s*[-–\n,،]|$)/m,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m && m[0]) {
      return { label: 'الجهة القضائية', value: m[0].trim().replace(/\n+/g, ' '), found: true };
    }
  }
  return { label: 'الجهة القضائية', value: 'لم يتم استخراجه — يرجى المراجعة يدوياً', found: false };
}

function extractCaseNumber(text: string): ExtractedField {
  const patterns = [
    /(?:رقم|القضية رقم|ملف رقم|تحت رقم)[:\s]+(\d[\d/\-\.]+)/i,
    /\b(\d{1,6}\/\d{4})\b/,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m && m[1]) {
      return { label: 'رقم القضية', value: m[1].trim(), found: true };
    }
  }
  return { label: 'رقم القضية', value: 'لم يتم استخراجه — يرجى المراجعة يدوياً', found: false };
}

function extractDate(text: string): ExtractedField {
  const patterns = [
    /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/,
    /\b(\d{1,2})\s+(يناير|فبراير|مارس|أبريل|ماي|مايو|جوان|يونيو|جويلية|يوليو|أوت|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر|جانفي|فيفري|أفريل|جوين)\s+(\d{4})\b/i,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) {
      return { label: 'تاريخ الحكم', value: m[0].trim(), found: true };
    }
  }
  return { label: 'تاريخ الحكم', value: 'لم يتم استخراجه — يرجى المراجعة يدوياً', found: false };
}

function extractPlaintiff(text: string): ExtractedField {
  // Look for text after "بين" up to "و" or "ضد"
  const patterns = [
    /(?:المدعي|الطاعن|المستأنف|المدعو|لفائدة)[:\s]+([^\n,،ضد]{3,60})/i,
    /بين[:\s]+([^\n,،ضد]{3,60})/i,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m && m[1]) {
      const val = m[1].trim().replace(/\n+/g, ' ').slice(0, 80);
      if (val.length > 2) return { label: 'المدعي / المستأنف', value: val, found: true };
    }
  }
  return { label: 'المدعي / المستأنف', value: 'لم يتم استخراجه — يرجى المراجعة يدوياً', found: false };
}

function extractDefendant(text: string): ExtractedField {
  const patterns = [
    /(?:المدعى عليه|المطعون ضده|المستأنف عليه)[:\s]+([^\n,،]{3,60})/i,
    /(?:ضد|في مواجهة)[:\s]+([^\n,،]{3,60})/i,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m && m[1]) {
      const val = m[1].trim().replace(/\n+/g, ' ').slice(0, 80);
      if (val.length > 2) return { label: 'المدعى عليه / المستأنف عليه', value: val, found: true };
    }
  }
  return { label: 'المدعى عليه / المستأنف عليه', value: 'لم يتم استخراجه — يرجى المراجعة يدوياً', found: false };
}

function extractRuling(text: string): ExtractedField {
  // Look for text after keywords indicating the operative part
  const keywords = ['لهذه الأسباب', 'تقضي المحكمة', 'المنطوق', 'حكمت المحكمة', 'قرر المجلس', 'لذلك'];
  for (const kw of keywords) {
    const idx = text.indexOf(kw);
    if (idx !== -1) {
      const snippet = text.slice(idx, idx + 600).replace(/\n+/g, ' ').trim();
      return { label: 'منطوق الحكم', value: snippet, found: true };
    }
  }
  return { label: 'منطوق الحكم', value: 'لم يتم استخراجه — يرجى المراجعة يدوياً', found: false };
}

function extractLegalArticles(text: string): string[] {
  // Match "المادة 123" or "م.123" or "م123"
  const articlePattern = /(?:المادة|م\.?)\s*(\d+(?:\s*مكرر(?:\s*\d+)?)?)/gi;
  const found = new Set<string>();
  let m;
  while ((m = articlePattern.exec(text)) !== null) {
    found.add(`م.${m[1].replace(/\s+/g, ' ').trim()}`);
    if (found.size >= 15) break;
  }
  return Array.from(found);
}

function extractJudgment(text: string): JudgmentExtraction {
  return {
    court: extractCourt(text),
    caseNumber: extractCaseNumber(text),
    date: extractDate(text),
    plaintiff: extractPlaintiff(text),
    defendant: extractDefendant(text),
    ruling: extractRuling(text),
    legalArticles: extractLegalArticles(text),
  };
}

/* ─────────────────────── Helpers ─────────────────────── */

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميغابايت`;
}

const PROGRESS_STEPS = [
  'جاري قراءة الملف...',
  'استخراج النص من المستند...',
  'تحليل نص الحكم...',
  'استخراج بيانات القضية...',
  'البحث عن المواد القانونية...',
  'إعداد التقرير...',
];

/* ─────────────────────── Component ─────────────────────── */

export default function JudgmentAnalyzer({ onBack }: { onBack: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<JudgmentExtraction | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedAppeal, setExpandedAppeal] = useState<number | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    setExtraction(null);
    const f = acceptedFiles[0];
    if (!f) return;
    if (f.size > MAX_FILE_SIZE) {
      setError('حجم الملف يتجاوز الحد المسموح (10 ميغابايت)');
      return;
    }
    setFile(f);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    multiple: false,
  });

  function startProgress() {
    setProgressStep(0);
    let step = 0;
    progressInterval.current = setInterval(() => {
      step++;
      if (step < PROGRESS_STEPS.length) setProgressStep(step);
    }, 500);
  }

  function stopProgress() {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }

  async function analyze() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setExtraction(null);
    startProgress();

    try {
      const text = await extractTextFromFile(file);
      if (!text.trim()) throw new Error('لم يتم استخراج أي نص من المستند. تأكد أن الملف يحتوي على نص.');
      // Client-side programmatic extraction — no API call
      const result = extractJudgment(text);
      setExtraction(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      stopProgress();
      setLoading(false);
    }
  }

  function copyResults() {
    if (!extraction) return;
    const lines: string[] = [
      `تقرير استخراج بيانات الحكم القضائي`,
      `${'─'.repeat(50)}`,
      `${extraction.court.label}: ${extraction.court.value}`,
      `${extraction.caseNumber.label}: ${extraction.caseNumber.value}`,
      `${extraction.date.label}: ${extraction.date.value}`,
      `${extraction.plaintiff.label}: ${extraction.plaintiff.value}`,
      `${extraction.defendant.label}: ${extraction.defendant.value}`,
      ``,
      `${extraction.ruling.label}:`,
      extraction.ruling.value,
      ``,
      `المواد القانونية المذكورة:`,
      extraction.legalArticles.length > 0 ? extraction.legalArticles.join(' — ') : 'لم يتم استخراجها',
      ``,
      `${'─'.repeat(50)}`,
      `طرق الطعن المتاحة (وفق القانون الجزائري):`,
      ...APPEAL_OPTIONS.map(a => `• ${a.type} — الأجل: ${a.deadline} (${a.article})`),
      ``,
      `${'─'.repeat(50)}`,
      `⚠️ تنبيه: هذا الاستخراج الآلي للإرشاد فقط ويحتاج للمراجعة اليدوية.`,
    ];
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function reset() {
    setFile(null);
    setExtraction(null);
    setError(null);
    setExpandedAppeal(null);
  }

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-[#1a3a5c] dark:text-[#f0c040] text-lg">→</button>
        <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">⚖️ استخراج بيانات الأحكام</h2>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
        قم برفع ملف الحكم القضائي (PDF أو Word) وسيتم استخراج البيانات الأساسية آلياً وعرض طرق الطعن المتاحة وفق القانون الجزائري.
      </p>

      <div className="flex items-start gap-2 bg-green-50 dark:bg-green-900/15 border border-green-200 dark:border-green-800 rounded-xl p-3 mb-4">
        <span className="text-sm flex-shrink-0 mt-0.5">✅</span>
        <p className="text-[11px] text-green-700 dark:text-green-400 leading-relaxed">
          الاستخراج يتم محلياً على جهازك — لا يتم إرسال أي بيانات لأي خادم
        </p>
      </div>

      {/* Upload area */}
      {!extraction && !loading && (
        <>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mb-4 ${
              isDragActive
                ? 'border-[#1a3a5c] bg-blue-50 dark:bg-blue-900/20'
                : file
                ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-[#1a3a5c] hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
            }`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div>
                <div className="text-3xl mb-2">{file.name.endsWith('.pdf') ? '📄' : '📝'}</div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{file.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatFileSize(file.size)}</p>
                <p className="text-[10px] text-[#1a3a5c] dark:text-blue-400 mt-2">اضغط أو اسحب ملفاً آخر للاستبدال</p>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-3 opacity-60">⚖️</div>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                  {isDragActive ? 'أفلت ملف الحكم هنا...' : 'اسحب ملف الحكم القضائي هنا أو اضغط للاختيار'}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                  PDF أو DOCX — الحد الأقصى 10 ميغابايت
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-4">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              <button onClick={() => { setError(null); setFile(null); }} className="text-xs text-red-500 dark:text-red-400 underline mt-1">
                حاول مرة أخرى
              </button>
            </div>
          )}

          {file && !error && (
            <button
              onClick={analyze}
              className="w-full py-3 bg-[#1a3a5c] hover:bg-[#142d47] text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>⚖️</span>
              <span>استخراج بيانات الحكم</span>
            </button>
          )}
        </>
      )}

      {/* Loading state */}
      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full border-2 border-[#1a3a5c] border-t-transparent animate-spin" />
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">جاري استخراج البيانات...</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{PROGRESS_STEPS[progressStep]}</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-[#1a3a5c] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(((progressStep + 1) / PROGRESS_STEPS.length) * 95, 95)}%` }}
            />
          </div>
          <div className="mt-4 space-y-1.5">
            {PROGRESS_STEPS.map((step, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 text-xs transition-all duration-300 ${
                  i < progressStep ? 'text-green-600 dark:text-green-400' :
                  i === progressStep ? 'text-[#1a3a5c] dark:text-blue-400 font-medium' :
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

      {/* Results */}
      {extraction && (
        <div className="space-y-4">
          {/* Header card */}
          <div className="bg-[#1a3a5c] dark:bg-[#1a3a5c]/80 rounded-xl p-4 text-white">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-blue-200 text-[10px] mb-1">الجهة القضائية</p>
                <h3 className="font-bold text-base leading-relaxed">
                  {extraction.court.found ? extraction.court.value : '—'}
                </h3>
              </div>
              <div className="text-left flex-shrink-0">
                <p className="text-xs text-blue-300">رقم القضية</p>
                <p className="text-sm font-bold">{extraction.caseNumber.found ? extraction.caseNumber.value : '—'}</p>
                <p className="text-xs text-blue-300 mt-1">{extraction.date.found ? extraction.date.value : '—'}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-700/50 grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-blue-300">المدعي / المستأنف</p>
                <p className="text-xs text-white font-medium">
                  {extraction.plaintiff.found ? extraction.plaintiff.value : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-blue-300">المدعى عليه</p>
                <p className="text-xs text-white font-medium">
                  {extraction.defendant.found ? extraction.defendant.value : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Extracted fields (not-found ones) */}
          {[extraction.court, extraction.caseNumber, extraction.date, extraction.plaintiff, extraction.defendant].some(f => !f.found) && (
            <div className="bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-700 rounded-xl p-3">
              <p className="text-[11px] text-amber-800 dark:text-amber-300 font-bold mb-1">⚠️ حقول لم يتم استخراجها تلقائياً:</p>
              {[extraction.court, extraction.caseNumber, extraction.date, extraction.plaintiff, extraction.defendant]
                .filter(f => !f.found)
                .map((f, i) => (
                  <p key={i} className="text-[11px] text-amber-700 dark:text-amber-400">• {f.label}: يرجى المراجعة يدوياً</p>
                ))}
            </div>
          )}

          {/* Ruling */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
            <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400 mb-2">📜 منطوق الحكم</h4>
            <p className="text-sm text-amber-900 dark:text-amber-300 leading-relaxed font-medium whitespace-pre-wrap">
              {extraction.ruling.found ? extraction.ruling.value : 'لم يتم استخراجه — يرجى المراجعة يدوياً'}
            </p>
          </div>

          {/* Legal Articles */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040] mb-3">📚 المواد القانونية المذكورة في الحكم</h4>
            {extraction.legalArticles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {extraction.legalArticles.map((article, i) => (
                  <span
                    key={i}
                    className="text-xs px-3 py-1.5 bg-[#1a3a5c]/10 dark:bg-[#1a3a5c]/30 text-[#1a3a5c] dark:text-blue-300 rounded-full border border-[#1a3a5c]/20 dark:border-blue-700/50"
                  >
                    {article}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">لم يتم العثور على مواد قانونية صريحة.</p>
            )}
          </div>

          {/* Appeal Options — Static table always shown */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040] mb-3">🔔 طرق الطعن المتاحة (وفق القانون الجزائري)</h4>
            <div className="space-y-2">
              {APPEAL_OPTIONS.map((appeal, i) => (
                <div
                  key={i}
                  className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedAppeal(expandedAppeal === i ? null : i)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all text-right"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-base">⚡</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{appeal.type}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">
                            الأجل: {appeal.deadline}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">{appeal.article}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-gray-400 dark:text-gray-500 text-sm flex-shrink-0">
                      {expandedAppeal === i ? '▲' : '▼'}
                    </span>
                  </button>
                  {expandedAppeal === i && (
                    <div className="px-3 pb-3 pt-1 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-600">
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        <span className="font-medium text-gray-700 dark:text-gray-300">الشروط: </span>
                        {appeal.conditions}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3">
            <p className="text-[10px] text-yellow-700 dark:text-yellow-400 leading-relaxed">
              ⚠️ تنبيه: الاستخراج الآلي للبيانات يعتمد على أنماط نصية ويحتاج للمراجعة اليدوية. طرق الطعن المعروضة ثابتة وفق القانون الجزائري وتسري على جميع الأحكام.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={copyResults}
              className="flex-1 py-2.5 bg-[#1a3a5c] dark:bg-[#f0c040] text-white dark:text-[#1a3a5c] rounded-xl text-sm font-medium transition-all active:scale-[0.98]"
            >
              {copied ? '✅ تم النسخ' : '📋 نسخ التقرير'}
            </button>
            <button
              onClick={reset}
              className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 transition-all active:scale-[0.98]"
            >
              🔄 تحليل حكم آخر
            </button>
          </div>
        </div>
      )}

      {!loading && !extraction && error && (
        <div className="mt-4">
          <button
            onClick={() => setError(null)}
            className="w-full py-2.5 bg-[#1a3a5c] hover:bg-[#142d47] text-white rounded-xl text-sm font-medium transition-all"
          >
            🔄 حاول مرة أخرى
          </button>
        </div>
      )}
    </div>
  );
}
