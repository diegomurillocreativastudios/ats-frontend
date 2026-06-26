"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import type { LucideIcon } from "lucide-react"
import {
  Calendar,
  CalendarClock,
  ExternalLink,
  History,
  Loader2,
  UserRound,
} from "lucide-react"
import CandidateSidebar from "@/components/candidato/CandidateSidebar"
import CandidateTopbar from "@/components/candidato/CandidateTopbar"
import { InterviewStatusBadge } from "@/components/rrhh/interviews/interview-status-badge"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import { useCandidateSelfInterviews } from "@/hooks/useCandidateSelfInterviews"
import type { Interview } from "@/lib/api/interviews"
import { formatInterviewLocalDateTime } from "@/lib/interview-datetime"

function partitionByUpcoming(list: Interview[]) {
  const now = Date.now()
  const upcoming: Interview[] = []
  const history: Interview[] = []
  for (const row of list) {
    const t = new Date(row.scheduledAtUtc).getTime()
    const isFutureOrNow =
      !Number.isNaN(t) && t >= now && row.status === "Scheduled"
    if (isFutureOrNow) upcoming.push(row)
    else history.push(row)
  }
  upcoming.sort(
    (a, b) =>
      new Date(a.scheduledAtUtc).getTime() -
      new Date(b.scheduledAtUtc).getTime()
  )
  history.sort(
    (a, b) =>
      new Date(b.scheduledAtUtc).getTime() -
      new Date(a.scheduledAtUtc).getTime()
  )
  return { upcoming, history }
}

type InterviewsTranslator = ReturnType<typeof useTranslations<"CandidatePortal.interviews">>

function vacancyLabel(row: Interview, t: InterviewsTranslator) {
  const title = row.jobTitle?.trim()
  if (title) return title
  if (row.vacancyId) return t("vacancyShort", { id: row.vacancyId.slice(0, 8) })
  return t("defaultVacancyLabel")
}

function formatDuration(minutes: number | null, t: InterviewsTranslator) {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0)
    return null
  if (minutes < 60) return t("durationMinutes", { minutes })
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0
    ? t("durationHoursMinutes", { hours: h, minutes: m })
    : t("durationHours", { hours: h })
}

