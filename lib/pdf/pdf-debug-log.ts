import { getActivePdfTiming } from "@/lib/pdf/pdf-timing"

export function isPdfDebugLoggingEnabled(): boolean {
  if (process.env.REPORT_PDF_DEBUG === "1") return true
  if (process.env.NODE_ENV !== "production") return true
  return false
}

/** Logs con tiempo relativo; en producción solo si `REPORT_PDF_DEBUG=1`. */
export function createPdfDebugLogger(scope: string) {
  const startedAt = Date.now()
  return (step: string, extra?: Record<string, unknown>) => {
    if (!isPdfDebugLoggingEnabled()) return
    const elapsed = `${Date.now() - startedAt}ms`
    if (extra && Object.keys(extra).length > 0) {
      console.log(`[pdf-debug:${scope}] ${step}`, elapsed, extra)
      return
    }
    console.log(`[pdf-debug:${scope}] ${step}`, elapsed)
  }
}

export function timedStep<T>(
  step: string,
  fn: () => Promise<T>,
  options?: { skipTiming?: boolean }
): Promise<T> {
  const timing = getActivePdfTiming()
  if (!options?.skipTiming && timing) timing.start(step)
  return fn()
    .then((value) => {
      timing?.end("ok")
      return value
    })
    .catch((error: unknown) => {
      const detail = error instanceof Error ? error.message : String(error)
      timing?.end("error", detail)
      throw error
    })
}
