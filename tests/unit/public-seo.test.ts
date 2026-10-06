import { afterEach, describe, expect, it, vi } from "vitest"

import { locales, type Locale } from "@/i18n/routing"
import deMessages from "@/messages/de.json"
import enMessages from "@/messages/en.json"
import esMessages from "@/messages/es.json"
import frMessages from "@/messages/fr.json"
import itMessages from "@/messages/it.json"
import {
  buildJobPostingJsonLd,
  buildPublicPageMetadata,
  buildPublicSitemap,
  buildRobots,
  hasPublicListQuery,
  INDEX_FOLLOW,
  NOINDEX_FOLLOW,
  resolveMetaDescription,
  serializeJsonLd,
  shouldLeaveDocumentTitleToServer,
  slugRedirectPath,
  truncateMetaDescription,
  vacancyCanonicalPath,
  type PublicVacancySeoSource,
} from "@/lib/seo/public-metadata"
import { readMetadataBase, readPublicOrigin } from "@/lib/seo/site-origin"
import {
  listOpenPublicVacancies,
  loadPublicVacancyBySegment,
} from "@/lib/seo/public-vacancy"

const messages: Record<Locale, { Metadata: Record<string, unknown> }> = {
  es: esMessages,
  en: enMessages,
  it: itMessages,
  de: deMessages,
  fr: frMessages,
}

const VACANCY_ID = "1d2f9cbe-9079-4794-8569-eff14f0f8943"

function vacancy(
  overrides: Partial<PublicVacancySeoSource> = {}
): PublicVacancySeoSource {
  return {
    id: VACANCY_ID,
    publicSlug: "analista-datos",
    title: "Analista de datos",
    description: "Diseñar tableros y cuidar la calidad de los datos.",
    publishedAt: "2026-03-01T15:00:00.000Z",
    countryCode: "SV",
    stateCode: "SS",
    company: { name: "Acme" },
    modality: { code: "onsite", displayName: "Presencial" },
    ...overrides,
  }
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("public SEO metadata", () => {
  it("keeps the document title on the server for public routes", () => {
    expect(shouldLeaveDocumentTitleToServer("/portal-oportunidades")).toBe(true)
    expect(
      shouldLeaveDocumentTitleToServer("/portal-oportunidades/analista-datos")
    ).toBe(true)
    expect(
      shouldLeaveDocumentTitleToServer("/portal-oportunidades/analista-datos/aplicar")
    ).toBe(true)
    expect(shouldLeaveDocumentTitleToServer("/privacy-policy/")).toBe(true)
    expect(shouldLeaveDocumentTitleToServer("/portal-rrhh/vacantes")).toBe(false)
    expect(shouldLeaveDocumentTitleToServer("/")).toBe(false)
  })

  it("treats any list query as a filtered URL", () => {
    expect(hasPublicListQuery({})).toBe(false)
    expect(hasPublicListQuery({ page: "" })).toBe(false)
    expect(hasPublicListQuery({ page: "2" })).toBe(true)
    expect(hasPublicListQuery({ search: "datos" })).toBe(true)
  })

  it("truncates descriptions near 160 characters", () => {
    const long = `${"palabra ".repeat(40)}final`
    const truncated = truncateMetaDescription(long)
    expect(truncated.length).toBeLessThanOrEqual(160)
    expect(truncated.endsWith("…")).toBe(true)
    expect(resolveMetaDescription("  corto  ", "respaldo")).toBe("corto")
  })

  it("canonicalizes to the slug and keeps the query only on the redirect", () => {
    const source = vacancy()
    expect(vacancyCanonicalPath(source)).toBe("/portal-oportunidades/analista-datos")
    expect(vacancyCanonicalPath(source)).not.toContain("?")
    expect(slugRedirectPath(VACANCY_ID, source, "", "page=2")).toBe(
      "/portal-oportunidades/analista-datos?page=2"
    )
    expect(slugRedirectPath("analista-datos", source, "aplicar", "page=2")).toBeNull()
  })

  it("marks filtered lists as noindex and clean lists as indexable", () => {
    const filtered = buildPublicPageMetadata({
      title: "Listado",
      description: "Explorá vacantes",
      canonicalPath: "/portal-oportunidades",
      origin: "https://app.example.com",
      robots: NOINDEX_FOLLOW,
    })
    expect(filtered.alternates).toEqual({ canonical: "/portal-oportunidades" })
    expect(filtered.robots).toEqual(NOINDEX_FOLLOW)
    expect(filtered.openGraph).toMatchObject({
      url: "https://app.example.com/portal-oportunidades",
    })

    const clean = buildPublicPageMetadata({
      title: "Listado",
      description: "Explorá vacantes",
      canonicalPath: "/portal-oportunidades",
      origin: null,
      robots: INDEX_FOLLOW,
    })
    expect(clean.robots).toEqual(INDEX_FOLLOW)
  })

  it("omits JobPosting when the date, place, or company is missing", () => {
    const url = "https://app.example.com/portal-oportunidades/analista-datos"
    expect(buildJobPostingJsonLd(vacancy({ publishedAt: "ayer" }), url)).toBeNull()
    expect(
      buildJobPostingJsonLd(
        vacancy({ countryCode: undefined, stateCode: null, modality: null }),
        url
      )
    ).toBeNull()
    expect(
      buildJobPostingJsonLd(vacancy({ company: { name: "Empresa no especificada" } }), url)
    ).toBeNull()
    expect(buildJobPostingJsonLd(vacancy(), "/portal-oportunidades/analista-datos")).toBeNull()
  })

  it("builds JobPosting for an on-site role and for a remote role without a place", () => {
    const url = "https://app.example.com/portal-oportunidades/analista-datos"
    const onSite = buildJobPostingJsonLd(vacancy(), url)
    expect(onSite).toMatchObject({
      "@type": "JobPosting",
      title: "Analista de datos",
      directApply: true,
      url,
      jobLocation: {
        address: { addressCountry: "SV", addressRegion: "SS" },
      },
    })
    expect(onSite).not.toHaveProperty("baseSalary")
    expect(onSite).not.toHaveProperty("employmentType")

    const remote = buildJobPostingJsonLd(
      vacancy({
        countryCode: undefined,
        stateCode: null,
        modality: { code: "remote", displayName: "Remoto" },
      }),
      url
    )
    expect(remote).toMatchObject({ jobLocationType: "TELECOMMUTE" })
    expect(remote).not.toHaveProperty("jobLocation")
  })

  it("escapes script-breaking characters in structured data", () => {
    expect(serializeJsonLd({ title: "</script>" })).toBe('{"title":"\\u003c/script>"}')
  })

  it("allows the site and blocks only the API in robots.txt", () => {
    expect(buildRobots(null)).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    })
    expect(buildRobots("https://app.example.com").sitemap).toBe(
      "https://app.example.com/sitemap.xml"
    )
  })

  it("lists the clean board, the privacy policy, and one slug per vacancy", () => {
    const entries = buildPublicSitemap("https://app.example.com", [
      vacancy({ publishedAt: "2026-03-01T15:00:00.000Z" }),
      vacancy({
        id: "8b2e1c0a-1111-4222-8333-abcdefabcdef",
        publicSlug: "sin-fecha",
        publishedAt: "no-es-fecha",
      }),
      vacancy(),
    ])

    expect(entries.map((entry) => entry.url)).toEqual([
      "https://app.example.com/portal-oportunidades",
      "https://app.example.com/privacy-policy",
      "https://app.example.com/portal-oportunidades/analista-datos",
      "https://app.example.com/portal-oportunidades/sin-fecha",
    ])
    expect(entries[2]?.lastModified).toBe("2026-03-01T15:00:00.000Z")
    expect(entries[3]?.lastModified).toBeUndefined()
    expect(entries.some((entry) => entry.url.includes(VACANCY_ID))).toBe(false)
    expect(entries.some((entry) => entry.url.endsWith("/aplicar"))).toBe(false)
  })

  it("reads a public origin only from an absolute http(s) URL", () => {
    expect(readMetadataBase("")).toBeUndefined()
    expect(readMetadataBase("not a url")).toBeUndefined()
    expect(readPublicOrigin("https://app.example.com/")).toBe("https://app.example.com")
  })

  it("keeps public metadata copy and the not-found keys in every locale", () => {
    for (const locale of locales) {
      const metadata = messages[locale].Metadata
      const root = metadata.root as { description: string }
      const privacy = metadata.privacyPolicy as { title: string; description: string }
      const opportunities = metadata.publicOpportunities as {
        list: { description: string }
        detail: { description: string }
        apply: { description: string }
      }
      const notFound = metadata.notFound as Record<string, string>

      expect(root.description).toContain("ApplicanTree")
      expect(privacy.title).toContain("ApplicanTree")
      expect(privacy.description).toContain("ApplicanTree")
      expect(privacy.title).not.toContain("Applicantree")
      expect(opportunities.list.description).toContain("ApplicanTree")
      expect(opportunities.detail.description).toContain("ApplicanTree")
      expect(opportunities.apply.description).toContain("ApplicanTree")
      expect(Object.keys(notFound).sort()).toEqual(["back", "description", "title"])
    }
  })
})

