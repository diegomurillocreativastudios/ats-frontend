/** Pure helpers for the evaluation create/edit wizard (UI demo). */

import type {
  AssessmentKind,
  MockAssessmentVersion,
  MockQuestion,
  QuestionKind,
} from "@/lib/pruebas/types"

export const EDITOR_STEPS = [
  "info",
  "config",
  "questions",
  "preview",
  "publish",
] as const

export type EditorStepId = (typeof EDITOR_STEPS)[number]

export const TITLE_MAX = 120
export const DESCRIPTION_MAX = 500
export const DURATION_MIN = 1
export const DURATION_MAX = 240
export const ATTEMPTS_MIN = 1
export const ATTEMPTS_MAX = 5
export const DEMO_EXPIRY_DAYS = 14

export const TECHNICAL_QUESTION_KINDS: readonly QuestionKind[] = [
  "single_choice",
  "multiple_choice",
  "true_false",
  "numeric",
  "open",
] as const

export const PSYCHOMETRIC_QUESTION_KINDS: readonly QuestionKind[] = [
  "likert",
] as const

export interface EvaluationEditorForm {
  title: string
  description: string
  kind: AssessmentKind
  instructions: string
  durationMinutes: number
  maxAttempts: number
  questionIds: string[]
}

export type EditorFieldErrorKey =
  | "titleRequired"
  | "titleTooLong"
  | "descriptionRequired"
  | "descriptionTooLong"
  | "kindRequired"
  | "instructionsRequired"
  | "durationInvalid"
  | "attemptsInvalid"
  | "questionsRequired"
  | "questionsIncompatible"

export type StepFieldErrors = Partial<Record<EditorFieldErrorKey, true>>

export function emptyEditorForm(
  kind: AssessmentKind = "technical",
): EvaluationEditorForm {
  return {
    title: "",
    description: "",
    kind,
    instructions: "",
    durationMinutes: 45,
    maxAttempts: 1,
    questionIds: [],
  }
}

export function questionKindsForAssessment(
  kind: AssessmentKind,
): readonly QuestionKind[] {
  return kind === "technical"
    ? TECHNICAL_QUESTION_KINDS
    : PSYCHOMETRIC_QUESTION_KINDS
}

export function isQuestionCompatible(
  assessmentKind: AssessmentKind,
  questionKind: QuestionKind,
): boolean {
  return questionKindsForAssessment(assessmentKind).includes(questionKind)
}

export function filterCompatibleQuestions(
  assessmentKind: AssessmentKind,
  questions: readonly MockQuestion[],
): MockQuestion[] {
  return questions.filter((question) =>
    isQuestionCompatible(assessmentKind, question.kind),
  )
}

export function incompatibleQuestionIds(
  assessmentKind: AssessmentKind,
  questionIds: readonly string[],
  questions: readonly MockQuestion[],
): string[] {
  const byId = new Map(questions.map((question) => [question.id, question]))
  return questionIds.filter((id) => {
    const question = byId.get(id)
    if (!question) return true
    return !isQuestionCompatible(assessmentKind, question.kind)
  })
}

export function validateInfoStep(
  form: Pick<EvaluationEditorForm, "title" | "description" | "kind">,
): StepFieldErrors {
  const errors: StepFieldErrors = {}
  const title = form.title.trim()
  const description = form.description.trim()
  if (!title) errors.titleRequired = true
  else if (title.length > TITLE_MAX) errors.titleTooLong = true
  if (!description) errors.descriptionRequired = true
  else if (description.length > DESCRIPTION_MAX) {
    errors.descriptionTooLong = true
  }
  if (form.kind !== "technical" && form.kind !== "psychometric") {
    errors.kindRequired = true
  }
  return errors
}

