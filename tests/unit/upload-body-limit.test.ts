import { describe, expect, it } from "vitest"
import {
  getUploadMaxBytesForBackendPath,
  readRequestBodyWithinLimit,
} from "@/lib/upload-body-limit"
import {
  UPLOAD_MAX_BYTES_5_MB,
  UPLOAD_MAX_BYTES_10_MB,
  UPLOAD_MAX_BYTES_15_MB,
  UPLOAD_MAX_BYTES_20_MB,
} from "@/lib/upload-constraints"

describe("getUploadMaxBytesForBackendPath", () => {
  it("applies 5 MB for admin company create/update", () => {
    expect(getUploadMaxBytesForBackendPath("/api/admin/companies")).toBe(
      UPLOAD_MAX_BYTES_5_MB
    )
    expect(
      getUploadMaxBytesForBackendPath("/api/admin/companies/company-1")
    ).toBe(UPLOAD_MAX_BYTES_5_MB)
  })

  it("applies 10 MB for vacancy tailoring", () => {
    expect(
      getUploadMaxBytesForBackendPath("/api/candidate/profile/tailor-to-vacancy")
    ).toBe(UPLOAD_MAX_BYTES_10_MB)
  })

  it("applies 15 MB for ingest, public apply, and candidate documents", () => {
    expect(getUploadMaxBytesForBackendPath("/Ingest/upload")).toBe(
      UPLOAD_MAX_BYTES_15_MB
    )
    expect(
      getUploadMaxBytesForBackendPath("/api/candidate/personal-appliance")
    ).toBe(UPLOAD_MAX_BYTES_15_MB)
    expect(
      getUploadMaxBytesForBackendPath("/api/candidate/cand-1/documents")
    ).toBe(UPLOAD_MAX_BYTES_15_MB)
  })

  it("applies 20 MB for report PDF history and default mutations", () => {
    expect(
      getUploadMaxBytesForBackendPath(
        "/api/recruiter/report-documents/hist-1/pdf"
      )
    ).toBe(UPLOAD_MAX_BYTES_20_MB)
    expect(getUploadMaxBytesForBackendPath("/api/Templates")).toBe(
      UPLOAD_MAX_BYTES_20_MB
    )
  })

  it("ignores query strings and trailing slashes", () => {
    expect(
      getUploadMaxBytesForBackendPath("/api/admin/companies/?x=1")
    ).toBe(UPLOAD_MAX_BYTES_5_MB)
  })
})

describe("readRequestBodyWithinLimit", () => {
  it("rejects when Content-Length exceeds the limit before buffering", async () => {
    const request = new Request("https://app.example.com/upload", {
      method: "POST",
      headers: { "content-length": String(UPLOAD_MAX_BYTES_5_MB + 1) },
      body: "x",
    })
    const result = await readRequestBodyWithinLimit(
      request,
      UPLOAD_MAX_BYTES_5_MB
    )
    expect(result.ok).toBe(false)
    if (result.ok === false) {
      expect(result.status).toBe(413)
      expect(result.message).toContain("límite")
    }
  })

  it("rejects when buffered body exceeds the limit", async () => {
    const oversized = new Uint8Array(UPLOAD_MAX_BYTES_5_MB + 1)
    const request = new Request("https://app.example.com/upload", {
      method: "POST",
      body: oversized,
    })
    const result = await readRequestBodyWithinLimit(
      request,
      UPLOAD_MAX_BYTES_5_MB
    )
    expect(result.ok).toBe(false)
    if (result.ok === false) expect(result.status).toBe(413)
  })

  it("accepts bodies within the limit", async () => {
    const request = new Request("https://app.example.com/upload", {
      method: "POST",
      headers: { "content-type": "application/octet-stream" },
      body: new Uint8Array([1, 2, 3]),
    })
    const result = await readRequestBodyWithinLimit(
      request,
      UPLOAD_MAX_BYTES_5_MB
    )
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.body.byteLength).toBe(3)
  })
})
