"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  CircleDot,
  FileText,
  Mail,
  Plus,
  Save,
  Tags,
  Trash2,
} from "lucide-react"
import { useTranslations } from "next-intl"
import {
  ADMIN_SURFACE_CLASS,
  ADMIN_TABLE_CLASS,
  ADMIN_TD_CLASS,
  ADMIN_TH_CLASS,
  ADMIN_THEAD_CLASS,
  ADMIN_TR_CLASS,
  AdminErrorPanel,
  AdminLoadingState,
  AdminPageFrame,
} from "@/components/portal-admin/admin-page-chrome"
import DeleteConfirmModal from "@/components/rrhh/DeleteConfirmModal"
import { Button } from "@/components/ui/Button"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import Snackbar from "@/components/ui/Snackbar"
import { getApiErrorMessage } from "@/lib/api-error"
import {
  DEFAULT_PRESENTATION_REMINDER_AUTO_SEND,
  PRESENTATION_REMINDER_TIMEZONES,
  fetchAdminPresentationRemindersSettings,
  listAdminNotificationTemplates,
  notifyAdminPresentationReminders,
  saveAdminPresentationRemindersSettings,
  toPresentationReminderTemplateIdPayload,
  type NotificationTemplateOption,
  type PresentationReminderAutoSend,
  type PresentationReminderTemplateConfig,
  type PresentationReminderTimeZoneId,
} from "@/lib/api/admin-presentation-reminders"
import {
  listAdminVacancyCatalog,
  type VacancyCatalogAdminItem,
} from "@/lib/api/admin-vacancy-catalogs"

const CHECKBOX_CLASS =
  "h-4 w-4 rounded border-input text-vo-purple focus-visible:ring-2 focus-visible:ring-vo-purple"

const FIELD_CLASS =
  "h-10 w-full rounded-md border border-input bg-background px-3 font-sans text-sm text-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-vo-purple disabled:opacity-50"

type ReminderRow = {
  rowId: string
  configId: string | null
  templateId: string
  vacancyTypeIds: string[]
  autoSend: PresentationReminderAutoSend
}

function toSingleVacancyTypeIds(ids: readonly string[]): string[] {
  const first = ids.find((id) => id.trim() !== "")
  return first ? [first] : []
}

function createRowId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function createEmptyReminderRow(): ReminderRow {
  return {
    rowId: createRowId(),
    configId: null,
    templateId: "",
    vacancyTypeIds: [],
    autoSend: { ...DEFAULT_PRESENTATION_REMINDER_AUTO_SEND },
  }
}

function mapConfigsToRows(
  configs: readonly PresentationReminderTemplateConfig[],
): ReminderRow[] {
  return configs.map((config) => ({
    rowId: createRowId(),
    configId: config.id ?? null,
    templateId: config.templateId,
    vacancyTypeIds: toSingleVacancyTypeIds(config.vacancyTypeIds),
    autoSend: {
      ...DEFAULT_PRESENTATION_REMINDER_AUTO_SEND,
      ...config.autoSend,
    },
  }))
}

function mapRowsToConfigs(
  rows: readonly ReminderRow[],
): PresentationReminderTemplateConfig[] {
  return rows.map((row) => ({
    ...(row.configId ? { id: row.configId } : {}),
    templateId: row.templateId,
    vacancyTypeIds: toSingleVacancyTypeIds(row.vacancyTypeIds),
    autoSend: row.autoSend,
  }))
}

function canSendRow(row: ReminderRow): boolean {
  return (
    row.configId != null &&
    row.configId !== "" &&
    row.templateId !== "" &&
    row.vacancyTypeIds.length >= 1
  )
}

function cloneReminderRows(rows: readonly ReminderRow[]): ReminderRow[] {
  return rows.map((row) => ({
    rowId: row.rowId,
    configId: row.configId,
    templateId: row.templateId,
    vacancyTypeIds: [...row.vacancyTypeIds],
    autoSend: { ...row.autoSend },
  }))
}

function serializeRowConfig(row: ReminderRow): string {
  return JSON.stringify({
    templateId: row.templateId,
    vacancyTypeIds: [...row.vacancyTypeIds].sort(),
    autoSend: {
      enabled: row.autoSend.enabled,
      timeOfDay: row.autoSend.timeOfDay,
      timeZoneId: row.autoSend.timeZoneId,
    },
  })
}