export function validateConfigStep(
  form: Pick<
    EvaluationEditorForm,
    "instructions" | "durationMinutes" | "maxAttempts"
  >,
): StepFieldErrors {
  const errors: StepFieldErrors = {}
  if (!form.instructions.trim()) errors.instructionsRequired = true
  if (
    !Number.isInteger(form.durationMinutes) ||
    form.durationMinutes < DURATION_MIN ||
    form.durationMinutes > DURATION_MAX
  ) {
    errors.durationInvalid = true
  }
  if (
    !Number.isInteger(form.maxAttempts) ||
    form.maxAttempts < ATTEMPTS_MIN ||
    form.maxAttempts > ATTEMPTS_MAX
  ) {
    errors.attemptsInvalid = true
  }
  return errors
}

export function validateQuestionsStep(
  form: Pick<EvaluationEditorForm, "kind" | "questionIds">,
  questions: readonly MockQuestion[],
): StepFieldErrors {
  const errors: StepFieldErrors = {}
  if (form.questionIds.length < 1) {
    errors.questionsRequired = true
    return errors
  }
  if (
    incompatibleQuestionIds(form.kind, form.questionIds, questions).length > 0
  ) {
    errors.questionsIncompatible = true
  }
  return errors
}

export function validateStep(
  step: EditorStepId,
  form: EvaluationEditorForm,
  questions: readonly MockQuestion[],
): StepFieldErrors {
  switch (step) {
    case "info":
      return validateInfoStep(form)
    case "config":
      return validateConfigStep(form)
    case "questions":
      return validateQuestionsStep(form, questions)
    case "preview":
    case "publish":
      return {
        ...validateInfoStep(form),
        ...validateConfigStep(form),
        ...validateQuestionsStep(form, questions),
      }
  }
}

export function isStepValid(
  step: EditorStepId,
  form: EvaluationEditorForm,
  questions: readonly MockQuestion[],
): boolean {
  return Object.keys(validateStep(step, form, questions)).length === 0
}

export function nextPublishedVersionNumber(
  versions: readonly MockAssessmentVersion[],
  testId: string,
): number {
  const published = versions.filter(
    (version) => version.testId === testId && version.publishedAt,
  )
  if (published.length === 0) return 1
  return Math.max(...published.map((version) => version.versionNumber)) + 1
}

export function totalTechnicalPoints(
  questions: readonly MockQuestion[],
): number {
  return questions.reduce((sum, question) => {
    switch (question.kind) {
      case "single_choice":
      case "multiple_choice":
      case "true_false":
      case "numeric":
        return sum + question.points
      case "open":
        return sum + question.maxPoints
      case "likert":
        return sum
    }
  }, 0)
}

export function uniqueDimensions(
  questions: readonly MockQuestion[],
): string[] {
  const dims = new Set<string>()
  for (const question of questions) {
    if (question.kind === "likert") dims.add(question.dimension)
  }
  return [...dims]
}

export function reorderQuestionIds(
  questionIds: readonly string[],
  index: number,
  direction: "up" | "down",
): string[] {
  const next = [...questionIds]
  const target = direction === "up" ? index - 1 : index + 1
  if (index < 0 || index >= next.length) return next
  if (target < 0 || target >= next.length) return next
  const current = next[index]!
  next[index] = next[target]!
  next[target] = current
  return next
}

export function attachQuestionId(
  questionIds: readonly string[],
  questionId: string,
): string[] {
  if (questionIds.includes(questionId)) return [...questionIds]
  return [...questionIds, questionId]
}

export function removeQuestionId(
  questionIds: readonly string[],
  questionId: string,
): string[] {
  return questionIds.filter((id) => id !== questionId)
}

export function formsEqual(
  a: EvaluationEditorForm,
  b: EvaluationEditorForm,
): boolean {
  return (
    a.title === b.title &&
    a.description === b.description &&
    a.kind === b.kind &&
    a.instructions === b.instructions &&
    a.durationMinutes === b.durationMinutes &&
    a.maxAttempts === b.maxAttempts &&
    a.questionIds.length === b.questionIds.length &&
    a.questionIds.every((id, index) => id === b.questionIds[index])
  )
}
