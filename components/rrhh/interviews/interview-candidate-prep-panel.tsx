"use client"

import { useEffect, useMemo } from "react"
import Link from "next/link"
import { X, Loader2, Calendar, FileText, User } from "lucide-react"
import { useTranslations } from "next-intl"
import type { Interview } from "@/lib/api/interviews"
import { useVacancyInterviewPrep } from "@/hooks/use-vacancy-interview-prep"
import { mergeApplicantsWithInterviews } from "@/lib/recruiter/vacancy-applicant-interview-prep"

export type InterviewCandidatePrepPanelVariant = "drawer" | "embedded"

export interface InterviewCandidatePrepPanelProps {
  variant: InterviewCandidatePrepPanelVariant
  active: boolean
  vacancyId: string
  vacancyTitleFallback: string | null
  interviews: Interview[]
  onScheduleInterview: (candidateProfileId: string) => void
  onOpenTechnicalSheet: (
    candidateProfileId: string,
    displayName: string
  ) => void
  onClose?: () => void
}

function dash(value: string | null | undefined): string {
  if (value == null) return "—"
  const t = String(value).trim()
  return t === "" ? "—" : t
}

export function InterviewCandidatePrepPanel({
  variant,
  active,
  vacancyId,
  vacancyTitleFallback,
  interviews,
  onScheduleInterview,
  onOpenTechnicalSheet,
  onClose,
}: InterviewCandidatePrepPanelProps) {
  const t = useTranslations("RecruiterPortal.interviews.prepPanel")
  const { data, loading, error, load, reset } = useVacancyInterviewPrep(vacancyId)

  useEffect(() => {
    if (!active) {
      reset()
      return
    }
    load().catch(() => {})
  }, [active, load, reset])

  useEffect(() => {
    if (variant !== "drawer" || !active) return
    if (!onClose) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [variant, active, onClose])

  const rows = useMemo(() => {
    if (!data?.applicants?.length) return []
    return mergeApplicantsWithInterviews(data.applicants, interviews)
  }, [data, interviews])

  const headerTitle =
    data?.vacancyTitle?.trim() ||
    vacancyTitleFallback?.trim() ||
    t("vacancyFallback")

  const isDrawer = variant === "drawer"
  const isEmbedded = variant === "embedded"
  const shellClass = isDrawer
    ? "flex h-full w-full max-w-lg flex-col border-l border-border bg-background shadow-xl"
    : "flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"

  const headerPadding = isDrawer ? "px-5 py-4" : "px-4 py-5 sm:px-6"
  const bodyPadding = isDrawer ? "px-5 py-4" : "px-4 pb-6 pt-2 sm:px-6"

  const listClassName = isEmbedded
    ? "grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
    : "flex flex-col gap-3"

  return (
    <div className={shellClass}>
      <div
        className={`flex shrink-0 items-start justify-between gap-3 border-b border-border ${headerPadding}`}
      >
        <div className="min-w-0">
          <h2
            id="interview-prep-panel-title"
            className={`font-sans font-semibold text-foreground ${
              isDrawer ? "text-lg" : "text-xl"
            }`}
          >
            {isEmbedded ? t("titleEmbedded") : t("titleDrawer")}
          </h2>
          <p className="mt-1 font-sans text-sm text-muted-foreground">
            {isEmbedded
              ? t("embeddedDescription", { title: headerTitle })
              : headerTitle}
          </p>
        </div>
        {isDrawer && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
            aria-label={t("closeAria")}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        ) : null}
      </div>

      <div
        className={`min-h-0 flex-1 ${
          isEmbedded ? "overflow-visible" : "overflow-y-auto"
        } ${bodyPadding}`}
      >
        {loading ? (
          <div
            className="flex flex-col items-center justify-center gap-3 py-12"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-7 w-7 animate-spin text-vo-purple" aria-hidden />
            <p className="font-sans text-sm text-muted-foreground">{t("loading")}</p>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3" role="alert">
            <p className="font-sans text-sm text-destructive">{error}</p>
            <button
              type="button"
              onClick={() => {
                load().catch(() => {})
              }}
              className="mt-3 inline-flex items-center rounded-md bg-vo-purple px-3 py-2 font-sans text-sm font-medium text-white hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple"
            >
              {t("retry")}
            </button>
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center font-sans text-sm text-muted-foreground">
            {t("empty")}
          </p>
        ) : (
          <ul className={listClassName} aria-label={t("listAria")}>
            {rows.map((row) => (
              <li
                key={row.candidateProfileId}
                className="rounded-lg border border-border bg-background p-3 shadow-sm"
              >
                <p className="font-sans text-sm font-semibold text-foreground">
                  {row.displayName}
                </p>
                <dl className="mt-2 space-y-1.5 font-sans text-xs sm:text-sm">
                  <div>
                    <dt className="text-muted-foreground">{t("currentStage")}</dt>
                    <dd className="text-foreground">{dash(row.stageLabel)}</dd>
                  </div>
                  {row.applicationStatusLabel ? (
                    <div>
                      <dt className="text-muted-foreground">{t("applicationStatus")}</dt>
                      <dd className="text-foreground">{row.applicationStatusLabel}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-muted-foreground">{t("interview")}</dt>
                    <dd className="text-foreground">{dash(row.interviewSummaryLabel)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("strengths")}</dt>
                    <dd className="whitespace-pre-wrap text-foreground">{dash(row.strengths)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("considerations")}</dt>
                    <dd className="whitespace-pre-wrap text-foreground">{dash(row.considerations)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("comments")}</dt>
                    <dd className="whitespace-pre-wrap text-foreground">{dash(row.relevantComments)}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                  <button
                    type="button"
                    onClick={() => onScheduleInterview(row.candidateProfileId)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-vo-purple bg-vo-purple px-2.5 py-1.5 font-sans text-xs font-medium text-white hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                  >
                    <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {t("scheduleInterview")}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onOpenTechnicalSheet(row.candidateProfileId, row.displayName)
                    }
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 font-sans text-xs font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {t("technicalSheet")}
                  </button>
                  <Link
                    href={`/portal-rrhh/candidatos/${encodeURIComponent(row.candidateProfileId)}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 font-sans text-xs font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                  >
                    <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {t("viewProfile")}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
