"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Check, Copy } from "lucide-react"
import {
  buildPublicVacancyAbsoluteUrl,
  type VacancyPathSource,
} from "@/lib/vacancies/vacancy-public-path"

export interface CopyPublicVacancyLinkButtonProps {
  vacancy: VacancyPathSource
  label: string
  ariaLabel: string
  copiedLabel: string
  copyFailedLabel: string
  className?: string
  /** When set, parent handles feedback (e.g. snackbar) instead of inline label swap. */
  onCopyResult?: (ok: boolean) => void
}

export function CopyPublicVacancyLinkButton({
  vacancy,
  label,
  ariaLabel,
  copiedLabel,
  copyFailedLabel,
  className,
  onCopyResult,
}: CopyPublicVacancyLinkButtonProps) {
  const [feedback, setFeedback] = useState<"idle" | "copied" | "failed">("idle")
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    }
  }, [])

  const handleCopy = useCallback(async () => {
    const url = buildPublicVacancyAbsoluteUrl(vacancy)
    try {
      await navigator.clipboard.writeText(url)
      onCopyResult?.(true)
      if (!onCopyResult) {
        setFeedback("copied")
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
        resetTimerRef.current = setTimeout(() => setFeedback("idle"), 2000)
      }
    } catch {
      onCopyResult?.(false)
      if (!onCopyResult) {
        setFeedback("failed")
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
        resetTimerRef.current = setTimeout(() => setFeedback("idle"), 2500)
      }
    }
  }, [vacancy, onCopyResult])

  const displayLabel =
    feedback === "copied"
      ? copiedLabel
      : feedback === "failed"
        ? copyFailedLabel
        : label

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className={className}
      aria-label={ariaLabel}
    >
      {feedback === "copied" ? (
        <Check className="h-4 w-4 shrink-0" aria-hidden />
      ) : (
        <Copy className="h-4 w-4 shrink-0" aria-hidden />
      )}
      {displayLabel}
    </button>
  )
}
