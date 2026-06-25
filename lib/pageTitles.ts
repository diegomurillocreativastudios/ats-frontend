/**
 * Convierte un segmento de ruta en formato kebab-case a título legible.
 * Ej: "crear-cuenta" → "Crear Cuenta"
 * @param {string} segment - Segmento de la URL (ej: "crear-cuenta")
 * @returns {string} Título formateado
 */
export const segmentToTitle = (segment) => {
  if (!segment || typeof segment !== "string") return ""
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

import { APP_NAME } from "@/lib/app-brand"

const BASE_TITLE = APP_NAME

const PORTAL_RRHH = "Portal RRHH"
const PORTAL_CANDIDATO = "Portal Candidato"
const PORTAL_ADMIN = "Portal Admin"
const CUENTA = "Cuenta"
const OPORTUNIDADES = "Oportunidades"

/** Une partes con " | " (siempre incluye el prefijo Applican Tree). */
function joinDocumentTitle(...parts) {
  return parts.filter((p) => p != null && String(p).trim() !== "").join(" | ")
}

/** UUID típico en rutas (vacante, candidato, entrevista). */
function isUuidSegment(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(s),
  )
}

const RRHH_PATH_LABEL = {
  entrevistas: "Entrevistas",
  vacantes: "Vacantes",
  candidatos: "Candidatos",
  etapas: "Etapas",
  plantillas: "Plantillas",
  interviews: "Entrevistas",
  reportes: "Reportes",
  "avance-vacantes-por-cliente": "Avance vacantes por cliente",
  "estatus-candidatos-por-etapa": "Estatus candidatos por etapa",
  "evaluaciones-tecnicas": "Evaluaciones técnicas",
  "fuentes-reclutamiento": "Fuentes de reclutamiento",
}

const CANDIDATO_PATH_LABEL = {
  documentos: "Documentos",
  entrevistas: "Entrevistas",
}

const ADMIN_PATH_LABEL = {
  etapas: "Etapas",
  entrevistas: "Entrevistas",
  plantillas: "Plantillas",
  usuarios: "Usuarios",
  empresas: "Empresas",
  catalogos: "Catálogos",
  departamentos: "Departamentos",
  modalidades: "Modalidades",
}

/** Listado de entrevistas de una vacante: `/portal-rrhh/entrevistas/<vacancyId>`. */
const ENTREVISTAS_BY_VACANCY_PATH = /^\/portal-rrhh\/entrevistas\/[^/]+$/

/** Detalle de vacante RRHH: `/portal-rrhh/vacantes/<vacancyId>`. */
const VACANCY_DETAIL_PATH = /^\/portal-rrhh\/vacantes\/[^/]+$/

/** Detalle de candidato RRHH: `/portal-rrhh/candidatos/<candidateId>` (sin subrutas). */
const CANDIDATO_DETAIL_PATH = /^\/portal-rrhh\/candidatos\/[^/]+$/
const OPPORTUNITY_DETAIL_PATH = /^\/portal-oportunidades\/[^/]+$/

export function isEntrevistasByVacancyPath(pathname) {
  const normalized =
    pathname.endsWith("/") && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname
  return ENTREVISTAS_BY_VACANCY_PATH.test(normalized)
}

export function isVacancyDetailPath(pathname) {
  const normalized =
    pathname.endsWith("/") && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname
  return VACANCY_DETAIL_PATH.test(normalized)
}

export function isCandidatoDetailPath(pathname) {
  const normalized =
    pathname.endsWith("/") && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname
  return CANDIDATO_DETAIL_PATH.test(normalized)
}

export function isOpportunityDetailPath(pathname) {
  const normalized =
    pathname.endsWith("/") && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname
  return OPPORTUNITY_DETAIL_PATH.test(normalized)
}

/** Título estable hasta que el cliente cargue el nombre de la vacante. */
export function getEntrevistasByVacancyStaticTitle() {
  return joinDocumentTitle(BASE_TITLE, PORTAL_RRHH, "Entrevistas")
}

/** Título final: entrevistas de una vacante con nombre legible. */
export function formatEntrevistasByVacancyDocumentTitle(vacancyDisplayName) {
  const name =
    vacancyDisplayName != null && String(vacancyDisplayName).trim() !== ""
      ? String(vacancyDisplayName).trim()
      : "Vacante"
  return joinDocumentTitle(BASE_TITLE, PORTAL_RRHH, "Entrevistas", name)
}

/** Hasta que el cliente cargue el título de la vacante. */
export function getVacancyDetailStaticTitle() {
  return joinDocumentTitle(BASE_TITLE, PORTAL_RRHH, "Vacantes")
}

/** Detalle de vacante con nombre legible. */
export function formatVacancyDetailDocumentTitle(vacancyDisplayName) {
  const name =
    vacancyDisplayName != null && String(vacancyDisplayName).trim() !== ""
      ? String(vacancyDisplayName).trim()
      : "Vacante"
  return joinDocumentTitle(BASE_TITLE, PORTAL_RRHH, "Vacantes", name)
}

/** Resultados / pipeline de una vacante con nombre legible. */
export function formatVacancyResultadosDocumentTitle(vacancyDisplayName) {
  const name =
    vacancyDisplayName != null && String(vacancyDisplayName).trim() !== ""
      ? String(vacancyDisplayName).trim()
      : "Vacante"
  return joinDocumentTitle(BASE_TITLE, PORTAL_RRHH, "Vacantes", name, "Resultados")
}

/** Hasta que el cliente cargue el nombre del candidato. */
export function getCandidatoDetailStaticTitle() {
  return joinDocumentTitle(BASE_TITLE, PORTAL_RRHH, "Candidatos")
}

