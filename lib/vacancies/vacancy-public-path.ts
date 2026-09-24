/**
 * Vacancy URL segments: prefer API `publicSlug` when present; fall back to Guid.
 * Nested API calls (match, edit, apply) always use the Guid `id`.
 */

import { readVacancyIsActive } from "@/lib/vacancies/read-vacancy-is-active"
import { resolveVacancyStatusKey } from "@/lib/vacancies/vacancy-status-labels"

const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isVacancyGuid(segment: string | null | undefined): boolean {
  if (segment == null) return false
  const value = String(segment).trim()
  return value !== "" && GUID_RE.test(value)
}

export function readPublicSlug(raw: unknown): string | null {
  if (raw == null) return null
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const record = raw as Record<string, unknown>
    return readPublicSlug(record.publicSlug ?? record.public_slug)
  }
  const value = String(raw).trim()
  return value === "" ? null : value
}

export type VacancyPathSource = {
  id: string
  publicSlug?: string | null
}

/** Path segment for vacancy detail URLs: publicSlug when set, otherwise id. */
export function vacancyPathSegment(
  vacancy: VacancyPathSource | null | undefined
): string {
  if (!vacancy) return ""
  const slug = readPublicSlug(vacancy.publicSlug)
  if (slug) return slug
  return String(vacancy.id ?? "").trim()
}

export function buildRecruiterVacancyPath(
  vacancy: VacancyPathSource,
  suffix = ""
): string {
  const segment = vacancyPathSegment(vacancy)
  if (!segment) return "/portal-rrhh/vacantes"
  const base = `/portal-rrhh/vacantes/${encodeURIComponent(segment)}`
  if (!suffix) return base
  const normalized = suffix.startsWith("/") ? suffix : `/${suffix}`
  return `${base}${normalized}`
}

export function buildPublicVacancyPath(
  vacancy: VacancyPathSource,
  suffix = ""
): string {
  const segment = vacancyPathSegment(vacancy)
  if (!segment) return "/portal-oportunidades"
  const base = `/portal-oportunidades/${encodeURIComponent(segment)}`
  if (!suffix) return base
  const normalized = suffix.startsWith("/") ? suffix : `/${suffix}`
  return `${base}${normalized}`
}

/**
 * Absolute public vacancy URL (origin + path). No query string, no /aplicar.
 * Pass `origin` explicitly in tests; in the browser defaults to `window.location.origin`.
 */
export function buildPublicVacancyAbsoluteUrl(
  vacancy: VacancyPathSource,
  origin?: string
): string {
  const path = buildPublicVacancyPath(vacancy)
  const resolvedOrigin =
    origin?.replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "")
  if (!resolvedOrigin) return path
  return `${resolvedOrigin}${path}`
}

/**
 * Whether a recruiter vacancy can expose its public opportunities link:
 * status must be open/activa and `isActive` must be true.
 */
export function isVacancyPublicLinkShareable(vacancy: unknown): boolean {
  if (vacancy == null || typeof vacancy !== "object") return false
  if (!readVacancyIsActive(vacancy)) return false
  const record = vacancy as Record<string, unknown>
  const status = record.status ?? record.state ?? record.vacancyStatus
  const key = resolveVacancyStatusKey(
    status == null ? null : String(status)
  )
  return key === "activa"
}
