import { describe, it, expect } from "vitest"
import { normalizeInterview } from "@/lib/api/interviews"

describe("normalizeInterview — estado", () => {
  it("mapea status en español a nivel raíz", () => {
    const row = normalizeInterview({
      id: "a",
      vacancyId: "v",
      candidateProfileId: "c",
      scheduledAtUtc: "2026-01-01T12:00:00Z",
      status: "Completada",
    })
    expect(row.status).toBe("Completed")
  })

  it("lee interviewStatus anidado (camelCase) antes que status vacío", () => {
    const row = normalizeInterview({
      id: "a",
      vacancyId: "v",
      candidateProfileId: "c",
      scheduledAtUtc: "2026-01-01T12:00:00Z",
      interviewStatus: {
        id: "st-1",
        code: "Cancelled",
        displayName: "Cancelada por el candidato",
      },
    })
    expect(row.status).toBe("Cancelled")
    expect(row.statusDisplayName).toBe("Cancelada por el candidato")
  })

  it("acepta claves PascalCase en objeto de estado", () => {
    const row = normalizeInterview({
      id: "a",
      vacancyId: "v",
      candidateProfileId: "c",
      scheduledAtUtc: "2026-01-01T12:00:00Z",
      InterviewStatus: {
        Code: "NoShow",
        DisplayName: "No asistió",
      },
    })
    expect(row.status).toBe("NoShow")
    expect(row.statusDisplayName).toBe("No asistió")
  })

  it("mapea ordinal numérico 0–3 (enum .NET sin conversor a string)", () => {
    expect(
      normalizeInterview({
        id: "a",
        vacancyId: "v",
        candidateProfileId: "c",
        scheduledAtUtc: "2026-01-01T12:00:00Z",
        status: 2,
      }).status
    ).toBe("Cancelled")
  })

  it("interpreta códigos largos por subcadena", () => {
    const row = normalizeInterview({
      id: "a",
      vacancyId: "v",
      candidateProfileId: "c",
      scheduledAtUtc: "2026-01-01T12:00:00Z",
      status: "INTERVIEW_STATUS_COMPLETED",
    })
    expect(row.status).toBe("Completed")
  })

  it("no confunde incompleto con completada", () => {
    const row = normalizeInterview({
      id: "a",
      vacancyId: "v",
      candidateProfileId: "c",
      scheduledAtUtc: "2026-01-01T12:00:00Z",
      status: "Perfil incompleto",
    })
    expect(row.status).toBe("Scheduled")
  })
})
