"use client"

import Modal from "@/components/ui/Modal"
import { InterviewForm } from "@/components/rrhh/interviews/interview-form"

export interface InterviewCreateModalProps {
  isOpen: boolean
  onClose: () => void
  vacancyId: string
  onCreated?: () => void
  /** Precarga el candidato al abrir (p. ej. desde “Revisar candidatos”). */
  initialCandidateProfileId?: string | null
}

export function InterviewCreateModal({
  isOpen,
  onClose,
  vacancyId,
  onCreated,
  initialCandidateProfileId = null,
}: InterviewCreateModalProps) {
  const presetKey = initialCandidateProfileId?.trim() || "none"
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nueva entrevista"
      size="lg"
      closeOnOverlayClick={false}
    >
      <InterviewForm
        key={`${vacancyId}-${presetKey}`}
        mode="modal"
        vacancyId={vacancyId}
        onClose={onClose}
        onCreated={onCreated}
        initialCandidateProfileId={
          initialCandidateProfileId?.trim() || undefined
        }
      />
    </Modal>
  )
}
