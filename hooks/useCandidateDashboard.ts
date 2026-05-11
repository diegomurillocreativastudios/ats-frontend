"use client"

import { useCallback, useEffect, useState } from "react"
import { apiClient } from "@/lib/api"
import { getApiErrorMessage } from "@/lib/api-error"
import { normalizeApplicationSource } from "@/lib/application-source"
import { mapDefaultCompanyDisplayLabel } from "@/lib/public-company-display"
import type {
  CandidatePortalApplicationRow,
  CandidatePortalDashboard,
} from "@/lib/candidate-dashboard"

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
      const apps = raw.applications ?? []
      setData({
        ...raw,
        applications: apps.map((row) => {
          const ext = row as CandidatePortalApplicationRow & {
            application_source?: unknown
          }
          return {
            ...row,
            companyLine: mapDefaultCompanyDisplayLabel(row.companyLine ?? ""),
            applicationSource: normalizeApplicationSource(
              row.applicationSource ?? ext.application_source
            ),
          }
        }),
      })
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
