import { z } from "zod"
import type { ReportSchema } from "@/lib/reportes/schema/report-schema-types"

const reportMetaItemSchema = z.object({
  label: z.string(),
  value: z.string(),
})

const sectionTitleSchema = z.object({
  type: z.literal("sectionTitle"),
  title: z.string(),
  subtitle: z.string().optional(),
})

const heroHeaderSchema = z.object({
  type: z.literal("heroHeader"),
  eyebrow: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  meta: z.array(reportMetaItemSchema).optional(),
})

const kpiGridItemSchema = z.object({
  label: z.string(),
  value: z.string(),
  caption: z.string().optional(),
})

const kpiGridSchema = z.object({
  type: z.literal("kpiGrid"),
  title: z.string(),
  columns: z.number().int().positive().optional(),
  items: z.array(kpiGridItemSchema),
})

const findingsItemSchema = z.object({
  label: z.string(),
  value: z.string(),
})

const findingsSchema = z.object({
  type: z.literal("findings"),
  title: z.string(),
  items: z.array(findingsItemSchema),
})

const tableColumnSchema = z.object({
  header: z.string(),
  binding: z.string(),
  align: z.enum(["left", "center", "right"]).optional(),
  width: z.string().optional(),
})

const tableSchema = z.object({
  type: z.literal("table"),
  title: z.string(),
  rowsBinding: z.string(),
  columns: z.array(tableColumnSchema),
  emptyText: z.string().optional(),
})

const vacancyCardMetricSchema = z.object({
  label: z.string(),
  binding: z.string(),
})

const vacancyCardProgressSchema = z.object({
  label: z.string().optional(),
  valueBinding: z.string().optional(),
  percentBinding: z.string().optional(),
})

const vacancyCardPipelineSchema = z.object({
  title: z.string().optional(),
  hasDataBinding: z.string().optional(),
  rowsBinding: z.string().optional(),
  labelBinding: z.string().optional(),
  valueBinding: z.string().optional(),
  emptyText: z.string().optional(),
})

const vacancyCardAdditionalDetailSchema = z.object({
  title: z.string().optional(),
  text: z.string().optional(),
})

const vacancyCardSchema = z.object({
  titleBinding: z.string(),
  subtitleBinding: z.string().optional(),
  statusBinding: z.string().optional(),
  metrics: z.array(vacancyCardMetricSchema).optional(),
  progress: vacancyCardProgressSchema.optional(),
  pipeline: vacancyCardPipelineSchema.optional(),
  additionalDetail: vacancyCardAdditionalDetailSchema.optional(),
})

const vacancyCardsSchema = z.object({
  type: z.literal("vacancyCards"),
  title: z.string(),
  rowsBinding: z.string(),
  card: vacancyCardSchema,
})

const pageBreakSchema = z.object({
  type: z.literal("pageBreak"),
})

const reportLayoutSchema = z.object({
  pageSize: z.string().optional(),
  orientation: z.enum(["portrait", "landscape"]).optional(),
})

const reportSectionSchema = z.discriminatedUnion("type", [
  heroHeaderSchema,
  kpiGridSchema,
  findingsSchema,
  tableSchema,
  vacancyCardsSchema,
  pageBreakSchema,
  sectionTitleSchema,
])

const reportSchema = z.object({
  version: z.number(),
  reportKey: z.string(),
  title: z.string().optional(),
  layout: reportLayoutSchema.optional(),
  sections: z.array(reportSectionSchema),
})

function parseRawSchemaInput(input: unknown): unknown {
  if (typeof input === "string") {
    const trimmed = input.trim()
    if (!trimmed) throw new Error("La plantilla del reporte está vacía.")
    try {
      return JSON.parse(trimmed) as unknown
    } catch (error: unknown) {
      throw new Error(
        `La plantilla del reporte no es un JSON válido: ${
          error instanceof Error ? error.message : "parse error"
        }`
      )
    }
  }
  return input
}

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "schema"
      return `${path}: ${issue.message}`
    })
    .join(" | ")
}

export function parseReportSchema(input: unknown): ReportSchema {
  const raw = parseRawSchemaInput(input)
  const parsed = reportSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(`La plantilla del reporte es inválida: ${formatZodError(parsed.error)}`)
  }
  return parsed.data
}

export function safeParseReportSchema(
  input: unknown
): { success: true; data: ReportSchema } | { success: false; error: string } {
  try {
    const raw = parseRawSchemaInput(input)
    const parsed = reportSchema.safeParse(raw)
    if (!parsed.success) {
      return { success: false, error: formatZodError(parsed.error) }
    }
    return { success: true, data: parsed.data }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al validar la plantilla.",
    }
  }
}
