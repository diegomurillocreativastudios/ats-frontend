"use client"

import { useTranslations } from "next-intl"
import Modal from "@/components/ui/Modal"
import { InterviewDetailPanel } from "@/components/rrhh/interviews/interview-detail-panel"

export interface InterviewDetailModalProps {
  isOpen: boolean
  onClose: () => void
  interviewId: string | null
  vacancyIdFromQuery?: string | null
  onSaved?: () => void
  onDeleted?: (interviewId: string) => void
}

export function InterviewDetailModal({
  isOpen,
  onClose,
  interviewId,
  vacancyIdFromQuery = null,
  onSaved,
  onDeleted,
}: InterviewDetailModalProps) {
  const t = useTranslations("RecruiterPortal.interviews.modals")
  if (!interviewId) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("detailTitle")}
      size="lg"
      closeOnOverlayClick={false}
    >
      <InterviewDetailPanel
        interviewId={interviewId}
        vacancyIdFromQuery={vacancyIdFromQuery}
        variant="modal"
        onClose={onClose}
        onSaved={onSaved}
        onDeleted={onDeleted}
      />
    </Modal>
  )
}
