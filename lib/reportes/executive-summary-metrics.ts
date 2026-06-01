import type { ReportsRecruiterSummary } from "@/lib/api/recruiter-reports"

export function formatExecutiveInt(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return "0"
  return String(Math.round(n))
}

export function formatExecutivePercent(n: number | undefined | null): string {
  if (n == null || Number.isNaN(Number(n))) return "—"
  return `${Number(n).toFixed(1)}%`
}

export function pickExecutiveNumber(
  s: ReportsRecruiterSummary,
  ...keys: (keyof ReportsRecruiterSummary)[]
): number {
  for (const k of keys) {
    const v = s[k]
    if (typeof v === "number" && !Number.isNaN(v)) return v
  }
  return 0
}

export function pickExecutiveTopSource(s: ReportsRecruiterSummary): string | null {
  const candidates = [s.topRecruitmentSource, s.mainRecruitmentSource, s.mainSourceLabel]
  const hit = candidates.find((x) => x != null && String(x).trim() !== "")
  return hit != null ? String(hit).trim() : null
}

export function buildExecutiveInsights(s: ReportsRecruiterSummary): string[] {
  const totalVac = pickExecutiveNumber(s, "totalVacancies")
  const openVac = pickExecutiveNumber(s, "openVacancies")
  const closedVac = pickExecutiveNumber(s, "closedVacancies")
  const match = s.averagePreliminaryMatchScore
  const inInt = pickExecutiveNumber(s, "candidatesInInterview")
  const hired = pickExecutiveNumber(s, "candidatesHired", "hiredCount", "totalHires")
  const totalCand = pickExecutiveNumber(s, "totalCandidates")
  const totalClients = pickExecutiveNumber(s, "totalClients")
  const items: string[] = []

  if (totalVac > 0 && openVac === totalVac) {
    items.push("Todas las vacantes registradas se encuentran abiertas.")
  }

  if (match != null && !Number.isNaN(match) && match >= 75) {
    items.push(
      `El match preliminar promedio es alto: ${formatExecutivePercent(match).replace("—", "")}.`
    )
  }

  if (inInt === 0 && hired === 0) {
    items.push(
      totalCand > 0
        ? "Aún no hay candidatos en entrevista ni contratados."
        : "No hay candidatos registrados en el periodo seleccionado."
    )
  }

  if (items.length < 3 && totalVac > 0 && closedVac === totalVac && openVac === 0) {
    items.push("Todas las vacantes del periodo están cerradas.")
  }

  if (
    items.length < 3 &&
    totalVac > 0 &&
    s.averageVacancyProgressPercent != null &&
    !Number.isNaN(s.averageVacancyProgressPercent) &&
    s.averageVacancyProgressPercent < 35
  ) {
    items.push(
      "El avance promedio de las vacantes es bajo; conviene revisar embudos y seguimiento."
    )
  }

  const techDone = pickExecutiveNumber(
    s,
    "technicalEvaluationsCompleted",
    "technicalEvaluationsCount"
  )
  if (items.length < 3 && techDone > 0) {
    const rate = s.technicalEvaluationPassRate ?? s.technicalEvaluationApprovalRate
    if (typeof rate === "number" && !Number.isNaN(rate)) {
      items.push(
        `Hay ${formatExecutiveInt(techDone)} evaluación(es) técnica(s) completada(s); tasa de aprobación aproximada ${formatExecutivePercent(rate)}.`
      )
    } else {
      items.push(
        `Hay ${formatExecutiveInt(techDone)} evaluación(es) técnica(s) completada(s) en el periodo.`
      )
    }
  }

  if (items.length < 3 && totalVac > 0 && closedVac > 0 && openVac < totalVac) {
    items.push(
      `${formatExecutiveInt(closedVac)} vacante(s) cerrada(s) y ${formatExecutiveInt(openVac)} abierta(s) en el periodo.`
    )
  }

  const filler: string[] = []
  if (totalVac > 0) filler.push(`Se registraron ${formatExecutiveInt(totalVac)} vacante(s) en el periodo.`)
  if (totalCand > 0) filler.push(`Hay ${formatExecutiveInt(totalCand)} candidato(s) considerados en el periodo.`)
  if (totalClients > 0) {
    filler.push(`${formatExecutiveInt(totalClients)} cliente(s) con actividad en los filtros actuales.`)
  }
  for (const line of filler) {
    if (items.length >= 3) break
    if (!items.includes(line)) items.push(line)
  }

  return items.slice(0, 3)
}

export function formatIsoDateForPdf(iso: string | null | undefined): string {
  if (!iso || String(iso).trim() === "") return "—"
  const parts = String(iso).trim().slice(0, 10).split("-")
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  return String(iso)
}

export function formatGeneratedAtForPdf(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export function mapSummaryToExecutiveReportPdfData(
  summary: ReportsRecruiterSummary
): {
  totalClients: number
  totalVacancies: number
  openVacancies: number
  closedVacancies: number
  totalCandidates: number
  candidatesInInterview: number
  candidatesHired: number
  averageVacancyProgressPercent: number | null
  averagePreliminaryMatchScore: number | null
  technicalEvaluationsCompleted: number
  technicalEvaluationPassRate: number | null
  topRecruitmentSource: string | null
} {
  const passRate =
    summary.technicalEvaluationPassRate ?? summary.technicalEvaluationApprovalRate

  return {
    totalClients: pickExecutiveNumber(summary, "totalClients"),
    totalVacancies: pickExecutiveNumber(summary, "totalVacancies"),
    openVacancies: pickExecutiveNumber(summary, "openVacancies"),
    closedVacancies: pickExecutiveNumber(summary, "closedVacancies"),
    totalCandidates: pickExecutiveNumber(summary, "totalCandidates"),
    candidatesInInterview: pickExecutiveNumber(summary, "candidatesInInterview"),
    candidatesHired: pickExecutiveNumber(
      summary,
      "candidatesHired",
      "hiredCount",
      "totalHires"
    ),
    averageVacancyProgressPercent:
      summary.averageVacancyProgressPercent != null &&
      !Number.isNaN(summary.averageVacancyProgressPercent)
        ? summary.averageVacancyProgressPercent
        : null,
    averagePreliminaryMatchScore:
      summary.averagePreliminaryMatchScore != null &&
      !Number.isNaN(summary.averagePreliminaryMatchScore)
        ? summary.averagePreliminaryMatchScore
        : null,
    technicalEvaluationsCompleted: pickExecutiveNumber(
      summary,
      "technicalEvaluationsCompleted",
      "technicalEvaluationsCount"
    ),
    technicalEvaluationPassRate:
      typeof passRate === "number" && !Number.isNaN(passRate) ? passRate : null,
    topRecruitmentSource: pickExecutiveTopSource(summary),
  }
}