function InterviewCandidateCard({ row }: { row: Interview }) {
  const t = useTranslations("CandidatePortal.interviews")
  const typeLine =
    row.interviewTypeLabel?.trim() ||
    row.interviewType?.trim() ||
    t("defaultType")
  const durationLine = formatDuration(row.durationMinutes, t)

  return (
    <article
      className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-5"
      aria-label={t("cardAria", { label: vacancyLabel(row, t) })}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-sans text-base font-semibold text-foreground md:text-lg">
              {vacancyLabel(row, t)}
            </h2>
            <InterviewStatusBadge
              status={row.status}
              label={row.statusDisplayName}
            />
          </div>
          <div className="flex flex-col gap-1.5 font-sans text-sm text-muted-foreground">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <CalendarClock
                className="h-4 w-4 shrink-0 text-vo-purple"
                aria-hidden
              />
              <span className="text-foreground">
                {formatInterviewLocalDateTime(row.scheduledAtUtc)}
              </span>
              {durationLine ? (
                <span className="text-muted-foreground">· {durationLine}</span>
              ) : null}
            </p>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Calendar className="h-4 w-4 shrink-0" aria-hidden />
              <span>{typeLine}</span>
            </p>
            {row.interviewerName?.trim() ? (
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <UserRound className="h-4 w-4 shrink-0" aria-hidden />
                <span>
                  {t("contactPrefix")}{" "}
                  <span className="font-medium text-foreground">
                    {row.interviewerName.trim()}
                  </span>
                </span>
              </p>
            ) : null}
            {row.googleMeetUrl?.trim() ? (
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
                <a
                  href={row.googleMeetUrl.trim()}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-medium text-vo-purple hover:underline"
                >
                  {t("joinGoogleMeet")}
                </a>
              </p>
            ) : null}
          </div>
        </div>
      </div>
      {row.descripcion?.trim() ? (
        <div className="mt-4 rounded-lg border border-border/80 bg-muted/40 px-3 py-2.5">
          <p className="font-sans text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("descriptionLabel")}
          </p>
          <p className="mt-1 whitespace-pre-wrap font-sans text-sm text-foreground">
            {row.descripcion.trim()}
          </p>
        </div>
      ) : null}
      {row.notes?.trim() ? (
        <div className="mt-4 rounded-lg border border-border/80 bg-muted/40 px-3 py-2.5">
          <p className="font-sans text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("instructionsLabel")}
          </p>
          <p className="mt-1 whitespace-pre-wrap font-sans text-sm text-foreground">
            {row.notes.trim()}
          </p>
        </div>
      ) : null}
    </article>
  )
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="mb-4 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-vo-purple" aria-hidden />
        <h2 className="font-sans text-lg font-semibold text-foreground">
          {title}
        </h2>
      </div>
      <p className="font-sans text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

export default function CandidateInterviewsContent() {
  const t = useTranslations("CandidatePortal.interviews")
  const { items, loading, error } = useCandidateSelfInterviews()
  const { upcoming, history } = useMemo(
    () => partitionByUpcoming(items),
    [items]
  )

  const mainSections = (
    <>
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 font-sans text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16"
          aria-busy="true"
        >
          <Loader2
            className="h-8 w-8 animate-spin text-vo-purple"
            aria-hidden
          />
          <p className="font-sans text-sm text-muted-foreground">
            {t("loading")}
          </p>
        </div>
      ) : !error && items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground" aria-hidden />
          <p className="max-w-md font-sans text-sm text-muted-foreground">
            {t("empty")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          <section aria-label={t("upcomingAria")}>
            <SectionTitle
              icon={CalendarClock}
              title={t("upcomingTitle")}
              description={t("upcomingDescription")}
            />
            {upcoming.length === 0 ? (
              <p className="rounded-lg border border-border bg-muted/30 px-4 py-6 text-center font-sans text-sm text-muted-foreground">
                {t("upcomingEmpty")}
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {upcoming.map((row) => (
                  <li key={row.id}>
                    <InterviewCandidateCard row={row} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label={t("historyAria")}>
            <SectionTitle
              icon={History}
              title={t("historyTitle")}
              description={t("historyDescription")}
            />
            {history.length === 0 ? (
              <p className="rounded-lg border border-border bg-muted/30 px-4 py-6 text-center font-sans text-sm text-muted-foreground">
                {t("historyEmpty")}
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {history.map((row) => (
                  <li key={row.id}>
                    <InterviewCandidateCard row={row} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  )

  return (
    <div className="h-screen overflow-hidden bg-background font-sans text-foreground">
      <div className="hidden h-full lg:flex">
        <CandidateSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <CandidateTopbar variant="desktop" breadcrumbLabel={t("breadcrumb")} />
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            <div className="min-w-0 flex flex-col gap-8 p-8">
              <PortalPageHeader
                title={t("headerTitle")}
                description={t("headerDescription")}
                className="pb-0"
              />
              {mainSections}
            </div>
          </main>
        </div>
      </div>

      <div className="flex h-full min-w-0 flex-col overflow-hidden lg:hidden">
        <CandidateTopbar variant="tablet" breadcrumbLabel={t("breadcrumb")} />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="min-w-0 flex flex-col gap-5 p-4 md:gap-6 md:p-6">
            <PortalPageHeader
              title={t("headerTitle")}
              description={t("headerDescriptionShort")}
              className="pb-0"
              descriptionClassName="text-sm leading-6 md:text-base"
            />
            {mainSections}
          </div>
        </main>
      </div>
    </div>
  )
}
