"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle2,
  MapPin,
  Sparkles,
} from "lucide-react"
import { ApplyPrivacyNoticeDialog } from "@/components/public/ApplyPrivacyNoticeDialog"
import { PublicVacancyApplicationForm } from "@/components/public/PublicVacancyApplicationForm"
import { PublicOpportunitiesNavbar } from "@/components/public/PublicOpportunitiesNavbar"
import { ApplicationTipsWidget } from "@/components/public/ApplicationTipsWidget"
import {
  buildOpportunityCompanyLogoDataUri,
  getPublicVacancyDetail,
  type OpportunityVacancyDetail,
} from "@/lib/api/public-vacancies"
import { VacancyLocationLabel } from "@/components/shared/VacancyLocationLabel"
import { publicOpportunitiesTheme } from "@/lib/public-opportunities-theme"

const panelClassName = publicOpportunitiesTheme.panel

function VacancyApplySkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className={`animate-pulse rounded-[32px] p-6 ${panelClassName}`}>
        <div className="h-5 w-24 rounded-full bg-muted/50" />
        <div className="mt-5 h-10 w-full rounded-2xl bg-muted/50" />
        <div className="mt-3 h-4 w-4/5 rounded-xl bg-muted/50" />
      </div>
      <div className={`animate-pulse rounded-[32px] p-6 sm:p-7 ${panelClassName}`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-12 rounded-2xl bg-muted/50" />
          <div className="h-12 rounded-2xl bg-muted/50" />
          <div className="h-12 rounded-2xl bg-muted/50" />
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

  const isPrivacyDialogOpen = Boolean(
    vacancy && !errorMessage && !isLoading && !hasAcceptedPrivacy
  )

  return (
    <div className="relative min-h-screen overflow-hidden bg-ats-warm-white text-foreground">
      <div
        inert={isPrivacyDialogOpen ? true : undefined}
        className="min-h-screen w-full"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className={publicOpportunitiesTheme.heroGradientShort} />
          <div className={publicOpportunitiesTheme.heroGrid} />
          <div className={`absolute left-[-8%] top-6 h-72 w-72 ${publicOpportunitiesTheme.orbTerracotta}`} />
          <div className={`absolute right-[10%] top-16 h-80 w-80 ${publicOpportunitiesTheme.orbCobre}`} />
        </div>

        <PublicOpportunitiesNavbar className="mb-5" />

        <div className="relative flex w-full flex-col px-4 pb-6 pt-5 sm:px-6 sm:pt-5 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-6">
            <Link
              href={backToDetailHref}
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ats-cobre focus:ring-offset-2 focus:ring-offset-background"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {t("backToDetail")}
            </Link>
          </div>

          {errorMessage ? (
            <div className={`rounded-[32px] p-8 text-foreground ${panelClassName}`}>
              <p className="text-sm text-ats-terracotta-soft" role="alert">
                {errorMessage}
              </p>
            </div>
          ) : isLoading || !vacancy ? (
            <VacancyApplySkeleton />
          ) : (
            <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
              <aside className="space-y-6">
                <section className={`rounded-[32px] p-6 text-foreground ${panelClassName}`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-ats-cobre" aria-hidden />
                      {t("applyBadge")}
                    </p>

                    {companyLogoSrc ? (
                      <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-border bg-muted/45"
                        aria-label={companyLogoAlt}
                      >
                        <img
                          src={companyLogoSrc}
                          alt={companyLogoAlt}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : null}
                  </div>

                  <h1 className="mt-5 text-3xl font-semibold tracking-tight text-foreground">
                    {vacancy.title}
                  </h1>

                  <div className="mt-5 space-y-3 text-sm text-muted-foreground">
                    {companyName ? (
                      <div className="flex items-start gap-3">
                        <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-ats-terracotta" aria-hidden />
                        <span>{companyName}</span>
                      </div>
                    ) : null}
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ats-terracotta" aria-hidden />
                      <span>
                        <VacancyLocationLabel
                          countryCode={vacancy.countryCode}
                          stateCode={vacancy.stateCode}
                          emptyLabel={tPage("fallbackLocation")}
                        />
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-ats-cobre" aria-hidden />
                      <span>{vacancy.modality?.displayName ?? tDetail("unspecified")}</span>
                    </div>
                  </div>

                  <div className="mt-6 rounded-[24px] border border-border bg-muted/35 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                      {t("beforeSubmit")}
                    </p>
                    <ul className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-ats-cobre" aria-hidden />
                        {t("checklistCv")}
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-ats-terracotta" aria-hidden />
                        {t("checklistEmail")}
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-ats-terracotta" aria-hidden />
                        {t("checklistData")}
                      </li>
                    </ul>
                  </div>
                </section>
              </aside>

              <section className={`overflow-hidden rounded-[34px] ${panelClassName}`}>
                <div className="border-b border-border px-6 py-6 sm:px-8">
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    {t("formSectionLabel")}
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                    {t("formTitle")}
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                    {t("formBody")}
                  </p>
                </div>

                <div className="px-6 py-6 sm:px-8 sm:py-8">
                  <PublicVacancyApplicationForm
                    vacancyId={vacancyId}
                    theme="light"
                    backToVacancyHref={backToDetailHref}
                  />
                </div>
              </section>
            </div>
          )}
        </div>
        </div>
      </div>

      <ApplyPrivacyNoticeDialog
        isOpen={isPrivacyDialogOpen}
        onAccept={() => setHasAcceptedPrivacy(true)}
        onDecline={() => router.push("/portal-oportunidades")}
      />

      {vacancy && !errorMessage && hasAcceptedPrivacy ? <ApplicationTipsWidget /> : null}
    </div>
  )
}
