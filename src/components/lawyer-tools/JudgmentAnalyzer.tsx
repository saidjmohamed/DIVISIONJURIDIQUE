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
  const patterns = [
    /المجلس القضائي\s+[لـ]?\s*([\w\s]+)/,
    /محكمة\s+([\w\s]+?)(?:\s*[-–\n]|$)/m,
    /لدى\s+محكمة\s+([\w\s]+?)(?:\s*[-–\n,،]|$)/m,
    /أمام\s+محكمة\s+([\w\s]+?)(?:\s*[-–\n,،]|$)/m,
    /مجلس\s+قضاء\s+([\w\s]+?)(?:\s*[-–\n,،]|$)/m,
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
    /(?:رقم|القضية رقم|ملف رقم|تحت رقم|فهرس رقم)[:\s]+(\d[\d/\-\.]+)/i,
    /\b(\d{1,6}\/\d{4})\b/,
    /رقم\s*الجدول\s*[:\s]*(\d+)/i,
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
    /بتاريخ\s*[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
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
  const patterns = [
    /(?:المدعي|الطاعن|المستأنف|المدعو|لفائدة)[:\s]+([^\n,،ضد]{3,100})/i,
    /بين[:\s]+([^\n,،ضد]{3,100})/i,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m && m[1]) {
      const val = m[1].trim().replace(/\n+/g, ' ').slice(0, 120);
      if (val.length > 2) return { label: 'المدعي / المستأنف', value: val, found: true };
    }
  }
  return { label: 'المدعي / المستأنف', value: 'لم يتم استخراجه — يرجى المراجعة يدوياً', found: false };
}

function extractDefendant(text: string): ExtractedField {
  const patterns = [
    /(?:المدعى عليه|المطعون ضده|المستأنف عليه)[:\s]+([^\n,،]{3,100})/i,
    /(?:ضد|في مواجهة)[:\s]+([^\n,،]{3,100})/i,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m && m[1]) {
      const val = m[1].trim().replace(/\n+/g, ' ').slice(0, 120);
      if (val.length > 2) return { label: 'المدعى عليه / المستأنف عليه', value: val, found: true };
    }
  }
  return { label: 'المدعى عليه / المستأنف عليه', value: 'لم يتم استخراجه — يرجى المراجعة يدوياً', found: false };
}

function extractRuling(text: string): ExtractedField {
  const keywords = ['لهذه الأسباب', 'تقضي المحكمة', 'المنطوق', 'حكمت المحكمة', 'قرر المجلس', 'لذلك', 'قضت المحكمة علنيا'];
  for (const kw of keywords) {
    const idx = text.indexOf(kw);
    if (idx !== -1) {
      const snippet = text.slice(idx, idx + 1000).replace(/\n+/g, ' ').trim();
      return { label: 'منطوق الحكم', value: snippet, found: true };
    }
  }
  return { label: 'منطوق الحكم', value: 'لم يتم استخراجه — يرجى المراجعة يدوياً', found: false };
}

