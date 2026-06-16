import type { InterviewStatus } from "@/lib/api/interviews"

/**
 * Etapa 11 — Mapper controlado de estados de entrevista (Categoría A).
 *
 * Solo traduce el enum frontend estable `InterviewStatus`
 * (`Scheduled | Completed | Cancelled | NoShow`). Si llega un valor
 * desconocido (texto libre o estado configurado desde backend/BD), se
 * devuelve el valor crudo sin transformarlo. El `displayName` que envía el
 * API se prioriza en el punto de uso (no se traduce aquí).
 *
 * Las claves apuntan al namespace `RecruiterPortal.interviews` (relativas a
 * `useTranslations("RecruiterPortal.interviews")`).
 */
export const INTERVIEW_STATUS_TRANSLATION_KEYS = {
  Scheduled: "statuses.scheduled",
  Completed: "statuses.completed",
  Cancelled: "statuses.cancelled",
  NoShow: "statuses.noShow",
} as const satisfies Record<InterviewStatus, string>

export function getInterviewStatusLabel(
  status: InterviewStatus | string | null | undefined,
  t: (key: string) => string,
): string {
  if (!status) return ""
  const key =
    INTERVIEW_STATUS_TRANSLATION_KEYS[status as InterviewStatus]
  return key ? t(key) : String(status)
}
