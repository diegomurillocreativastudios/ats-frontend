"use client"

import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react"
import { Tags } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  ADMIN_TD_CLASS,
  ADMIN_TH_CLASS,
  ADMIN_THEAD_CLASS,
  ADMIN_TR_CLASS,
} from "@/components/portal-admin/admin-page-chrome"
import {
  ADMIN_CATALOG_ACTIONS_TD_CLASS,
  AdminCatalogFixedTable,
  AdminCatalogFormModal,
  AdminCatalogListLayout,
  AdminCatalogRowActions,
} from "@/components/portal-admin/admin-catalog-list-layout"
import Modal from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import DeleteConfirmModal from "@/components/rrhh/DeleteConfirmModal"
import Snackbar from "@/components/ui/Snackbar"
import {
  createInterviewType,
  deleteInterviewType,
  getInterviewHttpErrorMessage,
  listInterviewTypesAdmin,
  slugifyInterviewTypeCode,
  updateInterviewType,
  type InterviewTypeAdmin,
} from "@/lib/api/interviews"

export interface InterviewTypesCrudModalProps {
  isOpen?: boolean
  onClose?: () => void
  /** Se llama tras crear, editar o eliminar (p. ej. invalidar caché en otro módulo). */
  onMutate?: () => void
  variant?: "modal" | "inline"
  headingId?: string
  pageDescription?: string
}

function readErrorStatus(err: unknown): number {
  if (typeof err === "object" && err !== null && "status" in err) {
    return (err as { status?: number }).status ?? 0
  }
  return 0
}

export function InterviewTypesCrudModal({
  isOpen,
  onClose,
  onMutate,
  variant = "modal",
  headingId = "portal-admin-interview-types-heading",
  pageDescription,
}: InterviewTypesCrudModalProps) {
  const t = useTranslations("RecruiterPortal.interviews.crud.types")
  const tCommon = useTranslations("RecruiterPortal.interviews.crud.common")
  const [items, setItems] = useState<InterviewTypeAdmin[]>([])
  const [loading, setLoading] = useState(variant === "inline")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editingRow, setEditingRow] = useState<InterviewTypeAdmin | null>(null)
  const [formName, setFormName] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<InterviewTypeAdmin | null>(
    null
  )
  const [deleting, setDeleting] = useState(false)
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    variant: "success" | "error"
    message: string
  }>({
    open: false,
    variant: "success",
    message: "",
  })

  const showSnackbar = useCallback(
    (variant: "success" | "error", message: string) => {
      setSnackbar({ open: true, variant, message })
    },
    []
  )

  const loadList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await listInterviewTypesAdmin()
      setItems(list)
    } catch (err: unknown) {
      setError(getInterviewHttpErrorMessage(readErrorStatus(err), err))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  const isVisible = variant === "inline" || Boolean(isOpen)

  useEffect(() => {
    if (!isVisible) return
    void loadList()
  }, [isVisible, loadList])

  const handleOpenCreate = () => {
    setFormMode("create")
    setEditingRow(null)
    setFormName("")
    setIsFormOpen(true)
  }

  const handleOpenEdit = (row: InterviewTypeAdmin) => {
    setFormMode("edit")
    setEditingRow(row)
    setFormName(row.name)
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    if (saving) return
    setIsFormOpen(false)
    setEditingRow(null)
  }

  const handleSubmitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = formName.trim()
    if (!name || saving) return

    setSaving(true)
    try {
      if (formMode === "create") {
        await createInterviewType({ name })
        showSnackbar("success", t("created"))
      } else if (editingRow) {
        const code = editingRow.code?.trim() || slugifyInterviewTypeCode(name)
        await updateInterviewType(editingRow.id, { name, code })
        showSnackbar("success", t("updated"))
      }

      setIsFormOpen(false)
      setEditingRow(null)
      await loadList()
      onMutate?.()
    } catch (err: unknown) {
      showSnackbar("error", getInterviewHttpErrorMessage(readErrorStatus(err), err))
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteInterviewType(deleteTarget.id)
      setDeleteTarget(null)
      await loadList()
      onMutate?.()
      showSnackbar("success", t("deleted"))
    } catch (err: unknown) {
      showSnackbar("error", getInterviewHttpErrorMessage(readErrorStatus(err), err))
    } finally {
      setDeleting(false)
    }
  }

  const handleClose = () => {
    onClose?.()
  }

  const isEmpty = !loading && !error && items.length === 0

  const listBody = (
    <AdminCatalogListLayout
      headingId={headingId}
      title={t("title")}
      description={pageDescription}
      loading={loading}
      error={error}
      onRetry={() => void loadList()}
      retryLabel={tCommon("retry")}
      errorAria={t("loadErrorAria")}
      isEmpty={isEmpty}
      emptyIcon={Tags}
      emptyTitle={t("empty")}
      emptyDescription={t("emptyBody")}
      onCreate={handleOpenCreate}
      createLabel={t("createCta")}
      onRefresh={() => void loadList()}
      refreshLabel={tCommon("refresh")}
      listAria={t("listAria")}
      showHeader={variant === "inline"}
    >
      <AdminCatalogFixedTable ariaLabel={t("listAria")} dataColumns={1}>
        <thead className={ADMIN_THEAD_CLASS}>
          <tr>
            <th className={ADMIN_TH_CLASS}>{tCommon("name")}</th>
            <th className={`${ADMIN_TH_CLASS} text-right`}>
              {tCommon("actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} className={ADMIN_TR_CLASS}>
              <td className={ADMIN_TD_CLASS}>
                <p className="font-medium text-foreground">{row.name}</p>
              </td>
              <td className={ADMIN_CATALOG_ACTIONS_TD_CLASS}>
                <AdminCatalogRowActions
                  onEdit={() => handleOpenEdit(row)}
                  onDelete={() => setDeleteTarget(row)}
                  editLabel={tCommon("edit")}
                  deleteLabel={tCommon("delete")}
                  disabled={saving}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </AdminCatalogFixedTable>
    </AdminCatalogListLayout>
  )

  const overlays = (
    <>
      <AdminCatalogFormModal
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        title={formMode === "create" ? t("createTitle") : t("editTitle")}
        formId="interview-types-form"
        submitting={saving}
        submitLabel={tCommon("save")}
        cancelLabel={tCommon("cancel")}
      >
        <form
          id="interview-types-form"
          className="space-y-5"
          onSubmit={handleSubmitForm}
        >
          <Input
            id="interview-type-name"
            name="name"
            label={tCommon("name")}
            required
            value={formName}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setFormName(event.target.value)
            }
            placeholder={t("namePlaceholder")}
            disabled={saving}
          />
        </form>
      </AdminCatalogFormModal>
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={t("deleteTitle")}
        message={
          deleteTarget ? t("deleteMessage", { name: deleteTarget.name }) : ""
        }
        confirmText={tCommon("delete")}
        loading={deleting}
      />
      <Snackbar
        open={snackbar.open}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        variant={snackbar.variant}
        message={snackbar.message}
      />
    </>
  )

  if (variant === "inline") {
    return (
      <>
        {listBody}
        {overlays}
      </>
    )
  }

  return (
    <>
      <Modal
        isOpen={Boolean(isOpen)}
        onClose={handleClose}
        title={t("title")}
        footer={
          <Button type="button" variant="outline" onClick={handleClose}>
            {tCommon("close")}
          </Button>
        }
        size="lg"
        closeOnOverlayClick={!saving && !deleting}
        closeOnEscape={!saving && !deleting}
      >
        {listBody}
      </Modal>
      {overlays}
    </>
  )
}
