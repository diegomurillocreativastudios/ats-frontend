"use client"

import { useEffect, useState } from "react"
import {
  buildVacancyLocationLabel,
  formatVacancyLocationLabel,
  normalizeCountryCode,
  normalizeStateCode,
} from "@/lib/vacancies/vacancy-location"
import { formatVacancyCountryLabel } from "@/lib/vacancies/vacancy-location-display"

export interface VacancyLocationLabelProps {
  countryCode?: string | null
  stateCode?: string | null
  emptyLabel?: string
  className?: string
}

export function VacancyLocationLabel({
  countryCode,
  stateCode,
  emptyLabel = "Sin especificar",
  className,
}: VacancyLocationLabelProps) {
  const [label, setLabel] = useState(() =>
    formatVacancyLocationLabel({
      countryCode: normalizeCountryCode(countryCode),
      stateCode: normalizeStateCode(stateCode),
      countryLabel: formatVacancyCountryLabel(normalizeCountryCode(countryCode)),
      emptyLabel,
    })
  )

  useEffect(() => {
    let cancelled = false

    const resolveLabel = async () => {
      const nextLabel = await buildVacancyLocationLabel({
        countryCode,
        stateCode,
        countryLabel: formatVacancyCountryLabel(normalizeCountryCode(countryCode)),
        emptyLabel,
      })
      if (!cancelled) setLabel(nextLabel)
    }

    void resolveLabel()

    return () => {
      cancelled = true
    }
  }, [countryCode, stateCode, emptyLabel])

  return <span className={className}>{label}</span>
}
