import { apiClient } from "@/lib/api"
import { overlayVacancyApplicants } from "@/lib/api/vacancy-applications"
import { normalizeVacancyDetailFromApi } from "@/lib/vacancies/normalize-vacancy-detail-from-api"
import {
  isVacancyGuid,
  readPublicSlug,
} from "@/lib/vacancies/vacancy-public-path"

export type RecruiterVacancyPathResolution = {
  /** Guid used for match, edit, applications, interviews, etc. */
  id: string
  publicSlug: string | null
  /** Normalized detail payload (applicants overlaid when possible). */
  vacancy: Record<string, unknown>
}

function readVacancyId(payload: unknown): string | null {
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) {
    return null
  }
  const root = payload as Record<string, unknown>
  const nested = root.vacancy ?? root.data ?? root.result
  const source =
    nested != null && typeof nested === "object" && !Array.isArray(nested)
      ? (nested as Record<string, unknown>)
      : root
  const id = source.id ?? source.uuid
  if (id == null) return null
  const value = String(id).trim()
  return value === "" ? null : value
}

/**
 * Loads a recruiter vacancy from a URL segment that may be a Guid or a publicSlug.
 * Always returns the Guid `id` for subsequent API calls.
 */
export async function fetchRecruiterVacancyByPathSegment(
  pathSegment: string,
  options?: { overlayApplicants?: boolean }
): Promise<RecruiterVacancyPathResolution | null> {
  const segment = String(pathSegment ?? "").trim()
  if (!segment) return null

  const shouldOverlay = options?.overlayApplicants !== false

  let data: unknown
  if (isVacancyGuid(segment)) {
    data = await apiClient.get(
      `/api/recruiter/vacancies/${encodeURIComponent(segment)}`
    )
  } else {
    data = await apiClient.get(
      `/api/recruiter/vacancies/by-public-slug/${encodeURIComponent(segment)}`
    )
  }

  const id = readVacancyId(data) ?? (isVacancyGuid(segment) ? segment : null)
  if (!id) return null

  const withApplicants = shouldOverlay
    ? await overlayVacancyApplicants(id, data)
    : data
  const vacancy =
    normalizeVacancyDetailFromApi(withApplicants) ??
    (typeof withApplicants === "object" &&
    withApplicants != null &&
    !Array.isArray(withApplicants)
      ? (withApplicants as Record<string, unknown>)
      : null)

  if (!vacancy) return null

  return {
    id,
    publicSlug: readPublicSlug(vacancy),
    vacancy,
  }
}

/** Resolves only the Guid for nested routes that already know how to fetch by id. */
export async function resolveRecruiterVacancyIdFromPathSegment(
  pathSegment: string
): Promise<{ id: string; publicSlug: string | null } | null> {
  const segment = String(pathSegment ?? "").trim()
  if (!segment) return null

  // Guid URLs: no extra lookup — nested loaders still fetch by id.
  // Canonical slug replace happens on detail/list entry points that load the full vacancy.
  if (isVacancyGuid(segment)) {
    return { id: segment, publicSlug: null }
  }

  const resolved = await fetchRecruiterVacancyByPathSegment(segment, {
    overlayApplicants: false,
  })
  if (!resolved) return null
  return { id: resolved.id, publicSlug: resolved.publicSlug }
}
