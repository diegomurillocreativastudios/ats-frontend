import { getCountries } from "@countrystatecity/countries-browser"

export interface PhoneCountryOption {
  iso2: string
  name: string
  phonecode: string
}

function normalizePhoneCode(code: string): string {
  const digits = code.replace(/[^\d]/g, "")
  return digits ? `+${digits}` : ""
}

function mapPhoneCountries(
  rows: Array<{ iso2: string; name: string; phonecode: string }>
): PhoneCountryOption[] {
  return rows
    .map((country) => ({
      iso2: country.iso2.toUpperCase(),
      name: country.name,
      phonecode: normalizePhoneCode(country.phonecode),
    }))
    .filter((country) => country.iso2 !== "" && country.phonecode !== "")
    .sort((a, b) => a.name.localeCompare(b.name, "en"))
}

let cachedCountries: PhoneCountryOption[] | null = null
let phoneCountriesPromise: Promise<PhoneCountryOption[]> | null = null

/**
 * Devuelve la lista ya resuelta si `loadPhoneCountries` terminó en este runtime.
 */
export function getCachedPhoneCountries(): PhoneCountryOption[] | null {
  return cachedCountries
}

/**
 * Carga países con prefijo telefónico y los reutiliza (una sola petición CDN por sesión).
 */
export function loadPhoneCountries(): Promise<PhoneCountryOption[]> {
  if (cachedCountries) return Promise.resolve(cachedCountries)
  if (!phoneCountriesPromise) {
    phoneCountriesPromise = getCountries()
      .then((rows) => {
        cachedCountries = mapPhoneCountries(rows)
        return cachedCountries
      })
      .catch((error: unknown) => {
        phoneCountriesPromise = null
        throw error
      })
  }
  return phoneCountriesPromise
}

/**
 * Limpia el cache en memoria. Solo para tests.
 */
export function resetPhoneCountriesCache(): void {
  cachedCountries = null
  phoneCountriesPromise = null
}

/**
 * Filtra por nombre, ISO-2 o prefijo (+503 / 503).
 */
export function filterPhoneCountries(
  countries: PhoneCountryOption[],
  query: string
): PhoneCountryOption[] {
  const q = query.trim().toLowerCase()
  if (q === "") return countries

  const compact = q.replace(/[\s-()]/g, "")
  const digits = compact.replace(/[^\d]/g, "")

  return countries.filter((country) => {
    if (country.name.toLowerCase().includes(q)) return true
    if (country.iso2.toLowerCase().includes(q)) return true
    const code = country.phonecode.toLowerCase()
    if (code.includes(compact)) return true
    if (digits !== "" && code.replace("+", "").startsWith(digits)) return true
    return false
  })
}
