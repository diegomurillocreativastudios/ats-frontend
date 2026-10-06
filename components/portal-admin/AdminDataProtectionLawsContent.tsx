"use client"

import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react"
import { Scale } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  ADMIN_TD_CLASS,
  ADMIN_TH_CLASS,
  ADMIN_THEAD_CLASS,
  ADMIN_TR_CLASS,
  AdminPageFrame,
} from "@/components/portal-admin/admin-page-chrome"
import {
  ADMIN_CATALOG_ACTIONS_TD_CLASS,
  AdminCatalogCheckboxField,
  AdminCatalogFixedTable,
  AdminCatalogFormModal,
  AdminCatalogListLayout,
  AdminCatalogRowActions,
} from "@/components/portal-admin/admin-catalog-list-layout"
import DeleteConfirmModal from "@/components/rrhh/DeleteConfirmModal"
import { Input } from "@/components/ui/Input"
import Snackbar from "@/components/ui/Snackbar"
import { getApiErrorMessage } from "@/lib/api-error"
import {
  createAdminDataProtectionLaw,
  deleteAdminDataProtectionLaw,
  listAdminDataProtectionLaws,
  updateAdminDataProtectionLaw,
  type DataProtectionLaw,
} from "@/lib/api/data-protection-laws"

const LOCALES = ["es", "en", "de", "fr", "it"] as const
const CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const NAME_MAX = 200
const CODE_MAX = 80
const REFERENCE_MAX = 300
const SUMMARY_MAX = 500

interface LawFormState {
  displayName: string
  code: string
  jurisdictionChoice: "SV" | "EU" | "OTHER"
  jurisdictionOther: string
  officialReference: string
  summary: string
  locale: string
  body: string
  isActive: boolean
}

interface LawFormErrors {
  displayName?: string
  code?: string
  jurisdiction?: string
  officialReference?: string
  summary?: string
  locale?: string
}

function emptyForm(): LawFormState {
  return {
    displayName: "",
    code: "",
    jurisdictionChoice: "SV",
    jurisdictionOther: "",
    officialReference: "",
    summary: "",
    locale: "es",
    body: "",
    isActive: true,
  }
}

function formFromLaw(law: DataProtectionLaw): LawFormState {
  const code = law.jurisdictionCode.toUpperCase()
  const known = code === "SV" || code === "EU"
  return {
    displayName: law.displayName,
    code: law.code,
    jurisdictionChoice: known ? code : "OTHER",
    jurisdictionOther: known ? "" : law.jurisdictionCode,
    officialReference: law.officialReference,
    summary: law.summary,
    locale: law.locale || "es",
    body: law.body,
    isActive: law.isActive,
  }
}

function jurisdictionFromForm(form: LawFormState): string {
  if (form.jurisdictionChoice === "OTHER") {
    return form.jurisdictionOther.trim().toUpperCase()
  }
  return form.jurisdictionChoice
}

function validateForm(
  form: LawFormState,
  mode: "create" | "edit",
  t: (key: string, values?: Record<string, string | number>) => string,
): LawFormErrors {
  const errors: LawFormErrors = {}
  const name = form.displayName.trim()
  if (name === "") errors.displayName = t("validation.nameRequired")
  else if (name.length > NAME_MAX) errors.displayName = t("validation.nameMax", { max: NAME_MAX })

  if (mode === "create") {
    const code = form.code.trim()
    if (code === "") errors.code = t("validation.codeRequired")
    else if (code.length > CODE_MAX) errors.code = t("validation.codeMax", { max: CODE_MAX })
    else if (!CODE_PATTERN.test(code)) errors.code = t("validation.codePattern")
  }

  const jurisdiction = jurisdictionFromForm(form)
  if (jurisdiction === "") errors.jurisdiction = t("validation.jurisdictionRequired")
  else if (!/^[A-Z0-9]{2,8}$/.test(jurisdiction)) {
    errors.jurisdiction = t("validation.jurisdictionPattern")
  }

  if (form.officialReference.trim().length > REFERENCE_MAX) {
    errors.officialReference = t("validation.referenceMax", { max: REFERENCE_MAX })
  }
  if (form.summary.trim().length > SUMMARY_MAX) {
    errors.summary = t("validation.summaryMax", { max: SUMMARY_MAX })
  }
  if (!LOCALES.includes(form.locale as (typeof LOCALES)[number])) {
    errors.locale = t("validation.localeRequired")
  }
  return errors
}

function readStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status
    return typeof status === "number" ? status : undefined
  }
  return undefined
}

