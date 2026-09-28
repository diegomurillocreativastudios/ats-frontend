"use client"

import { useTranslations } from "next-intl"
import { InterviewDetailPanel } from "@/components/rrhh/interviews/interview-detail-panel"

export interface InterviewDetailModalProps {
  isOpen: boolean
  onClose: () => void
  interviewId: string | null
  vacancyIdFromQuery?: string | null
  candidateLabel?: string | null
  vacancyTitle?: string | null
  onSaved?: () => void
  onDeleted?: (interviewId: string) => void
}

export function InterviewDetailModal({
  isOpen,
  onClose,
  interviewId,
  vacancyIdFromQuery = null,
  candidateLabel = null,
  vacancyTitle = null,
  onSaved,
  onDeleted,
}: InterviewDetailModalProps) {
  if (!interviewId) return null

  return (
    <InterviewDetailPanel
      interviewId={interviewId}
      vacancyIdFromQuery={vacancyIdFromQuery}
      candidateLabel={candidateLabel}
      vacancyTitle={vacancyTitle}
      variant="modal"
      isOpen={isOpen}
      onClose={onClose}
      onSaved={onSaved}
      onDeleted={onDeleted}
    />
  )
}
