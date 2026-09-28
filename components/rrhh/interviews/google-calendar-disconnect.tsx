"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar"
import Snackbar from "@/components/ui/Snackbar"

export interface GoogleCalendarDisconnectProps {
  onDisconnected?: () => void
}

export function GoogleCalendarDisconnect({
  onDisconnected,
}: GoogleCalendarDisconnectProps) {
  const t = useTranslations("RecruiterPortal.settings.calendarDisconnect")
  const { disconnect, isLoading } = useGoogleCalendar()
  const [showConfirm, setShowConfirm] = useState(false)
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    variant: "success" | "error"
    message: string
  }>({ open: false, variant: "success", message: "" })

  const handleDisconnect = async () => {
    try {
      await disconnect()
      setSnackbar({
        open: true,
        variant: "success",
        message: t("toastSuccess"),
      })
      setShowConfirm(false)
      onDisconnected?.()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("toastErrorGeneric")
      setSnackbar({ open: true, variant: "error", message })
    }
  }

  return (
    <>
      {showConfirm ? (
        <div className="w-full rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-sans font-medium">{t("title")}</p>
          <p className="mt-2 font-sans text-muted-foreground">
            {t("body")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleDisconnect()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 font-sans text-sm font-medium text-destructive-foreground hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              {t("confirm")}
            </button>
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="rounded-md border border-border px-4 py-2 font-sans text-sm hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="w-full rounded-md border border-destructive/50 px-4 py-2.5 font-sans text-sm font-medium text-destructive hover:bg-destructive/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 sm:w-auto"
        >
          {t("triggerLabel")}
        </button>
      )}
      <Snackbar
        open={snackbar.open}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        variant={snackbar.variant}
        message={snackbar.message}
      />
    </>
  )
}
