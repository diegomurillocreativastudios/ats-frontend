import { SHOW_PRUEBAS_IN_PORTAL_SELECTION } from "@/lib/pruebas/feature"
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
  "pruebas",
  "admin",
] as const

export type PortalKey = (typeof PORTAL_KEYS)[number]

export const PORTAL_HOME_HREF: Record<PortalKey, string> = {
  candidate: "/portal-candidato",
  opportunities: "/portal-oportunidades",
  rrhh: "/portal-rrhh",
  pruebas: "/portal-pruebas",
  admin: "/portal-admin/administracion/usuarios",
}

/**
 * Portals the session role may enter. Fail-closed: unknown/null role → none.
 * Oportunidades is public, but only staff get it as a selectable "vista".
 */
export function getAccessiblePortalKeys(
  role: string | null | undefined,
): PortalKey[] {
  if (isAdminRole(role)) {
    return ["candidate", "opportunities", "rrhh", "pruebas", "admin"]
  }
  if (isRecruiterRole(role)) {
    return ["opportunities", "rrhh", "pruebas"]
  }
  if (isCandidateRole(role)) {
    return ["candidate"]
  }
  return []
}

/**
 * Portals listed on `/seleccion-portal`.
 * Access to `/portal-pruebas` is unchanged; only the picker card is optional.
 */
export function getPortalsForSelection(
  role: string | null | undefined,
  options?: { showPruebasPortal?: boolean },
): PortalKey[] {
  const portals = getAccessiblePortalKeys(role)
  const showPruebasPortal =
    options?.showPruebasPortal ?? SHOW_PRUEBAS_IN_PORTAL_SELECTION
  if (showPruebasPortal) return portals
  return portals.filter((portal) => portal !== "pruebas")
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
