'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isQuiz?: boolean;
}

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

interface Quiz {
  title: string;
  law: string;
  questions: QuizQuestion[];
}

// ─── Quiz state per message ───────────────────────────────────
interface QuizState {
  currentQuestion: number;
  score: number;
  selectedOption: number | null;
  showExplanation: boolean;
  isComplete: boolean;
  answers: (number | null)[];
}

const QUICK_QUESTIONS = [
  'ما هي شروط رفع دعوى مدنية؟',
  'اشرح لي المادة 41 من قانون العقوبات',
  'ما الفرق بين الطعن بالنقض والمعارضة؟',
  'ما هي حقوق المتهم في قانون الإجراءات الجزائية؟',
  'كيف يتم حساب الآجال القانونية؟',
  'ما هي شروط عقد الشغل في القانون الجزائري؟',
];

const QUIZ_PROMPTS = [
  {
    label: '📜 القانون المدني (75-58)',
    prompt: 'أنشئ كويز من 5 أسئلة اختبار متعددة الخيارات حول القانون المدني الجزائري (الأمر 75-58). غطّ مواضيع: الالتزامات، العقود، الملكية، والآجال. أرسل النتيجة فقط بتنسيق JSON كما هو محدد.',
  },
  {
    label: '⚖️ قانون العقوبات (66-156)',
    prompt: 'أنشئ كويز من 5 أسئلة اختبار متعددة الخيارات حول قانون العقوبات الجزائري (الأمر 66-156). غطّ مواضيع: الجرائم، العقوبات، موانع المسؤولية. أرسل النتيجة فقط بتنسيق JSON كما هو محدد.',
  },
  {
    label: '🔍 الإجراءات الجزائية (25-14)',
    prompt: 'أنشئ كويز من 5 أسئلة اختبار متعددة الخيارات حول قانون الإجراءات الجزائية الجزائري (قانون 25-14 الجديد). غطّ مواضيع: التحقيق، التفتيش، الاعتقال، المحاكمة. أرسل النتيجة فقط بتنسيق JSON كما هو محدد.',
  },
  {
    label: '🏛️ الإجراءات المدنية (08-09)',
    prompt: 'أنشئ كويز من 5 أسئلة اختبار متعددة الخيارات حول قانون الإجراءات المدنية والإدارية (قانون 08-09). غطّ مواضيع: الاختصاص، رفع الدعوى، طرق الطعن. أرسل النتيجة فقط بتنسيق JSON كما هو محدد.',
  },
  {
    label: '💼 القانون التجاري (75-59)',
    prompt: 'أنشئ كويز من 5 أسئلة اختبار متعددة الخيارات حول القانون التجاري الجزائري (الأمر 75-59). غطّ مواضيع: الأعمال التجارية، الشركات، الأوراق التجارية. أرسل النتيجة فقط بتنسيق JSON كما هو محدد.',
  },
  {
    label: '👨‍👩‍👧‍👦 قانون الأسرة (84-11)',
    prompt: 'أنشئ كويز من 5 أسئلة اختبار متعددة الخيارات حول قانون الأسرة الجزائري (الأمر 84-11). غطّ مواضيع: الزواج، الطلاق، الميراث، النفقة. أرسل النتيجة فقط بتنسيق JSON كما هو محدد.',
  },
  {
    label: '🚢 القانون البحري (88-03)',
    prompt: 'أنشئ كويز من 5 أسئلة اختبار متعددة الخيارات حول القانون البحري الجزائري (الأمر 88-03). غطّ مواضيع: السفن، النقل البحري، التأمين البحري، حوادث البحر. أرسل النتيجة فقط بتنسيق JSON كما هو محدد.',
  },
];

