import { getStateByCode, type IState } from "@countrystatecity/countries-browser"
import {
  getLocationCatalogStatus,
  searchLocationDivisions,
} from "@/lib/api/locations"
import type {
  LocationAdministrativeDivisionItem,
  LocationCatalogStatus,
  LocationPagedResult,
} from "@/lib/locations/types"
import { formatCountryCodeLabel } from "@/lib/profile-form-options"
import { normalizeCountryCode, normalizeStateCode } from "@/lib/vacancies/vacancy-location"

const GEONAMES_DIVISIONS_PAGE_SIZE = 100

let catalogStatusPromise: Promise<LocationCatalogStatus> | null = null
const level1DivisionsByCountry = new Map<
  string,
  Promise<LocationPagedResult<LocationAdministrativeDivisionItem>>
>()
const stateDisplayNameByKey = new Map<string, Promise<string | null>>()

export function clearVacancyLocationDisplayCache(): void {
  catalogStatusPromise = null
  level1DivisionsByCountry.clear()
  stateDisplayNameByKey.clear()
}

function getCachedLocationCatalogStatus(): Promise<LocationCatalogStatus> {
  if (!catalogStatusPromise) {
    catalogStatusPromise = getLocationCatalogStatus()
  }
  return catalogStatusPromise
}

function getCachedLevel1Divisions(
  countryCode: string
): Promise<LocationPagedResult<LocationAdministrativeDivisionItem>> {
  const cached = level1DivisionsByCountry.get(countryCode)
  if (cached) return cached

  const request = searchLocationDivisions({
    countryIso2: countryCode,
    level: 1,
    page: 1,
    pageSize: GEONAMES_DIVISIONS_PAGE_SIZE,
  })
  level1DivisionsByCountry.set(countryCode, request)
  return request
}

const SPANISH_ACCENT_PATTERN = /[áéíóúñüÁÉÍÓÚÑÜ]/

const LATIN_AMERICAN_COUNTRY_CODES = new Set([
  "AR",
  "BO",
  "BR",
  "CL",
  "CO",
  "CR",
  "CU",
  "DO",
  "EC",
  "ES",
  "GT",
  "HN",
  "MX",
  "NI",
  "PA",
  "PE",
  "PR",
  "PY",
  "SV",
  "UY",
  "VE",
])

const US_STATE_LABELS_ES: Record<string, string> = {
  NY: "Nueva York",
  NC: "Carolina del Norte",
  SC: "Carolina del Sur",
  ND: "Dakota del Norte",
  SD: "Dakota del Sur",
  WV: "Virginia Occidental",
  NH: "Nueva Hampshire",
  NJ: "Nueva Jersey",
  NM: "Nuevo México",
  PA: "Pensilvania",
}

const STATE_LABEL_OVERRIDES_ES: Record<string, string> = {
  "AR-C": "Ciudad Autónoma de Buenos Aires",
  "ES-AN": "Andalucía",
  "ES-AR": "Aragón",
  "ES-AS": "Asturias",
  "ES-CB": "Cantabria",
  "ES-CL": "Castilla y León",
  "ES-CM": "Castilla-La Mancha",
  "ES-CN": "Canarias",
  "ES-CT": "Cataluña",
  "ES-EX": "Extremadura",
  "ES-GA": "Galicia",
  "ES-IB": "Islas Baleares",
  "ES-MC": "Región de Murcia",
  "ES-NC": "Navarra",
  "ES-PV": "País Vasco",
  "ES-RI": "La Rioja",
  "ES-A": "Alicante",
  "ES-AB": "Albacete",
  "ES-AL": "Almería",
  "ES-C": "A Coruña",
  "ES-O": "Asturias",
}

const ENGLISH_STATE_NAME_FIXES: Array<[RegExp, string]> = [
  [/^Autonomous City of Buenos Aires$/i, "Ciudad Autónoma de Buenos Aires"],
  [/^Andalusia$/i, "Andalucía"],
  [/^Aragon$/i, "Aragón"],
  [/^Almeria$/i, "Almería"],
]

export function formatVacancyCountryLabel(countryCode: string | null | undefined): string {
  const label = formatCountryCodeLabel(countryCode)
  if (label === "—") return ""
  return label
}

function looksSpanish(text: string): boolean {
  return SPANISH_ACCENT_PATTERN.test(text)
}

function shouldPreferNativeName(countryCode: string, englishName: string, nativeName: string): boolean {
  if (nativeName === englishName) return false
  if (looksSpanish(nativeName)) return true
  return LATIN_AMERICAN_COUNTRY_CODES.has(countryCode)
}

export function formatVacancyStateLabel(
  state: Pick<IState, "iso2" | "name" | "native" | "translations">,
  countryCode: string
): string {
  const country = countryCode.trim().toUpperCase()
  const stateIso = state.iso2.trim().toUpperCase()
  const overrideKey = `${country}-${stateIso}`

  const translationEs = state.translations?.es?.trim()
  if (translationEs) return translationEs

  const override = STATE_LABEL_OVERRIDES_ES[overrideKey]
  if (override) return override

  if (country === "US") {
    const usLabel = US_STATE_LABELS_ES[stateIso]
    if (usLabel) return usLabel
  }

  const englishName = state.name.trim()
  const nativeName = state.native?.trim() ?? ""

  if (nativeName && shouldPreferNativeName(country, englishName, nativeName)) {
    return nativeName
  }

  if (looksSpanish(englishName)) return englishName

  for (const [pattern, replacement] of ENGLISH_STATE_NAME_FIXES) {
    if (pattern.test(englishName)) return replacement
  }

  return englishName
}

async function resolveGeoNamesDivisionDisplayName(
  countryCode: string,
  stateCode: string
): Promise<string | null> {
  try {
    const status = await getCachedLocationCatalogStatus()
    if (!status.hasData) return null

    const result = await getCachedLevel1Divisions(countryCode)

    const match = result.items.find(
      (division) => division.shortCode.toUpperCase() === stateCode
    )
    const display = match?.names.display.trim()
    return display || null
  } catch {
    return null
  }
}

async function resolveVacancyStateDisplayNameUncached(
  country: string,
  state: string
): Promise<string | null> {
  const stateData = await getStateByCode(country, state)
  if (stateData) return formatVacancyStateLabel(stateData, country)

  const geoNamesLabel = await resolveGeoNamesDivisionDisplayName(country, state)
  if (geoNamesLabel) return geoNamesLabel

  const fallback = STATE_LABEL_OVERRIDES_ES[`${country}-${state}`]
  return fallback ?? null
}

export async function resolveVacancyStateDisplayName(
  countryCode: string | null | undefined,
  stateCode: string | null | undefined
): Promise<string | null> {
  const country = normalizeCountryCode(countryCode)
  const state = normalizeStateCode(stateCode)
  if (!country || !state) return null

  const cacheKey = `${country}:${state}`
  const cached = stateDisplayNameByKey.get(cacheKey)
  if (cached) return cached

  const request = resolveVacancyStateDisplayNameUncached(country, state)
  stateDisplayNameByKey.set(cacheKey, request)
  return request
}
