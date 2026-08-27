"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react"
import { CircleDot } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  ADMIN_TD_CLASS,
  ADMIN_TH_CLASS,
  ADMIN_THEAD_CLASS,
  ADMIN_TR_CLASS,
} from "@/components/portal-admin/admin-page-chrome"
import {
  ADMIN_CATALOG_ACTIONS_TD_CLASS,
  AdminCatalogCheckboxField,
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
  createInterviewStatus,
  deleteInterviewStatus,
  getInterviewHttpErrorMessage,
  listInterviewStatusesAdmin,
  updateInterviewStatus,
  type InterviewStatusAdmin,
} from "@/lib/api/interviews"

export interface InterviewStatusesCrudModalProps {
  isOpen?: boolean
  onClose?: () => void
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

export function InterviewStatusesCrudModal({
  isOpen,
  onClose,
  onMutate,
  variant = "modal",
  headingId = "portal-admin-interview-statuses-heading",
  pageDescription,
}: InterviewStatusesCrudModalProps) {
  const t = useTranslations("RecruiterPortal.interviews.crud.statuses")
  const tCommon = useTranslations("RecruiterPortal.interviews.crud.common")
  const [items, setItems] = useState<InterviewStatusAdmin[]>([])
  const [loading, setLoading] = useState(variant === "inline")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editingRow, setEditingRow] = useState<InterviewStatusAdmin | null>(null)
  const [formDisplayName, setFormDisplayName] = useState("")
  const [formIsTerminal, setFormIsTerminal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<InterviewStatusAdmin | null>(
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

  const nextSuggestedCode = useMemo(
    () => String(items.length + 1),
    [items.length]
  )

  const loadList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await listInterviewStatusesAdmin()
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
    setFormDisplayName("")
    setFormIsTerminal(false)
    setIsFormOpen(true)
  }

  const handleOpenEdit = (row: InterviewStatusAdmin) => {
    setFormMode("edit")
    setEditingRow(row)
    setFormDisplayName(row.displayName)
    setFormIsTerminal(row.isTerminal)
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    if (saving) return
    setIsFormOpen(false)
    setEditingRow(null)
  }

  const handleSubmitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const displayName = formDisplayName.trim()
    if (!displayName || saving) return

    if (formMode === "create") {
      const codeNum = parseInt(nextSuggestedCode.trim(), 10)
      if (!Number.isFinite(codeNum) || codeNum < 1) return
    }

    setSaving(true)
    try {
      if (formMode === "create") {
        await createInterviewStatus({
          code: nextSuggestedCode.trim(),
          displayName,
          description: null,
          isTerminal: formIsTerminal,
          isActive: true,
        })
        showSnackbar("success", t("created"))
      } else if (editingRow) {
        await updateInterviewStatus(editingRow.id, {
          displayName,
          isTerminal: formIsTerminal,
        })
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
      await deleteInterviewStatus(deleteTarget.id)
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
      emptyIcon={CircleDot}
      emptyTitle={t("empty")}
      emptyDescription={t("emptyBody")}
      onCreate={handleOpenCreate}
      createLabel={t("createCta")}
      onRefresh={() => void loadList()}
      refreshLabel={tCommon("refresh")}
      listAria={t("listAria")}
      showHeader={variant === "inline"}
    >
      <AdminCatalogFixedTable ariaLabel={t("listAria")}>
        <thead className={ADMIN_THEAD_CLASS}>
          <tr>
            <th className={ADMIN_TH_CLASS}>{tCommon("name")}</th>
            <th className={ADMIN_TH_CLASS}>{t("terminal")}</th>
            <th className={`${ADMIN_TH_CLASS} text-right`}>
              {tCommon("actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} className={ADMIN_TR_CLASS}>
              <td className={ADMIN_TD_CLASS}>
                <p className="font-medium text-foreground">{row.displayName}</p>
              </td>
              <td className={`${ADMIN_TD_CLASS} text-muted-foreground`}>
                {row.isTerminal ? tCommon("yes") : tCommon("no")}
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
        formId="interview-statuses-form"
        submitting={saving}
        submitLabel={tCommon("save")}
        cancelLabel={tCommon("cancel")}
      >
        <form
          id="interview-statuses-form"
          className="space-y-5"
          onSubmit={handleSubmitForm}
        >
          <Input
            id="interview-status-display-name"
            name="displayName"
            label={t("displayNameLabel")}
            required
            value={formDisplayName}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setFormDisplayName(event.target.value)
            }
            placeholder={t("displayNamePlaceholder")}
            disabled={saving}
          />
          <AdminCatalogCheckboxField
            id="interview-status-terminal"
            checked={formIsTerminal}
            onChange={setFormIsTerminal}
            label={t("terminalLabel")}
            hint={t("terminalHint")}
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
          deleteTarget
            ? t("deleteMessage", { name: deleteTarget.displayName })
            : ""
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
        bodyClassName="overflow-x-auto"
      >
        {listBody}
      </Modal>
      {overlays}
    </>
  )
}
