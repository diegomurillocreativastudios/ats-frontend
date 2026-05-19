import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  BIRTH_DATE_INPUT_INVALID_MESSAGE,
  getBirthDateInputValidationError,
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
