export interface TopbarCrumb {
  label: string
  href?: string
}

function normalizeLabel(label: string): string {
  return label.trim().toLocaleLowerCase()
}

/**
 * Prefixes the portal home crumb and drops a duplicated first segment
 * (e.g. "Portal RRHH" passed again by a page trail).
 */
export function buildTopbarTrail(
  portalLabel: string,
  portalHref: string,
  trail: TopbarCrumb[] | null | undefined,
  fallbackLabel: string,
): TopbarCrumb[] {
  const rest =
    Array.isArray(trail) && trail.length > 0
      ? trail
      : [{ label: fallbackLabel }]

  const first = rest[0]
  const withoutDuplicatePortal =
    first && normalizeLabel(first.label) === normalizeLabel(portalLabel)
      ? rest.slice(1)
      : rest

  const pageCrumbs =
    withoutDuplicatePortal.length > 0
      ? withoutDuplicatePortal
      : [{ label: fallbackLabel }]

  return [{ label: portalLabel, href: portalHref }, ...pageCrumbs]
}

export function formatTopbarTrailText(crumbs: TopbarCrumb[]): string {
  return crumbs.map((crumb) => crumb.label).join(" > ")
}
