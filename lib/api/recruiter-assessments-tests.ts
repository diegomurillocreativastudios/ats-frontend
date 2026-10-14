import { apiClient, type ApiClientError } from "@/lib/api"
import { getApiErrorMessage } from "@/lib/api-error"
import type {
  AssessmentKind,
  AssessmentLifecycleStatus,
  MockAssessmentTest,
  MockAssessmentVersion,
  MockQuestion,
  MockQuestionOption,
  QuestionKind,
} from "@/lib/pruebas/types"

const TESTS_PATH = "/api/recruiter/assessments/tests"

export type AssessmentTestView = MockAssessmentTest
export type AssessmentVersionView = MockAssessmentVersion
export type AssessmentQuestionView = MockQuestion

export interface AssessmentTestDetailView {
  test: AssessmentTestView
  openDraft: AssessmentVersionView | null
  versions: AssessmentVersionView[]
  /** Questions for the current version (open draft or latest published). */
  currentQuestions: AssessmentQuestionView[]
}

export interface AssessmentVersionSnapshotView {
  version: AssessmentVersionView
  questions: AssessmentQuestionView[]
}

export interface AssessmentTestsListFilters {
  type?: AssessmentKind | null
  status?: AssessmentLifecycleStatus | null
  q?: string | null
  ownerCompanyId?: string | null
  page?: number | null
  pageSize?: number | null
}

export interface CreateAssessmentTestInput {
  title: string
  description: string
  kind: AssessmentKind
  ownerCompanyId?: string | null
}

export interface UpdateAssessmentTestInput {
  title?: string
  description?: string
  kind?: AssessmentKind
  ownerCompanyId?: string | null
  instructions?: string
  durationMinutes?: number
  maxAttempts?: number
}

const KIND_TO_API: Record<AssessmentKind, string> = {
  technical: "Technical",
  psychometric: "Psychometric",
}

const KIND_FROM_API: Record<string, AssessmentKind> = {
  Technical: "technical",
  Psychometric: "psychometric",
  technical: "technical",
  psychometric: "psychometric",
}

const STATUS_TO_API: Record<AssessmentLifecycleStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
}

const STATUS_FROM_API: Record<string, AssessmentLifecycleStatus> = {
  Draft: "draft",
  Published: "published",
  Archived: "archived",
  draft: "draft",
  published: "published",
  archived: "archived",
}

const QUESTION_KIND_TO_API: Record<QuestionKind, string> = {
  single_choice: "SingleChoice",
  multiple_choice: "MultipleChoice",
  true_false: "TrueFalse",
  likert: "Likert",
  numeric: "Numeric",
  open: "OpenText",
}

const QUESTION_KIND_FROM_API: Record<string, QuestionKind> = {
  SingleChoice: "single_choice",
  MultipleChoice: "multiple_choice",
  TrueFalse: "true_false",
  Likert: "likert",
  Numeric: "numeric",
  OpenText: "open",
  Open: "open",
  single_choice: "single_choice",
  multiple_choice: "multiple_choice",
  true_false: "true_false",
  likert: "likert",
  numeric: "numeric",
  open: "open",
}

const KNOWN_ERROR_CODES = new Set([
  "not_found",
  "not_draft",
  "not_published",
  "no_draft",
  "no_published_version",
  "test_archived",
  "questions_required",
  "questions_incompatible",
  "publish_integrity",
])

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function pickString(
  raw: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = raw[key]
    if (value != null && String(value).trim() !== "") {
      return String(value).trim()
    }
  }
  return null
}

function pickNumber(
  raw: Record<string, unknown>,
  keys: string[],
  fallback = 0,
): number {
  for (const key of keys) {
    const value = raw[key]
    if (typeof value === "number" && Number.isFinite(value)) {
      return value
    }
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return fallback
}

function pickBoolean(
  raw: Record<string, unknown>,
  keys: string[],
): boolean | null {
  for (const key of keys) {
    const value = raw[key]
    if (typeof value === "boolean") return value
  }
  return null
}

function testPath(testId: string, suffix = ""): string {
  return `${TESTS_PATH}/${encodeURIComponent(testId)}${suffix}`
}

export function buildAssessmentTestsQuery(
  filters: AssessmentTestsListFilters = {},
): string {
  const params = new URLSearchParams()
  if (filters.type) params.set("type", KIND_TO_API[filters.type])
  if (filters.status) params.set("status", STATUS_TO_API[filters.status])
  const q = filters.q?.trim()
  if (q) params.set("q", q)
  const owner = filters.ownerCompanyId?.trim()
  if (owner) params.set("ownerCompanyId", owner)
  if (filters.page != null && filters.page > 0) {
    params.set("page", String(filters.page))
  }
  if (filters.pageSize != null && filters.pageSize > 0) {
    params.set("pageSize", String(filters.pageSize))
  }
  const qs = params.toString()
  return qs === "" ? "" : `?${qs}`
}

export function getAssessmentApiErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null
  const body = "body" in error ? (error as ApiClientError).body : undefined
  const record = asRecord(body)
  if (!record) return null
  const code = pickString(record, ["code"])
  if (!code) return null
  const normalized = code.trim()
  if (KNOWN_ERROR_CODES.has(normalized)) return normalized
  // Accept PascalCase service codes mapped to snake_case UI keys
  const snake = normalized
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
    .toLowerCase()
  return KNOWN_ERROR_CODES.has(snake) ? snake : normalized
}