export function AdminDataProtectionLawsContent() {
  const t = useTranslations("AdminPortal.dataProtectionLaws")

  const [items, setItems] = useState<DataProtectionLaw[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formState, setFormState] = useState<LawFormState>(emptyForm)
  const [formErrors, setFormErrors] = useState<LawFormErrors>({})
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DataProtectionLaw | null>(null)
  const [busyAction, setBusyAction] = useState(false)
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    variant: "success" | "error"
    message: string
  }>({ open: false, variant: "success", message: "" })

  const showSnackbar = useCallback((variant: "success" | "error", message: string) => {
    setSnackbar({ open: true, variant, message })
  }, [])

  const loadList = useCallback(async () => {
    setLoading(true)
    setListError(null)
    try {
      setItems(await listAdminDataProtectionLaws())
    } catch (error) {
      setItems([])
      setListError(getApiErrorMessage(error) || t("errors.loadCatalog"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadList()
  }, [loadList])

  const handleOpenCreate = () => {
    setFormMode("create")
    setEditingId(null)
    setFormState(emptyForm())
    setFormErrors({})
    setIsFormOpen(true)
  }

  const handleOpenEdit = (item: DataProtectionLaw) => {
    setFormMode("edit")
    setEditingId(item.id)
    setFormState(formFromLaw(item))
    setFormErrors({})
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    if (formSubmitting) return
    setIsFormOpen(false)
    setEditingId(null)
    setFormErrors({})
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (formSubmitting) return
    const errors = validateForm(formState, formMode, (key, values) => t(key, values))
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    const payload = {
      displayName: formState.displayName,
      jurisdictionCode: jurisdictionFromForm(formState),
      officialReference: formState.officialReference,
      summary: formState.summary,
      locale: formState.locale,
      body: formState.body,
      isActive: formState.isActive,
    }

    setFormSubmitting(true)
    try {
      if (formMode === "create") {
        await createAdminDataProtectionLaw({ ...payload, code: formState.code.trim() })
        showSnackbar("success", t("toasts.created"))
      } else if (editingId) {
        await updateAdminDataProtectionLaw(editingId, payload)
        showSnackbar("success", t("toasts.updated"))
      }
      setIsFormOpen(false)
      await loadList()
    } catch (error) {
      showSnackbar("error", getApiErrorMessage(error) || t("errors.saveFailed"))
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setBusyAction(true)
    try {
      await deleteAdminDataProtectionLaw(deleteTarget.id)
      setDeleteTarget(null)
      showSnackbar("success", t("toasts.deleted"))
      await loadList()
    } catch (error) {
      const status = readStatus(error)
      if (status === 409) {
        showSnackbar("error", t("errors.deleteConflict"))
      } else {
        showSnackbar("error", getApiErrorMessage(error) || t("errors.deleteFailed"))
      }
    } finally {
      setBusyAction(false)
    }
  }

  const isEmpty = !loading && !listError && items.length === 0

  return (
    <AdminPageFrame labelledBy="portal-admin-data-protection-laws-heading">
      <AdminCatalogListLayout
        headingId="portal-admin-data-protection-laws-heading"
        title={t("page.title")}
        description={t("page.description")}
        loading={loading}
        error={listError}
        onRetry={() => void loadList()}
        retryLabel={t("actions.retry")}
        errorAria={t("aria.loadError")}
        isEmpty={isEmpty}
        emptyIcon={Scale}
        emptyTitle={t("emptyStates.noItems")}
        emptyDescription={t("emptyStates.createHint")}
        onCreate={handleOpenCreate}
        createLabel={t("page.createCta")}
        onRefresh={() => void loadList()}
        refreshLabel={t("actions.refresh")}
        listAria={t("aria.list")}
      >
        <AdminCatalogFixedTable ariaLabel={t("aria.list")}>
          <thead className={ADMIN_THEAD_CLASS}>
            <tr>
              <th className={ADMIN_TH_CLASS}>{t("table.name")}</th>
              <th className={ADMIN_TH_CLASS}>{t("table.jurisdiction")}</th>
              <th className={ADMIN_TH_CLASS}>{t("table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className={ADMIN_TR_CLASS}>
                <td className={ADMIN_TD_CLASS}>
                  <div className="font-medium text-foreground">{item.displayName}</div>
                  <div className="text-xs text-muted-foreground">{item.code}</div>
                  {item.body.trim() === "" ? (
                    <span className="mt-1 inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                      {t("table.missingBody")}
                    </span>
                  ) : null}
                </td>
                <td className={ADMIN_TD_CLASS}>
                  <div>{item.jurisdictionCode}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.isActive ? t("table.active") : t("table.inactive")}
                  </div>
                </td>
                <td className={ADMIN_CATALOG_ACTIONS_TD_CLASS}>
                  <AdminCatalogRowActions
                    onEdit={() => handleOpenEdit(item)}
                    onDelete={() => setDeleteTarget(item)}
                    editLabel={t("actions.edit")}
                    deleteLabel={t("actions.delete")}
                    disabled={busyAction}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </AdminCatalogFixedTable>
      </AdminCatalogListLayout>

      <AdminCatalogFormModal
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        title={formMode === "create" ? t("form.createTitle") : t("form.editTitle")}
        formId="data-protection-law-form"
        submitting={formSubmitting}
        submitLabel={formMode === "create" ? t("form.save") : t("form.saveChanges")}
        cancelLabel={t("actions.cancel")}
      >
        <form id="data-protection-law-form" className="space-y-4" onSubmit={handleSubmit}>
          <Input
            id="law-display-name"
            name="displayName"
            label={t("form.nameLabel")}
            required
            value={formState.displayName}
            error={formErrors.displayName || ""}
            placeholder=""
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setFormState((current) => ({ ...current, displayName: event.target.value }))
            }
            disabled={formSubmitting}
          />
          <Input
            id="law-code"
            name="code"
            label={t("form.codeLabel")}
            required={formMode === "create"}
            value={formState.code}
            error={formErrors.code || ""}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setFormState((current) => ({ ...current, code: event.target.value }))
            }
            disabled={formSubmitting || formMode === "edit"}
            placeholder={t("form.codePlaceholder")}
          />
          <div className="flex flex-col gap-2">
            <label htmlFor="law-jurisdiction" className="text-sm font-medium text-foreground">
              {t("form.jurisdictionLabel")}
              <span className="ml-1 text-vo-pink">*</span>
            </label>
            <select
              id="law-jurisdiction"
              value={formState.jurisdictionChoice}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  jurisdictionChoice: event.target.value as LawFormState["jurisdictionChoice"],
                }))
              }
              disabled={formSubmitting}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple"
            >
              <option value="SV">{t("form.jurisdictionSv")}</option>
              <option value="EU">{t("form.jurisdictionEu")}</option>
              <option value="OTHER">{t("form.jurisdictionOther")}</option>
            </select>
            {formState.jurisdictionChoice === "OTHER" ? (
              <Input
                id="law-jurisdiction-other"
                name="jurisdictionOther"
                label={t("form.jurisdictionOtherLabel")}
                required
                value={formState.jurisdictionOther}
                error={formErrors.jurisdiction || ""}
                placeholder=""
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setFormState((current) => ({
                    ...current,
                    jurisdictionOther: event.target.value,
                  }))
                }
                disabled={formSubmitting}
              />
            ) : formErrors.jurisdiction ? (
              <p className="font-sans text-sm text-vo-pink" role="alert">
                {formErrors.jurisdiction}
              </p>
            ) : null}
          </div>
          <Input
            id="law-reference"
            name="officialReference"
            label={t("form.referenceLabel")}
            value={formState.officialReference}
            error={formErrors.officialReference || ""}
            placeholder=""
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setFormState((current) => ({ ...current, officialReference: event.target.value }))
            }
            disabled={formSubmitting}
          />
          <div className="flex flex-col gap-2">
            <label htmlFor="law-summary" className="text-sm font-medium text-foreground">
              {t("form.summaryLabel")}
            </label>
            <textarea
              id="law-summary"
              rows={3}
              value={formState.summary}
              onChange={(event) =>
                setFormState((current) => ({ ...current, summary: event.target.value }))
              }
              disabled={formSubmitting}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple disabled:cursor-not-allowed disabled:opacity-50"
            />
            {formErrors.summary ? (
              <p className="font-sans text-sm text-vo-pink" role="alert">
                {formErrors.summary}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="law-locale" className="text-sm font-medium text-foreground">
              {t("form.localeLabel")}
              <span className="ml-1 text-vo-pink">*</span>
            </label>
            <select
              id="law-locale"
              value={formState.locale}
              onChange={(event) =>
                setFormState((current) => ({ ...current, locale: event.target.value }))
              }
              disabled={formSubmitting}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple"
            >
              {LOCALES.map((locale) => (
                <option key={locale} value={locale}>
                  {t(`form.locales.${locale}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="law-body" className="text-sm font-medium text-foreground">
              {t("form.bodyLabel")}
            </label>
            <textarea
              id="law-body"
              rows={8}
              value={formState.body}
              onChange={(event) =>
                setFormState((current) => ({ ...current, body: event.target.value }))
              }
              disabled={formSubmitting}
              placeholder={t("form.bodyPlaceholder")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <AdminCatalogCheckboxField
            id="law-active"
            checked={formState.isActive}
            onChange={(checked) => setFormState((current) => ({ ...current, isActive: checked }))}
            label={t("form.activeLabel")}
            hint={t("form.activeHint")}
            disabled={formSubmitting}
          />
        </form>
      </AdminCatalogFormModal>

      <DeleteConfirmModal
        isOpen={deleteTarget != null}
        onClose={() => {
          if (!busyAction) setDeleteTarget(null)
        }}
        onConfirm={() => void handleConfirmDelete()}
        title={t("deleteConfirm.title")}
        message={t("deleteConfirm.message")}
        confirmText={t("actions.delete")}
        cancelText={t("actions.cancel")}
        loading={busyAction}
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
