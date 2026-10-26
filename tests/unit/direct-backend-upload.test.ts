import { describe, expect, it } from "vitest"
import {
  VERCEL_FUNCTION_SAFE_BODY_BYTES,
  allowsAnonymousLargeUpload,
  buildDirectUploadRequest,
  estimateFormDataBytes,
  exceedsVercelFunctionBodyLimit,
  isSafeBackendPath,
} from "@/lib/direct-backend-upload"

describe("direct backend upload", () => {
  it("keeps the bypass threshold under the 4.5 MB function cap", () => {
    expect(VERCEL_FUNCTION_SAFE_BODY_BYTES).toBeLessThan(4.5 * 1024 * 1024)
    expect(exceedsVercelFunctionBodyLimit(VERCEL_FUNCTION_SAFE_BODY_BYTES)).toBe(
      false
    )
    expect(
      exceedsVercelFunctionBodyLimit(VERCEL_FUNCTION_SAFE_BODY_BYTES + 1)
    ).toBe(true)
  })

  it("counts file bytes in a multipart body", () => {
    const formData = new FormData()
    formData.append(
      "cvFile",
      new File([new Uint8Array(32)], "cv.pdf", { type: "application/pdf" })
    )
    formData.append("candidate", '{"name":"Ada"}')
    expect(estimateFormDataBytes(formData)).toBe(32 + new TextEncoder().encode('{"name":"Ada"}').length)
  })

  it("allows anonymous personal appliance and rejects other paths without a token", () => {
    expect(
      allowsAnonymousLargeUpload("/api/candidate/personal-appliance")
    ).toBe(true)
    expect(allowsAnonymousLargeUpload("/api/candidate/cand-1/documents")).toBe(
      false
    )

    expect(
      buildDirectUploadRequest("/api/candidate/personal-appliance", {
        apiBaseUrl: "https://api.example.com/",
        accessToken: null,
      })
    ).toEqual({
      ok: true,
      url: "https://api.example.com/api/candidate/personal-appliance",
      headers: {},
    })

    expect(
      buildDirectUploadRequest("/api/candidate/cand-1/documents", {
        apiBaseUrl: "https://api.example.com",
        accessToken: null,
      })
    ).toEqual({ ok: false, reason: "unauthorized" })
  })

  it("sends the bearer only to the configured API origin", () => {
    expect(
      buildDirectUploadRequest("/api/candidate/cand-1/documents?lang=es", {
        apiBaseUrl: "https://api.example.com",
        accessToken: "session-token",
      })
    ).toEqual({
      ok: true,
      url: "https://api.example.com/api/candidate/cand-1/documents?lang=es",
      headers: { Authorization: "Bearer session-token" },
    })
  })

  it("rejects absolute and traversal paths", () => {
    expect(isSafeBackendPath("https://evil.example/api")).toBe(false)
    expect(isSafeBackendPath("//evil.example/api")).toBe(false)
    expect(isSafeBackendPath("/api/../secret")).toBe(false)
    expect(
      buildDirectUploadRequest("https://evil.example/upload", {
        apiBaseUrl: "https://api.example.com",
        accessToken: "session-token",
      }).ok
    ).toBe(false)
  })

  it("fails closed when the public API URL is missing", () => {
    expect(
      buildDirectUploadRequest("/api/candidate/personal-appliance", {
        apiBaseUrl: "  ",
        accessToken: null,
      })
    ).toEqual({ ok: false, reason: "missing-api-url" })
  })
})
