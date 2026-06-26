export interface PublicOpportunitiesQueryState {
  departmentId: string
  departmentCode: string
  modalityId: string
  modalityCode: string
  vacanteName: string
  countryCode: string
  country: string
  page: number
}

export function getPublicOpportunitiesQueryState(
  searchParams: URLSearchParams
): PublicOpportunitiesQueryState {
  const pageValue = Number(searchParams.get("page") ?? "1")

  return {
    departmentId: searchParams.get("departmentId")?.trim() ?? "",
    departmentCode: searchParams.get("departmentCode")?.trim() ?? "",
    modalityId: searchParams.get("modalityId")?.trim() ?? "",
    modalityCode: searchParams.get("modalityCode")?.trim() ?? "",
    vacanteName:
      searchParams.get("vacanteName")?.trim() ??
      searchParams.get("search")?.trim() ??
      "",
    countryCode: searchParams.get("countryCode")?.trim() ?? "",
    country: searchParams.get("country")?.trim() ?? "",
    page: Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1,
  }
}

export function buildPublicOpportunitiesQueryString(
  searchParams: Record<string, string | string[] | undefined>
): string {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      params.set(key, value)
      continue
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        params.append(key, entry)
      }
    }
  }

  return params.toString()
}