describe("public vacancy server reads", () => {
  it("returns not_found on 404 and on an invalid slug, and unavailable on a network error", async () => {
    vi.stubEnv("API_URL", "https://api.example.com")
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Invalid vacancy public slug." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      )
    vi.stubGlobal("fetch", fetchMock)

    await expect(loadPublicVacancyBySegment("analista-datos")).resolves.toEqual({
      status: "not_found",
    })
    await expect(loadPublicVacancyBySegment("no-existe")).resolves.toEqual({
      status: "not_found",
    })
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/vacantes/by-public-slug/analista-datos",
      expect.objectContaining({ cache: "no-store" })
    )

    fetchMock.mockRejectedValueOnce(new Error("offline"))
    await expect(loadPublicVacancyBySegment(VACANCY_ID)).resolves.toEqual({
      status: "unavailable",
    })
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain(`/api/vacantes/${VACANCY_ID}`)
  })

  it("paginates open vacancies and stops when a page repeats", async () => {
    vi.stubEnv("API_URL", "https://api.example.com")
    const page = (id: string, hasNextPage: boolean) =>
      Response.json({
        items: [{ id, title: id, publicSlug: id, companyName: "Acme" }],
        page: 1,
        pageSize: 1,
        totalCount: 2,
        totalPages: 2,
        hasNextPage,
      })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(page("uno", true))
      .mockResolvedValueOnce(page("uno", true))
    vi.stubGlobal("fetch", fetchMock)

    const items = await listOpenPublicVacancies({ maxPages: 5, pageSize: 1 })
    expect(items.map((item) => item.id)).toEqual(["uno"])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
