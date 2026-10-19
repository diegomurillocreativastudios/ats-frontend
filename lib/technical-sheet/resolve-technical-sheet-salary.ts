import { formatTechnicalSheetSalaryExpectation } from "@/lib/technical-sheet/format-technical-sheet-salary"

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function pickFirstSalaryRaw(...values: unknown[]): unknown {
  for (const v of values) {
    if (v == null) continue
    if (typeof v === "number" && Number.isFinite(v)) return v
    if (typeof v === "string" && v.trim() !== "") return v
  }
  return null
}

function readJobPreferencesSalary(source: Record<string, unknown> | null): unknown {
  if (!source) return null
  const jp = asRecord(source.JobPreferences ?? source.jobPreferences)
  if (!jp) return null
  return pickFirstSalaryRaw(jp.MinSalary, jp.minSalary)
}

function readFlatSalary(source: Record<string, unknown> | null): unknown {
  if (!source) return null
  return pickFirstSalaryRaw(
    source.salaryExpectation,
    source.SalaryExpectation,
    source.minSalary,
    source.MinSalary
  )
}

export interface ResolveTechnicalSheetSalaryInput {
  /** Candidate / normalized bag (may include nested JobPreferences). */
  candidate?: Record<string, unknown> | null
  /** Optional application / postulation sibling from vacancy technical-sheet payload. */
  application?: Record<string, unknown> | null
  /** Explicit profile root minSalary (wins over nested JobPreferences). */
  profileMinSalary?: number | null
}

/**
 * Resolves salary expectation for technical-sheet bindings.
 * Order: profileMinSalary → flat candidate keys → JobPreferences on candidate →
 * flat application keys → JobPreferences on application.
 * Returns formatted string (e.g. `$2,500 USD`) or `""`.
 */
export function resolveTechnicalSheetSalaryExpectation(
  input: ResolveTechnicalSheetSalaryInput
): string {
  const candidate = input.candidate ?? null
  const application = input.application ?? null

  const raw = pickFirstSalaryRaw(
    input.profileMinSalary,
    readFlatSalary(candidate),
    readJobPreferencesSalary(candidate),
    readFlatSalary(application),
    readJobPreferencesSalary(application)
  )

  return formatTechnicalSheetSalaryExpectation(raw)
}
