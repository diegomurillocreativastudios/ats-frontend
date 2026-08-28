"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { Briefcase, Calendar, Loader2, MapPin, Users } from "lucide-react"
import RRHHSidebar from "@/components/rrhh/RRHHSidebar"
import RRHHTopbar from "@/components/rrhh/RRHHTopbar"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import { ListPaginationBar } from "@/components/ui/list-pagination-bar"
import { QUERY_PAGE_SIZE_DEFAULT } from "@/lib/api/query-paging"
import { listRecruiterVacanciesPage } from "@/lib/api/recruiter-vacancies"
import { getApiErrorMessage } from "@/lib/api-error"
import { getVacancyStatusLabel } from "@/lib/vacancies/vacancy-status-labels"
import { VACANCY_STATUS_STYLES } from "@/lib/vacancies/vacancy-status-styles"
import { formatCountryCodeLabel } from "@/lib/profile-form-options"

interface VacancyRow {
  id: string
  title: string
  countryLabel: string
  statusKey: keyof typeof STATUS_LABELS
  candidatesAmount: number
  createdAtLabel: string | null
}

const mapStatusKey = (item: Record<string, unknown>) => {
  const raw = String(item?.status ?? item?.state ?? "open").toLowerCase().trim()
  if (
    raw === "open" ||
    raw === "active" ||
    raw === "activa" ||
    raw.includes("abierta")
  ) {
    return "activa" as const
  }
  if (raw === "closed" || raw === "cerrada" || raw.includes("cerrad")) {
    return "cerrada" as const
  }
  if (raw === "draft" || raw === "borrador") {
    return "borrador" as const
  }
  if (raw === "paused" || raw === "pausada" || raw.includes("paus")) {
    return "pausada" as const
  }
  return "activa" as const
}

const formatCreatedAtLabel = (iso: unknown): string | null => {
  if (iso == null || typeof iso !== "string") return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(d)
}

const STATUS_LABELS = {
  activa: {
    label: "Activa",
    bgClass: VACANCY_STATUS_STYLES.activa.bgClass,
    textClass: VACANCY_STATUS_STYLES.activa.textClass,
  },
  cerrada: {
    label: "Cerrada",
    bgClass: VACANCY_STATUS_STYLES.cerrada.bgClass,
    textClass: VACANCY_STATUS_STYLES.cerrada.textClass,
  },
  pausada: {
    label: "Pausada",
    bgClass: VACANCY_STATUS_STYLES.pausada.bgClass,
    textClass: VACANCY_STATUS_STYLES.pausada.textClass,
  },
  borrador: {
    label: "Borrador",
    bgClass: VACANCY_STATUS_STYLES.borrador.bgClass,
    textClass: VACANCY_STATUS_STYLES.borrador.textClass,
  },
}

