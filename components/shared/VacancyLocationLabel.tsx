"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
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
  emptyLabel,
  className,
}: VacancyLocationLabelProps) {
  const tCommon = useTranslations("Common")
  const resolvedEmptyLabel = emptyLabel ?? tCommon("unspecified")
  const [label, setLabel] = useState(() =>
    formatVacancyLocationLabel({
      countryCode: normalizeCountryCode(countryCode),
      stateCode: normalizeStateCode(stateCode),
      countryLabel: formatVacancyCountryLabel(normalizeCountryCode(countryCode)),
      emptyLabel: resolvedEmptyLabel,
    })
  )

  useEffect(() => {
    let cancelled = false

    const resolveLabel = async () => {
      const nextLabel = await buildVacancyLocationLabel({
        countryCode,
        stateCode,
        countryLabel: formatVacancyCountryLabel(normalizeCountryCode(countryCode)),
        emptyLabel: resolvedEmptyLabel,
      })
      if (!cancelled) setLabel(nextLabel)
    }

    void resolveLabel()

    return () => {
      cancelled = true
    }
  }, [countryCode, stateCode, resolvedEmptyLabel])

  return <span className={className}>{label}</span>
}
