'use client';

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';

/* ─────────────────────── Types ─────────────────────── */

interface ContractCheck {
  id: string;
  label: string;
  article: string;
  status: 'pass' | 'fail' | 'warning';
  critical: boolean;
  details: string;
}

interface ContractAnalysis {
  contractType: string;
  parties: { name: string; role: string }[];
  result: 'valid' | 'has_issues' | 'major_issues';
  score: number;
  checks: ContractCheck[];
  missingClauses: string[];
  risks: string[];
  summary: string;
  recommendations: string[];
}

type ContractType = 'sale' | 'rent' | 'work' | 'company' | 'property' | 'general';

const CONTRACT_TYPES: { key: ContractType; label: string; icon: string }[] = [
  { key: 'general', label: 'عام', icon: '📄' },
  { key: 'sale', label: 'بيع', icon: '🏷️' },
  { key: 'rent', label: 'إيجار', icon: '🏠' },
  { key: 'work', label: 'عمل', icon: '💼' },
  { key: 'company', label: 'شركة', icon: '🏢' },
  { key: 'property', label: 'عقاري', icon: '🏗️' },
];

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

function statusIcon(status: ContractCheck['status']): string {
  switch (status) {
    case 'pass': return '✅';
    case 'fail': return '❌';
    case 'warning': return '⚠️';
  }
}

function statusBorderColor(status: ContractCheck['status']): string {
  switch (status) {
    case 'pass': return 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20';
    case 'fail': return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20';
    case 'warning': return 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20';
  }
}

function statusLabel(status: ContractCheck['status']): string {
  switch (status) {
    case 'pass': return 'سليم';
    case 'fail': return 'إشكالية';
    case 'warning': return 'تحتاج مراجعة';
  }
}

