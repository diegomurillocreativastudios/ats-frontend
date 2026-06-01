"use client"

import { useCallback, useEffect, useState } from "react"
import {
  checkCalendarStatus,
  disconnectGoogleCalendar,
  getGoogleAuthUrl,
  syncCalendarEvents,
} from "@/lib/google-calendar"
import type { CalendarSyncResponse, GoogleCalendarStatus } from "@/types/calendar"

export function useGoogleCalendar() {
  const [status, setStatus] = useState<GoogleCalendarStatus>({
    isConnected: false,
    email: "",
    connectedAt: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    const loadStatus = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const next = await checkCalendarStatus()
        setStatus(next)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "No se pudo cargar el estado"
        setError(message)
        console.error("[useGoogleCalendar] Error loading status:", err)
      } finally {
        setIsLoading(false)
      }
    }

    void loadStatus()
  }, [])

  const connect = useCallback(async () => {
    try {
      setError(null)
      const authUrl = await getGoogleAuthUrl()
      window.location.href = authUrl
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo iniciar la conexión"
      setError(message)
      console.error("[useGoogleCalendar] Error connecting:", err)
    }
  }, [])

  const disconnect = useCallback(async () => {
    try {
      setError(null)
      setIsLoading(true)
      await disconnectGoogleCalendar()
      setStatus({ isConnected: false, email: "", connectedAt: null })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo desconectar"
      setError(message)
      console.error("[useGoogleCalendar] Error disconnecting:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const sync = useCallback(async (): Promise<CalendarSyncResponse | null> => {
    try {
      setError(null)
      setIsSyncing(true)
      return await syncCalendarEvents()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al sincronizar"
      setError(message)
      console.error("[useGoogleCalendar] Error syncing:", err)
      return null
    } finally {
      setIsSyncing(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const next = await checkCalendarStatus()
      setStatus(next)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo actualizar"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    status,
    isLoading,
    error,
    isSyncing,
    connect,
    disconnect,
    sync,
    refresh,
  }
}
