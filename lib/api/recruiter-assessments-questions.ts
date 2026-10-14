/**
 * Question-bank helpers scoped to a test draft.
 *
 * There is no top-level GET /assessments/questions. Questions live under
 * GET /assessments/tests/{testId} → openDraft.questions.
 *
 * BFF note: resolveBffUrl("/api/recruiter/...") → "/api/bff/api/recruiter/..."
 * is intentional (bridge prefix + backend path), not a double-prefix bug.
 */

import type { ApiClientError } from "@/lib/api"
import {
  createAssessmentQuestion,
  getAssessmentTestDetail,
  listAssessmentTests,
  openAssessmentTestDraft,
  updateAssessmentQuestion,
  type AssessmentQuestionView,
  type AssessmentTestView,
} from "@/lib/api/recruiter-assessments-tests"
import type { MockQuestion, QuestionKind } from "@/lib/pruebas/types"

export type AssessmentQuestionBankView = AssessmentQuestionView

export interface AssessmentQuestionsForTestResult {
  test: AssessmentTestView
  questions: AssessmentQuestionBankView[]
  hasOpenDraft: boolean
}

export function getAssessmentQuestionHttpStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null
  if (!("status" in error)) return null
  const status = (error as ApiClientError).status
  return typeof status === "number" ? status : null
}

function notFoundError(): ApiClientError {
  const err = new Error("not_found") as ApiClientError
  err.status = 404
  err.body = { message: "not_found" }
  return err
}

export async function listAssessmentTestsForBank(): Promise<
  AssessmentTestView[]
> {
  return listAssessmentTests({ page: 1, pageSize: 100 })
}

/**
 * Loads questions for a test. Opens a draft version when the test has none.
 */
export async function listQuestionsForTest(
  testId: string,
): Promise<AssessmentQuestionsForTestResult> {
  let detail = await getAssessmentTestDetail(testId)
  if (!detail.openDraft) {
    detail = await openAssessmentTestDraft(testId)
  }
  return {
    test: detail.test,
    questions: detail.currentQuestions,
    hasOpenDraft: Boolean(detail.openDraft),
  }
}

export async function getQuestionForTest(
  testId: string,
  questionId: string,
): Promise<AssessmentQuestionBankView> {
  const { questions } = await listQuestionsForTest(testId)
  const match = questions.find((question) => question.id === questionId)
  if (!match) {
    throw notFoundError()
  }
  return match
}

export async function createQuestionForTest(
  testId: string,
  question: MockQuestion,
): Promise<AssessmentQuestionBankView> {
  // Ensure a draft exists before mutating.
  await listQuestionsForTest(testId)
  return createAssessmentQuestion(testId, question)
}

export async function updateQuestionForTest(
  testId: string,
  questionId: string,
  question: MockQuestion,
): Promise<AssessmentQuestionBankView> {
  await listQuestionsForTest(testId)
  return updateAssessmentQuestion(testId, questionId, question)
}

export function filterQuestionsLocally(
  questions: readonly AssessmentQuestionBankView[],
  filters: { query: string; kind: QuestionKind | null },
): AssessmentQuestionBankView[] {
  const query = filters.query.trim().toLowerCase()
  return questions
    .filter((question) => {
      if (filters.kind && question.kind !== filters.kind) return false
      if (query && !question.prompt.toLowerCase().includes(query)) return false
      return true
    })
    .slice()
    .sort((a, b) => a.prompt.localeCompare(b.prompt, undefined, { sensitivity: "base" }))
}

export function paginateQuestionsLocally<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): T[] {
  const safePage = Math.max(1, page)
  const safeSize = Math.max(1, pageSize)
  const start = (safePage - 1) * safeSize
  return items.slice(start, start + safeSize)
}
