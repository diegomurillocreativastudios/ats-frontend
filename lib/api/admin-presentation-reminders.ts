import { apiClient, type ApiClientError } from "@/lib/api"
import {
  QUERY_FETCH_ALL_PAGE_SIZE,
  fetchAllHeaderPagedList,
} from "@/lib/api/query-paging"
import { normalizeTemplateType } from "@/lib/templates/technical-sheet-template"

export const PRESENTATION_REMINDER_TIMEZONES = [
  "America/El_Salvador",
  "America/Mexico_City",
  "America/Bogota",
  "America/Argentina/Buenos_Aires",
  "Europe/Madrid",
  "UTC",
] as const

export type PresentationReminderTimeZoneId =
  (typeof PRESENTATION_REMINDER_TIMEZONES)[number]

export interface PresentationReminderAutoSend {
  enabled: boolean
  timeOfDay: string
  timeZoneId: PresentationReminderTimeZoneId
}

export interface PresentationReminderTemplateConfig {
  id?: string
  templateId: string
  vacancyTypeIds: string[]
  autoSend: PresentationReminderAutoSend
}

export interface PresentationRemindersSettings {
  templates: PresentationReminderTemplateConfig[]
}

/** Wire shape for PUT: templateId may be number when numeric. */
export interface PresentationReminderTemplateConfigPayload {
  id?: string
  templateId: string | number
  vacancyTypeIds: string[]
  autoSend: PresentationReminderAutoSend
}

export interface NotifyPresentationRemindersRequest {
  useSavedSettings?: boolean
  configId?: string
  templateId?: string | number
  vacancyTypeIds?: string[]
}

export interface PresentationRemindersNotifyResult {
  recipients: number
  sent: number
  failed: number
  skipped: number
  skippedReason: string | null
}

export interface NotificationTemplateOption {
  id: string
  name: string
}

const TIMEZONE_SET = new Set<string>(PRESENTATION_REMINDER_TIMEZONES)

export const DEFAULT_PRESENTATION_REMINDER_AUTO_SEND: PresentationReminderAutoSend =
  {
    enabled: false,
    timeOfDay: "09:00",
    timeZoneId: "America/El_Salvador",
  }

export const DEFAULT_PRESENTATION_REMINDERS_SETTINGS: PresentationRemindersSettings =
  {
    templates: [],
  }

function toNumberValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function toStringValue(value: unknown): string {
  if (value == null) return ""
  return String(value).trim()
}

function toOptionalStringValue(value: unknown): string | null {
  const normalized = toStringValue(value)
  return normalized === "" ? null : normalized
}

function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof Error && "status" in error
}

function normalizeTimeOfDay(value: unknown): string {
  const raw = toStringValue(value)
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw)
  if (!match) return DEFAULT_PRESENTATION_REMINDER_AUTO_SEND.timeOfDay
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return DEFAULT_PRESENTATION_REMINDER_AUTO_SEND.timeOfDay
  }
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

function normalizeTimeZoneId(value: unknown): PresentationReminderTimeZoneId {
  const raw = toStringValue(value)
  if (TIMEZONE_SET.has(raw)) return raw as PresentationReminderTimeZoneId
  return DEFAULT_PRESENTATION_REMINDER_AUTO_SEND.timeZoneId
}

/** FE keeps templateId as string; wire as number when digits-only. */
export function toPresentationReminderTemplateIdPayload(
  templateId: string,
): string | number {
  const trimmed = toStringValue(templateId)
  if (/^\d+$/.test(trimmed)) return Number(trimmed)
  return trimmed
}

export function mapPresentationReminderAutoSend(
  raw: unknown,
): PresentationReminderAutoSend {
  if (raw == null || typeof raw !== "object") {
    return { ...DEFAULT_PRESENTATION_REMINDER_AUTO_SEND }
  }
  const item = raw as Record<string, unknown>
  return {
    enabled: Boolean(item.enabled ?? item.isEnabled ?? item.is_enabled),
    timeOfDay: normalizeTimeOfDay(item.timeOfDay ?? item.time_of_day),
    timeZoneId: normalizeTimeZoneId(item.timeZoneId ?? item.time_zone_id),
  }
}

function mapVacancyTypeIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const ids: string[] = []
  for (const entry of raw) {
    const id = toStringValue(entry)
    if (!id || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}

export function mapPresentationReminderTemplateConfig(
  raw: unknown,
): PresentationReminderTemplateConfig | null {
  if (raw == null || typeof raw !== "object") return null
  const item = raw as Record<string, unknown>
  const templateId = toStringValue(item.templateId ?? item.template_id)
  if (!templateId) return null

  const id = toOptionalStringValue(item.id ?? item.configId ?? item.config_id)

  return {
    ...(id ? { id } : {}),
    templateId,
    vacancyTypeIds: mapVacancyTypeIds(
      item.vacancyTypeIds ?? item.vacancy_type_ids,
    ),
    autoSend: mapPresentationReminderAutoSend(
      item.autoSend ?? item.auto_send,
    ),
  }
}

function mapLegacyBindingsToTemplates(
  raw: Record<string, unknown>,
): PresentationReminderTemplateConfig[] {
  const scheduleRaw =
    raw.schedule && typeof raw.schedule === "object"
      ? (raw.schedule as Record<string, unknown>)
      : {}

  const autoSend: PresentationReminderAutoSend = {
    enabled: Boolean(raw.enabled ?? raw.isEnabled ?? raw.is_enabled),
    timeOfDay: normalizeTimeOfDay(
      scheduleRaw.timeOfDay ?? scheduleRaw.time_of_day,
    ),
    timeZoneId: normalizeTimeZoneId(
      scheduleRaw.timeZoneId ?? scheduleRaw.time_zone_id,
    ),
  }

  const bindingsRaw = Array.isArray(raw.bindings) ? raw.bindings : []
  const byTemplate = new Map<string, string[]>()

  for (const bindingRaw of bindingsRaw) {
    if (bindingRaw == null || typeof bindingRaw !== "object") continue
    const binding = bindingRaw as Record<string, unknown>
    const vacancyTypeId = toStringValue(
      binding.vacancyTypeId ?? binding.vacancy_type_id,
    )
    const templateId = toStringValue(
      binding.templateId ?? binding.template_id,
    )
    if (!vacancyTypeId || !templateId) continue

    const existing = byTemplate.get(templateId) ?? []
    if (!existing.includes(vacancyTypeId)) {
      existing.push(vacancyTypeId)
    }
    byTemplate.set(templateId, existing)
  }

  return [...byTemplate.entries()].map(([templateId, vacancyTypeIds]) => ({
    templateId,
    vacancyTypeIds,
    autoSend: { ...autoSend },
  }))
}

export function mapPresentationRemindersSettings(
  raw: unknown,
): PresentationRemindersSettings {
  if (raw == null || typeof raw !== "object") {
    return { templates: [] }
  }

  const item = raw as Record<string, unknown>

  if (Array.isArray(item.templates)) {
    const templates = item.templates
      .map(mapPresentationReminderTemplateConfig)
      .filter(
        (config): config is PresentationReminderTemplateConfig =>
          config != null,
      )
    return { templates }
  }

  // Compat GET antigua: { enabled, schedule, bindings }
  if (
    Array.isArray(item.bindings) ||
    "enabled" in item ||
    "isEnabled" in item ||
    "is_enabled" in item ||
    "schedule" in item
  ) {
    return { templates: mapLegacyBindingsToTemplates(item) }
  }

  return { templates: [] }
}

export function mapPresentationRemindersNotifyResult(
  raw: unknown,
): PresentationRemindersNotifyResult {
  const item =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}

  return {
    recipients: toNumberValue(item.recipients),
    sent: toNumberValue(item.sent),
    failed: toNumberValue(item.failed),
    skipped: toNumberValue(item.skipped),
    skippedReason: toOptionalStringValue(
      item.skippedReason ?? item.skipped_reason,
    ),
  }
}

