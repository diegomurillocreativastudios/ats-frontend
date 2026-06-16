"use client"

import { useEffect } from "react"
import { X } from "lucide-react"
import { useTranslations } from "next-intl"
import { TechnicalSheetPanel } from "@/components/rrhh/technical-sheet/technical-sheet-panel"

export interface TechnicalSheetModalProps {
  isOpen: boolean
  onClose: () => void
  vacancyId: string
  candidateProfileId: string
  vacancyTitle?: string | null
  candidateLabel?: string | null
}

export function TechnicalSheetModal({
  isOpen,
  onClose,
  vacancyId,
  candidateProfileId,
  vacancyTitle,
  candidateLabel,
}: TechnicalSheetModalProps) {
  const t = useTranslations("RecruiterPortal.technicalSheet")

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <TechnicalSheetPanel
        enabled={isOpen}
        vacancyId={vacancyId}
        candidateProfileId={candidateProfileId}
        vacancyTitle={vacancyTitle}
        candidateLabel={candidateLabel}
        variant="modal"
        headerEnd={
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
            aria-label={t("aria.close")}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        }
      />
    </div>
  )
}
