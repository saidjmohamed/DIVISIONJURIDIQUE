'use client';

import { useState } from 'react';
import {
  HelpCircle,
  ChevronDown,
  Play,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trophy,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizConfig {
  topic: string;
  difficulty: string;
  count: number;
}

const topics = [
  { id: 'القانون المدني', label: 'القانون المدني' },
  { id: 'القانون الجنائي', label: 'القانون الجنائي' },
  { id: 'قانون الأسرة', label: 'قانون الأسرة' },
  { id: 'القانون التجاري', label: 'القانون التجاري' },
  { id: 'قانون العمل', label: 'قانون العمل' },
  { id: 'القانون الإداري', label: 'القانون الإداري' },
];

const difficulties = [
  { id: 'سهل', label: 'سهل', color: 'text-emerald-400' },
  { id: 'متوسط', label: 'متوسط', color: 'text-amber-400' },
  { id: 'صعب', label: 'صعب', color: 'text-rose-400' },
];

const questionCounts = [5, 10, 15];

type QuizState = 'idle' | 'loading' | 'playing' | 'answered' | 'finished';

export default function GeminiQuiz() {
  const [quizState, setQuizState] = useState<QuizState>('idle');
  const [config, setConfig] = useState<QuizConfig>({
    topic: 'القانون المدني',
    difficulty: 'متوسط',
    count: 5,
  });
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  const currentQuestion = questions[currentIndex];

  const startQuiz = async () => {
    setQuizState('loading');
    try {
      const response = await fetch('/api/gemini-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل في توليد الأسئلة');
      }

      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        setCurrentIndex(0);
        setScore(0);
        setSelectedAnswer(null);
        setQuizState('playing');
      } else {
        throw new Error('لم يتم توليد أي أسئلة');
      }
    } catch (error) {
      toast.error('حدث خطأ في توليد الأسئلة. يرجى المحاولة مرة أخرى.');
      setQuizState('idle');
    }
  };

  const handleAnswer = (index: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);
    setQuizState('answered');
    if (index === currentQuestion.correctAnswer) {
      setScore((prev) => prev + 1);
    }
  };

  const nextQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      setQuizState('finished');
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setQuizState('playing');
    }
  };

  const resetQuiz = () => {
    setQuizState('idle');
    setQuestions([]);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setScore(0);
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-emerald-400';
    if (percentage >= 50) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getScoreGrade = (percentage: number) => {
    if (percentage >= 90) return 'ممتاز';
    if (percentage >= 80) return 'جيد جداً';
    if (percentage >= 60) return 'جيد';
    if (percentage >= 50) return 'مقبول';
    return 'يحتاج مراجعة';
  };

  // Idle / Setup Screen
  if (quizState === 'idle') {
    return (
      <div className="space-y-5 px-4 pt-4 pb-4">
        <div className="animate-fade-in">
          <h2 className="text-xl font-bold text-foreground">اختبار قانوني ❓</h2>
          <p className="text-sm text-muted-foreground">
            اختبر معلوماتك القانونية مع أسئلة مولّدة بالذكاء الاصطناعي
          </p>
        </div>

        <div className="animate-fade-in stagger-1 space-y-4">
          {/* Topic Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              📚 الموضوع القانوني
            </label>
            <div className="relative">
              <select
                value={config.topic}
                onChange={(e) => setConfig({ ...config, topic: e.target.value })}
                className="glass w-full appearance-none rounded-xl px-4 py-3 text-sm text-foreground bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              >
                {topics.map((t) => (
                  <option
                    key={t.id}
                    value={t.id}
                    className="bg-slate-800 text-foreground"
                  >
                    {t.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Difficulty Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              🎯 مستوى الصعوبة
            </label>
            <div className="grid grid-cols-3 gap-2">
              {difficulties.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setConfig({ ...config, difficulty: d.id })}
                  className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    config.difficulty === d.id
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      : 'glass text-muted-foreground hover:bg-white/10'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Question Count */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              📝 عدد الأسئلة
            </label>
            <div className="grid grid-cols-3 gap-2">
              {questionCounts.map((count) => (
                <button
                  key={count}
                  onClick={() => setConfig({ ...config, count })}
                  className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    config.count === count
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      : 'glass text-muted-foreground hover:bg-white/10'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <Button
            onClick={startQuiz}
            className="w-full gap-2 bg-gradient-to-l from-sky-500 to-blue-600 py-3 text-base font-bold hover:from-sky-600 hover:to-blue-700"
          >
            <Play className="h-5 w-5" />
            ابدأ الاختبار
          </Button>
        </div>
      </div>
    );
  }

  // Loading Screen
  if (quizState === 'loading') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 animate-fade-in">
        <div className="animate-pulse-gentle flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/20 to-sky-500/20">
          <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
        </div>
        <p className="text-sm font-medium text-foreground">
          جارٍ توليد الأسئلة...
        </p>
        <p className="text-xs text-muted-foreground">
          يتم إنشاء {config.count} سؤال عن {config.topic}
        </p>
      </div>
    );
  }

  // Finished Screen
  if (quizState === 'finished') {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 animate-slide-up">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-500/20 to-amber-700/20">
          <Trophy className="h-10 w-10 text-amber-400" />
        </div>
        <h3 className="text-xl font-bold text-foreground">نتيجة الاختبار</h3>
        <p className={`text-3xl font-black ${getScoreColor(percentage)}`}>
          {percentage}%
        </p>
        <p className={`text-sm font-semibold ${getScoreColor(percentage)}`}>
          {getScoreGrade(percentage)}
        </p>
        <div className="glass w-full max-w-sm rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">الإجابات الصحيحة</span>
            <span className="font-bold text-emerald-400">{score}/{questions.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">الإجابات الخاطئة</span>
            <span className="font-bold text-rose-400">
              {questions.length - score}/{questions.length}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">الموضوع</span>
            <span className="font-medium text-foreground">{config.topic}</span>
          </div>
        </div>
        <Button
          onClick={resetQuiz}
          className="mt-2 gap-2 bg-sky-500 hover:bg-sky-600"
        >
          <RotateCcw className="h-4 w-4" />
          اختبار جديد
        </Button>
      </div>
    );
  }

  // Playing / Answered Screen
  if (!currentQuestion) return null;

  const progressPercentage = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="space-y-4 px-4 pt-4 pb-4 animate-fade-in">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            السؤال {currentIndex + 1} من {questions.length}
          </span>
          <span className="font-medium text-sky-400">
            النتيجة: {score}/{questions.length}
          </span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      {/* Question Card */}
      <div className="glass rounded-2xl p-5">
        <div className="mb-4 flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-sky-400" />
          <span className="text-xs text-muted-foreground">{config.topic}</span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground">{config.difficulty}</span>
        </div>
        <h3 className="text-base font-bold leading-relaxed text-foreground">
          {currentQuestion.question}
        </h3>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {currentQuestion.options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrect = index === currentQuestion.correctAnswer;
          const showResult = selectedAnswer !== null;

          let optionStyle = 'glass hover:bg-white/10';
          if (showResult) {
            if (isCorrect) {
              optionStyle = 'bg-emerald-500/15 border border-emerald-500/30';
            } else if (isSelected && !isCorrect) {
              optionStyle = 'bg-rose-500/15 border border-rose-500/30';
            } else {
              optionStyle = 'glass opacity-50';
            }
          } else if (isSelected) {
            optionStyle = 'bg-sky-500/15 border border-sky-500/30';
          }

          return (
            <button
              key={index}
              onClick={() => handleAnswer(index)}
              disabled={selectedAnswer !== null}
              className={`flex w-full items-center gap-3 rounded-xl p-4 text-right transition-all duration-200 ${optionStyle}`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                  showResult && isCorrect
                    ? 'bg-emerald-500 text-white'
                    : showResult && isSelected && !isCorrect
                      ? 'bg-rose-500 text-white'
                      : 'bg-white/10 text-muted-foreground'
                }`}
              >
                {showResult && isCorrect ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : showResult && isSelected && !isCorrect ? (
                  <XCircle className="h-5 w-5" />
                ) : (
                  String.fromCharCode(1571 + index) // Arabic letters: أ ب ج د
                )}
              </div>
              <span className="text-sm font-medium text-foreground">{option}</span>
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {selectedAnswer !== null && currentQuestion.explanation && (
        <div
          className={`rounded-xl border p-4 animate-slide-up ${
            selectedAnswer === currentQuestion.correctAnswer
              ? 'border-emerald-500/20 bg-emerald-500/5'
              : 'border-amber-500/20 bg-amber-500/5'
          }`}
        >
          <div className="flex items-start gap-2">
            <AlertCircle
              className={`mt-0.5 h-4 w-4 shrink-0 ${
                selectedAnswer === currentQuestion.correctAnswer
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            />
            <div>
              <p
                className={`text-xs font-semibold mb-1 ${
                  selectedAnswer === currentQuestion.correctAnswer
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {selectedAnswer === currentQuestion.correctAnswer
                  ? 'إجابة صحيحة! ✓'
                  : 'إجابة خاطئة ✗'}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {currentQuestion.explanation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Next Button */}
      {selectedAnswer !== null && (
        <Button
          onClick={nextQuestion}
          className="w-full gap-2 bg-sky-500 hover:bg-sky-600 animate-slide-up"
        >
          {currentIndex + 1 >= questions.length ? (
            <>
              <Trophy className="h-4 w-4" />
              عرض النتيجة
            </>
          ) : (
            <>
              السؤال التالي
              <ChevronDown className="h-4 w-4 rotate-180" />
            </>
          )}
        </Button>
      )}
    </div>
  );
}
