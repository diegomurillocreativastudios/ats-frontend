"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react"
import {
  Briefcase,
  Building2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { useTranslations } from "next-intl"
import DeleteConfirmModal from "@/components/rrhh/DeleteConfirmModal"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import Modal from "@/components/ui/Modal"
import Snackbar from "@/components/ui/Snackbar"
import { getApiErrorMessage } from "@/lib/api-error"
import {
  createAdminVacancyCatalogItem,
  deleteAdminVacancyCatalogItem,
  getAdminVacancyCatalogItem,
  listAdminVacancyCatalog,
  sortVacancyCatalogItems,
  updateAdminVacancyCatalogItem,
  type VacancyCatalogAdminItem,
  type VacancyCatalogFormValues,
  type VacancyCatalogKind,
} from "@/lib/api/admin-vacancy-catalogs"

interface AdminVacancyCatalogContentProps {
  catalog: VacancyCatalogKind
}

interface CatalogFormState {
  displayName: string
  code: string
  description: string
  sortOrder: string
  isActive: boolean
}

interface CatalogFormErrors {
  displayName?: string
  code?: string
  sortOrder?: string
}

type CatalogValidationTranslator = (
  key:
    | "nameRequired"
    | "codeRequired"
    | "codePattern"
    | "sortOrderRequired"
    | "sortOrderInvalid",
) => string

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function slugifyCatalogCode(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function getNextSortOrder(items: VacancyCatalogAdminItem[]): string {
  const maxOrder = items.reduce((maxValue, item) => {
    return Math.max(maxValue, Number(item.sortOrder) || 0)
  }, 0)

  return String(maxOrder + 1)
}

function createDefaultFormState(items: VacancyCatalogAdminItem[]): CatalogFormState {
  return {
    displayName: "",
    code: "",
    description: "",
    sortOrder: getNextSortOrder(items),
    isActive: true,
  }
}

function mapItemToFormState(item: VacancyCatalogAdminItem): CatalogFormState {
  return {
    displayName: item.displayName ?? "",
    code: item.code ?? "",
    description: item.description ?? "",
    sortOrder: String(item.sortOrder ?? 0),
    isActive: item.isActive,
  }
}

function validateCatalogForm(
  values: CatalogFormState,
  tValidation: CatalogValidationTranslator,
): CatalogFormErrors {
  const errors: CatalogFormErrors = {}
  const normalizedName = values.displayName.trim()
  const normalizedCode = values.code.trim()
  const normalizedSortOrder = values.sortOrder.trim()

  if (normalizedName === "") {
    errors.displayName = tValidation("nameRequired")
  }

  if (normalizedCode === "") {
    errors.code = tValidation("codeRequired")
  } else if (!SLUG_PATTERN.test(normalizedCode)) {
    errors.code = tValidation("codePattern")
  }

  if (normalizedSortOrder === "") {
    errors.sortOrder = tValidation("sortOrderRequired")
  } else {
    const parsed = Number(normalizedSortOrder)
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
      errors.sortOrder = tValidation("sortOrderInvalid")
    }
  }

  return errors
}

function buildPayload(values: CatalogFormState): VacancyCatalogFormValues {
  return {
    displayName: values.displayName.trim(),
    code: values.code.trim(),
    description: values.description.trim() || undefined,
    sortOrder: Number(values.sortOrder),
    isActive: values.isActive,
  }
}

export function AdminVacancyCatalogContent({
  catalog,
}: AdminVacancyCatalogContentProps) {
  const tShared = useTranslations("AdminPortal.vacancyCatalog.shared")
  const tKind = useTranslations(`AdminPortal.vacancyCatalog.${catalog}`)
  const tCommon = useTranslations("Common")
  const CatalogIcon = catalog === "departments" ? Building2 : Briefcase
  const isDepartmentCatalog = catalog === "departments"

  const kindValues = {
    singular: tKind("singular"),
    singularCapitalized: tKind("singularCapitalized"),
    plural: tKind("plural"),
    article: tKind("article"),
  }

  const [items, setItems] = useState<VacancyCatalogAdminItem[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [formState, setFormState] = useState<CatalogFormState>(() =>
    createDefaultFormState([])
  )
  const [formErrors, setFormErrors] = useState<CatalogFormErrors>({})
  const [isCodeManuallyEdited, setIsCodeManuallyEdited] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formLoadError, setFormLoadError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<VacancyCatalogAdminItem | null>(
    null
  )
  const [conflictTarget, setConflictTarget] =
    useState<VacancyCatalogAdminItem | null>(null)
  const [busyAction, setBusyAction] = useState(false)

  const [snackbar, setSnackbar] = useState<{
    open: boolean
    variant: "success" | "error" | "warning"
    message: string
  }>({
    open: false,
    variant: "success",
    message: "",
  })

  const sortedItems = useMemo(() => sortVacancyCatalogItems(items), [items])

  const showSnackbar = useCallback(
    (variant: "success" | "error" | "warning", message: string) => {
      setSnackbar({ open: true, variant, message })
    },
    []
  )

  const loadList = useCallback(async () => {
    setLoading(true)
    setListError(null)

    try {
      const nextItems = await listAdminVacancyCatalog(catalog)
      setItems(nextItems)
    } catch (error) {
      setItems([])
      setListError(getApiErrorMessage(error) || tShared("errors.loadCatalog"))
    } finally {
      setLoading(false)
    }
  }, [catalog, tShared])

  useEffect(() => {
    void loadList()
  }, [loadList])

  const handleOpenCreate = () => {
    setFormMode("create")
    setEditingItemId(null)
    setFormState(createDefaultFormState(sortedItems))
    setFormErrors({})
    setFormLoadError(null)
    setIsCodeManuallyEdited(false)
    setIsFormOpen(true)
  }

  const handleOpenEdit = async (itemId: string) => {
    setFormMode("edit")
    setEditingItemId(itemId)
    setFormErrors({})
    setFormLoadError(null)
    setFormLoading(true)
    setIsFormOpen(true)

    try {
      const detail = await getAdminVacancyCatalogItem(catalog, itemId)
      setFormState(mapItemToFormState(detail))
      setIsCodeManuallyEdited(
        detail.code.trim() !== slugifyCatalogCode(detail.displayName)
      )
    } catch (error) {
      setFormLoadError(
        getApiErrorMessage(error) ||
          tShared("errors.loadItem", { singular: kindValues.singular })
      )
    } finally {
      setFormLoading(false)
    }
  }

  const handleCloseForm = () => {
    if (formSubmitting || formLoading) return
    setIsFormOpen(false)
    setEditingItemId(null)
    setFormLoadError(null)
    setFormErrors({})
  }

  const handleDisplayNameChange = (nextValue: string) => {
    setFormState((current) => {
      if (isCodeManuallyEdited) {
        return { ...current, displayName: nextValue }
      }

      return {
        ...current,
        displayName: nextValue,
        code: slugifyCatalogCode(nextValue),
      }
    })

    setFormErrors((current) => ({ ...current, displayName: undefined }))
  }

  const handleCodeChange = (rawValue: string) => {
    const nextCode = slugifyCatalogCode(rawValue)

    setFormState((current) => ({ ...current, code: nextCode }))
    setIsCodeManuallyEdited(
      nextCode !== slugifyCatalogCode(formState.displayName || "")
    )
    setFormErrors((current) => ({ ...current, code: undefined }))
  }

  const handleSortOrderChange = (nextValue: string) => {
    setFormState((current) => ({ ...current, sortOrder: nextValue }))
    setFormErrors((current) => ({ ...current, sortOrder: undefined }))
  }

  const handleSubmitForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (formSubmitting) return

    const validationErrors = validateCatalogForm(formState, (key) =>
      tShared(`validation.${key}`)
    )
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors)
      return
    }

    const payload = buildPayload(formState)
    setFormSubmitting(true)

    try {
      if (formMode === "create") {
        await createAdminVacancyCatalogItem(catalog, payload)
        showSnackbar("success", tKind("createSuccess"))
      } else if (editingItemId) {
        await updateAdminVacancyCatalogItem(catalog, editingItemId, payload)
        showSnackbar("success", tKind("updateSuccess"))
      }

      setIsFormOpen(false)
      await loadList()
    } catch (error) {
      showSnackbar(
        "error",
        getApiErrorMessage(error) || tShared("errors.saveFailed")
      )
    } finally {
      setFormSubmitting(false)
    }
  }

  const updateItemActiveState = async (
    item: VacancyCatalogAdminItem,
    nextIsActive: boolean
  ) => {
    setBusyAction(true)

    try {
      await updateAdminVacancyCatalogItem(catalog, item.id, {
        displayName: item.displayName,
        code: item.code,
        description: item.description,
        sortOrder: item.sortOrder,
        isActive: nextIsActive,
      })

      setConflictTarget(null)
      showSnackbar(
        "success",
        nextIsActive ? tKind("activateSuccess") : tKind("deactivateSuccess")
      )
      await loadList()
    } catch (error) {
      showSnackbar(
        "error",
        getApiErrorMessage(error) || tShared("errors.updateFailed")
      )
    } finally {
      setBusyAction(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setBusyAction(true)

    try {
      await deleteAdminVacancyCatalogItem(catalog, deleteTarget.id)
      setDeleteTarget(null)
      showSnackbar("success", tKind("deleteSuccess"))
      await loadList()
    } catch (error) {
      const status =
        typeof error === "object" && error !== null && "status" in error
          ? (error as { status?: number }).status
          : undefined

      if (status === 409) {
        setDeleteTarget(null)
        setConflictTarget(deleteTarget)
        showSnackbar("warning", tKind("deleteConflictMessage"))
      } else {
        showSnackbar(
          "error",
          getApiErrorMessage(error) || tShared("errors.deleteFailed")
        )
      }
    } finally {
      setBusyAction(false)
    }
  }

  const isEmpty = !loading && !listError && sortedItems.length === 0
  const loadingGridClassName =
    "grid animate-pulse grid-cols-[1.8fr_2.4fr_180px] gap-3 rounded-lg border border-border/60 bg-muted/30 p-4"
  const tableMinWidthClassName = "min-w-[640px]"

  return (
    <main
      className="flex min-h-0 flex-1 flex-col overflow-auto p-6 md:p-8"
      aria-labelledby={`portal-admin-${catalog}-heading`}
    >
      <PortalPageHeader
        id={`portal-admin-${catalog}-heading`}
        title={tKind("title")}
        description={tKind("headingDescription")}
        className="mb-6"
        contentClassName="max-w-3xl"
        actions={
          <Button
            type="button"
            variant="primary"
            onClick={handleOpenCreate}
          >
            <Plus className="h-4 w-4" aria-hidden />
            {tKind("createCta")}
          </Button>
        }
      />

      <section
        className="mb-5 rounded-xl border border-border bg-card p-4 shadow-sm"
        aria-label={tShared("aria.summary", { plural: kindValues.plural })}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm text-foreground">
              {loading
                ? tShared("count.loading")
                : tShared("count.summary", {
                    count: sortedItems.length,
                    plural: kindValues.plural,
                  })}
            </span>
            <span className="text-sm text-muted-foreground">
              {tShared("summaryHelper", { plural: kindValues.plural })}
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-10 px-4"
            onClick={() => void loadList()}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            {tShared("actions.refresh")}
          </Button>
        </div>
      </section>

      {listError ? (
        <section
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-6"
          aria-label={tShared("aria.loadError", { plural: kindValues.plural })}
        >
          <p className="font-sans text-sm text-destructive" role="alert">
            {listError || tShared("errors.loadCatalog")}
          </p>
          <div className="mt-4">
            <Button type="button" variant="primary" onClick={() => void loadList()}>
              {tShared("actions.retry")}
            </Button>
          </div>
        </section>
      ) : null}

      {!listError ? (
        <section
          className="min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-card shadow-sm"
          aria-label={tShared("aria.list", { plural: kindValues.plural })}
        >
          {loading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className={loadingGridClassName}
                >
                  <div className="h-5 rounded bg-muted" />
                  <div className="h-5 rounded bg-muted" />
                  <div className="h-5 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : isEmpty ? (
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-vo-purple/10">
                <CatalogIcon className="h-8 w-8 text-vo-purple" aria-hidden />
              </div>
              <div className="space-y-2">
                <h2 className="font-sans text-lg font-semibold text-foreground">
                  {tKind("emptyMessage")}
                </h2>
                <p className="max-w-lg font-sans text-sm text-muted-foreground">
                  {tShared("emptyBody", { singular: kindValues.singular })}
                </p>
              </div>
              <Button type="button" variant="primary" onClick={handleOpenCreate}>
                <Plus className="h-4 w-4" aria-hidden />
                {tKind("createCta")}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                className={`${tableMinWidthClassName} w-full text-left font-sans text-sm`}
              >
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-foreground">
                      {tShared("table.name")}
                    </th>
                    <th className="px-4 py-3 font-medium text-foreground">
                      {tShared("table.description")}
                    </th>
                    <th className="px-4 py-3 font-medium text-foreground">
                      {tShared("table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">
                            {item.displayName}
                          </p>
                          {(item.vacanciesCount ?? 0) > 0 ? (
                            <p className="text-xs text-muted-foreground">
                              {tShared("inUse")}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-muted-foreground">
                        {item.description?.trim() || tShared("dash")}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 px-3 py-0 text-xs"
                            onClick={() => void handleOpenEdit(item.id)}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                            {tShared("actions.edit")}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 px-3 py-0 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeleteTarget(item)}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            {tShared("actions.delete")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      <Modal
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        title={
          formMode === "create"
            ? tKind("formCreateTitle", {
                singularCapitalized: kindValues.singularCapitalized,
              })
            : tKind("formEditTitle", { singular: kindValues.singular })
        }
        size="lg"
        closeOnEscape={!formSubmitting && !formLoading}
        closeOnOverlayClick={!formSubmitting && !formLoading}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseForm}
              disabled={formSubmitting || formLoading}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              form="vacancy-catalog-form"
              variant="primary"
              loading={formSubmitting}
              disabled={formSubmitting || formLoading}
            >
              {formMode === "create"
                ? tShared("actions.save")
                : tShared("actions.update")}
            </Button>
          </div>
        }
      >
        {formLoading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            {tShared("form.loading", { singular: kindValues.singular })}
          </div>
        ) : formLoadError ? (
          <div className="space-y-4">
            <p className="text-sm text-destructive" role="alert">
              {formLoadError}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!editingItemId) return
                void handleOpenEdit(editingItemId)
              }}
            >
              {tShared("actions.retry")}
            </Button>
          </div>
        ) : (
          <form
            id="vacancy-catalog-form"
            className="space-y-5"
            onSubmit={handleSubmitForm}
          >
            <div className="grid gap-4">
              <Input
                id={`${catalog}-displayName`}
                name="displayName"
                label={tShared("form.nameLabel")}
                required
                value={formState.displayName}
                error={formErrors.displayName || ""}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  handleDisplayNameChange(event.target.value)
                }
                placeholder={tShared("form.namePlaceholder", {
                  singular: kindValues.singular,
                })}
                disabled={formSubmitting}
              />
            </div>

            <div>
              <label
                htmlFor={`${catalog}-description`}
                className="mb-2 block text-sm font-medium text-black"
              >
                {tShared("form.descriptionLabel")}
              </label>
              <textarea
                id={`${catalog}-description`}
                name="description"
                rows={4}
                value={formState.description}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-black placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-vo-purple disabled:cursor-not-allowed disabled:opacity-50"
                placeholder={tShared("form.descriptionPlaceholder", {
                  singular: kindValues.singular,
                })}
                disabled={formSubmitting}
              />
            </div>
          </form>
        )}
      </Modal>

      <DeleteConfirmModal
        isOpen={deleteTarget != null}
        onClose={() => !busyAction && setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
        title={tKind("deleteTitle", { singular: kindValues.singular })}
        message={
          deleteTarget
            ? tShared("deleteConfirm.message", {
                singular: kindValues.singular,
                name: deleteTarget.displayName,
              })
            : ""
        }
        confirmText={tShared("deleteConfirm.confirmDelete")}
        cancelText={tCommon("cancel")}
        loading={busyAction}
      />

      <Modal
        isOpen={conflictTarget != null}
        onClose={() => !busyAction && setConflictTarget(null)}
        title={tShared("conflict.title", { singular: kindValues.singular })}
        size="md"
        closeOnEscape={!busyAction}
        closeOnOverlayClick={!busyAction}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConflictTarget(null)}
              disabled={busyAction}
            >
              {tShared("actions.close")}
            </Button>
            {!isDepartmentCatalog ? (
              <Button
                type="button"
                variant="secondary"
                loading={busyAction}
                disabled={busyAction || conflictTarget == null}
                onClick={() => {
                  if (!conflictTarget) return
                  void updateItemActiveState(conflictTarget, false)
                }}
              >
                {tShared("actions.deactivateInstead")}
              </Button>
            ) : null}
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-foreground">{tKind("deleteConflictMessage")}</p>
          {!isDepartmentCatalog ? (
            <p className="text-sm text-muted-foreground">
              {tShared("conflict.deactivateHint", {
                article: kindValues.article,
                singular: kindValues.singular,
              })}
            </p>
          ) : null}
        </div>
      </Modal>

      <Snackbar
        open={snackbar.open}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        variant={snackbar.variant}
        message={snackbar.message}
      />
    </main>
  )
}
