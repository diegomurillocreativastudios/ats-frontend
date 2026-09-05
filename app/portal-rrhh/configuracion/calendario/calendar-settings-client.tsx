"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { CalendarDays, Check, Loader2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar"
import { GoogleCalendarConnect } from "@/components/rrhh/interviews/google-calendar-connect"
import { GoogleCalendarDisconnect } from "@/components/rrhh/interviews/google-calendar-disconnect"
import Snackbar from "@/components/ui/Snackbar"
import { LoadingSpinner } from "@/components/common/loading-spinner"
import PortalPageHeader from "@/components/ui/PortalPageHeader"

function formatConnectedAt(value: string | null, locale: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(date)
}

function CalendarStatusBadge({ isConnected }: { isConnected: boolean }) {
  const tPage = useTranslations("RecruiterPortal.settings.calendarPage")

  return (
    <span
      className={
        isConnected
          ? "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-sans text-xs font-medium text-emerald-800"
          : "inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 font-sans text-xs font-medium text-muted-foreground"
      }
    >
      {isConnected ? tPage("statusConnected") : tPage("notConnected")}
    </span>
  )
}

function CalendarBenefits() {
  const tPage = useTranslations("RecruiterPortal.settings.calendarPage")
  const benefits = [
    tPage("benefitEvents"),
    tPage("benefitInvites"),
    tPage("benefitVideo"),
  ]

  return (
    <div>
      <h3 className="font-sans text-sm font-semibold text-foreground">
        {tPage("benefitsTitle")}
      </h3>
      <ul className="mt-3 grid gap-2.5 sm:grid-cols-3 sm:gap-4">
        {benefits.map((text) => (
          <li key={text} className="flex items-start gap-2.5">
            <span
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-vo-purple/10"
              aria-hidden
            >
              <Check className="h-3 w-3 text-vo-purple" />
            </span>
            <span className="font-sans text-sm text-foreground">{text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function CalendarSettingsClient() {
  const t = useTranslations("RecruiterPortal.settings")
  const tPage = useTranslations("RecruiterPortal.settings.calendarPage")
  const locale = useLocale()
  const searchParams = useSearchParams()
  const { status, isLoading, error, refresh, sync, isSyncing } =
    useGoogleCalendar()
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    variant: "success" | "error" | "info"
    message: string
  }>({ open: false, variant: "success", message: "" })

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }))
  }

  const successParam = searchParams.get("success")
  const errorParam = searchParams.get("error")

  useEffect(() => {
    if (successParam === "true") {
      setSnackbar({
        open: true,
        variant: "success",
        message: tPage("connectedToast"),
      })
      return
    }
    if (errorParam) {
      setSnackbar({
        open: true,
        variant: "error",
        message: decodeURIComponent(errorParam),
      })
    }
  }, [successParam, errorParam, tPage])

  const handleManualSync = async () => {
    const result = await sync()
    if (!result) {
      setSnackbar({
        open: true,
        variant: "error",
        message: error ?? tPage("syncFailed"),
      })
      return
    }
    const msg =
      result.failedCount > 0
        ? tPage("syncResultPartial", {
            synced: result.syncedCount,
            failed: result.failedCount,
          })
        : tPage("syncResultSuccess", { synced: result.syncedCount })
    setSnackbar({
      open: true,
      variant: result.failedCount > 0 ? "error" : "success",
      message: msg,
    })
  }

  const connectedEmail = status.email || tPage("accountFallback")
  const connectedSince = formatConnectedAt(status.connectedAt, locale)

  return (
    <div className="w-full px-4 py-6 md:px-8">
      <PortalPageHeader
        title={tPage("title")}
        description={tPage("pageDescription")}
        className="mb-8"
      />

      <section
        aria-labelledby="google-calendar-heading"
        className="w-full rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-vo-purple/10"
            aria-hidden
          >
            <CalendarDays className="h-5 w-5 text-vo-purple" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="google-calendar-heading"
                className="font-sans text-lg font-semibold text-foreground"
              >
                {t("googleCalendar.title")}
              </h2>
              {!isLoading ? (
                <CalendarStatusBadge isConnected={status.isConnected} />
              ) : null}
            </div>
            {!isLoading ? (
              <p className="mt-1 font-sans text-sm text-muted-foreground">
                {status.isConnected
                  ? tPage("connectedHint")
                  : tPage("connectDescription")}
              </p>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <LoadingSpinner />
          </div>
        ) : status.isConnected ? (
          <div className="mt-6 flex flex-col gap-5">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="font-sans text-xs font-medium uppercase tracking-wide text-emerald-800">
                {tPage("accountLabel")}
              </p>
              <p
                className="mt-1 font-sans text-sm font-semibold break-all text-foreground"
                aria-label={tPage("connectedAs", { email: connectedEmail })}
              >
                {connectedEmail}
              </p>
              {connectedSince ? (
                <p className="mt-1 font-sans text-xs text-emerald-800/80">
                  {tPage("connectedSince", { date: connectedSince })}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => void handleManualSync()}
                disabled={isSyncing}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-vo-purple px-4 py-2.5 font-sans text-sm font-medium text-white hover:bg-vo-purple-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:opacity-50 sm:w-auto"
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                {isSyncing ? tPage("syncing") : tPage("syncInterviews")}
              </button>
              <GoogleCalendarDisconnect onDisconnected={() => void refresh()} />
            </div>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-6">
            <CalendarBenefits />
            <GoogleCalendarConnect />
            <p className="max-w-3xl font-sans text-xs leading-5 text-muted-foreground">
              {tPage("trustNote")}
            </p>
          </div>
        )}

        {error ? (
          <p
            className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 font-sans text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </section>

      <Snackbar
        open={snackbar.open}
        onClose={handleCloseSnackbar}
        variant={snackbar.variant}
        message={snackbar.message}
      />
    </div>
  )
}
