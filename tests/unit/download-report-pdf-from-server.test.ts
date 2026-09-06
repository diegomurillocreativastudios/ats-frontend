import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { downloadReportPdfFromServer } from "@/lib/pdf/download-report-pdf-from-server"
import {
  REPORT_PDF_ENGINE,
  reportPdfTemplateVersion,
} from "@/lib/reportes/report-pdf-constants"

vi.mock("@/lib/auth/csrf-client", () => ({
  csrfHeaders: vi.fn(async (extra?: Record<string, string>) => ({
    ...(extra ?? {}),
    "x-csrf-token": "test-csrf",
  })),
  ensureCsrfToken: vi.fn(async () => "test-csrf"),
}))

const originalFetch = globalThis.fetch
const originalCreateObjectURL = globalThis.URL.createObjectURL
const originalRevokeObjectURL = globalThis.URL.revokeObjectURL

function buildPdfResponse(reportKey: string, rowsCount: number) {
  return new Response(new Blob(["%PDF-1.4"], { type: "application/pdf" }), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "X-Report-Pdf-Engine": REPORT_PDF_ENGINE,
      "X-Report-Pdf-Template-Version": reportPdfTemplateVersion(reportKey),
      "X-Report-Rows-Count": String(rowsCount),
      "X-Report-Key": reportKey,
    },
  })
}

describe("downloadReportPdfFromServer", () => {
  beforeEach(() => {
    globalThis.URL.createObjectURL = vi.fn(() => "blob:test")
    globalThis.URL.revokeObjectURL = vi.fn()

    const anchor = {
      href: "",
      download: "",
      rel: "",
      click: vi.fn(),
      remove: vi.fn(),
    } as unknown as HTMLAnchorElement
    vi.spyOn(document, "createElement").mockReturnValue(anchor)
    vi.spyOn(document.body, "appendChild").mockReturnValue(anchor)
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    globalThis.URL.createObjectURL = originalCreateObjectURL
    globalThis.URL.revokeObjectURL = originalRevokeObjectURL
    vi.restoreAllMocks()
  })

  it("posts to the dynamic [reportKey] endpoint for any schema report", async () => {
    const fetchMock = vi.fn(async () =>
      buildPdfResponse("candidate-status-by-stage", 2)
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch

    await downloadReportPdfFromServer({
      reportType: "candidate-status-by-stage",
      rows: [{ a: 1 }, { a: 2 }],
      summary: { generatedAt: "01/01/2026", totalCount: 2 },
      totalCount: 2,
      fileBaseName: "estatus",
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const [url, init] = call
    expect(url).toBe(
      "/api/recruiter/reportes/candidate-status-by-stage/pdf"
    )
    expect(init.method).toBe("POST")
    expect((init.headers as Record<string, string>)["Accept"]).toBe(
      "application/pdf"
    )
  })

  it("posts to /api/recruiter/reportes/<reportKey>/pdf for vacancy-progress too", async () => {
    const fetchMock = vi.fn(async () =>
      buildPdfResponse("vacancy-progress-by-client", 0)
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch

    await downloadReportPdfFromServer({
      reportType: "vacancy-progress-by-client",
      rows: [],
      summary: null,
      totalCount: 0,
      fileBaseName: "avance",
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/recruiter/reportes/vacancy-progress-by-client/pdf",
      expect.anything()
    )
  })

  it("rejects when the engine header does not match REPORT_PDF_ENGINE", async () => {
    const response = new Response(new Blob(["%PDF-1.4"], { type: "application/pdf" }), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "X-Report-Pdf-Engine": "puppeteer",
        "X-Report-Pdf-Template-Version": reportPdfTemplateVersion(
          "technical-evaluations"
        ),
        "X-Report-Rows-Count": "1",
      },
    })
    globalThis.fetch = vi.fn(async () => response) as unknown as typeof fetch

    await expect(
      downloadReportPdfFromServer({
        reportType: "technical-evaluations",
        rows: [{ a: 1 }],
        totalCount: 1,
        fileBaseName: "evals",
      })
    ).rejects.toThrow(/Motor PDF inesperado/i)
  })

  it("rejects when the rows count header diverges from the client payload", async () => {
    const response = new Response(new Blob(["%PDF-1.4"], { type: "application/pdf" }), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "X-Report-Pdf-Engine": REPORT_PDF_ENGINE,
        "X-Report-Pdf-Template-Version": reportPdfTemplateVersion(
          "recruitment-sources"
        ),
        "X-Report-Rows-Count": "10",
      },
    })
    globalThis.fetch = vi.fn(async () => response) as unknown as typeof fetch

    await expect(
      downloadReportPdfFromServer({
        reportType: "recruitment-sources",
        rows: [{ a: 1 }],
        totalCount: 1,
        fileBaseName: "fuentes",
      })
    ).rejects.toThrow(/Cantidad de filas inconsistente/i)
  })

  it("rejects with the server message when the response is not ok", async () => {
    const response = new Response(
      JSON.stringify({ message: "No autorizado" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    )
    globalThis.fetch = vi.fn(async () => response) as unknown as typeof fetch

    await expect(
      downloadReportPdfFromServer({
        reportType: "preliminary-match-scores",
        rows: [{ a: 1 }],
        totalCount: 1,
      })
    ).rejects.toThrow(/No autorizado/i)
  })
})
