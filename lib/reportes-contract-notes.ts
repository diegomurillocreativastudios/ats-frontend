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
    "vacancyId (opcional)",
    "dateFrom, dateTo (ISO date)",
    "vacancyStatus (opcional: open|closed|draft|paused)",
    "page, pageSize (paginación; defaults típicos en backend)",
    "sortBy: openedAt|vacancyTitle|clientName|vacancyStatus|totalCandidates|…",
    "sortDirection: asc|desc",
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
    "candidatesByStage (opcional)",
    "candidatesInInterview, candidatesFinalist, candidatesHired (opcional)",
    "averageApplicationProgressPercent | progressPercent",
    "averageDaysToFill (opcional)",
    "averagePreliminaryMatchScore, maxPreliminaryMatchScore, minPreliminaryMatchScore (0–100)",
    "candidatesWithPreliminaryAnalysis (conteo)",
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
    "byStage: [{ stageId, stageName, count, percent? }] o mapa etapa→count",
  ],
  notes: [
    "percent opcional: 0–100 del total de aplicaciones.",
    "Si no existe, el frontend arma el embudo solo con la página actual y muestra aviso.",
  ],
}

/** Evaluaciones técnicas (ApplicationTests / Evalart) */
export const technicalEvaluationsContract = {
  method: "GET" as const,
  suggestedPath: `${RECRUITER_REPORTS_API_PREFIX}/technical-evaluations`,
  queryParams: [
    "vacancyId (opcional)",
    "clientId, candidateId (UUID opcionales)",
    "outcome (opcional; filtro Contains sobre estado)",
    "dateFrom, dateTo (opcional)",
    "page, pageSize",
  ],
  notes: ["evaluatorUserId no aplica en MVP backend"],
  rowFields: [
    "candidateProfileId",
    "candidateId",
    "candidateName",
    "vacancyId",
    "vacancyTitle",
    "clientId",
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
    "difficultyLevel (opcional)",
    "aiRecommendation (opcional)",
    "skillBreakdown (opcional)",
  ],
}

/** Scores matching preliminar por candidato/postulación */
export const preliminaryMatchScoresContract = {
  method: "GET" as const,
  suggestedPath: `${RECRUITER_REPORTS_API_PREFIX}/preliminary-match-scores`,
  queryParams: [
    "clientId, vacancyId, candidateId, stageId (opcionales)",
    "scoreMin, scoreMax (0–100)",
    "dateFrom, dateTo",
    "page, pageSize",
    "sortBy, sortDirection",
  ],
}

/** Resumen dashboard reportes */
export const reportsSummaryContract = {
  method: "GET" as const,
  suggestedPath: `${RECRUITER_REPORTS_API_PREFIX}/summary`,
  queryParams: ["clientId (opcional)", "dateFrom, dateTo (opcionales según validación backend)"],
  notes: ["Respuesta: un solo objeto JSON, no rows/totalCount"],
}

/** Filtros agregados para selects */
export const reportsFiltersContract = {
  method: "GET" as const,
  suggestedPath: `${RECRUITER_REPORTS_API_PREFIX}/filters`,
  queryParams: ["clientId (opcional)", "dateFrom, dateTo"],
  notes: [
    "Estructura flexible: clients, vacancies, stages, technicalEvaluationOutcomes, recruitmentSourceKeys (nombres pueden variar; ver coerceReportsFilters).",
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
    "source (clave, ej. linkedin)",
    "groupBy=source|vacancy (default tipo solo fuente)",
    "page, pageSize",
  ],
  notes: [
    "groupBy=vacancy: filas con vacancyId, vacancyTitle, clientId, clientName además de métricas por fuente.",
  ],
  rowFields: [
    "sourceKey",
    "sourceLabel",
    "candidatesCount",
    "hiresCount",
    "conversionPercent (opcional)",
    "preselectedCount, interviewedCount, finalistsCount (opcional)",
    "vacancyId, vacancyTitle, clientId, clientName (modo groupBy=vacancy)",
  ],
}

/** Catálogo para filtros */
export const recruiterCompaniesCatalogContract = {
  method: "GET" as const,
  path: "/api/recruiter/companies",
  rowFields: ["id", "name"],
}
