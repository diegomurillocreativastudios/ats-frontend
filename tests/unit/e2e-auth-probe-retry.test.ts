import { describe, expect, it } from "vitest"
import {
  authProbeFailureHint,
  isRetryableAuthProbeFailure,
} from "../e2e/helpers/auth-probe"

describe("E2E auth probe retry", () => {
  it("reintenta cold start del API (502/503/504) y cortes de red", () => {
    expect(
      isRetryableAuthProbeFailure({ httpStatus: 502, detail: "HTTP 502" })
    ).toBe(true)
    expect(
      isRetryableAuthProbeFailure({ httpStatus: 503, detail: "HTTP 503" })
    ).toBe(true)
    expect(
      isRetryableAuthProbeFailure({ httpStatus: 504, detail: "HTTP 504" })
    ).toBe(true)
    expect(
      isRetryableAuthProbeFailure({
        httpStatus: null,
        detail: "fetch failed",
      })
    ).toBe(true)
  })

  it("reintenta cuenta bloqueada y no reintenta credenciales inválidas", () => {
    expect(
      isRetryableAuthProbeFailure({
        httpStatus: 401,
        detail: "Cuenta bloqueada temporalmente",
      })
    ).toBe(true)
    expect(
      isRetryableAuthProbeFailure({
        httpStatus: 401,
        detail: "Correo o contraseña incorrectos.",
      })
    ).toBe(false)
    expect(
      isRetryableAuthProbeFailure({ httpStatus: 403, detail: "HTTP 403" })
    ).toBe(false)
  })

  it("el aviso de 5xx apunta al backend, no a secrets faltantes", () => {
    expect(authProbeFailureHint(502)).toMatch(/gateway/i)
    expect(authProbeFailureHint(502)).not.toMatch(/E2E_DEMO_EMAIL/)
    expect(authProbeFailureHint(401)).toMatch(/E2E_DEMO_EMAIL/)
  })
})