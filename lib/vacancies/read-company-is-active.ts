export interface CompanyActiveLookup {
  id: string
  isActive?: boolean
}

function readIsActiveFlag(record: Record<string, unknown>): boolean | null {
  if ("isActive" in record) return Boolean(record.isActive)
  if ("is_active" in record) return Boolean(record.is_active)
  return null
}

/**
 * Reads whether the vacancy's client company is active.
 * Defaults to true when the API omits the flag.
 */
export function readCompanyIsActiveForVacancy(
  vacancy: unknown,
  companies: CompanyActiveLookup[] = []
): boolean {
  if (vacancy == null || typeof vacancy !== "object") return true
  const record = vacancy as Record<string, unknown>

  const direct = record.isCompanyActive ?? record.is_company_active ?? record.companyIsActive ?? record.company_is_active
  if (direct !== undefined) return Boolean(direct)

  const companyRaw = record.company
  if (
    companyRaw != null &&
    typeof companyRaw === "object" &&
    !Array.isArray(companyRaw)
  ) {
    const nested = readIsActiveFlag(companyRaw as Record<string, unknown>)
    if (nested !== null) return nested
  }

  const companyId = String(record.companyId ?? record.company_id ?? "").trim()
  if (companyId !== "" && companies.length > 0) {
    const match = companies.find((c) => c.id === companyId)
    if (match && typeof match.isActive === "boolean") {
      return match.isActive
    }
  }

  return true
}
