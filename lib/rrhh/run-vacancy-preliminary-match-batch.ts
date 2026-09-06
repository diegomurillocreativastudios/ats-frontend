/**
 * Ejecuta el análisis preliminar de vacante en serie (un documentId por POST),
 * con progreso por candidato y continue-on-error.
 */

export const VACANCY_PRELIMINARY_MATCH_COMPLETED_HOLD_MS = 550

export interface VacancyPreliminaryMatchBatchItem {
  documentId: string
  displayName?: string
}

export interface VacancyPreliminaryMatchBatchProgress {
  cycleKey: string
  batchIndex: number
  batchTotal: number
  documentId: string
  displayName?: string
  isCompleted: boolean
}

export interface VacancyPreliminaryMatchBatchFailure {
  documentId: string
  displayName?: string
  message: string
}

export interface VacancyPreliminaryMatchBatchResult {
  succeeded: number
  failed: VacancyPreliminaryMatchBatchFailure[]
  total: number
}

export interface RunVacancyPreliminaryMatchBatchOptions {
  items: VacancyPreliminaryMatchBatchItem[]
  matchOne: (documentId: string) => Promise<void>
  onProgress: (progress: VacancyPreliminaryMatchBatchProgress) => void
  createCycleKey?: () => string
  completedHoldMs?: number
  getErrorMessage?: (err: unknown) => string
  sleep?: (ms: number) => Promise<void>
}

export function createMatchCycleKey(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID()
  }
  return `match-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

function defaultErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const rec = err as Record<string, unknown>
    if (typeof rec.message === "string" && rec.message.trim()) {
      return rec.message.trim()
    }
    if (typeof rec.detail === "string" && rec.detail.trim()) {
      return rec.detail.trim()
    }
  }
  if (typeof err === "string" && err.trim()) return err.trim()
  return "No se pudo ejecutar el emparejamiento."
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Procesa cada candidato en serie. Si uno falla, lo registra y continúa con el resto.
 * Al terminar el último ítem con éxito, marca `isCompleted` y espera el hold de animación.
 */
export async function runVacancyPreliminaryMatchBatch(
  options: RunVacancyPreliminaryMatchBatchOptions
): Promise<VacancyPreliminaryMatchBatchResult> {
  const {
    items,
    matchOne,
    onProgress,
    createCycleKey = createMatchCycleKey,
    completedHoldMs = VACANCY_PRELIMINARY_MATCH_COMPLETED_HOLD_MS,
    getErrorMessage = defaultErrorMessage,
    sleep = defaultSleep,
  } = options

  const total = items.length
  const failed: VacancyPreliminaryMatchBatchFailure[] = []
  let succeeded = 0

  if (total === 0) {
    return { succeeded: 0, failed: [], total: 0 }
  }

  for (let index = 0; index < total; index++) {
    const item = items[index]
    const cycleKey = createCycleKey()
    const batchIndex = index + 1
    const isLast = index === total - 1

    onProgress({
      cycleKey,
      batchIndex,
      batchTotal: total,
      documentId: item.documentId,
      displayName: item.displayName,
      isCompleted: false,
    })

    try {
      await matchOne(item.documentId)
      succeeded += 1

      if (isLast) {
        onProgress({
          cycleKey,
          batchIndex,
          batchTotal: total,
          documentId: item.documentId,
          displayName: item.displayName,
          isCompleted: true,
        })
        await sleep(completedHoldMs)
      }
    } catch (err: unknown) {
      failed.push({
        documentId: item.documentId,
        displayName: item.displayName,
        message: getErrorMessage(err),
      })
    }
  }

  return { succeeded, failed, total }
}
