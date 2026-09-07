import { afterEach, describe, expect, it, vi } from "vitest"
import {
  logServerError,
  redactSensitiveText,
} from "@/lib/security/safe-server-log"

describe("FE-SEC-022 safe server log", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("redacts bearer tokens and emails", () => {
    const raw =
      'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.abc user=test@example.com'
    const redacted = redactSensitiveText(raw)
    expect(redacted).not.toMatch(/eyJhbGci/)
    expect(redacted).not.toMatch(/test@example\.com/)
    expect(redacted).toMatch(/Bearer \[REDACTED\]/)
    expect(redacted).toMatch(/\[REDACTED_EMAIL\]/)
  })

  it("logs scope, correlation id and redacted message without stack", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    const err = new Error("Bearer secret-token failed for user@acme.com")
    err.stack = "Error: Bearer secret-token\n    at Object.<anonymous>"
    const id = logServerError("pdf-test", err)
    expect(id).toMatch(/^[a-f0-9]{8}$/)
    expect(spy).toHaveBeenCalledTimes(1)
    const logged = String(spy.mock.calls[0]?.[0] ?? "")
    expect(logged).toContain("[pdf-test]")
    expect(logged).toContain(`id=${id}`)
    expect(logged).not.toContain("secret-token")
    expect(logged).not.toContain("user@acme.com")
    expect(logged).not.toContain("at Object")
  })
})
