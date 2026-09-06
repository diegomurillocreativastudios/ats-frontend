import { z } from "zod"
import { DEFAULT_TECHNICAL_SHEET_SCHEMA } from "@/lib/technical-sheet/schema/technical-sheet-default-schema"
import type { TechnicalSheetSchema } from "@/lib/technical-sheet/schema/technical-sheet-schema-types"

const labeledBindingSchema = z.object({
  label: z.string(),
  binding: z.string(),
})

const repeatCardsBulletsSchema = z.object({
  title: z.string(),
  rowsBinding: z.string(),
  item: z.string().optional(),
})

const repeatCardsSchema = z.object({
  type: z.literal("repeatCards"),
  title: z.string(),
  rowsBinding: z.string(),
  fields: z.array(labeledBindingSchema),
  bullets: repeatCardsBulletsSchema.optional(),
  emptyText: z.string().optional(),
})

const bulletListSchema = z.object({
  type: z.literal("bulletList"),
  title: z.string(),
  rowsBinding: z.string(),
  item: z.string(),
  emptyText: z.string().optional(),
})

const factsItemSchema = z.object({
  label: z.string(),
  value: z.string(),
})

const factsSchema = z.object({
  type: z.literal("facts"),
  title: z.string(),
  items: z.array(factsItemSchema),
})

const paragraphSchema = z.object({
  type: z.literal("paragraph"),
  title: z.string(),
  text: z.string(),
})

const technicalSheetSectionSchema = z.discriminatedUnion("type", [
  repeatCardsSchema,
  bulletListSchema,
  factsSchema,
  paragraphSchema,
])

const technicalSheetSchema = z.object({
  version: z.number(),
  kind: z.literal("technical-sheet"),
  title: z.string().optional(),
  sections: z.array(technicalSheetSectionSchema),
})

function parseRawSchemaInput(input: unknown): unknown {
  if (typeof input === "string") {
    const trimmed = input.trim()
    if (!trimmed) throw new Error("La plantilla de la ficha técnica está vacía.")
    try {
      return JSON.parse(trimmed) as unknown
    } catch (error: unknown) {
      throw new Error(
        `La plantilla de la ficha técnica no es un JSON válido: ${
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

export function parseTechnicalSheetSchema(input: unknown): TechnicalSheetSchema {
  const raw = parseRawSchemaInput(input)
  const parsed = technicalSheetSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(`La plantilla de la ficha técnica es inválida: ${formatZodError(parsed.error)}`)
  }
  return parsed.data
}

export function safeParseTechnicalSheetSchema(
  input: unknown
): { success: true; data: TechnicalSheetSchema } | { success: false; error: string } {
  try {
    const raw = parseRawSchemaInput(input)
    const parsed = technicalSheetSchema.safeParse(raw)
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

export function resolveTechnicalSheetSchema(contentTemplate: string | unknown): {
  schema: TechnicalSheetSchema
  source: "template" | "default"
} {
  const parsed = safeParseTechnicalSheetSchema(contentTemplate)
  if (parsed.success) return { schema: parsed.data, source: "template" }
  return { schema: DEFAULT_TECHNICAL_SHEET_SCHEMA, source: "default" }
}
