import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const renderReportPdfBufferMock = vi.fn()

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: () => ({ value: "test-token" }),
  })),
}))

vi.mock("@/lib/auth", () => ({
  AUTH_COOKIES: { access: "ats_access_token" },
}))

vi.mock("@/lib/server-backend-url", () => ({
  getServerBackendBaseUrl: () => "http://localhost",
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

describe("POST /api/recruiter/reportes/[reportKey]/pdf", () => {
  beforeEach(() => {
    renderReportPdfBufferMock.mockReset()
    renderReportPdfBufferMock.mockResolvedValue({
      buffer: Buffer.from("%PDF-1.4"),
      engine: "pdfkit-v2",
      templateVersion: "candidate-status-by-stage-schema-v1",
      reportKey: "candidate-status-by-stage",
    })
  })

  it("generates PDF for candidate-status-by-stage", async () => {
    const request = new NextRequest(
      "http://localhost/api/recruiter/reportes/candidate-status-by-stage/pdf",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: [{ candidateName: "Ana", currentStageName: "Screening" }],
          totalCount: 1,
        }),
      }
    )

    const response = await POST(request, {
      params: Promise.resolve({ reportKey: "candidate-status-by-stage" }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get("X-Report-Key")).toBe("candidate-status-by-stage")
    expect(response.headers.get("X-Report-Pdf-Template-Version")).toBe(
      "candidate-status-by-stage-schema-v1"
    )
    expect(renderReportPdfBufferMock).toHaveBeenCalledWith(
      expect.objectContaining({ reportKey: "candidate-status-by-stage" })
    )
  })

  it("generates PDF for recruiter-productivity", async () => {
    renderReportPdfBufferMock.mockResolvedValue({
      buffer: Buffer.from("%PDF-1.4"),
      engine: "pdfkit-v2",
      templateVersion: "recruiter-productivity-schema-v1",
      reportKey: "recruiter-productivity",
    })

    const request = new NextRequest(
      "http://localhost/api/recruiter/reportes/recruiter-productivity/pdf",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: [
            {
              displayName: "Ana",
              applicationsManaged: 5,
              hires: 1,
            },
          ],
          totalCount: 1,
        }),
      }
    )

    const response = await POST(request, {
      params: Promise.resolve({ reportKey: "recruiter-productivity" }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get("X-Report-Key")).toBe("recruiter-productivity")
    expect(renderReportPdfBufferMock).toHaveBeenCalledWith(
      expect.objectContaining({ reportKey: "recruiter-productivity" })
    )
  })

  it("generates PDF for salary-expectations", async () => {
    renderReportPdfBufferMock.mockResolvedValue({
      buffer: Buffer.from("%PDF-1.4"),
      engine: "pdfkit-v2",
      templateVersion: "salary-expectations-schema-v1",
      reportKey: "salary-expectations",
    })

    const request = new NextRequest(
      "http://localhost/api/recruiter/reportes/salary-expectations/pdf",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      }
    )

    const response = await POST(request, {
      params: Promise.resolve({ reportKey: "salary-expectations" }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get("X-Report-Key")).toBe("salary-expectations")
    expect(renderReportPdfBufferMock).toHaveBeenCalledWith(
      expect.objectContaining({ reportKey: "salary-expectations" })
    )
  })

  it("returns 404 for unsupported report keys", async () => {
    const request = new NextRequest(
      "http://localhost/api/recruiter/reportes/executive-summary/pdf",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: [{ x: 1 }] }),
      }
    )

    const response = await POST(request, {
      params: Promise.resolve({ reportKey: "executive-summary" }),
    })

    expect(response.status).toBe(404)
  })
})
