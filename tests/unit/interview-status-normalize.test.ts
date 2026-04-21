import { afterEach, describe, expect, it, vi } from "vitest"
import { apiClient } from "@/lib/api"
import {
  listInterviewStatusesAdmin,
  normalizeInterview,
} from "@/lib/api/interviews"

vi.mock("@/lib/api", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

afterEach(() => {
  vi.clearAllMocks()
})

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

  it("acepta el catálogo admin de estados aunque el backend no envíe code", async () => {
    vi.mocked(apiClient.get).mockResolvedValue([
      {
        id: "00000000-0000-0000-0000-000000000603",
        displayName: "Cancelada",
        description: null,
        sortOrder: 0,
        isTerminal: false,
        isActive: true,
        createdAtUtc: "2024-01-01T00:00:00Z",
        updatedAtUtc: "2026-04-16T23:11:20.823635Z",
      },
      {
        id: "00000000-0000-0000-0000-000000000602",
        displayName: "Completada",
        description: null,
        sortOrder: 0,
        isTerminal: false,
        isActive: true,
        createdAtUtc: "2024-01-01T00:00:00Z",
        updatedAtUtc: "2026-04-16T23:11:17.513294Z",
      },
      {
        id: "00000000-0000-0000-0000-000000000604",
        displayName: "No asistió",
        description: null,
        sortOrder: 0,
        isTerminal: false,
        isActive: true,
        createdAtUtc: "2024-01-01T00:00:00Z",
        updatedAtUtc: "2026-04-16T23:11:36.095037Z",
      },
      {
        id: "00000000-0000-0000-0000-000000000601",
        displayName: "Programada",
        description: null,
        sortOrder: 0,
        isTerminal: false,
        isActive: true,
        createdAtUtc: "2024-01-01T00:00:00Z",
        updatedAtUtc: "2026-04-17T03:44:29.71446Z",
      },
      {
        id: "7d5ee0da-2665-42a3-94e6-88e627f00585",
        displayName: "Prueba",
        description: null,
        sortOrder: 1,
        isTerminal: false,
        isActive: true,
        createdAtUtc: "2026-04-21T17:14:51.357429Z",
        updatedAtUtc: "2026-04-21T17:14:51.357429Z",
      },
      {
        id: "af2cc1d9-a47e-4a59-a3b5-9778cf9c7beb",
        displayName: "Prueba",
        description: null,
        sortOrder: 1,
        isTerminal: false,
        isActive: true,
        createdAtUtc: "2026-04-21T17:14:56.164129Z",
        updatedAtUtc: "2026-04-21T17:14:56.164129Z",
      },
    ])

    const rows = await listInterviewStatusesAdmin()

    expect(rows).toHaveLength(6)
    expect(rows.map((row) => row.displayName)).toEqual([
      "Cancelada",
      "Completada",
      "No asistió",
      "Programada",
      "Prueba",
      "Prueba",
    ])
    expect(rows.every((row) => row.code.trim() !== "")).toBe(true)
  })
})
