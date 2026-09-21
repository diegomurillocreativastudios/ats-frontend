import bundledCountries from "@countrystatecity/countries-browser/data/countries.json"
import { resolveCountryDisplayLabel } from "@/lib/profile-form-options"

export interface BundledCountryOption {
  iso2: string
  label: string
}

export interface BundledState {
  iso2: string
  name: string
  native: string | null
  translations?: Record<string, string>
}

interface BundledCountryRecord {
  iso2?: unknown
}

const ISO2_PATTERN = /^[A-Z]{2}$/

function isBundledState(value: unknown): value is BundledState {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return false
  }
  const record = value as Record<string, unknown>
  return typeof record.iso2 === "string" && typeof record.name === "string"
}

/**
 * Countries packaged with the app. Do not fetch a remote catalog:
 * Content Security Policy only allows same-origin requests.
 */
export function getBundledCountryOptions(): BundledCountryOption[] {
  if (!Array.isArray(bundledCountries)) return []

  const seen = new Set<string>()
  const rows: BundledCountryOption[] = []

  for (const raw of bundledCountries as BundledCountryRecord[]) {
    const iso2 =
      typeof raw.iso2 === "string" ? raw.iso2.trim().toUpperCase() : ""
    if (!ISO2_PATTERN.test(iso2) || seen.has(iso2)) continue
    seen.add(iso2)
    rows.push({
      iso2,
      label: resolveCountryDisplayLabel(iso2) || iso2,
    })
  }

  return rows.sort((a, b) => a.label.localeCompare(b.label, "es"))
}

const statesByCountry = new Map<string, Promise<BundledState[]>>()

export function resetBundledStatesCache(): void {
  statesByCountry.clear()
}

function catalogUrls(iso2: string): string[] {
  const staticPath = `/location-catalog/states/${encodeURIComponent(iso2)}.json`
  const apiPath = `/api/location-catalog/states/${encodeURIComponent(iso2)}`
  if (typeof window !== "undefined" && window.location?.origin) {
    const origin = window.location.origin
    return [new URL(staticPath, origin).toString(), new URL(apiPath, origin).toString()]
  }
  return [staticPath, apiPath]
}

/**
 * Administrative divisions packaged with the app, served same-origin.
 */
export function getBundledStatesOfCountry(
  countryIso2: string
): Promise<BundledState[]> {
  const iso2 = countryIso2.trim().toUpperCase()
  if (!ISO2_PATTERN.test(iso2)) return Promise.resolve([])

  const cached = statesByCountry.get(iso2)
  if (cached) return cached

  const request = (async () => {
    const urls = catalogUrls(iso2)

    for (const url of urls) {
      try {
        const response = await fetch(url, { credentials: "same-origin" })
        if (!response.ok) continue
        const data: unknown = await response.json().catch(() => [])
        if (!Array.isArray(data)) continue
        return data.filter(isBundledState)
      } catch {
        // Try the next same-origin catalog URL.
      }
    }
    return []
  })()

  statesByCountry.set(iso2, request)
  return request
}

export async function getBundledStateByCode(
  countryIso2: string,
  stateCode: string
): Promise<BundledState | null> {
  const needle = stateCode.trim().toUpperCase()
  if (!needle) return null
  const states = await getBundledStatesOfCountry(countryIso2)
  return (
    states.find((state) => state.iso2.trim().toUpperCase() === needle) ?? null
  )
}
