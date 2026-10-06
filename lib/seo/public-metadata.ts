import type { Metadata, MetadataRoute } from "next"

import { APP_NAME } from "@/lib/app-brand"
import { buildPublicVacancyPath } from "@/lib/vacancies/vacancy-public-path"

export const INDEX_FOLLOW = { index: true, follow: true } as const
export const NOINDEX_FOLLOW = { index: false, follow: true } as const
export const NOINDEX_NOFOLLOW = { index: false, follow: false } as const

const META_DESCRIPTION_MAX = 160
const UNSPECIFIED_COMPANY_NAME = "Empresa no especificada"
const REMOTE_MODALITY =
  /remote|remoto|remota|teletrabaj|telearbeit|home[\s-]?office|telecommute|à distance|a distancia/i

export interface PublicVacancySeoSource {
  id: string
  publicSlug?: string | null
  title: string
  description?: string
  summary?: string
  publishedAt?: string
  countryCode?: string
  stateCode?: string | null
  company: { name: string }
  modality?: { code?: string; displayName?: string } | null
}

export interface SitemapVacancySource {
  id: string
  publicSlug?: string | null
  publishedAt?: string
}

export function shouldLeaveDocumentTitleToServer(pathname: string): boolean {
  const normalized =
    pathname.endsWith("/") && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname
  if (normalized === "/privacy-policy") return true
  return (
    normalized === "/portal-oportunidades" ||
    normalized.startsWith("/portal-oportunidades/")
  )
}

export function hasPublicListQuery(
  searchParams: Record<string, string | string[] | undefined>
): boolean {
  return Object.values(searchParams).some((value) => {
    if (typeof value === "string") return value.trim() !== ""
    if (Array.isArray(value)) return value.some((entry) => entry.trim() !== "")
    return false
  })
}

export function toSearchQueryString(
  searchParams: Record<string, string | string[] | undefined>
): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      params.append(key, value)
      continue
    }
    if (Array.isArray(value)) {
      for (const entry of value) params.append(key, entry)
    }
  }
  return params.toString()
}

export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

export function truncateMetaDescription(
  value: string,
  maxLength = META_DESCRIPTION_MAX
): string {
  const normalized = collapseWhitespace(value)
  if (normalized.length <= maxLength) return normalized
  const sliced = normalized.slice(0, maxLength - 1)
  const lastSpace = sliced.lastIndexOf(" ")
  const cut = lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced
  return `${cut.trimEnd()}…`
}

export function resolveMetaDescription(
  primary: string | undefined,
  fallback: string
): string {
  const source = collapseWhitespace(primary ?? "") || collapseWhitespace(fallback)
  return truncateMetaDescription(source)
}

export function toIsoDate(value: string | undefined): string | null {
  if (!value?.trim()) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

export function isRemoteModality(
  modality: PublicVacancySeoSource["modality"]
): boolean {
  if (!modality) return false
  return REMOTE_MODALITY.test(`${modality.code ?? ""} ${modality.displayName ?? ""}`)
}

/**
 * Permanent redirect target when the URL segment is not the public slug.
 * The query string is preserved on the redirect only.
 */
export function slugRedirectPath(
  segment: string,
  vacancy: { id: string; publicSlug?: string | null },
  suffix = "",
  queryString = ""
): string | null {
  const slug = vacancy.publicSlug?.trim()
  if (!slug || segment === slug) return null
  const path = buildPublicVacancyPath({ id: vacancy.id, publicSlug: slug }, suffix)
  return queryString ? `${path}?${queryString}` : path
}

export function vacancyCanonicalPath(vacancy: {
  id: string
  publicSlug?: string | null
}): string {
  return buildPublicVacancyPath(vacancy)
}

function absoluteUrl(origin: string | null, path: string): string {
  if (!origin) return path
  return `${origin}${path}`
}

export function buildPublicPageMetadata(input: {
  title: string
  description: string
  canonicalPath: string
  origin: string | null
  robots: Metadata["robots"]
}): Metadata {
  const description = truncateMetaDescription(input.description)
  return {
    title: { absolute: input.title },
    description,
    alternates: { canonical: input.canonicalPath },
    robots: input.robots,
    openGraph: {
      type: "website",
      siteName: APP_NAME,
      locale: "es",
      title: input.title,
      description,
      url: absoluteUrl(input.origin, input.canonicalPath),
    },
  }
}

export function buildJobPostingJsonLd(
  vacancy: PublicVacancySeoSource,
  canonicalUrl: string
): Record<string, unknown> | null {
  if (!canonicalUrl.startsWith("http")) return null

  const title = vacancy.title.trim()
  const description = collapseWhitespace(vacancy.description || vacancy.summary || "")
  const datePosted = toIsoDate(vacancy.publishedAt)
  const companyName = vacancy.company.name.trim()
  if (!title || !description || !datePosted || !companyName) return null
  if (companyName === UNSPECIFIED_COMPANY_NAME) return null

  const country = vacancy.countryCode?.trim()
  const region = vacancy.stateCode?.trim()
  const hasPlace = Boolean(country || region)
  const remote = isRemoteModality(vacancy.modality)
  if (!hasPlace && !remote) return null

  const posting: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title,
    description,
    datePosted,
    directApply: true,
    url: canonicalUrl,
    hiringOrganization: {
      "@type": "Organization",
      name: companyName,
    },
  }

  if (hasPlace) {
    posting.jobLocation = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        ...(country ? { addressCountry: country } : {}),
        ...(region ? { addressRegion: region } : {}),
      },
    }
  } else {
    posting.jobLocationType = "TELECOMMUTE"
  }

  return posting
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c")
}

export function buildRobots(origin: string | null): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
    ...(origin ? { sitemap: `${origin}/sitemap.xml` } : {}),
  }
}

export function buildPublicSitemap(
  origin: string | null,
  vacancies: SitemapVacancySource[]
): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl(origin, "/portal-oportunidades") },
    { url: absoluteUrl(origin, "/privacy-policy") },
  ]
  const seen = new Set<string>()

  for (const vacancy of vacancies) {
    const path = vacancyCanonicalPath(vacancy)
    if (seen.has(path) || path.endsWith("/aplicar")) continue
    seen.add(path)
    const lastModified = toIsoDate(vacancy.publishedAt)
    entries.push({
      url: absoluteUrl(origin, path),
      ...(lastModified ? { lastModified } : {}),
    })
  }

  return entries
}
