import {
  buildDashboard,
  type DashboardFilters,
  type DashboardSnapshot,
} from "@/lib/pruebas/dashboard"
import { expiresAtIsoFromYmd, isExpiresAtValid } from "@/lib/pruebas/assignments"
import {
  evaluateEligibility,
  isVacancyClosed,
} from "@/lib/pruebas/eligibility"
import { MOCK_NOW } from "@/lib/pruebas/mock-fixtures"
import {
  emptyStoreSnapshot,
  getMockRuntime,
  getMockStore,
  replaceMockStore,
  resetMockStore,
  setMockLatencyMs,
  setMockScenario,
  snapshotStore,
  waitWhileLoading,
} from "@/lib/pruebas/mock-store"
import {
  getTrackingActions,
  isApplicationClosedForTracking,
} from "@/lib/pruebas/tracking"
import type {
  AssessmentKind,
  AssignFailure,
  AssignResult,
  MockAssessmentTest,
  MockAssessmentVersion,
  MockAssignment,
  MockPruebasStore,
  MockQuestion,
  MockResult,
  MockReview,
  MockSession,
  MockTrackingEvent,
  TrackingEventKind,
} from "@/lib/pruebas/types"

export {
  resetMockStore,
  setMockLatencyMs,
  setMockScenario,
} from "@/lib/pruebas/mock-store"

export class MockServiceError extends Error {
  readonly code: string

  constructor(code: string, message = code) {
    super(message)
    this.name = "MockServiceError"
    this.code = code
  }
}

