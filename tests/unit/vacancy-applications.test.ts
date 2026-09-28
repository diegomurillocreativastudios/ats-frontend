import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  findApplicationIdForCandidate,
  overlayVacancyApplicants,
} from "@/lib/api/vacancy-applications"
import { apiClient } from "@/lib/api"

vi.mock("@/lib/api", () => ({
  apiClient: {
    getWithHeaders: vi.fn(),
  },
}))

describe("overlayVacancyApplicants", () => {
  beforeEach(() => {
    vi.mocked(apiClient.getWithHeaders).mockReset()
  })

  it("replaces nested applicants with the applications list", async () => {
    vi.mocked(apiClient.getWithHeaders).mockResolvedValueOnce({
      data: [{ candidateProfileId: "p1", name: "Ana" }],
      headers: new Headers({
        "X-Total-Count": "1",
        "X-Page": "1",
        "X-Page-Size": "100",
      }),
    })

    const merged = await overlayVacancyApplicants("vac-1", {
      id: "vac-1",
      title: "Dev",
      applicants: [{ candidateProfileId: "old" }],
    })

    expect(apiClient.getWithHeaders).toHaveBeenCalledWith(
      "/api/recruiter/vacancies/vac-1/applications?page=1&pageSize=100"
    )
    expect(merged).toMatchObject({
      id: "vac-1",
      title: "Dev",
      applicants: [{ candidateProfileId: "p1", name: "Ana" }],
    })
  })

  it("keeps the original payload when applications fail", async () => {
    vi.mocked(apiClient.getWithHeaders).mockRejectedValueOnce(
      new Error("unavailable")
    )
    const original = { id: "vac-1", applicants: [{ candidateProfileId: "nested" }] }
    const merged = await overlayVacancyApplicants("vac-1", original)
    expect(merged).toBe(original)
  })
})

describe("findApplicationIdForCandidate", () => {
  it("encuentra applicationId para el perfil", () => {
    expect(
      findApplicationIdForCandidate(
        [
          { candidateProfileId: "p1", applicationId: "app-1" },
          { candidate_profile_id: "p2", application_id: "app-2" },
        ],
        "p2"
      )
    ).toBe("app-2")
  })

  it("ignora filas sin applicationId y perfiles distintos", () => {
    expect(
      findApplicationIdForCandidate(
        [{ candidateProfileId: "p1", name: "Ana" }],
        "p1"
      )
    ).toBeNull()
    expect(
      findApplicationIdForCandidate(
        [{ candidateProfileId: "p1", applicationId: "app-1" }],
        "p9"
      )
    ).toBeNull()
  })
})
