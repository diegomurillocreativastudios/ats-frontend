import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import SsoSuccessContent from "@/app/auth/sso/success/SsoSuccessContent"
import esMessages from "@/messages/es.json"

const replaceMock = vi.fn()
let searchParamsValue = new URLSearchParams()
const replaceStateMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  useSearchParams: () => searchParamsValue,
}))

describe("SsoSuccessContent", () => {
  beforeEach(() => {
    replaceMock.mockReset()
    replaceStateMock.mockReset()
    searchParamsValue = new URLSearchParams()
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })
    )
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        origin: "http://localhost",
        href: "http://localhost/auth/sso/success",
        pathname: "/auth/sso/success",
        search: "",
        hash: "",
      },
    })
    window.history.replaceState = replaceStateMock
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function renderPage() {
    return render(
      <NextIntlClientProvider locale="es" messages={esMessages}>
        <SsoSuccessContent />
      </NextIntlClientProvider>
    )
  }

  function setLocation(partial: {
    href?: string
    search?: string
    hash?: string
  }) {
    const search = partial.search ?? ""
    const hash = partial.hash ?? ""
    const pathname = "/auth/sso/success"
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        origin: "http://localhost",
        href:
          partial.href ??
          `http://localhost${pathname}${search}${hash}`,
        pathname,
        search,
        hash,
      },
    })
  }

  it("shows error when hash code is missing", async () => {
    setLocation({ href: "http://localhost/auth/sso/success", hash: "" })
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId("auth-sso-error")).toBeInTheDocument()
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it("shows error when oauth error query is present", async () => {
    searchParamsValue = new URLSearchParams("error=access_denied")
    setLocation({
      href: "http://localhost/auth/sso/success?error=access_denied",
      search: "?error=access_denied",
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId("auth-sso-error")).toBeInTheDocument()
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it("shows account_exists message when reason query is present", async () => {
    searchParamsValue = new URLSearchParams("reason=account_exists")
    setLocation({
      href: "http://localhost/auth/sso/success?reason=account_exists",
      search: "?reason=account_exists",
    })
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

  it("does not exchange when code is only in query (no hash fallback)", async () => {
    searchParamsValue = new URLSearchParams("code=abc123")
    setLocation({
      href: "http://localhost/auth/sso/success?code=abc123",
      search: "?code=abc123",
      hash: "",
    })
    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId("auth-sso-error")).toBeInTheDocument()
    })
    expect(fetch).not.toHaveBeenCalled()
    expect(replaceStateMock).toHaveBeenCalledWith(
      {},
      "",
      "http://localhost/auth/sso/success"
    )
  })

  it("calls local exchange route once from hash and redirects", async () => {
    setLocation({
      href: "http://localhost/auth/sso/success#code=abc123",
      hash: "#code=abc123",
    })
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
    expect(replaceStateMock).toHaveBeenCalledWith(
      {},
      "",
      "http://localhost/auth/sso/success"
    )
  })

  it("clears hash while keeping returnUrl query", async () => {
    searchParamsValue = new URLSearchParams("returnUrl=%2Fportal-rrhh")
    setLocation({
      href: "http://localhost/auth/sso/success?returnUrl=%2Fportal-rrhh#code=abc123",
      search: "?returnUrl=%2Fportal-rrhh",
      hash: "#code=abc123",
    })
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response)

    renderPage()

    await waitFor(() => {
      expect(replaceStateMock).toHaveBeenCalledWith(
        {},
        "",
        "http://localhost/auth/sso/success?returnUrl=%2Fportal-rrhh"
      )
    })
  })

  it("redirects to internal returnUrl from exchange response", async () => {
    setLocation({
      href: "http://localhost/auth/sso/success#code=abc123",
      hash: "#code=abc123",
    })
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
