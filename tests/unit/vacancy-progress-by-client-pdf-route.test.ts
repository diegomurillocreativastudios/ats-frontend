import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const renderVacancyProgressReportPdfBufferMock = vi.fn()
const fetchTemplatesListForServerMock = vi.fn()
const findReportDocumentTemplateMock = vi.fn()
const findReportDocumentTemplateByIdMock = vi.fn()

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      name === "ats_access_token" ? { value: "test-token" } : undefined,
  })),
}))

vi.mock("@/lib/auth", () => ({
  AUTH_COOKIES: { access: "ats_access_token" },
}))

vi.mock("@/lib/server-backend-url", () => ({
  getServerBackendBaseUrl: () => "http://localhost",
}))

vi.mock("@/lib/templates/fetch-templates-for-server", () => ({
  fetchTemplatesListForServer: (...args: unknown[]) =>
    fetchTemplatesListForServerMock(...args),
}))

vi.mock("@/lib/templates/technical-sheet-template", () => ({
  findReportDocumentTemplate: (...args: unknown[]) =>
    findReportDocumentTemplateMock(...args),
  findReportDocumentTemplateById: (...args: unknown[]) =>
    findReportDocumentTemplateByIdMock(...args),
}))

vi.mock("@/lib/reportes/render-vacancy-progress-report-pdf-buffer", () => ({
  renderVacancyProgressReportPdfBuffer: (...args: unknown[]) =>
    renderVacancyProgressReportPdfBufferMock(...args),
  buildVacancyProgressReportPdfFilename: () => "avance-de-vacantes-por-cliente.pdf",
  VACANCY_PROGRESS_PDF_TEMPLATE_VERSION: "vacancy-progress-full-v2",
  VacancyProgressReportPdfError: class VacancyProgressReportPdfError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
}))

import { POST } from "@/app/api/recruiter/reportes/vacancy-progress-by-client/pdf/route"
import type { ReportSchema } from "@/lib/reportes/schema/report-schema-types"

const sampleSchema: ReportSchema = {
  version: 1,
  reportKey: "vacancy-progress-by-client",
  title: "Reporte",
  sections: [{ type: "heroHeader", title: "Reporte" }],
}

const sampleTemplate = {
  id: "tpl-1",
  type: "Document",
  name: "Reporte avance",
  contentTemplate: JSON.stringify(sampleSchema),
  isReport: true,
  isTechnicalSheet: false,
}

function buildRows(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    clientName: "Acme Corp",
    vacancyTitle: `Vacante ${i + 1}`,
    totalCandidates: 3,
  }))
}

describe("POST /api/recruiter/reportes/vacancy-progress-by-client/pdf", () => {
  beforeEach(() => {
    renderVacancyProgressReportPdfBufferMock.mockReset()
    renderVacancyProgressReportPdfBufferMock.mockResolvedValue({
      buffer: Buffer.from("%PDF-1.4 mock"),
      engine: "pdfkit-v2",
      templateVersion: "vacancy-progress-full-v2",
    })
    fetchTemplatesListForServerMock.mockResolvedValue([sampleTemplate])
    findReportDocumentTemplateMock.mockReturnValue(sampleTemplate)
    findReportDocumentTemplateByIdMock.mockReturnValue(sampleTemplate)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("returns application/pdf with pdfkit-v2 headers for 12 rows", async () => {
    const rows = buildRows(12)
    const request = new NextRequest(
      "http://localhost/api/recruiter/reportes/vacancy-progress-by-client/pdf",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows,
          summary: { generatedAt: "22/05/2026", totalCount: 12 },
          totalCount: 12,
          fileBaseName: "avance-de-vacantes-por-cliente",
          templateId: "tpl-1",
        }),
      }
    )

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toContain("application/pdf")
    expect(response.headers.get("X-Report-Pdf-Engine")).toBe("pdfkit-v2")
    expect(response.headers.get("X-Report-Pdf-Template-Version")).toBe(
      "vacancy-progress-full-v2"
    )
    expect(response.headers.get("X-Report-Rows-Count")).toBe("12")

    expect(renderVacancyProgressReportPdfBufferMock).toHaveBeenCalledWith(
      expect.objectContaining({
        rows: expect.arrayContaining([expect.objectContaining({ vacancyTitle: "Vacante 1" })]),
        schema: sampleSchema,
      })
    )
  })

  it("returns 401 when there is no access token", async () => {
    const { cookies } = await import("next/headers")
    vi.mocked(cookies).mockResolvedValueOnce({
      get: () => undefined,
    } as never)

    const request = new NextRequest(
      "http://localhost/api/recruiter/reportes/vacancy-progress-by-client/pdf",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: buildRows(1) }),
      }
    )

    const response = await POST(request)
    expect(response.status).toBe(401)
  })
})
