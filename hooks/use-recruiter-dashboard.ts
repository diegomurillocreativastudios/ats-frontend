"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchRecruiterDashboard } from "@/lib/api/recruiter-dashboard"
import { getApiErrorMessage } from "@/lib/api-error"
import type { RecruiterDashboardModel } from "@/lib/rrhh/recruiter-dashboard"

export function useRecruiterDashboard() {
  const [data, setData] = useState<RecruiterDashboardModel | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setData(await fetchRecruiterDashboard())
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { data, isLoading, error, reload: load }
}
