import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { RecruiterDashboard } from "@/components/rrhh/dashboard/recruiter-dashboard"
import { apiClient } from "@/lib/api"
import esMessages from "@/messages/es.json"

vi.mock("@/lib/api", () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    user: { name: "Ada", email: "ada@example.com", role: "recruiter" },
    loading: false,
  }),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/portal-rrhh",
}))

const NOW = new Date("2026-10-05T16:00:00.000Z")

describe("RecruiterDashboard mount network", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset()
    vi.mocked(apiClient.get).mockImplementation(async (path: string) => {
      if (path === "/api/recruiter/dashboard") {
        return {
          generatedAt: NOW.toISOString(),
          metrics: [
            { key: "activeVacancies", value: 3, sourceState: "ready" },
            { key: "upcomingInterviews", value: 0, sourceState: "ready" },
            { key: "staleCandidates", value: 0, sourceState: "ready" },
            { key: "pendingEvaluations", value: 0, sourceState: "ready" },
            { key: "vacanciesWithoutCandidates", value: 1, sourceState: "ready" },
            { key: "vacanciesPresentationOverdue", value: 0, sourceState: "ready" },
            { key: "vacanciesUnpublished", value: 0, sourceState: "ready" },
          ],
          reminders: [],
          vacancyAttention: [
            {
              vacancyId: "11111111-1111-1111-1111-111111111111",
              title: "Analista",
              signal: "critical",
              candidateCount: 0,
            },
          ],
        }
      }
      throw new Error(`unexpected path ${path}`)
    })
  })

  it("al montar solo llama GET /api/recruiter/dashboard", async () => {
    render(
      <NextIntlClientProvider locale="es" messages={esMessages} timeZone="UTC">
        <RecruiterDashboard />
      </NextIntlClientProvider>
    )

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith("/api/recruiter/dashboard")
    })

    const paths = vi.mocked(apiClient.get).mock.calls.map(([path]) => String(path))
    expect(paths.every((path) => path === "/api/recruiter/dashboard")).toBe(true)
    expect(paths.some((path) => path.includes("/api/recruiter/vacancies"))).toBe(false)
    expect(paths.some((path) => path.includes("vacancy-progress"))).toBe(false)

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: "Vacantes activas: 3. Ver detalle" })
      ).toBeInTheDocument()
      expect(
        screen.getByRole("link", { name: "Sin postulaciones: 1. Ver detalle" })
      ).toBeInTheDocument()
      expect(
        screen.getByRole("heading", { name: "Vacantes que necesitan atención" })
      ).toBeInTheDocument()
    })
  })
})

