"use client"

import { useCallback, useEffect, useState } from "react"
import { apiClient } from "@/lib/api"
import { getApiErrorMessage } from "@/lib/api-error"
import type { CandidatePortalDashboard } from "@/lib/candidate-dashboard"

export function useCandidateDashboard() {
  const [data, setData] = useState<CandidatePortalDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const raw = (await apiClient.get(
        "/api/candidate/dashboard"
      )) as CandidatePortalDashboard
      setData(raw)
    } catch (err: unknown) {
      setData(null)
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { data, loading, error, refetch: load }
}
