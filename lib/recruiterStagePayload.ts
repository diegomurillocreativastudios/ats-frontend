/**
 * Cuerpo PUT /api/recruiter/companies/{companyId}/stages/{stageId}
 * name, orderIndex, isDefault, final e isHiredStage (cuando el backend lo expone).
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
