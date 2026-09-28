import { describe, expect, it } from "vitest"
import { buildTechnicalSheetTemplateContext } from "@/lib/technical-sheet/template-interpolate"
import {
  buildTechnicalSheetPayloadFromRecruiterApiResponses,
  buildTechnicalSheetPayloadFromRecruiterProfile,
} from "@/lib/technical-sheet/profile-to-technical-sheet-payload"
import type { CandidateProfile } from "@/lib/candidate-profile"

describe("buildTechnicalSheetPayloadFromRecruiterProfile", () => {
  it("maps PascalCase normalizedData into candidate sheet fields", () => {
    const payload = buildTechnicalSheetPayloadFromRecruiterProfile({
      candidateId: "cp-1",
      profile: {
        id: "cp-1",
        normalizedData: {
          FirstName: "Ana",
          LastName: "García",
          Summary: "Desarrolladora senior",
          Country: "El Salvador",
          Skills: ["React", "TypeScript"],
          WorkExperience: [
            {
              Company: "Acme",
              Role: "Dev",
              StartDate: "2020",
              EndDate: "2022",
              Description: "Led frontend. Mentored juniors.",
            },
          ],
          Education: [
            {
              Institution: "UCA",
              Degree: "Ing. Sistemas",
              StartDate: "2014",
              EndDate: "2019",
            },
          ],
          Languages: [{ Language: "Inglés", Level: "B2" }],
          JobPreferences: { Availability: "Inmediata", MinSalary: 2500 },
        },
        normalizedDataRaw: null,
        normalizedDataParseFailed: false,
      },
    })

    expect(payload.candidate).toMatchObject({
      candidateProfileId: "cp-1",
      firstName: "Ana",
      lastName: "García",
      profileSummary: "Desarrolladora senior",
      country: "El Salvador",
      availability: "Inmediata",
      salaryExpectation: "2500",
      technicalSkills: ["React", "TypeScript"],
    })

    const wx = (payload.candidate as Record<string, unknown>).workExperience as Record<
      string,
      unknown
    >[]
    expect(wx[0]).toMatchObject({
      company: "Acme",
      role: "Dev",
      startDate: "2020",
      endDate: "2022",
      description: "Led frontend. Mentored juniors.",
    })

    const ctx = buildTechnicalSheetTemplateContext(payload)
    expect(ctx.header).toMatchObject({ fullName: "Ana García" })
    expect(ctx.candidate).toMatchObject({
      profileSummary: "Desarrolladora senior",
      technicalSkills: ["React", "TypeScript"],
    })
  })

  it("prefers canonical profile fields when present", () => {
    const canonical: CandidateProfile = {
      id: "cp-2",
      firstName: "Diego",
      lastName: "Murillo",
      headline: "Engineer",
      summary: "Canonical summary",
      resumeMarkdown: "",
      nationalId: "123",
      country: "Costa Rica",
      minSalary: 3000,
      availability: "2 semanas",
      skills: ["Node"],
      workExperience: [
        {
          company: "Creativa",
          role: "FE",
          startDate: "2023",
          endDate: "Actual",
          description: "Built ATS",
        },
      ],
      education: [],
      languages: [{ language: "Español", level: "Nativo" }],
    }

    const payload = buildTechnicalSheetPayloadFromRecruiterProfile({
      candidateId: "cp-2",
      profile: {
        id: "cp-2",
        normalizedData: {
          FirstName: "Old",
          LastName: "Name",
          Summary: "Old summary",
          Skills: ["Java"],
        },
        normalizedDataRaw: null,
        normalizedDataParseFailed: false,
      },
      canonicalProfile: canonical,
    })

    expect(payload.candidate).toMatchObject({
      firstName: "Diego",
      lastName: "Murillo",
      profileSummary: "Canonical summary",
      country: "Costa Rica",
      availability: "2 semanas",
      salaryExpectation: "3000",
      technicalSkills: ["Node"],
    })
  })

  it("builds address from country and birth city when Address is missing", () => {
    const payload = buildTechnicalSheetPayloadFromRecruiterProfile({
      candidateId: "cp-addr",
      profile: {
        id: "cp-addr",
        normalizedData: {
          FirstName: "Diego",
          LastName: "Murillo",
          Country: "El Salvador",
          BirthCity: "SAN SALVADOR",
        },
        normalizedDataRaw: null,
        normalizedDataParseFailed: false,
      },
    })
    const cand = payload.candidate as Record<string, unknown>
    expect(cand.address).toBe("El Salvador, SAN SALVADOR")
    const ctx = buildTechnicalSheetTemplateContext(payload)
    expect(ctx.header).toMatchObject({
      fullName: "Diego Murillo",
      address: "El Salvador, SAN SALVADOR",
    })
  })

  it("leaves address empty when profile has none, but derives englishLevel from languages", () => {
    const payload = buildTechnicalSheetPayloadFromRecruiterProfile({
      candidateId: "cp-3",
      profile: {
        id: "cp-3",
        normalizedData: {
          FirstName: "Solo",
          LastName: "Nombre",
          Languages: [{ Language: "Inglés", Level: "Avanzado" }],
        },
        normalizedDataRaw: null,
        normalizedDataParseFailed: false,
      },
    })
    const cand = payload.candidate as Record<string, unknown>
    expect(cand.address).toBe("")
    expect(cand.englishLevel).toBe("Avanzado")
    expect(cand.languages).toEqual([{ language: "Inglés", level: "Avanzado" }])
    expect(cand.softSkills).toEqual([])
    expect(cand.certifications).toEqual([])
  })

  it("parses work/education/language rows stored as JSON strings", () => {
    const payload = buildTechnicalSheetPayloadFromRecruiterProfile({
      candidateId: "cp-json",
      profile: {
        id: "cp-json",
        normalizedData: {
          FirstName: "Ana",
          LastName: "Rojas",
          WorkExperience: [
            JSON.stringify({
              Company: "Acme",
              Role: "Dev",
              StartDate: "2020",
              EndDate: "2021",
              Description: "Built apps",
            }),
          ],
          Education: [
            JSON.stringify({
              Institution: "UCA",
              Degree: "Ing.",
              StartDate: "2014",
              EndDate: "2019",
            }),
          ],
          Languages: [JSON.stringify({ Language: "Inglés", Level: "B2" })],
        },
        normalizedDataRaw: null,
        normalizedDataParseFailed: false,
      },
    })
    const cand = payload.candidate as Record<string, unknown>
    expect(cand.workExperience).toEqual([
      {
        company: "Acme",
        role: "Dev",
        startDate: "2020",
        endDate: "2021",
        description: "Built apps",
      },
    ])
    expect(cand.education).toEqual([
      {
        institution: "UCA",
        degree: "Ing.",
        startDate: "2014",
        endDate: "2019",
      },
    ])
    expect(cand.languages).toEqual([{ language: "Inglés", level: "B2" }])
    expect(cand.englishLevel).toBe("B2")
  })

  it("does not let an empty canonical workExperience hide normalizedData rows", () => {
    const payload = buildTechnicalSheetPayloadFromRecruiterProfile({
      candidateId: "cp-empty-canon",
      profile: {
        id: "cp-empty-canon",
        normalizedData: {
          FirstName: "Ana",
          LastName: "Rojas",
          WorkExperience: [
            {
              Company: "FromNd",
              Role: "Dev",
              StartDate: "2020",
              EndDate: "2021",
              Description: "Nd job",
            },
          ],
        },
        normalizedDataRaw: null,
        normalizedDataParseFailed: false,
      },
      canonicalProfile: {
        id: "cp-empty-canon",
        headline: "",
        summary: "",
        resumeMarkdown: "",
        nationalId: "",
        firstName: "Ana",
        lastName: "Rojas",
        workExperience: [],
      },
    })
    const wx = (payload.candidate as Record<string, unknown>).workExperience as unknown[]
    expect(wx).toHaveLength(1)
    expect(wx[0]).toMatchObject({ company: "FromNd" })
  })
})

describe("buildTechnicalSheetPayloadFromRecruiterApiResponses", () => {
  it("merges detail normalizedData with embedded/profile payload", () => {
    const payload = buildTechnicalSheetPayloadFromRecruiterApiResponses({
      candidateId: "cp-api",
      detailRaw: {
        id: "cp-api",
        normalizedData: {
          FirstName: "From",
          LastName: "Detail",
          Skills: ["CSS"],
        },
      },
      profileRaw: {
        id: "cp-api",
        firstName: "From",
        lastName: "Profile",
        summary: "Merged summary",
        headline: "",
        resumeMarkdown: "",
        nationalId: "",
        skills: ["HTML", "CSS"],
      },
    })

    expect(payload.candidate).toMatchObject({
      firstName: "From",
      lastName: "Profile",
      profileSummary: "Merged summary",
      technicalSkills: ["HTML", "CSS"],
    })
  })
})