async function gate(): Promise<MockPruebasStore> {
  await waitWhileLoading()
  const { scenario, latencyMs } = getMockRuntime()
  if (latencyMs > 0) {
    await delay(latencyMs)
  }
  if (scenario === "error") {
    throw new MockServiceError("scenario_error")
  }
  if (scenario === "empty") {
    return emptyStoreSnapshot()
  }
  return getMockStore()
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function requirePopulatedStore(): MockPruebasStore {
  const { scenario } = getMockRuntime()
  if (scenario === "empty") {
    throw new MockServiceError("not_found")
  }
  if (scenario === "error") {
    throw new MockServiceError("scenario_error")
  }
  return getMockStore()
}

export async function getDashboard(
  filters: DashboardFilters = {},
): Promise<DashboardSnapshot> {
  const store = await gate()
  return buildDashboard(store, filters, MOCK_NOW)
}

export async function listTests(): Promise<MockAssessmentTest[]> {
  const store = await gate()
  return [...store.tests]
}

export async function getTest(testId: string): Promise<MockAssessmentTest> {
  const store = await gate()
  const test = store.tests.find((item) => item.id === testId)
  if (!test) {
    throw new MockServiceError("not_found")
  }
  return test
}

export async function listQuestions(): Promise<MockQuestion[]> {
  const store = await gate()
  return [...store.questions]
}

export async function getQuestion(questionId: string): Promise<MockQuestion> {
  const store = await gate()
  const question = store.questions.find((item) => item.id === questionId)
  if (!question) {
    throw new MockServiceError("not_found")
  }
  return question
}

/**
 * True when the question id appears on any published version snapshot.
 * Demo-only: published versions keep ids, not prompt copies.
 */
export function isQuestionUsedByPublishedVersion(
  questionId: string,
  versions: readonly MockAssessmentVersion[],
): boolean {
  return versions.some(
    (version) =>
      version.publishedAt !== undefined &&
      version.questionIds.includes(questionId),
  )
}

function withBankId(input: MockQuestion, id: string): MockQuestion {
  switch (input.kind) {
    case "single_choice": {
      const correctIndex = Math.max(
        0,
        input.options.findIndex((option) => option.id === input.correctOptionId),
      )
      const options = input.options.map((option, index) => ({
        id: `${id}-opt-${index + 1}`,
        label: option.label,
      }))
      return {
        ...input,
        id,
        options,
        correctOptionId:
          options[correctIndex]?.id ?? options[0]?.id ?? `${id}-opt-1`,
      }
    }
    case "multiple_choice": {
      const options = input.options.map((option, index) => ({
        id: `${id}-opt-${index + 1}`,
        label: option.label,
      }))
      const idByOld = new Map(
        input.options.map((option, index) => [option.id, options[index]!.id]),
      )
      const correctOptionIds = input.correctOptionIds
        .map((oldId) => idByOld.get(oldId))
        .filter((value): value is string => Boolean(value))
      return {
        ...input,
        id,
        options,
        correctOptionIds:
          correctOptionIds.length > 0
            ? correctOptionIds
            : options[0]
              ? [options[0].id]
              : [],
      }
    }
    case "true_false":
      return { ...input, id }
    case "likert":
      return { ...input, id }
    case "numeric":
      return { ...input, id }
    case "open":
      return { ...input, id }
  }
}

export async function createQuestion(
  input: MockQuestion,
): Promise<MockQuestion> {
  await gate()
  const store = requirePopulatedStore()
  const id = `q-bank-${store.questions.length + 1}`
  const question = withBankId(input, id)
  store.questions.push(question)
  return question
}

export async function updateQuestion(
  questionId: string,
  input: MockQuestion,
): Promise<MockQuestion> {
  await gate()
  const store = requirePopulatedStore()
  const index = store.questions.findIndex((item) => item.id === questionId)
  if (index < 0) {
    throw new MockServiceError("not_found")
  }
  const question = { ...input, id: questionId } as MockQuestion
  store.questions[index] = question
  return question
}

export async function listVersions(testId?: string): Promise<MockAssessmentVersion[]> {
  const store = await gate()
  if (!testId) {
    return [...store.versions]
  }
  return store.versions.filter((version) => version.testId === testId)
}

export async function listLinks() {
  const store = await gate()
  return [...store.links]
}

export async function listAssignments() {
  const store = await gate()
  return [...store.assignments]
}

export async function listSessions(): Promise<MockSession[]> {
  const store = await gate()
  return [...store.sessions]
}

export async function listTrackingEvents(
  assignmentId?: string,
): Promise<MockTrackingEvent[]> {
  const store = await gate()
  const events = assignmentId
    ? store.trackingEvents.filter((event) => event.assignmentId === assignmentId)
    : store.trackingEvents
  return [...events].sort((a, b) => a.at.localeCompare(b.at))
}

export async function listApplications() {
  const store = await gate()
  return [...store.applications]
}

export async function listVacancies() {
  const store = await gate()
  return [...store.vacancies]
}

export async function listCompanies() {
  const store = await gate()
  return [...store.companies]
}

export async function listCandidates() {
  const store = await gate()
  return [...store.candidates]
}

export async function listResults(): Promise<MockResult[]> {
  const store = await gate()
  return [...store.results]
}

export async function getResultByAssignment(
  assignmentId: string
): Promise<MockResult> {
  const store = await gate()
  const result = store.results.find((item) => item.assignmentId === assignmentId)
  if (!result) {
    throw new MockServiceError("not_found")
  }
  return result
}

/**
 * Creates a minimal bank question compatible with the assessment kind.
 * Technical → single choice; psychometric → Likert.
 */
export async function createCompatibleQuestion(
  assessmentKind: AssessmentKind,
): Promise<MockQuestion> {
  await gate()
  const store = requirePopulatedStore()
  const id = `q-demo-${store.questions.length + 1}`
  const question: MockQuestion =
    assessmentKind === "psychometric"
      ? {
          id,
          kind: "likert",
          prompt: "Indica tu grado de acuerdo con el enunciado de demostración.",
          scaleMin: 1,
          scaleMax: 5,
          dimension: "Análisis",
          reversed: false,
        }
      : {
          id,
          kind: "single_choice",
          prompt: "Pregunta de demostración: selecciona la opción correcta.",
          options: [
            { id: `${id}-a`, label: "Opción A" },
            { id: `${id}-b`, label: "Opción B" },
          ],
          correctOptionId: `${id}-a`,
          points: 1,
        }
  store.questions.push(question)
  return question
}

export async function createDraftTest(input: {
  title: string
  description: string
  kind: MockAssessmentTest["kind"]
  companyId?: string
}): Promise<MockAssessmentTest> {
  await gate()
  const store = requirePopulatedStore()
  const test: MockAssessmentTest = {
    id: `test-${store.tests.length + 1}`,
    companyId: input.companyId,
    title: input.title,
    description: input.description,
    kind: input.kind,
    lifecycleStatus: "draft",
    draftVersion: 0,
    createdAt: MOCK_NOW,
  }
  const version: MockAssessmentVersion = {
    id: `ver-${test.id}-v0`,
    testId: test.id,
    versionNumber: 0,
    instructions: "",
    durationMinutes: 45,
    maxAttempts: 1,
    questionIds: [],
  }
  store.tests.push(test)
  store.versions.push(version)
  return test
}

export async function updateDraftTest(
  testId: string,
  patch: Partial<
    Pick<MockAssessmentTest, "title" | "description" | "kind" | "companyId">
  > & {
    instructions?: string
    durationMinutes?: number
    maxAttempts?: number
    questionIds?: string[]
  }
): Promise<MockAssessmentTest> {
  await gate()
  const store = requirePopulatedStore()
  const test = store.tests.find((item) => item.id === testId)
  if (!test) {
    throw new MockServiceError("not_found")
  }
  if (test.lifecycleStatus !== "draft") {
    throw new MockServiceError("not_draft")
  }
  if (patch.title !== undefined) test.title = patch.title
  if (patch.description !== undefined) test.description = patch.description
  if (patch.kind !== undefined) test.kind = patch.kind
  if (patch.companyId !== undefined) test.companyId = patch.companyId

  const draft = store.versions.find(
    (version) =>
      version.testId === testId && version.publishedAt === undefined
  )
  if (draft) {
    if (patch.instructions !== undefined) draft.instructions = patch.instructions
    if (patch.durationMinutes !== undefined) {
      draft.durationMinutes = patch.durationMinutes
    }
    if (patch.maxAttempts !== undefined) draft.maxAttempts = patch.maxAttempts
    if (patch.questionIds !== undefined) draft.questionIds = [...patch.questionIds]
  }
  return test
}

/**
 * Freezes the current draft into an immutable published version.
 */
export async function publishTest(testId: string): Promise<MockAssessmentVersion> {
  await gate()
  const store = requirePopulatedStore()
  const test = store.tests.find((item) => item.id === testId)
  if (!test) {
    throw new MockServiceError("not_found")
  }
  if (test.lifecycleStatus === "archived") {
    throw new MockServiceError("test_archived")
  }
  const draft = store.versions.find(
    (version) =>
      version.testId === testId && version.publishedAt === undefined
  )
  if (!draft) {
    throw new MockServiceError("no_draft")
  }
  const nextNumber =
    Math.max(
      0,
      ...store.versions
        .filter((version) => version.testId === testId && version.publishedAt)
        .map((version) => version.versionNumber)
    ) + 1

  draft.versionNumber = nextNumber
  draft.publishedAt = MOCK_NOW
  test.lifecycleStatus = "published"
  test.draftVersion = nextNumber
  return { ...draft, questionIds: [...draft.questionIds] }
}

/**
 * Clones the latest published version into a new draft. Published snapshot stays frozen.
 */
export async function editPublishedTest(
  testId: string
): Promise<{ test: MockAssessmentTest; draft: MockAssessmentVersion }> {
  await gate()
  const store = requirePopulatedStore()
  const test = store.tests.find((item) => item.id === testId)
  if (!test) {
    throw new MockServiceError("not_found")
  }
  if (test.lifecycleStatus !== "published") {
    throw new MockServiceError("not_published")
  }
  const published = store.versions
    .filter((version) => version.testId === testId && version.publishedAt)
    .sort((a, b) => b.versionNumber - a.versionNumber)[0]
  if (!published) {
    throw new MockServiceError("no_published_version")
  }
  const snapshot = { ...published, questionIds: [...published.questionIds] }
  const draft: MockAssessmentVersion = {
    id: `ver-${testId}-draft-${published.versionNumber + 1}`,
    testId,
    versionNumber: 0,
    instructions: published.instructions,
    durationMinutes: published.durationMinutes,
    maxAttempts: published.maxAttempts,
    questionIds: [...published.questionIds],
  }
  store.versions.push(draft)
  test.lifecycleStatus = "draft"
  // Ensure published row was not mutated
  const stillFrozen = store.versions.find((version) => version.id === published.id)
  if (
    !stillFrozen ||
    stillFrozen.publishedAt !== snapshot.publishedAt ||
    stillFrozen.questionIds.join("|") !== snapshot.questionIds.join("|")
  ) {
    throw new MockServiceError("publish_integrity")
  }
  return { test, draft }
}

export async function archiveTest(testId: string): Promise<MockAssessmentTest> {
  await gate()
  const store = requirePopulatedStore()
  const test = store.tests.find((item) => item.id === testId)
  if (!test) {
    throw new MockServiceError("not_found")
  }
  test.lifecycleStatus = "archived"
  return test
}

/**
 * Creates a new draft test from an existing one. Does not copy links or assignments.
 * Source test stays unchanged.
 */
export async function duplicateTest(
  testId: string,
  title: string,
): Promise<MockAssessmentTest> {
  await gate()
  const store = requirePopulatedStore()
  const source = store.tests.find((item) => item.id === testId)
  if (!source) {
    throw new MockServiceError("not_found")
  }

  const sourceVersions = store.versions.filter((version) => version.testId === testId)
  const unpublished = sourceVersions.find((version) => version.publishedAt === undefined)
  const publishedLatest = [...sourceVersions]
    .filter((version) => version.publishedAt)
    .sort((a, b) => b.versionNumber - a.versionNumber)[0]
  const template = unpublished ?? publishedLatest
  if (!template) {
    throw new MockServiceError("no_draft")
  }

  const newId = `test-dup-${store.tests.length + 1}`
  const copy: MockAssessmentTest = {
    id: newId,
    companyId: source.companyId,
    title,
    description: source.description,
    kind: source.kind,
    lifecycleStatus: "draft",
    draftVersion: 0,
    createdAt: MOCK_NOW,
  }
  const draftVersion: MockAssessmentVersion = {
    id: `ver-${newId}-v0`,
    testId: newId,
    versionNumber: 0,
    instructions: template.instructions,
    durationMinutes: template.durationMinutes,
    maxAttempts: template.maxAttempts,
    questionIds: [...template.questionIds],
  }

  store.tests.push(copy)
  store.versions.push(draftVersion)
  return copy
}

export async function createLink(input: {
  vacancyId: string
  testVersionId: string
}): Promise<MockPruebasStore["links"][number]> {
  await gate()
  const store = requirePopulatedStore()
  const version = store.versions.find((item) => item.id === input.testVersionId)
  if (!version?.publishedAt) {
    throw new MockServiceError("version_not_published")
  }
  const test = store.tests.find((item) => item.id === version.testId)
  if (!test || test.lifecycleStatus !== "published") {
    throw new MockServiceError("test_not_published")
  }
  const vacancy = store.vacancies.find((item) => item.id === input.vacancyId)
  if (!vacancy) {
    throw new MockServiceError("not_found")
  }
  if (isVacancyClosed(vacancy)) {
    throw new MockServiceError("vacancy_closed")
  }
  const duplicate = store.links.find(
    (item) =>
      item.vacancyId === input.vacancyId &&
      item.testVersionId === input.testVersionId,
  )
  if (duplicate) {
    throw new MockServiceError("duplicate_link")
  }
  const link = {
    id: `link-${store.links.length + 1}`,
    vacancyId: input.vacancyId,
    testVersionId: input.testVersionId,
    active: true,
    linkedAt: MOCK_NOW,
  }
  store.links.push(link)
  return link
}

export async function setLinkActive(
  linkId: string,
  active: boolean
): Promise<MockPruebasStore["links"][number]> {
  await gate()
  const store = requirePopulatedStore()
  const link = store.links.find((item) => item.id === linkId)
  if (!link) {
    throw new MockServiceError("not_found")
  }
  link.active = active
  return link
}

/**
 * All-or-nothing batch assign. No rows created when any application fails eligibility.
 */
export async function assign(input: {
  vacancyId: string
  testVersionId: string
  applicationIds: string[]
  expiresAt: string
  allowedAttempts?: number
}): Promise<AssignResult> {
  await gate()
  const store = requirePopulatedStore()
  const version = store.versions.find((item) => item.id === input.testVersionId)
  if (!version) {
    throw new MockServiceError("not_found")
  }
  const test = store.tests.find((item) => item.id === version.testId)
  if (!test) {
    throw new MockServiceError("not_found")
  }
  const link = store.links.find(
    (item) =>
      item.vacancyId === input.vacancyId &&
      item.testVersionId === input.testVersionId
  )
  if (!link) {
    throw new MockServiceError("link_missing")
  }
  const vacancy = store.vacancies.find((item) => item.id === input.vacancyId)
  if (!vacancy) {
    throw new MockServiceError("not_found")
  }

  const failures: AssignFailure[] = []
  const pending: MockAssignment[] = []

  for (const applicationId of input.applicationIds) {
    const application = store.applications.find((item) => item.id === applicationId)
    if (!application) {
      failures.push({ applicationId, reason: "application_inactive" })
      continue
    }
    const result = evaluateEligibility({
      application,
      vacancy,
      link,
      test,
      version,
      existingAssignments: store.assignments,
      targetVacancyId: input.vacancyId,
    })
    if (!result.ok) {
      failures.push({ applicationId, reason: result.reason })
      continue
    }
    pending.push({
      id: `asg-${store.assignments.length + pending.length + 1}`,
      applicationId,
      testVersionId: input.testVersionId,
      status: "pending",
      assignedAt: MOCK_NOW,
      expiresAt: input.expiresAt,
      allowedAttempts: input.allowedAttempts ?? 1,
    })
  }

  if (failures.length > 0) {
    return { ok: false, failures }
  }

  store.assignments.push(...pending)
  return { ok: true, assignments: pending.map((item) => ({ ...item })) }
}

function appendTrackingEvent(
  store: MockPruebasStore,
  assignmentId: string,
  kind: TrackingEventKind,
  detail?: string,
): MockTrackingEvent {
  const event: MockTrackingEvent = {
    id: `evt-${store.trackingEvents.length + 1}`,
    assignmentId,
    kind,
    at: MOCK_NOW,
    detail,
  }
  store.trackingEvents.push(event)
  return event
}

function requireAssignmentContext(assignmentId: string): {
  store: MockPruebasStore
  assignment: MockAssignment
  isApplicationClosed: boolean
  attemptsUsed: number
} {
  const store = requirePopulatedStore()
  const assignment = store.assignments.find((item) => item.id === assignmentId)
  if (!assignment) {
    throw new MockServiceError("not_found")
  }
  const application = store.applications.find(
    (item) => item.id === assignment.applicationId,
  )
  const closed = isApplicationClosedForTracking(application)
  const attemptsUsed = store.sessions.filter(
    (session) => session.assignmentId === assignment.id,
  ).length
  return {
    store,
    assignment,
    isApplicationClosed: closed.closed,
    attemptsUsed,
  }
}

/**
 * Simulated reminder — records a timeline event only. Never sends email.
 */
export async function remindAssignment(
  assignmentId: string,
): Promise<MockTrackingEvent> {
  await gate()
  const { store, assignment, isApplicationClosed, attemptsUsed } =
    requireAssignmentContext(assignmentId)
  const actions = getTrackingActions({
    status: assignment.status,
    isApplicationClosed,
    attemptsUsed,
    allowedAttempts: assignment.allowedAttempts,
  })
  if (!actions.includes("remind")) {
    throw new MockServiceError(
      isApplicationClosed ? "application_closed" : "action_not_allowed",
    )
  }
  return appendTrackingEvent(store, assignment.id, "reminded")
}

/**
 * Cancels an assignment without deleting the row.
 */
export async function cancelAssignment(
  assignmentId: string,
): Promise<MockAssignment> {
  await gate()
  const { store, assignment, isApplicationClosed, attemptsUsed } =
    requireAssignmentContext(assignmentId)
  const actions = getTrackingActions({
    status: assignment.status,
    isApplicationClosed,
    attemptsUsed,
    allowedAttempts: assignment.allowedAttempts,
  })
  if (!actions.includes("cancel")) {
    throw new MockServiceError("action_not_allowed")
  }
  assignment.status = "cancelled"
  appendTrackingEvent(store, assignment.id, "cancelled")
  return { ...assignment }
}

/**
 * Extends expiry. Expired assignments return to pending.
 */
export async function extendAssignment(
  assignmentId: string,
  expiresAtYmd: string,
): Promise<MockAssignment> {
  await gate()
  const { store, assignment, isApplicationClosed, attemptsUsed } =
    requireAssignmentContext(assignmentId)
  if (!isExpiresAtValid(expiresAtYmd, MOCK_NOW)) {
    throw new MockServiceError("invalid_expires_at")
  }
  const actions = getTrackingActions({
    status: assignment.status,
    isApplicationClosed,
    attemptsUsed,
    allowedAttempts: assignment.allowedAttempts,
    expiresAtYmd,
    nowIso: MOCK_NOW,
  })
  if (!actions.includes("extend")) {
    throw new MockServiceError(
      isApplicationClosed ? "application_closed" : "action_not_allowed",
    )
  }
  const expiresAt = expiresAtIsoFromYmd(expiresAtYmd, MOCK_NOW)
  assignment.expiresAt = expiresAt
  if (assignment.status === "expired") {
    assignment.status = "pending"
  }
  appendTrackingEvent(store, assignment.id, "extended", expiresAt)
  return { ...assignment }
}

/**
 * Authorizes another attempt on an expired assignment with exhausted attempts.
 * Does not create a session.
 */
export async function retryAssignment(
  assignmentId: string,
): Promise<MockAssignment> {
  await gate()
  const { store, assignment, isApplicationClosed, attemptsUsed } =
    requireAssignmentContext(assignmentId)
  const actions = getTrackingActions({
    status: assignment.status,
    isApplicationClosed,
    attemptsUsed,
    allowedAttempts: assignment.allowedAttempts,
  })
  if (!actions.includes("retry")) {
    throw new MockServiceError(
      isApplicationClosed ? "application_closed" : "action_not_allowed",
    )
  }
  assignment.allowedAttempts += 1
  assignment.status = "pending"
  appendTrackingEvent(store, assignment.id, "retried")
  return { ...assignment }
}

export async function createSession(input: {
  assignmentId: string
  startedAt: string
  deadlineAt: string
}): Promise<MockSession> {
  await gate()
  const store = requirePopulatedStore()
  const assignment = store.assignments.find(
    (item) => item.id === input.assignmentId
  )
  if (!assignment) {
    throw new MockServiceError("not_found")
  }
  const attemptNumber =
    store.sessions.filter((session) => session.assignmentId === assignment.id)
      .length + 1
  const session: MockSession = {
    id: `ses-${store.sessions.length + 1}`,
    assignmentId: assignment.id,
    attemptNumber,
    startedAt: input.startedAt,
    deadlineAt: input.deadlineAt,
    status: "in_progress",
    answers: [],
  }
  store.sessions.push(session)
  assignment.status = "in_progress"
  return session
}

export async function submitSession(
  sessionId: string
): Promise<MockSession> {
  await gate()
  const store = requirePopulatedStore()
  const session = store.sessions.find((item) => item.id === sessionId)
  if (!session) {
    throw new MockServiceError("not_found")
  }
  session.status = "submitted"
  const assignment = store.assignments.find(
    (item) => item.id === session.assignmentId
  )
  if (assignment) {
    assignment.status = "completed"
  }
  return session
}

export async function saveReview(review: MockReview): Promise<MockReview> {
  await gate()
  const store = requirePopulatedStore()
  const index = store.reviews.findIndex(
    (item) =>
      item.assignmentId === review.assignmentId &&
      item.questionId === review.questionId
  )
  if (index >= 0) {
    store.reviews[index] = review
  } else {
    store.reviews.push(review)
  }
  return review
}

export async function upsertResult(result: MockResult): Promise<MockResult> {
  await gate()
  const store = requirePopulatedStore()
  const index = store.results.findIndex(
    (item) => item.assignmentId === result.assignmentId
  )
  if (index >= 0) {
    store.results[index] = result
  } else {
    store.results.push(result)
  }
  return result
}

/** Debug helper for tests: deep clone of current store. */
export function debugSnapshotStore(): MockPruebasStore {
  return snapshotStore()
}

export function debugReplaceStore(next: MockPruebasStore): void {
  replaceMockStore(next)
}
