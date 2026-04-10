/**
 * Opciones para selects del formulario de perfil candidato (es-ES).
 */

export interface SelectOption {
  value: string
  label: string
}

function iso2ToFlagEmoji(iso2: string): string {
  const c = iso2.toUpperCase()
  if (c.length !== 2 || !/^[A-Z]{2}$/.test(c)) return "🏳️"
  const base = 0x1f1e6 - 0x41
  return String.fromCodePoint(c.charCodeAt(0) + base) + String.fromCodePoint(c.charCodeAt(1) + base)
}

let countryOptionsCache: Array<SelectOption & { flag: string }> | null = null

/**
 * Países y territorios ISO 3166-1 alpha-2 con nombre en español y bandera (emoji).
 */
export function getCountrySelectOptions(): Array<SelectOption & { flag: string }> {
  if (countryOptionsCache) return countryOptionsCache

  let codes: string[] = []
  try {
    const intl = Intl as typeof Intl & {
      supportedValuesOf?: (type: string) => string[]
    }
    if (typeof intl.supportedValuesOf === "function") {
      codes = intl.supportedValuesOf("region").filter(
        (r): r is string => typeof r === "string" && r.length === 2 && /^[A-Z]{2}$/i.test(r)
      )
    }
  } catch {
    codes = []
  }

  if (codes.length === 0) {
    codes = [
      "SV",
      "GT",
      "HN",
      "NI",
      "CR",
      "PA",
      "MX",
      "US",
      "ES",
      "AR",
      "BR",
      "CO",
      "CL",
      "PE",
      "EC",
      "BO",
      "PY",
      "UY",
      "VE",
      "DE",
      "FR",
      "IT",
      "GB",
      "CA",
      "AU",
      "JP",
      "CN",
      "IN",
    ]
  }

  const display = new Intl.DisplayNames(["es"], { type: "region" })
  const seen = new Set<string>()
  const out: Array<SelectOption & { flag: string }> = []

  for (const code of codes) {
    const upper = code.toUpperCase()
    let name: string
    try {
      name = display.of(upper) ?? upper
    } catch {
      name = upper
    }
    if (!name || name === upper || seen.has(name)) continue
    seen.add(name)
    const flag = iso2ToFlagEmoji(upper)
    out.push({ value: name, label: `${flag} ${name}`, flag })
  }

  out.sort((a, b) => a.value.localeCompare(b.value, "es"))

  countryOptionsCache = out
  return out
}

/** Estado civil (valores en español para persistir en API). */
export const MARITAL_STATUS_OPTIONS: SelectOption[] = [
  { value: "Soltero/a", label: "Soltero/a" },
  { value: "Casado/a", label: "Casado/a" },
  { value: "Unión libre", label: "Unión libre" },
  { value: "Divorciado/a", label: "Divorciado/a" },
  { value: "Viudo/a", label: "Viudo/a" },
  { value: "Separado/a", label: "Separado/a" },
]

/** Género */
export const GENDER_OPTIONS: SelectOption[] = [
  { value: "Masculino", label: "Masculino" },
  { value: "Femenino", label: "Femenino" },
]

/**
 * Disponibilidad laboral (perfil y preferencias).
 */
export const AVAILABILITY_OPTIONS: SelectOption[] = [
  { value: "Inmediata", label: "Inmediata" },
  { value: "En 15 días o menos", label: "En 15 días o menos" },
  { value: "En 1 mes", label: "En 1 mes" },
  { value: "En 2 meses o más", label: "En 2 meses o más" },
  { value: "A convenir", label: "A convenir" },
  { value: "Según propuesta", label: "Según propuesta" },
]

/**
 * Si el valor guardado no coincide con ninguna opción (texto libre previo), mostrarlo como opción extra.
 */
export function mergeLegacySelectOption(
  options: SelectOption[],
  currentValue: string
): SelectOption[] {
  const t = currentValue.trim()
  if (!t) return options
  if (options.some((o) => o.value === t)) return options
  return [{ value: t, label: `${t} (valor actual)` }, ...options]
}
