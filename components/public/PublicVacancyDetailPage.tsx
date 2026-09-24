"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { ArrowLeft, ArrowRight } from "lucide-react"
import {
  getPublicVacancyByPathSegment,
  type OpportunityVacancyDetail,
} from "@/lib/api/public-vacancies"
import { ApplicationTipsWidget } from "@/components/public/ApplicationTipsWidget"
import { PublicOpportunitiesShell } from "@/components/public/PublicOpportunitiesShell"
import { VacancyIdentityFacts } from "@/components/public/vacancy-identity-facts"
import {
  PublicVacancyOutline,
  VacancyContentBlocks,
} from "@/components/public/PublicVacancyOutline"
import { CopyPublicVacancyLinkButton } from "@/components/shared/copy-public-vacancy-link-button"
import {
  buildVacancyStory,
  hasVacancyFieldValue,
} from "@/lib/public-vacancy-content"
import { publicOpportunitiesTheme } from "@/lib/public-opportunities-theme"
import { buildPublicVacancyPath } from "@/lib/vacancies/vacancy-public-path"

const vacancyIllustrationSrc = "/ilustrations/undraw_document-review_lfir.svg"

function VacancySkeleton() {
  return (
    <div className={publicOpportunitiesTheme.articleGrid}>
      <div className="space-y-4">
        <div className="h-14 w-2/3 rounded-md bg-muted/50 sm:h-16 lg:h-20" />
        <div className="h-4 w-full rounded-md bg-muted/50" />
        <div className="h-4 w-[94%] rounded-md bg-muted/50" />
        <div className="h-4 w-[70%] rounded-md bg-muted/50" />
        <div className="mt-8 h-6 w-48 rounded-md bg-muted/50" />
        <div className="h-4 w-full rounded-md bg-muted/50" />
      </div>
      <div className="space-y-3">
        <div className="h-10 w-36 rounded-md bg-muted/50" />
        <div className="h-4 w-40 rounded-md bg-muted/50" />
        <div className="h-11 w-full rounded-full bg-muted/50" />
      </div>
    </div>
  )
}

