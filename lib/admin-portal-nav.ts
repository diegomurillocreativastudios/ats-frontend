export const ADMIN_SETTINGS_NAV_LINK = {
  href: "/portal-admin/configuracion",
  labelKey: "settings",
} as const

export const ADMIN_PORTAL_NAV_ITEMS = [
  {
    kind: "group",
    id: "vacancies",
    href: "/portal-admin/vacantes",
    labelKey: "vacancies",
    children: [
      { href: "/portal-admin/vacantes/etapas", labelKey: "stages" },
      { href: "/portal-admin/vacantes/estados", labelKey: "stageStatuses" },
      { href: "/portal-admin/vacantes/departamentos", labelKey: "departments" },
      { href: "/portal-admin/vacantes/modalidades", labelKey: "modalities" },
    ],
  },
  {
    kind: "link",
    href: "/portal-admin/plantillas",
    labelKey: "templates",
  },
  {
    kind: "group",
    id: "interviews",
    href: "/portal-admin/entrevistas",
    labelKey: "interviews",
    children: [
      { href: "/portal-admin/entrevistas/tipos", labelKey: "interviewTypes" },
      {
        href: "/portal-admin/entrevistas/modalidades",
        labelKey: "interviewModalities",
      },
      { href: "/portal-admin/entrevistas/estados", labelKey: "interviewStatuses" },
    ],
  },
  {
    kind: "group",
    id: "administration",
    href: "/portal-admin/administracion",
    labelKey: "administration",
    children: [
      { href: "/portal-admin/administracion/usuarios", labelKey: "users" },
      {
        href: "/portal-admin/administracion/tipos-de-documento",
        labelKey: "documentTypes",
      },
    ],
  },
] as const

export type AdminPortalNavItem = (typeof ADMIN_PORTAL_NAV_ITEMS)[number]

export type AdminPortalNavGroup = Extract<AdminPortalNavItem, { kind: "group" }>

export type AdminPortalNavLinkItem = Extract<AdminPortalNavItem, { kind: "link" }>

export type AdminPortalNavChild = AdminPortalNavGroup["children"][number]

/** Rutas que ya no están en el menú pero siguen activas (migas de pan). */
const ADMIN_PORTAL_LEGACY_NAV_LINKS = [
  { href: "/portal-admin/empresas", labelKey: "companies" },
  { href: "/portal-admin/entrevistas/general", labelKey: "interviewsCalendar" },
] as const

export type AdminPortalNavLabelKey =
  | (typeof ADMIN_PORTAL_NAV_ITEMS)[number]["labelKey"]
  | AdminPortalNavChild["labelKey"]
  | (typeof ADMIN_SETTINGS_NAV_LINK)["labelKey"]
  | (typeof ADMIN_PORTAL_LEGACY_NAV_LINKS)[number]["labelKey"]

interface AdminPortalHrefLink {
  href: string
  labelKey: AdminPortalNavLabelKey
}

function flattenAdminPortalNavLinks(): AdminPortalHrefLink[] {
  const links: AdminPortalHrefLink[] = []

  for (const item of ADMIN_PORTAL_NAV_ITEMS) {
    if (item.kind === "link") {
      links.push({ href: item.href, labelKey: item.labelKey })
      continue
    }

    if ("href" in item && item.href) {
      links.push({ href: item.href, labelKey: item.labelKey })
    }

    for (const child of item.children) {
      links.push({ href: child.href, labelKey: child.labelKey })
    }
  }

  return links
}

export const ADMIN_PORTAL_NAV_LINKS = flattenAdminPortalNavLinks()

function normalizeAdminPath(pathname: string): string {
  return pathname.endsWith("/") && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname
}

export function isAdminNavHrefActive(pathname: string, href: string): boolean {
  const normalized = normalizeAdminPath(pathname)
  if (normalized === href) return true
  if (!normalized.startsWith(`${href}/`)) return false

  const hasMoreSpecificNavMatch = ADMIN_PORTAL_NAV_LINKS.some(
    (item) =>
      item.href !== href &&
      item.href.startsWith(`${href}/`) &&
      (normalized === item.href || normalized.startsWith(`${item.href}/`)),
  )
  return !hasMoreSpecificNavMatch
}

export function adminNavGroupContainsPath(
  pathname: string,
  group: {
    id: AdminPortalNavGroup["id"]
    href?: string
    children: readonly { href: string }[]
  },
): boolean {
  if (group.href && isAdminNavHrefActive(pathname, group.href)) return true
  if (group.children.some((child) => isAdminNavHrefActive(pathname, child.href))) {
    return true
  }
  return (
    group.id === "interviews" &&
    normalizeAdminPath(pathname).startsWith("/portal-admin/entrevistas")
  )
}

export interface AdminPortalBreadcrumbItem {
  href: string
  labelKey: AdminPortalNavLabelKey
}

/**
 * Trail de migas alineado al menú: grupo (si aplica) + página actual.
 * Ej. Vacantes > Etapas, Entrevistas > Tipos, Plantillas.
 */
export function resolveAdminPortalBreadcrumbTrail(
  pathname: string,
): AdminPortalBreadcrumbItem[] {
  const normalized = normalizeAdminPath(pathname)
  if (!normalized.startsWith("/portal-admin") || normalized === "/portal-admin") {
    return []
  }

  if (isAdminNavHrefActive(normalized, ADMIN_SETTINGS_NAV_LINK.href)) {
    return [ADMIN_SETTINGS_NAV_LINK]
  }

  for (const item of ADMIN_PORTAL_NAV_ITEMS) {
    if (item.kind === "link") {
      if (isAdminNavHrefActive(normalized, item.href)) {
        return [{ href: item.href, labelKey: item.labelKey }]
      }
      continue
    }

    const matchingChild = item.children.find((child) =>
      isAdminNavHrefActive(normalized, child.href),
    )
    if (matchingChild) {
      return [
        { href: item.href, labelKey: item.labelKey },
        { href: matchingChild.href, labelKey: matchingChild.labelKey },
      ]
    }

    if (normalized === item.href || normalized.startsWith(`${item.href}/`)) {
      const legacy = ADMIN_PORTAL_LEGACY_NAV_LINKS.find((link) =>
        isAdminNavHrefActive(normalized, link.href),
      )
      if (legacy) {
        return [
          { href: item.href, labelKey: item.labelKey },
          { href: legacy.href, labelKey: legacy.labelKey },
        ]
      }
      return [{ href: item.href, labelKey: item.labelKey }]
    }
  }

  const legacy = ADMIN_PORTAL_LEGACY_NAV_LINKS.find((link) =>
    isAdminNavHrefActive(normalized, link.href),
  )
  if (legacy) return [{ href: legacy.href, labelKey: legacy.labelKey }]

  return []
}

/** Resuelve la clave de `Navigation` para la ruta admin actual (misma lógica que el sidebar). */
export function resolveAdminPortalNavLabelKey(
  pathname: string,
): AdminPortalNavLabelKey | null {
  const normalized = normalizeAdminPath(pathname)
  if (!normalized.startsWith("/portal-admin") || normalized === "/portal-admin") {
    return null
  }

  const allLinks: AdminPortalHrefLink[] = [
    ...ADMIN_PORTAL_NAV_LINKS,
    ADMIN_SETTINGS_NAV_LINK,
    ...ADMIN_PORTAL_LEGACY_NAV_LINKS,
  ]
  const exact = allLinks.find((item) => normalized === item.href)
  if (exact) return exact.labelKey

  const prefixMatch = allLinks
    .filter((item) => normalized.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]

  return prefixMatch?.labelKey ?? null
}
