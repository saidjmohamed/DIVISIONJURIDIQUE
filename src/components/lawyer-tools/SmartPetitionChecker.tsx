'use client';

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';

/* ─────────────────────── Types ─────────────────────── */

interface CheckResult {
  id: string;
  label: string;
  article: string;
  status: 'pass' | 'fail' | 'warning' | 'not_found';
  critical: boolean;
  details: string;
}

interface AnalysisResult {
  result: 'accepted' | 'rejected' | 'needs_review';
  score: number;
  checks: CheckResult[];
  summary: string;
  recommendations: string[];
}

type DocumentType = 'opening' | 'appeal' | 'complaint_regular' | 'complaint_civil' | 'complaint_direct';
type DocumentCategory = 'petition' | 'complaint';

const DOC_CATEGORIES: { key: DocumentCategory; label: string }[] = [
  { key: 'petition', label: 'عريضة مدنية' },
  { key: 'complaint', label: 'شكوى جزائية' },
];

const DOC_TYPES: Record<DocumentCategory, { key: DocumentType; label: string }[]> = {
  petition: [
    { key: 'opening', label: 'عريضة افتتاحية' },
    { key: 'appeal', label: 'عريضة استئنافية' },
  ],
  complaint: [
    { key: 'complaint_regular', label: 'شكوى عادية' },
    { key: 'complaint_civil', label: 'شكوى مع ادعاء مدني' },
    { key: 'complaint_direct', label: 'تكليف مباشر' },
  ],
};

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  opening: 'عريضة افتتاحية',
  appeal: 'عريضة استئنافية',
  complaint_regular: 'شكوى عادية',
  complaint_civil: 'شكوى مع ادعاء مدني',
  complaint_direct: 'تكليف مباشر',
};

/* ─────────────────────── Helpers ─────────────────────── */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

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
      // Strip the data:...;base64, prefix
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('فشل قراءة الملف'));
    reader.readAsDataURL(file);
  });
}

/* ─────────────────────── Status visual helpers ─────────────────────── */

function statusIcon(status: CheckResult['status']): string {
  switch (status) {
    case 'pass': return '✅';
    case 'fail': return '❌';
    case 'warning': return '⚠️';
    case 'not_found': return '❓';
  }
}

function statusBorderColor(status: CheckResult['status']): string {
  switch (status) {
    case 'pass': return 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20';
    case 'fail': return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20';
    case 'warning': return 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20';
    case 'not_found': return 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50';
  }
}

function statusLabel(status: CheckResult['status']): string {
  switch (status) {
    case 'pass': return 'مستوفى';
    case 'fail': return 'مفقود';
    case 'warning': return 'يحتاج مراجعة';
    case 'not_found': return 'غير متوفر';
  }
}

