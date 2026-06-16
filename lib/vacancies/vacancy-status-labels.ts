import type { VacancyListStatusKey } from "@/lib/vacancies/map-vacancy-list-item"

/**
 * Etapa 10 — Mapper controlado de estados de vacante (Categoría A).
 *
 * Solo traduce el enum frontend estable `VacancyListStatusKey`
 * (`activa | cerrada | pausada | borrador`) producido por `mapStatusKey`.
 * Si llega un valor desconocido (texto libre o estado configurado desde
 * backend/BD), se devuelve el valor crudo sin transformarlo.
 *
 * Las claves apuntan al namespace `RecruiterPortal.vacancies` (relativas a
 * `useTranslations("RecruiterPortal.vacancies")`).
 */
export const VACANCY_STATUS_TRANSLATION_KEYS = {
  activa: "statuses.active",
  cerrada: "statuses.closed",
  pausada: "statuses.paused",
  borrador: "statuses.draft",
} as const satisfies Record<VacancyListStatusKey, string>

export function getVacancyStatusLabel(
  status: VacancyListStatusKey | string | null | undefined,
  t: (key: string) => string,
): string {
  if (!status) return ""
  const key =
    VACANCY_STATUS_TRANSLATION_KEYS[status as VacancyListStatusKey]
  return key ? t(key) : String(status)
}
