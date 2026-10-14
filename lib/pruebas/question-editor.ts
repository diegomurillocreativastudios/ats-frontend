/** Pure helpers for the question bank create/edit forms (UI demo). */

import type {
  MockLikertQuestion,
  MockMultipleChoiceQuestion,
  MockNumericQuestion,
  MockOpenQuestion,
  MockQuestion,
  MockQuestionOption,
  MockSingleChoiceQuestion,
  MockTrueFalseQuestion,
  QuestionKind,
} from "@/lib/pruebas/types"

export const QUESTION_KINDS: readonly QuestionKind[] = [
  "single_choice",
  "multiple_choice",
  "true_false",
  "likert",
  "numeric",
  "open",
] as const

export const PROMPT_MAX = 500
export const POINTS_MIN = 1
export const POINTS_MAX = 100
export const OPTIONS_MIN = 2
export const LIKERT_SCALE_MIN = 1
export const LIKERT_SCALE_MAX = 5

export type QuestionFieldErrorKey =
  | "promptRequired"
  | "promptTooLong"
  | "optionsMin"
  | "optionLabelRequired"
  | "correctOptionRequired"
  | "correctOptionsRequired"
  | "pointsRange"
  | "dimensionRequired"
  | "expectedRequired"
  | "toleranceRange"
  | "rubricRequired"

export type QuestionFieldErrors = Partial<Record<QuestionFieldErrorKey, true>>

function blankOptions(prefix: string): MockQuestionOption[] {
  return [
    { id: `${prefix}-a`, label: "" },
    { id: `${prefix}-b`, label: "" },
  ]
}

/** Blank form for a kind; prompt is preserved when switching types. */
export function blankQuestion(
  kind: "single_choice",
  prompt?: string,
  idPrefix?: string,
): MockSingleChoiceQuestion
export function blankQuestion(
  kind: "multiple_choice",
  prompt?: string,
  idPrefix?: string,
): MockMultipleChoiceQuestion
export function blankQuestion(
  kind: "true_false",
  prompt?: string,
  idPrefix?: string,
): MockTrueFalseQuestion
export function blankQuestion(
  kind: "likert",
  prompt?: string,
  idPrefix?: string,
): MockLikertQuestion
export function blankQuestion(
  kind: "numeric",
  prompt?: string,
  idPrefix?: string,
): MockNumericQuestion
export function blankQuestion(
  kind: "open",
  prompt?: string,
  idPrefix?: string,
): MockOpenQuestion
export function blankQuestion(
  kind: QuestionKind,
  prompt?: string,
  idPrefix?: string,
): MockQuestion
export function blankQuestion(
  kind: QuestionKind,
  prompt = "",
  idPrefix = "draft",
): MockQuestion {
  const trimmedPrompt = prompt
  switch (kind) {
    case "single_choice":
      return {
        id: idPrefix,
        kind: "single_choice",
        prompt: trimmedPrompt,
        options: blankOptions(idPrefix),
        correctOptionId: `${idPrefix}-a`,
        points: 1,
      }
    case "multiple_choice":
      return {
        id: idPrefix,
        kind: "multiple_choice",
        prompt: trimmedPrompt,
        options: blankOptions(idPrefix),
        correctOptionIds: [`${idPrefix}-a`],
        points: 1,
      }
    case "true_false":
      return {
        id: idPrefix,
        kind: "true_false",
        prompt: trimmedPrompt,
        correct: true,
        points: 1,
      }
    case "likert":
      return {
        id: idPrefix,
        kind: "likert",
        prompt: trimmedPrompt,
        scaleMin: LIKERT_SCALE_MIN,
        scaleMax: LIKERT_SCALE_MAX,
        dimension: "",
        reversed: false,
      }
    case "numeric":
      return {
        id: idPrefix,
        kind: "numeric",
        prompt: trimmedPrompt,
        expected: 0,
        tolerance: 0,
        points: 1,
      }
    case "open":
      return {
        id: idPrefix,
        kind: "open",
        prompt: trimmedPrompt,
        rubric: "",
        maxPoints: 5,
      }
  }
}

export function switchQuestionKind(
  current: MockQuestion,
  nextKind: QuestionKind,
): MockQuestion {
  if (current.kind === nextKind) return current
  return blankQuestion(nextKind, current.prompt, current.id)
}

function isPointsInRange(value: number): boolean {
  return (
    Number.isInteger(value) && value >= POINTS_MIN && value <= POINTS_MAX
  )
}

