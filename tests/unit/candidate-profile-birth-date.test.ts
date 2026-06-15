import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  BIRTH_DATE_INPUT_INVALID_MESSAGE,
  getBirthDateInputValidationError,
  getBirthDateInputValidationErrorCode,
} from "@/lib/candidate-profile"

describe("getBirthDateInputValidationError", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-19T12:00:00"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns null for empty input", () => {
    expect(getBirthDateInputValidationError("")).toBeNull()
    expect(getBirthDateInputValidationError("   ")).toBeNull()
  })

  it("returns null for a valid adult birth date", () => {
    expect(getBirthDateInputValidationError("1990-05-15")).toBeNull()
  })

  it("returns null on the 18th birthday", () => {
    expect(getBirthDateInputValidationError("2008-05-19")).toBeNull()
  })

  it("rejects a date one day before turning 18", () => {
    expect(getBirthDateInputValidationError("2008-05-20")).toBe(
      BIRTH_DATE_INPUT_INVALID_MESSAGE
    )
  })

  it("rejects future dates", () => {
    expect(getBirthDateInputValidationError("2027-01-01")).toBe(
      BIRTH_DATE_INPUT_INVALID_MESSAGE
    )
  })

  it("rejects today as birth date", () => {
    expect(getBirthDateInputValidationError("2026-05-19")).toBe(
      BIRTH_DATE_INPUT_INVALID_MESSAGE
    )
  })

  it("rejects invalid calendar dates", () => {
    expect(getBirthDateInputValidationError("1990-02-30")).toBe(
      BIRTH_DATE_INPUT_INVALID_MESSAGE
    )
  })
})

describe("getBirthDateInputValidationErrorCode (Etapa 5E)", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-19T12:00:00"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns null for empty or valid adult dates", () => {
    expect(getBirthDateInputValidationErrorCode("")).toBeNull()
    expect(getBirthDateInputValidationErrorCode("1990-05-15")).toBeNull()
    expect(getBirthDateInputValidationErrorCode("2008-05-19")).toBeNull()
  })

  it("distingue el código para fecha inválida de calendario", () => {
    expect(getBirthDateInputValidationErrorCode("1990-02-30")).toBe("invalid")
  })

  it("distingue el código para fecha futura", () => {
    expect(getBirthDateInputValidationErrorCode("2027-01-01")).toBe("futureDate")
  })

  it("distingue el código para menor de edad", () => {
    expect(getBirthDateInputValidationErrorCode("2008-05-20")).toBe("tooYoung")
    expect(getBirthDateInputValidationErrorCode("2026-05-19")).toBe("tooYoung")
  })

  it("la variante string mapea cualquier código al mensaje genérico (compatibilidad)", () => {
    expect(getBirthDateInputValidationError("1990-02-30")).toBe(
      BIRTH_DATE_INPUT_INVALID_MESSAGE
    )
    expect(getBirthDateInputValidationError("2027-01-01")).toBe(
      BIRTH_DATE_INPUT_INVALID_MESSAGE
    )
    expect(getBirthDateInputValidationError("2008-05-20")).toBe(
      BIRTH_DATE_INPUT_INVALID_MESSAGE
    )
  })
})