export function buildPresentationRemindersSettingsPayload(
  settings: PresentationRemindersSettings,
): { templates: PresentationReminderTemplateConfigPayload[] } {
  const templates = settings.templates
    .map((config): PresentationReminderTemplateConfigPayload | null => {
      const templateIdRaw = toStringValue(config.templateId)
      if (!templateIdRaw) return null
      const id = toOptionalStringValue(config.id)
      return {
        ...(id ? { id } : {}),
        templateId: toPresentationReminderTemplateIdPayload(templateIdRaw),
        vacancyTypeIds: mapVacancyTypeIds(config.vacancyTypeIds),
        autoSend: mapPresentationReminderAutoSend(config.autoSend),
      }
    })
    .filter(
      (config): config is PresentationReminderTemplateConfigPayload =>
        config != null,
    )

  return { templates }
}

export function hasSendableTemplateConfig(
  configs: readonly PresentationReminderTemplateConfig[],
): boolean {
  return configs.some(
    (config) =>
      toStringValue(config.templateId) !== "" &&
      config.vacancyTypeIds.length > 0,
  )
}

function mapNotificationTemplateOption(
  raw: unknown,
): NotificationTemplateOption | null {
  if (raw == null || typeof raw !== "object") return null
  const item = raw as Record<string, unknown>
  const type = normalizeTemplateType(
    String(item.$type ?? item.type ?? ""),
  )
  if (type !== "notification") return null
  const id = toStringValue(item.id ?? item.uuid)
  const name = toStringValue(item.name)
  if (!id || !name) return null
  return { id, name }
}

/**
 * Lista plantillas Notification para el selector de bindings.
 */
export async function listAdminNotificationTemplates(): Promise<
  NotificationTemplateOption[]
> {
  const items = await fetchAllHeaderPagedList(
    "/api/Templates",
    QUERY_FETCH_ALL_PAGE_SIZE,
  )

  return items
    .map(mapNotificationTemplateOption)
    .filter((item): item is NotificationTemplateOption => item != null)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
}

/**
 * Carga la configuración Admin. Ante 404 o payload vacío usa defaults.
 */
export async function fetchAdminPresentationRemindersSettings(): Promise<PresentationRemindersSettings> {
  try {
    const data = await apiClient.get(
      "/api/admin/presentation-reminders/settings",
    )
    return mapPresentationRemindersSettings(data)
  } catch (error) {
    if (isApiClientError(error) && error.status === 404) {
      return { templates: [] }
    }
    throw error
  }
}

export async function saveAdminPresentationRemindersSettings(
  settings: PresentationRemindersSettings,
): Promise<PresentationRemindersSettings> {
  const payload = buildPresentationRemindersSettingsPayload(settings)
  const data = await apiClient.put(
    "/api/admin/presentation-reminders/settings",
    payload,
  )
  return mapPresentationRemindersSettings(data)
}

/**
 * Dispara el envío manual del digest (preferir configId de una fila guardada).
 */
export async function notifyAdminPresentationReminders(
  request: NotifyPresentationRemindersRequest = {},
): Promise<PresentationRemindersNotifyResult> {
  const useSavedSettings = request.useSavedSettings !== false
  const configId = toOptionalStringValue(request.configId)
  const vacancyTypeIds = mapVacancyTypeIds(request.vacancyTypeIds)

  const body: Record<string, unknown> = {
    useSavedSettings,
  }

  if (configId) body.configId = configId
  if (vacancyTypeIds.length > 0) body.vacancyTypeIds = vacancyTypeIds

  if (request.templateId != null && request.templateId !== "") {
    const templateIdRaw = toStringValue(request.templateId)
    if (templateIdRaw) {
      body.templateId = toPresentationReminderTemplateIdPayload(templateIdRaw)
    }
  }

  const data = await apiClient.post(
    "/api/admin/presentation-reminders/notify",
    body,
  )
  return mapPresentationRemindersNotifyResult(data)
}
