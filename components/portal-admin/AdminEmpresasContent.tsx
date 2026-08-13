"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react"
import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Landmark,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react"
import { useTranslations } from "next-intl"
import Modal from "@/components/ui/Modal"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import Snackbar from "@/components/ui/Snackbar"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { getApiErrorMessage } from "@/lib/api-error"
import {
  LOGO_ACCEPT,
  LOGO_EXTENSIONS,
  LOGO_TYPES,
  UPLOAD_MAX_BYTES_5_MB,
  getUploadApiErrorMessage,
  validateUploadFile,
} from "@/lib/upload-constraints"
import {
  buildLogoDataUri,
  createAdminCompany,
  createAdminCompanyWithLogo,
  deleteAdminCompanyLogo,
  fetchAdminCompaniesList,
  fetchAdminCompanyById,
  updateAdminCompany,
  updateAdminCompanyWithLogo,
  type AdminCompany,
  type AdminCompanyFormValues,
  type AdminCompanyLogo,
} from "@/lib/api/admin-companies"

const MAX_LOGO_BYTES = UPLOAD_MAX_BYTES_5_MB
const ACCEPTED_LOGO_TYPES = LOGO_ACCEPT

interface CompanyFormState {
  name: string
  industry: string
  isActive: boolean
}

interface CompanyFormErrors {
  name?: string
}

const checkboxVoClass =
  "h-4 w-4 shrink-0 rounded border border-input accent-vo-purple text-vo-purple focus:outline-none focus:ring-2 focus:ring-vo-purple/50 focus:ring-offset-1 disabled:opacity-50"

const emptyFormState = (): CompanyFormState => ({
  name: "",
  industry: "",
  isActive: true,
})

function formatCreatedAt(value: string): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("es", { dateStyle: "medium", timeStyle: "short" })
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  )
  const value = bytes / 1024 ** i
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}

function companyToFormState(company: AdminCompany): CompanyFormState {
  return {
    name: company.name,
    industry: company.industry ?? "",
    isActive: company.isActive,
  }
}

function buildPayload(state: CompanyFormState): AdminCompanyFormValues {
  return {
    name: state.name.trim(),
    industry: state.industry.trim() || undefined,
    isActive: state.isActive,
  }
}

function validateForm(
  state: CompanyFormState,
  nameRequiredMessage: string
): CompanyFormErrors {
  const errors: CompanyFormErrors = {}
  if (!state.name.trim()) {
    errors.name = nameRequiredMessage
  }
  return errors
}

