export interface PdfTimingEntry {
  step: string
  ms: number
  result: "ok" | "error" | "skip"
  detail?: string
}

/** Acumula duración por etapa para respuestas JSON y tablas de diagnóstico. */
export class PdfTimingCollector {
  private readonly startedAt = Date.now()
  private readonly entries: PdfTimingEntry[] = []
  private stepStartedAt: number | null = null
  private currentStep: string | null = null

  start(step: string): void {
    this.endCurrent()
    this.currentStep = step
    this.stepStartedAt = Date.now()
  }

  end(result: "ok" | "error" | "skip" = "ok", detail?: string): void {
    if (!this.currentStep || this.stepStartedAt === null) return
    this.entries.push({
      step: this.currentStep,
      ms: Date.now() - this.stepStartedAt,
      result,
      ...(detail ? { detail } : {}),
    })
    this.currentStep = null
    this.stepStartedAt = null
  }

  endCurrent(): void {
    if (this.currentStep) this.end("ok")
  }

  getEntries(): PdfTimingEntry[] {
    this.endCurrent()
    return [...this.entries]
  }

  getTotalMs(): number {
    return Date.now() - this.startedAt
  }
}

let activeTiming: PdfTimingCollector | null = null

export function setActivePdfTiming(collector: PdfTimingCollector | null): void {
  activeTiming = collector
}

export function getActivePdfTiming(): PdfTimingCollector | null {
  return activeTiming
}