export function validateQuestion(question: MockQuestion): QuestionFieldErrors {
  const errors: QuestionFieldErrors = {}
  const prompt = question.prompt.trim()
  if (!prompt) {
    errors.promptRequired = true
  } else if (prompt.length > PROMPT_MAX) {
    errors.promptTooLong = true
  }

  switch (question.kind) {
    case "single_choice": {
      if (question.options.length < OPTIONS_MIN) {
        errors.optionsMin = true
      }
      if (question.options.some((option) => !option.label.trim())) {
        errors.optionLabelRequired = true
      }
      const ids = new Set(question.options.map((option) => option.id))
      if (!question.correctOptionId || !ids.has(question.correctOptionId)) {
        errors.correctOptionRequired = true
      }
      if (!isPointsInRange(question.points)) {
        errors.pointsRange = true
      }
      break
    }
    case "multiple_choice": {
      if (question.options.length < OPTIONS_MIN) {
        errors.optionsMin = true
      }
      if (question.options.some((option) => !option.label.trim())) {
        errors.optionLabelRequired = true
      }
      const ids = new Set(question.options.map((option) => option.id))
      const correct = question.correctOptionIds.filter((id) => ids.has(id))
      if (correct.length < 1) {
        errors.correctOptionsRequired = true
      }
      if (!isPointsInRange(question.points)) {
        errors.pointsRange = true
      }
      break
    }
    case "true_false": {
      if (!isPointsInRange(question.points)) {
        errors.pointsRange = true
      }
      break
    }
    case "likert": {
      if (!question.dimension.trim()) {
        errors.dimensionRequired = true
      }
      break
    }
    case "numeric": {
      if (!Number.isFinite(question.expected)) {
        errors.expectedRequired = true
      }
      if (
        !Number.isFinite(question.tolerance) ||
        question.tolerance < 0
      ) {
        errors.toleranceRange = true
      }
      if (!isPointsInRange(question.points)) {
        errors.pointsRange = true
      }
      break
    }
    case "open": {
      if (!question.rubric.trim()) {
        errors.rubricRequired = true
      }
      if (!isPointsInRange(question.maxPoints)) {
        errors.pointsRange = true
      }
      break
    }
  }

  return errors
}

export function isQuestionValid(question: MockQuestion): boolean {
  return Object.keys(validateQuestion(question)).length === 0
}

/** Normalize for save: trim strings, drop empty trailing option labels after validation. */
export function normalizeQuestionForSave(question: MockQuestion): MockQuestion {
  const prompt = question.prompt.trim()
  switch (question.kind) {
    case "single_choice":
      return {
        ...question,
        prompt,
        options: question.options.map((option) => ({
          ...option,
          label: option.label.trim(),
        })),
        points: question.points,
      }
    case "multiple_choice":
      return {
        ...question,
        prompt,
        options: question.options.map((option) => ({
          ...option,
          label: option.label.trim(),
        })),
        correctOptionIds: [...question.correctOptionIds],
        points: question.points,
      }
    case "true_false":
      return { ...question, prompt }
    case "likert":
      return {
        ...question,
        prompt,
        dimension: question.dimension.trim(),
        scaleMin: LIKERT_SCALE_MIN,
        scaleMax: LIKERT_SCALE_MAX,
      }
    case "numeric":
      return { ...question, prompt }
    case "open":
      return {
        ...question,
        prompt,
        rubric: question.rubric.trim(),
      }
  }
}

export function questionsEqual(a: MockQuestion, b: MockQuestion): boolean {
  return JSON.stringify(normalizeQuestionForSave(a)) ===
    JSON.stringify(normalizeQuestionForSave(b))
}

export function moveOption(
  options: readonly MockQuestionOption[],
  index: number,
  direction: -1 | 1,
): MockQuestionOption[] {
  const next = [...options]
  const target = index + direction
  if (target < 0 || target >= next.length) return next
  const temp = next[index]!
  next[index] = next[target]!
  next[target] = temp
  return next
}

export function addOption(
  options: readonly MockQuestionOption[],
  idPrefix: string,
): MockQuestionOption[] {
  return [
    ...options,
    { id: `${idPrefix}-opt-${options.length + 1}`, label: "" },
  ]
}

export function removeOption(
  options: readonly MockQuestionOption[],
  optionId: string,
): MockQuestionOption[] {
  if (options.length <= OPTIONS_MIN) return [...options]
  return options.filter((option) => option.id !== optionId)
}

export interface QuestionListFilters {
  query: string
  kind: QuestionKind | null
}

export function filterQuestions(
  questions: readonly MockQuestion[],
  filters: QuestionListFilters,
): MockQuestion[] {
  const query = filters.query.trim().toLowerCase()
  return questions
    .filter((question) => {
      if (filters.kind && question.kind !== filters.kind) return false
      if (query && !question.prompt.toLowerCase().includes(query)) return false
      return true
    })
    .sort((a, b) => a.prompt.localeCompare(b.prompt))
}

export function paginateQuestions<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): T[] {
  const safePage = Math.max(1, page)
  const start = (safePage - 1) * pageSize
  return items.slice(start, start + pageSize)
}
