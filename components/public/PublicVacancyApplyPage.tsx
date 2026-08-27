"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import {
  ArrowLeft,
  Briefcase,
  Building,
  Building2,
  CheckCircle2,
  MapPin,
} from "lucide-react"
import { ApplyPrivacyNoticeDialog } from "@/components/public/ApplyPrivacyNoticeDialog"
import { PublicVacancyApplicationForm } from "@/components/public/PublicVacancyApplicationForm"
import { PublicOpportunitiesShell } from "@/components/public/PublicOpportunitiesShell"
import { ApplicationTipsWidget } from "@/components/public/ApplicationTipsWidget"
import {
  buildOpportunityCompanyLogoDataUri,
  getPublicVacancyDetail,
  type OpportunityVacancyDetail,
} from "@/lib/api/public-vacancies"
import { VacancyLocationLabel } from "@/components/shared/VacancyLocationLabel"
import { hasVacancyFieldValue } from "@/lib/public-vacancy-content"
import { publicOpportunitiesTheme } from "@/lib/public-opportunities-theme"

const applyIllustrationSrc = "/ilustrations/undraw_contract-signed_vutk.svg"

function VacancyApplySkeleton() {
  return (
    <div className={publicOpportunitiesTheme.applyGrid}>
      <div className="space-y-3">
        <div className="h-5 w-24 rounded-md bg-muted/50" />
        <div className="h-10 w-full rounded-md bg-muted/50" />
        <div className="h-4 w-4/5 rounded-md bg-muted/50" />
        <div className="h-4 w-3/5 rounded-md bg-muted/50" />
      </div>
      <div className="space-y-4">
        <div className="h-8 w-64 rounded-md bg-muted/50" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-11 rounded-lg bg-muted/50" />
          <div className="h-11 rounded-lg bg-muted/50" />
          <div className="h-11 rounded-lg bg-muted/50" />
        </div>
      </div>
    </div>
  )
}

