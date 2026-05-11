/**
 * Contrato entre el portal RRHH (reportes) y el backend.
 * Respuesta estándar de listados: `{ rows: [...], totalCount: number }` (camelCase).
 *
 * Cliente HTTP tipado: `lib/api/recruiter-reports.ts`.
 */

export const RECRUITER_REPORTS_API_PREFIX = "/api/recruiter/reports"

/** Avance de vacantes por cliente */
export const vacancyProgressByClientContract = {
  method: "GET" as const,
  suggestedPath: `${RECRUITER_REPORTS_API_PREFIX}/vacancy-progress-by-client`,
  queryParams: [
    "clientId (opcional)",
    "dateFrom, dateTo (ISO date)",
    "vacancyStatus (opcional: open|closed|draft|paused)",
  ],
  rowFields: [
    "clientId",
    "clientName",
    "companyName",
    "vacancyId",
    "vacancyTitle",
    "vacancyStatus",
    "openedAt",
    "closedAt",
    "totalCandidates",
    "candidatesByStage (opcional, mapa etapa → número; el UI infiere entrevista/final/contratación por nombre de clave)",
    "candidatesInInterview, candidatesFinalist, candidatesHired (opcional; preferible a inferencia)",
    "averageApplicationProgressPercent | progressPercent",
    "averageDaysToFill (opcional, días promedio de cobertura)",
  ],
}

/** Estatus de candidatos por etapa */
export const candidateStatusByStageContract = {
  method: "GET" as const,
  suggestedPath: `${RECRUITER_REPORTS_API_PREFIX}/candidate-status-by-stage`,
  queryParams: [
    "vacancyId (opcional)",
    "clientId (opcional)",
    "stageId (opcional)",
    "dateFrom, dateTo (opcional)",
    "page, pageSize",
    "recruiterId (opcional, futuro; filtro por responsable)",
  ],
  rowFields: [
    "candidateProfileId",
    "candidateName",
    "vacancyId",
    "vacancyTitle",
    "companyName | clientName (opcional)",
    "currentStageId",
    "currentStageName",
    "pipelineStatus",
    "applicationStatus",
    "lastMovedAt",
    "daysInStage (opcional; si falta el UI usa días desde lastMovedAt)",
    "ownerName | recruiterName (opcional)",
  ],
}

/** Agregado embudo / KPIs globales (recomendado para paginación). */
export const candidateStatusByStageSummaryContract = {
  method: "GET" as const,
  suggestedPath: `${RECRUITER_REPORTS_API_PREFIX}/candidate-status-by-stage/summary`,
  queryParams: [
    "vacancyId (opcional)",
    "clientId (opcional)",
    "stageId (opcional)",
    "dateFrom, dateTo (opcional)",
  ],
  responseFields: [
    "totalCandidates (number)",
    "byStage: [{ stageId, stageName, count }] o mapa etapa→count",
  ],
  notes: [
    "Si no existe, el frontend arma el embudo solo con la página actual y muestra aviso.",
  ],
}

/** Evaluaciones técnicas (ApplicationTests / Evalart) */
export const technicalEvaluationsContract = {
  method: "GET" as const,
  suggestedPath: `${RECRUITER_REPORTS_API_PREFIX}/technical-evaluations`,
  queryParams: [
    "vacancyId (opcional)",
    "outcome (opcional; filtro Contains sobre estado)",
    "dateFrom, dateTo (opcional)",
  ],
  notes: ["evaluatorUserId no aplica en MVP backend"],
  rowFields: [
    "candidateProfileId",
    "candidateName",
    "vacancyId",
    "vacancyTitle",
    "companyName | clientName (opcional)",
    "evaluationTitle",
    "testName",
    "scoreOrOutcome",
    "status",
    "outcome",
    "evaluatorName",
    "evaluatedAt",
    "sentAt (opcional)",
    "completedAt (opcional)",
    "difficultyLevel (opcional: básico|intermedio|avanzado)",
    "aiRecommendation (opcional: apto|revisar|no recomendado)",
    "skillBreakdown (opcional: objeto o JSON con puntajes por habilidad)",
  ],
}

/** Fuentes de reclutamiento */
export const recruitmentSourcesContract = {
  method: "GET" as const,
  suggestedPath: `${RECRUITER_REPORTS_API_PREFIX}/recruitment-sources`,
  queryParams: [
    "dateFrom, dateTo (obligatorios)",
    "vacancyId (opcional)",
    "clientId (opcional)",
  ],
  notes: [
    "MVP histórico: agregación por ApplicationSource (recruiter | personal).",
    "Ideal: claves extendidas (linkedin, referral, jobboard, …) y conteos por etapa.",
  ],
  rowFields: [
    "sourceKey",
    "sourceLabel",
    "candidatesCount",
    "hiresCount",
    "conversionPercent (opcional)",
    "preselectedCount, interviewedCount, finalistsCount (opcional, para tabla tipo embudo por fuente)",
  ],
}

/** Catálogo para filtros */
export const recruiterCompaniesCatalogContract = {
  method: "GET" as const,
  path: "/api/recruiter/companies",
  rowFields: ["id", "name"],
}
