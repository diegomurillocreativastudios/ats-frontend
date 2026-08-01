"use client"

import { useEffect, useId, useState } from "react"
import { getCountries } from "@countrystatecity/countries-browser"
import { ChevronDown } from "lucide-react"

interface PhoneCountryOption {
  iso2: string
  name: string
  phonecode: string
}

interface PhoneCountryInputProps {
  id?: string
  phone: string
  countryIso2: string
  onPhoneChange: (phone: string) => void
  onCountryChange: (iso2: string) => void
  disabled?: boolean
  placeholder?: string
  countryAriaLabel: string
  loadingLabel: string
  required?: boolean
}

function normalizePhoneCode(code: string): string {
  const digits = code.replace(/[^\d]/g, "")
  return digits ? `+${digits}` : ""
}

/**
 * Teléfono con `<select>` de país (código ISO + dial) y campo numérico.
 */
export function PhoneCountryInput({
  id,
  phone,
  countryIso2,
  onPhoneChange,
  onCountryChange,
  disabled = false,
  placeholder,
  countryAriaLabel,
  loadingLabel,
  required = false,
}: PhoneCountryInputProps) {
  const generatedId = useId()
  const phoneId = id ?? generatedId
  const countryId = `${phoneId}-country`

  const [countries, setCountries] = useState<PhoneCountryOption[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      try {
        const rows = await getCountries()
        if (cancelled) return
        const mapped = rows
          .map((country) => ({
            iso2: country.iso2.toUpperCase(),
            name: country.name,
            phonecode: normalizePhoneCode(country.phonecode),
          }))
          .filter((country) => country.iso2 && country.phonecode)
          .sort((a, b) => a.name.localeCompare(b.name, "en"))
        setCountries(mapped)
      } catch {
        if (!cancelled) setCountries([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div
      className={[
        "flex overflow-hidden rounded-md border border-input bg-background",
        "focus-within:ring-2 focus-within:ring-vo-purple focus-within:border-transparent",
        disabled ? "opacity-60" : "",
      ].join(" ")}
    >
      <div className="relative grid shrink-0 grid-cols-1 border-r border-input">
        <select
          id={countryId}
          name="country"
          autoComplete="country"
          aria-label={countryAriaLabel}
          disabled={disabled || isLoading}
          value={countryIso2.toUpperCase()}
          onChange={(e) => onCountryChange(e.target.value)}
          className="col-start-1 row-start-1 h-10 w-full appearance-none bg-muted/40 py-2 pr-8 pl-3 font-sans text-sm text-muted-foreground focus:outline-none disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <option value={countryIso2.toUpperCase()}>{loadingLabel}</option>
          ) : (
            countries.map((country) => (
              <option key={country.iso2} value={country.iso2}>
                {country.iso2} {country.phonecode}
              </option>
            ))
          )}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none col-start-1 row-start-1 mr-2 size-4 self-center justify-self-end text-muted-foreground"
        />
      </div>

      <input
        id={phoneId}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        disabled={disabled}
        required={required}
        value={phone}
        onChange={(e) => onPhoneChange(e.target.value)}
        placeholder={placeholder}
        className="block h-10 min-w-0 grow bg-transparent px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed"
      />
    </div>
  )
}
