import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar"
import * as calendarLib from "@/lib/google-calendar"

vi.mock("@/lib/google-calendar", () => ({
  checkCalendarStatus: vi.fn(),
  disconnectGoogleCalendar: vi.fn(),
  getGoogleAuthUrl: vi.fn(),
  syncCalendarEvents: vi.fn(),
}))

describe("useGoogleCalendar", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("carga el estado del calendario al montar", async () => {
    vi.mocked(calendarLib.checkCalendarStatus).mockResolvedValue({
      isConnected: true,
      email: "test@gmail.com",
      connectedAt: new Date().toISOString(),
    })

    const { result } = renderHook(() => useGoogleCalendar())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.status.isConnected).toBe(true)
    expect(result.current.status.email).toBe("test@gmail.com")
  })

  it("connect llama getGoogleAuthUrl y asigna location", async () => {
    vi.mocked(calendarLib.checkCalendarStatus).mockResolvedValue({
      isConnected: false,
      email: "",
      connectedAt: null,
    })
    vi.mocked(calendarLib.getGoogleAuthUrl).mockResolvedValue(
      "https://accounts.google.com/o/oauth2/v2/auth?client=test"
    )

    const { result } = renderHook(() => useGoogleCalendar())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const assign = vi.fn()
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "", assign },
    })

    await result.current.connect()

    expect(calendarLib.getGoogleAuthUrl).toHaveBeenCalled()
    expect(window.location.href).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth?client=test"
    )
  })

  it("connect no navega cuando getGoogleAuthUrl falla", async () => {
    vi.mocked(calendarLib.checkCalendarStatus).mockResolvedValue({
      isConnected: false,
      email: "",
      connectedAt: null,
    })
    vi.mocked(calendarLib.getGoogleAuthUrl).mockRejectedValue(
      new Error("La URL de autorización de Google no es válida")
    )

    const { result } = renderHook(() => useGoogleCalendar())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "https://app.example/portal-rrhh/configuracion/calendario" },
    })

    await result.current.connect()

    expect(window.location.href).toBe(
      "https://app.example/portal-rrhh/configuracion/calendario"
    )
    await waitFor(() => {
      expect(result.current.error).toContain("no es válida")
    })
  })
})
