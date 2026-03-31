'use client';

import { extractTextFromFile } from '@/lib/extract-text';
import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';

/* ─────────────────────── Types ─────────────────────── */

interface AppealOption {
  type: string;
  deadline: string;
  article: string;
  conditions: string;
}

interface JudgmentAnalysis {
  court: string;
  caseNumber: string;
  date: string;
  parties: { plaintiff: string; defendant: string };
  subject: string;
  facts: string;
  reasoning: string;
  ruling: string;
  legalBasis: string[];
  appealOptions: AppealOption[];
  keyPoints: string[];
  recommendations: string[];
}

/* ─────────────────────── Helpers ─────────────────────── */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميغابايت`;
}



/* ─────────────────────── Progress Steps ─────────────────────── */

const PROGRESS_STEPS = [
  'جاري قراءة الملف...',
  'استخراج النص من المستند...',
  'إرسال الحكم للتحليل...',
  'استخراج بيانات القضية...',
  'تحليل منطوق الحكم وحيثياته...',
  'تحديد طرق الطعن المتاحة...',
  'إعداد التقرير القانوني...',
];

/* ─────────────────────── Component ─────────────────────── */

export default function JudgmentAnalyzer({ onBack }: { onBack: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<JudgmentAnalysis | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedAppeal, setExpandedAppeal] = useState<number | null>(null);
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
      if (step < PROGRESS_STEPS.length) setProgressStep(step);
    }, 2500);
  }

  function stopProgress() {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }

  /* ── Analyze ── */
  async function analyze() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    startProgress();

    try {
      const text = await extractTextFromFile(file);
      if (!text.trim()) throw new Error('لم يتم استخراج أي نص من المستند. تأكد أن الملف يحتوي على نص.');
      const payload = { text };

      const res = await fetch('/api/judgment-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resText = await res.text();
      let data;
      try {
        data = JSON.parse(resText);
      } catch {
        throw new Error(resText.slice(0, 200) || '');
      }
      if (!res.ok || data.error) throw new Error(data.error || 'حدث خطأ أثناء التحليل');
      if (!data.analysis) throw new Error('لم يتم الحصول على نتائج التحليل');
      setAnalysis(data.analysis as JudgmentAnalysis);
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
    const lines: string[] = [
      `تقرير تحليل الحكم القضائي`,
      `${'─'.repeat(50)}`,
      `الجهة القضائية: ${analysis.court}`,
      `رقم القضية: ${analysis.caseNumber}`,
      `تاريخ الحكم: ${analysis.date}`,
      `المدعي: ${analysis.parties.plaintiff}`,
      `المدعى عليه: ${analysis.parties.defendant}`,
      `موضوع الدعوى: ${analysis.subject}`,
      ``,
      `الوقائع:`,
      analysis.facts,
      ``,
      `أسباب الحكم:`,
      analysis.reasoning,
      ``,
      `منطوق الحكم:`,
      analysis.ruling,
      ``,
      `المواد القانونية المطبقة:`,
      ...analysis.legalBasis.map((m, i) => `${i + 1}. ${m}`),
      ``,
      `طرق الطعن المتاحة:`,
      ...analysis.appealOptions.map(a => `• ${a.type} — الأجل: ${a.deadline} (${a.article})`),
      ``,
      `النقاط الجوهرية:`,
      ...analysis.keyPoints.map((k, i) => `${i + 1}. ${k}`),
      ``,
      `التوصيات:`,
      ...analysis.recommendations.map((r, i) => `${i + 1}. ${r}`),
      ``,
      `${'─'.repeat(50)}`,
      `⚠️ تنبيه: هذا التحليل للإرشاد فقط ولا يغني عن الاستشارة القانونية المتخصصة.`,
    ];
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
    setExpandedAppeal(null);
  }

  /* ─────────────────────── Render ─────────────────────── */

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-[#1a3a5c] dark:text-[#f0c040] text-lg">→</button>
        <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">⚖️ تحليل الأحكام القضائية</h2>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
        قم برفع ملف الحكم القضائي (PDF أو Word) وسيتم استخراج جميع المعلومات الجوهرية وتحديد طرق الطعن المتاحة وفق القانون الجزائري.
      </p>

      <div className="flex items-start gap-2 bg-green-50 dark:bg-green-900/15 border border-green-200 dark:border-green-800 rounded-xl p-3 mb-4">
        <span className="text-sm flex-shrink-0 mt-0.5">🔒</span>
        <p className="text-[11px] text-green-700 dark:text-green-400 leading-relaxed">
          خصوصيتك محمية: لا يتم حفظ المستند على أي سيرفر. يتم تحليله فورياً ثم حذفه تلقائياً بعد إرجاع النتيجة.
        </p>
      </div>

      {/* Upload area */}
      {!analysis && !loading && (
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
              <span>بدء تحليل الحكم</span>
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
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">جاري تحليل الحكم القضائي...</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{PROGRESS_STEPS[progressStep]}</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-[#1a3a5c] rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(((progressStep + 1) / PROGRESS_STEPS.length) * 90, 90)}%` }}
            />
          </div>
          <div className="mt-4 space-y-1.5">
            {PROGRESS_STEPS.map((step, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 text-xs transition-all duration-500 ${
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
      {analysis && (
        <div className="space-y-4">
          {/* Header card */}
          <div className="bg-[#1a3a5c] dark:bg-[#1a3a5c]/80 rounded-xl p-4 text-white">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h3 className="font-bold text-base mb-1">{analysis.court}</h3>
                <p className="text-blue-200 text-xs">{analysis.subject}</p>
              </div>
              <div className="text-left flex-shrink-0">
                <p className="text-xs text-blue-300">رقم القضية</p>
                <p className="text-sm font-bold">{analysis.caseNumber || '—'}</p>
                <p className="text-xs text-blue-300 mt-1">{analysis.date || '—'}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-700/50 grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-blue-300">المدعي</p>
                <p className="text-xs text-white font-medium">{analysis.parties.plaintiff || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-blue-300">المدعى عليه</p>
                <p className="text-xs text-white font-medium">{analysis.parties.defendant || '—'}</p>
              </div>
            </div>
          </div>

          {/* Facts */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040] mb-2">📋 الوقائع</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{analysis.facts}</p>
          </div>

          {/* Reasoning */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040] mb-2">⚖️ أسباب الحكم (الحيثيات)</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{analysis.reasoning}</p>
          </div>

          {/* Ruling */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
            <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400 mb-2">📜 منطوق الحكم</h4>
            <p className="text-sm text-amber-900 dark:text-amber-300 leading-relaxed font-medium">{analysis.ruling}</p>
          </div>

          {/* Legal Basis */}
          {analysis.legalBasis && analysis.legalBasis.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040] mb-3">📚 المواد القانونية المطبقة</h4>
              <div className="flex flex-wrap gap-2">
                {analysis.legalBasis.map((article, i) => (
                  <span
                    key={i}
                    className="text-xs px-3 py-1.5 bg-[#1a3a5c]/10 dark:bg-[#1a3a5c]/30 text-[#1a3a5c] dark:text-blue-300 rounded-full border border-[#1a3a5c]/20 dark:border-blue-700/50"
                  >
                    {article}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Appeal Options */}
          {analysis.appealOptions && analysis.appealOptions.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040] mb-3">🔔 طرق الطعن المتاحة</h4>
              <div className="space-y-2">
                {analysis.appealOptions.map((appeal, i) => (
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
          )}

          {/* Key Points */}
          {analysis.keyPoints && analysis.keyPoints.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040] mb-3">🎯 النقاط القانونية الجوهرية</h4>
              <ul className="space-y-2">
                {analysis.keyPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-[#1a3a5c] dark:text-blue-400 flex-shrink-0 mt-0.5 font-bold">{i + 1}.</span>
                    <span className="leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040] mb-3">💡 توصيات للمحامي</h4>
              <ul className="space-y-2">
                {analysis.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-[#f0c040] flex-shrink-0 mt-0.5">●</span>
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
              🔄 تحليل حكم آخر
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {!loading && !analysis && error && (
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
