export interface LocationNames {
  original: string
  ascii: string
  es: string | null
  display: string
}

export interface LocationCountryItem {
  geonameId: number
  iso2: string
  iso3: string | null
  names: LocationNames
}

export interface LocationAdministrativeDivisionItem {
  geonameId: number
  countryIso2: string
  adminLevel: number
  adminCode: string
  shortCode: string
  parentGeonameId: number | null
  names: LocationNames
}

export interface LocationCityItem {
  geonameId: number
  countryIso2: string
  admin1GeonameId: number | null
  admin2GeonameId: number | null
  admin3GeonameId: number | null
  names: LocationNames
  population: number | null
  latitude: number | null
  longitude: number | null
}

export interface LocationPagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface LocationCatalogStatus {
  hasData: boolean
}

export interface SearchCountriesParams {
  search?: string
  page?: number
  pageSize?: number
}

export interface SearchDivisionsParams {
  countryIso2: string
  level?: 1 | 2 | 3
  parentGeonameId?: number
  search?: string
  page?: number
  pageSize?: number
}

export interface SearchCitiesParams {
  countryIso2: string
  adminDivisionGeonameId?: number
  adminLevel?: 1 | 2 | 3
  search?: string
  page?: number
  pageSize?: number
}
