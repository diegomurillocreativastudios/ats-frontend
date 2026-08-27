"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { ArrowLeft, ArrowRight, Briefcase, Building, Building2, MapPin } from "lucide-react"
import {
  buildOpportunityCompanyLogoDataUri,
  getPublicVacancyDetail,
  type OpportunityVacancyDetail,
} from "@/lib/api/public-vacancies"
import { ApplicationTipsWidget } from "@/components/public/ApplicationTipsWidget"
import { PublicOpportunitiesShell } from "@/components/public/PublicOpportunitiesShell"
import {
  PublicVacancyOutline,
  VacancyContentBlocks,
} from "@/components/public/PublicVacancyOutline"
import { VacancyLocationLabel } from "@/components/shared/VacancyLocationLabel"
import {
  buildVacancyStory,
  hasVacancyFieldValue,
} from "@/lib/public-vacancy-content"
import { publicOpportunitiesTheme } from "@/lib/public-opportunities-theme"

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
        const nextVacancy = await getPublicVacancyDetail(vacancyId)

        if (isCancelled) return
        if (!nextVacancy) {
          setVacancy(null)
          setErrorMessage(t("notFound"))
          return
        }

        setVacancy(nextVacancy)
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
  }, [vacancyId, t])

  useEffect(() => {
    if (!vacancy?.title) return
    document.title = t("documentTitle", { title: vacancy.title })
  }, [vacancy?.title, t])

  const companyName = vacancy?.company.name?.trim() ?? ""
  const companyLogoSrc = buildOpportunityCompanyLogoDataUri(vacancy?.company.logo ?? null)
  const applyHref = queryString
    ? `/portal-oportunidades/${vacancyId}/aplicar?${queryString}`
    : `/portal-oportunidades/${vacancyId}/aplicar`
  const departmentLabel = vacancy?.department?.displayName
  const modalityLabel = vacancy?.modality?.displayName
  const hasDepartment = hasVacancyFieldValue(departmentLabel)
  const hasModality = hasVacancyFieldValue(modalityLabel)
  const hasLocation = Boolean(vacancy?.countryCode || vacancy?.stateCode)
  const applyClassName = `inline-flex items-center justify-center gap-2 ${publicOpportunitiesTheme.cta}`
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

                <div className="mt-6 lg:hidden">
                  <Link href={applyHref} className={applyClassName}>
                    {t("apply")}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
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

                {companyName ? (
                  <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    {companyLogoSrc ? (
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/35"
                        aria-hidden
                      >
                        <img
                          src={companyLogoSrc}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </span>
                    ) : (
                      <Building2 className="h-4 w-4 text-ats-terracotta" aria-hidden />
                    )}
                    <span>{companyName}</span>
                  </p>
                ) : null}

                <div className="space-y-2.5 text-sm text-muted-foreground">
                  {hasLocation ? (
                    <p className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ats-terracotta" aria-hidden />
                      <VacancyLocationLabel
                        countryCode={vacancy.countryCode}
                        stateCode={vacancy.stateCode}
                        emptyLabel={tPage("fallbackLocation")}
                      />
                    </p>
                  ) : null}
                  {hasDepartment ? (
                    <p className="flex items-start gap-2">
                      <Building className="mt-0.5 h-4 w-4 shrink-0 text-ats-terracotta" aria-hidden />
                      <span>{departmentLabel}</span>
                    </p>
                  ) : null}
                  {hasModality ? (
                    <p className="flex items-start gap-2">
                      <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-ats-cobre" aria-hidden />
                      <span>{modalityLabel}</span>
                    </p>
                  ) : null}
                </div>

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
