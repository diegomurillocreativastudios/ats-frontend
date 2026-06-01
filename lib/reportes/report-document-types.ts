export type ReportFilterFieldType =
  | "text"
  | "select"
  | "multiselect"
  | "date"
  | "dateRange"

export type ReportFilterSource =
  | "clients"
  | "vacancies"
  | "stages"
  | "recruiters"
  | "static"

export interface ReportFilterFieldOption {
  value: string
  label: string
}

export interface ReportFilterField {
  key: string
  label: string
  type: ReportFilterFieldType
  required?: boolean
  source?: ReportFilterSource
  options?: ReportFilterFieldOption[]
  fromKey?: string
  toKey?: string
  placeholder?: string
  dependsOn?: string
}

export interface ReportFilterSchema {
  fields: ReportFilterField[]
}

export interface ReportTemplateConfig {
  reportKey: string
  filterSchema: ReportFilterSchema
  defaultFilters: Record<string, unknown>
  pdfOrientation?: "portrait" | "landscape"
  pdfFormat?: "a4" | "letter"
}

export interface ReportDocumentPreviewRequest {
  templateId: string
  filters: Record<string, unknown>
}

export interface ReportDocumentPreviewResponse {
  historyId?: string | null
  template?: Record<string, unknown> | null
  config?: ReportTemplateConfig | null
  filtersApplied?: Record<string, unknown>
  context: Record<string, unknown>
}

export interface ReportPdfUploadResponse {
  historyId?: string
  saved?: boolean
  message?: string
}

export interface ReportDocumentHistoryParams {
  templateId?: string
  page?: number
  pageSize?: number
}

export interface ReportDocumentHistoryItem {
  id: string
  templateId?: string
  reportKey?: string
  createdAt?: string
  filtersApplied?: Record<string, unknown>
}