export function PublicVacancyApplyPage({ vacancyId }: { vacancyId: string }) {
  const t = useTranslations("PublicOpportunities.apply")
  const tPage = useTranslations("PublicOpportunities.page")
  const tDetail = useTranslations("PublicOpportunities.detail")
  const router = useRouter()
  const searchParams = useSearchParams()
  const [vacancy, setVacancy] = useState<OpportunityVacancyDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [hasAcceptedPrivacy, setHasAcceptedPrivacy] = useState(false)

  const queryString = searchParams.toString()
  const backToDetailHref = queryString
    ? `/portal-oportunidades/${vacancyId}?${queryString}`
    : `/portal-oportunidades/${vacancyId}`

  useEffect(() => {
    let isCancelled = false

    async function loadVacancy() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const nextVacancy = await getPublicVacancyDetail(vacancyId)
        if (isCancelled) return

        if (!nextVacancy) {
          setVacancy(null)
          setErrorMessage(t("vacancyNotFound"))
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
  }, [t, vacancyId])

  useEffect(() => {
    if (!vacancy?.title) return
    document.title = t("documentTitle", { title: vacancy.title })
  }, [t, vacancy?.title])

  const companyName = vacancy?.company.name?.trim() ?? ""
  const companyLogoSrc = buildOpportunityCompanyLogoDataUri(vacancy?.company.logo ?? null)
  const companyLogoAlt = companyName
    ? tPage("companyLogoAlt", { company: companyName })
    : tPage("companyLogoGeneric")
  const departmentLabel = vacancy?.department?.displayName
  const hasDepartment = hasVacancyFieldValue(departmentLabel)

  const isPrivacyDialogOpen = Boolean(
    vacancy && !errorMessage && !isLoading && !hasAcceptedPrivacy
  )

  return (
    <PublicOpportunitiesShell
      isChromeInert={isPrivacyDialogOpen}
      background={
        <>
          <div className={publicOpportunitiesTheme.heroGradientShort} />
          <div
            className={`absolute right-[6%] top-12 h-56 w-56 ${publicOpportunitiesTheme.orbCobre}`}
          />
        </>
      }
      overlays={
        <ApplyPrivacyNoticeDialog
          isOpen={isPrivacyDialogOpen}
          onAccept={() => setHasAcceptedPrivacy(true)}
          onDecline={() => router.push("/portal-oportunidades")}
        />
      }
    >
      <div className="relative flex w-full flex-col px-4 pb-12 pt-8 sm:px-6 lg:px-8">
        <div className={publicOpportunitiesTheme.shellDirectory}>
          <div className="mb-8">
            <Link
              href={backToDetailHref}
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ats-cobre focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {t("backToDetail")}
            </Link>
          </div>

          {errorMessage ? (
            <p className="text-sm text-ats-terracotta-soft" role="alert">
              {errorMessage}
            </p>
          ) : isLoading || !vacancy ? (
            <VacancyApplySkeleton />
          ) : (
            <div className={publicOpportunitiesTheme.applyGrid}>
              <aside
                className={publicOpportunitiesTheme.directoryRail}
                aria-labelledby="apply-rail-heading"
              >
                <div
                  className={publicOpportunitiesTheme.applyIllustrationFrame}
                  aria-hidden
                >
                  <img
                    src={applyIllustrationSrc}
                    alt=""
                    className={publicOpportunitiesTheme.applyIllustrationImage}
                  />
                </div>
                <p
                  id="apply-rail-heading"
                  className="text-sm font-medium text-muted-foreground"
                >
                  {t("applyBadge")}
                </p>

                <div className="space-y-2.5 text-sm text-muted-foreground">
                  {companyName ? (
                    <p className="flex items-start gap-2">
                      {companyLogoSrc ? (
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/35"
                          aria-label={companyLogoAlt}
                        >
                          <img
                            src={companyLogoSrc}
                            alt={companyLogoAlt}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        </span>
                      ) : (
                        <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-ats-terracotta" aria-hidden />
                      )}
                      <span>{companyName}</span>
                    </p>
                  ) : null}
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ats-terracotta" aria-hidden />
                    <span>
                      <VacancyLocationLabel
                        countryCode={vacancy.countryCode}
                        stateCode={vacancy.stateCode}
                        emptyLabel={tPage("fallbackLocation")}
                      />
                    </span>
                  </p>
                  {hasDepartment ? (
                    <p className="flex items-start gap-2">
                      <Building className="mt-0.5 h-4 w-4 shrink-0 text-ats-terracotta" aria-hidden />
                      <span>{departmentLabel}</span>
                    </p>
                  ) : null}
                  <p className="flex items-start gap-2">
                    <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-ats-cobre" aria-hidden />
                    <span>{vacancy.modality?.displayName ?? tDetail("unspecified")}</span>
                  </p>
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-sm font-medium text-foreground">
                    {t("beforeSubmit")}
                  </p>
                  <ul className="mt-3 space-y-2.5 text-sm leading-6 text-muted-foreground">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ats-cobre" aria-hidden />
                      {t("checklistCv")}
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ats-terracotta" aria-hidden />
                      {t("checklistEmail")}
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ats-terracotta" aria-hidden />
                      {t("checklistData")}
                    </li>
                  </ul>
                </div>

                <ApplicationTipsWidget variant="inline" />
              </aside>

              <section aria-labelledby="apply-vacancy-title">
                <h1
                  id="apply-vacancy-title"
                  className={publicOpportunitiesTheme.articleTitle}
                >
                  {vacancy.title}
                </h1>
                <p className="mt-6 text-sm font-medium text-muted-foreground">
                  {t("formSectionLabel")}
                </p>

                <div className="mt-6">
                  <PublicVacancyApplicationForm
                    vacancyId={vacancyId}
                    theme="light"
                  />
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </PublicOpportunitiesShell>
  )
}
