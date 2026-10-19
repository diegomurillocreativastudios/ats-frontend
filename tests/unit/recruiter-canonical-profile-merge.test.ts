import { describe, expect, it } from "vitest"
import {
  candidateProfilePayloadToRecruiterNormalizedLayer,
  mergeRecruiterNormalizedWithCanonicalProfile,
} from "@/lib/recruiter-canonical-profile-merge"

describe("candidateProfilePayloadToRecruiterNormalizedLayer", () => {
  it("copies minSalary onto MinSalary", () => {
    const layer = candidateProfilePayloadToRecruiterNormalizedLayer({
      firstName: "Ana",
      lastName: "García",
      minSalary: 2750,
    })
    expect(layer.MinSalary).toBe(2750)
  })
})

describe("mergeRecruiterNormalizedWithCanonicalProfile", () => {
  it("overlays MinSalary from canonical profile onto recruiter normalizedData", () => {
    const merged = mergeRecruiterNormalizedWithCanonicalProfile(
      { FirstName: "From", LastName: "Detail" },
      { firstName: "From", lastName: "Profile", minSalary: 3600 }
    )
    expect(merged.MinSalary).toBe(3600)
    expect(merged.LastName).toBe("Profile")
  })
})
