export const PRUEBAS_HOME_HREF = "/portal-pruebas"

export type PruebasNavKey =
  | "home"
  | "evaluations"
  | "questions"
  | "links"
  | "assignments"
  | "tracking"
  | "review"
  | "results"
  | "reports"

export type PruebasNavGroupKey = "home" | "content" | "operations" | "closing"

export interface PruebasNavLink {
  href: string
  navKey: PruebasNavKey
  exact?: boolean
}

export interface PruebasNavGroup {
  id: PruebasNavGroupKey
  groupKey: PruebasNavGroupKey
  items: readonly PruebasNavLink[]
}

export const PRUEBAS_NAV_GROUPS: readonly PruebasNavGroup[] = [
  {
    id: "home",
    groupKey: "home",
    items: [
      { href: PRUEBAS_HOME_HREF, navKey: "home", exact: true },
    ],
  },
  {
    id: "content",
    groupKey: "content",
    items: [
      { href: `${PRUEBAS_HOME_HREF}/evaluaciones`, navKey: "evaluations" },
      { href: `${PRUEBAS_HOME_HREF}/preguntas`, navKey: "questions" },
    ],
  },
  {
    id: "operations",
    groupKey: "operations",
    items: [
      { href: `${PRUEBAS_HOME_HREF}/vinculaciones`, navKey: "links" },
      { href: `${PRUEBAS_HOME_HREF}/asignaciones`, navKey: "assignments" },
      { href: `${PRUEBAS_HOME_HREF}/seguimiento`, navKey: "tracking" },
    ],
  },
  {
    id: "closing",
    groupKey: "closing",
    items: [
      { href: `${PRUEBAS_HOME_HREF}/revision`, navKey: "review" },
      { href: `${PRUEBAS_HOME_HREF}/resultados`, navKey: "results" },
      { href: `${PRUEBAS_HOME_HREF}/reportes`, navKey: "reports" },
    ],
  },
] as const

export const PRUEBAS_NAV_LINKS: readonly PruebasNavLink[] =
  PRUEBAS_NAV_GROUPS.flatMap((group) => group.items)

function normalizePathname(pathname: string): string {
  return pathname.endsWith("/") && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname
}

export function isPruebasNavHrefActive(
  pathname: string,
  href: string,
  exact = false,
): boolean {
  const current = normalizePathname(pathname)
  if (exact || href === PRUEBAS_HOME_HREF) {
    return current === href
  }
  return current === href || current.startsWith(`${href}/`)
}

export function resolvePruebasNavKey(
  pathname: string,
): PruebasNavKey | null {
  const current = normalizePathname(pathname)
  for (const link of PRUEBAS_NAV_LINKS) {
    if (isPruebasNavHrefActive(current, link.href, link.exact)) {
      return link.navKey
    }
  }
  return null
}