function extractLegalArticles(text: string): string[] {
  const articlePattern = /(?:المادة|م\.?)\s*(\d+(?:\s*مكرر(?:\s*\d+)?)?)/gi;
  const found = new Set<string>();
  let m;
  while ((m = articlePattern.exec(text)) !== null) {
    found.add(`م.${m[1].replace(/\s+/g, ' ').trim()}`);
    if (found.size >= 20) break;
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

const MAX_FILE_SIZE = 15 * 1024 * 1024;

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
      setError('حجم الملف يتجاوز الحد المسموح (15 ميغابايت)');
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
    }, 400);
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

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-[#1a3a5c] dark:text-[#f0c040] text-lg font-bold">→</button>
        <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">⚖️ استخراج بيانات الأحكام</h2>
      </div>

      {!extraction && (
        <div className="space-y-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
              isDragActive
                ? 'border-[#1a3a5c] bg-[#1a3a5c]/5'
                : 'border-gray-200 dark:border-gray-700 hover:border-[#1a3a5c]/50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="text-4xl mb-3">📄</div>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
              {file ? file.name : 'اسحب ملف الحكم هنا أو انقر للاختيار'}
            </p>
            <p className="text-xs text-gray-500 mt-2">يدعم PDF و DOCX (حتى 15 ميغابايت)</p>
            {file && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-[10px] text-gray-600 dark:text-gray-400">
                <span>{formatFileSize(file.size)}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="text-red-500 hover:text-red-600"
                >
                  حذف
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-xs text-red-600 dark:text-red-400">
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={analyze}
            disabled={!file || loading}
            className="w-full py-3 bg-[#1a3a5c] hover:bg-[#1a3a5c]/90 disabled:opacity-50 text-white rounded-xl font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{PROGRESS_STEPS[progressStep]}</span>
              </>
            ) : (
              <>
                <span>🔍 تحليل الحكم واستخراج البيانات</span>
              </>
            )}
          </button>
        </div>
      )}

      {extraction && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="bg-[#1a3a5c] p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">البيانات المستخرجة</h3>
              <button
                onClick={() => setExtraction(null)}
                className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded"
              >
                تحليل ملف آخر
              </button>
            </div>

            <div className="p-4 space-y-3">
              {[
                extraction.court,
                extraction.caseNumber,
                extraction.date,
                extraction.plaintiff,
                extraction.defendant,
              ].map((field, i) => (
                <div key={i} className="flex flex-col gap-1 border-b border-gray-50 dark:border-gray-700/50 pb-2 last:border-0">
                  <span className="text-[10px] text-gray-500">{field.label}:</span>
                  <span className={`text-xs font-bold ${field.found ? 'text-gray-800 dark:text-gray-200' : 'text-amber-600 italic'}`}>
                    {field.value}
                  </span>
                </div>
              ))}

              <div className="pt-2">
                <span className="text-[10px] text-gray-500 block mb-1">منطوق الحكم:</span>
                <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg text-xs text-gray-700 dark:text-gray-300 leading-relaxed max-h-40 overflow-y-auto">
                  {extraction.ruling.value}
                </div>
              </div>

              <div className="pt-2">
                <span className="text-[10px] text-gray-500 block mb-2">المواد القانونية المكتشفة:</span>
                <div className="flex flex-wrap gap-1.5">
                  {extraction.legalArticles.length > 0 ? (
                    extraction.legalArticles.map((art, i) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-[10px] font-mono">
                        {art}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-gray-400 italic">لم يتم اكتشاف مواد صريحة</span>
                  )}
                </div>
              </div>

              <button
                onClick={copyResults}
                className="w-full mt-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold transition-all"
              >
                {copied ? '✅ تم النسخ' : '📋 نسخ التقرير كاملاً'}
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-bold text-sm text-[#1a3a5c] dark:text-[#f0c040] mb-3">طرق الطعن المتاحة</h3>
            <div className="space-y-2">
              {APPEAL_OPTIONS.map((opt, i) => (
                <div key={i} className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedAppeal(expandedAppeal === i ? null : i)}
                    className="w-full flex items-center justify-between p-3 text-right hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{opt.type}</span>
                      <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded">
                        {opt.deadline}
                      </span>
                    </div>
                    <span className={`text-xs transition-transform ${expandedAppeal === i ? 'rotate-180' : ''}`}>↓</span>
                  </button>
                  {expandedAppeal === i && (
                    <div className="p-3 pt-0 bg-gray-50 dark:bg-gray-900/30 text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-700">
                      <p className="font-bold text-blue-600 dark:text-blue-400 mb-1">{opt.article}</p>
                      {opt.conditions}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
          ⚠️ تنبيه: هذا الاستخراج آلي ويعتمد على جودة النص في الملف المرفوع. يجب على المحامي مراجعة البيانات يدوياً ومطابقتها مع أصل الحكم قبل اتخاذ أي إجراء قانوني.
        </p>
      </div>
    </div>
  );
}