function isRowDirty(
  row: ReminderRow,
  baselineById: ReadonlyMap<string, ReminderRow>,
): boolean {
  const baseline = baselineById.get(row.rowId)
  if (!baseline) return true
  return serializeRowConfig(row) !== serializeRowConfig(baseline)
}

function hasUnsavedReminderChanges(
  rows: readonly ReminderRow[],
  baseline: readonly ReminderRow[],
): boolean {
  if (rows.length !== baseline.length) return true
  const baselineById = new Map(baseline.map((row) => [row.rowId, row]))
  if (rows.some((row) => isRowDirty(row, baselineById))) return true
  const currentIds = new Set(rows.map((row) => row.rowId))
  return baseline.some((row) => !currentIds.has(row.rowId))
}

export function AdminPresentationRemindersContent() {
  const t = useTranslations("AdminPortal.presentationReminders")

  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [vacancyTypes, setVacancyTypes] = useState<VacancyCatalogAdminItem[]>(
    [],
  )
  const [templates, setTemplates] = useState<NotificationTemplateOption[]>([])
  const [rows, setRows] = useState<ReminderRow[]>([])
  const [baselineRows, setBaselineRows] = useState<ReminderRow[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [pendingRowId, setPendingRowId] = useState<string | null>(null)
  const [sendingRowId, setSendingRowId] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    variant: "success" | "error" | "warning"
    message: string
  }>({
    open: false,
    variant: "success",
    message: "",
  })

  const showSnackbar = useCallback(
    (variant: "success" | "error" | "warning", message: string) => {
      setSnackbar({ open: true, variant, message })
    },
    [],
  )

  const isSending = sendingRowId != null
  const isBusy = isSaving || isSending
  const canEditTable = templates.length > 0 && vacancyTypes.length > 0
  const isConfirmOpen = pendingRowId != null
  const baselineById = useMemo(
    () => new Map(baselineRows.map((row) => [row.rowId, row])),
    [baselineRows],
  )
  const hasUnsavedChanges = hasUnsavedReminderChanges(rows, baselineRows)

  const applyLoadedRows = useCallback((nextRows: ReminderRow[]) => {
    setRows(nextRows)
    setBaselineRows(cloneReminderRows(nextRows))
  }, [])

  const loadPage = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      const [types, notificationTemplates, settings] = await Promise.all([
        listAdminVacancyCatalog("vacancyTypes"),
        listAdminNotificationTemplates(),
        fetchAdminPresentationRemindersSettings(),
      ])

      const activeTypes = types.filter((item) => item.isActive)
      setVacancyTypes(activeTypes)
      setTemplates(notificationTemplates)
      applyLoadedRows(mapConfigsToRows(settings.templates))
    } catch (error) {
      setLoadError(getApiErrorMessage(error) || t("errors.loadFailed"))
    } finally {
      setIsLoading(false)
    }
  }, [applyLoadedRows, t])

  useEffect(() => {
    void loadPage()
  }, [loadPage])

  const updateRow = (
    rowId: string,
    updater: (current: ReminderRow) => ReminderRow,
  ) => {
    setRows((current) =>
      current.map((row) => (row.rowId === rowId ? updater(row) : row)),
    )
  }

  const handleAddRow = () => {
    if (isBusy || !canEditTable) return
    setRows((current) => [...current, createEmptyReminderRow()])
  }

  const handleRemoveRow = (rowId: string) => {
    if (isBusy) return
    setRows((current) => current.filter((row) => row.rowId !== rowId))
  }

  const handleTemplateChange = (rowId: string, templateId: string) => {
    updateRow(rowId, (row) => ({
      ...row,
      templateId,
      vacancyTypeIds: templateId ? row.vacancyTypeIds : [],
      autoSend: templateId
        ? row.autoSend
        : { ...DEFAULT_PRESENTATION_REMINDER_AUTO_SEND },
    }))
  }

  const handleVacancyTypeChange = (
    rowId: string,
    vacancyTypeId: string,
  ) => {
    updateRow(rowId, (row) => ({
      ...row,
      vacancyTypeIds: toSingleVacancyTypeIds(
        vacancyTypeId ? [vacancyTypeId] : [],
      ),
    }))
  }

  const handleAutoSendEnabledChange = (rowId: string, enabled: boolean) => {
    updateRow(rowId, (row) => ({
      ...row,
      autoSend: { ...row.autoSend, enabled },
    }))
  }

  const handleAutoSendTimeChange = (rowId: string, timeOfDay: string) => {
    updateRow(rowId, (row) => ({
      ...row,
      autoSend: { ...row.autoSend, timeOfDay },
    }))
  }

  const handleAutoSendTimeZoneChange = (
    rowId: string,
    timeZoneId: PresentationReminderTimeZoneId,
  ) => {
    updateRow(rowId, (row) => ({
      ...row,
      autoSend: { ...row.autoSend, timeZoneId },
    }))
  }

  const handleSave = async () => {
    if (isBusy || !canEditTable) return
    setIsSaving(true)

    try {
      const saved = await saveAdminPresentationRemindersSettings({
        templates: mapRowsToConfigs(rows),
      })
      applyLoadedRows(mapConfigsToRows(saved.templates))
      showSnackbar("success", t("toasts.saved"))
    } catch (error) {
      showSnackbar("error", getApiErrorMessage(error) || t("toasts.saveError"))
    } finally {
      setIsSaving(false)
    }
  }

  const handleOpenConfirm = (rowId: string) => {
    const row = rows.find((item) => item.rowId === rowId)
    if (isBusy || !row || !canSendRow(row) || isRowDirty(row, baselineById)) {
      return
    }
    setPendingRowId(rowId)
  }

  const handleCloseConfirm = () => {
    if (isSending) return
    setPendingRowId(null)
  }

  const handleConfirmSend = async () => {
    if (isSending || pendingRowId == null) return
    const row = rows.find((item) => item.rowId === pendingRowId)
    if (!row || !canSendRow(row) || isRowDirty(row, baselineById)) return

    setSendingRowId(pendingRowId)

    try {
      const result = await notifyAdminPresentationReminders({
        useSavedSettings: true,
        configId: row.configId ?? undefined,
        templateId: toPresentationReminderTemplateIdPayload(row.templateId),
        vacancyTypeIds: row.vacancyTypeIds,
      })

      if (result.skippedReason) {
        showSnackbar(
          "warning",
          t("toasts.skipped", {
            reason: result.skippedReason,
            sent: result.sent,
            failed: result.failed,
            recipients: result.recipients,
          }),
        )
      } else {
        showSnackbar(
          "success",
          t("toasts.success", {
            sent: result.sent,
            failed: result.failed,
            recipients: result.recipients,
          }),
        )
      }

      setPendingRowId(null)
    } catch (error) {
      showSnackbar("error", getApiErrorMessage(error) || t("toasts.error"))
    } finally {
      setSendingRowId(null)
    }
  }

  return (
    <AdminPageFrame labelledBy="admin-presentation-reminders-title">
      <PortalPageHeader
        id="admin-presentation-reminders-title"
        title={t("page.title")}
        description={t("page.description")}
        layout="split"
        contentClassName="max-w-3xl"
      />

      {isLoading ? (
        <AdminLoadingState label={t("loading")} />
      ) : loadError ? (
        <AdminErrorPanel
          message={loadError}
          onRetry={() => void loadPage()}
          retryLabel={t("actions.retry")}
          ariaLabel={t("errors.loadAria")}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <section
            className={`${ADMIN_SURFACE_CLASS} p-6`}
            aria-labelledby="presentation-reminders-templates-title"
          >
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col gap-2">
                <h2
                  id="presentation-reminders-templates-title"
                  className="font-sans text-base font-semibold text-foreground"
                >
                  {t("templates.title")}
                </h2>
                <p className="font-sans text-sm text-muted-foreground">
                  {t("templates.description")}
                </p>
              </div>
              {canEditTable ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddRow}
                  disabled={isBusy}
                  aria-label={t("templates.add")}
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  {t("templates.add")}
                </Button>
              ) : null}
            </div>

            {templates.length === 0 ? (
              <div className="rounded-md border border-border bg-muted/30 p-4">
                <p className="font-sans text-sm text-foreground">
                  {t("empty.noTemplates")}
                </p>
                <Link
                  href="/portal-admin/plantillas"
                  className="mt-3 inline-flex min-h-11 items-center gap-2 font-sans text-sm font-medium text-vo-purple underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple"
                >
                  <FileText className="h-4 w-4" aria-hidden />
                  {t("empty.goToTemplates")}
                </Link>
              </div>
            ) : vacancyTypes.length === 0 ? (
              <div className="rounded-md border border-border bg-muted/30 p-4">
                <p className="font-sans text-sm text-foreground">
                  {t("empty.noVacancyTypes")}
                </p>
                <Link
                  href="/portal-admin/vacantes/tipos"
                  className="mt-3 inline-flex min-h-11 items-center gap-2 font-sans text-sm font-medium text-vo-purple underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple"
                >
                  <Tags className="h-4 w-4" aria-hidden />
                  {t("empty.goToVacancyTypes")}
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table
                  className={ADMIN_TABLE_CLASS}
                  aria-label={t("templates.tableAria")}
                >
                  <thead className={ADMIN_THEAD_CLASS}>
                    <tr>
                      <th className={ADMIN_TH_CLASS} scope="col">
                        {t("templates.columns.template")}
                      </th>
                      <th className={ADMIN_TH_CLASS} scope="col">
                        {t("templates.columns.vacancyTypes")}
                      </th>
                      <th className={ADMIN_TH_CLASS} scope="col">
                        {t("templates.columns.autoSend")}
                      </th>
                      <th className={ADMIN_TH_CLASS} scope="col">
                        <span className="sr-only">{t("templates.remove")}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr className={ADMIN_TR_CLASS}>
                        <td
                          className={ADMIN_TD_CLASS}
                          colSpan={4}
                        >
                          <div className="flex flex-col items-start gap-3 py-2">
                            <p className="font-sans text-sm text-muted-foreground">
                              {t("templates.emptyRows")}
                            </p>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={handleAddRow}
                              disabled={isBusy}
                              aria-label={t("templates.add")}
                            >
                              <Plus className="h-4 w-4" aria-hidden />
                              {t("templates.add")}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => {
                        const hasTemplate = row.templateId !== ""
                        const autoSend =
                          row.autoSend ?? DEFAULT_PRESENTATION_REMINDER_AUTO_SEND
                        const fieldsDisabled = isBusy || !hasTemplate
                        const scheduleDisabled =
                          fieldsDisabled || !autoSend.enabled
                        const rowDirty = isRowDirty(row, baselineById)
                        const canSendThisRow =
                          canSendRow(row) && !rowDirty && !isBusy
                        const selectedVacancyTypeId =
                          row.vacancyTypeIds[0] ?? ""

                        return (
                          <tr
                            key={row.rowId}
                            className={`${ADMIN_TR_CLASS} ${
                              rowDirty
                                ? "border-l-4 border-l-amber-500 bg-amber-500/5"
                                : ""
                            }`}
                          >
                            <td className={`${ADMIN_TD_CLASS} align-top`}>
                              <div className="flex h-full min-h-[10.5rem] min-w-[14rem] flex-col gap-2">
                                <select
                                  className={FIELD_CLASS}
                                  value={row.templateId}
                                  disabled={isBusy}
                                  aria-label={t("templates.columns.template")}
                                  onChange={(event) =>
                                    handleTemplateChange(
                                      row.rowId,
                                      event.target.value,
                                    )
                                  }
                                >
                                  <option value="">
                                    {t("templates.selectTemplate")}
                                  </option>
                                  {templates.map((template) => (
                                    <option
                                      key={template.id}
                                      value={template.id}
                                    >
                                      {template.name}
                                    </option>
                                  ))}
                                </select>
                                {rowDirty ? (
                                  <span
                                    className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 font-sans text-xs font-medium text-amber-800 dark:text-amber-200"
                                    title={t("templates.unsavedHint")}
                                  >
                                    <CircleDot
                                      className="size-3.5 shrink-0"
                                      aria-hidden
                                    />
                                    {t("templates.unsaved")}
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className={`${ADMIN_TD_CLASS} align-top`}>
                              <select
                                className={`${FIELD_CLASS} min-w-[14rem]`}
                                value={selectedVacancyTypeId}
                                disabled={fieldsDisabled}
                                aria-label={t("templates.columns.vacancyTypes")}
                                onChange={(event) =>
                                  handleVacancyTypeChange(
                                    row.rowId,
                                    event.target.value,
                                  )
                                }
                              >
                                <option value="">
                                  {t("templates.noneOption")}
                                </option>
                                {vacancyTypes.map((vacancyType) => (
                                  <option
                                    key={vacancyType.id}
                                    value={vacancyType.id}
                                  >
                                    {vacancyType.displayName}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className={`${ADMIN_TD_CLASS} align-top`}>
                              <div className="flex min-w-[16rem] flex-col gap-3">
                                <label className="flex min-h-11 cursor-pointer items-center gap-3 font-sans text-sm text-foreground">
                                  <input
                                    type="checkbox"
                                    checked={autoSend.enabled}
                                    disabled={fieldsDisabled}
                                    onChange={(event) =>
                                      handleAutoSendEnabledChange(
                                        row.rowId,
                                        event.target.checked,
                                      )
                                    }
                                    className={CHECKBOX_CLASS}
                                  />
                                  {t("templates.autoSendEnabled")}
                                </label>

                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div className="flex flex-col gap-2">
                                    <label
                                      htmlFor={`presentation-reminders-time-${row.rowId}`}
                                      className="font-sans text-sm font-medium text-foreground"
                                    >
                                      {t("templates.timeOfDay")}
                                    </label>
                                    <input
                                      id={`presentation-reminders-time-${row.rowId}`}
                                      type="time"
                                      value={autoSend.timeOfDay}
                                      disabled={scheduleDisabled}
                                      onChange={(event) =>
                                        handleAutoSendTimeChange(
                                          row.rowId,
                                          event.target.value,
                                        )
                                      }
                                      className={FIELD_CLASS}
                                    />
                                  </div>

                                  <div className="flex flex-col gap-2">
                                    <label
                                      htmlFor={`presentation-reminders-timezone-${row.rowId}`}
                                      className="font-sans text-sm font-medium text-foreground"
                                    >
                                      {t("templates.timeZone")}
                                    </label>
                                    <select
                                      id={`presentation-reminders-timezone-${row.rowId}`}
                                      className={FIELD_CLASS}
                                      value={autoSend.timeZoneId}
                                      disabled={scheduleDisabled}
                                      onChange={(event) =>
                                        handleAutoSendTimeZoneChange(
                                          row.rowId,
                                          event.target
                                            .value as PresentationReminderTimeZoneId,
                                        )
                                      }
                                    >
                                      {PRESENTATION_REMINDER_TIMEZONES.map(
                                        (zone) => (
                                          <option key={zone} value={zone}>
                                            {zone}
                                          </option>
                                        ),
                                      )}
                                    </select>
                                  </div>
                                </div>

                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => handleOpenConfirm(row.rowId)}
                                  disabled={!canSendThisRow}
                                  loading={sendingRowId === row.rowId}
                                  aria-label={t("manual.title")}
                                >
                                  <Mail className="h-4 w-4" aria-hidden />
                                  {t("manual.title")}
                                </Button>
                              </div>
                            </td>
                            <td className={`${ADMIN_TD_CLASS} align-top`}>
                              <button
                                type="button"
                                className="inline-flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple disabled:opacity-50"
                                disabled={isBusy}
                                aria-label={t("templates.remove")}
                                onClick={() => handleRemoveRow(row.rowId)}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden />
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="primary"
                onClick={() => void handleSave()}
                disabled={isBusy || !canEditTable || !hasUnsavedChanges}
                loading={isSaving}
                aria-label={t("actions.save")}
              >
                <Save className="h-4 w-4" aria-hidden />
                {t("actions.save")}
              </Button>
              {hasUnsavedChanges ? (
                <span className="inline-flex items-center gap-1.5 font-sans text-sm text-amber-800 dark:text-amber-200">
                  <CircleDot className="size-3.5 shrink-0" aria-hidden />
                  {t("templates.unsavedHint")}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={isConfirmOpen}
        onClose={handleCloseConfirm}
        onConfirm={() => void handleConfirmSend()}
        title={t("confirm.title")}
        message={t("confirm.message")}
        confirmText={t("confirm.confirm")}
        loading={isSending}
        intent="primary"
      />

      <Snackbar
        open={snackbar.open}
        variant={snackbar.variant}
        message={snackbar.message}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
      />
    </AdminPageFrame>
  )
}
