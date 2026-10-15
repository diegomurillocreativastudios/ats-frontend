import Link from "next/link"
import { getTranslations } from "next-intl/server"

import { NOINDEX_NOFOLLOW } from "@/lib/seo/public-metadata"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.notFound")
  return {
    title: { absolute: t("title") },
    description: t("description"),
    robots: NOINDEX_NOFOLLOW,
  }
}

export default async function NotFound() {
  const t = await getTranslations("Metadata.notFound")

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8">
      <h1 className="font-sans text-lg font-semibold text-foreground">{t("title")}</h1>
      <p className="max-w-md text-center font-sans text-sm text-muted-foreground">
        {t("description")}
      </p>
      <Link
        href="/portal-oportunidades"
        className="rounded-md bg-vo-purple px-4 py-2 font-sans text-sm text-white hover:bg-vo-purple-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
      >
        {t("back")}
      </Link>
    </div>
  )
}
