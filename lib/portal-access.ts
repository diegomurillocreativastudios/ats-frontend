import {
  isAdminRole,
  isCandidateRole,
  isRecruiterRole,
} from "@/lib/roles"

export const PORTAL_SELECTION_PATH = "/seleccion-portal"

export const PORTAL_KEYS = [
  "candidate",
  "opportunities",
  "rrhh",
  "admin",
] as const

export type PortalKey = (typeof PORTAL_KEYS)[number]

export const PORTAL_HOME_HREF: Record<PortalKey, string> = {
  candidate: "/portal-candidato",
  opportunities: "/portal-oportunidades",
  rrhh: "/portal-rrhh",
  admin: "/portal-admin/usuarios",
}

/**
 * Portals the session role may enter. Matches proxy guards and the admin layout.
 * Oportunidades is public, but only staff get it as a selectable "vista".
 */
export function getAccessiblePortalKeys(
  role: string | null | undefined,
): PortalKey[] {
  if (isAdminRole(role)) {
    return ["candidate", "opportunities", "rrhh", "admin"]
  }
  if (isRecruiterRole(role)) {
    return ["opportunities", "rrhh"]
  }
  if (isCandidateRole(role)) {
    return ["candidate"]
  }
  return ["candidate", "opportunities", "rrhh"]
}

/**
 * Home of the only accessible portal, or null when the user should pick one.
 */
export function resolveSolePortalHref(
  role: string | null | undefined,
): string | null {
  const portals = getAccessiblePortalKeys(role)
  if (portals.length !== 1) return null
  return PORTAL_HOME_HREF[portals[0]]
}

/**
 * Where to send an already-authenticated user (login, `/`, or logo → selector).
 */
export function resolvePostAuthPath(role: string | null | undefined): string {
  return resolveSolePortalHref(role) ?? PORTAL_SELECTION_PATH
}
