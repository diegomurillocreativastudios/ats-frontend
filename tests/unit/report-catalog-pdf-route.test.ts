import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const renderReportPdfBufferMock = vi.fn()
const fetchReportForServerMock = vi.fn()

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: () => ({ value: "test-token-abcdefgh" }),
  })),
}))

vi.mock("@/lib/auth", () => ({
  AUTH_COOKIES: { access: "ats_access_token" },
}))

vi.mock("@/lib/server-backend-url", () => ({
  getServerBackendBaseUrl: () => "http://localhost",
}))

vi.mock("@/lib/reportes/fetch-report-for-server", () => ({
  fetchReportForServer: (...args: unknown[]) => fetchReportForServerMock(...args),
  FetchReportForServerError: class FetchReportForServerError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock("@/lib/templates/fetch-templates-for-server", () => ({
  fetchTemplatesListForServer: vi.fn(async () => [
    {
      id: "tpl-ec",
      type: "Document",
      name: "Estatus",
      contentTemplate: JSON.stringify({
        version: 1,
        reportKey: "candidate-status-by-stage",
        sections: [{ type: "heroHeader", title: "Estatus" }],
      }),
      isReport: true,
      isTechnicalSheet: false,
    },
  ]),
}))

vi.mock("@/lib/templates/technical-sheet-template", () => ({
  findReportDocumentTemplate: vi.fn((items: unknown[]) => (items as unknown[])[0]),
  findReportDocumentTemplateById: vi.fn((items: unknown[]) => (items as unknown[])[0]),
}))

vi.mock("@/lib/reportes/render-report-pdf-buffer", () => ({
  renderReportPdfBuffer: (...args: unknown[]) =>
    renderReportPdfBufferMock(...args),
  buildReportPdfFilename: () => "estatus-candidatos.pdf",
  ReportPdfError: class ReportPdfError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
}))

import { POST } from "@/app/api/recruiter/reportes/[reportKey]/pdf/route"
import { resetTechnicalSheetPdfConcurrencyForTests } from "@/lib/technical-sheet/pdf-chromium-concurrency"

describe("POST /api/recruiter/reportes/[reportKey]/pdf", () => {
  beforeEach(() => {
    resetTechnicalSheetPdfConcurrencyForTests()
    renderReportPdfBufferMock.mockReset()
    fetchReportForServerMock.mockReset()
    renderReportPdfBufferMock.mockResolvedValue({
      buffer: Buffer.from("%PDF-1.4"),
      engine: "pdfkit-v2",
      templateVersion: "candidate-status-by-stage-schema-v1",
      reportKey: "candidate-status-by-stage",
    })
    fetchReportForServerMock.mockResolvedValue({
      rows: [{ candidateName: "Ana", currentStageName: "Screening" }],
      totalCount: 1,
      extras: null,
    })
  })

  it("generates PDF from authoritative backend rows", async () => {
    const request = new NextRequest(
      "http://localhost/api/recruiter/reportes/candidate-status-by-stage/pdf",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appliedFilters: { clientId: "c1" },
          fileBaseName: "estatus",
        }),
      }
    )

    const response = await POST(request, {
      params: Promise.resolve({ reportKey: "candidate-status-by-stage" }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get("X-Report-Key")).toBe("candidate-status-by-stage")
    expect(fetchReportForServerMock).toHaveBeenCalledWith(
      "http://localhost",
      "test-token-abcdefgh",
      "candidate-status-by-stage",
      { clientId: "c1" }
    )
    expect(renderReportPdfBufferMock).toHaveBeenCalledWith(
      expect.objectContaining({
        reportKey: "candidate-status-by-stage",
        rows: [{ candidateName: "Ana", currentStageName: "Screening" }],
      })
    )
  })

  it("ignores forged client rows and uses backend data", async () => {
    fetchReportForServerMock.mockResolvedValue({
      rows: [{ candidateName: "Backend", currentStageName: "Offer" }],
      totalCount: 1,
      extras: null,
    })

    const request = new NextRequest(
      "http://localhost/api/recruiter/reportes/candidate-status-by-stage/pdf",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: [{ candidateName: "Forged", currentStageName: "Hacked" }],
          totalCount: 99,
          clientName: "Fake Corp",
        }),
      }
    )

    const response = await POST(request, {
      params: Promise.resolve({ reportKey: "candidate-status-by-stage" }),
    })

    expect(response.status).toBe(200)
    expect(renderReportPdfBufferMock).toHaveBeenCalledWith(
      expect.objectContaining({
        rows: [{ candidateName: "Backend", currentStageName: "Offer" }],
      })
    )
    const call = renderReportPdfBufferMock.mock.calls[0]?.[0] as {
      rows: unknown[]
    }
    expect(call.rows).not.toEqual([
      { candidateName: "Forged", currentStageName: "Hacked" },
    ])
  })

  it("generates PDF for recruiter-productivity", async () => {
    renderReportPdfBufferMock.mockResolvedValue({
      buffer: Buffer.from("%PDF-1.4"),
      engine: "pdfkit-v2",
      templateVersion: "recruiter-productivity-schema-v1",
      reportKey: "recruiter-productivity",
    })
    fetchReportForServerMock.mockResolvedValue({
      rows: [{ displayName: "Ana", applicationsManaged: 5, hires: 1 }],
      totalCount: 1,
      extras: null,
    })

    const request = new NextRequest(
      "http://localhost/api/recruiter/reportes/recruiter-productivity/pdf",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appliedFilters: {} }),
      }
    )

    const response = await POST(request, {
      params: Promise.resolve({ reportKey: "recruiter-productivity" }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get("X-Report-Key")).toBe("recruiter-productivity")
  })

  it("generates PDF for salary-expectations", async () => {
    renderReportPdfBufferMock.mockResolvedValue({
      buffer: Buffer.from("%PDF-1.4"),
      engine: "pdfkit-v2",
      templateVersion: "salary-expectations-schema-v1",
      reportKey: "salary-expectations",
    })
    fetchReportForServerMock.mockResolvedValue({
      rows: [
        {
          candidateName: "Ana",
          expectedSalaryUsd: 3500,
          withinRange: true,
        },
      ],
      totalCount: 1,
      extras: {
        currency: "USD",
        summary: { totalApplicationsAnalyzed: 1 },
      },
    })

    const request = new NextRequest(
      "http://localhost/api/recruiter/reportes/salary-expectations/pdf",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appliedFilters: {} }),
      }
    )

    const response = await POST(request, {
      params: Promise.resolve({ reportKey: "salary-expectations" }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get("X-Report-Key")).toBe("salary-expectations")
    expect(renderReportPdfBufferMock).toHaveBeenCalledWith(
      expect.objectContaining({
        extras: expect.objectContaining({ currency: "USD" }),
      })
    )
  })

  it("returns 404 for unsupported report keys", async () => {
    const request = new NextRequest(
      "http://localhost/api/recruiter/reportes/executive-summary/pdf",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appliedFilters: {} }),
      }
    )

    const response = await POST(request, {
      params: Promise.resolve({ reportKey: "executive-summary" }),
    })

    expect(response.status).toBe(404)
    expect(fetchReportForServerMock).not.toHaveBeenCalled()
  })

  it("returns 413 when authoritative rows exceed REPORT_PDF_MAX_ROWS", async () => {
    const { REPORT_PDF_MAX_ROWS } = await import(
      "@/lib/technical-sheet/pdf-chromium-limits"
    )
    const rows = Array.from({ length: REPORT_PDF_MAX_ROWS + 1 }, (_, i) => ({
      candidateName: `C${i}`,
      currentStageName: "Screening",
    }))
    fetchReportForServerMock.mockResolvedValue({
      rows,
      totalCount: rows.length,
      extras: null,
    })

    const request = new NextRequest(
      "http://localhost/api/recruiter/reportes/candidate-status-by-stage/pdf",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appliedFilters: {} }),
      }
    )

    const response = await POST(request, {
      params: Promise.resolve({ reportKey: "candidate-status-by-stage" }),
    })

    expect(response.status).toBe(413)
    expect(renderReportPdfBufferMock).not.toHaveBeenCalled()
  })

  it("returns 429 when the PDF rate limit is exceeded", async () => {
    const { TECHNICAL_SHEET_PDF_RATE_LIMIT_MAX } = await import(
      "@/lib/technical-sheet/pdf-chromium-limits"
    )

    for (let i = 0; i < TECHNICAL_SHEET_PDF_RATE_LIMIT_MAX; i += 1) {
      const warm = new NextRequest(
        "http://localhost/api/recruiter/reportes/candidate-status-by-stage/pdf",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appliedFilters: {} }),
        }
      )
      const warmRes = await POST(warm, {
        params: Promise.resolve({ reportKey: "candidate-status-by-stage" }),
      })
      expect(warmRes.status).toBe(200)
    }

    const blocked = new NextRequest(
      "http://localhost/api/recruiter/reportes/candidate-status-by-stage/pdf",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appliedFilters: {} }),
      }
    )
    const response = await POST(blocked, {
      params: Promise.resolve({ reportKey: "candidate-status-by-stage" }),
    })

    expect(response.status).toBe(429)
    expect(response.headers.get("Retry-After")).toBeTruthy()
    expect(renderReportPdfBufferMock).toHaveBeenCalledTimes(
      TECHNICAL_SHEET_PDF_RATE_LIMIT_MAX
    )
  })
})
