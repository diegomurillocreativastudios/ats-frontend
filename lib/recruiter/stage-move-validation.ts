export interface ApplicationStageCatalogItem {
  id: string
  name: string
  orderIndex?: number
  order?: number
  final?: boolean
  isHiredStage?: boolean
}

export type ApplicationStageRef =
  | string
  | {
      id?: string | null
      name?: string | null
    }
  | null
  | undefined

export interface PipelineStage {
  id: string
  name: string
  order: number
  final?: boolean
  isHiredStage?: boolean
}

export interface ApplicantStatusOption {
  id: string
  name: string
  final?: boolean
}

export type StageMoveValidationCode = "ok" | "skip_not_allowed" | "final_status_required"

export interface StageMoveValidationResult {
  allowed: boolean
  code: StageMoveValidationCode
}

interface NormalizedStageRef {
  id: string
  name: string
}

function readOrderIndex(stage: ApplicationStageCatalogItem): number {
  const raw = stage.orderIndex ?? stage.order
  const orderIndex = Number(raw)
  return Number.isFinite(orderIndex) ? orderIndex : 0
}

function normalizeStageRef(ref: ApplicationStageRef): NormalizedStageRef {
  if (ref == null) return { id: "", name: "" }
  if (typeof ref === "string") {
    const trimmed = ref.trim()
    return { id: trimmed, name: trimmed }
  }
  return {
    id: String(ref.id ?? "").trim(),
    name: String(ref.name ?? "").trim(),
  }
}

function refsAreSameStage(current: ApplicationStageRef, target: ApplicationStageRef): boolean {
  const from = normalizeStageRef(current)
  const to = normalizeStageRef(target)
  if (from.id && to.id && from.id === to.id) return true
  if (from.name && to.name && from.name.toLowerCase() === to.name.toLowerCase()) {
    return true
  }
  return false
}

/**
 * Same catalog order as the backend: `orderIndex`, then `id`.
 */
export function sortApplicationStageCatalog<T extends ApplicationStageCatalogItem>(
  catalog: readonly T[]
): T[] {
  return [...catalog].sort((a, b) => {
    const orderDelta = readOrderIndex(a) - readOrderIndex(b)
    if (orderDelta !== 0) return orderDelta
    return String(a.id).localeCompare(String(b.id))
  })
}

export function resolveApplicationStage(
  ref: ApplicationStageRef,
  catalog: readonly ApplicationStageCatalogItem[]
): ApplicationStageCatalogItem | null {
  const normalized = normalizeStageRef(ref)
  if (normalized.id) {
    const byId = catalog.find((stage) => String(stage.id) === normalized.id)
    if (byId) return byId
  }
  if (normalized.name) {
    const key = normalized.name.toLowerCase()
    const byName = catalog.find(
      (stage) => String(stage.name ?? "").trim().toLowerCase() === key
    )
    if (byName) return byName
  }
  return null
}

/**
 * Shortcut terminal: `final === true` and not the hiring stage.
 * Identity is flags only — never the persisted `name`.
 */
export function isRejectionShortcutStage(
  stage: Pick<ApplicationStageCatalogItem, "final" | "isHiredStage"> | null | undefined
): boolean {
  if (stage == null) return false
  return stage.final === true && stage.isHiredStage !== true
}

export function isHiredTerminalStage(
  stage: Pick<ApplicationStageCatalogItem, "final" | "isHiredStage"> | null | undefined
): boolean {
  if (stage == null) return false
  return stage.final === true && stage.isHiredStage === true
}

/**
 * Mirrors backend `ApplicationStageTransitions.CanMove`.
 *
 * 1. Same stage → allowed (no-op).
 * 2. Target `final === true && isHiredStage !== true` → allowed from any origin.
 * 3. Otherwise only neighbors in the catalog sorted by `orderIndex`, then `id`.
 * 4. Everything else → invalid.
 */
export function canMoveApplicationStage(
  current: ApplicationStageRef,
  target: ApplicationStageRef,
  catalog: readonly ApplicationStageCatalogItem[]
): boolean {
  const sorted = sortApplicationStageCatalog(catalog)
  const from = resolveApplicationStage(current, sorted)
  const to = resolveApplicationStage(target, sorted)

  if (from && to && from.id === to.id) return true
  if (refsAreSameStage(current, target)) return true

  if (isRejectionShortcutStage(to)) return true

  if (!from || !to) return false

  const fromIndex = sorted.findIndex((stage) => stage.id === from.id)
  const toIndex = sorted.findIndex((stage) => stage.id === to.id)
  if (fromIndex < 0 || toIndex < 0) return false
  return Math.abs(fromIndex - toIndex) === 1
}

export function isFinalApplicationStatus(
  currentStatusId: string | null | undefined,
  statuses: readonly ApplicantStatusOption[] = []
): boolean {
  if (!Array.isArray(statuses) || statuses.length === 0) return true
  const statusId = String(currentStatusId ?? "").trim()
  const currentStatus = statuses.find((status) => String(status.id) === statusId)
  return currentStatus?.final === true
}

/**
 * Forward to the next pipeline stage, or to any pipeline stage with `final: true`
 * (shortcut or hired), requires an application status marked as final.
 * Backward to the previous neighbor does not.
 */
export function stageMoveRequiresFinalApplicationStatus(
  current: ApplicationStageRef,
  target: ApplicationStageRef,
  catalog: readonly ApplicationStageCatalogItem[]
): boolean {
  const sorted = sortApplicationStageCatalog(catalog)
  const from = resolveApplicationStage(current, sorted)
  const to = resolveApplicationStage(target, sorted)

  if (from && to && from.id === to.id) return false
  if (refsAreSameStage(current, target)) return false
  if (to?.final === true) return true
  if (!from || !to) return false

  const fromIndex = sorted.findIndex((stage) => stage.id === from.id)
  const toIndex = sorted.findIndex((stage) => stage.id === to.id)
  if (fromIndex < 0 || toIndex < 0) return false
  return toIndex === fromIndex + 1
}

/**
 * Drop / "move to" destinations for a card. Excludes the current stage.
 */
export function listValidMoveTargets(
  current: ApplicationStageRef,
  catalog: readonly ApplicationStageCatalogItem[],
  currentStatusId?: string | null,
  statuses: readonly ApplicantStatusOption[] = []
): ApplicationStageCatalogItem[] {
  return sortApplicationStageCatalog(catalog).filter((stage) => {
    if (refsAreSameStage(current, stage)) return false
    if (resolveApplicationStage(current, catalog)?.id === stage.id) return false
    return validateStageMove(current, stage, catalog, currentStatusId, statuses)
      .allowed
  })
}

/**
 * Shared result wrapper for Kanban, menus, and bulk moves.
 * Pipeline geometry first (`canMoveApplicationStage`); then application-status `final`.
 */
export function validateStageMove(
  current: ApplicationStageRef,
  target: ApplicationStageRef,
  catalog: readonly ApplicationStageCatalogItem[],
  currentStatusId?: string | null,
  statuses: readonly ApplicantStatusOption[] = []
): StageMoveValidationResult {
  if (!canMoveApplicationStage(current, target, catalog)) {
    return { allowed: false, code: "skip_not_allowed" }
  }
  if (!stageMoveRequiresFinalApplicationStatus(current, target, catalog)) {
    return { allowed: true, code: "ok" }
  }
  if (isFinalApplicationStatus(currentStatusId, statuses)) {
    return { allowed: true, code: "ok" }
  }
  return { allowed: false, code: "final_status_required" }
}