export function resolveAssessmentErrorMessage(
  error: unknown,
  t: (key: string) => string,
): string {
  const code = getAssessmentApiErrorCode(error)
  if (code && KNOWN_ERROR_CODES.has(code)) {
    return t(`errors.${code}`)
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as ApiClientError).status === 404
  ) {
    return t("errors.not_found")
  }
  return getApiErrorMessage(error)
}

function mapKind(raw: string | null): AssessmentKind {
  if (!raw) return "technical"
  return KIND_FROM_API[raw] ?? "technical"
}

function mapStatus(raw: string | null): AssessmentLifecycleStatus {
  if (!raw) return "draft"
  return STATUS_FROM_API[raw] ?? "draft"
}

function mapQuestionKind(raw: string | null): QuestionKind | null {
  if (!raw) return null
  return QUESTION_KIND_FROM_API[raw] ?? null
}

export function normalizeAssessmentTest(
  raw: unknown,
): AssessmentTestView | null {
  const record = asRecord(raw)
  if (!record) return null
  const id = pickString(record, ["id", "testId", "assessmentId"])
  if (!id) return null
  return {
    id,
    companyId:
      pickString(record, ["ownerCompanyId", "companyId", "clientId"]) ??
      undefined,
    title: pickString(record, ["title", "name"]) ?? "—",
    description: pickString(record, ["description"]) ?? "",
    kind: mapKind(pickString(record, ["type", "category", "kind"])),
    lifecycleStatus: mapStatus(pickString(record, ["status", "lifecycleStatus"])),
    draftVersion: Math.max(
      0,
      Math.floor(
        pickNumber(record, ["draftVersionNumber", "draftVersion", "version"], 0),
      ),
    ),
    createdAt:
      pickString(record, ["createdAtUtc", "createdAt"]) ??
      new Date(0).toISOString(),
  }
}

function mapOptions(raw: unknown): MockQuestionOption[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item, index) => {
      const record = asRecord(item)
      if (!record) return null
      const id =
        pickString(record, ["id", "optionId"]) ?? `opt-${index + 1}`
      const label = pickString(record, ["label", "text", "value"]) ?? ""
      return { id, label }
    })
    .filter((item): item is MockQuestionOption => item != null)
}

export function normalizeAssessmentQuestion(
  raw: unknown,
): AssessmentQuestionView | null {
  const record = asRecord(raw)
  if (!record) return null
  const id = pickString(record, ["id", "questionId"])
  if (!id) return null
  const kind = mapQuestionKind(
    pickString(record, ["type", "kind", "questionType"]),
  )
  if (!kind) return null
  const prompt = pickString(record, ["prompt", "text", "stem"]) ?? ""

  switch (kind) {
    case "single_choice": {
      const options = mapOptions(record.options)
      const correctOptionId =
        pickString(record, ["correctOptionId", "correctOption"]) ??
        options[0]?.id ??
        ""
      return {
        id,
        kind,
        prompt,
        options,
        correctOptionId,
        points: Math.max(0, pickNumber(record, ["points", "score"], 1)),
      }
    }
    case "multiple_choice": {
      const options = mapOptions(record.options)
      const correctRaw = record.correctOptionIds ?? record.correctOptions
      const correctOptionIds = Array.isArray(correctRaw)
        ? correctRaw.map((value) => String(value)).filter(Boolean)
        : []
      return {
        id,
        kind,
        prompt,
        options,
        correctOptionIds:
          correctOptionIds.length > 0
            ? correctOptionIds
            : options[0]
              ? [options[0].id]
              : [],
        points: Math.max(0, pickNumber(record, ["points", "score"], 1)),
      }
    }
    case "true_false": {
      const correct =
        pickBoolean(record, ["correct", "isCorrect", "expected"]) ?? true
      return {
        id,
        kind,
        prompt,
        correct,
        points: Math.max(0, pickNumber(record, ["points", "score"], 1)),
      }
    }
    case "likert": {
      return {
        id,
        kind,
        prompt,
        scaleMin: 1,
        scaleMax: 5,
        dimension: pickString(record, ["dimension", "trait"]) ?? "—",
        reversed: pickBoolean(record, ["reversed", "isReversed"]) ?? false,
      }
    }
    case "numeric": {
      return {
        id,
        kind,
        prompt,
        expected: pickNumber(record, ["expected", "expectedValue"], 0),
        tolerance: pickNumber(record, ["tolerance"], 0),
        points: Math.max(0, pickNumber(record, ["points", "score"], 1)),
      }
    }
    case "open": {
      return {
        id,
        kind,
        prompt,
        rubric: pickString(record, ["rubric", "scoringRubric"]) ?? "",
        maxPoints: Math.max(0, pickNumber(record, ["maxPoints", "points"], 1)),
      }
    }
  }
}

