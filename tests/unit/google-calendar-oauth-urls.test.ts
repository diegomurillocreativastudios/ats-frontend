import { describe, it, expect, vi, afterEach } from "vitest"
import {
  GOOGLE_CALENDAR_SETTINGS_PATH,
  getGoogleCalendarFrontendOAuthUrls,
  isAllowedGoogleOAuthAuthorizeUrl,
} from "@/lib/google-calendar-oauth-urls"

describe("isAllowedGoogleOAuthAuthorizeUrl", () => {
  it("accepts official Google OAuth authorize URLs", () => {
    expect(
      isAllowedGoogleOAuthAuthorizeUrl(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id=x"
      )
    ).toBe(true)
    expect(
      isAllowedGoogleOAuthAuthorizeUrl(
        "https://accounts.google.com/o/oauth2/auth?client_id=x"
      )
    ).toBe(true)
  })

  it("rejects non-Google hosts, schemes, and lookalikes", () => {
    expect(isAllowedGoogleOAuthAuthorizeUrl(null)).toBe(false)
    expect(isAllowedGoogleOAuthAuthorizeUrl("")).toBe(false)
    expect(
      isAllowedGoogleOAuthAuthorizeUrl(
        "http://accounts.google.com/o/oauth2/v2/auth"
      )
    ).toBe(false)
    expect(
      isAllowedGoogleOAuthAuthorizeUrl(
        "https://evil.com/o/oauth2/v2/auth"
      )
    ).toBe(false)
    expect(
      isAllowedGoogleOAuthAuthorizeUrl(
        "https://accounts.google.com.evil.com/o/oauth2/v2/auth"
      )
    ).toBe(false)
    expect(
      isAllowedGoogleOAuthAuthorizeUrl(
        "https://accounts.google.com/login"
      )
    ).toBe(false)
    expect(
      isAllowedGoogleOAuthAuthorizeUrl("javascript:alert(1)")
    ).toBe(false)
    expect(
      isAllowedGoogleOAuthAuthorizeUrl(
        "https://user:pass@accounts.google.com/o/oauth2/v2/auth"
      )
    ).toBe(false)
  })
})

describe("getGoogleCalendarFrontendOAuthUrls", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("usa el origin del navegador cuando hay window (p. ej. al pulsar Conectar)", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://ignored-in-browser.example")
    const origin = "https://ats.ejemplo.com"
    vi.stubGlobal("window", {
      location: { origin },
    })
    const u = getGoogleCalendarFrontendOAuthUrls()
    expect(u.frontendErrorUrl).toBe(
      `${origin}${GOOGLE_CALENDAR_SETTINGS_PATH}`
    )
    expect(u.frontendSuccessUrl).toBe(
      `${origin}${GOOGLE_CALENDAR_SETTINGS_PATH}?success=true`
    )
  })

  it("respeta overrides por env", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_GOOGLE_CALENDAR_SUCCESS_URL",
      "https://custom/success"
    )
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CALENDAR_ERROR_URL", "https://custom/err")
    const u = getGoogleCalendarFrontendOAuthUrls()
    expect(u).toEqual({
      frontendSuccessUrl: "https://custom/success",
      frontendErrorUrl: "https://custom/err",
    })
  })
})