export function PublicVacancyDetailPage({
  vacancyId,
}: {
  vacancyId: string
}) {
  const t = useTranslations("PublicOpportunities.detail")
  const tPage = useTranslations("PublicOpportunities.page")
  const router = useRouter()
  const searchParams = useSearchParams()
  const [vacancy, setVacancy] = useState<OpportunityVacancyDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const queryString = searchParams.toString()

  const backHref = useMemo(() => {
    return queryString ? `/portal-oportunidades?${queryString}` : "/portal-oportunidades"
  }, [queryString])

  useEffect(() => {
    let isCancelled = false

    const loadVacancy = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const nextVacancy = await getPublicVacancyByPathSegment(vacancyId)

        if (isCancelled) return
        if (!nextVacancy) {
          setVacancy(null)
          setErrorMessage(t("notFound"))
          return
        }

        setVacancy(nextVacancy)

        const canonical = nextVacancy.publicSlug
        if (canonical && vacancyId !== canonical) {
          const nextPath = buildPublicVacancyPath(nextVacancy)
          const withQuery = queryString ? `${nextPath}?${queryString}` : nextPath
          router.replace(withQuery)
        }
      } catch (error) {
        if (isCancelled) return
        const message =
          error instanceof Error && error.message.trim() !== ""
            ? error.message
            : t("loadFailed")
        setVacancy(null)
        setErrorMessage(message)
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadVacancy()

    return () => {
      isCancelled = true
    }
  }, [vacancyId, t, router, queryString])

  useEffect(() => {
    if (!vacancy?.title) return
    document.title = t("documentTitle", { title: vacancy.title })
  }, [vacancy?.title, t])

  const companyName = vacancy?.company.name?.trim() ?? ""
  const applyHref = vacancy
    ? queryString
      ? `${buildPublicVacancyPath(vacancy, "aplicar")}?${queryString}`
      : buildPublicVacancyPath(vacancy, "aplicar")
    : queryString
      ? `/portal-oportunidades/${encodeURIComponent(vacancyId)}/aplicar?${queryString}`
      : `/portal-oportunidades/${encodeURIComponent(vacancyId)}/aplicar`
  const departmentLabel = vacancy?.department?.displayName
  const modalityLabel = vacancy?.modality?.displayName
  const hasDepartment = hasVacancyFieldValue(departmentLabel)
  const hasModality = hasVacancyFieldValue(modalityLabel)
  const hasLocation = Boolean(vacancy?.countryCode || vacancy?.stateCode)
  const applyClassName = `inline-flex items-center justify-center gap-2 ${publicOpportunitiesTheme.cta}`
  const copyLinkClassName = `inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ats-cobre focus-visible:ring-offset-2 focus-visible:ring-offset-background`
  const story = useMemo(() => {
    if (!vacancy) return null
    return buildVacancyStory({
      title: vacancy.title,
      description: vacancy.description,
      details: vacancy.details,
      advantages: vacancy.advantages,
      responsibilities: vacancy.responsibilities,
      requirements: vacancy.requirements,
      benefits: vacancy.benefits,
    })
  }, [vacancy])

  return (
    <PublicOpportunitiesShell
      background={
        <>
          <div className={publicOpportunitiesTheme.heroGradientShort} />
          <div
            className={`absolute right-[6%] top-12 h-56 w-56 ${publicOpportunitiesTheme.orbCobre}`}
          />
        </>
      }
    >
      <div className="relative flex w-full flex-col px-4 pb-12 pt-8 sm:px-6 lg:px-8">
        <div className={publicOpportunitiesTheme.shellDirectory}>
          <div className="mb-8">
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ats-cobre focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {t("back")}
            </Link>
          </div>

          {errorMessage ? (
            <div>
              <p className="text-sm text-ats-terracotta-soft" role="alert">
                {errorMessage}
              </p>
              <div className="mt-4">
                <Link
                  href="/portal-oportunidades"
                  className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-ats-terracotta-soft"
                >
                  {t("viewAll")}
                </Link>
              </div>
            </div>
          ) : isLoading ? (
            <VacancySkeleton />
          ) : vacancy && story ? (
            <div className={publicOpportunitiesTheme.articleGrid}>
              <article>
                <h1 className={publicOpportunitiesTheme.articleTitle}>
                  {vacancy.title}
                </h1>

                <div className="mt-6 space-y-3 lg:hidden">
                  <Link href={applyHref} className={applyClassName}>
                    {t("apply")}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                  <CopyPublicVacancyLinkButton
                    vacancy={vacancy}
                    label={t("copyLink")}
                    ariaLabel={t("copyLinkAria")}
                    copiedLabel={t("linkCopied")}
                    copyFailedLabel={t("linkCopyFailed")}
                    className={copyLinkClassName}
                  />
                </div>

                {story.description.length ? (
                  <div className="mt-8">
                    <VacancyContentBlocks blocks={story.description} />
                  </div>
                ) : null}

                <PublicVacancyOutline
                  story={story}
                  requirementsTitle={t("requirementsHeading")}
                  detailsTitle={t("detailsHeading")}
                  advantagesTitle={t("advantagesHeading")}
                />
              </article>

              <aside
                className={publicOpportunitiesTheme.articleRail}
                aria-labelledby="vacancy-apply-heading"
              >
                <div className={publicOpportunitiesTheme.articleRailIllustration} aria-hidden>
                  <img
                    src={vacancyIllustrationSrc}
                    alt=""
                    className={publicOpportunitiesTheme.articleRailIllustrationImage}
                  />
                </div>

                <VacancyIdentityFacts
                  companyName={companyName}
                  countryCode={vacancy.countryCode}
                  stateCode={vacancy.stateCode}
                  emptyLocationLabel={tPage("fallbackLocation")}
                  showLocation={hasLocation}
                  departmentLabel={hasDepartment ? departmentLabel : null}
                  modalityLabel={hasModality ? modalityLabel : null}
                />

                <div className="border-t border-border pt-5">
                  <h2
                    id="vacancy-apply-heading"
                    className="text-lg font-semibold tracking-tight text-foreground"
                  >
                    {t("readyTitle")}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {t("readyBody")}
                  </p>
                  <Link
                    href={applyHref}
                    className={`mt-4 w-full ${applyClassName}`}
                  >
                    {t("apply")}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                  <CopyPublicVacancyLinkButton
                    vacancy={vacancy}
                    label={t("copyLink")}
                    ariaLabel={t("copyLinkAria")}
                    copiedLabel={t("linkCopied")}
                    copyFailedLabel={t("linkCopyFailed")}
                    className={`mt-3 ${copyLinkClassName}`}
                  />
                </div>

                <div className="border-t border-border pt-5">
                  <p className="text-sm leading-6 text-muted-foreground">
                    {t("moreVacanciesBody")}
                  </p>
                  <Link
                    href={backHref}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-ats-terracotta transition-colors hover:text-ats-terracotta-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ats-cobre focus-visible:ring-offset-2"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                    {t("moreVacanciesLink")}
                  </Link>
                </div>

                <ApplicationTipsWidget variant="inline" />
              </aside>
            </div>
          ) : null}
        </div>
      </div>
    </PublicOpportunitiesShell>
  )
}
