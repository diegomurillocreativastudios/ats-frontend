import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  fetchRecruiterVacancyByPathSegment,
  resolveRecruiterVacancyIdFromPathSegment,
} from "@/lib/api/recruiter-vacancy-by-path"

const apiGet = vi.fn()

vi.mock("@/lib/api", () => ({
  apiClient: {
    get: (...args: unknown[]) => apiGet(...args),
  },
}))

vi.mock("@/lib/api/vacancy-applications", () => ({
  overlayVacancyApplicants: async (_id: string, payload: unknown) => payload,
}))

const VACANCY_ID = "524c0d08-2ead-4721-9e04-e0d7da6f45df"

describe("fetchRecruiterVacancyByPathSegment", () => {
  beforeEach(() => {
    apiGet.mockReset()
  })

  it("loads the full vacancy after resolving a public slug", async () => {
    apiGet.mockImplementation(async (path: string) => {
      if (path.includes("/by-public-slug/")) {
        return {
          id: VACANCY_ID,
          title: "Senior Software Engineer",
          publicSlug: "sse-6667",
          hasLogo: true,
        }
      }
      return {
        id: VACANCY_ID,
        title: "Senior Software Engineer",
        publicSlug: "sse-6667",
        description: "Vacancy",
        details: "Details",
        salary: "8000",
        advantages: "Benefits",
        requirements: { Seniority: "3 years" },
        company: "Creativa Studios",
        countryCode: "SV",
        stateCode: "SS",
        vacancyDepartment: {
          id: "00000000-0000-0000-0000-000000000601",
          code: "development",
          displayName: "Development",
        },
        vacancyModality: {
          id: "00000000-0000-0000-0000-000000000703",
          code: "hybrid",
          displayName: "Hybrid",
        },
      }
    })

    const resolved = await fetchRecruiterVacancyByPathSegment("sse-6667", {
      overlayApplicants: false,
    })

    expect(apiGet).toHaveBeenNthCalledWith(
      1,
      "/api/recruiter/vacancies/by-public-slug/sse-6667"
    )
    expect(apiGet).toHaveBeenNthCalledWith(
      2,
      `/api/recruiter/vacancies/${VACANCY_ID}`
    )
    expect(resolved?.id).toBe(VACANCY_ID)
    expect(resolved?.publicSlug).toBe("sse-6667")
    expect(resolved?.vacancy.description).toBe("Vacancy")
    expect(resolved?.vacancy.salary).toBe("8000")
    expect(resolved?.vacancy.requirements).toEqual({ Seniority: "3 years" })
    expect(resolved?.vacancy.company).toBe("Creativa Studios")
  })

  it("resolves a public slug without loading the full vacancy", async () => {
    apiGet.mockResolvedValueOnce({
      id: VACANCY_ID,
      title: "Senior Software Engineer",
      publicSlug: "sse-6667",
    })

    const resolved = await resolveRecruiterVacancyIdFromPathSegment("sse-6667")

    expect(apiGet).toHaveBeenCalledTimes(1)
    expect(apiGet).toHaveBeenCalledWith(
      "/api/recruiter/vacancies/by-public-slug/sse-6667"
    )
    expect(resolved).toEqual({ id: VACANCY_ID, publicSlug: "sse-6667" })
  })
})
