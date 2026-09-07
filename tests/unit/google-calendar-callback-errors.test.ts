import { describe, expect, it } from "vitest"
import {
  googleCalendarCallbackErrorI18nKey,
  parseGoogleCalendarCallbackError,
} from "@/lib/google-calendar-callback-errors"

describe("FE-SEC-022 google calendar callback error codes", () => {
  it("accepts only stable codes", () => {
    expect(parseGoogleCalendarCallbackError("missing_code")).toBe("missing_code")
    expect(parseGoogleCalendarCallbackError("session_expired")).toBe(
      "session_expired"
    )
    expect(parseGoogleCalendarCallbackError("connect_denied")).toBe(
      "connect_denied"
    )
    expect(parseGoogleCalendarCallbackError("callback_failed")).toBe(
      "callback_failed"
    )
  })

  it("rejects raw exception text from the query", () => {
    expect(
      parseGoogleCalendarCallbackError("SqlException: connection leaked")
    ).toBeNull()
    expect(parseGoogleCalendarCallbackError("Bearer tok")).toBeNull()
    expect(
      parseGoogleCalendarCallbackError(encodeURIComponent("User denied access"))
    ).toBeNull()
  })

  it("maps codes to i18n keys", () => {
    expect(googleCalendarCallbackErrorI18nKey("callback_failed")).toBe(
      "oauthErrors.callback_failed"
    )
  })
})
