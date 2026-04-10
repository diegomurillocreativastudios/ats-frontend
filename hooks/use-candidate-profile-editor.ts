"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import {
  buildCandidateProfileSaveBody,
  type CandidateProfile,
  type CandidateProfileSaveBody,
  type FullProfileFormInput,
} from "@/lib/candidate-profile"
import { buildFullFormStateFromSources } from "@/lib/candidate-profile-hydrate"

export interface UseCandidateProfileEditorParams {
  initialProfile: CandidateProfile | null
  enrichedNd: Record<string, unknown>
  isCreating: boolean
  onSave: (body: CandidateProfileSaveBody) => Promise<void>
  saving: boolean
  saveError: string | null
  onDismissSaveError: () => void
}

export function useCandidateProfileEditor({
  initialProfile,
  enrichedNd,
  isCreating,
  onSave,
  saving,
  saveError,
  onDismissSaveError,
}: UseCandidateProfileEditorParams) {
  const [form, setForm] = useState<FullProfileFormInput>(() =>
    buildFullFormStateFromSources(initialProfile, enrichedNd)
  )
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(isCreating)

  const syncFormFromProfile = useCallback(() => {
    setForm(buildFullFormStateFromSources(initialProfile, enrichedNd))
  }, [initialProfile, enrichedNd])

  useEffect(() => {
    if (isEditing) return
    setForm(buildFullFormStateFromSources(initialProfile, enrichedNd))
  }, [initialProfile, enrichedNd, isEditing])

  useEffect(() => {
    if (!isCreating) return
    setIsEditing(true)
  }, [isCreating])

  const handleOpenEdit = useCallback(() => {
    onDismissSaveError()
    setValidationError(null)
    syncFormFromProfile()
    setIsEditing(true)
  }, [onDismissSaveError, syncFormFromProfile])

  const handleCancelEdit = useCallback(() => {
    onDismissSaveError()
    setValidationError(null)
    syncFormFromProfile()
    if (!isCreating) setIsEditing(false)
  }, [isCreating, onDismissSaveError, syncFormFromProfile])

  const patch = useCallback((partial: Partial<FullProfileFormInput>) => {
    setForm((f) => ({ ...f, ...partial }))
  }, [])

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      onDismissSaveError()
      setValidationError(null)
      const h = form.headline.trim()
      const s = form.summary.trim()
      const r = form.resumeMarkdown.trim()
      const n = form.nationalId.trim()
      if (!h || !s || !n) {
        setValidationError("Completá titular, resumen y documento de identidad.")
        return
      }
      if (!r) {
        setValidationError(
          "Tu perfil debe tener currículum en texto registrado. Cargá un CV en Documentos o contactá soporte."
        )
        return
      }
      try {
        await onSave(buildCandidateProfileSaveBody(form))
        setIsEditing(false)
      } catch {
        /* saveError lo muestra el padre */
      }
    },
    [form, onDismissSaveError, onSave]
  )

  return {
    form,
    setForm,
    patch,
    isEditing,
    setIsEditing,
    validationError,
    handleOpenEdit,
    handleCancelEdit,
    handleSubmit,
    triggerLabel: isCreating ? "Completar mi perfil" : "Editar mi perfil",
    saving,
    saveError,
    onDismissSaveError,
  }
}
