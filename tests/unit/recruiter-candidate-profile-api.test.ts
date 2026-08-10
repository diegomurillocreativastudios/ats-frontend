import { describe, expect, it } from "vitest"
import {
  buildRecruiterCandidateProfilePutPayload,
  extractRecruiterCandidateDetail,
  parseNormalizedDataField,
} from "@/lib/recruiter-candidate-profile-api"
import type { CandidateProfileSaveBody } from "@/lib/candidate-profile"
import {
  emptyEduRow,
  emptyLangRow,
  emptyRefRow,
  emptyWorkRow,
} from "@/lib/candidate-profile-structured"
import type { FullProfileFormInput } from "@/lib/candidate-profile"
import { buildCandidateProfileSaveBody } from "@/lib/candidate-profile"

const minimalForm = (): FullProfileFormInput => ({
  headline: "Ingeniero",
  summary: "Resumen de prueba",
  resumeMarkdown: "# CV\nContenido",
  nationalId: "12345678-9",
  firstName: "Ana",
  lastName: "García",
  country: "Chile",
  birthDateInput: "1990-05-15",
  birthCity: "Santiago",
  maritalStatus: "Soltero",
  gender: "Femenino",
  minSalary: "",
  availability: "",
  hasDisabilityChoice: "",
  email: "ana@example.com",
  phoneNumber: "+56912345678",
  videoLink: "",
  sectors: [],
  jobDesiredRole: "Desarrolladora",
  jobMinSalary: "",
  jobEducationLevel: "",
  jobDesiredCity: "",
  jobAvailability: "",
  jobDisability: "",
  workRows: [emptyWorkRow()],
  educationRows: [emptyEduRow()],
  languageRows: [emptyLangRow()],
  skillsText: "React\nTypeScript",
  socialRows: [],
  referenceRows: [emptyRefRow()],
  recognitionsText: "",
})

describe("parseNormalizedDataField", () => {
  it("parses JSON string normalizedData", () => {
    const result = parseNormalizedDataField('{"FirstName":"Ana"}')
    expect(result.parseFailed).toBe(false)
    expect(result.normalizedData).toEqual({ FirstName: "Ana" })
  })
})

describe("extractRecruiterCandidateDetail", () => {
  it("extracts id and normalizedData from wrapped response", () => {
    const result = extractRecruiterCandidateDetail({
      data: {
        id: "abc-123",
        normalizedData: { FirstName: "Diego" },
      },
    })
    expect(result.id).toBe("abc-123")
    expect(result).not.toHaveProperty("storagePath")
    expect(result.normalizedData).toEqual({ FirstName: "Diego" })
  })

  it("ignores storagePath if present in API payload", () => {
    const result = extractRecruiterCandidateDetail({
      id: "abc-123",
      storagePath: "cvs/file.pdf",
      normalizedData: { FirstName: "Diego" },
    })
    expect(result.id).toBe("abc-123")
    expect(result).not.toHaveProperty("storagePath")
    expect(result.normalizedData).toEqual({ FirstName: "Diego" })
  })
})

describe("buildRecruiterCandidateProfilePutPayload", () => {
  it("includes candidateProfile fields from save body", () => {
    const candidateProfile: CandidateProfileSaveBody = {
      headline: "Dev",
      summary: "Sum",
      resumeMarkdown: "# md",
      nationalId: "111",
      firstName: "Ana",
      lastName: "López",
      email: "ana@test.com",
    }
    const payload = buildRecruiterCandidateProfilePutPayload(candidateProfile, {})
    expect(payload.candidateProfile).toEqual(candidateProfile)
    expect(payload.candidateProfile.firstName).toBe("Ana")
  })

  it("merges PascalCase layer over existing normalizedData", () => {
    const form = minimalForm()
    const existing = { LegacyField: "keep", FirstName: "Old" }
    const payload = buildRecruiterCandidateProfilePutPayload(
      buildCandidateProfileSaveBody(form),
      existing
    )
    expect(payload.normalizedData?.LegacyField).toBe("keep")
    expect(payload.normalizedData?.FirstName).toBe("Ana")
    expect(payload.normalizedData?.Skills).toEqual(["React", "TypeScript"])
  })

  it("does not include id or storagePath in the body", () => {
    const payload = buildRecruiterCandidateProfilePutPayload(
      buildCandidateProfileSaveBody(minimalForm()),
      { id: "x", LegacyField: "keep" }
    )
    expect(payload).not.toHaveProperty("id")
    expect(payload).not.toHaveProperty("storagePath")
    expect(payload.normalizedData?.id).toBe("x")
    expect(payload.normalizedData?.LegacyField).toBe("keep")
  })
})
