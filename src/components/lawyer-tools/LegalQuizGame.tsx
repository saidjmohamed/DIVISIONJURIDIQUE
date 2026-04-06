'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

// ══════════════════════════════════════════════════════
// أنواع البيانات
// ══════════════════════════════════════════════════════

interface QuizQuestion {
  id: string;
  law: string;
  lawNumber: string;
  question: string;
  options: string[];
  correct: number;
  article: string;
  articleText: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
}

interface QuizConfig {
  lawId: string;
  count: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
}

interface AnswerRecord {
  questionId: string;
  selected: number;
  correct: number;
  isCorrect: boolean;
  timeMs: number;
}

// ══════════════════════════════════════════════════════
// البيانات الثابتة
// ══════════════════════════════════════════════════════

const LAWS = [
  { id: 'mixed',      label: 'مختلط — كل القوانين', icon: '🎯', color: '#6366f1', desc: 'أسئلة من جميع القوانين' },
  { id: 'qij',        label: 'ق.إ.ج — جزائية',       icon: '⚖️', color: '#1a3a5c', desc: 'قانون الإجراءات الجزائية 25-14' },
  { id: 'qima',       label: 'ق.إ.م.إ — مدنية',      icon: '🏛️', color: '#7c3aed', desc: 'قانون الإجراءات المدنية والإدارية 08-09' },
  { id: 'civil',      label: 'ق.م — مدني',            icon: '📜', color: '#059669', desc: 'القانون المدني 75-58' },
  { id: 'penal',      label: 'ق.ع — عقوبات',          icon: '🔨', color: '#dc2626', desc: 'قانون العقوبات 66-156' },
  { id: 'commercial', label: 'ق.ت — تجاري',           icon: '💼', color: '#d97706', desc: 'القانون التجاري 75-59' },
  { id: 'family',     label: 'ق.أ — أسرة',            icon: '👨‍👩‍👧', color: '#e11d48', desc: 'قانون الأسرة 84-11' },
  { id: 'maritime',   label: 'ق.ب — بحري',            icon: '⛵', color: '#0284c7', desc: 'القانون البحري 76-80' },
];

const COUNTS   = [3, 5, 7, 10];
const DIFFS    = [
  { id: 'mixed',  label: 'مختلط',   icon: '🎲', color: '#6366f1' },
  { id: 'easy',   label: 'سهل',     icon: '🟢', color: '#059669' },
  { id: 'medium', label: 'متوسط',   icon: '🟡', color: '#d97706' },
  { id: 'hard',   label: 'صعب',     icon: '🔴', color: '#dc2626' },
];

const DIFF_COLORS: Record<string, string> = {
  easy: '#059669', medium: '#d97706', hard: '#dc2626',
};
const DIFF_LABELS: Record<string, string> = {
  easy: 'سهل', medium: 'متوسط', hard: 'صعب',
};

// ══════════════════════════════════════════════════════
// مكوّن الكويز الرئيسي
// ══════════════════════════════════════════════════════

