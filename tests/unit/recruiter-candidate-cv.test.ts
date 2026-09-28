import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  downloadRecruiterCandidateCv,
  isRecruiterCandidateCvError,
  parseContentDispositionFilename,
  RecruiterCandidateCvError,
} from "@/lib/api/recruiter-candidate-cv"

describe("parseContentDispositionFilename", () => {
  it("parses quoted filename", () => {
    expect(
      parseContentDispositionFilename('attachment; filename="resume.pdf"')
    ).toBe("resume.pdf")
  })

  it("parses UTF-8 filename*", () => {
    expect(
      parseContentDispositionFilename(
        "attachment; filename*=UTF-8''caf%C3%A9.pdf"
      )
    ).toBe("café.pdf")
  })

  it("returns null when header is missing", () => {
    expect(parseContentDispositionFilename(null)).toBeNull()
  })
})

describe("downloadRecruiterCandidateCv", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    document.body.innerHTML = ""
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it("requests CV via same-origin BFF with credentials and triggers download", async () => {
    const blob = new Blob(["pdf-bytes"], { type: "application/pdf" })
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => blob,
      headers: {
        get: (name: string) =>
          name.toLowerCase() === "content-disposition"
            ? 'attachment; filename="cv-ana.pdf"'
            : null,
      },
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const click = vi.fn()
    const anchor = {
      href: "",
      download: "",
      click,
    } as unknown as HTMLAnchorElement
    const realCreateElement = document.createElement.bind(document)
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") return anchor
      return realCreateElement(tag)
    })
    vi.spyOn(document.body, "appendChild").mockImplementation((node) => node)
    vi.spyOn(document.body, "removeChild").mockImplementation((node) => node)
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url")
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})

    await downloadRecruiterCandidateCv("cand-42")

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bff/api/recruiter/candidates/cand-42/cv",
      {
        method: "GET",
        credentials: "include",
      }
    )
    expect(anchor.download).toBe("cv-ana.pdf")
    expect(click).toHaveBeenCalled()
    expect(revoke).toHaveBeenCalledWith("blob:mock-url")
  })

  it("throws unavailable on 404", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: { get: () => null },
    }) as unknown as typeof fetch

    await expect(downloadRecruiterCandidateCv("cand-42")).rejects.toMatchObject({
      code: "unavailable",
      status: 404,
    })
  })

  it("throws failed on other errors", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: { get: () => null },
    }) as unknown as typeof fetch

    try {
      await downloadRecruiterCandidateCv("cand-42")
      expect.unreachable()
    } catch (err) {
      expect(isRecruiterCandidateCvError(err)).toBe(true)
      expect(err).toBeInstanceOf(RecruiterCandidateCvError)
      expect((err as RecruiterCandidateCvError).code).toBe("failed")
      expect((err as RecruiterCandidateCvError).status).toBe(500)
    }
  })
})
