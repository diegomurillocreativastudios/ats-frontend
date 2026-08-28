import {
  TECHNICAL_SHEET_PDF_MAX_CONCURRENT,
  TECHNICAL_SHEET_PDF_RATE_LIMIT_MAX,
  TECHNICAL_SHEET_PDF_RATE_LIMIT_WINDOW_MS,
} from "@/lib/technical-sheet/pdf-chromium-limits"

export class TechnicalSheetPdfBusyError extends Error {
  status = 503

  constructor(message = "El servicio de PDF está saturado. Intenta de nuevo en unos segundos.") {
    super(message)
    this.name = "TechnicalSheetPdfBusyError"
  }
}

export class TechnicalSheetPdfRateLimitError extends Error {
  status = 429
  retryAfterSec: number

  constructor(retryAfterSec: number) {
    super("Has alcanzado el límite de generaciones de PDF. Intenta de nuevo más tarde.")
    this.name = "TechnicalSheetPdfRateLimitError"
    this.retryAfterSec = Math.max(1, retryAfterSec)
  }
}

interface SemaphoreState {
  active: number
  max: number
}

const semaphore: SemaphoreState = {
  active: 0,
  max: TECHNICAL_SHEET_PDF_MAX_CONCURRENT,
}

const rateHits = new Map<string, number[]>()

/**
 * Resetea estado in-process (solo tests).
 */
export function resetTechnicalSheetPdfConcurrencyForTests(options?: {
  maxConcurrent?: number
}): void {
  semaphore.active = 0
  semaphore.max =
    options?.maxConcurrent != null && options.maxConcurrent > 0
      ? options.maxConcurrent
      : TECHNICAL_SHEET_PDF_MAX_CONCURRENT
  rateHits.clear()
}

/**
 * Intenta reservar un slot de Chromium. Si está lleno, no encola: el caller debe responder 503.
 */
export function tryAcquireTechnicalSheetPdfSlot(): (() => void) | null {
  if (semaphore.active >= semaphore.max) return null
  semaphore.active += 1
  let released = false
  return () => {
    if (released) return
    released = true
    semaphore.active = Math.max(0, semaphore.active - 1)
  }
}

/**
 * Cuota por clave (usuario / token). Ventana deslizante in-process.
 */
export function assertTechnicalSheetPdfRateLimit(key: string): void {
  const id = key.trim() || "anonymous"
  const now = Date.now()
  const windowMs = TECHNICAL_SHEET_PDF_RATE_LIMIT_WINDOW_MS
  const max = TECHNICAL_SHEET_PDF_RATE_LIMIT_MAX
  const prev = rateHits.get(id) ?? []
  const recent = prev.filter((t) => now - t < windowMs)
  if (recent.length >= max) {
    const oldest = recent[0] ?? now
    const retryAfterSec = Math.ceil((oldest + windowMs - now) / 1000)
    rateHits.set(id, recent)
    throw new TechnicalSheetPdfRateLimitError(retryAfterSec)
  }
  recent.push(now)
  rateHits.set(id, recent)
}

/**
 * Ejecuta trabajo Chromium bajo semáforo; lanza {@link TechnicalSheetPdfBusyError} si no hay cupo.
 */
export async function withTechnicalSheetPdfSlot<T>(work: () => Promise<T>): Promise<T> {
  const release = tryAcquireTechnicalSheetPdfSlot()
  if (!release) throw new TechnicalSheetPdfBusyError()
  try {
    return await work()
  } finally {
    release()
  }
}

export function getTechnicalSheetPdfSemaphoreSnapshotForTests(): {
  active: number
  max: number
} {
  return { active: semaphore.active, max: semaphore.max }
}
