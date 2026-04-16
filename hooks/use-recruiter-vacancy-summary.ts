"use client"

import { useEffect, useState } from "react"
import {
  fetchRecruiterVacancySummary,
  type VacancyApplicantOption,
} from "@/lib/api/interviews"

export interface UseRecruiterVacancySummaryResult {
  title: string | null
  applicantOptions: VacancyApplicantOption[]
  loading: boolean
  error: boolean
}

export function useRecruiterVacancySummary(
  vacancyId: string
): UseRecruiterVacancySummaryResult {
  const [title, setTitle] = useState<string | null>(null)
  const [applicantOptions, setApplicantOptions] = useState<
    VacancyApplicantOption[]
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!vacancyId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(false)
    fetchRecruiterVacancySummary(vacancyId)
      .then((s) => {
        if (cancelled) return
        setTitle(s.title)
        setApplicantOptions(s.applicantOptions)
      })
      .catch(() => {
        if (cancelled) return
        setTitle(null)
        setApplicantOptions([])
        setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [vacancyId])

  return { title, applicantOptions, loading, error }
}
