/**
 * Etiquetas de progreso simulado para ingest de CV (modal Agregar candidato).
 * Umbrales alineados con el plan de producto (% incluyente por tramo).
 */
export const AI_INGEST_PROGRESS_COMPLETED_LABEL = "Completado"
export const AI_INGEST_PROGRESS_STEPS = [
  "Subiendo CV",
  "Procesando archivo",
  "Extrayendo datos",
  "Analizando con IA",
  "Validando perfil",
  "Generando match-data",
  "Guardando",
  AI_INGEST_PROGRESS_COMPLETED_LABEL,
] as const

export type AiIngestProgressStepLabel = (typeof AI_INGEST_PROGRESS_STEPS)[number]

export function getAiIngestStepIndexFromPercent(percent: number): number {
  const p = Math.min(100, Math.max(0, percent))
  if (p >= 100) return 7
  if (p <= 12) return 0
  if (p <= 24) return 1
  if (p <= 36) return 2
  if (p <= 52) return 3
  if (p <= 68) return 4
  if (p <= 82) return 5
  return 6
}

export function getAiIngestStatusLabelFromPercent(percent: number): string {
  return AI_INGEST_PROGRESS_STEPS[getAiIngestStepIndexFromPercent(percent)]
}