export function normalizeAssessmentVersion(
  raw: unknown,
  fallbackTestId?: string,
): AssessmentVersionView | null {
  const record = asRecord(raw)
  if (!record) return null
  const id = pickString(record, ["id", "versionId"])
  if (!id) return null
  const testId =
    pickString(record, ["testId", "assessmentId", "assessmentTestId"]) ??
    fallbackTestId ??
    ""
  const isPublished =
    pickBoolean(record, ["isPublished", "published"]) ??
    Boolean(pickString(record, ["publishedAtUtc", "publishedAt"]))
  const publishedAt = isPublished
    ? (pickString(record, ["publishedAtUtc", "publishedAt"]) ?? undefined)
    : undefined

  const questionsRaw = Array.isArray(record.questions) ? record.questions : []
  const questionIdsFromObjects = questionsRaw
    .map((item) => {
      const q = asRecord(item)
      return q ? pickString(q, ["id", "questionId"]) : null
    })
    .filter((value): value is string => Boolean(value))
  const questionIdsArray = Array.isArray(record.questionIds)
    ? record.questionIds.map((value) => String(value)).filter(Boolean)
    : []

  return {
    id,
    testId,
    versionNumber: Math.max(
      0,
      Math.floor(pickNumber(record, ["versionNumber", "number"], 0)),
    ),
    instructions: pickString(record, ["instructions"]) ?? "",
    durationMinutes: Math.max(
      1,
      Math.floor(pickNumber(record, ["durationMinutes", "duration"], 45)),
    ),
    maxAttempts: Math.max(
      1,
      Math.floor(pickNumber(record, ["maxAttempts", "allowedAttempts"], 1)),
    ),
    publishedAt,
    questionIds:
      questionIdsFromObjects.length > 0
        ? questionIdsFromObjects
        : questionIdsArray,
  }
}

function extractQuestionsFromVersion(raw: unknown): AssessmentQuestionView[] {
  const record = asRecord(raw)
  if (!record || !Array.isArray(record.questions)) return []
  return record.questions
    .map((item) => normalizeAssessmentQuestion(item))
    .filter((item): item is AssessmentQuestionView => item != null)
}

export function normalizeAssessmentTestDetail(
  raw: unknown,
): AssessmentTestDetailView | null {
  const root = asRecord(raw)
  if (!root) return null

  const nestedTest = asRecord(root.test) ?? asRecord(root.assessment)
  const test = normalizeAssessmentTest(nestedTest ?? root)
  if (!test) return null

  const openDraftRaw = root.openDraft ?? root.OpenDraft ?? null
  const openDraft = openDraftRaw
    ? normalizeAssessmentVersion(openDraftRaw, test.id)
    : null

  const versionsRaw = Array.isArray(root.versions)
    ? root.versions
    : Array.isArray(root.Versions)
      ? root.Versions
      : []
  const versions = versionsRaw
    .map((item) => normalizeAssessmentVersion(item, test.id))
    .filter((item): item is AssessmentVersionView => item != null)

  if (openDraft && !versions.some((version) => version.id === openDraft.id)) {
    versions.unshift(openDraft)
  }

  const current =
    openDraft ??
    [...versions]
      .filter((version) => version.publishedAt)
      .sort((a, b) => b.versionNumber - a.versionNumber)[0] ??
    null

  let currentQuestions: AssessmentQuestionView[] = []
  if (openDraftRaw) {
    currentQuestions = extractQuestionsFromVersion(openDraftRaw)
  }
  if (currentQuestions.length === 0 && current) {
    const matchingRaw = versionsRaw.find((item) => {
      const record = asRecord(item)
      return record && pickString(record, ["id", "versionId"]) === current.id
    })
    if (matchingRaw) {
      currentQuestions = extractQuestionsFromVersion(matchingRaw)
    }
  }
  if (currentQuestions.length === 0 && Array.isArray(root.questions)) {
    currentQuestions = root.questions
      .map((item) => normalizeAssessmentQuestion(item))
      .filter((item): item is AssessmentQuestionView => item != null)
  }

  if (current && currentQuestions.length > 0) {
    current.questionIds = currentQuestions.map((question) => question.id)
  }

  return {
    test,
    openDraft,
    versions,
    currentQuestions,
  }
}

