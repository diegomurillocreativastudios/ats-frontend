/**
 * Cuerpo PUT /api/recruiter/stages/{stageId}.
 * Omite `isInterviewStage`: si se enviara `false` por defecto al editar nombre u
 * orden, el backend podría apagar la etapa entrevista. Ese flag solo se muta
 * con PATCH `/interview-stage`; omitirlo conserva el valor actual.
 */
export const buildRecruiterStagePutPayload = (stage) => {
  const rawOrder = stage?.orderIndex ?? stage?.order
  const orderIndex = Number(rawOrder)
  return {
    name: stage?.name ?? "",
    orderIndex: Number.isFinite(orderIndex) ? orderIndex : 1,
    isDefault: Boolean(stage?.isDefault),
    final: Boolean(stage?.final),
    isHiredStage: Boolean(stage?.isHiredStage),
  }
}
