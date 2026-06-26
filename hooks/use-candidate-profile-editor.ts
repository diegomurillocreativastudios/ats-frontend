"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import {
  buildCandidateProfileSaveBody,
  getBirthDateInputValidationErrorCode,
  type BirthDateValidationErrorCode,
  type CandidateProfile,
  type CandidateProfileSaveBody,
  type FullProfileFormInput,
} from "@/lib/candidate-profile"
import { buildFullFormStateFromSources } from "@/lib/candidate-profile-hydrate"

export interface CandidateProfileEditorMessages {
  requiredFields: string
  resumeRequired: string
  birthDate: Record<BirthDateValidationErrorCode, string>
  triggerComplete: string
  triggerEdit: string
}

const DEFAULT_EDITOR_MESSAGES: CandidateProfileEditorMessages = {
  requiredFields: "Completá titular, resumen y documento de identidad.",
  resumeRequired:
    "Tu perfil debe tener currículum en texto registrado. Cargá un CV en Documentos o contactá soporte.",
  birthDate: {
    invalid: "Fecha inválida",
    futureDate: "La fecha no puede estar en el futuro",
    tooYoung: "Debés tener al menos 18 años",
  },
  triggerComplete: "Completar mi perfil",
  triggerEdit: "Editar mi perfil",
}

export interface UseCandidateProfileEditorParams {
  initialProfile: CandidateProfile | null
  enrichedNd: Record<string, unknown>
  isCreating: boolean
  onSave: (body: CandidateProfileSaveBody) => Promise<void>
  saving: boolean
  saveError: string | null
  onDismissSaveError: () => void
  messages?: Partial<CandidateProfileEditorMessages>
}

export function useCandidateProfileEditor({
  initialProfile,
  enrichedNd,
  isCreating,
  onSave,
  saving,
  saveError,
  onDismissSaveError,
  messages: messagesOverride,
}: UseCandidateProfileEditorParams) {
  const messages: CandidateProfileEditorMessages = useMemo(
    () => ({
      ...DEFAULT_EDITOR_MESSAGES,
      ...messagesOverride,
      birthDate: {
        ...DEFAULT_EDITOR_MESSAGES.birthDate,
        ...messagesOverride?.birthDate,
      },
    }),
    [messagesOverride],
  )

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
        setValidationError(messages.requiredFields)
        return
      }
      if (!r) {
        setValidationError(messages.resumeRequired)
        return
      }
      const birthDateErrorCode = getBirthDateInputValidationErrorCode(form.birthDateInput)
      if (birthDateErrorCode) {
        setValidationError(messages.birthDate[birthDateErrorCode])
        return
      }
      try {
        await onSave(buildCandidateProfileSaveBody(form))
        setIsEditing(false)
      } catch {
        /* saveError lo muestra el padre */
      }
    },
    [form, messages, onDismissSaveError, onSave]
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
    triggerLabel: isCreating ? messages.triggerComplete : messages.triggerEdit,
    saving,
    saveError,
    onDismissSaveError,
  }
}
