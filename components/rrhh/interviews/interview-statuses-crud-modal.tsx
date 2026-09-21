"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
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
  setInterviewStatusInterviewDone,
  updateInterviewStatus,
  type InterviewStatusAdmin,
} from "@/lib/api/interviews"
import { applyInterviewDoneToggleLocal } from "@/lib/recruiter/interview-stage"

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

function InterviewDoneSwitch({
  row,
  disabled,
  isUpdating,
  onToggle,
  t,
}: {
  row: InterviewStatusAdmin
  disabled: boolean
  isUpdating: boolean
  onToggle: (row: InterviewStatusAdmin, next: boolean) => void
  t: (key: string, values?: Record<string, string>) => string
}) {
  const isOn = Boolean(row.isInterviewDone)
  const handleClick = () => {
    if (disabled || isUpdating) return
    onToggle(row, !isOn)
  }
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || isUpdating) return
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    onToggle(row, !isOn)
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-busy={isUpdating || undefined}
        aria-label={
          isOn
            ? t("interviewDoneActive", { name: row.displayName })
            : t("markInterviewDone", { name: row.displayName })
        }
        disabled={disabled || isUpdating}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`relative inline-flex h-5 w-10 shrink-0 items-center rounded-full transition-[background-color,box-shadow,border-color,opacity] duration-300 ease-out motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/35 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${
          isUpdating ? "opacity-70" : "opacity-100"
        } ${
          isOn
            ? "bg-emerald-600 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18)]"
            : "border border-zinc-300/80 bg-zinc-200 shadow-[inset_0_1px_1px_rgba(15,23,42,0.06)] dark:border-zinc-600 dark:bg-zinc-700"
        }`}
      >
        <span
          aria-hidden
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ease-out motion-reduce:transition-none ${
            isOn
              ? "translate-x-5 shadow-[0_1px_3px_rgba(15,23,42,0.18)]"
              : "translate-x-0.5 shadow-[0_1px_2px_rgba(15,23,42,0.12)]"
          }`}
        />
      </button>
      {isUpdating ? (
        <span
          className="absolute -right-5 top-1/2 -translate-y-1/2"
          aria-hidden
        >
          <span className="block h-3 w-3 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        </span>
      ) : null}
    </div>
  )
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
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
  const [updatingInterviewDoneId, setUpdatingInterviewDoneId] = useState<
    string | null
  >(null)
  const [transferBusyIds, setTransferBusyIds] = useState<readonly string[]>(
    []
  )
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editingRow, setEditingRow] = useState<InterviewStatusAdmin | null>(null)
  const [formDisplayName, setFormDisplayName] = useState("")
  const [formIsTerminal, setFormIsTerminal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<InterviewStatusAdmin | null>(
    null
  )
  const [interviewDoneTransfer, setInterviewDoneTransfer] = useState<{
    target: InterviewStatusAdmin
    previous: InterviewStatusAdmin
  } | null>(null)
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

  const loadList = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true)
    }
    setError(null)
    try {
      const list = await listInterviewStatusesAdmin()
      setItems(list)
    } catch (err: unknown) {
      setError(getInterviewHttpErrorMessage(readErrorStatus(err), err))
      if (!options?.silent) {
        setItems([])
      }
    } finally {
      if (!options?.silent) {
        setLoading(false)
      }
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

  const applyInterviewDoneToggle = async (
    row: InterviewStatusAdmin,
    newValue: boolean
  ) => {
    if (updatingInterviewDoneId) return
    const statusId = String(row.id)
    const previousDoneId = items.find((item) => item.isInterviewDone)?.id

    setItems((prev) => applyInterviewDoneToggleLocal(prev, statusId, newValue))
    setUpdatingInterviewDoneId(statusId)

    try {
      const updated = await setInterviewStatusInterviewDone(statusId, newValue)
      setItems((prev) =>
        applyInterviewDoneToggleLocal(
          prev.map((item) =>
            String(item.id) === statusId ? { ...item, ...updated } : item
          ),
          statusId,
          newValue
        )
      )
      showSnackbar(
        "success",
        newValue ? t("interviewDoneMarked") : t("interviewDoneUnmarked")
      )
      onMutate?.()
    } catch (err: unknown) {
      setItems((prev) =>
        prev.map((item) => {
          if (String(item.id) === statusId) {
            return { ...item, isInterviewDone: !newValue }
          }
          if (
            newValue &&
            previousDoneId &&
            String(item.id) === String(previousDoneId)
          ) {
            return { ...item, isInterviewDone: true }
          }
          return item
        })
      )
      showSnackbar(
        "error",
        getInterviewHttpErrorMessage(readErrorStatus(err), err)
      )
    } finally {
      setUpdatingInterviewDoneId(null)
    }
  }

  /**
   * Moves the unique interview-done flag: deactivate the previous status first,
   * then activate the target. Activating alone while another is true can 500.
   * Visual handoff is staggered so both switches animate in sequence.
   */
  const applyInterviewDoneTransfer = async (
    previous: InterviewStatusAdmin,
    target: InterviewStatusAdmin
  ) => {
    if (updatingInterviewDoneId || transferBusyIds.length > 0) return
    const previousId = String(previous.id)
    const targetId = String(target.id)

    setTransferBusyIds([previousId, targetId])
    setUpdatingInterviewDoneId(previousId)
    setItems((prev) => applyInterviewDoneToggleLocal(prev, previousId, false))

    try {
      await setInterviewStatusInterviewDone(previousId, false)
      await wait(220)

      setUpdatingInterviewDoneId(targetId)
      setItems((prev) => applyInterviewDoneToggleLocal(prev, targetId, true))
      await wait(40)
      const updated = await setInterviewStatusInterviewDone(targetId, true)
      setItems((prev) =>
        applyInterviewDoneToggleLocal(
          prev.map((item) =>
            String(item.id) === targetId ? { ...item, ...updated } : item
          ),
          targetId,
          true
        )
      )
      await wait(260)
      showSnackbar("success", t("interviewDoneMarked"))
      onMutate?.()
      await loadList({ silent: true })
    } catch (err: unknown) {
      showSnackbar(
        "error",
        getInterviewHttpErrorMessage(readErrorStatus(err), err)
      )
      await loadList({ silent: true })
    } finally {
      setUpdatingInterviewDoneId(null)
      setTransferBusyIds([])
    }
  }

  const handleInterviewDoneToggle = (
    row: InterviewStatusAdmin,
    newValue: boolean
  ) => {
    if (
      updatingInterviewDoneId ||
      interviewDoneTransfer ||
      transferBusyIds.length > 0
    ) {
      return
    }

    if (newValue) {
      const previous = items.find(
        (item) =>
          item.isInterviewDone && String(item.id) !== String(row.id)
      )
      if (previous) {
        setInterviewDoneTransfer({ target: row, previous })
        return
      }
    }

    void applyInterviewDoneToggle(row, newValue)
  }

  const handleConfirmInterviewDoneTransfer = () => {
    if (
      !interviewDoneTransfer ||
      updatingInterviewDoneId ||
      transferBusyIds.length > 0
    ) {
      return
    }
    const { target, previous } = interviewDoneTransfer
    setInterviewDoneTransfer(null)
    void applyInterviewDoneTransfer(previous, target)
  }

  const handleCloseInterviewDoneTransfer = () => {
    if (updatingInterviewDoneId || transferBusyIds.length > 0) return
    setInterviewDoneTransfer(null)
  }

  const handleClose = () => {
    onClose?.()
  }

  const isEmpty = !loading && !error && items.length === 0
  const switchesBusy =
    saving ||
    deleting ||
    updatingInterviewDoneId != null ||
    interviewDoneTransfer != null ||
    transferBusyIds.length > 0

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
            <th className={ADMIN_TH_CLASS}>{t("interviewDone")}</th>
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
              <td className={ADMIN_TD_CLASS}>
                <InterviewDoneSwitch
                  row={row}
                  disabled={
                    switchesBusy &&
                    updatingInterviewDoneId !== row.id &&
                    !transferBusyIds.includes(row.id)
                  }
                  isUpdating={
                    updatingInterviewDoneId === row.id ||
                    transferBusyIds.includes(row.id)
                  }
                  onToggle={handleInterviewDoneToggle}
                  t={t}
                />
              </td>
              <td className={ADMIN_CATALOG_ACTIONS_TD_CLASS}>
                <AdminCatalogRowActions
                  onEdit={() => handleOpenEdit(row)}
                  onDelete={() => setDeleteTarget(row)}
                  editLabel={tCommon("edit")}
                  deleteLabel={tCommon("delete")}
                  disabled={saving || updatingInterviewDoneId != null}
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
            error=""
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
      <Modal
        isOpen={interviewDoneTransfer != null}
        onClose={handleCloseInterviewDoneTransfer}
        title={t("interviewDoneTransferTitle")}
        size="sm"
        closeOnOverlayClick={
          updatingInterviewDoneId == null && transferBusyIds.length === 0
        }
        closeOnEscape={
          updatingInterviewDoneId == null && transferBusyIds.length === 0
        }
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseInterviewDoneTransfer}
              disabled={
                updatingInterviewDoneId != null || transferBusyIds.length > 0
              }
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirmInterviewDoneTransfer}
              disabled={
                updatingInterviewDoneId != null || transferBusyIds.length > 0
              }
              loading={
                updatingInterviewDoneId != null || transferBusyIds.length > 0
              }
            >
              {t("interviewDoneTransferConfirm")}
            </Button>
          </>
        }
      >
        <p className="font-sans text-sm text-foreground">
          {interviewDoneTransfer
            ? t("interviewDoneTransferMessage", {
                previous: interviewDoneTransfer.previous.displayName,
                next: interviewDoneTransfer.target.displayName,
              })
            : ""}
        </p>
      </Modal>
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
