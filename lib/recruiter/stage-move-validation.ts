export interface PipelineStage {
  id: string
  name: string
  order: number
  final?: boolean
}

export interface ApplicantStatusOption {
  id: string
  name: string
  final?: boolean
}

export type StageMoveValidationCode =
  | "ok"
  | "skip_not_allowed"
  | "final_status_required"

export interface StageMoveValidationResult {
  allowed: boolean
  code: StageMoveValidationCode
}

function findStageIndex(stages: PipelineStage[], stageName: string): number {
  const normalized = stageName.trim().toLowerCase()
  if (!normalized) return -1

  const sorted = [...stages].sort((a, b) => a.order - b.order)
  return sorted.findIndex((stage) => stage.name.trim().toLowerCase() === normalized)
}

/**
 * Valida si un candidato puede moverse de una etapa a otra en el tablero Kanban.
 * Solo se permite avanzar o retroceder una etapa consecutiva; no saltos.
 * Para avanzar, el estado de postulación actual debe tener `final: true`.
 */
export function validateStageMove(
  currentStageName: string,
  targetStageName: string,
  stages: PipelineStage[],
  currentStatusId: string | null | undefined,
  statuses: ApplicantStatusOption[]
): StageMoveValidationResult {
  const current = currentStageName.trim()
  const target = targetStageName.trim()

  if (!current || !target || current.toLowerCase() === target.toLowerCase()) {
    return { allowed: false, code: "skip_not_allowed" }
  }

  if (stages.length === 0) {
    return { allowed: false, code: "skip_not_allowed" }
  }

  const currentIndex = findStageIndex(stages, current)
  const targetIndex = findStageIndex(stages, target)

  if (currentIndex === -1 || targetIndex === -1) {
    return { allowed: false, code: "skip_not_allowed" }
  }

  const delta = targetIndex - currentIndex

  if (Math.abs(delta) !== 1) {
    return { allowed: false, code: "skip_not_allowed" }
  }

  if (delta === 1 && statuses.length > 0) {
    const statusId = String(currentStatusId ?? "").trim()
    const currentStatus = statuses.find((status) => String(status.id) === statusId)
    if (!currentStatus?.final) {
      return { allowed: false, code: "final_status_required" }
    }
  }

  return { allowed: true, code: "ok" }
}
