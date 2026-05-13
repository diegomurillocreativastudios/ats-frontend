/** Intervalo para recalcular el avance según el tiempo (misma curva que `/oportunidades/.../aplicar`). */
export const APPLY_LOADING_TICK_MS = 160

/** Máximo % de la barra mientras el servidor no responde */
export const APPLY_LOADING_BAR_CAP = 92

/**
 * Tiempo típico del POST + pipeline (observado ~1,06 min). La barra llega ~86% cerca de aquí;
 * si tarda más, sube lentamente hasta el tope.
 */
export const APPLY_TYPICAL_SUBMIT_MS = Math.round(1.06 * 60_000)

/** Ingest al añadir candidato (RRHH): duración objetivo de animación ~25s. */
export const RECRUITER_ADD_CANDIDATE_TYPICAL_MS = 25_000

/** Búsqueda preliminar con IA (vacante): ajusta la barra al ritmo del POST de búsqueda. */
export const VACANCY_SMART_PRELIMINARY_SEARCH_TYPICAL_MS = 50_000

/** POST `/api/recruiter/vacancies/:id/match` (Análisis preliminar): ritmo de animación ~20s. */
export const VACANCY_PRELIMINARY_MATCH_TYPICAL_MS = 20_000

/**
 * Escala la duración típica del stepper de análisis preliminar cuando se envían varios `docIds` en una sola request.
 * El factor tiene tope para no inflar demasiado la animación.
 *
 * Progreso por candidato individual en el stepper requeriría otro contrato backend (p. ej. POST secuenciales por documento,
 * SSE o WebSocket) porque hoy el cliente solo espera una respuesta agregada.
 */
export function getVacancyPreliminaryMatchTypicalMsForDocCount(docCount: number): number {
  const n = Math.max(1, Math.floor(docCount))
  const factor = Math.min(
    1.75,
    1 + 0.18 * Math.min(n - 1, 8)
  )
  return Math.round(VACANCY_PRELIMINARY_MATCH_TYPICAL_MS * factor)
}

/** Si el envío supera esto, el formulario público muestra texto orientativo */
export const APPLY_LONG_WAIT_HINT_MS = 35_000

export function interpolateLoadingPercent(
  elapsedMs: number,
  points: readonly (readonly [number, number])[]
): number {
  if (elapsedMs <= points[0][0]) return points[0][1]
  for (let i = 1; i < points.length; i++) {
    const [t0, p0] = points[i - 1]
    const [t1, p1] = points[i]
    if (elapsedMs <= t1) {
      const u = (elapsedMs - t0) / (t1 - t0)
      return p0 + u * (p1 - p0)
    }
  }
  return points[points.length - 1][1]
}

/**
 * Curva de avance: mismos “hitos” de porcentaje que el apply público, con tiempos escalados al `typicalDurationMs` real.
 */
export function getLoadingBarPercentForTypicalDuration(
  elapsedMs: number,
  typicalDurationMs: number
): number {
  const cap = APPLY_LOADING_BAR_CAP
  const scale = typicalDurationMs / APPLY_TYPICAL_SUBMIT_MS
  const typical = typicalDurationMs
  const overtimeEnd = typical + 120_000
  const points: readonly (readonly [number, number])[] = [
    [0, 4],
    [Math.round(9_000 * scale), 16],
    [Math.round(22_000 * scale), 34],
    [Math.round(40_000 * scale), 52],
    [Math.round(52_000 * scale), 68],
    [typical, 86],
    [overtimeEnd, cap],
  ] as const
  return Math.min(cap, interpolateLoadingPercent(elapsedMs, points))
}

export function getLoadingBarPercent(elapsedMs: number): number {
  return getLoadingBarPercentForTypicalDuration(elapsedMs, APPLY_TYPICAL_SUBMIT_MS)
}