export default function EntrevistasHubPage() {
  const t = useTranslations("RecruiterPortal.interviews")
  const tVacancy = useTranslations("RecruiterPortal.vacancies")
  const [vacancies, setVacancies] = useState<VacancyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(QUERY_PAGE_SIZE_DEFAULT)
  const [totalCount, setTotalCount] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listRecruiterVacanciesPage({ page, pageSize })
      const mapped: VacancyRow[] = result.items.map((item: unknown, i: number) => {
        const record =
          item != null && typeof item === "object"
            ? (item as Record<string, unknown>)
            : {}
        const id = String(record.id ?? record.uuid ?? i)
        const title = String(record.title ?? record.name ?? "—")
        const ccRaw = record.countryCode ?? record.country_code
        const countryCode =
          ccRaw != null && String(ccRaw).trim() !== ""
            ? String(ccRaw).trim().toUpperCase()
            : null
        const candidatesRaw =
          record.candidatesAmount ??
          record.candidates ??
          record.candidates_count ??
          record.applicants_count
        const candidatesAmount =
          typeof candidatesRaw === "number" && !Number.isNaN(candidatesRaw)
            ? candidatesRaw
            : Number.parseInt(String(candidatesRaw ?? "0"), 10) || 0
        return {
          id,
          title,
          countryLabel: formatCountryCodeLabel(countryCode),
          statusKey: mapStatusKey(record),
          candidatesAmount,
          createdAtLabel: formatCreatedAtLabel(
            record.createdAt ?? record.created_at
          ),
        }
      })
      setVacancies(mapped)
      setTotalCount(result.totalCount)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err) || t("errors.loadVacanciesFailed"))
      setVacancies([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [t, page, pageSize])

  useEffect(() => {
    load()
  }, [load])

  const handlePageChange = (nextPage: number) => setPage(nextPage)

  const handlePageSizeChange = (nextSize: number) => {
    setPageSize(nextSize)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize) || 1)
  const paginationLabels = {
    perPage: t("pagination.perPage"),
    pageSizeAria: t("pagination.pageSizeAria"),
    regionAria: t("pagination.regionAria"),
    summary: t("pagination.summary", { page, total: totalPages }),
    prev: t("pagination.prev"),
    next: t("pagination.next"),
    count: t("pagination.count", { count: totalCount }),
  }

  const renderPageHeader = () => (
    <PortalPageHeader
      className="shrink-0 pb-2"
      title={t("hub.title")}
      description={t("hub.description")}
    />
  )

  const renderMainContent = () => (
    <section
      className="flex min-h-0 flex-1 flex-col gap-3"
      aria-label={t("hub.vacanciesRegionLabel")}
    >
      {loading ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16">
          <Loader2
            className="h-8 w-8 animate-spin text-vo-purple"
            aria-hidden
          />
          <p className="font-sans text-sm text-muted-foreground">
            {t("loadingStates.loadingVacancies")}
          </p>
        </div>
      ) : error ? (
        <p className="font-sans text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : vacancies.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground" aria-hidden />
          <p className="font-sans text-sm text-muted-foreground">
            {t("emptyStates.noVacancies")}
          </p>
          <Link
            href="/portal-rrhh/vacantes"
            className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white hover:bg-vo-purple-hover"
          >
            {t("actions.goToVacancies")}
          </Link>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
          <ul className="flex flex-col gap-3" role="list">
            {vacancies.map((v) => {
              const statusCfg =
                STATUS_LABELS[v.statusKey] ?? STATUS_LABELS.activa
              return (
                <li key={v.id}>
                  <article className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-vo-purple/10"
                        aria-hidden
                      >
                        <Briefcase className="h-5 w-5 text-vo-purple" />
                      </div>
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2 gap-y-1">
                          <h2 className="font-sans text-base font-semibold text-foreground">
                            {v.title}
                          </h2>
                          <span
                            className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 font-sans text-xs font-medium ${statusCfg.bgClass} ${statusCfg.textClass}`}
                          >
                            {getVacancyStatusLabel(v.statusKey, tVacancy)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 font-sans text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin
                              className="h-3.5 w-3.5 shrink-0 opacity-80"
                              aria-hidden
                            />
                            {v.countryLabel}
                          </span>
                          <span className="hidden sm:inline" aria-hidden>
                            ·
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Users
                              className="h-3.5 w-3.5 shrink-0 opacity-80"
                              aria-hidden
                            />
                            {t("cards.candidatesCount", {
                              count: v.candidatesAmount,
                            })}
                          </span>
                          {v.createdAtLabel ? (
                            <>
                              <span className="hidden sm:inline" aria-hidden>
                                ·
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <Calendar
                                  className="h-3.5 w-3.5 shrink-0 opacity-80"
                                  aria-hidden
                                />
                                {v.createdAtLabel}
                              </span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <Link
                      href={`/portal-rrhh/entrevistas/${encodeURIComponent(v.id)}`}
                      className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 sm:w-auto"
                      aria-label={t("cards.viewInterviewsAria", {
                        title: v.title,
                      })}
                    >
                      <Calendar className="h-4 w-4 shrink-0" aria-hidden />
                      {t("cards.viewInterviews")}
                    </Link>
                  </article>
                </li>
              )
            })}
          </ul>
        </div>
      )}
      {!loading && !error ? (
        <div className="shrink-0">
          <ListPaginationBar
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            loading={loading}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            labels={paginationLabels}
          />
        </div>
      ) : null}
    </section>
  )

  return (
    <div className="h-screen overflow-hidden bg-background font-sans text-foreground">
      <div className="hidden h-full lg:flex">
        <RRHHSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <RRHHTopbar variant="desktop" breadcrumbLabel={t("breadcrumb")} />
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <section
                className="shrink-0 px-8 pt-6"
                aria-label={t("hub.headerRegionLabel")}
              >
                {renderPageHeader()}
              </section>
              <section className="flex min-h-0 flex-1 flex-col px-8 pb-4 pt-2">
                {renderMainContent()}
              </section>
            </div>
          </main>
        </div>
      </div>
      <div className="flex h-full min-w-0 flex-col overflow-hidden lg:hidden">
        <RRHHTopbar variant="tablet" breadcrumbLabel={t("breadcrumb")} />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-4 md:p-6">
            {renderPageHeader()}
            {renderMainContent()}
          </div>
        </main>
      </div>
    </div>
  )
}
