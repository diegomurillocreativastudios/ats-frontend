export const ADMIN_PORTAL_NAV_LINKS = [
  { href: "/portal-admin/etapas", labelKey: "stages" },
  { href: "/portal-admin/plantillas", labelKey: "templates" },
  { href: "/portal-admin/entrevistas", labelKey: "interviewsCatalog" },
  { href: "/portal-admin/entrevistas/general", labelKey: "interviewsCalendar" },
  { href: "/portal-admin/usuarios", labelKey: "users" },
  { href: "/portal-admin/empresas", labelKey: "companies" },
  { href: "/portal-admin/departamentos", labelKey: "departments" },
  { href: "/portal-admin/modalidades", labelKey: "modalities" },
  { href: "/portal-admin/tipos-de-documento", labelKey: "documentTypes" },
] as const

export const ADMIN_SETTINGS_NAV_LINK = {
  href: "/portal-admin/configuracion",
  labelKey: "settings",
} as const

export type AdminPortalNavLabelKey =
  | (typeof ADMIN_PORTAL_NAV_LINKS)[number]["labelKey"]
  | (typeof ADMIN_SETTINGS_NAV_LINK)["labelKey"]

function normalizeAdminPath(pathname: string): string {
  return pathname.endsWith("/") && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname
}

/** Resuelve la clave de `Navigation` para la ruta admin actual (misma lógica que el sidebar). */
export function resolveAdminPortalNavLabelKey(
  pathname: string,
): AdminPortalNavLabelKey | null {
  const normalized = normalizeAdminPath(pathname)
  if (!normalized.startsWith("/portal-admin") || normalized === "/portal-admin") {
    return null
  }

  const allLinks = [...ADMIN_PORTAL_NAV_LINKS, ADMIN_SETTINGS_NAV_LINK]
  const exact = allLinks.find((item) => normalized === item.href)
  if (exact) return exact.labelKey

  const prefixMatch = allLinks
    .filter((item) => normalized.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]

  return prefixMatch?.labelKey ?? null
}
