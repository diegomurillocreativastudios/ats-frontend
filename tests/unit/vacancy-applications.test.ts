import { describe, expect, it, vi, beforeEach } from "vitest"
import { overlayVacancyApplicants } from "@/lib/api/vacancy-applications"
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
