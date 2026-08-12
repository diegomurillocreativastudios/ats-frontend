import { describe, expect, it } from "vitest"
import { parseRetryAfterSeconds } from "@/lib/auth/retry-after"
import { extractBackendErrorMessage } from "@/lib/auth/server-auth-session"

describe("parseRetryAfterSeconds", () => {
  it("usa el valor numérico del header", () => {
    expect(parseRetryAfterSeconds("90")).toBe(90)
  })

  it("cae al fallback si el header es inválido", () => {
    expect(parseRetryAfterSeconds(null)).toBe(60)
    expect(parseRetryAfterSeconds("abc")).toBe(60)
    expect(parseRetryAfterSeconds("0")).toBe(60)
  })
})

describe("extractBackendErrorMessage (login hardening)", () => {
  it("lee detail del ProblemDetails del backend", () => {
    expect(
      extractBackendErrorMessage(
        { detail: "Correo o contraseña incorrectos." },
        "fallback"
      )
    ).toBe("Correo o contraseña incorrectos.")
  })

  it("conserva el mensaje de segundo factor", () => {
    const twoFactor =
      "Debe completar el segundo factor de autenticación (código o código de recuperación)."
    expect(extractBackendErrorMessage({ detail: twoFactor }, "fallback")).toBe(
      twoFactor
    )
  })
})
