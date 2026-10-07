import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { RecruiterDashboard } from "@/components/rrhh/dashboard/recruiter-dashboard"
import {
  normalizeRecruiterDashboard,
  type RecruiterDashboardModel,
} from "@/lib/rrhh/recruiter-dashboard"
import type { VacancyDashboardSnapshot } from "@/lib/rrhh/recruiter-vacancy-dashboard"
import esMessages from "@/messages/es.json"

const { useRecruiterDashboardMock, reloadMock, useRecruiterVacancyDashboardMock, reloadVacanciesMock } =
  vi.hoisted(() => ({
    useRecruiterDashboardMock: vi.fn(),
    reloadMock: vi.fn(),
    useRecruiterVacancyDashboardMock: vi.fn(),
    reloadVacanciesMock: vi.fn(),
  }))

vi.mock("@/hooks/use-recruiter-dashboard", () => ({
  useRecruiterDashboard: useRecruiterDashboardMock,
}))

vi.mock("@/hooks/use-recruiter-vacancy-dashboard", () => ({
  useRecruiterVacancyDashboard: useRecruiterVacancyDashboardMock,
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
      ],
      reminders: overrides.reminders ?? [],
    },
    NOW
  )
}

const EMPTY_VACANCY_SNAPSHOT: VacancyDashboardSnapshot = {
  activeVacancies: 0,
  withoutCandidates: 0,
  overdue: 0,
  unpublished: 0,
  attention: [],
  progressPartial: null,
  listPartial: null,
}

function mockVacancyHook(
  data: VacancyDashboardSnapshot | null = EMPTY_VACANCY_SNAPSHOT,
  options: { isLoading?: boolean; error?: string | null } = {}
) {
  useRecruiterVacancyDashboardMock.mockReturnValue({
    data,
    isLoading: options.isLoading ?? false,
    error: options.error ?? null,
    reload: reloadVacanciesMock,
  })
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
  reloadVacanciesMock.mockClear()
  useRecruiterDashboardMock.mockReset()
  mockVacancyHook()
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
    mockVacancyHook({
      ...EMPTY_VACANCY_SNAPSHOT,
      activeVacancies: 4,
      withoutCandidates: 1,
      overdue: 2,
      unpublished: 3,
      attention: [
        {
          vacancyId: "v1",
          title: "Analista",
          clientName: "Norte",
          daysOpen: 30,
          candidateCount: 0,
          signal: "critical",
          href: "/portal-rrhh/vacantes/analista",
        },
      ],
    })
    mockHook(
      buildModel({
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
      within(vacancies).getByRole("link", { name: "Abrir vacante Analista" })
    ).toHaveAttribute("href", "/portal-rrhh/vacantes/analista")
    expect(within(vacancies).getByText("Crítica")).toBeInTheDocument()

    const candidates = screen.getByRole("region", { name: "Candidatos" })
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
    expect(within(section).queryByText("Vacantes próximas a cerrar")).not.toBeInTheDocument()
    expect(within(section).getAllByText("Sin datos").length).toBeGreaterThan(0)

    const vacancies = screen.getByRole("region", { name: "Vacantes" })
    expect(within(vacancies).getByText("Vacantes próximas a cerrar")).toBeInTheDocument()
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
    expect(reloadVacanciesMock).not.toHaveBeenCalled()
  })

  it("mantiene candidatos cuando falla el recorte de vacantes", () => {
    mockHook(buildModel())
    mockVacancyHook(null, { error: "vacantes" })
    renderDashboard()

    const vacancies = screen.getByRole("region", { name: "Vacantes" })
    expect(within(vacancies).getByRole("alert")).toHaveTextContent(
      "No pudimos cargar las señales de vacantes"
    )
    expect(
      within(vacancies).getByRole("link", { name: "Vacantes activas: sin dato. Ver detalle" })
    ).toHaveAttribute("href", "/portal-rrhh/vacantes?vista=activas")
    const candidates = screen.getByRole("region", { name: "Candidatos" })
    expect(
      within(candidates).getByRole("region", { name: "Pendientes por atender" })
    ).toBeInTheDocument()
  })
})
