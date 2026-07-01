"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { Check, Loader2, Pencil, X } from "lucide-react"
import type { ProfileVersionSummary } from "@/lib/candidate-profile-version"
import { getVersionDisplayTitle } from "@/lib/candidate-profile-version"

interface VersionLabelEditorProps {
  version: ProfileVersionSummary
  saving?: boolean
  onSave: (versionId: string, label: string | null) => Promise<void>
}

export function VersionLabelEditor({ version, saving = false, onSave }: VersionLabelEditorProps) {
  const t = useTranslations("CandidatePortal.profileTailoring.history")
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [draftLabel, setDraftLabel] = useState("")

  const fallbackTitle = t("versionFallback", { number: version.versionNumber })
  const displayTitle = getVersionDisplayTitle(version, fallbackTitle)

  const handleStartEditing = useCallback(() => {
    setDraftLabel(version.label?.trim() ?? "")
    setIsEditing(true)
  }, [version.label])

  const handleCancelEditing = useCallback(() => {
    setIsEditing(false)
    setDraftLabel("")
  }, [])

  const handleSave = useCallback(async () => {
    const trimmed = draftLabel.trim()
    const nextLabel = trimmed === "" ? null : trimmed
    const currentLabel = version.label?.trim() || null

    if (nextLabel === currentLabel) {
      handleCancelEditing()
      return
    }

    await onSave(version.id, nextLabel)
    setIsEditing(false)
    setDraftLabel("")
  }, [draftLabel, handleCancelEditing, onSave, version.id, version.label])

  useEffect(() => {
    if (!isEditing) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [isEditing])

  if (isEditing) {
    return (
      <form
        className="flex min-w-0 items-center gap-1.5"
        onSubmit={(event) => {
          event.preventDefault()
          void handleSave()
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          {t("labelEdit.inputLabel")}
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={draftLabel}
          onChange={(event) => setDraftLabel(event.target.value)}
          placeholder={t("labelEdit.placeholder", { number: version.versionNumber })}
          maxLength={120}
          disabled={saving}
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 font-sans text-sm font-semibold text-foreground outline-none ring-vo-purple/30 focus:border-vo-purple focus:ring-2"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault()
              handleCancelEditing()
            }
          }}
        />
        <button
          type="submit"
          disabled={saving}
          aria-label={t("labelEdit.saveAria")}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Check className="h-3.5 w-3.5" aria-hidden />
          )}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={handleCancelEditing}
          aria-label={t("labelEdit.cancelAria")}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </form>
    )
  }

  return (
    <div className="flex min-w-0 items-start gap-1.5">
      <p className="min-w-0 font-sans text-sm font-semibold text-foreground">{displayTitle}</p>
      <button
        type="button"
        onClick={handleStartEditing}
        aria-label={t("labelEdit.editAria", { title: displayTitle })}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  )
}
