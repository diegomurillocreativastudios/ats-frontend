import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import SsoSuccessContent from "@/app/auth/sso/success/SsoSuccessContent"
import esMessages from "@/messages/es.json"

const replaceMock = vi.fn()
let searchParamsValue = new URLSearchParams()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  useSearchParams: () => searchParamsValue,
}))

describe("SsoSuccessContent", () => {
  beforeEach(() => {
    replaceMock.mockReset()
    searchParamsValue = new URLSearchParams()
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })
    )
  })

  function renderPage() {
    return render(
      <NextIntlClientProvider locale="es" messages={esMessages}>
        <SsoSuccessContent />
      </NextIntlClientProvider>
    )
  }

  it("shows error when code is missing", async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId("auth-sso-error")).toBeInTheDocument()
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it("shows error when oauth error query is present", async () => {
    searchParamsValue = new URLSearchParams("error=access_denied")
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId("auth-sso-error")).toBeInTheDocument()
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it("shows account_exists message when reason query is present", async () => {
    searchParamsValue = new URLSearchParams("reason=account_exists")
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId("auth-sso-error")).toBeInTheDocument()
    })
    expect(
      screen.getByText(
        "Ya existe una cuenta con este correo. Inicia sesión con tu correo y contraseña."
      )
    ).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("calls local exchange route once and redirects", async () => {
    searchParamsValue = new URLSearchParams("code=abc123")
    renderPage()

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/sso/exchange"),
        expect.objectContaining({
          method: "POST",
          credentials: "include",
          body: JSON.stringify({ code: "abc123" }),
        })
      )
    })

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/seleccion-portal")
    })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("redirects to internal returnUrl from exchange response", async () => {
    searchParamsValue = new URLSearchParams("code=abc123")
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, returnUrl: "/portal-rrhh" }),
    } as Response)

    renderPage()

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/portal-rrhh")
    })
  })
})
