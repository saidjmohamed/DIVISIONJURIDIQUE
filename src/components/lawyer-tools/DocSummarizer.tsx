'use client';

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';

/* ─────────────────────── Types ─────────────────────── */

interface DocSummary {
  title: string;
  type: string;
  summary: string;
  keyPoints: string[];
  parties: string[];
  dates: string[];
  legalReferences: string[];
  actionItems: string[];
}

/* ─────────────────────── Helpers ─────────────────────── */

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميغابايت`;
}

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import('mammoth/mammoth.browser');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('فشل قراءة الملف'));
    reader.readAsDataURL(file);
  });
}

/* ─────────────────────── Progress Steps ─────────────────────── */

const PROGRESS_STEPS = [
  'جاري قراءة الملف...',
  'استخراج النص من المستند...',
  'إرسال المستند للتلخيص...',
  'تحليل المحتوى القانوني...',
  'استخراج النقاط الأساسية...',
  'إعداد الملخص...',
];

/* ─────────────────────── Component ─────────────────────── */

export default function DocSummarizer({ onBack }: { onBack: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DocSummary | null>(null);
  const [copied, setCopied] = useState(false);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Dropzone ── */
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    setSummary(null);
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

  /* ── Progress ── */
  function startProgress() {
    setProgressStep(0);
    let step = 0;
    progressInterval.current = setInterval(() => {
      step++;
      if (step < PROGRESS_STEPS.length) setProgressStep(step);
    }, 2000);
  }

  function stopProgress() {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }

  /* ── Summarize ── */
  async function summarize() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setSummary(null);
    startProgress();

    try {
      const isPdf = file.name.toLowerCase().endsWith('.pdf');
      let payload: Record<string, string>;

      if (isPdf) {
        const base64 = await fileToBase64(file);
        payload = { pdfBase64: base64 };
      } else {
        const text = await extractDocxText(file);
        if (!text.trim()) throw new Error('لم يتم استخراج أي نص من المستند. تأكد أن الملف يحتوي على نص.');
        payload = { text };
      }

      const res = await fetch('/api/doc-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'حدث خطأ أثناء التلخيص');
      if (!data.summary) throw new Error('لم يتم الحصول على نتائج التلخيص');
      setSummary(data.summary as DocSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      stopProgress();
      setLoading(false);
    }
  }

  /* ── Copy ── */
  function copyResults() {
    if (!summary) return;
    const lines: string[] = [
      `ملخص المستند القانوني`,
      `العنوان: ${summary.title}`,
      `النوع: ${summary.type}`,
      `${'─'.repeat(50)}`,
      ``,
      `الملخص:`,
      summary.summary,
      ``,
    ];
    if (summary.keyPoints.length > 0) {
      lines.push(`النقاط الأساسية:`);
      summary.keyPoints.forEach((p, i) => lines.push(`${i + 1}. ${p}`));
      lines.push(``);
    }
    if (summary.parties.length > 0) {
      lines.push(`الأطراف: ${summary.parties.join(' — ')}`);
      lines.push(``);
    }
    if (summary.dates.length > 0) {
      lines.push(`التواريخ المهمة:`);
      summary.dates.forEach((d, i) => lines.push(`${i + 1}. ${d}`));
      lines.push(``);
    }
    if (summary.legalReferences.length > 0) {
      lines.push(`المراجع القانونية:`);
      summary.legalReferences.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
      lines.push(``);
    }
    if (summary.actionItems.length > 0) {
      lines.push(`الإجراءات المطلوبة:`);
      summary.actionItems.forEach((a, i) => lines.push(`${i + 1}. ${a}`));
    }
    lines.push(``, `${'─'.repeat(50)}`);
    lines.push(`⚠️ تنبيه: هذا التلخيص للإرشاد فقط ولا يغني عن الاستشارة القانونية المتخصصة.`);
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  /* ── Reset ── */
  function reset() {
    setFile(null);
    setSummary(null);
    setError(null);
  }

  /* ─────────────────────── Render ─────────────────────── */

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-[#1a3a5c] dark:text-[#f0c040] text-lg">→</button>
        <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">📄 تلخيص المستندات القانونية</h2>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
        قم برفع أي مستند قانوني (PDF أو Word) وسيتم تلخيصه بذكاء واستخراج أهم النقاط والمراجع القانونية الواردة فيه.
      </p>

      <div className="flex items-start gap-2 bg-green-50 dark:bg-green-900/15 border border-green-200 dark:border-green-800 rounded-xl p-3 mb-4">
        <span className="text-sm flex-shrink-0 mt-0.5">🔒</span>
        <p className="text-[11px] text-green-700 dark:text-green-400 leading-relaxed">
          خصوصيتك محمية: لا يتم حفظ المستند على أي سيرفر. يتم تحليله فورياً ثم حذفه تلقائياً بعد إرجاع النتيجة.
        </p>
      </div>

      {/* Upload area */}
      {!summary && !loading && (
        <>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mb-4 ${
              isDragActive
                ? 'border-[#d97706] bg-amber-50 dark:bg-amber-900/20'
                : file
                ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-[#d97706] hover:bg-amber-50/50 dark:hover:bg-amber-900/10'
            }`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div>
                <div className="text-3xl mb-2">{file.name.endsWith('.pdf') ? '📄' : '📝'}</div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{file.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatFileSize(file.size)}</p>
                <p className="text-[10px] text-[#d97706] dark:text-amber-400 mt-2">اضغط أو اسحب ملفاً آخر للاستبدال</p>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-3 opacity-60">📄</div>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                  {isDragActive ? 'أفلت المستند هنا...' : 'اسحب المستند القانوني هنا أو اضغط للاختيار'}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                  PDF أو DOCX — الحد الأقصى 10 ميغابايت
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                  أحكام، عقود، مذكرات، شكاوى، قوانين، وثائق إدارية...
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
              onClick={summarize}
              className="w-full py-3 bg-[#d97706] hover:bg-[#b45309] text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>📄</span>
              <span>بدء التلخيص الذكي</span>
            </button>
          )}
        </>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full border-2 border-[#d97706] border-t-transparent animate-spin" />
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">جاري تلخيص المستند...</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{PROGRESS_STEPS[progressStep]}</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-[#d97706] rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(((progressStep + 1) / PROGRESS_STEPS.length) * 90, 90)}%` }}
            />
          </div>
          <div className="mt-4 space-y-1.5">
            {PROGRESS_STEPS.map((step, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 text-xs transition-all duration-500 ${
                  i < progressStep ? 'text-green-600 dark:text-green-400' :
                  i === progressStep ? 'text-[#d97706] dark:text-amber-400 font-medium' :
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
      {summary && (
        <div className="space-y-4">
          {/* Header card */}
          <div className="bg-[#d97706] dark:bg-[#d97706]/80 rounded-xl p-4 text-white">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h3 className="font-bold text-base mb-1">{summary.title}</h3>
                <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{summary.type}</span>
              </div>
              <span className="text-3xl opacity-80">📄</span>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040] mb-2">📝 الملخص</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{summary.summary}</p>
          </div>

          {/* Key Points */}
          {summary.keyPoints && summary.keyPoints.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040] mb-3">🎯 النقاط الأساسية</h4>
              <ul className="space-y-2">
                {summary.keyPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="w-5 h-5 flex-shrink-0 rounded-full bg-[#d97706]/20 dark:bg-amber-900/30 text-[#d97706] dark:text-amber-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Grid info */}
          <div className="grid grid-cols-1 gap-3">
            {/* Parties */}
            {summary.parties && summary.parties.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040] mb-2">👥 الأطراف المذكورة</h4>
                <div className="flex flex-wrap gap-2">
                  {summary.parties.map((party, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-700">
                      {party}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Dates */}
            {summary.dates && summary.dates.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040] mb-2">📅 التواريخ المهمة</h4>
                <ul className="space-y-1.5">
                  {summary.dates.map((date, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="text-[#d97706] dark:text-amber-400 flex-shrink-0">•</span>
                      <span className="leading-relaxed">{date}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Legal References */}
            {summary.legalReferences && summary.legalReferences.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040] mb-2">📚 المراجع القانونية</h4>
                <div className="flex flex-wrap gap-2">
                  {summary.legalReferences.map((ref, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 bg-[#1a3a5c]/10 dark:bg-[#1a3a5c]/30 text-[#1a3a5c] dark:text-blue-300 rounded-full border border-[#1a3a5c]/20 dark:border-blue-700/50">
                      {ref}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Items */}
            {summary.actionItems && summary.actionItems.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
                <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400 mb-2">✅ الإجراءات المطلوبة</h4>
                <ul className="space-y-1.5">
                  {summary.actionItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
                      <span className="flex-shrink-0 mt-0.5 font-bold">{i + 1}.</span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Disclaimer */}
          <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3">
            <p className="text-[10px] text-yellow-700 dark:text-yellow-400 leading-relaxed">
              ⚠️ تنبيه: هذا الملخص الذكي للإرشاد فقط ولا يغني عن المراجعة القانونية المتخصصة. يعتمد على الذكاء الاصطناعي وقد لا يكون دقيقاً بنسبة 100%.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={copyResults}
              className="flex-1 py-2.5 bg-[#1a3a5c] dark:bg-[#f0c040] text-white dark:text-[#1a3a5c] rounded-xl text-sm font-medium transition-all active:scale-[0.98]"
            >
              {copied ? '✅ تم النسخ' : '📋 نسخ الملخص'}
            </button>
            <button
              onClick={reset}
              className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 transition-all active:scale-[0.98]"
            >
              🔄 تلخيص مستند آخر
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {!loading && !summary && error && (
        <div className="mt-4">
          <button
            onClick={() => setError(null)}
            className="w-full py-2.5 bg-[#d97706] hover:bg-[#b45309] text-white rounded-xl text-sm font-medium transition-all"
          >
            🔄 حاول مرة أخرى
          </button>
        </div>
      )}
    </div>
  );
}
