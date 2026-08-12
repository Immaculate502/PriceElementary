import type { LessonAnswer, LessonQuestion, LessonScore } from "./types"

/** The most a leader can add to one multiple-choice question. */
export const MAX_OPTIONS = 8
/** A choice question is meaningless with fewer than two options. */
export const MIN_OPTIONS = 2

/**
 * True when the member has actually supplied this answer. Used for the
 * "answer every question" rule, so it must agree on the client and the server.
 */
export function isAnswered(
  question: Pick<LessonQuestion, "kind">,
  answer: { answer?: string; selectedOption?: number | null } | undefined,
): boolean {
  if (!answer) return false
  if (question.kind === "choice") {
    return typeof answer.selectedOption === "number" && answer.selectedOption >= 0
  }
  return (answer.answer ?? "").trim().length > 0
}

/**
 * Grades only the multiple-choice questions. Open-ended answers are judged by a
 * leader, so they are deliberately excluded from the tally.
 */
export function gradeResponse(
  questions: Pick<LessonQuestion, "id" | "kind" | "correctOption">[],
  answers: Pick<LessonAnswer, "questionId" | "selectedOption">[],
): LessonScore {
  const chosen = new Map(answers.map((a) => [a.questionId, a.selectedOption]))
  let correct = 0
  let total = 0

  for (const question of questions) {
    if (question.kind !== "choice" || question.correctOption === null) continue
    total += 1
    if (chosen.get(question.id) === question.correctOption) correct += 1
  }

  return { correct, total }
}

/** Was this specific choice answer correct? Null when it cannot be graded. */
export function isCorrect(
  question: Pick<LessonQuestion, "kind" | "correctOption">,
  answer: Pick<LessonAnswer, "selectedOption"> | undefined,
): boolean | null {
  if (question.kind !== "choice" || question.correctOption === null) return null
  if (!answer || typeof answer.selectedOption !== "number") return null
  return answer.selectedOption === question.correctOption
}
