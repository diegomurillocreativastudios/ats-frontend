import { describe, expect, it } from "vitest"

import {
  getCvOutputLanguageErrorKind,
  omitCvOutputLanguageFieldError,
  toCvOutputLanguage,
} from "@/lib/cv-output-language"

describe("toCvOutputLanguage", () => {
  it("maps every supported UI locale to the backend code", () => {
    expect(toCvOutputLanguage("es")).toBe("ES")
    expect(toCvOutputLanguage("en")).toBe("EN")
    expect(toCvOutputLanguage("it")).toBe("IT")
    expect(toCvOutputLanguage("fr")).toBe("FR")
    expect(toCvOutputLanguage("de")).toBe("DE")
  })

  it("normalizes casing and whitespace", () => {
    expect(toCvOutputLanguage(" EN ")).toBe("EN")
  })

  it("falls back to ES for unknown or missing locales", () => {
    expect(toCvOutputLanguage("gr")).toBe("ES")
    expect(toCvOutputLanguage("pt")).toBe("ES")
    expect(toCvOutputLanguage(undefined)).toBe("ES")
    expect(toCvOutputLanguage(null)).toBe("ES")
  })
})

describe("getCvOutputLanguageErrorKind", () => {
  it("detects the 400 invalid language error with code", () => {
    const err = Object.assign(new Error("Solicitud fallida (400)"), {
      status: 400,
      body: {
        message: "The submitted payload is invalid.",
        code: "OUTPUT_LANGUAGE_INVALID",
        errors: {
          outputLanguage: ["outputLanguage must be one of: ES, EN, IT, FR, DE."],
        },
      },
    })
    expect(getCvOutputLanguageErrorKind(err)).toBe("invalid")
  })

  it("detects the 400 invalid language error without code", () => {
    expect(
      getCvOutputLanguageErrorKind({
        errors: { OutputLanguage: ["outputLanguage is required."] },
      })
    ).toBe("invalid")
    expect(
      getCvOutputLanguageErrorKind({
        Errors: { outputLanguage: "outputLanguage is required." },
      })
    ).toBe("invalid")
  })

  it("detects the 422 language mismatch", () => {
    const err = Object.assign(new Error("x"), {
      status: 422,
      body: {
        message: "CV output could not be produced in the requested language.",
        code: "CV_OUTPUT_LANGUAGE_MISMATCH",
        outputLanguage: "EN",
      },
    })
    expect(getCvOutputLanguageErrorKind(err)).toBe("mismatch")
  })

  it("ignores unrelated errors", () => {
    expect(getCvOutputLanguageErrorKind(null)).toBeNull()
    expect(getCvOutputLanguageErrorKind(new Error("boom"))).toBeNull()
    expect(
      getCvOutputLanguageErrorKind({ errors: { email: ["Correo inválido"] } })
    ).toBeNull()
    expect(
      getCvOutputLanguageErrorKind({ code: "AUTH_CONSENT_VALIDATION" })
    ).toBeNull()
  })
})

describe("omitCvOutputLanguageFieldError", () => {
  it("drops outputLanguage regardless of casing and keeps visible fields", () => {
    expect(
      omitCvOutputLanguageFieldError({
        outputLanguage: "required",
        OutputLanguage: "required",
        email: "Correo inválido",
      })
    ).toEqual({ email: "Correo inválido" })
  })
})
