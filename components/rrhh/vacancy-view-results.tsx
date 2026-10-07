"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { Briefcase } from "lucide-react"
import { VacancyListCard } from "@/components/rrhh/VacancyListCard"
import type { VacancyListItem } from "@/lib/vacancies/map-vacancy-list-item"
import type {
  VacancyListView,
  VacancyProgressViewRow,
} from "@/lib/rrhh/vacancy-list-views"

export function VacancyViewBanner({
  view,
  partial,
}: {
  view: VacancyListView
  partial: { analyzed: number; total: number } | null
}) {
  const t = useTranslations("RecruiterPortal.vacancies.views")
  const tPartial = useTranslations("RecruiterPortal.dashboard.vacancies")
  const partialKey = view === "activas" || view === "no-publicadas" ? "partialList" : "partialProgress"

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-sans text-sm text-foreground">{t(view)}</p>
        <Link
          href="/portal-rrhh/vacantes"
          className="inline-flex min-h-11 items-center font-sans text-sm font-medium text-foreground underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
        >
          {t("backToList")}
        </Link>
      </div>
      {partial ? (
        <p className="font-sans text-xs text-muted-foreground">
          {tPartial(partialKey, partial)}
        </p>
      ) : null}
    </div>
  )
}

export function VacancyViewList({
  view,
  listItems,
  progressRows,
  onRefresh,
  onSnackbar,
}: {
  view: VacancyListView
  listItems: VacancyListItem[]
  progressRows: VacancyProgressViewRow[]
  onRefresh: () => void
  onSnackbar: (message: string, variant?: "success" | "error") => void
}) {
  const t = useTranslations("RecruiterPortal.vacancies.views")
  const tProgress = useTranslations("RecruiterPortal.dashboard.vacancies")

  if (view === "activas" || view === "no-publicadas") {
    return (
      <ul className="flex flex-col gap-3" role="list">
        {listItems.map((vacancy) => (
          <li key={vacancy.id}>
            <VacancyListCard
              vacancy={vacancy}
              onRefresh={onRefresh}
              onSnackbar={onSnackbar}
            />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <ol className="flex flex-col gap-3">
      {progressRows.map((row) => {
        const title = row.title.trim() !== "" ? row.title : t("untitled")
        return (
          <li key={row.vacancyId}>
            <article className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="font-sans text-sm font-semibold text-foreground">{title}</h2>
                <p className="mt-1 font-sans text-sm text-muted-foreground">
                  {[
                    row.clientName,
                    row.daysOpen != null ? tProgress("daysOpen", { days: row.daysOpen }) : null,
                    tProgress("candidateCount", { count: row.candidateCount }),
                  ]
                    .filter((part) => part != null && part !== "")
                    .join(" · ")}
                </p>
              </div>
              <Link
                href={row.href}
                aria-label={tProgress("openVacancyAria", { title })}
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-border bg-card px-4 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
              >
                {tProgress("openVacancy")}
              </Link>
            </article>
          </li>
        )
      })}
    </ol>
  )
}

export function VacancyViewEmpty() {
  const t = useTranslations("RecruiterPortal.vacancies.views")
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
      <Briefcase className="h-12 w-12 text-muted-foreground" aria-hidden />
      <p className="font-sans text-sm text-muted-foreground">{t("empty")}</p>
      <Link
        href="/portal-rrhh/vacantes"
        className="inline-flex min-h-11 items-center rounded-md bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover"
      >
        {t("backToList")}
      </Link>
    </div>
  )
}
