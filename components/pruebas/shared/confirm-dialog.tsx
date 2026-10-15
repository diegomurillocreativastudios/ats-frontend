"use client"

import type { ReactNode } from "react"

import Modal from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"

export interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  description?: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onClose: () => void
  isConfirmLoading?: boolean
  children?: ReactNode
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
  isConfirmLoading = false,
  children,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isConfirmLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            loading={isConfirmLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description ? (
        <p className="font-sans text-sm text-muted-foreground">{description}</p>
      ) : null}
      {children}
    </Modal>
  )
}
