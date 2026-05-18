import { apiClient } from "@/lib/api"
import type {
  ReportDocumentHistoryItem,
  ReportDocumentHistoryParams,
  ReportDocumentPreviewRequest,
  ReportDocumentPreviewResponse,
  ReportFilterField,
  ReportFilterFieldOption,
  ReportFilterSchema,
  ReportPdfUploadResponse,
  ReportTemplateConfig,
} from "@/lib/reportes/report-document-types"

const REPORT_TEMPLATES_PREFIX = "/api/recruiter/report-templates"
const REPORT_DOCUMENTS_PREFIX = "/api/recruiter/report-documents"

function buildQuery(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v == null || String(v).trim() === "") continue
    sp.set(k, String(v).trim())
  }
  const q = sp.toString()
  return q ? `?${q}` : ""
}

function mapFilterOption(raw: unknown): ReportFilterFieldOption | null {
  if (!raw || typeof raw !== "object") return null
  const rec = raw as Record<string, unknown>
  const value = String(rec.value ?? rec.id ?? rec.key ?? "").trim()
  if (!value) return null
  const label = String(rec.label ?? rec.name ?? rec.title ?? value).trim()
  return { value, label }
}

function coerceFilterField(raw: unknown): ReportFilterField | null {
  if (!raw || typeof raw !== "object") return null
  const rec = raw as Record<string, unknown>
  const key = String(rec.key ?? rec.name ?? "").trim()
  if (!key) return null
  const typeRaw = String(rec.type ?? rec.fieldType ?? "text").trim()
  const type = (
    ["text", "select", "multiselect", "date", "dateRange"].includes(typeRaw)
      ? typeRaw
      : "text"
  ) as ReportFilterField["type"]
  const optionsRaw = rec.options ?? rec.Options ?? rec.staticOptions
  let options: ReportFilterFieldOption[] | undefined
  if (Array.isArray(optionsRaw)) {
    options = optionsRaw
      .map(mapFilterOption)
      .filter((x): x is ReportFilterFieldOption => x != null)
  }
  const sourceRaw = rec.source ?? rec.dataSource
  const source =
    sourceRaw != null && String(sourceRaw).trim() !== ""
      ? (String(sourceRaw).trim() as ReportFilterField["source"])
      : undefined

  return {
    key,
    label: String(rec.label ?? rec.title ?? key).trim(),
    type,
    required: Boolean(rec.required ?? rec.isRequired),
    source,
    options,
    fromKey: rec.fromKey != null ? String(rec.fromKey) : undefined,
    toKey: rec.toKey != null ? String(rec.toKey) : undefined,
    placeholder: rec.placeholder != null ? String(rec.placeholder) : undefined,
    dependsOn: rec.dependsOn != null ? String(rec.dependsOn) : undefined,
  }
}

export function coerceReportFilterSchema(raw: unknown): ReportFilterSchema {
  if (!raw || typeof raw !== "object") return { fields: [] }
  const rec = raw as Record<string, unknown>
  const fieldsRaw = rec.fields ?? rec.Fields ?? []
  if (!Array.isArray(fieldsRaw)) return { fields: [] }
  const fields = fieldsRaw
    .map(coerceFilterField)
    .filter((x): x is ReportFilterField => x != null)
  return { fields }
}

export function coerceReportTemplateConfig(raw: unknown): ReportTemplateConfig {
  if (!raw || typeof raw !== "object") {
    return {
      reportKey: "unknown",
      filterSchema: { fields: [] },
      defaultFilters: {},
    }
  }
  const rec = raw as Record<string, unknown>
  const filterSchema = coerceReportFilterSchema(
    rec.filterSchema ?? rec.FilterSchema ?? rec.filters ?? rec.Filters
  )
  const defaultFiltersRaw = rec.defaultFilters ?? rec.DefaultFilters ?? {}
  const defaultFilters =
    defaultFiltersRaw && typeof defaultFiltersRaw === "object" && !Array.isArray(defaultFiltersRaw)
      ? (defaultFiltersRaw as Record<string, unknown>)
      : {}

  const orientationRaw = String(rec.pdfOrientation ?? rec.PdfOrientation ?? "").trim()
  const pdfOrientation =
    orientationRaw === "landscape" || orientationRaw === "portrait"
      ? orientationRaw
      : undefined

  const formatRaw = String(rec.pdfFormat ?? rec.PdfFormat ?? "a4").trim().toLowerCase()
  const pdfFormat = formatRaw === "letter" ? "letter" : "a4"

  return {
    reportKey: String(rec.reportKey ?? rec.ReportKey ?? "unknown").trim() || "unknown",
    filterSchema,
    defaultFilters,
    pdfOrientation,
    pdfFormat,
  }
}

function coercePreviewResponse(raw: unknown): ReportDocumentPreviewResponse {
  if (!raw || typeof raw !== "object") {
    return { context: {} }
  }
  const rec = raw as Record<string, unknown>
  const contextRaw = rec.context ?? rec.Context ?? {}
  const context =
    contextRaw && typeof contextRaw === "object" && !Array.isArray(contextRaw)
      ? (contextRaw as Record<string, unknown>)
      : {}

  const configRaw = rec.config ?? rec.Config
  const config =
    configRaw != null ? coerceReportTemplateConfig(configRaw) : null

  const filtersAppliedRaw = rec.filtersApplied ?? rec.FiltersApplied
  const filtersApplied =
    filtersAppliedRaw &&
    typeof filtersAppliedRaw === "object" &&
    !Array.isArray(filtersAppliedRaw)
      ? (filtersAppliedRaw as Record<string, unknown>)
      : undefined

  const historyIdRaw = rec.historyId ?? rec.HistoryId
  const historyId =
    historyIdRaw != null && String(historyIdRaw).trim() !== ""
      ? String(historyIdRaw).trim()
      : null

  return {
    historyId,
    template:
      rec.template && typeof rec.template === "object"
        ? (rec.template as Record<string, unknown>)
        : null,
    config,
    filtersApplied,
    context,
  }
}