function resultInfo(result: ContractAnalysis['result']): { label: string; color: string; bg: string; icon: string } {
  switch (result) {
    case 'valid':
      return { label: 'عقد سليم قانونياً', color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700', icon: '✅' };
    case 'has_issues':
      return { label: 'يوجد إشكاليات بسيطة', color: 'text-yellow-700 dark:text-yellow-300', bg: 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-700', icon: '⚠️' };
    case 'major_issues':
      return { label: 'إشكاليات قانونية جوهرية', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700', icon: '❌' };
  }
}

function scoreColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

/* ─────────────────────── Progress Steps ─────────────────────── */

const PROGRESS_STEPS = [
  'جاري قراءة الملف...',
  'استخراج نص العقد...',
  'إرسال العقد للمراجعة...',
  'فحص أركان العقد...',
  'التحقق من عيوب الإرادة...',
  'مراجعة الشروط والبنود...',
  'تحديد المخاطر القانونية...',
  'إعداد تقرير المراجعة...',
];

/* ─────────────────────── Component ─────────────────────── */

export default function ContractReviewer({ onBack }: { onBack: () => void }) {
  const [contractType, setContractType] = useState<ContractType>('general');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ContractAnalysis | null>(null);
  const [filterStatus, setFilterStatus] = useState<ContractCheck['status'] | 'all'>('all');
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

  /* ── Progress ── */
  function startProgress() {
    setProgressStep(0);
    let step = 0;
    progressInterval.current = setInterval(() => {
      step++;
      if (step < PROGRESS_STEPS.length) setProgressStep(step);
    }, 2500);
  }

  function stopProgress() {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }

  /* ── Review ── */
  async function reviewContract() {
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
        payload = { pdfBase64: base64, contractType };
      } else {
        const text = await extractDocxText(file);
        if (!text.trim()) throw new Error('لم يتم استخراج أي نص من المستند. تأكد أن الملف يحتوي على نص.');
        payload = { text, contractType };
      }

      const res = await fetch('/api/contract-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        const text = await res.clone().text().catch(() => '');
        throw new Error(text.slice(0, 200) || 'حدث خطأ أثناء المراجعة');
      }
      if (!res.ok || data.error) throw new Error(data.error || 'حدث خطأ أثناء المراجعة');
      if (!data.analysis) throw new Error('لم يتم الحصول على نتائج المراجعة');
      setAnalysis(data.analysis as ContractAnalysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      stopProgress();
      setLoading(false);
    }
  }

  /* ── Copy ── */
  function copyResults() {
    if (!analysis) return;
    const ri = resultInfo(analysis.result);
    const lines: string[] = [
      `تقرير مراجعة العقد القانونية`,
      `نوع العقد: ${analysis.contractType}`,
      `النتيجة: ${ri.label} (${analysis.score}/100)`,
      `${'─'.repeat(50)}`,
      ``,
      `الملخص:`,
      analysis.summary,
      ``,
      `${'─'.repeat(50)}`,
      `نتائج الفحص:`,
    ];
    for (const check of analysis.checks) {
      const icon = check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⚠️';
      lines.push(`${icon} ${check.label} (${check.article})${check.critical ? ' [جوهري]' : ''}`);
      lines.push(`   ${check.details}`);
      lines.push(``);
    }
    if (analysis.missingClauses.length > 0) {
      lines.push(`${'─'.repeat(50)}`);
      lines.push(`البنود المفقودة:`);
      analysis.missingClauses.forEach((c, i) => lines.push(`${i + 1}. ${c}`));
    }
    if (analysis.risks.length > 0) {
      lines.push(``, `المخاطر القانونية:`);
      analysis.risks.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
    }
    if (analysis.recommendations.length > 0) {
      lines.push(``, `التوصيات:`);
      analysis.recommendations.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
    }
    lines.push(``, `${'─'.repeat(50)}`);
    lines.push(`⚠️ تنبيه: هذا التحليل للإرشاد فقط ولا يغني عن الاستشارة القانونية المتخصصة.`);
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
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
    ? filterStatus === 'all' ? analysis.checks : analysis.checks.filter(c => c.status === filterStatus)
    : [];

  const statusCounts = analysis ? {
    all: analysis.checks.length,
    pass: analysis.checks.filter(c => c.status === 'pass').length,
    fail: analysis.checks.filter(c => c.status === 'fail').length,
    warning: analysis.checks.filter(c => c.status === 'warning').length,
  } : null;

  /* ─────────────────────── Render ─────────────────────── */

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-[#1a3a5c] dark:text-[#f0c040] text-lg">→</button>
        <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">📑 مراجعة العقود</h2>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
        قم برفع ملف العقد (PDF أو Word) وسيتم مراجعته قانونياً للكشف عن أي إشكاليات أو مخاطر وفق القانون المدني الجزائري.
      </p>

      <div className="flex items-start gap-2 bg-green-50 dark:bg-green-900/15 border border-green-200 dark:border-green-800 rounded-xl p-3 mb-4">
        <span className="text-sm flex-shrink-0 mt-0.5">🔒</span>
        <p className="text-[11px] text-green-700 dark:text-green-400 leading-relaxed">
          خصوصيتك محمية: لا يتم حفظ المستند على أي سيرفر. يتم تحليله فورياً ثم حذفه تلقائياً بعد إرجاع النتيجة.
        </p>
      </div>

      {/* Contract type selector */}
      {!analysis && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">نوع العقد:</p>
          <div className="flex gap-1.5 flex-wrap">
            {CONTRACT_TYPES.map(ct => (
              <button
                key={ct.key}
                onClick={() => setContractType(ct.key)}
                className={`text-xs px-3 py-1.5 rounded-full transition-all flex items-center gap-1 ${
                  contractType === ct.key
                    ? 'bg-[#059669] text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                <span>{ct.icon}</span>
                <span>{ct.label}</span>
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
                ? 'border-[#059669] bg-green-50 dark:bg-green-900/20'
                : file
                ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-[#059669] hover:bg-green-50/50 dark:hover:bg-green-900/10'
            }`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div>
                <div className="text-3xl mb-2">{file.name.endsWith('.pdf') ? '📄' : '📝'}</div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{file.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatFileSize(file.size)}</p>
                <p className="text-[10px] text-[#059669] dark:text-green-400 mt-2">اضغط أو اسحب ملفاً آخر للاستبدال</p>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-3 opacity-60">📑</div>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                  {isDragActive ? 'أفلت ملف العقد هنا...' : 'اسحب ملف العقد هنا أو اضغط للاختيار'}
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
              onClick={reviewContract}
              className="w-full py-3 bg-[#059669] hover:bg-[#047857] text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>📑</span>
              <span>بدء مراجعة العقد</span>
            </button>
          )}
        </>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full border-2 border-[#059669] border-t-transparent animate-spin" />
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">جاري مراجعة العقد...</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{PROGRESS_STEPS[progressStep]}</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-[#059669] rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(((progressStep + 1) / PROGRESS_STEPS.length) * 90, 90)}%` }}
            />
          </div>
          <div className="mt-4 space-y-1.5">
            {PROGRESS_STEPS.map((step, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 text-xs transition-all duration-500 ${
                  i < progressStep ? 'text-green-600 dark:text-green-400' :
                  i === progressStep ? 'text-[#059669] dark:text-green-400 font-medium' :
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
      {analysis && (
        <div className="space-y-4">
          {/* Result card */}
          {(() => {
            const ri = resultInfo(analysis.result);
            return (
              <div className={`rounded-xl p-4 border ${ri.bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{ri.icon}</span>
                    <div>
                      <h3 className={`text-base font-bold ${ri.color}`}>{ri.label}</h3>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {analysis.contractType} — {file?.name}
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
                <div className="w-full bg-white/50 dark:bg-gray-900/30 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-700 ${scoreColor(analysis.score)}`}
                    style={{ width: `${analysis.score}%` }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Parties */}
          {analysis.parties && analysis.parties.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040] mb-3">👥 أطراف العقد</h4>
              <div className="grid grid-cols-2 gap-2">
                {analysis.parties.map((party, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2.5">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">{party.role}</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5">{party.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040] mb-2">📝 ملخص المراجعة</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{analysis.summary}</p>
          </div>

          {/* Filter tabs */}
          {statusCounts && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {(
                [
                  { key: 'all' as const, label: 'الكل', count: statusCounts.all },
                  { key: 'pass' as const, label: 'سليم', count: statusCounts.pass },
                  { key: 'fail' as const, label: 'إشكالية', count: statusCounts.fail },
                  { key: 'warning' as const, label: 'مراجعة', count: statusCounts.warning },
                ] as const
              )
                .filter(tab => tab.count > 0 || tab.key === 'all')
                .map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setFilterStatus(tab.key)}
                    className={`whitespace-nowrap text-[10px] px-2.5 py-1 rounded-full transition-all ${
                      filterStatus === tab.key
                        ? 'bg-[#059669] text-white'
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
              <div key={check.id || i} className={`rounded-xl p-3 border transition-all ${statusBorderColor(check.status)}`}>
                <div className="flex items-start gap-2">
                  <span className="text-base flex-shrink-0 mt-0.5">{statusIcon(check.status)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{check.label}</span>
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
                        'text-yellow-600 dark:text-yellow-400'
                      }`}>
                        {statusLabel(check.status)}
                      </span>
                    </div>
                    {check.details && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">{check.details}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Missing clauses */}
          {analysis.missingClauses && analysis.missingClauses.length > 0 && (
            <div className="bg-orange-50 dark:bg-orange-900/15 border border-orange-200 dark:border-orange-700 rounded-xl p-4">
              <h4 className="text-sm font-bold text-orange-800 dark:text-orange-400 mb-3">📌 بنود مفقودة يُنصح بإضافتها</h4>
              <ul className="space-y-1.5">
                {analysis.missingClauses.map((clause, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-orange-700 dark:text-orange-300">
                    <span className="flex-shrink-0 mt-0.5">+</span>
                    <span className="leading-relaxed">{clause}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Risks */}
          {analysis.risks && analysis.risks.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-700 rounded-xl p-4">
              <h4 className="text-sm font-bold text-red-800 dark:text-red-400 mb-3">⚠️ المخاطر القانونية المحتملة</h4>
              <ul className="space-y-1.5">
                {analysis.risks.map((risk, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                    <span className="flex-shrink-0 mt-0.5">!</span>
                    <span className="leading-relaxed">{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040] mb-3">💡 التوصيات</h4>
              <ul className="space-y-2">
                {analysis.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-[#059669] dark:text-green-400 flex-shrink-0 mt-0.5">●</span>
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
              🔄 مراجعة عقد آخر
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {!loading && !analysis && error && (
        <div className="mt-4">
          <button
            onClick={() => setError(null)}
            className="w-full py-2.5 bg-[#059669] hover:bg-[#047857] text-white rounded-xl text-sm font-medium transition-all"
          >
            🔄 حاول مرة أخرى
          </button>
        </div>
      )}
    </div>
  );
}
