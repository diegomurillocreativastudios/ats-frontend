import { describe, expect, it } from "vitest"
import {
  sanitizeCandidateSelfProfileDto,
  sanitizeLatestResume,
} from "@/lib/candidate-self-profile"
import {
  mergeCandidateProfilePreservingCvRefs,
  normalizeCandidateProfileFromApi,
} from "@/lib/candidate-profile"

describe("sanitizeLatestResume", () => {
  it("keeps documentId and hasFile without storagePath", () => {
    const result = sanitizeLatestResume({
      documentId: "doc-9",
      storagePath: "cvs/secret.pdf",
      contentSha256: "hash",
      normalizedData: { FirstName: "Ada" },
      rawText: "text",
      createdAt: "2026-01-01T00:00:00Z",
    })

    expect(result).toEqual({
      documentId: "doc-9",
      hasFile: true,
      normalizedData: { FirstName: "Ada" },
      rawText: "text",
      createdAt: "2026-01-01T00:00:00Z",
    })
    expect(result).not.toHaveProperty("storagePath")
    expect(result).not.toHaveProperty("contentSha256")
  })
})

describe("sanitizeCandidateSelfProfileDto", () => {
  it("strips storage secrets from the root and latestResume", () => {
    const result = sanitizeCandidateSelfProfileDto({
      email: "a@b.com",
      storagePath: "cvs/root.pdf",
      contentSha256: "root-hash",
      latestResume: {
        documentId: "doc-1",
        storagePath: "cvs/nested.pdf",
        normalizedData: {},
        rawText: null,
        createdAt: null,
      },
    } as unknown as Parameters<typeof sanitizeCandidateSelfProfileDto>[0])

    expect(result).not.toHaveProperty("storagePath")
    expect(result).not.toHaveProperty("contentSha256")
    expect(result.latestResume).toEqual({
      documentId: "doc-1",
      hasFile: true,
      normalizedData: {},
      rawText: null,
      createdAt: null,
    })
  })
})

describe("normalizeCandidateProfileFromApi", () => {
  it("derives hasCvFile from the backend flag without storing storagePath", () => {
    const result = normalizeCandidateProfileFromApi({
      id: "p1",
      headline: "Dev",
      summary: "",
      resumeMarkdown: "md",
      nationalId: "1",
      hasCvFile: true,
    })

    expect(result.hasCvFile).toBe(true)
    expect(result).not.toHaveProperty("storagePath")
    expect(result).not.toHaveProperty("cvDownloadUrl")
  })

  it("falls back to legacy storagePath when hasCvFile is absent", () => {
    const result = normalizeCandidateProfileFromApi({
      id: "p1",
      headline: "Dev",
      summary: "",
      resumeMarkdown: "md",
      nationalId: "1",
      storagePath: "cvs/cv.pdf",
    })

    expect(result.hasCvFile).toBe(true)
    expect(result).not.toHaveProperty("storagePath")
  })
})

describe("mergeCandidateProfilePreservingCvRefs", () => {
  it("preserves hasCvFile when the PUT response omits it", () => {
    const previous = normalizeCandidateProfileFromApi({
      id: "p1",
      headline: "Dev",
      summary: "",
      resumeMarkdown: "md",
      nationalId: "1",
      hasCvFile: true,
    })
    const incoming = normalizeCandidateProfileFromApi({
      id: "p1",
      headline: "Dev",
      summary: "",
      resumeMarkdown: "md",
      nationalId: "1",
    })

    expect(previous.hasCvFile).toBe(true)
    expect(incoming.hasCvFile).toBe(false)
    expect(mergeCandidateProfilePreservingCvRefs(previous, incoming).hasCvFile).toBe(
      true
    )
  })
})
