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
      return { label: 'مقبول شكلاً', color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700', icon: '✅' };
    case 'rejected':
      return { label: 'مرفوض شكلاً', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700', icon: '❌' };
    case 'needs_review':
      return { label: 'ناقص شكلاً ويحتاج استكمال', color: 'text-yellow-700 dark:text-yellow-300', bg: 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-700', icon: '⚠️' };
  }
}

function scoreColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

const PROGRESS_STEPS = [
  'جاري قراءة الملف...',
  'استخراج النص من المستند...',
  'الاتصال بأفضل نموذج ذكاء اصطناعي...',
  'تحليل الشروط الشكلية بالذكاء الاصطناعي...',
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
  const [filterTab, setFilterTab] = useState<'all' | 'passed' | 'failed' | 'pending' | 'suggestions'>('all');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    setAnalysis(null);
    const f = acceptedFiles[0];
    if (!f) return;

    // Accept Word files only (.docx / .doc)
    const isWord = f.name.endsWith('.docx') || f.name.endsWith('.doc');
    if (!isWord) {
      setError('هذه الأداة تقبل ملفات Word فقط (.docx / .doc)');
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
    startProgress();

    try {
      const text = await extractTextFromFile(file);
      if (!text.trim()) {
        throw new Error('لم يتم استخراج أي نص من المستند. تأكد أن الملف يحتوي على نص قابل للقراءة.');
      }

      // Call the AI API
      const res = await fetch('/api/petition-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.slice(0, 12000), // Send more text for thorough analysis
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
    setFilterTab('all');
    setCopied(false);
  }

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-[#1a3a5c] dark:text-[#f0c040] text-lg hover:opacity-70 transition-opacity">→</button>
        <div>
          <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">🤖 الفحص الشكلي للعرائض بالذكاء الاصطناعي</h2>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">تحليل ذكي لـ 20 نوعاً من المحررات القانونية — وفق القانون 25-14 و ق.إ.م.إ 08-09</p>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 mb-4">
        <div className="flex items-start gap-2">
          <span className="text-base flex-shrink-0">🔒</span>
          <div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed font-bold">
              خصوصية تامة — بياناتك في أمان
            </p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-500 leading-relaxed mt-1">
              النظام والسيرفر <strong>لا يحتفظان بأي معلومات</strong> من العرائض المرفوعة. يتم حذف الملف ومحتواه من الذاكرة <strong>فوراً</strong> بعد إظهار نتيجة الفحص. لا يتم تخزين أو تسجيل أو مراجعة أي محتوى قانوني.
            </p>
          </div>
        </div>
      </div>

      {/* AI Info Banner */}
      <div className="flex items-start gap-2 bg-gradient-to-l from-purple-50 to-blue-50 dark:from-purple-900/15 dark:to-blue-900/15 border border-purple-200 dark:border-purple-800 rounded-xl p-3 mb-4">
        <span className="text-lg flex-shrink-0">🧠</span>
        <div>
          <p className="text-[11px] text-purple-700 dark:text-purple-400 leading-relaxed font-medium">
            مدعوم بالذكاء الاصطناعي وفق القانون الجزائري — نموذج Qwen 3.6 Plus (رئيسي) مع 10 نماذج احتياطية
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
            يقبل ملفات Word فقط (.docx / .doc) — الفحص شكلي فقط بدون تحليل موضوعي
          </p>
        </div>
      </div>

      {/* Document Type Selector */}
      {!analysis && (
        <div className="space-y-3 mb-4">
          {/* Category Tabs */}
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

          {/* Document Type Buttons */}
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
                  {isDragActive ? 'أفلت الملف هنا...' : 'اسحب ملف Word هنا أو اضغط للاختيار'}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                  .docx أو .doc فقط — الحد الأقصى 10 ميغابايت
                </p>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-4">
              <p className="text-sm text-red-700 dark:text-red-300 font-medium">❌ {error}</p>
              <button onClick={() => { setError(null); setFile(null); }} className="text-xs text-red-500 dark:text-red-400 underline mt-1">
                حاول مرة أخرى
              </button>
            </div>
          )}

          {/* Analyze Button */}
          {file && !error && (
            <button
              onClick={analyze}
              className="w-full py-3.5 bg-gradient-to-l from-[#7c3aed] to-[#6d28d9] hover:from-[#6d28d9] hover:to-[#5b21b6] text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-purple-200 dark:shadow-purple-900/30"
            >
              <span>🔍</span>
              <span>بدء الفحص الشكلي بالذكاء الاصطناعي</span>
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
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">جاري الفحص الشكلي بالذكاء الاصطناعي...</p>
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

      {/* Results */}
      {analysis && (
        <div className="space-y-4">
          {/* Verdict Card */}
          {(() => {
            const v = verdictInfo(analysis.result);
            return (
              <div className={`rounded-xl p-4 border ${v.bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">{v.icon}</span>
                    <div>
                      <h3 className={`text-base font-bold ${v.color}`}>{v.label}</h3>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {DOCUMENT_TYPES[category]?.find(d => d.key === docType)?.label || docType} — {file?.name}
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
                  <div className={`h-2 rounded-full transition-all duration-700 ${scoreColor(analysis.score)}`} style={{ width: `${analysis.score}%` }} />
                </div>
                {/* AI Model Info */}
                {analysis.aiPowered && analysis.modelLabel && (
                  <div className="mt-2 flex items-center gap-1.5 text-[9px] text-gray-500">
                    <span>🤖</span>
                    <span>التحليل بواسطة: {analysis.modelLabel} {analysis.tier === 1 ? '⭐' : analysis.tier === 2 ? '⚡' : '🔵'}</span>
                    {analysis.triedModels && (
                      <span className="text-gray-400">({analysis.triedModels.length} نموذج جُرّبت)</span>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040] mb-2">📝 الملخص</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{analysis.summary}</p>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {[
              { key: 'all' as const, label: 'الكل', count: 0 },
              { key: 'passed' as const, label: `✅ مستوفى (${analysis.passedChecks.length})`, count: analysis.passedChecks.length },
              { key: 'failed' as const, label: `❌ غير مستوفى (${analysis.failedChecks.length})`, count: analysis.failedChecks.length },
              { key: 'pending' as const, label: `🔍 معلّق (${analysis.pendingChecks.length})`, count: analysis.pendingChecks.length },
              { key: 'suggestions' as const, label: `✏️ اقتراحات (${analysis.suggestions.length})`, count: analysis.suggestions.length },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilterTab(tab.key)}
                className={`text-[10px] px-3 py-1.5 rounded-full transition-all font-medium whitespace-nowrap ${
                  filterTab === tab.key
                    ? 'bg-[#7c3aed] text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Passed Checks */}
          {(filterTab === 'all' || filterTab === 'passed') && analysis.passedChecks.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-bold text-green-700 dark:text-green-400 mb-3">✅ الشروط الشكلية المستوفاة ({analysis.passedChecks.length})</h4>
              <div className="space-y-2">
                {analysis.passedChecks.map((check, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-green-500 flex-shrink-0">✅</span>
                    <span className="text-gray-700 dark:text-gray-300">{check.label}</span>
                    <span className="text-[10px] text-gray-400 mr-auto flex-shrink-0">({check.article})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failed Checks */}
          {(filterTab === 'all' || filterTab === 'failed') && analysis.failedChecks.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-bold text-red-700 dark:text-red-400 mb-3">❌ الشروط الشكلية غير المستوفاة ({analysis.failedChecks.length})</h4>
              <div className="space-y-2">
                {analysis.failedChecks.map((check, i) => (
                  <div key={i} className={`rounded-lg p-3 border ${check.critical ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/15' : 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/15'}`}>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="flex-shrink-0">{check.critical ? '❌' : '⚠️'}</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{check.label}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0" style={{
                        background: check.critical ? '#fef2f2' : '#fffbeb',
                        color: check.critical ? '#991b1b' : '#92400e',
                        border: `1px solid ${check.critical ? '#fecaca' : '#fde68a'}`
                      }}>
                        {check.critical ? 'جوهري' : 'قابل للتدارك'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 mr-6">{check.details}</p>
                    <p className="text-[10px] text-gray-400 mt-1 mr-6">المادة: {check.article}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Checks */}
          {(filterTab === 'all' || filterTab === 'pending') && analysis.pendingChecks.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-bold text-blue-700 dark:text-blue-400 mb-3">🔍 فحوص معلّقة على التحقق من المرفقات ({analysis.pendingChecks.length})</h4>
              <div className="space-y-2">
                {analysis.pendingChecks.map((check, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm bg-blue-50 dark:bg-blue-900/15 rounded-lg p-2.5 border border-blue-200 dark:border-blue-800">
                    <span className="text-blue-500 flex-shrink-0 mt-0.5">🔍</span>
                    <div>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">{check.label}</span>
                      <p className="text-[10px] text-gray-500 mt-0.5">السبب: {check.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {(filterTab === 'all' || filterTab === 'suggestions') && analysis.suggestions.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-bold text-purple-700 dark:text-purple-400 mb-3">✏️ اقتراحات التنقيح الشكلي ({analysis.suggestions.length})</h4>
              <div className="space-y-2">
                {analysis.suggestions.map((s, i) => (
                  <div key={i} className="bg-purple-50 dark:bg-purple-900/15 rounded-lg p-2.5 border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="flex-shrink-0">✏️</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">{s.label}</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 mr-6">{s.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Report */}
          {analysis.report && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040]">📄 التقرير الكامل</h4>
                <button onClick={exportResults} className="text-[10px] flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  {copied ? '✅ نُسخ' : '📋 نسخ التقرير'}
                </button>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300 overflow-x-auto max-h-[500px] overflow-y-auto">
                {analysis.report}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
            <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
              ⚠️ <strong>تنبيه قانوني وإخلاء مسؤولية:</strong> هذه الأداة مخصصة للفحص الشكلي الأولي للعرائض والمذكرات، ولا تغني بأي حال عن مراجعة المحامي أو المستشار القانوني المختص. يُحذف الملف ومحتواه من الذاكرة فور إظهار النتيجة.
            </p>
          </div>

          {/* Action Buttons */}
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
