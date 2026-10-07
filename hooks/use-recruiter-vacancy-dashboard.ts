"use client"

import { useCallback, useEffect, useState } from "react"
import { getApiErrorMessage } from "@/lib/api-error"
import { loadVacancyListSources } from "@/lib/rrhh/load-vacancy-list-views"
import {
  buildVacancyDashboardSnapshot,
  type VacancyDashboardListItem,
  type VacancyDashboardSnapshot,
} from "@/lib/rrhh/recruiter-vacancy-dashboard"
import type { VacancyListItem } from "@/lib/vacancies/map-vacancy-list-item"

export function useRecruiterVacancyDashboard() {
  const [data, setData] = useState<VacancyDashboardSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const loaded = await loadVacancyListSources()
      setData(
        buildVacancyDashboardSnapshot({
          progressRows: loaded.progressRows,
          progressTotal: loaded.progressTotal,
          listItems: loaded.listItems.map(toListItem),
          listTotal: loaded.listTotal,
        })
      )
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

function toListItem(item: VacancyListItem): VacancyDashboardListItem {
  return {
    id: item.id,
    publicSlug: item.publicSlug,
    title: item.title,
    company: item.company,
    status: item.status,
    isPublished: item.isPublished,
    candidates: item.candidates,
  }
}
