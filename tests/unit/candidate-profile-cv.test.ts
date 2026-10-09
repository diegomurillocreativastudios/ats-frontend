import { beforeEach, describe, expect, it, vi } from "vitest"
import { downloadCandidateProfileCvAsFile } from "@/lib/candidate-profile-cv"

vi.mock("@/lib/api", () => ({
  resolveBffUrl: (path: string) => `https://app.test/api/bff${path}`,
}))

describe("downloadCandidateProfileCvAsFile", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("returns a File from the profile CV endpoint", async () => {
    const blob = new Blob(["%PDF-1.4"], { type: "application/pdf" })
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => blob,
        headers: {
          get: (name: string) =>
            name === "Content-Disposition"
              ? 'attachment; filename="ana-cv.pdf"'
              : null,
        },
      })
    )

    const file = await downloadCandidateProfileCvAsFile()
    expect(file).toBeInstanceOf(File)
    expect(file.name).toBe("ana-cv.pdf")
    expect(file.type).toBe("application/pdf")
    expect(fetch).toHaveBeenCalledWith(
      "https://app.test/api/bff/api/candidate/profile/cv",
      expect.objectContaining({ method: "GET", credentials: "include" })
    )
  })

  it("throws when the CV download fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        blob: async () => new Blob(),
        headers: { get: () => null },
      })
    )

    await expect(downloadCandidateProfileCvAsFile()).rejects.toMatchObject({
      status: 404,
    })
  })
})
