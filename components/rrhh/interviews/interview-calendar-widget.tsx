"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ExternalLink, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { getInterviewCalendarEvent } from "@/lib/google-calendar"
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar"
import type { InterviewCalendarEvent } from "@/types/calendar"
import { Toast } from "@/components/common/toast"

export interface InterviewCalendarWidgetProps {
  interviewId: string
  /** ISO UTC; si está vacío no se puede crear evento en calendario. */
  scheduledAtUtc: string
  onSync?: () => void
  compact?: boolean
}

export function InterviewCalendarWidget({
  interviewId,
  scheduledAtUtc,
  onSync,
  compact = false,
}: InterviewCalendarWidgetProps) {
  const t = useTranslations("RecruiterPortal.interviews.calendar")
  const { status } = useGoogleCalendar()
  const [calendarEvent, setCalendarEvent] =
    useState<InterviewCalendarEvent | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [toast, setToast] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const loadCalendarEvent = useCallback(async () => {
    try {
      setIsLoading(true)
      const event = await getInterviewCalendarEvent(interviewId)
      setCalendarEvent(event)
    } catch (error) {
      console.error("[InterviewCalendarWidget] Error loading event:", error)
    } finally {
      setIsLoading(false)
    }
  }, [interviewId])

  useEffect(() => {
    if (interviewId && status.isConnected) {
      void loadCalendarEvent()
    }
  }, [interviewId, status.isConnected, loadCalendarEvent])

  const handleSync = async () => {
    try {
      setIsSyncing(true)
      await loadCalendarEvent()
      setToast({ type: "success", message: t("toastSynced") })
      onSync?.()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("syncFailed")
      setToast({ type: "error", message })
    } finally {
      setIsSyncing(false)
    }
  }

  const cardClass = compact
    ? "font-sans text-sm"
    : "rounded-xl border border-border bg-card p-5 font-sans text-sm shadow-sm"
  const headingClass = compact
    ? "sr-only"
    : "text-base font-semibold text-foreground"
  const compactRow =
    "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
  const stackClass = compact ? compactRow : "mt-3 flex flex-col gap-3"
  const actionClass = compact
    ? "inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple sm:self-center"
    : "inline-flex w-fit items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"

  if (!status.isConnected) {
    return (
      <div className={cardClass}>
        <h3 className={headingClass}>
          {t("title")}
        </h3>
        <p className={compact ? "text-muted-foreground" : "mt-2 text-muted-foreground"}>
          {t("notConnected")}{" "}
          <Link
            href="/portal-rrhh/configuracion/calendario"
            className="font-medium text-vo-purple underline-offset-2 hover:underline"
          >
            {t("settingsLink")}
          </Link>{" "}
          {t("notConnectedSuffix")}
        </p>
      </div>
    )
  }

  if (!scheduledAtUtc?.trim()) {
    return (
      <div className={cardClass}>
        <h3 className={headingClass}>
          {t("title")}
        </h3>
        <p className={compact ? "text-muted-foreground" : "mt-2 text-muted-foreground"}>
          {t("noSchedule")}
        </p>
      </div>
    )
  }

  return (
    <>
      <div className={compact ? cardClass : `${cardClass} border-vo-purple/30`}>
        <h3 className={headingClass}>{t("title")}</h3>

        {isLoading ? (
          <div
            className={
              compact
                ? "flex items-center gap-2 py-1 text-muted-foreground"
                : "flex items-center justify-center gap-2 py-6 text-muted-foreground"
            }
          >
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            {t("loadingEvent")}
          </div>
        ) : calendarEvent?.syncStatus === "synced" &&
          calendarEvent.googleCalendarUrl ? (
          <div className={stackClass}>
            <p
              className={`min-w-0 rounded-md border border-emerald-700 bg-emerald-50 px-3 py-2 text-emerald-700 ${compact ? "flex-1" : ""}`}
            >
              {t("synced")}
            </p>
            <a
              href={calendarEvent.googleCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={actionClass}
            >
              {t("viewInGoogle")}
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          </div>
        ) : calendarEvent?.syncStatus === "pending" ? (
          <p
            className={`rounded-md border border-border bg-muted px-3 py-2 text-foreground ${compact ? "" : "mt-3"}`}
          >
            {t("pending")}
          </p>
        ) : (
          <div className={stackClass}>
            <p
              className={`min-w-0 rounded-md border border-amber-700 bg-amber-50 px-3 py-2 text-amber-700 ${compact ? "flex-1" : ""}`}
            >
              {calendarEvent ? t("notSynced") : t("noEvent")}
            </p>
            <button
              type="button"
              onClick={() => void handleSync()}
              disabled={isSyncing}
              className={`${actionClass} disabled:opacity-50`}
            >
              {isSyncing ? t("updating") : t("retry")}
            </button>
          </div>
        )}
      </div>
      {toast ? (
        <Toast type={toast.type} message={toast.message} duration={4000} />
      ) : null}
    </>
  )
}
