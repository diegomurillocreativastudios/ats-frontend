import { describe, expect, it } from "vitest"
import { resolveCandidateMinSalary } from "@/components/candidato/candidate-salary-expectation-card"

describe("resolveCandidateMinSalary", () => {
  it("prefers edit value when provided", () => {
    expect(resolveCandidateMinSalary({ MinSalary: 500 }, 4000, "2500")).toBe(2500)
  })

  it("prefers profile.minSalary over JobPreferences from CV", () => {
    expect(resolveCandidateMinSalary({ MinSalary: 500 }, 4000)).toBe(4000)
    expect(resolveCandidateMinSalary({ minSalary: 500 }, 4000)).toBe(4000)
  })

  it("falls back to JobPreferences when profile.minSalary is absent", () => {
    expect(resolveCandidateMinSalary({ MinSalary: 500 }, null)).toBe(500)
    expect(resolveCandidateMinSalary({ MinSalary: 500 }, undefined)).toBe(500)
  })

  it("returns null when neither source has a value", () => {
    expect(resolveCandidateMinSalary({}, null)).toBeNull()
    expect(resolveCandidateMinSalary(null, null)).toBeNull()
  })
})
