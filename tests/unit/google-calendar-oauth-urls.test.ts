import { describe, it, expect, vi, afterEach } from "vitest"
import {
  GOOGLE_CALENDAR_SETTINGS_PATH,
  getGoogleCalendarFrontendOAuthUrls,
} from "@/lib/google-calendar-oauth-urls"

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
