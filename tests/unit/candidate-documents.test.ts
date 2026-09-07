import { describe, expect, it } from "vitest"
import {
  deriveDocumentFileName,
  normalizeCandidateDocuments,
  toPublicCandidateDocument,
} from "@/lib/candidate-documents"

describe("toPublicCandidateDocument", () => {
  it("keeps the public fileName from the backend and strips secrets", () => {
    const result = toPublicCandidateDocument({
      id: "doc-1",
      fileName: "cv.pdf",
      createdAt: "2026-01-01T00:00:00Z",
      storagePath: "cvs/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee_cv.pdf",
      contentSha256: "abc123",
    })

    expect(result).toEqual({
      id: "doc-1",
      fileName: "cv.pdf",
      createdAt: "2026-01-01T00:00:00Z",
    })
    expect(result).not.toHaveProperty("storagePath")
    expect(result).not.toHaveProperty("contentSha256")
  })

  it("derives fileName from a legacy storagePath when fileName is absent", () => {
    const result = toPublicCandidateDocument({
      id: "doc-2",
      storagePath: "cvs/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee_resume.pdf",
      contentSha256: "hash",
    })
    expect(result?.fileName).toBe("resume.pdf")
  })

  it("returns null without id", () => {
    expect(toPublicCandidateDocument({ storagePath: "cvs/x.pdf" })).toBeNull()
  })
})

describe("deriveDocumentFileName", () => {
  it("strips UUID and numeric prefixes from the path segment", () => {
    expect(
      deriveDocumentFileName(
        "cvs/11111111-2222-3333-4444-555555555555_resume.pdf",
        "doc-1"
      )
    ).toBe("resume.pdf")
    expect(deriveDocumentFileName("cvs/42_identity.pdf", "doc-1")).toBe(
      "identity.pdf"
    )
  })
})

describe("normalizeCandidateDocuments", () => {
  it("maps a public list and sorts by createdAt desc", () => {
    const result = normalizeCandidateDocuments([
      {
        id: "older",
        fileName: "a.pdf",
        createdAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "newer",
        fileName: "b.pdf",
        createdAt: "2026-02-01T00:00:00Z",
      },
    ])

    expect(result.map((d) => d.id)).toEqual(["newer", "older"])
    for (const doc of result) {
      expect(doc).not.toHaveProperty("storagePath")
      expect(doc).not.toHaveProperty("contentSha256")
    }
  })
})
