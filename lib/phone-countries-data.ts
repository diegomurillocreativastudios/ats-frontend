import bundledCountries from "@countrystatecity/countries-browser/data/countries.json"

export interface BundledPhoneCountryRow {
  iso2: string
  name: string
  phonecode: string
}

interface BundledCountryRecord {
  iso2?: unknown
  name?: unknown
  phonecode?: unknown
}

/**
 * Country calling codes bundled with the app.
 * Do not fetch a remote catalog: Content Security Policy only allows same-origin requests.
 */
export function getBundledPhoneCountryRows(): BundledPhoneCountryRow[] {
  if (!Array.isArray(bundledCountries)) return []

  return (bundledCountries as BundledCountryRecord[]).map((row) => ({
    iso2: typeof row.iso2 === "string" ? row.iso2 : "",
    name: typeof row.name === "string" ? row.name : "",
    phonecode: typeof row.phonecode === "string" ? row.phonecode : "",
  }))
}
