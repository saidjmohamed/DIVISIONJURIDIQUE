'use client';

import { extractTextFromFile } from '@/lib/extract-text';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';

/* ─────────────────────── Types ─────────────────────── */

interface CheckItem {
  label: string;
  article: string;
}

interface FailedCheck extends CheckItem {
  critical: boolean;
  details: string;
}

interface PendingCheck {
  label: string;
  reason: string;
}

interface Suggestion {
  label: string;
  suggestion: string;
}

interface AnalysisResult {
  result: 'accepted' | 'rejected' | 'needs_review';
  score: number;
  documentType?: string;
  court?: string;
  date?: string;
  summary: string;
  passedChecks: CheckItem[];
  failedChecks: FailedCheck[];
  pendingChecks: PendingCheck[];
  suggestions: Suggestion[];
  report: string;
  aiPowered?: boolean;
  model?: string;
  modelLabel?: string;
  tier?: number;
  triedModels?: string[];
  parseFailed?: boolean;
}

type DocumentCategory = 'civil' | 'admin' | 'criminal';

interface DocumentTypeOption {
  key: string;
  label: string;
}

interface CategoryOption {
  key: DocumentCategory;
  label: string;
  icon: string;
}

const CATEGORIES: CategoryOption[] = [
  { key: 'civil', label: 'المحررات المدنية', icon: '⚖️' },
  { key: 'admin', label: 'المحررات الإدارية', icon: '🏛️' },
  { key: 'criminal', label: 'المحررات الجزائية', icon: '📝' },
];

const DOCUMENT_TYPES: Record<DocumentCategory, DocumentTypeOption[]> = {
  civil: [
    { key: 'civil_opening', label: 'عريضة افتتاح دعوى مدنية' },
    { key: 'civil_response', label: 'مذكرة جوابية مدنية' },
    { key: 'civil_rejoinder', label: 'مذكرة تعقيبية مدنية' },
    { key: 'civil_formal_challenge', label: 'دفع شكلي مدني' },
    { key: 'civil_incidental', label: 'طلب عارض مدني' },
    { key: 'civil_appeal', label: 'استئناف مدني' },
    { key: 'civil_cassation', label: 'طعن بالنقض مدني' },
  ],
  admin: [
    { key: 'admin_initial', label: 'دعوى إدارية ابتدائية' },
    { key: 'admin_appeal', label: 'استئناف إداري (مجلس الدولة)' },
  ],
  criminal: [
    { key: 'crim_complaint', label: 'شكوى عادية' },
    { key: 'crim_civil_claim', label: 'شكوى مع ادعاء مدني' },
    { key: 'crim_direct_claim', label: 'ادعاء مدني أمام جهة الحكم' },
    { key: 'crim_misdemeanor_defense', label: 'مذكرة دفاع (محكمة الجنح)' },
    { key: 'crim_felony_defense', label: 'مذكرة دفاع (محكمة الجنايات)' },
    { key: 'crim_opposition', label: 'طعن بالمعارضة' },
    { key: 'crim_appeal', label: 'استئناف جزائي' },
    { key: 'crim_cassation', label: 'طعن بالنقض جزائي' },
    { key: 'crim_bail', label: 'طلب إفراج مؤقت' },
    { key: 'crim_indictment_appeal', label: 'تظلم أمام غرفة الاتهام' },
    { key: 'crim_incidental_memo', label: 'مذكرة عارضة / دفع شكلي' },
  ],
};

