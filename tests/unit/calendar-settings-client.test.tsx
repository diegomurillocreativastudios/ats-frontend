import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import esMessages from "@/messages/es.json"
import { CalendarSettingsClient } from "@/app/portal-rrhh/configuracion/calendario/calendar-settings-client"

const calendarState = vi.hoisted(() => ({
  status: {
    isConnected: false,
    email: "",
    connectedAt: null as string | null,
  },
  isLoading: false,
  error: null as string | null,
  isSyncing: false,
}))

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
}))

vi.mock("@/hooks/useGoogleCalendar", () => ({
  useGoogleCalendar: () => ({
    status: calendarState.status,
    isLoading: calendarState.isLoading,
    error: calendarState.error,
    isSyncing: calendarState.isSyncing,
    refresh: vi.fn(),
    sync: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}))

vi.mock("@/components/ui/Snackbar", () => ({ default: () => null }))

function renderPage() {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      <CalendarSettingsClient />
    </NextIntlClientProvider>,
  )
}

describe("CalendarSettingsClient", () => {
  beforeEach(() => {
    calendarState.status = {
      isConnected: false,
      email: "",
      connectedAt: null,
    }
    calendarState.isLoading = false
    calendarState.error = null
    calendarState.isSyncing = false
  })

  it("muestra el estado vacío con beneficios y el botón de conectar", () => {
    renderPage()

    expect(screen.getByRole("heading", { name: "Calendario" })).toBeInTheDocument()
    expect(screen.getByText("No conectado")).toBeInTheDocument()
    expect(
      screen.getByText(
        "Al conectar, autorizás a Applican Tree a crear eventos de entrevista e invitaciones en tu Google Calendar.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByText("Qué vas a poder hacer")).toBeInTheDocument()
    expect(
      screen.getByText("Crear eventos de entrevista en tu calendario"),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Conectar Google Calendar" }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/backend/i)).not.toBeInTheDocument()
  })

  it("muestra la cuenta y la fecha cuando el calendario está conectado", () => {
    calendarState.status = {
      isConnected: true,
      email: "recruiter@applican.test",
      connectedAt: "2026-03-15T12:00:00.000Z",
    }

    renderPage()

    expect(screen.getByText("Conectado")).toBeInTheDocument()
    expect(screen.getByText("recruiter@applican.test")).toBeInTheDocument()
    expect(screen.getByText(/2026/)).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Sincronizar entrevistas" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Desconectar Google Calendar" }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/backend/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/servidor/i)).not.toBeInTheDocument()
  })
})