/** Detalle de candidato con nombre legible (por defecto «Candidato»). */
export function formatCandidatoDetailDocumentTitle(displayName) {
  const raw = displayName != null ? String(displayName).trim() : ""
  const name = raw !== "" ? raw : "Candidato"
  return joinDocumentTitle(BASE_TITLE, PORTAL_RRHH, "Candidatos", name)
}

export function getOpportunityDetailStaticTitle() {
  return joinDocumentTitle(BASE_TITLE, OPORTUNIDADES, "Vacante")
}

/** Sufijo (puede incluir ` | `) que se antepone a `Applican Tree | …` para rutas exactas. */
const EXACT_PATH_SUFFIX = {
  "/": joinDocumentTitle(PORTAL_CANDIDATO, "Inicio"),
  "/mi-perfil": joinDocumentTitle(CUENTA, "Mi perfil"),
  "/seleccion-portal": joinDocumentTitle(CUENTA, "Elegí un portal"),
  "/recuperar-contrasena": joinDocumentTitle(CUENTA, "Recuperar contraseña"),
  "/restablecer-contrasena": joinDocumentTitle(CUENTA, "Restablecer contraseña"),
  "/auth/iniciar-sesion": "Iniciar sesión",
  "/auth/registrarse": "Registrarse",
  "/auth/forgot-password": "¿Olvidaste tu contraseña?",
  "/auth/restablecer-contrasena": "Restablecer contraseña",
  "/portal-oportunidades": OPORTUNIDADES,
}

function titlePortalRrhh(normalizedPath) {
  const prefix = "/portal-rrhh"
  if (!normalizedPath.startsWith(prefix)) return null

  if (isEntrevistasByVacancyPath(normalizedPath)) {
    return getEntrevistasByVacancyStaticTitle()
  }
  if (isVacancyDetailPath(normalizedPath)) {
    return getVacancyDetailStaticTitle()
  }
  if (isCandidatoDetailPath(normalizedPath)) {
    return getCandidatoDetailStaticTitle()
  }

  const rest = normalizedPath.slice(prefix.length)
  const segs = rest.split("/").filter(Boolean)
  if (segs.length === 0) {
    return joinDocumentTitle(BASE_TITLE, PORTAL_RRHH, "Candidatos")
  }

  const labels = []
  for (const s of segs) {
    if (isUuidSegment(s)) continue
    labels.push(RRHH_PATH_LABEL[s] ?? segmentToTitle(s))
  }
  if (labels.length === 0) {
    return joinDocumentTitle(BASE_TITLE, PORTAL_RRHH, "Inicio")
  }
  return joinDocumentTitle(BASE_TITLE, PORTAL_RRHH, ...labels)
}

function titlePortalCandidato(normalizedPath) {
  const prefix = "/portal-candidato"
  if (!normalizedPath.startsWith(prefix)) return null

  const rest = normalizedPath.slice(prefix.length)
  const segs = rest.split("/").filter(Boolean)
  if (segs.length === 0) {
    return joinDocumentTitle(BASE_TITLE, PORTAL_CANDIDATO, "Inicio")
  }

  const labels = []
  for (const s of segs) {
    if (isUuidSegment(s)) continue
    labels.push(CANDIDATO_PATH_LABEL[s] ?? segmentToTitle(s))
  }
  if (labels.length === 0) {
    return joinDocumentTitle(BASE_TITLE, PORTAL_CANDIDATO, "Inicio")
  }
  return joinDocumentTitle(BASE_TITLE, PORTAL_CANDIDATO, ...labels)
}

function titlePortalAdmin(normalizedPath) {
  const prefix = "/portal-admin"
  if (!normalizedPath.startsWith(prefix)) return null

  const rest = normalizedPath.slice(prefix.length)
  const segs = rest.split("/").filter(Boolean)
  if (segs.length === 0) {
    return joinDocumentTitle(BASE_TITLE, PORTAL_ADMIN, "Inicio")
  }

  const labels = []
  for (const s of segs) {
    if (isUuidSegment(s)) continue
    labels.push(ADMIN_PATH_LABEL[s] ?? segmentToTitle(s))
  }
  if (labels.length === 0) {
    return joinDocumentTitle(BASE_TITLE, PORTAL_ADMIN, "Inicio")
  }
  return joinDocumentTitle(BASE_TITLE, PORTAL_ADMIN, ...labels)
}

/**
 * Título del documento según la ruta: `Applican Tree | [portal o Cuenta] | [pantalla …]`;
 * rutas bajo `/auth/` usan `Applican Tree | <pantalla>` sin segmento «Cuenta».
 * @param {string} pathname - Ruta actual (ej: "/portal-rrhh/entrevistas")
 * @returns {string}
 */
export const getPageTitle = (pathname) => {
  const normalizedPath =
    pathname.endsWith("/") && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname

  const exactSuffix = EXACT_PATH_SUFFIX[normalizedPath]
  if (exactSuffix) {
    return joinDocumentTitle(BASE_TITLE, exactSuffix)
  }

  const rrhh = titlePortalRrhh(normalizedPath)
  if (rrhh) return rrhh

  const cand = titlePortalCandidato(normalizedPath)
  if (cand) return cand

  const adm = titlePortalAdmin(normalizedPath)
  if (adm) return adm

  if (isOpportunityDetailPath(normalizedPath)) {
    return getOpportunityDetailStaticTitle()
  }

  const segments = normalizedPath.split("/").filter(Boolean)
  if (segments.length === 0) {
    return BASE_TITLE
  }

  const lastSegment = segments[segments.length - 1]
  const pageTitle = segmentToTitle(lastSegment)
  return pageTitle
    ? joinDocumentTitle(BASE_TITLE, pageTitle)
    : BASE_TITLE
}
