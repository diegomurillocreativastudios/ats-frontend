/**
 * El GET de reclutador suele incluir `normalizedData` del parseo del CV (a veces incompleto o viejo).
 * El perfil canónico del candidato coincide con `GET /api/candidate/profile`.
 *
 * Si el backend expone ese documento para reclutadores, típicamente en:
 * `GET /api/recruiter/candidates/{profileId}/profile`
 * o embebido en la respuesta como `candidateProfile` / `profile`, fusionamos esos datos
 * sobre `normalizedData` para que la vista RRHH coincida con la del candidato.
 */

import { normalizeCandidateProfileFromApi } from "@/lib/candidate-profile"

const trimStr = (v: unknown) => (v == null ? "" : String(v).trim())

export function pickEmbeddedCanonicalProfile(
  listResponseRoot: Record<string, unknown>
): unknown {
  return (
    listResponseRoot["candidateProfile"] ??
    listResponseRoot["canonicalProfile"] ??
    listResponseRoot["profile"] ??
    listResponseRoot["fullCandidateProfile"] ??
    null
  )
}

/**
 * Convierte la respuesta de perfil (misma forma que `/api/candidate/profile`) a claves
 * que consume `app/portal-rrhh/candidatos/[candidateId]/page.tsx` (PascalCase en normalizedData).
 */
export function candidateProfilePayloadToRecruiterNormalizedLayer(
  raw: unknown
): Record<string, unknown> {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {}
  const p = normalizeCandidateProfileFromApi(raw)
  const o: Record<string, unknown> = {}

  const putStr = (pascalKey: string, v: string | null | undefined) => {
    const t = trimStr(v)
    if (!t) return
    o[pascalKey] = t
  }

  putStr("FirstName", p.firstName)
  putStr("LastName", p.lastName)
  putStr("Email", p.email)
  putStr("PhoneNumber", p.phoneNumber)
  putStr("Country", p.country)
  putStr("BirthCity", p.birthCity)
  putStr("Summary", p.summary)
  putStr("MaritalStatus", p.maritalStatus)
  putStr("Gender", p.gender)

  if (p.birthDate != null && String(p.birthDate).trim() !== "") {
    o.BirthDate = p.birthDate
  }

  if (p.jobPreferences != null && typeof p.jobPreferences === "object") {
    o.JobPreferences = p.jobPreferences
  }

  if (p.workExperience != null) o.WorkExperience = p.workExperience
  if (p.education != null) o.Education = p.education
  if (p.languages != null) o.Languages = p.languages
  if (p.skills != null) o.Skills = p.skills
  if (p.socialLinks != null) o.SocialLinks = p.socialLinks
  if (p.videoLink != null && trimStr(p.videoLink) !== "") o.VideoLink = p.videoLink
  if (p.references != null) o.References = p.references
  if (p.recognitions != null) o.Recognitions = p.recognitions

  return o
}

export function mergeRecruiterNormalizedWithCanonicalProfile(
  recruiterNd: Record<string, unknown>,
  canonicalRaw: unknown
): Record<string, unknown> {
  const layer = candidateProfilePayloadToRecruiterNormalizedLayer(canonicalRaw)
  if (Object.keys(layer).length === 0) return { ...recruiterNd }
  return { ...recruiterNd, ...layer }
}
