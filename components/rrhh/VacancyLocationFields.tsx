"use client"

import { useEffect, useMemo, useState } from "react"
import {
  getCountries,
  getStatesOfCountry,
  type IState,
} from "@countrystatecity/countries-browser"
import {
  getLocationCatalogStatus,
  searchLocationCountries,
  searchLocationDivisions,
} from "@/lib/api/locations"
import type { VacancyLocationSelection } from "@/lib/vacancies/vacancy-location"
import { normalizeCountryCode, normalizeStateCode } from "@/lib/vacancies/vacancy-location"
import {
  formatVacancyCountryLabel,
  formatVacancyStateLabel,
} from "@/lib/vacancies/vacancy-location-display"

const selectClassName =
  "h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"

interface CountryOption {
  iso2: string
  label: string
}

interface StateOption {
  code: string
  label: string
}

export interface VacancyLocationFieldsProps {
  countryCode: string
  stateCode: string
  onChange: (selection: VacancyLocationSelection) => void
  disabled?: boolean
  countrySelectId?: string
  stateSelectId?: string
  countryLabel?: string
  stateLabel?: string
  helperText?: string
}

export function VacancyLocationFields({
  countryCode,
  stateCode,
  onChange,
  disabled = false,
  countrySelectId = "vacancy-location-country",
  stateSelectId = "vacancy-location-state",
  countryLabel = "País",
  stateLabel = "Estado / provincia",
  helperText = "Opcional. Elige país y estado o provincia donde aplica la vacante.",
}: VacancyLocationFieldsProps) {
  const [useGeoNamesApi, setUseGeoNamesApi] = useState(false)
  const [countryOptions, setCountryOptions] = useState<CountryOption[]>([])
  const [stateOptions, setStateOptions] = useState<StateOption[]>([])
  const [legacyStates, setLegacyStates] = useState<IState[]>([])
  const [loadingCountries, setLoadingCountries] = useState(true)
  const [loadingStates, setLoadingStates] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const normalizedCountryCode = useMemo(() => normalizeCountryCode(countryCode) ?? "", [countryCode])
  const normalizedStateCode = useMemo(() => normalizeStateCode(stateCode) ?? "", [stateCode])

  useEffect(() => {
    let cancelled = false

    const loadCountries = async () => {
      setLoadingCountries(true)
      setLoadError(null)
      try {
        const status = await getLocationCatalogStatus()
        if (cancelled) return

        if (status.hasData) {
          setUseGeoNamesApi(true)
          const result = await searchLocationCountries({ page: 1, pageSize: 100 })
          if (cancelled) return
          const mapped = result.items.map((country) => ({
            iso2: country.iso2.toUpperCase(),
            label: country.names.display,
          }))
          setCountryOptions(mapped.sort((a, b) => a.label.localeCompare(b.label, "es")))
          return
        }

        setUseGeoNamesApi(false)
        const nextCountries = await getCountries()
        if (cancelled) return
        const mapped = nextCountries.map((country) => ({
          iso2: country.iso2.toUpperCase(),
          label: formatVacancyCountryLabel(country.iso2),
        }))
        setCountryOptions(mapped.sort((a, b) => a.label.localeCompare(b.label, "es")))
      } catch {
        if (cancelled) return
        try {
          setUseGeoNamesApi(false)
          const nextCountries = await getCountries()
          if (cancelled) return
          const mapped = nextCountries.map((country) => ({
            iso2: country.iso2.toUpperCase(),
            label: formatVacancyCountryLabel(country.iso2),
          }))
          setCountryOptions(mapped.sort((a, b) => a.label.localeCompare(b.label, "es")))
        } catch {
          if (cancelled) return
          setCountryOptions([])
          setLoadError("No se pudieron cargar los países.")
        }
      } finally {
        if (!cancelled) setLoadingCountries(false)
      }
    }

    void loadCountries()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!normalizedCountryCode) {
      setStateOptions([])
      setLegacyStates([])
      setLoadingStates(false)
      return
    }

    let cancelled = false

    const loadStates = async () => {
      setLoadingStates(true)
      setLoadError(null)
      try {
        if (useGeoNamesApi) {
          const result = await searchLocationDivisions({
            countryIso2: normalizedCountryCode,
            level: 1,
            page: 1,
            pageSize: 100,
          })
          if (cancelled) return
          const mapped = result.items.map((division) => ({
            code: division.shortCode.toUpperCase(),
            label: division.names.display,
          }))
          setStateOptions(mapped.sort((a, b) => a.label.localeCompare(b.label, "es")))
          setLegacyStates([])
          return
        }

        const nextStates = await getStatesOfCountry(normalizedCountryCode)
        if (cancelled) return
        setLegacyStates(nextStates)
        const mapped = nextStates.map((state) => ({
          code: state.iso2.toUpperCase(),
          label: formatVacancyStateLabel(state, normalizedCountryCode),
        }))
        setStateOptions(mapped.sort((a, b) => a.label.localeCompare(b.label, "es")))
      } catch {
        if (cancelled) return
        setStateOptions([])
        setLegacyStates([])
        setLoadError("No se pudieron cargar los estados o provincias.")
      } finally {
        if (!cancelled) setLoadingStates(false)
      }
    }

    void loadStates()

    return () => {
      cancelled = true
    }
  }, [normalizedCountryCode, useGeoNamesApi])

  const handleCountryChange = (nextCountryCode: string) => {
    onChange({
      countryCode: nextCountryCode,
      stateCode: "",
    })
  }

  const handleStateChange = (nextStateCode: string) => {
    onChange({
      countryCode: normalizedCountryCode,
      stateCode: nextStateCode,
    })
  }

  const countryOptionsWithSelection = useMemo(() => {
    if (
      normalizedCountryCode &&
      !countryOptions.some((country) => country.iso2 === normalizedCountryCode)
    ) {
      return [
        {
          iso2: normalizedCountryCode,
          label: formatVacancyCountryLabel(normalizedCountryCode) || normalizedCountryCode,
        },
        ...countryOptions,
      ]
    }
    return countryOptions
  }, [countryOptions, normalizedCountryCode])

  const stateOptionsWithSelection = useMemo(() => {
    if (
      normalizedStateCode &&
      !stateOptions.some((state) => state.code === normalizedStateCode)
    ) {
      const legacyState = legacyStates.find(
        (state) => state.iso2.toUpperCase() === normalizedStateCode
      )
      return [
        {
          code: normalizedStateCode,
          label: legacyState
            ? formatVacancyStateLabel(legacyState, normalizedCountryCode)
            : normalizedStateCode,
        },
        ...stateOptions,
      ]
    }
    return stateOptions
  }, [stateOptions, legacyStates, normalizedCountryCode, normalizedStateCode])

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor={countrySelectId} className="font-sans text-sm font-medium text-foreground">
            {countryLabel}
          </label>
          <select
            id={countrySelectId}
            value={normalizedCountryCode}
            onChange={(event) => handleCountryChange(event.target.value)}
            className={selectClassName}
            aria-label={countryLabel}
            disabled={disabled || loadingCountries}
          >
            <option value="">Sin especificar</option>
            {countryOptionsWithSelection.map((country) => (
              <option key={country.iso2} value={country.iso2}>
                {country.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={stateSelectId} className="font-sans text-sm font-medium text-foreground">
            {stateLabel}
          </label>
          <select
            id={stateSelectId}
            value={normalizedStateCode}
            onChange={(event) => handleStateChange(event.target.value)}
            className={selectClassName}
            aria-label={stateLabel}
            disabled={disabled || !normalizedCountryCode || loadingStates}
          >
            <option value="">Sin especificar</option>
            {stateOptionsWithSelection.map((state) => (
              <option key={state.code} value={state.code}>
                {state.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {helperText ? (
        <p className="font-sans text-xs text-muted-foreground">{helperText}</p>
      ) : null}

      {loadError ? (
        <p className="font-sans text-xs text-amber-700" role="status">
          {loadError}
        </p>
      ) : null}
    </div>
  )
}