export function normalizeAssessmentTestsList(
  raw: unknown,
): AssessmentTestView[] {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => normalizeAssessmentTest(item))
      .filter((item): item is AssessmentTestView => item != null)
  }
  const root = asRecord(raw)
  if (!root) return []
  const items = Array.isArray(root.items)
    ? root.items
    : Array.isArray(root.tests)
      ? root.tests
      : Array.isArray(root.data)
        ? root.data
        : []
  return items
    .map((item) => normalizeAssessmentTest(item))
    .filter((item): item is AssessmentTestView => item != null)
}

export function normalizeVersionSnapshot(
  raw: unknown,
  fallbackTestId?: string,
): AssessmentVersionSnapshotView | null {
  const version = normalizeAssessmentVersion(raw, fallbackTestId)
  if (!version) return null
  const questions = extractQuestionsFromVersion(raw)
  if (questions.length > 0) {
    version.questionIds = questions.map((question) => question.id)
  }
  return { version, questions }
}

function questionToApiBody(question: MockQuestion): Record<string, unknown> {
  const base = {
    type: QUESTION_KIND_TO_API[question.kind],
    prompt: question.prompt,
  }
  switch (question.kind) {
    case "single_choice":
      return {
        ...base,
        options: question.options.map((option) => ({
          id: option.id,
          label: option.label,
        })),
        correctOptionId: question.correctOptionId,
        points: question.points,
      }
    case "multiple_choice":
      return {
        ...base,
        options: question.options.map((option) => ({
          id: option.id,
          label: option.label,
        })),
        correctOptionIds: question.correctOptionIds,
        points: question.points,
      }
    case "true_false":
      return {
        ...base,
        correct: question.correct,
        points: question.points,
      }
    case "likert":
      return {
        ...base,
        scaleMin: question.scaleMin,
        scaleMax: question.scaleMax,
        dimension: question.dimension,
        reversed: question.reversed,
      }
    case "numeric":
      return {
        ...base,
        expected: question.expected,
        tolerance: question.tolerance,
        points: question.points,
      }
    case "open":
      return {
        ...base,
        rubric: question.rubric,
        maxPoints: question.maxPoints,
      }
  }
}

export function buildCompatibleQuestionDraft(
  kind: AssessmentKind,
): MockQuestion {
  if (kind === "psychometric") {
    return {
      id: "local-temp",
      kind: "likert",
      prompt: "Indica tu grado de acuerdo con el enunciado.",
      scaleMin: 1,
      scaleMax: 5,
      dimension: "Análisis",
      reversed: false,
    }
  }
  return {
    id: "local-temp",
    kind: "single_choice",
    prompt: "Selecciona la opción correcta.",
    options: [
      { id: "opt-a", label: "Opción A" },
      { id: "opt-b", label: "Opción B" },
    ],
    correctOptionId: "opt-a",
    points: 1,
  }
}

export async function listAssessmentTests(
  filters: AssessmentTestsListFilters = {},
): Promise<AssessmentTestView[]> {
  const query = buildAssessmentTestsQuery(filters)
  const raw = await apiClient.get(`${TESTS_PATH}${query}`)
  return normalizeAssessmentTestsList(raw)
}

export async function getAssessmentTestDetail(
  testId: string,
): Promise<AssessmentTestDetailView> {
  const raw = await apiClient.get(testPath(testId))
  const detail = normalizeAssessmentTestDetail(raw)
  if (!detail) {
    const err = new Error("not_found") as ApiClientError
    err.status = 404
    err.body = { message: "not_found", code: "not_found" }
    throw err
  }
  return detail
}

