/**
 * Returns whether a vacancy is visible to candidates on the public portal.
 * Independent from status, `isActive`, and `isVacancyDone`.
 */
export const readVacancyIsPublished = (vacancy: unknown): boolean => {
  if (vacancy == null || typeof vacancy !== "object") return true
  const record = vacancy as Record<string, unknown>
  if (typeof record.isPublished === "boolean") return record.isPublished
  if (typeof record.is_published === "boolean") return record.is_published
  return true
}
