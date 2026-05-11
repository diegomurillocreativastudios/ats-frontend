const VACANCY_STATUS_LABELS: Record<string, string> = {
  open: "Abierta",
  closed: "Cerrada",
  draft: "Borrador",
  paused: "Pausada",
}

const SOURCE_LABELS: Record<string, string> = {
  recruiter: "Reclutador",
  personal: "Personal",
  linkedin: "LinkedIn",
  referral: "Referido",
  referido: "Referido",
  jobboard: "Bolsa de empleo",
  website: "Página web",
  web: "Página web",
  internal: "Base interna",
  interna: "Base interna",
  social: "Redes sociales",
  agency: "Agencia externa",
  manual: "Carga manual",
  other: "Otra",
}

export function formatReportDate(value: string | null | undefined): string {
  if (value == null || String(value).trim() === "") return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return new Intl.DateTimeFormat("es", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d)
}

export function formatReportDateOnly(value: string | null | undefined): string {
  if (value == null || String(value).trim() === "") return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(d)
}

export function formatVacancyStatusSlug(slug: string | null | undefined): string {
  if (slug == null || String(slug).trim() === "") return "—"
  const key = String(slug).toLowerCase().trim()
  return VACANCY_STATUS_LABELS[key] ?? slug
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "—"
  return `${Number(value).toFixed(1)}%`
}

export function formatRecruitmentSourceLabel(
  row: { sourceKey?: string; applicationSource?: string; sourceLabel?: string; label?: string }
): string {
  const explicit = row.sourceLabel ?? row.label
  if (explicit != null && String(explicit).trim() !== "") return String(explicit).trim()
  const key = String(row.sourceKey ?? row.applicationSource ?? "")
    .toLowerCase()
    .trim()
  if (key && SOURCE_LABELS[key]) return SOURCE_LABELS[key]
  return key ? key : "—"
}

export function defaultMonthDateRange(): { dateFrom: string; dateTo: string } {
  const end = new Date()
  const start = new Date(end.getFullYear(), end.getMonth(), 1)
  const toLocalIsoDate = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
  }
  return { dateFrom: toLocalIsoDate(start), dateTo: toLocalIsoDate(end) }
}
