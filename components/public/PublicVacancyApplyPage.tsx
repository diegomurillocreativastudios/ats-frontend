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

const darkPanelClassName =
  "border border-white/10 bg-[linear-gradient(180deg,rgba(35,45,76,0.94)_0%,rgba(19,27,50,0.96)_100%)] shadow-[0_24px_80px_rgba(7,12,27,0.42)] backdrop-blur"

function VacancyApplySkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className={`animate-pulse rounded-[32px] p-6 ${darkPanelClassName}`}>
        <div className="h-5 w-24 rounded-full bg-white/10" />
        <div className="mt-5 h-10 w-full rounded-2xl bg-white/10" />
        <div className="mt-3 h-4 w-4/5 rounded-xl bg-white/10" />
      </div>
      <div className="animate-pulse rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(31,42,71,0.9)_0%,rgba(18,25,44,0.94)_100%)] p-6 shadow-[0_30px_80px_rgba(7,12,27,0.34)] sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-12 rounded-2xl bg-white/10" />
          <div className="h-12 rounded-2xl bg-white/10" />
          <div className="h-12 rounded-2xl bg-white/10" />
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
    <div className="relative min-h-screen overflow-hidden bg-[#0b1224] text-white">
      <div
        inert={isPrivacyDialogOpen ? true : undefined}
        className="min-h-screen w-full"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-[420px] bg-[linear-gradient(180deg,#5b2b86_0%,#25365d_38%,#0b1224_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-[46%] bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-size-[42px_42px] mask-[linear-gradient(180deg,transparent,black_18%,black_100%)]" />
          <div className="absolute left-[-8%] top-6 h-72 w-72 rounded-full bg-[#c73277]/26 blur-3xl" />
          <div className="absolute right-[10%] top-16 h-80 w-80 rounded-full bg-[#71bced]/16 blur-3xl" />
        </div>

        <PublicOpportunitiesNavbar className="mb-5" />

        <div className="relative flex w-full flex-col px-4 pb-6 pt-5 sm:px-6 sm:pt-5 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-6">
            <Link
              href={backToDetailHref}
              className="inline-flex items-center gap-2 text-sm font-medium text-white/84 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#1b2342]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {t("backToDetail")}
            </Link>
          </div>

          {errorMessage ? (
            <div className={`rounded-[32px] p-8 text-white ${darkPanelClassName}`}>
              <p className="text-sm text-[#ffd0e7]" role="alert">
                {errorMessage}
              </p>
            </div>
          ) : isLoading || !vacancy ? (
            <VacancyApplySkeleton />
          ) : (
            <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
              <aside className="space-y-6">
                <section className={`rounded-[32px] p-6 text-white ${darkPanelClassName}`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/7 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/72">
                      <Sparkles className="h-3.5 w-3.5 text-[#f5b0ff]" aria-hidden />
                      {t("applyBadge")}
                    </p>

                    {companyLogoSrc ? (
                      <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-white/12 bg-white/8"
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

                  <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white">
                    {vacancy.title}
                  </h1>

                  <div className="mt-5 space-y-3 text-sm text-white/74">
                    {companyName ? (
                      <div className="flex items-start gap-3">
                        <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[#8dd8ff]" aria-hidden />
                        <span>{companyName}</span>
                      </div>
                    ) : null}
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#f6c482]" aria-hidden />
                      <span>
                        <VacancyLocationLabel
                          countryCode={vacancy.countryCode}
                          stateCode={vacancy.stateCode}
                          emptyLabel={tPage("fallbackLocation")}
                        />
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-[#f5b0ff]" aria-hidden />
                      <span>{vacancy.modality?.displayName ?? tDetail("unspecified")}</span>
                    </div>
                  </div>

                  <div className="mt-6 rounded-[24px] border border-white/10 bg-white/6 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/46">
                      {t("beforeSubmit")}
                    </p>
                    <ul className="mt-3 space-y-3 text-sm leading-6 text-white/72">
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#f0a7ff]" aria-hidden />
                        {t("checklistCv")}
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#8dd8ff]" aria-hidden />
                        {t("checklistEmail")}
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#f6c482]" aria-hidden />
                        {t("checklistData")}
                      </li>
                    </ul>
                  </div>
                </section>
              </aside>

              <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(35,45,76,0.94)_0%,rgba(19,27,50,0.96)_100%)] shadow-[0_30px_80px_rgba(7,12,27,0.36)]">
                <div className="border-b border-white/10 px-6 py-6 sm:px-8">
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/56">
                    {t("formSectionLabel")}
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                    {t("formTitle")}
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-white/72">
                    {t("formBody")}
                  </p>
                </div>

                <div className="px-6 py-6 sm:px-8 sm:py-8">
                  <PublicVacancyApplicationForm
                    vacancyId={vacancyId}
                    theme="dark"
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