const COMPREHENSIVE_QUIZ_PROMPT = 'أنشئ كويز شامل من 5 أسئلة اختبار متعددة الخيارات يغطي مختلف القوانين الجزائرية (القانون المدني، قانون العقوبات، الإجراءات الجزائية، الإجراءات المدنية، القانون التجاري، قانون الأسرة، القانون البحري). اختر مواضيع متنوعة من قوانين مختلفة. أرسل النتيجة فقط بتنسيق JSON كما هو محدد.';

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('ar-DZ', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// ─── Quiz JSON Parser ─────────────────────────────────────────
function parseQuizFromContent(content: string): Quiz | null {
  try {
    // Strategy 1: Look for ```json code block
    const jsonBlockRegex = /```json\s*([\s\S]*?)```/;
    const blockMatch = content.match(jsonBlockRegex);
    if (blockMatch) {
      const parsed = JSON.parse(blockMatch[1].trim());
      if (parsed.quiz && parsed.quiz.questions && Array.isArray(parsed.quiz.questions)) {
        return parsed.quiz as Quiz;
      }
    }

    // Strategy 2: Look for inline JSON with quiz property
    const jsonInlineRegex = /\{[\s\S]*?"quiz"[\s\S]*?\}/;
    const inlineMatch = content.match(jsonInlineRegex);
    if (inlineMatch) {
      const parsed = JSON.parse(inlineMatch[0]);
      if (parsed.quiz && parsed.quiz.questions && Array.isArray(parsed.quiz.questions)) {
        return parsed.quiz as Quiz;
      }
    }

    // Strategy 3: Try to parse the whole content as JSON
    try {
      const parsed = JSON.parse(content.trim());
      if (parsed.quiz && parsed.quiz.questions && Array.isArray(parsed.quiz.questions)) {
        return parsed.quiz as Quiz;
      }
    } catch {
      // Not valid JSON as whole content
    }

    return null;
  } catch {
    return null;
  }
}

// ─── Interactive Quiz Component ───────────────────────────────
function InteractiveQuiz({ quiz, msgIndex }: { quiz: Quiz; msgIndex: number }) {
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestion: 0,
    score: 0,
    selectedOption: null,
    showExplanation: false,
    isComplete: false,
    answers: new Array(quiz.questions.length).fill(null),
  });

  const question = quiz.questions[quizState.currentQuestion];
  const totalQuestions = quiz.questions.length;
  const progress = ((quizState.currentQuestion) / totalQuestions) * 100;

  const handleSelectOption = (optionIndex: number) => {
    if (quizState.showExplanation) return;
    const isCorrect = optionIndex === question.correct;
    const newAnswers = [...quizState.answers];
    newAnswers[quizState.currentQuestion] = optionIndex;

    setQuizState((prev) => ({
      ...prev,
      selectedOption: optionIndex,
      showExplanation: true,
      score: isCorrect ? prev.score + 1 : prev.score,
      answers: newAnswers,
    }));
  };

  const handleNextQuestion = () => {
    if (quizState.currentQuestion + 1 >= totalQuestions) {
      setQuizState((prev) => ({ ...prev, isComplete: true }));
    } else {
      setQuizState((prev) => ({
        ...prev,
        currentQuestion: prev.currentQuestion + 1,
        selectedOption: null,
        showExplanation: false,
      }));
    }
  };

  const handleRetry = () => {
    setQuizState({
      currentQuestion: 0,
      score: 0,
      selectedOption: null,
      showExplanation: false,
      isComplete: false,
      answers: new Array(quiz.questions.length).fill(null),
    });
  };

  const getScoreColor = () => {
    const pct = (quizState.score / totalQuestions) * 100;
    if (pct >= 80) return '#22c55e';
    if (pct >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreMessage = () => {
    const pct = (quizState.score / totalQuestions) * 100;
    if (pct === 100) return '🏆 ممتاز! إجابات كاملة صحيحة!';
    if (pct >= 80) return '🌟 أحسنت! مستوى جيد جداً!';
    if (pct >= 60) return '👍 جيد! يمكنك التحسن أكثر.';
    if (pct >= 40) return '📖 لا بأس. راجع القانون وحاول مرة أخرى.';
    return '📚 تحتاج مراجعة. لا تيأس وحاول مجدداً!';
  };

  const optionLabels = ['أ', 'ب', 'ج', 'د'];

  // ─── Quiz Complete Screen ──────────────────────────────
  if (quizState.isComplete) {
    const pct = Math.round((quizState.score / totalQuestions) * 100);
    return (
      <div
        dir="rtl"
        className="w-full rounded-2xl overflow-hidden"
        style={{
          background: 'var(--bg-card, #ffffff)',
          border: '1.5px solid rgba(201, 168, 76, 0.3)',
          boxShadow: '0 4px 16px rgba(201, 168, 76, 0.12)',
        }}
      >
        {/* Score Header */}
        <div
          className="text-center py-6 px-4"
          style={{
            background: 'linear-gradient(135deg, #0f2540 0%, #1a3a5c 100%)',
          }}
        >
          <p className="text-white text-xs mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
            📊 نتيجة الاختبار
          </p>
          <h3 className="text-white text-lg font-bold mb-1">{quiz.title}</h3>
          <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {quiz.law}
          </p>
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <div
                className="text-4xl font-bold"
                style={{ color: getScoreColor() }}
              >
                {quizState.score}/{totalQuestions}
              </div>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                إجابات صحيحة
              </p>
            </div>
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center border-3"
              style={{
                borderColor: getScoreColor(),
                background: `${getScoreColor()}20`,
              }}
            >
              <span className="text-xl font-bold" style={{ color: getScoreColor() }}>
                {pct}%
              </span>
            </div>
          </div>
          <p className="text-white text-sm mt-3 font-medium">{getScoreMessage()}</p>
        </div>

        {/* Answers Review */}
        <div className="px-4 py-3">
          <p className="text-xs font-bold mb-3" style={{ color: '#1a3a5c' }}>
            📋 مراجعة الإجابات:
          </p>
          <div className="space-y-2">
            {quiz.questions.map((q, idx) => {
              const userAnswer = quizState.answers[idx];
              const isCorrect = userAnswer === q.correct;
              return (
                <div
                  key={q.id}
                  className="flex items-start gap-2 p-2 rounded-lg text-xs"
                  style={{
                    background: isCorrect ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${isCorrect ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  }}
                >
                  <span className="mt-0.5">{isCorrect ? '✅' : '❌'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium mb-0.5" style={{ color: '#0f172a' }}>
                      {idx + 1}. {q.question}
                    </p>
                    {!isCorrect && (
                      <p className="text-xs" style={{ color: '#22c55e' }}>
                        الإجابة الصحيحة: {optionLabels[q.correct]}. {q.options[q.correct]}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Retry Button */}
        <div className="px-4 pb-4">
          <button
            onClick={handleRetry}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #c9a84c, #f0c040)',
              color: '#0f2540',
              boxShadow: '0 4px 12px rgba(201, 168, 76, 0.4)',
            }}
          >
            🔄 إعادة الاختبار
          </button>
        </div>
      </div>
    );
  }

  // ─── Question Screen ───────────────────────────────────
  return (
    <div
      dir="rtl"
      className="w-full rounded-2xl overflow-hidden"
      style={{
        background: 'var(--bg-card, #ffffff)',
        border: '1.5px solid rgba(201, 168, 76, 0.3)',
        boxShadow: '0 4px 16px rgba(201, 168, 76, 0.12)',
      }}
    >
      {/* Quiz Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{
          background: 'linear-gradient(135deg, #0f2540 0%, #1a3a5c 100%)',
        }}
      >
        <div>
          <h3 className="text-white text-sm font-bold">{quiz.title}</h3>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {quiz.law}
          </p>
        </div>
        <div
          className="px-3 py-1 rounded-full text-xs font-bold"
          style={{
            background: 'rgba(201, 168, 76, 0.2)',
            color: '#f0c040',
            border: '1px solid rgba(201, 168, 76, 0.3)',
          }}
        >
          {quizState.currentQuestion + 1} / {totalQuestions}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1" style={{ background: 'rgba(0,0,0,0.05)' }}>
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #c9a84c, #f0c040)',
          }}
        />
      </div>

      {/* Score Tracker */}
      <div className="px-4 pt-3 flex items-center justify-between">
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{
            background: 'rgba(34,197,94,0.1)',
            color: '#22c55e',
            border: '1px solid rgba(34,197,94,0.2)',
          }}
        >
          ✅ {quizState.score} صحيح
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted, #94a3b8)' }}>
          السؤال {quizState.currentQuestion + 1} من {totalQuestions}
        </span>
      </div>

      {/* Question */}
      <div className="px-4 py-3">
        <p
          className="text-sm font-bold leading-relaxed"
          style={{ color: '#0f172a' }}
        >
          {question.question}
        </p>
      </div>

      {/* Options */}
      <div className="px-4 pb-2 space-y-2">
        {question.options.map((option, idx) => {
          const isSelected = quizState.selectedOption === idx;
          const isCorrectOption = idx === question.correct;
          const showFeedback = quizState.showExplanation;

          let bgColor = 'var(--bg-page, #f1f5f9)';
          let borderColor = 'rgba(0,0,0,0.06)';
          let textColor = 'var(--text-primary, #0f172a)';
          let extraIcon = '';

          if (showFeedback) {
            if (isCorrectOption) {
              bgColor = 'rgba(34,197,94,0.1)';
              borderColor = 'rgba(34,197,94,0.5)';
              textColor = '#16a34a';
              extraIcon = ' ✅';
            } else if (isSelected && !isCorrectOption) {
              bgColor = 'rgba(239,68,68,0.1)';
              borderColor = 'rgba(239,68,68,0.5)';
              textColor = '#dc2626';
              extraIcon = ' ❌';
            } else {
              bgColor = 'rgba(0,0,0,0.02)';
              borderColor = 'rgba(0,0,0,0.04)';
              textColor = 'var(--text-muted, #94a3b8)';
            }
          } else if (isSelected) {
            bgColor = 'rgba(201,168,76,0.1)';
            borderColor = 'rgba(201,168,76,0.5)';
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelectOption(idx)}
              disabled={showFeedback}
              className="w-full text-right px-4 py-3 rounded-xl text-sm transition-all duration-200 flex items-center gap-3"
              style={{
                background: bgColor,
                border: `1.5px solid ${borderColor}`,
                color: textColor,
                cursor: showFeedback ? 'default' : 'pointer',
                opacity: showFeedback && !isSelected && !isCorrectOption ? 0.5 : 1,
              }}
            >
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{
                  background: showFeedback && isCorrectOption
                    ? 'rgba(34,197,94,0.2)'
                    : showFeedback && isSelected && !isCorrectOption
                      ? 'rgba(239,68,68,0.2)'
                      : 'rgba(201,168,76,0.15)',
                  color: showFeedback && isCorrectOption
                    ? '#16a34a'
                    : showFeedback && isSelected && !isCorrectOption
                      ? '#dc2626'
                      : '#1a3a5c',
                }}
              >
                {optionLabels[idx]}
              </span>
              <span className="flex-1">{option}</span>
              {extraIcon && <span>{extraIcon}</span>}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {quizState.showExplanation && (
        <div className="px-4 pb-3 animate-fade-in">
          <div
            className="p-3 rounded-xl text-xs leading-relaxed"
            style={{
              background: quizState.selectedOption === question.correct
                ? 'rgba(34,197,94,0.08)'
                : 'rgba(239,68,68,0.08)',
              border: `1px solid ${quizState.selectedOption === question.correct
                ? 'rgba(34,197,94,0.2)'
                : 'rgba(239,68,68,0.2)'
                }`,
            }}
          >
            <p className="font-bold mb-1" style={{ color: '#1a3a5c' }}>
              💡 شرح الإجابة:
            </p>
            <p style={{ color: 'var(--text-secondary, #475569)' }}>
              {question.explanation}
            </p>
          </div>
        </div>
      )}

      {/* Next Button */}
      {quizState.showExplanation && (
        <div className="px-4 pb-4 animate-slide-up">
          <button
            onClick={handleNextQuestion}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #1a3a5c, #2d5986)',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(26, 58, 92, 0.3)',
            }}
          >
            {quizState.currentQuestion + 1 >= totalQuestions
              ? '📊 عرض النتيجة'
              : '➡️ السؤال التالي'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Typing Indicator ────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 mb-4 animate-fade-in">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
        style={{
          background: 'linear-gradient(135deg, #1a3a5c, #2d5986)',
        }}
      >
        ⚖️
      </div>
      <div
        className="px-4 py-3 rounded-2xl rounded-tr-sm max-w-[80%]"
        style={{
          background: 'var(--bg-card, #ffffff)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.04)',
        }}
      >
        <div className="flex items-center gap-1.5" dir="rtl">
          <span
            className="w-2 h-2 rounded-full animate-bounce"
            style={{ background: '#c9a84c', animationDelay: '0ms' }}
          />
          <span
            className="w-2 h-2 rounded-full animate-bounce"
            style={{ background: '#c9a84c', animationDelay: '150ms' }}
          />
          <span
            className="w-2 h-2 rounded-full animate-bounce"
            style={{ background: '#c9a84c', animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main AIChat Component ──────────────────────────────────
export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickQuestions, setShowQuickQuestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const handleSend = useCallback(
    async (messageText?: string) => {
      const text = messageText || inputValue.trim();
      if (!text || isLoading) return;

      const userMessage: Message = {
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue('');
      setShowQuickQuestions(false);
      setIsLoading(true);

      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }

      try {
        // Build conversation history for API (exclude system prompt)
        const conversationHistory = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            conversationHistory,
          }),
        });

        const data = await response.json();

        if (data.success && data.reply) {
          const assistantMessage: Message = {
            role: 'assistant',
            content: data.reply,
            timestamp: new Date().toISOString(),
            isQuiz: data.isQuiz || parseQuizFromContent(data.reply) !== null,
          };
          setMessages((prev) => [...prev, assistantMessage]);
        } else {
          const errorMessage: Message = {
            role: 'assistant',
            content: data.error || 'عذراً، حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
      } catch {
        const errorMessage: Message = {
          role: 'assistant',
          content: 'عذراً، تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.',
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [inputValue, isLoading, messages]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  const handleClearChat = () => {
    setMessages([]);
    setShowQuickQuestions(true);
  };

  const handleQuickQuestion = (question: string) => {
    handleSend(question);
  };

  const handleQuizPrompt = (prompt: string) => {
    handleSend(prompt);
  };

  // ─── Render Message Content ────────────────────────────
  const renderMessageContent = (msg: Message, index: number) => {
    // Try to parse quiz from assistant messages
    if (msg.role === 'assistant') {
      const quiz = parseQuizFromContent(msg.content);
      if (quiz && quiz.questions && quiz.questions.length > 0) {
        return (
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-xs font-medium" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                🎮 تم إنشاء اختبار تفاعلي - أجب على الأسئلة أدناه
              </p>
            </div>
            <InteractiveQuiz quiz={quiz} msgIndex={index} />
          </div>
        );
      }

      // Regular markdown response
      return (
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown
            components={{
              p: ({ children }) => (
                <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
              ),
              strong: ({ children }) => (
                <strong className="font-bold" style={{ color: '#1a3a5c' }}>
                  {children}
                </strong>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pr-5 mb-2 space-y-1">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pr-5 mb-2 space-y-1">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="text-sm leading-relaxed">{children}</li>
              ),
              h1: ({ children }) => (
                <h1
                  className="text-base font-bold mb-2"
                  style={{ color: '#1a3a5c' }}
                >
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2
                  className="text-sm font-bold mb-2"
                  style={{ color: '#1a3a5c' }}
                >
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-sm font-bold mb-1">{children}</h3>
              ),
              blockquote: ({ children }) => (
                <blockquote
                  className="pr-3 border-r-2 italic my-2"
                  style={{
                    borderColor: '#c9a84c',
                    color: 'var(--text-secondary, #475569)',
                  }}
                >
                  {children}
                </blockquote>
              ),
              code: ({ children }) => (
                <code
                  className="px-1.5 py-0.5 rounded text-xs"
                  style={{
                    background: 'var(--bg-page, #f1f5f9)',
                    color: '#1a3a5c',
                  }}
                >
                  {children}
                </code>
              ),
              hr: () => (
                <hr
                  className="my-3"
                  style={{ borderColor: 'rgba(0,0,0,0.08)' }}
                />
              ),
            }}
          >
            {msg.content}
          </ReactMarkdown>
        </div>
      );
    }

    // User message - plain text
    return <span className="whitespace-pre-wrap">{msg.content}</span>;
  };

  return (
    <div
      className="flex flex-col w-full max-w-2xl mx-auto"
      style={{
        height: 'calc(100vh - 180px)',
        minHeight: '500px',
        maxHeight: '800px',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-t-2xl flex-shrink-0"
        style={{
          background: 'linear-gradient(135deg, #0f2540 0%, #1a3a5c 50%, #2d5a8a 100%)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(201, 168, 76, 0.2)',
              border: '2px solid rgba(201, 168, 76, 0.4)',
            }}
          >
            <span className="text-xl">⚖️</span>
          </div>
          <div>
            <h2 className="text-white font-bold text-base leading-tight">
              المساعد الذكي
            </h2>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
              الشامل ⚖️ - خبير القانون الجزائري
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
              style={{
                background: 'rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.8)',
                border: '1px solid rgba(255,255,255,0.15)',
                backdropFilter: 'blur(8px)',
              }}
              title="مسح المحادثة"
            >
              <span>🗑️</span>
              <span>مسح</span>
            </button>
          )}
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-full"
            style={{
              background: 'rgba(34, 197, 94, 0.2)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
            }}
          >
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-300 font-medium">متصل</span>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
        style={{
          background: 'var(--bg-page, #f1f5f9)',
        }}
      >
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 overflow-y-auto">
            {/* Welcome illustration */}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-2 animate-bounce-in flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #1a3a5c, #2d5986)',
                boxShadow: '0 8px 32px rgba(26, 58, 92, 0.3)',
              }}
            >
              <span className="text-4xl">🤖</span>
            </div>
            <h3
              className="text-lg font-bold text-center flex-shrink-0"
              style={{ color: 'var(--navy, #1a3a5c)' }}
            >
              مرحباً بك في المساعد الذكي ⚖️
            </h3>
            <p
              className="text-sm text-center max-w-xs leading-relaxed flex-shrink-0"
              style={{ color: 'var(--text-secondary, #475569)' }}
            >
              مساعدك القانوني الشامل المتخصص في القانون الجزائري. اسألني أي سؤال أو اختبر معلوماتك القانونية!
            </p>

            {/* Quick Questions & Quiz */}
            {showQuickQuestions && (
              <div className="w-full max-w-md mt-2 space-y-3 flex-shrink-0">
                {/* Comprehensive Quiz Button */}
                <div className="space-y-2">
                  <p
                    className="text-xs font-bold text-center mb-2"
                    style={{ color: '#c9a84c' }}
                  >
                    🎮 كويز شامل بالذكاء الاصطناعي
                  </p>
                  <button
                    onClick={() => handleQuizPrompt(COMPREHENSIVE_QUIZ_PROMPT)}
                    className="w-full text-right px-4 py-3.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] animate-slide-up"
                    style={{
                      background: 'linear-gradient(135deg, #c9a84c, #f0c040)',
                      color: '#0f2540',
                      border: '2px solid rgba(201, 168, 76, 0.5)',
                      boxShadow: '0 4px 16px rgba(201, 168, 76, 0.3)',
                    }}
                  >
                    🎮 كويز شامل - أسئلة من مختلف القوانين الجزائرية
                  </button>
                </div>

                {/* Quiz Section - All 7 Laws */}
                <div className="space-y-2">
                  <p
                    className="text-xs font-bold text-center mb-2"
                    style={{ color: '#c9a84c' }}
                  >
                    📝 اختبارات قانونية متخصصة
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {QUIZ_PROMPTS.map((quiz, index) => (
                      <button
                        key={`quiz-${index}`}
                        onClick={() => handleQuizPrompt(quiz.prompt)}
                        className="text-right px-3 py-2.5 rounded-xl text-xs font-medium transition-all hover:scale-[1.02] active:scale-[0.98] animate-slide-up"
                        style={{
                          background: 'linear-gradient(135deg, rgba(201,168,76,0.08), rgba(201,168,76,0.15))',
                          color: 'var(--text-primary, #0f172a)',
                          border: '1.5px solid rgba(201, 168, 76, 0.3)',
                          boxShadow: '0 1px 3px rgba(201, 168, 76, 0.1)',
                          animationDelay: `${index * 60}ms`,
                          animationFillMode: 'both',
                        }}
                      >
                        {quiz.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Regular Questions Section */}
                <div className="space-y-2">
                  <p
                    className="text-xs font-semibold text-center mb-2"
                    style={{ color: 'var(--text-muted, #94a3b8)' }}
                  >
                    💡 أسئلة مقترحة
                  </p>
                  {QUICK_QUESTIONS.map((question, index) => (
                    <button
                      key={`q-${index}`}
                      onClick={() => handleQuickQuestion(question)}
                      className="w-full text-right px-4 py-3 rounded-xl text-sm transition-all hover:scale-[1.02] active:scale-[0.98] animate-slide-up"
                      style={{
                        background: 'var(--bg-card, #ffffff)',
                        color: 'var(--text-primary, #0f172a)',
                        border: '1px solid rgba(0,0,0,0.06)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        animationDelay: `${(index + QUIZ_PROMPTS.length) * 60}ms`,
                        animationFillMode: 'both',
                      }}
                    >
                      <span className="inline-block ml-2">📌</span>
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <p
              className="text-[10px] text-center mt-2 max-w-xs flex-shrink-0"
              style={{ color: 'var(--text-muted, #94a3b8)' }}
            >
              ⚠️ الإجابات المقدمة هي إرشادات عامة ولا تُغني عن استشارة محامٍ مختص
            </p>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 mb-4 animate-slide-up ${
              msg.role === 'user' ? 'flex-row-reverse' : ''
            }`}
            style={{ animationDelay: '0ms', animationFillMode: 'both' }}
          >
            {/* Avatar */}
            {msg.role === 'assistant' ? (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                style={{
                  background: 'linear-gradient(135deg, #1a3a5c, #2d5986)',
                  boxShadow: '0 2px 8px rgba(26, 58, 92, 0.2)',
                }}
              >
                ⚖️
              </div>
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                style={{
                  background: 'linear-gradient(135deg, #c9a84c, #f0c040)',
                  boxShadow: '0 2px 8px rgba(201, 168, 76, 0.3)',
                }}
              >
                👤
              </div>
            )}

            {/* Message bubble */}
            <div className="flex flex-col gap-1 max-w-[85%] min-w-0">
              <div
                className="px-4 py-3 text-sm leading-relaxed break-words"
                style={{
                  borderRadius:
                    msg.role === 'user'
                      ? '16px 16px 4px 16px'
                      : '16px 16px 16px 4px',
                  background:
                    msg.role === 'user'
                      ? 'linear-gradient(135deg, #1a3a5c, #2d5986)'
                      : 'var(--bg-card, #ffffff)',
                  color:
                    msg.role === 'user'
                      ? '#ffffff'
                      : 'var(--text-primary, #0f172a)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  border:
                    msg.role === 'assistant'
                      ? '1px solid rgba(0,0,0,0.04)'
                      : 'none',
                }}
                dir="rtl"
              >
                {renderMessageContent(msg, index)}
              </div>
              {/* Timestamp */}
              <span
                className={`text-[10px] ${
                  msg.role === 'user' ? 'text-left' : 'text-right'
                }`}
                style={{ color: 'var(--text-muted, #94a3b8)' }}
              >
                {formatTime(msg.timestamp)}
              </span>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions bar (when in conversation) */}
      {messages.length > 0 && !isLoading && (
        <div
          className="flex-shrink-0 px-4 py-2 overflow-x-auto"
          style={{
            background: 'var(--bg-card, #ffffff)',
            borderTop: '1px solid rgba(0,0,0,0.04)',
          }}
        >
          <div className="flex gap-2 min-w-max">
            {/* Comprehensive quiz shortcut */}
            <button
              onClick={() => handleQuizPrompt(COMPREHENSIVE_QUIZ_PROMPT)}
              className="px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #c9a84c, #f0c040)',
                color: '#0f2540',
                border: '1.5px solid rgba(201, 168, 76, 0.5)',
              }}
            >
              🎮 كويز شامل
            </button>
            {/* Quiz shortcuts in conversation bar */}
            {QUIZ_PROMPTS.slice(0, 3).map((quiz, index) => (
              <button
                key={`conv-quiz-${index}`}
                onClick={() => handleQuizPrompt(quiz.prompt)}
                className="px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.18))',
                  color: '#1a3a5c',
                  border: '1.5px solid rgba(201, 168, 76, 0.35)',
                }}
              >
                {quiz.label}
              </button>
            ))}
            <span className="px-1.5 py-0.5 text-[10px] self-center" style={{ color: 'var(--text-muted, #94a3b8)' }}>|</span>
            {QUICK_QUESTIONS.slice(0, 3).map((question, index) => (
              <button
                key={`conv-q-${index}`}
                onClick={() => handleQuickQuestion(question)}
                className="px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, rgba(201,168,76,0.1), rgba(201,168,76,0.15))',
                  color: '#1a3a5c',
                  border: '1px solid rgba(201, 168, 76, 0.25)',
                }}
              >
                💬 {question.length > 25 ? question.slice(0, 25) + '...' : question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div
        className="flex-shrink-0 px-3 py-3"
        style={{
          background: 'var(--bg-card, #ffffff)',
          borderTop: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.04)',
        }}
      >
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="اكتب سؤالك القانوني هنا... أو اطلب كويز!"
              disabled={isLoading}
              rows={1}
              dir="rtl"
              className="w-full px-4 py-3 text-sm rounded-2xl resize-none outline-none transition-all"
              style={{
                background: 'var(--bg-page, #f1f5f9)',
                color: 'var(--text-primary, #0f172a)',
                border: '2px solid transparent',
                maxHeight: '120px',
                minHeight: '44px',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#c9a84c';
                e.target.style.boxShadow =
                  '0 0 0 3px rgba(201, 168, 76, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'transparent';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          <button
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isLoading}
            className="flex items-center justify-center w-11 h-11 rounded-2xl transition-all duration-200 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: isLoading
                ? '#94a3b8'
                : 'linear-gradient(135deg, #c9a84c, #f0c040)',
              boxShadow: isLoading
                ? 'none'
                : '0 4px 12px rgba(201, 168, 76, 0.4)',
              transform:
                inputValue.trim() && !isLoading ? 'scale(1.05)' : 'scale(1)',
            }}
            title="إرسال"
          >
            {isLoading ? (
              <svg
                className="w-5 h-5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="white"
                  strokeWidth="3"
                  strokeDasharray="31.4 31.4"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 rotate-180"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
        <p
          className="text-[10px] text-center mt-2"
          style={{ color: 'var(--text-muted, #94a3b8)' }}
        >
          اضغط Enter للإرسال • Shift+Enter لسطر جديد
        </p>
      </div>
    </div>
  );
}
