import { useState, useCallback } from "react"
import { QUIZ_QUESTIONS, QuizQuestion } from "../../data/quiz"

export type QuizMode = "all" | "qij" | "qima"
export type QuizDifficulty = "all" | "easy" | "medium" | "hard"

export type QuizState = "idle" | "playing" | "answered" | "finished"

export function useQuiz() {
  const [mode, setMode] = useState<QuizMode>("all")
  const [difficulty, setDifficulty] = useState<QuizDifficulty>("all")
  const [state, setState] = useState<QuizState>("idle")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState<boolean[]>([])
  const [questions, setQuestions] = useState<QuizQuestion[]>([])

  // فلترة وخلط الأسئلة
  const startQuiz = useCallback(() => {
    let filtered = [...QUIZ_QUESTIONS]

    if (mode !== "all") {
      filtered = filtered.filter(q => q.law === mode)
    }

    if (difficulty !== "all") {
      filtered = filtered.filter(q => q.difficulty === difficulty)
    }

    // خلط عشوائي للأسئلة
    const shuffled = [...filtered].sort(() => Math.random() - 0.5)

    // خلط الخيارات لكل سؤال
    const questionsWithShuffledOptions = shuffled.map(q => {
      const optionsWithIndices = q.options.map((opt, idx) => ({
        option: opt,
        originalIndex: idx
      }))

      const shuffledOptions = [...optionsWithIndices].sort(() => Math.random() - 0.5)

      const newCorrectIndex = shuffledOptions.findIndex(
        item => item.originalIndex === q.correct
      )

      return {
        ...q,
        options: shuffledOptions.map(item => item.option),
        correct: newCorrectIndex
      }
    })

    // أخذ 20 سؤال كحد أقصى
    const selected = questionsWithShuffledOptions.slice(0, Math.min(20, questionsWithShuffledOptions.length))

    setQuestions(selected)
    setCurrentIndex(0)
    setScore(0)
    setAnswers([])
    setSelectedAnswer(null)
    setState("playing")
  }, [mode, difficulty])

  const answerQuestion = useCallback((index: number) => {
    if (state !== "playing") return

    setSelectedAnswer(index)
    const isCorrect = index === questions[currentIndex].correct

    if (isCorrect) {
      setScore(s => s + 1)
    }

    setAnswers(prev => [...prev, isCorrect])
    setState("answered")
  }, [state, questions, currentIndex])

  const nextQuestion = useCallback(() => {
    if (currentIndex + 1 >= questions.length) {
      setState("finished")
    } else {
      setCurrentIndex(i => i + 1)
      setSelectedAnswer(null)
      setState("playing")
    }
  }, [currentIndex, questions.length])

  const reset = useCallback(() => {
    setState("idle")
    setCurrentIndex(0)
    setScore(0)
    setAnswers([])
    setSelectedAnswer(null)
    setQuestions([])
  }, [])

  const currentQuestion = questions[currentIndex]

  const progress = questions.length > 0
    ? ((currentIndex + 1) / questions.length) * 100
    : 0

  const scorePercent = answers.length > 0
    ? Math.round((score / answers.length) * 100)
    : 0

  return {
    mode,
    setMode,
    difficulty,
    setDifficulty,
    state,
    currentQuestion,
    currentIndex,
    questions,
    selectedAnswer,
    score,
    answers,
    progress,
    scorePercent,
    startQuiz,
    answerQuestion,
    nextQuestion,
    reset,
  }
}
