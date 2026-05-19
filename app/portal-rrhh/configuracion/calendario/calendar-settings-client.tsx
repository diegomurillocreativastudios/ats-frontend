"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar"
import { GoogleCalendarConnect } from "@/components/rrhh/interviews/google-calendar-connect"
import { GoogleCalendarDisconnect } from "@/components/rrhh/interviews/google-calendar-disconnect"
import Snackbar from "@/components/ui/Snackbar"
import { LoadingSpinner } from "@/components/common/loading-spinner"
import PortalPageHeader from "@/components/ui/PortalPageHeader"

export function CalendarSettingsClient() {
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
        message: "Google Calendar conectado correctamente.",
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
  }, [successParam, errorParam])

  const handleManualSync = async () => {
    const result = await sync()
    if (!result) {
      setSnackbar({
        open: true,
        variant: "error",
        message: error ?? "No se pudo sincronizar el calendario.",
      })
      return
    }
    const msg =
      result.failedCount > 0
        ? `Sincronizado: ${result.syncedCount} ok, ${result.failedCount} con error.`
        : `Sincronizado: ${result.syncedCount} entrevista(s).`
    setSnackbar({
      open: true,
      variant: result.failedCount > 0 ? "error" : "success",
      message: msg,
    })
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <PortalPageHeader
        title="Calendario"
        description="Conectá Google Calendar para sincronizar entrevistas desde el ATS."
        className="mb-8"
      />

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-sans text-lg font-semibold text-foreground">
          Google Calendar
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <LoadingSpinner />
          </div>
        ) : status.isConnected ? (
          <div className="mt-4 flex flex-col gap-4">
            <p className="rounded-md border border-emerald-700 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Conectado como{" "}
              <span className="font-medium">{status.email || "tu cuenta"}</span>
              .
            </p>
            <p className="font-sans text-sm text-muted-foreground">
              Las entrevistas con fecha pueden generarse o actualizarse en tu
              calendario según la configuración del servidor.
            </p>
            <div className="flex flex-wrap gap-3">
              <GoogleCalendarDisconnect onDisconnected={() => void refresh()} />
              <button
                type="button"
                onClick={() => void handleManualSync()}
                disabled={isSyncing}
                className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 font-sans text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                {isSyncing ? "Sincronizando…" : "Sincronizar entrevistas"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            <p className="font-sans text-sm text-muted-foreground">
              Al conectar, podrás autorizar al ATS a crear eventos e invitaciones
              en tu Google Calendar (según lo que implemente el backend).
            </p>
            <GoogleCalendarConnect />
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
      </div>

      <Snackbar
        open={snackbar.open}
        onClose={handleCloseSnackbar}
        variant={snackbar.variant}
        message={snackbar.message}
      />
    </div>
  )
}
