import type { VacancyListStatusKey } from "@/lib/vacancies/map-vacancy-list-item"

/**
 * Etapa 10 — Mapper controlado de estados de vacante (Categoría A).
 *
 * Traduce el enum frontend estable `VacancyListStatusKey`
 * (`activa | cerrada | pausada | borrador`) y alias habituales del API
 * (`Open`, `Closed`, `Draft`, `Paused`, …).
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

/** API / legacy English (and Spanish) slugs → frontend status keys. */
const VACANCY_STATUS_ALIASES: Record<string, VacancyListStatusKey> = {
  activa: "activa",
  active: "activa",
  open: "activa",
  abierta: "activa",
  cerrada: "cerrada",
  closed: "cerrada",
  pausada: "pausada",
  paused: "pausada",
  borrador: "borrador",
  draft: "borrador",
}

export function resolveVacancyStatusKey(
  status: VacancyListStatusKey | string | null | undefined
): VacancyListStatusKey | null {
  if (!status) return null
  const normalized = String(status).toLowerCase().trim()
  return VACANCY_STATUS_ALIASES[normalized] ?? null
}

export function getVacancyStatusLabel(
  status: VacancyListStatusKey | string | null | undefined,
  t: (key: string) => string
): string {
  if (!status) return ""
  const mapped = resolveVacancyStatusKey(status)
  if (mapped) return t(VACANCY_STATUS_TRANSLATION_KEYS[mapped])
  return String(status)
}