export default function LegalQuizGame({ onBack }: { onBack: () => void }) {
  // حالة المراحل: config → loading → playing → result
  const [phase, setPhase] = useState<'config' | 'loading' | 'playing' | 'result'>('config');
  const [config, setConfig] = useState<QuizConfig>({ lawId: 'mixed', count: 5, difficulty: 'mixed' });
  const [questions, setQuestions]     = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx]   = useState(0);
  const [selected, setSelected]       = useState<number | null>(null);
  const [answered, setAnswered]       = useState(false);
  const [answers, setAnswers]         = useState<AnswerRecord[]>([]);
  const [error, setError]             = useState<string | null>(null);
  const [aiModel, setAiModel]         = useState('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [reviewIdx, setReviewIdx]     = useState<number | null>(null);

  // مؤقت
  const [questionStartMs, setQuestionStartMs] = useState(0);

  // مرجع للتمرير
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase !== 'config') {
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [phase, currentIdx]);

  // ── توليد الأسئلة ─────────────────────────────────
  const startQuiz = useCallback(async () => {
    setPhase('loading');
    setError(null);
    setAnswers([]);
    setCurrentIdx(0);
    setSelected(null);
    setAnswered(false);
    setShowExplanation(false);
    setReviewIdx(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55_000);

    try {
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `خطأ ${res.status}`);
      }

      const data = await res.json();
      if (!data.questions?.length) throw new Error('لم يتم إنشاء أسئلة');

      setQuestions(data.questions);
      setAiModel(data.meta?.model || '');
      setQuestionStartMs(Date.now());
      setPhase('playing');
    } catch (e) {
      clearTimeout(timeoutId);
      const msg = e instanceof Error
        ? (e.name === 'AbortError' ? 'انتهت مهلة الاتصال، حاول مرة أخرى' : e.message)
        : 'حدث خطأ غير متوقع';
      setError(msg);
      setPhase('config');
    }
  }, [config]);

  // ── اختيار إجابة ──────────────────────────────────
  const handleSelect = useCallback((idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    setShowExplanation(true);

    const elapsed = Date.now() - questionStartMs;
    const q = questions[currentIdx];
    setAnswers(prev => [...prev, {
      questionId: q.id,
      selected: idx,
      correct: q.correct,
      isCorrect: idx === q.correct,
      timeMs: elapsed,
    }]);
  }, [answered, currentIdx, questions, questionStartMs]);

  // ── السؤال التالي ──────────────────────────────────
  const handleNext = useCallback(() => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelected(null);
      setAnswered(false);
      setShowExplanation(false);
      setQuestionStartMs(Date.now());
    } else {
      setPhase('result');
    }
  }, [currentIdx, questions.length]);

  // ── إعادة البدء ───────────────────────────────────
  const handleRestart = () => {
    setPhase('config');
    setReviewIdx(null);
  };

  // ══════════════════════════════════════════════════
  // شاشة الإعداد
  // ══════════════════════════════════════════════════
  if (phase === 'config') {
    const selectedLaw  = LAWS.find(l => l.id === config.lawId) || LAWS[0];
    const selectedDiff = DIFFS.find(d => d.id === config.difficulty) || DIFFS[0];

    return (
      <div className="max-w-2xl mx-auto px-3" dir="rtl" ref={topRef}>
        {/* رأس الصفحة */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-gray-600 dark:text-gray-300">
            ←
          </button>
          <div>
            <h2 className="text-xl font-black text-[#1a3a5c] dark:text-[#f0c040]">🧠 الكويز القانوني الذكي</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">أسئلة تولّدها الذكاء الاصطناعي مع التعليل بنص القانون</p>
          </div>
        </div>

        {/* خطأ */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* اختيار القانون */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 mb-4 shadow-sm">
          <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-3 text-sm flex items-center gap-2">
            <span className="w-6 h-6 bg-[#1a3a5c] text-white rounded-lg flex items-center justify-center text-xs font-black">١</span>
            اختر القانون
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {LAWS.map(law => (
              <button key={law.id}
                onClick={() => setConfig(c => ({ ...c, lawId: law.id }))}
                className={`p-3 rounded-xl border-2 text-right transition-all ${
                  config.lawId === law.id
                    ? 'border-[#1a3a5c] dark:border-[#f0c040] bg-[#1a3a5c]/5 dark:bg-[#f0c040]/5'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{law.icon}</span>
                  <span className="font-bold text-xs text-gray-800 dark:text-gray-200 leading-tight">{law.label}</span>
                  {config.lawId === law.id && <span className="mr-auto text-[#1a3a5c] dark:text-[#f0c040] text-xs">✓</span>}
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">{law.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* عدد الأسئلة */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 mb-4 shadow-sm">
          <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-3 text-sm flex items-center gap-2">
            <span className="w-6 h-6 bg-[#1a3a5c] text-white rounded-lg flex items-center justify-center text-xs font-black">٢</span>
            عدد الأسئلة
          </h3>
          <div className="flex gap-2">
            {COUNTS.map(n => (
              <button key={n}
                onClick={() => setConfig(c => ({ ...c, count: n }))}
                className={`flex-1 py-3 rounded-xl font-black text-lg transition-all border-2 ${
                  config.count === n
                    ? 'bg-[#1a3a5c] dark:bg-[#f0c040] text-white dark:text-[#1a3a5c] border-[#1a3a5c] dark:border-[#f0c040]'
                    : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                }`}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* مستوى الصعوبة */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 mb-6 shadow-sm">
          <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-3 text-sm flex items-center gap-2">
            <span className="w-6 h-6 bg-[#1a3a5c] text-white rounded-lg flex items-center justify-center text-xs font-black">٣</span>
            مستوى الصعوبة
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {DIFFS.map(d => (
              <button key={d.id}
                onClick={() => setConfig(c => ({ ...c, difficulty: d.id as QuizConfig['difficulty'] }))}
                className={`py-2 px-1 rounded-xl border-2 transition-all text-center ${
                  config.difficulty === d.id
                    ? 'border-[#1a3a5c] dark:border-[#f0c040] bg-[#1a3a5c]/5 dark:bg-[#f0c040]/5'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}>
                <div className="text-lg">{d.icon}</div>
                <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mt-1">{d.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ملخص الاختيار */}
        <div className="bg-gradient-to-r from-[#1a3a5c] to-[#2563eb] text-white rounded-2xl p-4 mb-4 shadow-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold">{selectedLaw.icon} {selectedLaw.label}</span>
            <span>{config.count} أسئلة</span>
            <span>{selectedDiff.icon} {selectedDiff.label}</span>
          </div>
        </div>

        {/* زر البدء */}
        <button onClick={startQuiz}
          className="w-full py-4 bg-[#1a3a5c] dark:bg-[#f0c040] text-white dark:text-[#1a3a5c] rounded-2xl font-black text-lg shadow-lg hover:opacity-90 active:scale-[0.98] transition-all">
          🚀 ابدأ الكويز
        </button>
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3">
          الأسئلة تُولَّد بالذكاء الاصطناعي — قد تستغرق 5-15 ثانية
        </p>
      </div>
    );
  }

  // ══════════════════════════════════════════════════
  // شاشة التحميل
  // ══════════════════════════════════════════════════
  if (phase === 'loading') {
    return (
      <div className="max-w-2xl mx-auto px-3 flex flex-col items-center justify-center min-h-[400px]" dir="rtl">
        <div className="relative w-24 h-24 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-[#1a3a5c]/20 dark:border-[#f0c040]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-t-[#1a3a5c] dark:border-t-[#f0c040] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-3xl">⚖️</div>
        </div>
        <h3 className="text-xl font-black text-[#1a3a5c] dark:text-[#f0c040] mb-2">يُعِدّ الأسئلة...</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
          الذكاء الاصطناعي يصوغ أسئلة دقيقة مع التعليل بنص القانون الجزائري
        </p>
        <div className="flex gap-1 mt-6">
          {[0,1,2].map(i => (
            <div key={i}
              className="w-2 h-2 bg-[#1a3a5c] dark:bg-[#f0c040] rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════
  // شاشة اللعب
  // ══════════════════════════════════════════════════
  if (phase === 'playing') {
    const q = questions[currentIdx];
    if (!q) return null;
    const progress = ((currentIdx) / questions.length) * 100;
    const scoreNow = answers.filter(a => a.isCorrect).length;

    return (
      <div className="max-w-2xl mx-auto px-3" dir="rtl" ref={topRef}>
        {/* شريط التقدم */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <button onClick={handleRestart}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              ← إنهاء
            </button>
            <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
              <span className="font-bold">
                {scoreNow} / {answers.length} ✓
              </span>
              <span className="font-bold text-[#1a3a5c] dark:text-[#f0c040]">
                {currentIdx + 1} / {questions.length}
              </span>
            </div>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#1a3a5c] to-[#2563eb] dark:from-[#f0c040] dark:to-[#f59e0b] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* بطاقة السؤال */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden mb-4">
          {/* رأس البطاقة */}
          <div className="bg-gradient-to-r from-[#1a3a5c] to-[#1d4ed8] p-4">
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="text-xs px-2 py-1 bg-white/20 text-white rounded-full font-bold">
                {q.law}
              </span>
              {q.lawNumber && (
                <span className="text-xs px-2 py-1 bg-white/15 text-white/90 rounded-full">
                  رقم {q.lawNumber}
                </span>
              )}
              <span className="text-xs px-2 py-1 rounded-full font-bold text-white"
                style={{ backgroundColor: `${DIFF_COLORS[q.difficulty]}90` }}>
                {DIFF_LABELS[q.difficulty] || q.difficulty}
              </span>
              <span className="text-xs px-2 py-1 bg-white/10 text-white/80 rounded-full">
                {q.category}
              </span>
              <span className="text-xs px-2 py-1 bg-white/10 text-white/80 rounded-full font-mono">
                {q.article}
              </span>
            </div>
            <p className="text-white font-bold text-base leading-relaxed">{q.question}</p>
          </div>

          {/* الخيارات */}
          <div className="p-4 space-y-2">
            {q.options.map((opt, i) => {
              let style = 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-[#1a3a5c] dark:hover:border-[#f0c040] hover:bg-[#1a3a5c]/5';
              let icon: React.ReactNode = null;

              if (answered) {
                if (i === q.correct) {
                  style = 'border-green-500 bg-green-50 dark:bg-green-900/20';
                  icon = <span className="text-green-600 font-black ml-2">✓</span>;
                } else if (i === selected && i !== q.correct) {
                  style = 'border-red-400 bg-red-50 dark:bg-red-900/20';
                  icon = <span className="text-red-500 font-black ml-2">✗</span>;
                } else {
                  style = 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 opacity-60';
                }
              }

              return (
                <button key={i}
                  onClick={() => handleSelect(i)}
                  disabled={answered}
                  className={`w-full p-3 rounded-xl border-2 text-right transition-all font-medium text-sm leading-relaxed ${style} ${!answered ? 'active:scale-[0.98]' : ''}`}>
                  <span className="inline-flex items-start gap-2">
                    <span className="font-black text-[#1a3a5c] dark:text-[#f0c040] shrink-0 mt-0.5">
                      {['أ', 'ب', 'ج', 'د'][i]}.
                    </span>
                    <span className="flex-1 text-gray-800 dark:text-gray-200">{opt}</span>
                    {icon}
                  </span>
                </button>
              );
            })}
          </div>

          {/* التعليل */}
          {showExplanation && (
            <div className="mx-4 mb-4 rounded-xl overflow-hidden border border-[#1a3a5c]/20 dark:border-[#f0c040]/20">
              {/* نص المادة */}
              <div className="bg-[#1a3a5c]/5 dark:bg-[#f0c040]/5 p-3 border-b border-[#1a3a5c]/10 dark:border-[#f0c040]/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-black text-[#1a3a5c] dark:text-[#f0c040] bg-[#1a3a5c]/10 dark:bg-[#f0c040]/10 px-2 py-1 rounded-lg">
                    📜 {q.article}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{q.law}</span>
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium italic">
                  &quot;{q.articleText}&quot;
                </p>
              </div>
              {/* الشرح */}
              <div className="bg-white dark:bg-gray-800 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-400">💡 التعليل</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {q.explanation}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* زر التالي */}
        {answered && (
          <button onClick={handleNext}
            className="w-full py-4 bg-[#1a3a5c] dark:bg-[#f0c040] text-white dark:text-[#1a3a5c] rounded-2xl font-black text-base shadow-lg hover:opacity-90 active:scale-[0.98] transition-all">
            {currentIdx < questions.length - 1 ? 'السؤال التالي ←' : '🏁 عرض النتائج'}
          </button>
        )}

        {/* معلومات النموذج */}
        {aiModel && (
          <p className="text-center text-[10px] text-gray-400 dark:text-gray-600 mt-3">
            تولّدت بواسطة {aiModel}
          </p>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════
  // شاشة النتائج
  // ══════════════════════════════════════════════════
  if (phase === 'result') {
    const total    = questions.length;
    const correct  = answers.filter(a => a.isCorrect).length;
    const pct      = Math.round((correct / total) * 100);
    const avgTime  = Math.round(answers.reduce((s, a) => s + a.timeMs, 0) / answers.length / 1000);

    let grade: { label: string; icon: string; color: string; bg: string };
    if (pct >= 90)      grade = { label: 'ممتاز',  icon: '🏆', color: '#059669', bg: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20' };
    else if (pct >= 70) grade = { label: 'جيد جداً', icon: '🥇', color: '#2563eb', bg: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20' };
    else if (pct >= 50) grade = { label: 'جيد',    icon: '🥈', color: '#d97706', bg: 'from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20' };
    else                grade = { label: 'يحتاج مراجعة', icon: '📚', color: '#dc2626', bg: 'from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20' };

    // في وضع المراجعة
    if (reviewIdx !== null) {
      const rq  = questions[reviewIdx];
      const ans = answers[reviewIdx];
      if (!rq || !ans) { setReviewIdx(null); return null; }

      return (
        <div className="max-w-2xl mx-auto px-3" dir="rtl" ref={topRef}>
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setReviewIdx(null)}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition-all text-gray-600 dark:text-gray-300">
              ←
            </button>
            <h3 className="font-black text-[#1a3a5c] dark:text-[#f0c040]">
              مراجعة السؤال {reviewIdx + 1}
            </h3>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-[#1a3a5c] to-[#1d4ed8] p-4">
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="text-xs px-2 py-1 bg-white/20 text-white rounded-full font-bold">{rq.law}</span>
                <span className="text-xs px-2 py-1 bg-white/10 text-white/80 rounded-full font-mono">{rq.article}</span>
                <span className={`text-xs px-2 py-1 rounded-full font-bold ${ans.isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                  {ans.isCorrect ? '✓ صحيح' : '✗ خطأ'}
                </span>
              </div>
              <p className="text-white font-bold text-sm leading-relaxed">{rq.question}</p>
            </div>

            <div className="p-4 space-y-2">
              {rq.options.map((opt, i) => {
                let style = 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 opacity-60';
                if (i === rq.correct) style = 'border-green-500 bg-green-50 dark:bg-green-900/20';
                else if (i === ans.selected && i !== rq.correct) style = 'border-red-400 bg-red-50 dark:bg-red-900/20';

                return (
                  <div key={i} className={`p-3 rounded-xl border-2 text-right text-sm font-medium leading-relaxed ${style}`}>
                    <span className="inline-flex items-start gap-2">
                      <span className="font-black text-[#1a3a5c] dark:text-[#f0c040] shrink-0">
                        {['أ', 'ب', 'ج', 'د'][i]}.
                      </span>
                      <span className="flex-1 text-gray-800 dark:text-gray-200">{opt}</span>
                      {i === rq.correct && <span className="text-green-600 font-black">✓</span>}
                      {i === ans.selected && i !== rq.correct && <span className="text-red-500 font-black">✗</span>}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mx-4 mb-4 rounded-xl overflow-hidden border border-[#1a3a5c]/20">
              <div className="bg-[#1a3a5c]/5 dark:bg-[#f0c040]/5 p-3 border-b border-[#1a3a5c]/10">
                <span className="text-xs font-black text-[#1a3a5c] dark:text-[#f0c040] bg-[#1a3a5c]/10 dark:bg-[#f0c040]/10 px-2 py-1 rounded-lg">
                  📜 {rq.article}
                </span>
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed mt-2 italic">
                  &quot;{rq.articleText}&quot;
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">💡 {rq.explanation}</p>
              </div>
            </div>
          </div>

          {/* التنقل بين الأسئلة */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setReviewIdx(i => i !== null && i > 0 ? i - 1 : i)}
              disabled={reviewIdx === 0}
              className="flex-1 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 font-bold text-sm disabled:opacity-40 text-gray-700 dark:text-gray-300 hover:border-[#1a3a5c] transition-all">
              → السابق
            </button>
            <button
              onClick={() => setReviewIdx(i => i !== null && i < questions.length - 1 ? i + 1 : i)}
              disabled={reviewIdx === questions.length - 1}
              className="flex-1 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 font-bold text-sm disabled:opacity-40 text-gray-700 dark:text-gray-300 hover:border-[#1a3a5c] transition-all">
              ← التالي
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto px-3" dir="rtl" ref={topRef}>
        {/* بطاقة النتيجة */}
        <div className={`bg-gradient-to-br ${grade.bg} rounded-2xl p-6 border-2 mb-5 text-center shadow-lg`}
          style={{ borderColor: `${grade.color}40` }}>
          <div className="text-5xl mb-3">{grade.icon}</div>
          <h2 className="text-2xl font-black mb-1" style={{ color: grade.color }}>{grade.label}</h2>
          <div className="text-5xl font-black my-3" style={{ color: grade.color }}>{pct}%</div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {correct} من أصل {total} إجابة صحيحة
          </p>
        </div>

        {/* إحصائيات */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'صحيح',   value: correct,      color: '#059669', icon: '✓' },
            { label: 'خطأ',    value: total - correct, color: '#dc2626', icon: '✗' },
            { label: 'وسطي',   value: `${avgTime}ث`, color: '#2563eb', icon: '⏱' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 text-center shadow-sm">
              <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ملخص السؤال تلو الآخر */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm mb-5 overflow-hidden">
          <div className="p-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-black text-gray-800 dark:text-gray-200 text-sm">📋 ملخص الإجابات</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {questions.map((q, i) => {
              const a = answers[i];
              if (!a) return null;
              return (
                <button key={q.id}
                  onClick={() => setReviewIdx(i)}
                  className="w-full p-3 text-right hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                    a.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {a.isCorrect ? '✓' : '✗'}
                  </span>
                  <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 line-clamp-1 leading-relaxed">
                    {q.question}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono shrink-0">{q.article}</span>
                  <span className="text-[10px] text-[#1a3a5c] dark:text-[#f0c040] shrink-0">مراجعة →</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* أزرار النهاية */}
        <div className="flex gap-3">
          <button onClick={startQuiz}
            className="flex-1 py-4 bg-[#1a3a5c] dark:bg-[#f0c040] text-white dark:text-[#1a3a5c] rounded-2xl font-black text-sm shadow-lg hover:opacity-90 active:scale-[0.98] transition-all">
            🔄 جولة جديدة بنفس الإعدادات
          </button>
          <button onClick={handleRestart}
            className="flex-1 py-4 border-2 border-[#1a3a5c] dark:border-[#f0c040] text-[#1a3a5c] dark:text-[#f0c040] rounded-2xl font-black text-sm hover:bg-[#1a3a5c]/5 active:scale-[0.98] transition-all">
            ⚙️ إعدادات جديدة
          </button>
        </div>

        {aiModel && (
          <p className="text-center text-[10px] text-gray-400 dark:text-gray-600 mt-3">
            الأسئلة ولّدها {aiModel}
          </p>
        )}
      </div>
    );
  }

  return null;
}
