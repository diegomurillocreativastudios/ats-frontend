"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar"
import { Toast } from "@/components/common/toast"

export interface GoogleCalendarDisconnectProps {
  onDisconnected?: () => void
}

export function GoogleCalendarDisconnect({
  onDisconnected,
}: GoogleCalendarDisconnectProps) {
  const { disconnect, isLoading } = useGoogleCalendar()
  const [showConfirm, setShowConfirm] = useState(false)
  const [toast, setToast] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const handleDisconnect = async () => {
    try {
      await disconnect()
      setToast({ type: "success", message: "Google Calendar desconectado." })
      setShowConfirm(false)
      onDisconnected?.()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo desconectar"
      setToast({ type: "error", message })
    }
  }

  return (
    <>
      {showConfirm ? (
        <div className="rounded-lg border border-amber-700 bg-amber-50 p-4 text-sm text-amber-700 dark:bg-amber-700">
          <p className="font-sans font-medium">
            ¿Desconectar Google Calendar?
          </p>
          <p className="mt-2 font-sans text-muted-foreground">
            Los eventos ya creados en tu calendario no se eliminan.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleDisconnect()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 font-sans text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              Desconectar
            </button>
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="rounded-md border border-border px-4 py-2 font-sans text-sm hover:bg-muted"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="rounded-md border border-destructive/50 px-4 py-2 font-sans text-sm font-medium text-destructive hover:bg-destructive/10"
        >
          Desconectar Google Calendar
        </button>
      )}
      {toast ? (
        <Toast type={toast.type} message={toast.message} duration={4000} />
      ) : null}
    </>
  )
}
