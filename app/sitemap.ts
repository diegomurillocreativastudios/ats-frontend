import type { MetadataRoute } from "next"

import { buildPublicSitemap } from "@/lib/seo/public-metadata"
import { listOpenPublicVacancies } from "@/lib/seo/public-vacancy"
import { readPublicOrigin } from "@/lib/seo/site-origin"

export const dynamic = "force-dynamic"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = readPublicOrigin()
  try {
    const vacancies = await listOpenPublicVacancies()
    return buildPublicSitemap(origin, vacancies)
  } catch {
    return buildPublicSitemap(origin, [])
  }
}
