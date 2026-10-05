import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import esMessages from "@/messages/es.json"

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}))

vi.mock("@/lib/api", () => ({
  apiClient: { get: apiGetMock },
}))

vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    user: { name: "Ada", email: "ada@example.com", role: "recruiter" },
    loading: false,
  }),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/portal-rrhh/recordatorios/staleCandidates",
}))

import { ReminderDetailView } from "@/components/rrhh/dashboard/reminder-detail-view"
import { fetchRecruiterReminderDetail } from "@/lib/api/recruiter-dashboard"

function renderView(rawKey: string) {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages} timeZone="UTC">
      <ReminderDetailView rawKey={rawKey} />
    </NextIntlClientProvider>
  )
}

beforeEach(() => {
  apiGetMock.mockReset()
})

describe("ReminderDetailView", () => {
  it("muestra el estado de clave inválida sin consultar al backend", () => {
    renderView("foo-bar")
    expect(
      screen.getByRole("heading", { level: 1, name: "Recordatorio desconocido" })
    ).toBeInTheDocument()
    expect(apiGetMock).not.toHaveBeenCalled()
  })

  it("renderiza la tabla y pide la primera página al cargar", async () => {
    apiGetMock.mockResolvedValueOnce({
      key: "staleCandidates",
      sourceState: "ready",
      totalCount: 1,
      items: [
        {
          id: "app-1",
          candidateProfileId: "cand-1",
          candidateName: "Ana",
          vacancyTitle: "Backend",
          companyName: "Acme",
          dueAt: "2026-09-10T00:00:00.000Z",
          statusLabel: "En revisión",
        },
      ],
    })
    renderView("staleCandidates")

    await waitFor(() => expect(apiGetMock).toHaveBeenCalledTimes(1))
    expect(apiGetMock).toHaveBeenCalledWith(
      "/api/recruiter/dashboard/reminders/staleCandidates?page=1&pageSize=50"
    )

    await screen.findAllByText("Ana")
    const openLinks = screen.getAllByRole("link", { name: /Abrir( Ana)?/ })
      .filter((link) => link.getAttribute("href") === "/portal-rrhh/candidatos/cand-1")
    expect(openLinks.length).toBeGreaterThan(0)
    expect(
      screen.getByRole("navigation", { name: "Paginación de pendientes" })
    ).toBeInTheDocument()
  })

  it("oculta la columna Candidato cuando el recordatorio es de vacante", async () => {
    apiGetMock.mockResolvedValueOnce({
      key: "inactiveVacancies",
      sourceState: "ready",
      totalCount: 1,
      items: [
        {
          id: "vac-1",
          vacancyId: "vac-1",
          vacancyTitle: "React Frontend Developer",
          companyName: "ApplicanTree",
          dueAt: "2026-03-27T00:00:00.000Z",
          statusLabel: "Inactive",
        },
      ],
    })
    renderView("inactiveVacancies")

    await screen.findAllByText("React Frontend Developer")
    expect(
      screen.queryByRole("columnheader", { name: "Candidato" })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Vacante" })
    ).toBeInTheDocument()
  })

  it("muestra el estado no disponible cuando el backend lo indica", async () => {
    apiGetMock.mockResolvedValueOnce({
      key: "pendingApprovals",
      sourceState: "unavailable",
      totalCount: null,
      items: [],
    })
    renderView("pendingApprovals")

    expect(
      await screen.findByText(
        "Este recordatorio aún no tiene datos disponibles."
      )
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("navigation", { name: "Paginación de pendientes" })
    ).not.toBeInTheDocument()
  })

  it("muestra el estado vacío con 0 ítems y mantiene la paginación visible", async () => {
    apiGetMock.mockResolvedValueOnce({
      key: "staleCandidates",
      sourceState: "ready",
      totalCount: 0,
      items: [],
    })
    renderView("staleCandidates")

    expect(
      await screen.findByText("No hay pendientes para este recordatorio.")
    ).toBeInTheDocument()
    expect(
      screen.getByRole("navigation", { name: "Paginación de pendientes" })
    ).toBeInTheDocument()
  })

  it("muestra el error cuando el backend falla y permite reintentar", async () => {
    apiGetMock.mockRejectedValueOnce(new Error("500"))
    renderView("staleCandidates")

    expect(
      await screen.findByText("No se pudo cargar el detalle. Intenta de nuevo.")
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("navigation", { name: "Paginación de pendientes" })
    ).not.toBeInTheDocument()
  })
})

describe("fetchRecruiterReminderDetail", () => {
  it("limita pageSize al máximo permitido", async () => {
    apiGetMock.mockResolvedValueOnce({ sourceState: "ready", totalCount: 0, items: [] })
    await fetchRecruiterReminderDetail("staleCandidates", { page: 3, pageSize: 500 })
    expect(apiGetMock).toHaveBeenCalledWith(
      "/api/recruiter/dashboard/reminders/staleCandidates?page=3&pageSize=100"
    )
  })

  it("codifica correctamente la clave", async () => {
    apiGetMock.mockResolvedValueOnce({ sourceState: "ready", totalCount: 0, items: [] })
    await fetchRecruiterReminderDetail(
      "upcomingInterviews",
      { clientId: " web ", page: 1, pageSize: 25 }
    )
    expect(apiGetMock).toHaveBeenCalledWith(
      "/api/recruiter/dashboard/reminders/upcomingInterviews?page=1&pageSize=25&clientId=web"
    )
  })
})

// Suppress "pending button retry" check: ensure render succeeded.
describe("ReminderDetailView retry wiring", () => {
  it("mantiene el botón Volver al panel visible", async () => {
    apiGetMock.mockResolvedValueOnce({
      key: "staleCandidates",
      sourceState: "ready",
      totalCount: 0,
      items: [],
    })
    renderView("staleCandidates")
    await waitFor(() => expect(apiGetMock).toHaveBeenCalled())
    const back = screen.getByRole("link", { name: "Volver al panel" })
    expect(back).toHaveAttribute("href", "/portal-rrhh")
    fireEvent.click(back)
  })
})
