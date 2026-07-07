import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { LinkedInLoginButton } from "@/components/auth/LinkedInLoginButton"
import esMessages from "@/messages/es.json"

let searchParamsValue = new URLSearchParams()

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParamsValue,
}))

describe("LinkedInLoginButton", () => {
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL

  beforeEach(() => {
    searchParamsValue = new URLSearchParams()
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:10000"
    vi.stubGlobal("location", { href: "" })
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = originalApiUrl
    vi.unstubAllGlobals()
  })

  function renderButton() {
    return render(
      <NextIntlClientProvider locale="es" messages={esMessages}>
        <LinkedInLoginButton />
      </NextIntlClientProvider>
    )
  }

  it("renders with data-testid and label", () => {
    renderButton()
    expect(screen.getByTestId("auth-linkedin-login")).toBeInTheDocument()
    expect(screen.getByText("Continuar con LinkedIn")).toBeInTheDocument()
  })

  it("redirects to backend login without returnUrl", () => {
    renderButton()
    fireEvent.click(screen.getByTestId("auth-linkedin-login"))
    expect(window.location.href).toBe(
      "http://localhost:10000/api/auth/linkedin/login"
    )
  })

  it("maps internal from to backend returnUrl", () => {
    searchParamsValue = new URLSearchParams("from=/portal-rrhh")
    renderButton()
    fireEvent.click(screen.getByTestId("auth-linkedin-login"))
    expect(window.location.href).toBe(
      "http://localhost:10000/api/auth/linkedin/login?returnUrl=%2Fportal-rrhh"
    )
  })

  it("ignores external from values", () => {
    searchParamsValue = new URLSearchParams("from=https://evil.com")
    renderButton()
    fireEvent.click(screen.getByTestId("auth-linkedin-login"))
    expect(window.location.href).toBe(
      "http://localhost:10000/api/auth/linkedin/login"
    )
  })
})
