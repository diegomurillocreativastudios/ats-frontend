/** Backend `ApplicationSource`: 0 = Recruiter, 1 = Personal (self-apply). */

export function normalizeApplicationSource(raw: unknown): number {
  if (raw == null) return 0
  const n = Number(raw)
  if (!Number.isFinite(n)) return 0
  if (n === 1) return 1
  return 0
}

export function mapApplicationSourceLabel(source: number): string {
  if (source === 1) return "Personal"
  return "Recruiter"
}

/** Texto para badge en listas (incluye compatibilidad y valores raros). */
export function formatApplicationSourceBadge(raw: unknown): string {
  if (raw == null || raw === "") return mapApplicationSourceLabel(0)
  const n = Number(raw)
  if (!Number.isFinite(n)) return "Origen desconocido"
  if (n === 1) return "Personal"
  if (n === 0) return "Recruiter"
  return "Origen desconocido"
}