/* ─────────────────────── Helpers ─────────────────────── */

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميغابايت`;
}

function verdictInfo(result: AnalysisResult['result']): { label: string; color: string; bg: string; icon: string } {
  switch (result) {
    case 'accepted':
      return { label: 'مقبول شكلاً', color: 'text-green-700 dark:text-green-300', bg: 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700', icon: '✅' };
    case 'rejected':
      return { label: 'مرفوض شكلاً', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700', icon: '❌' };
    case 'needs_review':
      return { label: 'ناقص شكلاً ويحتاج استكمال', color: 'text-yellow-700 dark:text-yellow-300', bg: 'bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700', icon: '⚠️' };
  }
}

const PROGRESS_STEPS = [
  'جاري قراءة الملف...',
  'استخراج النص من المستند...',
  'الاتصال بنموذج الذكاء الاصطناعي...',
  'تحليل الشروط الشكلية...',
  'مراجعة المواد القانونية...',
  'إعداد التقرير النهائي...',
];

/* ─────────────────────── Component ─────────────────────── */

export default function SmartPetitionChecker({ onBack }: { onBack: () => void }) {
  const [category, setCategory] = useState<DocumentCategory>('civil');
  const [docType, setDocType] = useState<string>('civil_opening');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [copied, setCopied] = useState(false);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [activeTab, setActiveTab] = useState<'checks' | 'report'>('checks');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    setAnalysis(null);
    const f = acceptedFiles[0];
    if (!f) return;

    const isWord = f.name.endsWith('.docx') || f.name.endsWith('.doc');
    const isPdf = f.name.endsWith('.pdf');
    if (!isWord && !isPdf) {
      setError('هذه الأداة تقبل ملفات Word (.docx / .doc) أو PDF فقط');
      return;
    }

    if (f.size > MAX_FILE_SIZE) {
      setError('حجم الملف يتجاوز الحد المسموح (10 ميغابايت)');
      return;
    }
    setFile(f);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'application/pdf': ['.pdf'],
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
    }, 800);
  }

  function stopProgress() {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }

  useEffect(() => {
    return () => { stopProgress(); };
  }, []);

  async function analyze() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setActiveTab('checks');
    startProgress();

    try {
      const text = await extractTextFromFile(file);
      if (!text.trim()) {
        throw new Error('لم يتم استخراج أي نص من المستند. تأكد أن الملف يحتوي على نص قابل للقراءة.');
      }

      const res = await fetch('/api/petition-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.slice(0, 15000),
          documentType: docType,
          documentCategory: category,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || `خطأ في الخادم (HTTP ${res.status})`);
      }

      const data = await res.json();
      setAnalysis({
        result: data.result || 'needs_review',
        score: data.score ?? 50,
        documentType: data.documentType,
        court: data.court,
        date: data.date,
        summary: data.summary || '',
        passedChecks: data.passedChecks || [],
        failedChecks: data.failedChecks || [],
        pendingChecks: data.pendingChecks || [],
        suggestions: data.suggestions || [],
        report: data.report || data.rawReport || '',
        aiPowered: !!data.aiPowered,
        model: data.model,
        modelLabel: data.modelLabel,
        tier: data.tier,
        triedModels: data.triedModels,
        parseFailed: !!data.parseFailed,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      stopProgress();
      setLoading(false);
    }
  }

  function exportResults() {
    if (!analysis) return;
    const textToCopy = analysis.report || `تقرير الفحص الشكلي\nالنتيجة: ${analysis.result}\nالملخص: ${analysis.summary}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  function reset() {
    setFile(null);
    setAnalysis(null);
    setError(null);
    setActiveTab('checks');
    setCopied(false);
  }

  // Count all check items for the overview
  const totalChecks = analysis ? analysis.passedChecks.length + analysis.failedChecks.length + analysis.pendingChecks.length : 0;

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-[#1a3a5c] dark:text-[#f0c040] text-lg hover:opacity-70 transition-opacity">→</button>
        <div>
          <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">🤖 فحص العرائض بالذكاء الاصطناعي</h2>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">تحليل ذكي لـ 20 نوعاً من المحررات — وفق القانون 25-14 و ق.إ.م.إ 08-09</p>
        </div>
      </div>

      {/* Privacy + AI Info */}
      {!analysis && (
        <div className="space-y-3 mb-4">
          <div className="bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <span className="text-base flex-shrink-0">🔒</span>
              <div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed font-bold">خصوصية تامة — بياناتك في أمان</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-500 leading-relaxed mt-1">
                  لا يحتفظ النظام بأي معلومات. يتم حذف الملف ومحتواه من الذاكرة فوراً بعد إظهار النتيجة.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-gradient-to-l from-purple-50 to-blue-50 dark:from-purple-900/15 dark:to-blue-900/15 border border-purple-200 dark:border-purple-800 rounded-xl p-3">
            <span className="text-lg flex-shrink-0">🧠</span>
            <div>
              <p className="text-[11px] text-purple-700 dark:text-purple-400 leading-relaxed font-medium">
                مدعوم بالذكاء الاصطناعي — Qwen 3.6 Plus (رئيسي) مع 10 نماذج احتياطية
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                يقبل ملفات Word (.docx / .doc) و PDF — الفحص شكلي فقط
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Document Type Selector */}
      {!analysis && (
        <div className="space-y-3 mb-4">
          <div className="flex gap-1.5">
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => {
                  setCategory(cat.key);
                  setDocType(DOCUMENT_TYPES[cat.key][0].key);
                }}
                className={`flex-1 text-[11px] px-3 py-2.5 rounded-xl transition-all font-bold ${
                  category === cat.key
                    ? 'bg-[#1a3a5c] text-white dark:bg-[#f0c040] dark:text-[#1a3a5c] shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {DOCUMENT_TYPES[category].map(dt => (
              <button
                key={dt.key}
                onClick={() => setDocType(dt.key)}
                className={`text-[10px] px-2.5 py-1.5 rounded-full transition-all font-medium ${
                  docType === dt.key
                    ? 'bg-[#7c3aed] text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {dt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upload Area */}
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
                <div className="text-3xl mb-2">📝</div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{file.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatFileSize(file.size)}</p>
                <p className="text-[10px] text-[#7c3aed] dark:text-purple-400 mt-2">اضغط أو اسحب ملفاً آخر للاستبدال</p>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-3 opacity-60">📎</div>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                  {isDragActive ? 'أفلت الملف هنا...' : 'اسحب ملف Word أو PDF هنا أو اضغط للاختيار'}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                  .docx / .doc / .pdf فقط — الحد الأقصى 10 ميغابايت
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-4">
              <p className="text-sm text-red-700 dark:text-red-300 font-medium">❌ {error}</p>
              <button onClick={() => { setError(null); setFile(null); }} className="text-xs text-red-500 dark:text-red-400 underline mt-1">
                حاول مرة أخرى
              </button>
            </div>
          )}

          {file && !error && (
            <button
              onClick={analyze}
              className="w-full py-3.5 bg-gradient-to-l from-[#7c3aed] to-[#6d28d9] hover:from-[#6d28d9] hover:to-[#5b21b6] text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-purple-200 dark:shadow-purple-900/30"
            >
              <span>🔍</span>
              <span>بدء الفحص الشكلي</span>
            </button>
          )}
        </>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full border-2 border-[#7c3aed] border-t-transparent animate-spin" />
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">جاري الفحص الشكلي...</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{PROGRESS_STEPS[progressStep]}</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-[#7c3aed] rounded-full transition-all duration-500 ease-out" style={{ width: `${Math.min(((progressStep + 1) / PROGRESS_STEPS.length) * 95, 95)}%` }} />
          </div>
          <div className="mt-4 space-y-1.5">
            {PROGRESS_STEPS.map((step, i) => (
              <div key={i} className={`flex items-center gap-2 text-xs transition-all duration-300 ${
                i < progressStep ? 'text-green-600 dark:text-green-400' :
                i === progressStep ? 'text-[#7c3aed] dark:text-purple-400 font-medium' :
                'text-gray-300 dark:text-gray-600'
              }`}>
                <span className="flex-shrink-0">{i < progressStep ? '✅' : i === progressStep ? '⏳' : '○'}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════ RESULTS ═══════════════════ */}
      {analysis && (
        <div className="space-y-4">

          {/* ── Parse Failed Warning ── */}
          {analysis.parseFailed && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <span className="text-xl flex-shrink-0">⚡</span>
                <div>
                  <p className="text-sm font-bold text-orange-700 dark:text-orange-400">لم يتم الحصول على تقرير منظم</p>
                  <p className="text-xs text-orange-600 dark:text-orange-500 mt-1">
                    تم الاتصال بالذكاء الاصطناعي لكن الرد لم يكن بصيغة صحيحة. يرجى المحاولة مرة أخرى — غالباً ما تنجح المحاولة الثانية.
                  </p>
                  {analysis.triedModels && (
                    <p className="text-[10px] text-gray-500 mt-2">
                      النماذج التي جُرّبت: {analysis.triedModels.length}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Verdict Card ── */}
          {(() => {
            const v = verdictInfo(analysis.result);
            const scoreColor = analysis.score >= 80 ? 'text-green-600 dark:text-green-400' : analysis.score >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400';
            const barColor = analysis.score >= 80 ? 'bg-green-500' : analysis.score >= 50 ? 'bg-yellow-500' : 'bg-red-500';

            return (
              <div className={`rounded-xl p-4 ${v.bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{v.icon}</span>
                    <div>
                      <h3 className={`text-base font-bold ${v.color}`}>{v.label}</h3>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {DOCUMENT_TYPES[category]?.find(d => d.key === docType)?.label || docType} — {file?.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${scoreColor}`}>{analysis.score}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">/ 100</div>
                  </div>
                </div>
                <div className="w-full bg-white/50 dark:bg-gray-900/30 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${analysis.score}%` }} />
                </div>
                {analysis.aiPowered && analysis.modelLabel && (
                  <div className="mt-2 flex items-center gap-1.5 text-[9px] text-gray-500">
                    <span>🤖</span>
                    <span>{analysis.modelLabel}</span>
                    {analysis.triedModels && <span className="text-gray-400">({analysis.triedModels.length} نموذج)</span>}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Document Info Bar ── */}
          <div className="grid grid-cols-3 gap-2">
            {(analysis.documentType || analysis.court || analysis.date) ? (
              <>
                {analysis.documentType && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-2.5 border border-gray-200 dark:border-gray-700 text-center">
                    <p className="text-[9px] text-gray-400 mb-0.5">نوع الوثيقة</p>
                    <p className="text-[11px] font-medium text-gray-700 dark:text-gray-300 leading-tight">{analysis.documentType}</p>
                  </div>
                )}
                {analysis.court && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-2.5 border border-gray-200 dark:border-gray-700 text-center">
                    <p className="text-[9px] text-gray-400 mb-0.5">الجهة القضائية</p>
                    <p className="text-[11px] font-medium text-gray-700 dark:text-gray-300 leading-tight">{analysis.court}</p>
                  </div>
                )}
                {analysis.date && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-2.5 border border-gray-200 dark:border-gray-700 text-center">
                    <p className="text-[9px] text-gray-400 mb-0.5">التاريخ</p>
                    <p className="text-[11px] font-medium text-gray-700 dark:text-gray-300 leading-tight">{analysis.date}</p>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* ── Summary ── */}
          {analysis.summary && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040] mb-2 flex items-center gap-2">
                <span>📝</span> الملخص
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{analysis.summary}</p>
            </div>
          )}

          {/* ── Stats Overview ── */}
          {!analysis.parseFailed && totalChecks > 0 && (
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-green-50 dark:bg-green-900/15 rounded-lg p-2.5 text-center border border-green-200 dark:border-green-800">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{analysis.passedChecks.length}</div>
                <div className="text-[9px] text-green-700 dark:text-green-500 font-medium">مستوفى</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/15 rounded-lg p-2.5 text-center border border-red-200 dark:border-red-800">
                <div className="text-lg font-bold text-red-600 dark:text-red-400">{analysis.failedChecks.length}</div>
                <div className="text-[9px] text-red-700 dark:text-red-500 font-medium">غير مستوفى</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/15 rounded-lg p-2.5 text-center border border-blue-200 dark:border-blue-800">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{analysis.pendingChecks.length}</div>
                <div className="text-[9px] text-blue-700 dark:text-blue-500 font-medium">معلّق</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/15 rounded-lg p-2.5 text-center border border-purple-200 dark:border-purple-800">
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{analysis.suggestions.length}</div>
                <div className="text-[9px] text-purple-700 dark:text-purple-500 font-medium">اقتراح</div>
              </div>
            </div>
          )}

          {/* ── Tab Switcher ── */}
          {!analysis.parseFailed && (
            <div className="flex gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              <button
                onClick={() => setActiveTab('checks')}
                className={`flex-1 text-xs py-2.5 rounded-lg transition-all font-medium ${
                  activeTab === 'checks' ? 'bg-white dark:bg-gray-700 text-[#1a3a5c] dark:text-[#f0c040] shadow-sm' : 'text-gray-500'
                }`}
              >
                🔍 التفاصيل
              </button>
              <button
                onClick={() => setActiveTab('report')}
                className={`flex-1 text-xs py-2.5 rounded-lg transition-all font-medium ${
                  activeTab === 'report' ? 'bg-white dark:bg-gray-700 text-[#1a3a5c] dark:text-[#f0c040] shadow-sm' : 'text-gray-500'
                }`}
              >
                📄 التقرير الكامل
              </button>
            </div>
          )}

          {/* ══ TAB: Detailed Checks ══ */}
          {activeTab === 'checks' && (
            <div className="space-y-3">
              {/* Failed Checks — MOST IMPORTANT, shown first */}
              {analysis.failedChecks.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="bg-red-50 dark:bg-red-900/20 px-4 py-2.5 border-b border-red-100 dark:border-red-900/30">
                    <h4 className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                      <span>❌</span> الشروط غير المستوفاة
                      <span className="text-[10px] bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full font-bold">
                        {analysis.failedChecks.length}
                      </span>
                    </h4>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {analysis.failedChecks.map((check, i) => (
                      <div key={i} className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="flex-shrink-0 text-sm">{check.critical ? '🔴' : '🟡'}</span>
                          <span className="font-medium text-gray-800 dark:text-gray-200 text-sm flex-1">{check.label}</span>
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{
                            background: check.critical ? '#fef2f2' : '#fffbeb',
                            color: check.critical ? '#991b1b' : '#92400e',
                            border: `1px solid ${check.critical ? '#fecaca' : '#fde68a'}`
                          }}>
                            {check.critical ? 'جوهري' : 'قابل للتدارك'}
                          </span>
                        </div>
                        {check.details && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 mr-6 leading-relaxed">{check.details}</p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1 mr-6">📜 {check.article}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Checks */}
              {analysis.pendingChecks.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2.5 border-b border-blue-100 dark:border-blue-900/30">
                    <h4 className="text-sm font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                      <span>🔍</span> فحوص معلّقة
                      <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-bold">
                        {analysis.pendingChecks.length}
                      </span>
                    </h4>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {analysis.pendingChecks.map((check, i) => (
                      <div key={i} className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="flex-shrink-0 text-sm">🔍</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">{check.label}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 mr-6 leading-relaxed">💡 {check.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Passed Checks */}
              {analysis.passedChecks.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="bg-green-50 dark:bg-green-900/20 px-4 py-2.5 border-b border-green-100 dark:border-green-900/30">
                    <h4 className="text-sm font-bold text-green-700 dark:text-green-400 flex items-center gap-2">
                      <span>✅</span> الشروط المستوفاة
                      <span className="text-[10px] bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full font-bold">
                        {analysis.passedChecks.length}
                      </span>
                    </h4>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {analysis.passedChecks.map((check, i) => (
                      <div key={i} className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-green-500 flex-shrink-0 text-sm">✅</span>
                          <span className="text-gray-700 dark:text-gray-300 text-sm">{check.label}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">📜 {check.article}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {analysis.suggestions.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="bg-purple-50 dark:bg-purple-900/20 px-4 py-2.5 border-b border-purple-100 dark:border-purple-900/30">
                    <h4 className="text-sm font-bold text-purple-700 dark:text-purple-400 flex items-center gap-2">
                      <span>✏️</span> اقتراحات التنقيح
                      <span className="text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-full font-bold">
                        {analysis.suggestions.length}
                      </span>
                    </h4>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {analysis.suggestions.map((s, i) => (
                      <div key={i} className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="flex-shrink-0 text-sm">✏️</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">{s.label}</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 mr-6 leading-relaxed">💡 {s.suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State — no checks at all */}
              {!analysis.parseFailed && totalChecks === 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 text-center border border-gray-200 dark:border-gray-700">
                  <div className="text-3xl mb-2">📭</div>
                  <p className="text-sm text-gray-500">لم يتم العثور على نتائج تحليل منظمة</p>
                  <p className="text-xs text-gray-400 mt-1">يرجى المحاولة مرة أخرى</p>
                </div>
              )}
            </div>
          )}

          {/* ══ TAB: Full Report ══ */}
          {activeTab === 'report' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040]">📄 التقرير الكامل</h4>
                <button onClick={exportResults} className="text-[10px] flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  {copied ? '✅ نُسخ' : '📋 نسخ'}
                </button>
              </div>
              {analysis.report ? (
                <div className="p-4 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300 overflow-x-auto max-h-[600px] overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
                  {analysis.report}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <p className="text-sm text-gray-400">لا يوجد تقرير متاح</p>
                </div>
              )}
            </div>
          )}

          {/* ── Disclaimer ── */}
          <div className="bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
            <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
              ⚠️ <strong>تنبيه قانوني:</strong> هذه الأداة مخصصة للفحص الشكلي الأولي، ولا تغني عن مراجعة المحامي المختص. يُحذف الملف ومحتواه من الذاكرة فور النتيجة.
            </p>
          </div>

          {/* ── Action Buttons ── */}
          <div className="flex gap-2">
            <button onClick={exportResults} className="flex-1 py-3 bg-[#1a3a5c] dark:bg-[#f0c040] text-white dark:text-[#1a3a5c] rounded-xl text-sm font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              📋 نسخ التقرير
            </button>
            <button onClick={reset} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700">
              🔄 فحص وثيقة أخرى
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
