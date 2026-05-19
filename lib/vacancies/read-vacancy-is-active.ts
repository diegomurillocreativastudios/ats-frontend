/**
 * Returns whether a vacancy record is active for recruiter mutations.
 * Inactive vacancies remain visible in list/detail as read-only.
 */
export const readVacancyIsActive = (vacancy: unknown): boolean => {
  if (vacancy == null || typeof vacancy !== "object") return true
  const record = vacancy as Record<string, unknown>
  if ("isActive" in record) return Boolean(record.isActive)
  if ("is_active" in record) return Boolean(record.is_active)
  return true
}
