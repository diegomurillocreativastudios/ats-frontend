import { beforeEach, describe, expect, it, vi } from "vitest"
import { tailorProfileToVacancy } from "@/lib/api/candidate-profile-tailor"

const apiPost = vi.fn()
const apiPostFormData = vi.fn()

vi.mock("@/lib/api", () => ({
  apiClient: {
    post: (...args: unknown[]) => apiPost(...args),
    postFormData: (...args: unknown[]) => apiPostFormData(...args),
  },
}))

const TAILOR_RESPONSE = {
  versionId: "ver-1",
  versionNumber: 1,
  currentProfile: { headline: "Dev" },
  adaptedProfile: { headline: "Senior Dev" },
  changeHighlights: [],
}

describe("tailorProfileToVacancy wire format", () => {
  beforeEach(() => {
    apiPost.mockReset()
    apiPostFormData.mockReset()
    apiPost.mockResolvedValue(TAILOR_RESPONSE)
    apiPostFormData.mockResolvedValue(TAILOR_RESPONSE)
  })

  it("vacante del sistema: POST JSON a /tailor-to-vacancy con vacancyId", async () => {
    await tailorProfileToVacancy({
      source: {
        kind: "platform",
        vacancyId: "vac-123",
        vacancyTitle: "Backend Engineer",
      },
      vacancyTitle: "Backend Engineer",
    })

    expect(apiPostFormData).not.toHaveBeenCalled()
    expect(apiPost).toHaveBeenCalledTimes(1)
    const [path, body] = apiPost.mock.calls[0] as [string, Record<string, unknown>]
    expect(path).toBe("/api/candidate/profile/tailor-to-vacancy")
    expect(body).toEqual({ vacancyId: "vac-123" })
    expect(body).not.toHaveProperty("vacancyTitle")
    expect(body).not.toHaveProperty("vacancyText")
    expect(body).not.toHaveProperty("vacancyFile")
  })

  it("texto: POST JSON a /tailor-to-vacancy con vacancyText", async () => {
    await tailorProfileToVacancy({
      source: { kind: "text", text: "Job description" },
    })

    expect(apiPostFormData).not.toHaveBeenCalled()
    expect(apiPost).toHaveBeenCalledTimes(1)
    const [path, body] = apiPost.mock.calls[0] as [string, Record<string, unknown>]
    expect(path).toBe("/api/candidate/profile/tailor-to-vacancy")
    expect(body).toEqual({ vacancyText: "Job description" })
    expect(body).not.toHaveProperty("vacancyTitle")
  })

  it("archivo: POST multipart a /tailor-to-vacancy/multipart con vacancyFile", async () => {
    const file = new File(["cv"], "vacancy.pdf", { type: "application/pdf" })

    await tailorProfileToVacancy({
      source: { kind: "file", file },
    })

    expect(apiPost).not.toHaveBeenCalled()
    expect(apiPostFormData).toHaveBeenCalledTimes(1)
    const [path, formData] = apiPostFormData.mock.calls[0] as [string, FormData]
    expect(path).toBe("/api/candidate/profile/tailor-to-vacancy/multipart")
    expect(formData).toBeInstanceOf(FormData)
    expect(formData.get("vacancyFile")).toBe(file)
    expect(formData.get("vacancyTitle")).toBeNull()
    expect(formData.get("vacancyId")).toBeNull()
    expect(formData.get("vacancyText")).toBeNull()
  })

  it("label opcional viaja en JSON cuando hay vacancyId", async () => {
    await tailorProfileToVacancy({
      source: {
        kind: "platform",
        vacancyId: "vac-9",
        vacancyTitle: "QA",
      },
      label: "  Mi versión  ",
    })

    const [, body] = apiPost.mock.calls[0] as [string, Record<string, unknown>]
    expect(body).toEqual({ vacancyId: "vac-9", label: "Mi versión" })
  })

  it("label opcional viaja en FormData cuando el origen es archivo", async () => {
    const file = new File(["cv"], "vacancy.pdf", { type: "application/pdf" })

    await tailorProfileToVacancy({
      source: { kind: "file", file },
      label: "  Perfil backend  ",
    })

    const [, formData] = apiPostFormData.mock.calls[0] as [string, FormData]
    expect(formData.get("label")).toBe("Perfil backend")
  })
})
