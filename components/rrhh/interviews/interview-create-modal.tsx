"use client"

import Modal from "@/components/ui/Modal"
import { InterviewForm } from "@/components/rrhh/interviews/interview-form"

export interface InterviewCreateModalProps {
  isOpen: boolean
  onClose: () => void
  vacancyId: string
  onCreated?: () => void
}

export function InterviewCreateModal({
  isOpen,
  onClose,
  vacancyId,
  onCreated,
}: InterviewCreateModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nueva entrevista"
      size="lg"
      closeOnOverlayClick={false}
    >
      <InterviewForm
        mode="modal"
        vacancyId={vacancyId}
        onClose={onClose}
        onCreated={onCreated}
      />
    </Modal>
  )
}
