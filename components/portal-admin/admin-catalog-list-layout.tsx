"use client"

import type { ReactNode } from "react"
import { Pencil, Plus, RefreshCw, Trash2, type LucideIcon } from "lucide-react"
import {
  ADMIN_TD_CLASS,
  AdminEmptyState,
  AdminErrorPanel,
  AdminSurface,
  AdminTableSkeleton,
} from "@/components/portal-admin/admin-page-chrome"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import { Button } from "@/components/ui/Button"
import Modal from "@/components/ui/Modal"

interface AdminCatalogListLayoutProps {
  headingId: string
  title: string
  description?: string
  loading: boolean
  error: string | null
  onRetry: () => void
  retryLabel: string
  errorAria?: string
  isEmpty: boolean
  emptyIcon: LucideIcon
  emptyTitle: string
  emptyDescription?: string
  onCreate: () => void
  createLabel: string
  onRefresh: () => void
  refreshLabel: string
  listAria: string
  children: ReactNode
  showHeader?: boolean
}

/**
 * Shared catalog chrome: split header (refresh + create), error panel,
 * and a surface with skeleton, empty state, or the table.
 */
export function AdminCatalogListLayout({
  headingId,
  title,
  description,
  loading,
  error,
  onRetry,
  retryLabel,
  errorAria,
  isEmpty,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  onCreate,
  createLabel,
  onRefresh,
  refreshLabel,
  listAria,
  children,
  showHeader = true,
}: AdminCatalogListLayoutProps) {
  const headerActions = (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={onRefresh}
        disabled={loading}
      >
        <RefreshCw className="h-4 w-4" aria-hidden />
        {refreshLabel}
      </Button>
      <Button
        type="button"
        variant="primary"
        onClick={onCreate}
      >
        <Plus className="h-4 w-4" aria-hidden />
        {createLabel}
      </Button>
    </>
  )

  return (
    <>
      {showHeader ? (
        <PortalPageHeader
          id={headingId}
          title={title}
          description={description}
          layout="split"
          actions={headerActions}
        />
      ) : (
        <div className="mb-4 flex flex-wrap justify-end gap-2">{headerActions}</div>
      )}

      {error ? (
        <AdminErrorPanel
          message={error}
          onRetry={onRetry}
          retryLabel={retryLabel}
          ariaLabel={errorAria}
        />
      ) : null}

      {!error ? (
        <AdminSurface aria-label={listAria}>
          {loading ? (
            <AdminTableSkeleton columns={3} />
          ) : isEmpty ? (
            <AdminEmptyState
              icon={emptyIcon}
              title={emptyTitle}
              description={emptyDescription}
              action={
                <Button type="button" variant="primary" onClick={onCreate}>
                  <Plus className="h-4 w-4" aria-hidden />
                  {createLabel}
                </Button>
              }
            />
          ) : (
            children
          )}
        </AdminSurface>
      ) : null}
    </>
  )
}

interface AdminCatalogFixedTableProps {
  children: ReactNode
  ariaLabel?: string
  /** Flexible data columns before the fixed actions column. */
  dataColumns?: 1 | 2
}

/**
 * Catalog table with one or two data columns and a fixed actions column.
 */
export function AdminCatalogFixedTable({
  children,
  ariaLabel,
  dataColumns = 2,
}: AdminCatalogFixedTableProps) {
  return (
    <div className="overflow-x-auto">
      <table
        className="w-full table-fixed border-collapse text-left font-sans text-sm"
        aria-label={ariaLabel}
      >
        <colgroup>
          <col />
          {dataColumns === 2 ? <col /> : null}
          <col className="w-72" />
        </colgroup>
        {children}
      </table>
    </div>
  )
}

interface AdminCatalogRowActionsProps {
  onEdit: () => void
  onDelete: () => void
  editLabel: string
  deleteLabel: string
  disabled?: boolean
}

export function AdminCatalogRowActions({
  onEdit,
  onDelete,
  editLabel,
  deleteLabel,
  disabled,
}: AdminCatalogRowActionsProps) {
  return (
    <div className="flex flex-nowrap items-center justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        className="h-8 px-3 py-0 text-xs"
        onClick={onEdit}
        disabled={disabled}
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden />
        {editLabel}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-8 px-3 py-0 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={onDelete}
        disabled={disabled}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
        {deleteLabel}
      </Button>
    </div>
  )
}

export const ADMIN_CATALOG_ACTIONS_TD_CLASS =
  `${ADMIN_TD_CLASS} whitespace-nowrap text-right`

interface AdminCatalogFormModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  formId: string
  submitting: boolean
  submitLabel: string
  cancelLabel: string
  children: ReactNode
}

/**
 * Create/edit dialog with submit wired to an external form id.
 */
export function AdminCatalogFormModal({
  isOpen,
  onClose,
  title,
  formId,
  submitting,
  submitLabel,
  cancelLabel,
  children,
}: AdminCatalogFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      closeOnEscape={!submitting}
      closeOnOverlayClick={!submitting}
      overlayZIndexClass="z-[100]"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            {cancelLabel}
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="primary"
            loading={submitting}
            disabled={submitting}
          >
            {submitLabel}
          </Button>
        </div>
      }
    >
      {children}
    </Modal>
  )
}

interface AdminCatalogCheckboxFieldProps {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  hint?: string
  disabled?: boolean
}

export function AdminCatalogCheckboxField({
  id,
  checked,
  onChange,
  label,
  hint,
  disabled,
}: AdminCatalogCheckboxFieldProps) {
  return (
    <div className="flex items-start gap-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-input text-vo-purple focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
      />
      <label
        htmlFor={id}
        className="font-sans text-sm leading-snug text-foreground"
      >
        {label}
        {hint ? (
          <span className="mt-0.5 block font-sans text-xs font-normal text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </label>
    </div>
  )
}
