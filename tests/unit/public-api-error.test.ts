import { describe, expect, it } from "vitest"
import {
  looksLikeTechnicalErrorMessage,
  toPublicApiErrorMessage,
} from "@/lib/security/public-api-error"

describe("FE-SEC-022 public API error helper", () => {
  it("forwards short product copy on safe 4xx statuses", () => {
    expect(
      toPublicApiErrorMessage(
        400,
        { message: "La contraseña es requerida" },
        "fallback"
      )
    ).toBe("La contraseña es requerida")
    expect(
      toPublicApiErrorMessage(429, { detail: "Demasiados intentos" }, "fallback")
    ).toBe("Demasiados intentos")
  })

  it("replaces 5xx and technical noise with the fallback", () => {
    expect(
      toPublicApiErrorMessage(500, { message: "Internal error" }, "generic")
    ).toBe("generic")
    expect(
      toPublicApiErrorMessage(
        400,
        { detail: "The value 'id-invalido-00000-test' is not valid." },
        "generic"
      )
    ).toBe("generic")
    expect(
      looksLikeTechnicalErrorMessage(
        '{"type":"https://tools.ietf.org/html/rfc9110","traceId":"00-abc"}'
      )
    ).toBe(true)
  })
})
