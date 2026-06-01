import { describe, expect, it } from "vitest"
import {
  interviewPrepRowsFromVacancyApplicants,
  mergeApplicantsWithInterviews,
  parseVacancyInterviewPrepPayload,
  pickLatestInterviewByCandidate,
  type InterviewPrepApplicantRow,
} from "@/lib/recruiter/vacancy-applicant-interview-prep"
import type { Interview } from "@/lib/api/interviews"

const baseApplicant = (
  overrides: Partial<Record<string, unknown>> = {}
): Record<string, unknown> => ({
  candidateProfileId: "p1",
  name: "Ana",
  email: "ana@example.com",
  applicationStage: "Entrevista",
  applicationStatus: "En revisión",
  qualitativeReasoningPositive: "Buen fit",
  qualitativeReasoningNegative: "Salario alto",
  notes: "Nota RRHH",
  ...overrides,
})

describe("parseVacancyInterviewPrepPayload", () => {
  it("parses title and applicants with qualitative and comments", () => {
    const payload = {
      title: "Dev Senior",
      applicants: [baseApplicant()],
    }
    const r = parseVacancyInterviewPrepPayload(payload)
    expect(r.vacancyTitle).toBe("Dev Senior")
    expect(r.applicants).toHaveLength(1)
    expect(r.applicants[0].candidateProfileId).toBe("p1")
    expect(r.applicants[0].displayName).toContain("Ana")
    expect(r.applicants[0].stageLabel).toBe("Entrevista")
    expect(r.applicants[0].applicationStatusLabel).toBe("En revisión")
    expect(r.applicants[0].strengths).toBe("Buen fit")
    expect(r.applicants[0].considerations).toBe("Salario alto")
    expect(r.applicants[0].relevantComments).toBe("Nota RRHH")
  })

  it("dedupes applicants by candidateProfileId", () => {
    const payload = {
      applicants: [baseApplicant(), baseApplicant({ email: "dup@example.com" })],
    }
    const r = parseVacancyInterviewPrepPayload(payload)
    expect(r.applicants).toHaveLength(1)
  })

  it("maps qualitative legacy to comments when split fields absent", () => {
    const payload = {
      applicants: [
        baseApplicant({
          qualitativeReasoningPositive: "",
          qualitativeReasoningNegative: "",
          qualitativeReasoning: "Solo texto legacy",
          notes: "",
        }),
      ],
    }
    const r = parseVacancyInterviewPrepPayload(payload)
    expect(r.applicants[0].strengths).toBeNull()
    expect(r.applicants[0].considerations).toBeNull()
    expect(r.applicants[0].relevantComments).toBe("Solo texto legacy")
  })

  it("skips applicants without candidateProfileId", () => {
    const payload = {
      applicants: [{ name: "Sin id", email: "x@y.com" }],
    }
    const r = parseVacancyInterviewPrepPayload(payload)
    expect(r.applicants).toHaveLength(0)
  })
})

describe("interviewPrepRowsFromVacancyApplicants", () => {
  it("maps typed applicants consistently with parseVacancyInterviewPrepPayload", () => {
    const payload = {
      title: "Dev Senior",
      applicants: [baseApplicant()],
    }
    const fromPayload = parseVacancyInterviewPrepPayload(payload)
    const typed = fromPayload.applicants.map((row) => ({
      candidateProfileId: row.candidateProfileId,
      name: "Ana",
      email: "ana@example.com",
      applicationStage: "Entrevista",
      applicationStatus: "En revisión",
      qualitativeReasoningPositive: "Buen fit",
      qualitativeReasoningNegative: "Salario alto",
      notes: "Nota RRHH",
    }))
    const rows = interviewPrepRowsFromVacancyApplicants(typed)
    expect(rows).toHaveLength(1)
    expect(rows[0].candidateProfileId).toBe("p1")
    expect(rows[0].stageLabel).toBe("Entrevista")
    expect(rows[0].strengths).toBe("Buen fit")
    expect(rows[0].considerations).toBe("Salario alto")
    expect(rows[0].relevantComments).toBe("Nota RRHH")
  })
})

function interviewRow(
  candidateProfileId: string,
  scheduledAtUtc: string,
  status: Interview["status"] = "Scheduled",
  outcome: string | null = null
): Interview {
  return {
    id: `i-${candidateProfileId}-${scheduledAtUtc}`,
    vacancyId: "v1",
    jobTitle: null,
    candidateProfileId,
    scheduledAtUtc,
    durationMinutes: 30,
    interviewType: null,
    interviewTypeLabel: null,
    interviewTypeId: null,
    interviewModalityId: null,
    interviewModality: null,
    interviewerName: null,
    googleMeetUrl: null,
    descripcion: null,
    notes: null,
    outcome,
    status,
    statusDisplayName: null,
    interviewStatusId: null,
    isStatusTerminal: null,
    createdAtUtc: null,
    updatedAtUtc: null,
  }
}

describe("pickLatestInterviewByCandidate", () => {
  it("keeps the most recent interview per candidate", () => {
    const list: Interview[] = [
      interviewRow("p1", "2025-01-01T10:00:00.000Z"),
      interviewRow("p1", "2025-06-01T10:00:00.000Z"),
      interviewRow("p2", "2025-03-01T10:00:00.000Z"),
    ]
    const m = pickLatestInterviewByCandidate(list)
    expect(m.get("p1")?.scheduledAtUtc).toBe("2025-06-01T10:00:00.000Z")
    expect(m.get("p2")?.scheduledAtUtc).toBe("2025-03-01T10:00:00.000Z")
  })
})

describe("mergeApplicantsWithInterviews", () => {
  const applicant: InterviewPrepApplicantRow = {
    candidateProfileId: "p1",
    displayName: "Ana",
    stageLabel: "E1",
    applicationStatusLabel: "Activo",
    strengths: "S",
    considerations: "C",
    relevantComments: "N",
  }

  it("marks no interviews when list empty", () => {
    const merged = mergeApplicantsWithInterviews([applicant], [])
    expect(merged[0].interviewSummaryLabel).toBe("Sin entrevistas previas")
    expect(merged[0].lastInterview).toBeNull()
  })

  it("merges latest interview outcome and status", () => {
    const interviews: Interview[] = [
      interviewRow("p1", "2025-01-01T10:00:00.000Z", "Scheduled"),
      interviewRow("p1", "2025-02-01T10:00:00.000Z", "Completed", "Avanza"),
    ]
    const merged = mergeApplicantsWithInterviews([applicant], interviews)
    expect(merged[0].lastInterview?.status).toBe("Completed")
    expect(merged[0].interviewOutcome).toBe("Avanza")
    expect(merged[0].interviewSummaryLabel).toContain("Completada")
    expect(merged[0].interviewSummaryLabel).toContain("Avanza")
  })
})
