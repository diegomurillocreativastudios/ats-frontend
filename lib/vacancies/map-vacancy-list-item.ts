import { formatVacancyCountryLabel } from "@/lib/vacancies/vacancy-location-display"
import { normalizeCountryCode, readVacancyStateCode } from "@/lib/vacancies/vacancy-location"
import {
  getVacancyDepartmentId,
  getVacancyDepartmentLabel,
  getVacancyModalityId,
  getVacancyModalityLabel,
} from "@/lib/vacancy-catalogs"

export type VacancyListStatusKey = "activa" | "cerrada" | "pausada" | "borrador"

export interface VacancyListItem {
  id: string
  title: string
  description: string
  company: string
  companyId: string | null
  jobCategory: string
  department: string
  departmentId: string
  modality: string
  modalityId: string
  location: string
  requirementsSummary: string
  requirementsRaw: unknown
  candidates: number
  interviews: number | null
  status: VacancyListStatusKey
  statusRaw: string
  iconKey: "palette" | "code" | "briefcase"
  needsRematch: boolean
  createdAt: string | null
  createdAtLabel: string | null
  countryCode: string | null
  countryLabel: string
  stateCode: string | null
}

export const formatRequirementsSummary = (req: unknown): string => {
  if (req == null) return ""
  if (typeof req === "string") return req.trim()
  if (typeof req === "object" && !Array.isArray(req)) {
    return Object.entries(req as Record<string, unknown>)
      .filter(([, v]) => v != null && String(v).trim() !== "")
      .map(([k, v]) => `${k}: ${v}`)
      .join(" · ")
  }
  return ""
}

export const mapStatusKey = (item: Record<string, unknown>): VacancyListStatusKey => {
  const raw = String(item?.status ?? item?.state ?? "open").toLowerCase().trim()
  if (raw === "open" || raw === "active" || raw === "activa" || raw.includes("abierta")) {
    return "activa"
  }
  if (raw === "closed" || raw === "cerrada" || raw.includes("cerrad")) {
    return "cerrada"
  }
  if (raw === "draft" || raw === "borrador") {
    return "borrador"
  }
  if (raw === "paused" || raw === "pausada" || raw.includes("paus")) {
    return "pausada"
  }
  return "activa"
}

export const formatCreatedAtLabel = (iso: unknown): string | null => {
  if (iso == null || typeof iso !== "string") return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d)
}

const resolveIconKey = (
  department: string,
  title: string
): VacancyListItem["iconKey"] => {
  const deptLower = department.toLowerCase()
  if (
    deptLower.includes("diseño") ||
    deptLower.includes("design") ||
    title.toLowerCase().includes("design") ||
    title.toLowerCase().includes("ux")
  ) {
    return "palette"
  }
  if (
    deptLower.includes("tecnolog") ||
    deptLower.includes("tech") ||
    deptLower.includes("technology")
  ) {
    return "code"
  }
  return "briefcase"
}

export const mapVacancyFromApi = (
  item: Record<string, unknown>,
  index = 0
): VacancyListItem => {
  const id = String(item?.id ?? item?.uuid ?? index)
  const title = String(item?.title ?? item?.name ?? "")
  const companyRaw = item?.company ?? item?.companyName ?? ""
  const companyTrim = String(companyRaw).trim()
  const company = companyTrim === "" ? "—" : companyTrim
  const companyIdRaw = item?.companyId ?? item?.company_id
  const companyId =
    companyIdRaw != null && String(companyIdRaw).trim() !== ""
      ? String(companyIdRaw).trim()
      : null
  const jobCategory = String(item?.jobCategory ?? item?.job_category ?? "").trim() || "—"
  const department = getVacancyDepartmentLabel(item)
  const departmentId = getVacancyDepartmentId(item)
  const modality = getVacancyModalityLabel(item)
  const modalityId = getVacancyModalityId(item)
  const location = String(
    item?.location ?? item?.work_arrangement ?? companyRaw ?? "—"
  )
  const description = String(item?.description ?? "").trim()
  const requirementsRaw = item?.requirements
  const requirementsSummary = formatRequirementsSummary(requirementsRaw)
  const candidatesRaw =
    item?.candidatesAmount ??
    item?.candidates ??
    item?.candidates_count ??
    item?.applicants_count ??
    0
  const candidates =
    typeof candidatesRaw === "number" && !Number.isNaN(candidatesRaw)
      ? candidatesRaw
      : Number.parseInt(String(candidatesRaw ?? "0"), 10) || 0
  const interviewsRaw = item?.interviews ?? item?.interviews_count
  const interviews =
    interviewsRaw != null && !Number.isNaN(Number(interviewsRaw))
      ? Number(interviewsRaw)
      : null
  const status = mapStatusKey(item)
  const statusRaw = String(item?.status ?? item?.state ?? "—")
  const countryCode = normalizeCountryCode(item?.countryCode ?? item?.country_code)
  const countryLabel = formatVacancyCountryLabel(countryCode) || "—"
  const stateCode = readVacancyStateCode(item)
  const createdAtRaw = item?.createdAt ?? item?.created_at
  const createdAt =
    createdAtRaw != null && String(createdAtRaw).trim() !== ""
      ? String(createdAtRaw)
      : null

  return {
    id,
    title,
    description,
    company,
    companyId,
    jobCategory,
    department,
    departmentId,
    modality,
    modalityId,
    location,
    requirementsSummary,
    requirementsRaw,
    candidates,
    interviews,
    status,
    statusRaw,
    iconKey: resolveIconKey(department, title),
    needsRematch: Boolean(item?.needsRematch ?? item?.needs_rematch),
    createdAt,
    createdAtLabel: formatCreatedAtLabel(createdAt),
    countryCode,
    countryLabel,
    stateCode,
  }
}
