import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { RecruiterDashboard } from "@/components/rrhh/dashboard/recruiter-dashboard"
import {
  normalizeRecruiterDashboard,
  type RecruiterDashboardModel,
} from "@/lib/rrhh/recruiter-dashboard"
import esMessages from "@/messages/es.json"

const { useRecruiterDashboardMock, reloadMock } = vi.hoisted(() => ({
  useRecruiterDashboardMock: vi.fn(),
  reloadMock: vi.fn(),
}))

vi.mock("@/hooks/use-recruiter-dashboard", () => ({
  useRecruiterDashboard: useRecruiterDashboardMock,
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

function buildModel(
  overrides: Partial<{
    metrics: Array<Record<string, unknown>>
    reminders: Array<Record<string, unknown>>
    vacancyAttention: Array<Record<string, unknown>>
  }> = {}
): RecruiterDashboardModel {
  return normalizeRecruiterDashboard(
    {
      generatedAt: NOW.toISOString(),
      metrics: overrides.metrics ?? [
        { key: "activeVacancies", count: 6, sourceState: "ready" },
        { key: "upcomingInterviews", count: 2, sourceState: "ready" },
        { key: "staleCandidates", count: 1, sourceState: "ready" },
        { key: "pendingEvaluations", count: 0, sourceState: "ready" },
        { key: "vacanciesWithoutCandidates", count: 0, sourceState: "ready" },
        { key: "vacanciesPresentationOverdue", count: 0, sourceState: "ready" },
        { key: "vacanciesUnpublished", count: 0, sourceState: "ready" },
      ],
      reminders: overrides.reminders ?? [],
      vacancyAttention: overrides.vacancyAttention ?? [],
    },
    NOW
  )
}

function mockHook(
  data: RecruiterDashboardModel | null,
  options: { isLoading?: boolean; error?: string | null } = {}
) {
  useRecruiterDashboardMock.mockReturnValue({
    data,
    isLoading: options.isLoading ?? false,
    error: options.error ?? null,
    reload: reloadMock,
  })
}

function renderDashboard() {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages} timeZone="UTC">
      <RecruiterDashboard />
    </NextIntlClientProvider>
  )
}

beforeEach(() => {
  reloadMock.mockClear()
  useRecruiterDashboardMock.mockReset()
})

describe("RecruiterDashboard", () => {
  it("muestra estado de carga sin cifras inventadas", () => {
    mockHook(null, { isLoading: true })
    renderDashboard()

    expect(
      screen.getByRole("heading", { level: 1, name: "Panel de Recursos Humanos" })
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Actualizando…" })).toBeDisabled()
    expect(screen.getAllByText("Cargando panel…").length).toBeGreaterThan(0)
  })

  it("muestra indicadores, recordatorios accionables y accesos directos", () => {
    mockHook(
      buildModel({
        metrics: [
          { key: "activeVacancies", count: 4, sourceState: "ready" },
          { key: "upcomingInterviews", count: 2, sourceState: "ready" },
          { key: "staleCandidates", count: 1, sourceState: "ready" },
          { key: "pendingEvaluations", count: 0, sourceState: "ready" },
          { key: "vacanciesWithoutCandidates", count: 1, sourceState: "ready" },
          { key: "vacanciesPresentationOverdue", count: 2, sourceState: "ready" },
          { key: "vacanciesUnpublished", count: 3, sourceState: "ready" },
        ],
        vacancyAttention: [
          {
            vacancyId: "v1",
            title: "Analista",
            clientName: "Norte",
            daysOpen: 30,
            candidateCount: 0,
            signal: "critical",
            publicSlug: "analista",
          },
        ],
        reminders: [
          {
            key: "staleCandidates",
            count: 1,
            sourceState: "ready",
            dueAt: "2026-09-01T00:00:00.000Z",
            context: { days: 14 },
          },
        ],
      })
    )
    renderDashboard()

    const vacancies = screen.getByRole("region", { name: "Vacantes" })
    expect(
      within(vacancies).getByRole("link", { name: "Vacantes activas: 4. Ver detalle" })
    ).toHaveAttribute("href", "/portal-rrhh/vacantes?vista=activas")
    expect(
      within(vacancies).getByRole("link", { name: "Sin postulaciones: 1. Ver detalle" })
    ).toHaveAttribute("href", "/portal-rrhh/vacantes?vista=sin-postulaciones")
    expect(
      within(vacancies).getByRole("link", { name: "Fuera de plazo: 2. Ver detalle" })
    ).toHaveAttribute("href", "/portal-rrhh/vacantes?vista=fuera-de-plazo")
    expect(
      within(vacancies).getByRole("link", { name: "No publicadas: 3. Ver detalle" })
    ).toHaveAttribute("href", "/portal-rrhh/vacantes?vista=no-publicadas")
    expect(
      within(vacancies).getByRole("heading", {
        name: "Vacantes que necesitan atención",
      })
    ).toBeInTheDocument()
    expect(
      within(vacancies).getByRole("link", { name: "Abrir vacante Analista" })
    ).toHaveAttribute("href", "/portal-rrhh/vacantes/analista")
    expect(within(vacancies).getByText("Crítica")).toBeInTheDocument()

    const candidates = screen.getByRole("region", { name: "Candidatos" })
    expect(
      within(candidates).queryByRole("link", { name: /Sin postulaciones/ })
    ).not.toBeInTheDocument()
    const reminders = within(candidates).getByRole("region", { name: "Pendientes por atender" })
    const stale = within(reminders).getByRole("article", { name: "Candidatos estancados" })
    expect(within(stale).getByText("Urgente")).toBeInTheDocument()
    expect(
      within(stale).getByText("1 candidato sin cambiar de etapa en 14 días o más.")
    ).toBeInTheDocument()
    expect(
      within(stale).getByRole("link", { name: /Revisar candidatos/ })
    ).toHaveAttribute("href", "/portal-rrhh/recordatorios/staleCandidates")

    const shortcuts = screen.getByRole("region", { name: "Accesos rápidos" })
    expect(
      within(shortcuts).getAllByRole("link").map((link) => link.getAttribute("href"))
    ).toEqual([
      "/portal-rrhh/candidatos",
      "/portal-rrhh/vacantes",
      "/portal-rrhh/entrevistas",
      "/portal-rrhh/configuracion/calendario",
      "/portal-rrhh/reportes",
    ])
  })

  it("muestra estado vacío cuando no hay pendientes con datos", () => {
    mockHook(buildModel())
    renderDashboard()

    expect(screen.getByText("No hay pendientes por ahora.")).toBeInTheDocument()
  })

  it("expone los recordatorios sin fuente en la sección de preparación", () => {
    mockHook(buildModel())
    renderDashboard()

    const section = screen.getByRole("region", { name: "Recordatorios en preparación" })
    expect(within(section).getByText("Consentimientos pendientes")).toBeInTheDocument()
    expect(within(section).getByText("Seguimientos atrasados")).toBeInTheDocument()
    expect(within(section).queryByText("Próximas a vencer presentación")).not.toBeInTheDocument()
    expect(within(section).queryByText("Fuera de plazo de presentación")).not.toBeInTheDocument()
    expect(within(section).getAllByText("Sin datos").length).toBeGreaterThan(0)

    const vacancies = screen.getByRole("region", { name: "Vacantes" })
    expect(within(vacancies).getByText("Próximas a vencer presentación")).toBeInTheDocument()
    expect(within(vacancies).getByText("Fuera de plazo de presentación")).toBeInTheDocument()
    expect(within(vacancies).getByText("Vacantes sin actividad reciente")).toBeInTheDocument()
  })

  it("muestra el error general y permite reintentar cuando falla el panel", () => {
    mockHook(null, { error: "boom" })
    renderDashboard()

    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent("No pudimos cargar el panel")
    expect(screen.getByRole("region", { name: "Vacantes" })).toBeInTheDocument()
    fireEvent.click(within(alert).getByRole("button", { name: "Reintentar" }))
    expect(reloadMock).toHaveBeenCalledTimes(1)
  })

  it("al refrescar solo recarga el dashboard", () => {
    mockHook(buildModel())
    renderDashboard()

    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }))
    expect(reloadMock).toHaveBeenCalledTimes(1)
  })
})
