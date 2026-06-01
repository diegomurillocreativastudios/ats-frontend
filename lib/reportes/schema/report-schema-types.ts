export interface ReportSchema {
  version: number
  reportKey: string
  title?: string
  layout?: ReportLayout
  sections: ReportSection[]
}

export interface ReportLayout {
  pageSize?: string
  orientation?: "portrait" | "landscape"
}

export interface SectionTitleSection {
  type: "sectionTitle"
  title: string
  subtitle?: string
}

export interface HeroHeaderSection {
  type: "heroHeader"
  eyebrow?: string
  title: string
  description?: string
  meta?: ReportMetaItem[]
}

export interface ReportMetaItem {
  label: string
  value: string
}

export interface KpiGridSection {
  type: "kpiGrid"
  title: string
  columns?: number
  items: KpiGridItem[]
}

export interface KpiGridItem {
  label: string
  value: string
  caption?: string
}

export interface FindingsSection {
  type: "findings"
  title: string
  items: FindingsItem[]
}

export interface FindingsItem {
  label: string
  value: string
}

export interface TableSection {
  type: "table"
  title: string
  rowsBinding: string
  columns: TableColumn[]
  emptyText?: string
}

export interface TableColumn {
  header: string
  binding: string
  align?: "left" | "center" | "right"
  width?: string
}

export interface VacancyCardsSection {
  type: "vacancyCards"
  title: string
  rowsBinding: string
  card: VacancyCardConfig
}

export interface VacancyCardConfig {
  titleBinding: string
  subtitleBinding?: string
  statusBinding?: string
  metrics?: VacancyCardMetric[]
  progress?: VacancyCardProgress
  pipeline?: VacancyCardPipeline
  additionalDetail?: VacancyCardAdditionalDetail
}

export interface VacancyCardMetric {
  label: string
  binding: string
}

export interface VacancyCardProgress {
  label?: string
  valueBinding?: string
  percentBinding?: string
}

export interface VacancyCardPipeline {
  title?: string
  hasDataBinding?: string
  rowsBinding?: string
  labelBinding?: string
  valueBinding?: string
  emptyText?: string
}

export interface VacancyCardAdditionalDetail {
  title?: string
  text?: string
}

export interface PageBreakSection {
  type: "pageBreak"
}

export type ReportSection =
  | HeroHeaderSection
  | KpiGridSection
  | FindingsSection
  | TableSection
  | VacancyCardsSection
  | PageBreakSection
  | SectionTitleSection
