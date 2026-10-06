import { headers } from "next/headers"

import { NONCE_HEADER } from "@/lib/security/security-headers"
import {
  buildJobPostingJsonLd,
  serializeJsonLd,
  vacancyCanonicalPath,
  type PublicVacancySeoSource,
} from "@/lib/seo/public-metadata"
import { readPublicOrigin } from "@/lib/seo/site-origin"

export async function PublicVacancyJobPosting({
  vacancy,
}: {
  vacancy: PublicVacancySeoSource
}) {
  const configured = readPublicOrigin()
  const headerList = await headers()
  const forwardedHost = headerList.get("x-forwarded-host") ?? headerList.get("host")
  const host = forwardedHost?.split(",")[0]?.trim()
  const proto = headerList.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http"
  const origin = configured ?? (host ? `${proto}://${host}` : null)
  const path = vacancyCanonicalPath(vacancy)
  const canonicalUrl = origin ? `${origin}${path}` : path
  const data = buildJobPostingJsonLd(vacancy, canonicalUrl)
  if (!data) return null

  const nonce = headerList.get(NONCE_HEADER)?.trim()

  return (
    <script
      type="application/ld+json"
      {...(nonce ? { nonce } : {})}
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}
