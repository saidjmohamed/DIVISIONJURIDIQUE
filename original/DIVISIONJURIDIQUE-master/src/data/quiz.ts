/**
 * Central quiz data module — bridges the QIJ question bank to the useQuiz hook.
 *
 * The useQuiz hook expects every question to have a `law` property so it can
 * filter by quiz mode ("all" | "qij" | "qima").  The raw QIJ question bank
 * does not include this field, so we augment each question here.
 */

import { QIJ_QUIZ_QUESTIONS } from "./quiz-qij-25-14"

/** Shape expected by useQuiz / LegalQuiz components. */
export interface QuizQuestion {
  law: "qij" | "qima"
  id: string
  question: string
  options: string[]
  correct: number
  article: string
  explanation: string
  difficulty: "easy" | "medium" | "hard"
  category: string
}

/** All quiz questions, with the `law` field already set. */
export const QUIZ_QUESTIONS: QuizQuestion[] = QIJ_QUIZ_QUESTIONS.map((q) => ({
  ...q,
  law: "qij" as const,
}))
