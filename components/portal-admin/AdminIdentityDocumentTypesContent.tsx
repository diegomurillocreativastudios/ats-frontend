"use client"

import { useCallback, useEffect, useState, type ChangeEvent } from "react"
import { FileText } from "lucide-react"
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
  createAdminIdentityDocumentType,
  deleteAdminIdentityDocumentType,
  listAdminIdentityDocumentTypes,
  updateAdminIdentityDocumentType,
  type IdentityDocumentTypeResponseDto,
  type CreateIdentityDocumentTypeRequestDto,
  type UpdateIdentityDocumentTypeRequestDto,
} from "@/lib/api/admin-identity-document-types"

interface IdentityDocumentTypeFormState {
  code: string
  name: string
}

interface IdentityDocumentTypeFormErrors {
  name?: string
}

type DocumentTypeValidationTranslator = (
  key: "nameRequired" | "nameMaxLength",
  values?: { max?: number }
) => string

const CODE_MAX_LENGTH = 60
const NAME_MAX_LENGTH = 120

/**
 * Genera un `code` estable a partir del nombre visible (requerido por el API).
 */
function slugifyIdentityDocumentTypeCode(displayName: string): string {
  const slug = displayName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, CODE_MAX_LENGTH)

  return slug || "DOCUMENT"
}

function createDefaultFormState(): IdentityDocumentTypeFormState {
  return {
    code: "",
    name: "",
  }
}

function mapItemToFormState(
  item: IdentityDocumentTypeResponseDto
): IdentityDocumentTypeFormState {
  return {
    code: item.code ?? "",
    name: item.name ?? "",
  }
}

function validateForm(
  values: IdentityDocumentTypeFormState,
  tValidation: DocumentTypeValidationTranslator
): IdentityDocumentTypeFormErrors {
  const errors: IdentityDocumentTypeFormErrors = {}
  const normalizedName = values.name.trim()

  if (normalizedName === "") {
    errors.name = tValidation("nameRequired")
  } else if (normalizedName.length > NAME_MAX_LENGTH) {
    errors.name = tValidation("nameMaxLength", { max: NAME_MAX_LENGTH })
  }

  return errors
}

function buildCreatePayload(
  values: IdentityDocumentTypeFormState
): CreateIdentityDocumentTypeRequestDto {
  return {
    code: slugifyIdentityDocumentTypeCode(values.name),
    name: values.name.trim(),
  }
}

function buildUpdatePayload(
  values: IdentityDocumentTypeFormState
): UpdateIdentityDocumentTypeRequestDto {
  const existingCode = values.code.trim().toUpperCase()

  return {
    code: existingCode || slugifyIdentityDocumentTypeCode(values.name),
    name: values.name.trim(),
  }
}

