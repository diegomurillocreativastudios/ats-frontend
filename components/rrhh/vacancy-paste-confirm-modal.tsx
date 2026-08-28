"use client"

import { useTranslations } from "next-intl"
import Modal from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"

interface VacancyPasteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  overlayZIndexClass?: string
}

/**
 * Confirms overwriting the current vacancy form with a copied payload.
 */
export function VacancyPasteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  overlayZIndexClass,
}: VacancyPasteConfirmModalProps) {
  const t = useTranslations("RecruiterPortal.vacancies.form")

  const footer = (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={onClose}
        aria-label={t("actions.cancel")}
      >
        {t("actions.cancel")}
      </Button>
      <Button
        type="button"
        onClick={onConfirm}
        aria-label={t("pasteConfirm.confirm")}
      >
        {t("pasteConfirm.confirm")}
      </Button>
    </>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("pasteConfirm.title")}
      footer={footer}
      size="sm"
      closeOnOverlayClick
      closeOnEscape
      overlayZIndexClass={overlayZIndexClass}
    >
      <p className="font-sans text-sm text-foreground">{t("pasteConfirm.message")}</p>
    </Modal>
  )
}
