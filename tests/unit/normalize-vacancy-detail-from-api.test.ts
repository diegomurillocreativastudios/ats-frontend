import { describe, expect, it } from "vitest"
import { normalizeVacancyDetailFromApi } from "@/lib/vacancies/normalize-vacancy-detail-from-api"
import { readCompanyIsActiveForVacancy } from "@/lib/vacancies/read-company-is-active"
import {
  getVacancyRecruiterReadOnlyReason,
  isVacancyRecruiterReadOnly,
} from "@/lib/vacancies/read-vacancy-recruiter-read-only"

const sampleApplicant = {
  candidateDocumentId: "doc-1",
  name: "María",
  applicationStage: "Revision",
}

describe("normalizeVacancyDetailFromApi", () => {
  it("unwraps nested vacancy and normalizes applicants", () => {
    const normalized = normalizeVacancyDetailFromApi({
      vacancy: {
        id: "v1",
        title: "Sales Agent",
        Applicants: [sampleApplicant],
      },
    })

    expect(normalized?.id).toBe("v1")
    expect(normalized?.applicants).toHaveLength(1)
    expect((normalized?.applicants as { name: string }[])[0]?.name).toBe("María")
  })

  it("keeps camelCase applicants from flat payload", () => {
    const normalized = normalizeVacancyDetailFromApi({
      id: "v2",
      applicants: [sampleApplicant],
    })

    expect(normalized?.applicants).toHaveLength(1)
  })
})

describe("readCompanyIsActiveForVacancy", () => {
  it("reads companyIsActive on vacancy", () => {
    expect(
      readCompanyIsActiveForVacancy({ companyIsActive: false })
    ).toBe(false)
  })

  it("reads isActive from companies list by companyId", () => {
    expect(
      readCompanyIsActiveForVacancy(
        { companyId: "co-1" },
        [{ id: "co-1", isActive: false }]
      )
    ).toBe(false)
  })
})

describe("isVacancyRecruiterReadOnly", () => {
  it("is read-only when company is inactive even if vacancy is active", () => {
    expect(
      isVacancyRecruiterReadOnly(
        { isActive: true, companyId: "co-1" },
        [{ id: "co-1", isActive: false }]
      )
    ).toBe(true)
    expect(
      getVacancyRecruiterReadOnlyReason(
        { isActive: true, companyId: "co-1" },
        [{ id: "co-1", isActive: false }]
      )
    ).toBe("company")
  })
})
