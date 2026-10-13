/** Simulated Portal Pruebas domain types — UI demo only, no backend contract. */

export type AssessmentLifecycleStatus = "draft" | "published" | "archived"

export type AssignmentStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "expired"
  | "cancelled"

export type ReviewStatus = "pending" | "reviewed"

export type AssessmentKind = "technical" | "psychometric"

export type ApplicationFinalStatus =
  | "hired"
  | "rejected"
  | "withdrawn"
  | "discarded"

export type ApplicationStatus = ApplicationFinalStatus | "active" | "screening"

export type VacancyStatus = "open" | "closed"

export type QuestionKind =
  | "single_choice"
  | "multiple_choice"
  | "true_false"
  | "likert"
  | "numeric"
  | "open"

export type SessionStatus = "in_progress" | "submitted" | "expired"

export type MockScenario = "populated" | "empty" | "error" | "loading"

export type EligibilityReason =
  | "vacancy_mismatch"
  | "application_inactive"
  | "application_final"
  | "vacancy_closed"
  | "link_inactive"
  | "test_not_published"
  | "duplicate_assignment"

export type SessionBlockReason = EligibilityReason | "expired" | "attempts_exhausted"

export interface MockCompany {
  id: string
  name: string
}

export interface MockVacancy {
  id: string
  companyId: string
  title: string
  status: VacancyStatus
  isDone: boolean
  isDeleted: boolean
}

export interface MockCandidateProfile {
  id: string
  fullName: string
  email: string
}

export interface MockApplication {
  id: string
  candidateProfileId: string
  vacancyId: string
  stage: string
  status: ApplicationStatus
  isActive: boolean
}

export interface MockAssessmentTest {
  id: string
  companyId?: string
  title: string
  description: string
  kind: AssessmentKind
  lifecycleStatus: AssessmentLifecycleStatus
  draftVersion: number
  createdAt: string
}

export interface MockAssessmentVersion {
  id: string
  testId: string
  versionNumber: number
  instructions: string
  durationMinutes: number
  maxAttempts: number
  publishedAt?: string
  questionIds: string[]
}

export interface MockQuestionOption {
  id: string
  label: string
}

interface MockQuestionBase {
  id: string
  prompt: string
}

export interface MockSingleChoiceQuestion extends MockQuestionBase {
  kind: "single_choice"
  options: MockQuestionOption[]
  correctOptionId: string
  points: number
}

export interface MockMultipleChoiceQuestion extends MockQuestionBase {
  kind: "multiple_choice"
  options: MockQuestionOption[]
  correctOptionIds: string[]
  points: number
}

export interface MockTrueFalseQuestion extends MockQuestionBase {
  kind: "true_false"
  correct: boolean
  points: number
}

export interface MockLikertQuestion extends MockQuestionBase {
  kind: "likert"
  scaleMin: 1
  scaleMax: 5
  dimension: string
  reversed: boolean
}

export interface MockNumericQuestion extends MockQuestionBase {
  kind: "numeric"
  expected: number
  tolerance: number
  points: number
}

export interface MockOpenQuestion extends MockQuestionBase {
  kind: "open"
  rubric: string
  maxPoints: number
}

export type MockQuestion =
  | MockSingleChoiceQuestion
  | MockMultipleChoiceQuestion
  | MockTrueFalseQuestion
  | MockLikertQuestion
  | MockNumericQuestion
  | MockOpenQuestion

export interface MockAssessmentLink {
  id: string
  vacancyId: string
  testVersionId: string
  active: boolean
  /** ISO timestamp when the link was created. Deactivate does not change it. */
  linkedAt: string
}

export interface MockAssignment {
  id: string
  applicationId: string
  testVersionId: string
  status: AssignmentStatus
  assignedAt: string
  expiresAt: string
  allowedAttempts: number
}

export interface MockSessionAnswer {
  questionId: string
  value: unknown
}

export interface MockSession {
  id: string
  assignmentId: string
  attemptNumber: number
  startedAt: string
  deadlineAt: string
  status: SessionStatus
  answers: MockSessionAnswer[]
}

export interface MockResult {
  id: string
  assignmentId: string
  score?: number
  maxScore?: number
  categoryScores?: Record<string, number>
  dimensionScores?: Record<string, number>
  reviewStatus: ReviewStatus
}

export interface MockReview {
  assignmentId: string
  questionId: string
  rubric: string
  reviewerNotes?: string
  pointsAwarded?: number
  status: ReviewStatus
}

export interface MockPruebasStore {
  companies: MockCompany[]
  vacancies: MockVacancy[]
  candidates: MockCandidateProfile[]
  applications: MockApplication[]
  tests: MockAssessmentTest[]
  versions: MockAssessmentVersion[]
  questions: MockQuestion[]
  links: MockAssessmentLink[]
  assignments: MockAssignment[]
  sessions: MockSession[]
  results: MockResult[]
  reviews: MockReview[]
}

export type EligibilityResult =
  | { ok: true }
  | { ok: false; reason: EligibilityReason }

export type SessionStartResult =
  | { ok: true }
  | { ok: false; reason: SessionBlockReason }

export interface AssignFailure {
  applicationId: string
  reason: EligibilityReason
}

export type AssignResult =
  | { ok: true; assignments: MockAssignment[] }
  | { ok: false; failures: AssignFailure[] }