function coerceHistoryItem(raw: unknown): ReportDocumentHistoryItem | null {
  if (!raw || typeof raw !== "object") return null
  const rec = raw as Record<string, unknown>
  const id = String(rec.id ?? rec.historyId ?? rec.HistoryId ?? "").trim()
  if (!id) return null
  const filtersAppliedRaw = rec.filtersApplied ?? rec.FiltersApplied
  return {
    id,
    templateId:
      rec.templateId != null
        ? String(rec.templateId)
        : rec.TemplateId != null
          ? String(rec.TemplateId)
          : undefined,
    reportKey:
      rec.reportKey != null
        ? String(rec.reportKey)
        : rec.ReportKey != null
          ? String(rec.ReportKey)
          : undefined,
    createdAt:
      rec.createdAt != null
        ? String(rec.createdAt)
        : rec.CreatedAt != null
          ? String(rec.CreatedAt)
          : undefined,
    filtersApplied:
      filtersAppliedRaw &&
      typeof filtersAppliedRaw === "object" &&
      !Array.isArray(filtersAppliedRaw)
        ? (filtersAppliedRaw as Record<string, unknown>)
        : undefined,
  }
}

export function isReportConfigNotFoundError(err: unknown): boolean {
  const status =
    typeof err === "object" && err !== null && "status" in err
      ? Number((err as { status?: number }).status)
      : 0
  return status === 404
}

/**
 * GET /api/recruiter/report-templates/{templateId}/config
 * Returns null when the endpoint is not available (404).
 */
export async function fetchReportTemplateConfig(
  templateId: string
): Promise<ReportTemplateConfig | null> {
  const id = templateId.trim()
  if (!id) return null
  try {
    const raw = await apiClient.get(
      `${REPORT_TEMPLATES_PREFIX}/${encodeURIComponent(id)}/config`
    )
    return coerceReportTemplateConfig(raw)
  } catch (err: unknown) {
    if (isReportConfigNotFoundError(err)) return null
    throw err
  }
}

/**
 * POST /api/recruiter/report-documents/preview
 */
export async function generateReportDocumentPreview(
  request: ReportDocumentPreviewRequest
): Promise<ReportDocumentPreviewResponse> {
  const raw = await apiClient.post(`${REPORT_DOCUMENTS_PREFIX}/preview`, {
    templateId: request.templateId,
    filters: request.filters,
  })
  return coercePreviewResponse(raw)
}

/**
 * POST /api/recruiter/report-documents/{historyId}/pdf
 */
export async function uploadReportDocumentPdf(input: {
  historyId: string
  file: Blob
  fileName?: string
}): Promise<ReportPdfUploadResponse> {
  const historyId = input.historyId.trim()
  if (!historyId) {
    throw new Error("historyId is required to upload report PDF")
  }
  const formData = new FormData()
  const name = input.fileName?.trim() || "reporte.pdf"
  formData.append("file", input.file, name)
  const raw = await apiClient.postFormData(
    `${REPORT_DOCUMENTS_PREFIX}/${encodeURIComponent(historyId)}/pdf`,
    formData
  )
  if (!raw || typeof raw !== "object") {
    return { historyId, saved: true }
  }
  const rec = raw as Record<string, unknown>
  return {
    historyId: String(rec.historyId ?? rec.HistoryId ?? historyId),
    saved: rec.saved != null ? Boolean(rec.saved) : rec.Saved != null ? Boolean(rec.Saved) : true,
    message:
      rec.message != null
        ? String(rec.message)
        : rec.Message != null
          ? String(rec.Message)
          : undefined,
  }
}

/**
 * Optional history listing when backend exposes it.
 */
export async function fetchReportDocumentHistory(
  params: ReportDocumentHistoryParams = {}
): Promise<{ items: ReportDocumentHistoryItem[]; totalCount: number }> {
  const raw = await apiClient.get(
    `${REPORT_DOCUMENTS_PREFIX}/history${buildQuery({
      templateId: params.templateId,
      page: params.page,
      pageSize: params.pageSize,
    })}`
  )
  if (!raw || typeof raw !== "object") {
    return { items: [], totalCount: 0 }
  }
  const rec = raw as Record<string, unknown>
  const itemsRaw = rec.items ?? rec.Items ?? rec.rows ?? rec.Rows ?? []
  const items = Array.isArray(itemsRaw)
    ? itemsRaw
        .map(coerceHistoryItem)
        .filter((x): x is ReportDocumentHistoryItem => x != null)
    : []
  const totalRaw = rec.totalCount ?? rec.TotalCount ?? items.length
  const totalCount =
    typeof totalRaw === "number" && !Number.isNaN(totalRaw)
      ? totalRaw
      : Number.parseInt(String(totalRaw), 10) || items.length
  return { items, totalCount }
}