export default function AdminEmpresasContent() {
  const t = useTranslations("AdminPortal.companies")
  const [items, setItems] = useState<AdminCompany[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null)
  const [formState, setFormState] = useState<CompanyFormState>(emptyFormState)
  const [formErrors, setFormErrors] = useState<CompanyFormErrors>({})
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [formLoadError, setFormLoadError] = useState<string | null>(null)

  const [currentLogo, setCurrentLogo] = useState<AdminCompanyLogo | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)
  const [logoRemoved, setLogoRemoved] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement | null>(null)

  const [togglingCompanyIds, setTogglingCompanyIds] = useState<Set<string>>(
    () => new Set()
  )

  const [snackbar, setSnackbar] = useState<{
    open: boolean
    variant: "success" | "error"
    message: string
  }>({ open: false, variant: "success", message: "" })

  const showSnackbar = (variant: "success" | "error", message: string) => {
    setSnackbar({ open: true, variant, message })
  }

  const loadList = useCallback(async () => {
    setLoading(true)
    setListError(null)
    try {
      const res = await fetchAdminCompaniesList({
        page,
        pageSize,
        includeInactive: true,
      })
      setItems(res.items)
      setTotalCount(res.totalCount)
      if (res.page !== page) setPage(res.page)
    } catch (err: unknown) {
      const rec = err as { status?: number }
      const msg = getApiErrorMessage(err)
      setListError(rec.status === 403 ? t("errors.listForbidden") : msg)
      setItems([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, t])

  useEffect(() => {
    void loadList()
  }, [loadList])

  useEffect(() => {
    if (!logoFile) {
      setLogoPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(logoFile)
    setLogoPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [logoFile])

  const resetLogoState = () => {
    setCurrentLogo(null)
    setLogoFile(null)
    setLogoRemoved(false)
    setLogoError(null)
    if (logoInputRef.current) logoInputRef.current.value = ""
  }

  const handleLogoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    if (!file) {
      setLogoFile(null)
      return
    }
    const validation = validateUploadFile(file, {
      types: LOGO_TYPES,
      extensions: LOGO_EXTENSIONS,
      maxBytes: MAX_LOGO_BYTES,
    })
    if (!validation.valid) {
      if (validation.reason === "size") {
        setLogoError(t("errors.logoSize"))
      } else {
        setLogoError(t("errors.logoType"))
      }
      event.target.value = ""
      return
    }
    setLogoError(null)
    setLogoRemoved(false)
    setLogoFile(file)
  }

  const handleOpenLogoPicker = () => {
    logoInputRef.current?.click()
  }

  const handleCancelLogoChange = () => {
    setLogoFile(null)
    setLogoError(null)
    if (logoInputRef.current) logoInputRef.current.value = ""
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    setLogoRemoved(true)
    setLogoError(null)
    if (logoInputRef.current) logoInputRef.current.value = ""
  }

  const handleUndoRemoveLogo = () => {
    setLogoRemoved(false)
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize) || 1)

  const handleOpenCreate = () => {
    setFormMode("create")
    setEditingCompanyId(null)
    setFormState(emptyFormState())
    setFormErrors({})
    setFormLoadError(null)
    setFormLoading(false)
    resetLogoState()
    setFormOpen(true)
  }

  const handleOpenEdit = async (companyId: string) => {
    setFormMode("edit")
    setEditingCompanyId(companyId)
    setFormOpen(true)
    setFormLoading(true)
    setFormLoadError(null)
    setFormErrors({})
    resetLogoState()

    try {
      const company = await fetchAdminCompanyById(companyId)
      setFormState(companyToFormState(company))
      setCurrentLogo(company.logo)
    } catch (err: unknown) {
      setFormLoadError(getApiErrorMessage(err) || t("errors.loadFailed"))
    } finally {
      setFormLoading(false)
    }
  }

  const handleCloseForm = () => {
    if (formSubmitting || formLoading) return
    setFormOpen(false)
    setEditingCompanyId(null)
    setFormLoadError(null)
    resetLogoState()
  }

  const handleSubmitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (formSubmitting || formLoading) return

    const validationErrors = validateForm(formState, t("validation.nameRequired"))
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors)
      return
    }

    const payload = buildPayload(formState)
    setFormSubmitting(true)

    try {
      if (formMode === "create") {
        const created = logoFile
          ? await createAdminCompanyWithLogo(payload, logoFile)
          : await createAdminCompany(payload)
        showSnackbar("success", t("toasts.created", { id: created.companyId }))
      } else if (editingCompanyId) {
        if (logoFile) {
          await updateAdminCompanyWithLogo(editingCompanyId, payload, logoFile)
        } else {
          await updateAdminCompany(editingCompanyId, payload)
          if (logoRemoved && currentLogo) {
            await deleteAdminCompanyLogo(editingCompanyId)
          }
        }
        showSnackbar("success", t("toasts.updated"))
      }

      setFormOpen(false)
      resetLogoState()
      await loadList()
    } catch (err: unknown) {
      showSnackbar(
        "error",
        getUploadApiErrorMessage(err) ||
          getApiErrorMessage(err) ||
          t("errors.saveFailed")
      )
    } finally {
      setFormSubmitting(false)
    }
  }

  const setRowToggling = (companyId: string, busy: boolean) => {
    setTogglingCompanyIds((current) => {
      const next = new Set(current)
      if (busy) next.add(companyId)
      else next.delete(companyId)
      return next
    })
  }

  const handleToggleActive = async (company: AdminCompany) => {
    if (togglingCompanyIds.has(company.companyId)) return

    const nextIsActive = !company.isActive
    setRowToggling(company.companyId, true)

    try {
      await updateAdminCompany(company.companyId, {
        name: company.name,
        industry: company.industry,
        isActive: nextIsActive,
      })
      showSnackbar(
        "success",
        nextIsActive ? t("toasts.activated") : t("toasts.deactivated")
      )
      await loadList()
    } catch (err: unknown) {
      showSnackbar(
        "error",
        getApiErrorMessage(err) || t("errors.statusUpdateFailed")
      )
    } finally {
      setRowToggling(company.companyId, false)
    }
  }

  const isEmpty = !loading && !listError && items.length === 0

  const currentLogoDataUri = buildLogoDataUri(currentLogo)
  const logoPreviewSrc = logoFile
    ? logoPreviewUrl
    : logoRemoved
      ? null
      : currentLogoDataUri
  const hasExistingLogoVisible = Boolean(logoPreviewSrc)

  return (
    <main
      className="flex min-h-0 flex-1 flex-col overflow-auto p-6 md:p-8"
      aria-labelledby="portal-admin-empresas-heading"
    >
      <PortalPageHeader
        id="portal-admin-empresas-heading"
        title={t("page.title")}
        description={t("page.description")}
        className="mb-6"
        contentClassName="max-w-3xl"
        actions={
          <Button type="button" variant="primary" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            {t("actions.create")}
          </Button>
        }
      />

      {listError ? (
        <div
          className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 font-sans text-sm text-destructive"
          role="alert"
        >
          {listError}
          <div className="mt-3">
            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={() => void loadList()}
            >
              {t("actions.retry")}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="font-sans text-sm text-muted-foreground">
          {loading ? t("count.loading") : t("count.summary", { count: totalCount })}
        </p>
        <div className="flex items-center gap-2">
          <span className="font-sans text-xs text-muted-foreground">
            {t("pagination.perPage")}
          </span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPage(1)
            }}
            className="h-9 rounded-md border border-border bg-card px-2 text-sm"
            aria-label={t("pagination.pageSizeAria")}
          >
            {[20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="ghost"
            className="h-9 px-3"
            onClick={() => void loadList()}
            aria-label={t("pagination.refreshAria")}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      <div className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        {isEmpty ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-vo-purple/10">
              <Landmark className="h-8 w-8 text-vo-purple" aria-hidden />
            </div>
            <div className="space-y-2">
              <h2 className="font-sans text-lg font-semibold text-foreground">
                {t("emptyStates.title")}
              </h2>
              <p className="max-w-lg font-sans text-sm text-muted-foreground">
                {t("emptyStates.description")}
              </p>
            </div>
            <Button type="button" variant="primary" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" aria-hidden />
              {t("actions.create")}
            </Button>
          </div>
        ) : (
          <table className="w-full min-w-[880px] font-sans text-left text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="w-20 px-4 py-3 font-medium text-foreground">
                  {t("table.logo")}
                </th>
                <th className="px-4 py-3 font-medium text-foreground">
                  {t("table.name")}
                </th>
                <th className="px-4 py-3 font-medium text-foreground">
                  {t("table.industry")}
                </th>
                <th className="px-4 py-3 font-medium text-foreground">
                  {t("table.status")}
                </th>
                <th className="px-4 py-3 font-medium text-foreground">
                  {t("table.createdAt")}
                </th>
                <th className="px-4 py-3 font-medium text-foreground">
                  {t("table.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-vo-purple" aria-hidden />
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const isRowToggling = togglingCompanyIds.has(row.companyId)
                  const rowLogoSrc = buildLogoDataUri(row.logo)
                  return (
                    <tr key={row.companyId} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 align-middle">
                        <div
                          className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md border border-border bg-background"
                          aria-label={
                            rowLogoSrc
                              ? t("logoCell.withName", { name: row.name })
                              : t("logoCell.none")
                          }
                        >
                          {rowLogoSrc ? (
                            <img
                              src={rowLogoSrc}
                              alt={t("logoCell.withName", { name: row.name })}
                              className="h-full w-full object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <Landmark
                              className="h-5 w-5 text-muted-foreground"
                              aria-hidden
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle font-medium text-foreground">
                        {row.name}
                      </td>
                      <td className="px-4 py-3 align-middle text-muted-foreground">
                        {row.industry?.trim() || "—"}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        {row.isActive ? (
                          <span className="inline-flex rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            {t("status.active")}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                            {t("status.inactive")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-middle text-muted-foreground">
                        {formatCreatedAt(row.createdAt)}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 px-3 py-0 text-xs"
                            onClick={() => void handleOpenEdit(row.companyId)}
                            disabled={isRowToggling}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                            {t("actions.edit")}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 min-w-[7.5rem] gap-1.5 px-3 py-0 text-xs"
                            onClick={() => void handleToggleActive(row)}
                            disabled={isRowToggling}
                            aria-busy={isRowToggling}
                          >
                            {isRowToggling ? (
                              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                            ) : null}
                            {row.isActive
                              ? t("actions.deactivate")
                              : t("actions.activate")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      <nav
        className="mt-6 flex flex-wrap items-center justify-between gap-3"
        aria-label={t("pagination.regionAria")}
      >
        <p className="font-sans text-sm text-muted-foreground">
          {t("pagination.summary", { page, total: totalPages })}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-9 px-3"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            {t("actions.prev")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 px-3"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("actions.next")}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </nav>

      <Modal
        isOpen={formOpen}
        onClose={handleCloseForm}
        title={
          formMode === "create" ? t("form.createTitle") : t("form.editTitle")
        }
        size="lg"
        closeOnEscape={!formSubmitting && !formLoading}
        closeOnOverlayClick={!formSubmitting && !formLoading}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleCloseForm} disabled={formSubmitting || formLoading}>
              {t("form.cancel")}
            </Button>
            <Button
              type="submit"
              form="admin-company-form"
              variant="primary"
              loading={formSubmitting}
              disabled={formSubmitting || formLoading}
            >
              {formMode === "create" ? t("form.save") : t("form.update")}
            </Button>
          </div>
        }
      >
        {formLoading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            {t("loadingStates.company")}
          </div>
        ) : formLoadError ? (
          <div className="space-y-4">
            <p className="text-sm text-destructive" role="alert">{formLoadError}</p>
            <Button type="button" variant="outline" onClick={() => editingCompanyId && void handleOpenEdit(editingCompanyId)}>
              {t("actions.retry")}
            </Button>
          </div>
        ) : (
          <form id="admin-company-form" className="space-y-5" onSubmit={handleSubmitForm}>
            <Input
              id="company-name"
              name="name"
              label={t("form.nameLabel")}
              required
              value={formState.name}
              error={formErrors.name || ""}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setFormState((c) => ({ ...c, name: event.target.value }))
                setFormErrors((c) => ({ ...c, name: undefined }))
              }}
              placeholder={t("form.namePlaceholder")}
              disabled={formSubmitting}
            />
            <Input
              id="company-industry"
              name="industry"
              label={t("form.industryLabel")}
              value={formState.industry}
              error=""
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setFormState((c) => ({ ...c, industry: event.target.value }))
              }
              placeholder={t("form.industryPlaceholder")}
              disabled={formSubmitting}
            />
            <fieldset className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
              <legend className="px-1 font-sans text-sm font-medium text-foreground">
                {t("form.logoLegend")}
              </legend>
              <p className="text-xs text-muted-foreground">
                {t("form.logoHelper")}
              </p>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div
                  className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-background"
                  aria-hidden={logoPreviewSrc ? undefined : true}
                  aria-label={
                    logoPreviewSrc
                      ? t("form.logoPreviewAria")
                      : t("form.logoNoneAria")
                  }
                >
                  {logoPreviewSrc ? (
                    <img
                      src={logoPreviewSrc}
                      alt={t("form.logoAlt")}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <ImagePlus
                      className="h-7 w-7 text-muted-foreground"
                      aria-hidden
                    />
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 px-3 text-xs"
                      onClick={handleOpenLogoPicker}
                      disabled={formSubmitting}
                    >
                      <Upload className="h-3.5 w-3.5" aria-hidden />
                      {hasExistingLogoVisible
                        ? t("form.changeLogo")
                        : t("form.uploadLogo")}
                    </Button>

                    {logoFile ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 px-3 text-xs"
                        onClick={handleCancelLogoChange}
                        disabled={formSubmitting}
                      >
                        {t("form.cancelSelection")}
                      </Button>
                    ) : null}

                    {formMode === "edit" && currentLogo && !logoRemoved ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 px-3 text-xs text-destructive hover:text-destructive"
                        onClick={handleRemoveLogo}
                        disabled={formSubmitting}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        {t("form.removeLogo")}
                      </Button>
                    ) : null}

                    {logoRemoved ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 px-3 text-xs"
                        onClick={handleUndoRemoveLogo}
                        disabled={formSubmitting}
                      >
                        {t("form.undo")}
                      </Button>
                    ) : null}
                  </div>

                  <input
                    ref={logoInputRef}
                    type="file"
                    accept={ACCEPTED_LOGO_TYPES}
                    className="hidden"
                    onChange={handleLogoFileChange}
                    disabled={formSubmitting}
                  />

                  {logoFile ? (
                    <p className="break-all text-xs text-muted-foreground">
                      {logoFile.name} · {formatBytes(logoFile.size)}
                    </p>
                  ) : null}

                  {logoRemoved ? (
                    <p className="text-xs text-destructive">
                      {t("form.logoWillBeRemoved")}
                    </p>
                  ) : null}

                  {logoError ? (
                    <p className="text-xs text-destructive" role="alert">
                      {logoError}
                    </p>
                  ) : null}
                </div>
              </div>
            </fieldset>
            <label className="flex cursor-pointer items-center gap-2 font-sans text-sm text-foreground">
              <input
                type="checkbox"
                checked={formState.isActive}
                onChange={(e) => setFormState((c) => ({ ...c, isActive: e.target.checked }))}
                className={checkboxVoClass}
                disabled={formSubmitting}
              />
              {t("form.activeCheckbox")}
            </label>
            <p className="text-xs text-muted-foreground">
              {t("form.deactivateHint")}
            </p>
          </form>
        )}
      </Modal>

      <Snackbar
        open={snackbar.open}
        onClose={() => setSnackbar((c) => ({ ...c, open: false }))}
        variant={snackbar.variant}
        message={snackbar.message}
      />
    </main>
  )
}
