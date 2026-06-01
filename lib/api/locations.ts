import { apiClient } from "@/lib/api"
import { sanitizeLocationDisplayLabel } from "@/lib/locations/sanitize-display-label"
import type {
  LocationCatalogStatus,
  LocationCountryItem,
  LocationAdministrativeDivisionItem,
  LocationCityItem,
  LocationNames,
  LocationPagedResult,
  SearchCountriesParams,
  SearchDivisionsParams,
  SearchCitiesParams,
} from "@/lib/locations/types"

const readString = (record: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return ""
}

const readNullableString = (record: Record<string, unknown>, ...keys: string[]) => {
  const value = readString(record, ...keys)
  return value || null
}

const readNumber = (record: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "number" && Number.isFinite(value)) return value
  }
  return 0
}

const readNullableNumber = (record: Record<string, unknown>, ...keys: string[]) => {
  const value = readNumber(record, ...keys)
  return value === 0 ? null : value
}

const normalizeNames = (raw: unknown): LocationNames => {
  const record =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  const original = readString(record, "original", "Original")
  const ascii = readString(record, "ascii", "Ascii") || original
  const es = readNullableString(record, "es", "Es")
  const rawDisplay =
    readString(record, "display", "Display") || es || ascii || original
  const display = sanitizeLocationDisplayLabel(rawDisplay)
  return { original, ascii, es, display }
}

const normalizeCountry = (raw: unknown): LocationCountryItem => {
  const record =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  return {
    geonameId: readNumber(record, "geonameId", "GeonameId"),
    iso2: readString(record, "iso2", "Iso2").toUpperCase(),
    iso3: readNullableString(record, "iso3", "Iso3"),
    names: normalizeNames(record.names ?? record.Names),
  }
}

const normalizeDivision = (raw: unknown): LocationAdministrativeDivisionItem => {
  const record =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  const parent = record.parentGeonameId ?? record.ParentGeonameId
  return {
    geonameId: readNumber(record, "geonameId", "GeonameId"),
    countryIso2: readString(record, "countryIso2", "CountryIso2").toUpperCase(),
    adminLevel: readNumber(record, "adminLevel", "AdminLevel"),
    adminCode: readString(record, "adminCode", "AdminCode"),
    shortCode: readString(record, "shortCode", "ShortCode").toUpperCase(),
    parentGeonameId: typeof parent === "number" ? parent : null,
    names: normalizeNames(record.names ?? record.Names),
  }
}

const normalizeCity = (raw: unknown): LocationCityItem => {
  const record =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  const admin1 = record.admin1GeonameId ?? record.Admin1GeonameId
  const admin2 = record.admin2GeonameId ?? record.Admin2GeonameId
  const admin3 = record.admin3GeonameId ?? record.Admin3GeonameId
  return {
    geonameId: readNumber(record, "geonameId", "GeonameId"),
    countryIso2: readString(record, "countryIso2", "CountryIso2").toUpperCase(),
    admin1GeonameId: typeof admin1 === "number" ? admin1 : null,
    admin2GeonameId: typeof admin2 === "number" ? admin2 : null,
    admin3GeonameId: typeof admin3 === "number" ? admin3 : null,
    names: normalizeNames(record.names ?? record.Names),
    population: readNullableNumber(record, "population", "Population"),
    latitude: readNullableNumber(record, "latitude", "Latitude"),
    longitude: readNullableNumber(record, "longitude", "Longitude"),
  }
}

const normalizePage = <T>(
  raw: unknown,
  mapItem: (item: unknown) => T
): LocationPagedResult<T> => {
  const record =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  const itemsRaw = record.items ?? record.Items
  const items = Array.isArray(itemsRaw) ? itemsRaw.map(mapItem) : []
  return {
    items,
    page: readNumber(record, "page", "Page") || 1,
    pageSize: readNumber(record, "pageSize", "PageSize") || items.length,
    total: readNumber(record, "total", "Total"),
    totalPages: readNumber(record, "totalPages", "TotalPages"),
  }
}

const buildQuery = (params: Record<string, string | number | undefined>) => {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue
    searchParams.set(key, String(value))
  }
  const query = searchParams.toString()
  return query ? `?${query}` : ""
}

export const getLocationCatalogStatus = async (): Promise<LocationCatalogStatus> => {
  const data = await apiClient.get("/api/locations/status")
  const record =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {}
  return {
    hasData: Boolean(record.hasData ?? record.HasData),
  }
}

const LOCATION_FETCH_PAGE_SIZE = 100

const fetchAllLocationPages = async <T>(
  fetchPage: (page: number, pageSize: number) => Promise<LocationPagedResult<T>>,
  pageSize = LOCATION_FETCH_PAGE_SIZE
): Promise<T[]> => {
  const first = await fetchPage(1, pageSize)
  const items = [...first.items]
  const totalPages = first.totalPages > 0 ? first.totalPages : 1

  for (let page = 2; page <= totalPages; page++) {
    const result = await fetchPage(page, pageSize)
    items.push(...result.items)
    if (result.items.length === 0) break
  }

  return items
}

export const searchLocationCountries = async (params: SearchCountriesParams = {}) => {
  const query = buildQuery({
    search: params.search,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 50,
  })
  const data = await apiClient.get(`/api/locations/countries${query}`)
  return normalizePage(data, normalizeCountry)
}

/** Loads every country from the catalog (paginates until all pages are fetched). */
export const fetchAllLocationCountries = async (
  params: Omit<SearchCountriesParams, "page" | "pageSize"> = {}
) =>
  fetchAllLocationPages((page, pageSize) =>
    searchLocationCountries({ ...params, page, pageSize })
  )

export const searchLocationDivisions = async (params: SearchDivisionsParams) => {
  const { countryIso2, level = 1, parentGeonameId, search, page, pageSize } = params
  const query = buildQuery({
    level,
    parentGeonameId,
    search,
    page: page ?? 1,
    pageSize: pageSize ?? 50,
  })
  const data = await apiClient.get(
    `/api/locations/countries/${encodeURIComponent(countryIso2)}/divisions${query}`
  )
  return normalizePage(data, normalizeDivision)
}

/** Loads every division for a country/level (paginates until all pages are fetched). */
export const fetchAllLocationDivisions = async (
  params: Omit<SearchDivisionsParams, "page" | "pageSize">
) =>
  fetchAllLocationPages((page, pageSize) =>
    searchLocationDivisions({ ...params, page, pageSize })
  )

export const searchLocationCities = async (params: SearchCitiesParams) => {
  const { countryIso2, adminDivisionGeonameId, adminLevel, search, page, pageSize } = params
  const query = buildQuery({
    adminDivisionGeonameId,
    adminLevel,
    search,
    page: page ?? 1,
    pageSize: pageSize ?? 50,
  })
  const data = await apiClient.get(
    `/api/locations/countries/${encodeURIComponent(countryIso2)}/cities${query}`
  )
  return normalizePage(data, normalizeCity)
}
