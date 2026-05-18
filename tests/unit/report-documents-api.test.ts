import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  coerceReportTemplateConfig,
  fetchReportTemplateConfig,
  generateReportDocumentPreview,
  isReportConfigNotFoundError,
} from "@/lib/api/report-documents"

const apiGet = vi.fn()
const apiPost = vi.fn()

vi.mock("@/lib/api", () => ({
  apiClient: {
    get: (...args: unknown[]) => apiGet(...args),
    post: (...args: unknown[]) => apiPost(...args),
    postFormData: vi.fn(),
  },
}))

describe("coerceReportTemplateConfig", () => {
  it("maps camelCase config with filter fields", () => {
    const config = coerceReportTemplateConfig({
      reportKey: "executive-summary",
      filterSchema: {
        fields: [
          { key: "clientId", label: "Cliente", type: "select", source: "clients" },
          { key: "dateFrom", label: "Desde", type: "date" },
        ],
      },
      defaultFilters: { clientId: "", dateFrom: "2026-05-01" },
      pdfOrientation: "landscape",
      pdfFormat: "a4",
    })

    expect(config.reportKey).toBe("executive-summary")
    expect(config.filterSchema.fields).toHaveLength(2)
    expect(config.defaultFilters).toEqual({ clientId: "", dateFrom: "2026-05-01" })
    expect(config.pdfOrientation).toBe("landscape")
    expect(config.pdfFormat).toBe("a4")
  })
})

describe("isReportConfigNotFoundError", () => {
  it("detects 404 status on error objects", () => {
    const err = new Error("not found") as Error & { status: number }
    err.status = 404
    expect(isReportConfigNotFoundError(err)).toBe(true)
    err.status = 500
    expect(isReportConfigNotFoundError(err)).toBe(false)
  })
})

describe("fetchReportTemplateConfig", () => {
  beforeEach(() => {
    apiGet.mockReset()
  })

  it("returns null on 404 without throwing", async () => {
    const err = new Error("Not found") as Error & { status: number }
    err.status = 404
    apiGet.mockRejectedValueOnce(err)

    const result = await fetchReportTemplateConfig("tpl-1")
    expect(result).toBeNull()
    expect(apiGet).toHaveBeenCalledWith("/api/recruiter/report-templates/tpl-1/config")
  })

  it("returns coerced config on success", async () => {
    apiGet.mockResolvedValueOnce({
      reportKey: "pipeline",
      filterSchema: { fields: [] },
      defaultFilters: {},
    })

    const result = await fetchReportTemplateConfig("tpl-2")
    expect(result?.reportKey).toBe("pipeline")
  })
})

describe("generateReportDocumentPreview", () => {
  beforeEach(() => {
    apiPost.mockReset()
  })

  it("POSTs templateId and filters to preview endpoint", async () => {
    apiPost.mockResolvedValueOnce({
      historyId: "hist-1",
      context: { summary: { totalVacancies: 3 } },
    })

    const result = await generateReportDocumentPreview({
      templateId: "tpl-1",
      filters: { clientId: "c1" },
    })

    expect(apiPost).toHaveBeenCalledWith("/api/recruiter/report-documents/preview", {
      templateId: "tpl-1",
      filters: { clientId: "c1" },
    })
    expect(result.historyId).toBe("hist-1")
    expect(result.context.summary).toEqual({ totalVacancies: 3 })
  })
})