function verdictInfo(result: AnalysisResult['result']): { label: string; color: string; bg: string } {
  switch (result) {
    case 'accepted':
      return { label: 'مقبولة شكلاً', color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700' };
    case 'rejected':
      return { label: 'مرفوضة شكلاً', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700' };
    case 'needs_review':
      return { label: 'تحتاج مراجعة', color: 'text-yellow-700 dark:text-yellow-300', bg: 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-700' };
  }
}

function scoreColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

/* ─────────────────────── Progress Animation Steps ─────────────────────── */

const PROGRESS_STEPS = [
  'جاري قراءة الملف...',
  'استخراج النص من المستند...',
  'إرسال العريضة للتحليل...',
  'فحص البيانات الإلزامية...',
  'التحقق من الشروط الشكلية...',
  'مراجعة المواد القانونية...',
  'إعداد التقرير...',
];

/* ─────────────────────── Component ─────────────────────── */

export default function SmartPetitionChecker({ onBack }: { onBack: () => void }) {
  const [category, setCategory] = useState<DocumentCategory>('petition');
  const [petitionType, setPetitionType] = useState<DocumentType>('opening');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [filterStatus, setFilterStatus] = useState<CheckResult['status'] | 'all'>('all');
  const [copied, setCopied] = useState(false);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Dropzone ── */
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    setAnalysis(null);
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

  /* ── Progress animation ── */
  function startProgress() {
    setProgressStep(0);
    let step = 0;
    progressInterval.current = setInterval(() => {
      step++;
      if (step < PROGRESS_STEPS.length) {
        setProgressStep(step);
      }
    }, 2500);
  }

  function stopProgress() {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }

  /* ── Analysis ── */
  async function analyze() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    startProgress();

    try {
      const isPdf = file.name.toLowerCase().endsWith('.pdf');
      let payload: Record<string, string>;

      if (isPdf) {
        const base64 = await fileToBase64(file);
        payload = { pdfBase64: base64, petitionType };
      } else {
        // DOCX — extract text client-side
        const text = await extractDocxText(file);
        if (!text.trim()) {
          throw new Error('لم يتم استخراج أي نص من المستند. تأكد أن الملف يحتوي على نص.');
        }
        payload = { text, petitionType };
      }

      const res = await fetch('/api/petition-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        const text = await res.clone().text().catch(() => '');
        throw new Error(text.slice(0, 200) || 'حدث خطأ أثناء التحليل');
      }

      if (!res.ok || data.error) {
        throw new Error(data.error || 'حدث خطأ أثناء التحليل');
      }

      if (!data.analysis) {
        throw new Error('لم يتم الحصول على نتائج التحليل');
      }

      setAnalysis(data.analysis as AnalysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      stopProgress();
      setLoading(false);
    }
  }

  /* ── Export ── */
  function exportResults() {
    if (!analysis) return;
    const typeName = DOC_TYPE_LABELS[petitionType] ?? petitionType;
    const verdict = verdictInfo(analysis.result);

    const lines: string[] = [
      `تقرير التحقق الشكلي الذكي`,
      `نوع العريضة: ${typeName}`,
      `الملف: ${file?.name ?? '—'}`,
      `النتيجة: ${verdict.label} (${analysis.score}/100)`,
      `${'─'.repeat(50)}`,
      ``,
      `الملخص:`,
      analysis.summary,
      ``,
      `${'─'.repeat(50)}`,
      `الشروط المفحوصة:`,
      ``,
    ];

    for (const check of analysis.checks) {
      const icon = check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : check.status === 'warning' ? '⚠️' : '❓';
      lines.push(`${icon} ${check.label} (${check.article})${check.critical ? ' [جوهري]' : ''}`);
      lines.push(`   ${check.details}`);
      lines.push(``);
    }

    if (analysis.recommendations.length > 0) {
      lines.push(`${'─'.repeat(50)}`);
      lines.push(`التوصيات:`);
      analysis.recommendations.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
    }

    lines.push(``, `${'─'.repeat(50)}`);
    lines.push(`تنبيه: هذا التحليل للإرشاد فقط ولا يغني عن الاستشارة القانونية المتخصصة.`);

    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  /* ── Reset ── */
  function reset() {
    setFile(null);
    setAnalysis(null);
    setError(null);
    setFilterStatus('all');
  }

  /* ── Filtered checks ── */
  const filteredChecks = analysis
    ? filterStatus === 'all'
      ? analysis.checks
      : analysis.checks.filter((c) => c.status === filterStatus)
    : [];

  const statusCounts = analysis
    ? {
        all: analysis.checks.length,
        pass: analysis.checks.filter((c) => c.status === 'pass').length,
        fail: analysis.checks.filter((c) => c.status === 'fail').length,
        warning: analysis.checks.filter((c) => c.status === 'warning').length,
        not_found: analysis.checks.filter((c) => c.status === 'not_found').length,
      }
    : null;

  /* ─────────────────────── Render ─────────────────────── */

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-[#1a3a5c] dark:text-[#f0c040] text-lg">→</button>
        <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">🤖 التحقق الذكي من العرائض</h2>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
قم برفع العريضة أو الشكوى (PDF أو Word) وسيتم تحليلها تلقائياً للتحقق من استيفاء الشروط الشكلية وفقاً لـق.إ.م.إ وق.إ.ج.
      </p>

      <div className="flex items-start gap-2 bg-green-50 dark:bg-green-900/15 border border-green-200 dark:border-green-800 rounded-xl p-3 mb-4">
        <span className="text-sm flex-shrink-0 mt-0.5">🔒</span>
        <p className="text-[11px] text-green-700 dark:text-green-400 leading-relaxed">
خصوصيتك محمية: لا يتم حفظ المستند على أي سيرفر. يتم تحليله فورياً ثم حذفه تلقائياً بعد إرجاع النتيجة.
        </p>
      </div>

      {/* Document Type Selector */}
      {!analysis && (
        <div className="space-y-3 mb-4">
          {/* Category selector */}
          <div className="flex gap-2">
            {DOC_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => { setCategory(cat.key); setPetitionType(DOC_TYPES[cat.key][0].key); }}
                className={`flex-1 text-xs px-3 py-2.5 rounded-xl transition-all font-medium ${
                  category === cat.key
                    ? 'bg-[#1a3a5c] text-white dark:bg-[#f0c040] dark:text-[#1a3a5c]'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                }`}
              >
                {cat.key === 'petition' ? '⚖️' : '📝'} {cat.label}
              </button>
            ))}
          </div>

          {/* Sub-type selector */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {DOC_TYPES[category].map((dt) => (
              <button
                key={dt.key}
                onClick={() => setPetitionType(dt.key)}
                className={`whitespace-nowrap text-[11px] px-3 py-1.5 rounded-full transition-all ${
                  petitionType === dt.key
                    ? 'bg-[#7c3aed] text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                {dt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upload area */}
      {!analysis && !loading && (
        <>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mb-4 ${
              isDragActive
                ? 'border-[#7c3aed] bg-purple-50 dark:bg-purple-900/20'
                : file
                ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-[#7c3aed] hover:bg-purple-50/50 dark:hover:bg-purple-900/10'
            }`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div>
                <div className="text-3xl mb-2">{file.name.endsWith('.pdf') ? '📄' : '📝'}</div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{file.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatFileSize(file.size)}</p>
                <p className="text-[10px] text-[#7c3aed] dark:text-purple-400 mt-2">اضغط أو اسحب ملفاً آخر للاستبدال</p>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-3 opacity-60">📎</div>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                  {isDragActive ? 'أفلت الملف هنا...' : 'اسحب الملف هنا أو اضغط للاختيار'}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                  PDF أو DOCX — الحد الأقصى 10 ميغابايت
                </p>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-4">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              <button
                onClick={() => { setError(null); setFile(null); }}
                className="text-xs text-red-500 dark:text-red-400 underline mt-1"
              >
                حاول مرة أخرى
              </button>
            </div>
          )}

          {/* Analyze button */}
          {file && !error && (
            <button
              onClick={analyze}
              className="w-full py-3 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>🔍</span>
              <span>بدء التحليل الذكي</span>
            </button>
          )}
        </>
      )}

      {/* Loading state */}
      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full border-2 border-[#7c3aed] border-t-transparent animate-spin" />
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                جاري تحليل العريضة...
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {PROGRESS_STEPS[progressStep]}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-[#7c3aed] rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(((progressStep + 1) / PROGRESS_STEPS.length) * 90, 90)}%` }}
            />
          </div>

          {/* Animated steps */}
          <div className="mt-4 space-y-1.5">
            {PROGRESS_STEPS.map((step, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 text-xs transition-all duration-500 ${
                  i < progressStep
                    ? 'text-green-600 dark:text-green-400'
                    : i === progressStep
                    ? 'text-[#7c3aed] dark:text-purple-400 font-medium'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              >
                <span className="flex-shrink-0">
                  {i < progressStep ? '✅' : i === progressStep ? '⏳' : '○'}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {analysis && (
        <div className="space-y-4">
          {/* Verdict card */}
          {(() => {
            const v = verdictInfo(analysis.result);
            return (
              <div className={`rounded-xl p-4 border ${v.bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {analysis.result === 'accepted' ? '✅' : analysis.result === 'rejected' ? '❌' : '⚠️'}
                    </span>
                    <div>
                      <h3 className={`text-base font-bold ${v.color}`}>{v.label}</h3>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {DOC_TYPE_LABELS[petitionType]} — {file?.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${analysis.score >= 80 ? 'text-green-600 dark:text-green-400' : analysis.score >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                      {analysis.score}
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">/ 100</div>
                  </div>
                </div>

                {/* Score bar */}
                <div className="w-full bg-white/50 dark:bg-gray-900/30 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-700 ${scoreColor(analysis.score)}`}
                    style={{ width: `${analysis.score}%` }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040] mb-2">📝 الملخص</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{analysis.summary}</p>
          </div>

          {/* Filter tabs */}
          {statusCounts && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {(
                [
                  { key: 'all' as const, label: 'الكل', count: statusCounts.all },
                  { key: 'pass' as const, label: 'مستوفى', count: statusCounts.pass },
                  { key: 'fail' as const, label: 'مفقود', count: statusCounts.fail },
                  { key: 'warning' as const, label: 'مراجعة', count: statusCounts.warning },
                  { key: 'not_found' as const, label: 'غير متوفر', count: statusCounts.not_found },
                ] as const
              )
                .filter((tab) => tab.count > 0 || tab.key === 'all')
                .map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilterStatus(tab.key)}
                    className={`whitespace-nowrap text-[10px] px-2.5 py-1 rounded-full transition-all ${
                      filterStatus === tab.key
                        ? 'bg-[#7c3aed] text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
            </div>
          )}

          {/* Checks list */}
          <div className="space-y-2">
            {filteredChecks.map((check, i) => (
              <div
                key={check.id || i}
                className={`rounded-xl p-3 border transition-all ${statusBorderColor(check.status)}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-base flex-shrink-0 mt-0.5">{statusIcon(check.status)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {check.label}
                      </span>
                      {check.critical && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-medium">
                          جوهري
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">{check.article}</span>
                      <span className="text-[10px] text-gray-300 dark:text-gray-600">|</span>
                      <span className={`text-[10px] font-medium ${
                        check.status === 'pass' ? 'text-green-600 dark:text-green-400' :
                        check.status === 'fail' ? 'text-red-600 dark:text-red-400' :
                        check.status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-gray-500 dark:text-gray-400'
                      }`}>
                        {statusLabel(check.status)}
                      </span>
                    </div>
                    {check.details && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
                        {check.details}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040] mb-3">💡 التوصيات</h4>
              <ul className="space-y-2">
                {analysis.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-[#7c3aed] dark:text-purple-400 flex-shrink-0 mt-0.5">●</span>
                    <span className="leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Disclaimer */}
          <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3">
            <p className="text-[10px] text-yellow-700 dark:text-yellow-400 leading-relaxed">
              ⚠️ تنبيه: هذا التحليل الذكي للإرشاد فقط ولا يغني عن المراجعة القانونية المتخصصة. يعتمد على الذكاء الاصطناعي وقد لا يكون دقيقاً بنسبة 100%.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={exportResults}
              className="flex-1 py-2.5 bg-[#1a3a5c] dark:bg-[#f0c040] text-white dark:text-[#1a3a5c] rounded-xl text-sm font-medium transition-all active:scale-[0.98]"
            >
              {copied ? '✅ تم النسخ' : '📋 نسخ التقرير'}
            </button>
            <button
              onClick={reset}
              className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 transition-all active:scale-[0.98]"
            >
              🔄 تحليل عريضة أخرى
            </button>
          </div>
        </div>
      )}

      {/* Error state after analysis attempt */}
      {!loading && !analysis && error && (
        <div className="mt-4">
          <button
            onClick={() => { setError(null); }}
            className="w-full py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl text-sm font-medium transition-all"
          >
            🔄 حاول مرة أخرى
          </button>
        </div>
      )}
    </div>
  );
}