export function AdminIdentityDocumentTypesContent() {
  const t = useTranslations("AdminPortal.documentTypes")
  const tCommon = useTranslations("Common")

  const [items, setItems] = useState<IdentityDocumentTypeResponseDto[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [formState, setFormState] = useState<IdentityDocumentTypeFormState>(() =>
    createDefaultFormState()
  )
  const [formErrors, setFormErrors] = useState<IdentityDocumentTypeFormErrors>({})
  const [formSubmitting, setFormSubmitting] = useState(false)

  const [deleteTarget, setDeleteTarget] =
    useState<IdentityDocumentTypeResponseDto | null>(null)
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
      const nextItems = await listAdminIdentityDocumentTypes()
      setItems(nextItems)
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
    setEditingItemId(null)
    setFormState(createDefaultFormState())
    setFormErrors({})
    setIsFormOpen(true)
  }

  const handleOpenEdit = (item: IdentityDocumentTypeResponseDto) => {
    setFormMode("edit")
    setEditingItemId(item.id)
    setFormState(mapItemToFormState(item))
    setFormErrors({})
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    if (formSubmitting) return
    setIsFormOpen(false)
    setEditingItemId(null)
    setFormErrors({})
  }

  const handleNameChange = (nextValue: string) => {
    setFormState((current) => ({ ...current, name: nextValue }))
    setFormErrors((current) => ({ ...current, name: undefined }))
  }

  const handleSubmitForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (formSubmitting) return

    const validationErrors = validateForm(formState, (key, values) =>
      t(`validation.${key}`, values ?? {})
    )
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors)
      return
    }

    setFormSubmitting(true)

    try {
      if (formMode === "create") {
        const payload = buildCreatePayload(formState)
        await createAdminIdentityDocumentType(payload)
        showSnackbar("success", t("toasts.created"))
      } else if (editingItemId) {
        const payload = buildUpdatePayload(formState)
        await updateAdminIdentityDocumentType(editingItemId, payload)
        showSnackbar("success", t("toasts.updated"))
      }

      setIsFormOpen(false)
      await loadList()
    } catch (error) {
      const errorMessage = getApiErrorMessage(error)
      showSnackbar("error", errorMessage || t("errors.saveFailed"))
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setBusyAction(true)

    try {
      await deleteAdminIdentityDocumentType(deleteTarget.id)
      setDeleteTarget(null)
      showSnackbar("success", t("toasts.deleted"))
      await loadList()
    } catch (error) {
      const status =
        typeof error === "object" && error !== null && "status" in error
          ? (error as { status?: number }).status
          : undefined

      if (status === 403) {
        showSnackbar("error", t("errors.forbidden"))
      } else {
        const errorMessage = getApiErrorMessage(error)
        showSnackbar("error", errorMessage || t("errors.deleteFailed"))
      }
    } finally {
      setBusyAction(false)
    }
  }

  const isEmpty = !loading && !listError && items.length === 0

  return (
    <AdminPageFrame labelledBy="portal-admin-identity-document-types-heading">
      <AdminCatalogListLayout
        headingId="portal-admin-identity-document-types-heading"
        title={t("page.title")}
        description={t("page.description")}
        loading={loading}
        error={listError}
        onRetry={() => void loadList()}
        retryLabel={t("actions.retry")}
        errorAria={t("aria.loadError")}
        isEmpty={isEmpty}
        emptyIcon={FileText}
        emptyTitle={t("emptyStates.noItems")}
        emptyDescription={t("emptyStates.createHint")}
        onCreate={handleOpenCreate}
        createLabel={t("page.createCta")}
        onRefresh={() => void loadList()}
        refreshLabel={t("actions.refresh")}
        listAria={t("aria.list")}
      >
        <AdminCatalogFixedTable ariaLabel={t("aria.list")} dataColumns={1}>
          <thead className={ADMIN_THEAD_CLASS}>
            <tr>
              <th className={ADMIN_TH_CLASS}>{t("table.name")}</th>
              <th className={`${ADMIN_TH_CLASS} text-right`}>
                {t("table.actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className={ADMIN_TR_CLASS}>
                <td className={ADMIN_TD_CLASS}>
                  <p className="font-medium text-foreground">{item.name}</p>
                </td>
                <td className={ADMIN_CATALOG_ACTIONS_TD_CLASS}>
                  <AdminCatalogRowActions
                    onEdit={() => handleOpenEdit(item)}
                    onDelete={() => setDeleteTarget(item)}
                    editLabel={t("actions.edit")}
                    deleteLabel={t("actions.delete")}
                    disabled={formSubmitting}
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
        title={
          formMode === "create" ? t("form.createTitle") : t("form.editTitle")
        }
        formId="identity-document-type-form"
        submitting={formSubmitting}
        submitLabel={
          formMode === "create" ? t("form.save") : t("form.saveChanges")
        }
        cancelLabel={tCommon("cancel")}
      >
        <form
          id="identity-document-type-form"
          className="space-y-5"
          onSubmit={handleSubmitForm}
        >
          <Input
            id="identity-document-type-name"
            name="name"
            label={t("form.nameLabel")}
            required
            value={formState.name}
            error={formErrors.name || ""}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              handleNameChange(event.target.value)
            }
            placeholder={t("form.namePlaceholder")}
            disabled={formSubmitting}
            maxLength={NAME_MAX_LENGTH}
          />
        </form>
      </AdminCatalogFormModal>

      <DeleteConfirmModal
        isOpen={deleteTarget != null}
        onClose={() => !busyAction && setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
        title={t("deleteConfirm.title")}
        message={deleteTarget ? t("deleteConfirm.message") : ""}
        confirmText={t("actions.delete")}
        cancelText={tCommon("cancel")}
        loading={busyAction}
      />

      <Snackbar
        open={snackbar.open}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        variant={snackbar.variant}
        message={snackbar.message}
      />
    </AdminPageFrame>
  )
}