export async function createAssessmentTest(
  input: CreateAssessmentTestInput,
): Promise<AssessmentTestView> {
  const body: Record<string, unknown> = {
    title: input.title,
    description: input.description,
    type: KIND_TO_API[input.kind],
  }
  if (input.ownerCompanyId) {
    body.ownerCompanyId = input.ownerCompanyId
  }
  const raw = await apiClient.post(TESTS_PATH, body)
  const test = normalizeAssessmentTest(raw)
  if (!test) {
    throw new Error("Respuesta de creación inválida")
  }
  return test
}

export async function updateAssessmentTest(
  testId: string,
  input: UpdateAssessmentTestInput,
): Promise<AssessmentTestView> {
  const body: Record<string, unknown> = {}
  if (input.title !== undefined) body.title = input.title
  if (input.description !== undefined) body.description = input.description
  if (input.kind !== undefined) body.type = KIND_TO_API[input.kind]
  if (input.ownerCompanyId !== undefined) {
    body.ownerCompanyId = input.ownerCompanyId
  }
  if (input.instructions !== undefined) body.instructions = input.instructions
  if (input.durationMinutes !== undefined) {
    body.durationMinutes = input.durationMinutes
  }
  if (input.maxAttempts !== undefined) body.maxAttempts = input.maxAttempts
  const raw = await apiClient.patch(testPath(testId), body)
  const test = normalizeAssessmentTest(raw) ??
    (await getAssessmentTestDetail(testId)).test
  return test
}

export async function publishAssessmentTest(
  testId: string,
): Promise<AssessmentVersionView | null> {
  const raw = await apiClient.post(testPath(testId, "/publish"), {})
  return normalizeAssessmentVersion(raw, testId)
}

export async function openAssessmentTestDraft(
  testId: string,
): Promise<AssessmentTestDetailView> {
  await apiClient.post(testPath(testId, "/versions"), {})
  return getAssessmentTestDetail(testId)
}

export async function archiveAssessmentTest(
  testId: string,
): Promise<AssessmentTestView> {
  const raw = await apiClient.post(testPath(testId, "/archive"), {})
  const test = normalizeAssessmentTest(raw)
  if (test) return test
  return (await getAssessmentTestDetail(testId)).test
}

export async function duplicateAssessmentTest(
  testId: string,
  title: string,
): Promise<AssessmentTestView> {
  const raw = await apiClient.post(testPath(testId, "/duplicate"), { title })
  const test = normalizeAssessmentTest(raw)
  if (!test) {
    throw new Error("Respuesta de duplicado inválida")
  }
  return test
}

export async function getAssessmentVersionSnapshot(
  testId: string,
  versionId: string,
): Promise<AssessmentVersionSnapshotView> {
  const raw = await apiClient.get(
    testPath(testId, `/versions/${encodeURIComponent(versionId)}`),
  )
  const snapshot = normalizeVersionSnapshot(raw, testId)
  if (!snapshot) {
    const err = new Error("not_found") as ApiClientError
    err.status = 404
    err.body = { message: "not_found", code: "not_found" }
    throw err
  }
  return snapshot
}

export async function createAssessmentQuestion(
  testId: string,
  question: MockQuestion,
): Promise<AssessmentQuestionView> {
  const raw = await apiClient.post(
    testPath(testId, "/questions"),
    questionToApiBody(question),
  )
  const created = normalizeAssessmentQuestion(raw)
  if (!created) {
    throw new Error("Respuesta de pregunta inválida")
  }
  return created
}

export async function updateAssessmentQuestion(
  testId: string,
  questionId: string,
  question: MockQuestion,
): Promise<AssessmentQuestionView> {
  const raw = await apiClient.patch(
    testPath(testId, `/questions/${encodeURIComponent(questionId)}`),
    questionToApiBody(question),
  )
  const updated = normalizeAssessmentQuestion(raw)
  if (!updated) {
    return { ...question, id: questionId }
  }
  return updated
}

export async function deleteAssessmentQuestion(
  testId: string,
  questionId: string,
): Promise<void> {
  await apiClient.delete(
    testPath(testId, `/questions/${encodeURIComponent(questionId)}`),
  )
}

export async function reorderAssessmentQuestions(
  testId: string,
  questionIds: string[],
): Promise<void> {
  await apiClient.put(testPath(testId, "/questions/order"), {
    questionIds,
  })
}
