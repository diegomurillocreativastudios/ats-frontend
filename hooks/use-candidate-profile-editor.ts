"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import {
  buildCandidateProfileSaveBody,
  getBirthDateInputValidationErrorCode,
  type BirthDateValidationErrorCode,
  type CandidateProfile,
  type CandidateProfileRequiredFieldErrors,
  type CandidateProfileSaveBody,
  type FullProfileFormInput,
} from "@/lib/candidate-profile"
import { buildFullFormStateFromSources } from "@/lib/candidate-profile-hydrate"

export type { CandidateProfileRequiredFieldErrors }

export interface CandidateProfileEditorMessages {
  requiredFields: string
  birthDate: Record<BirthDateValidationErrorCode, string>
  triggerComplete: string
  triggerEdit: string
}

const REQUIRED_FIELD_IDS: Record<keyof CandidateProfileRequiredFieldErrors, string> = {
  firstName: "pf-first",
  lastName: "pf-last",
  headline: "pf-headline",
  summary: "pf-summary",
  nationalId: "pf-national-id",
}

const REQUIRED_FIELD_ORDER: (keyof CandidateProfileRequiredFieldErrors)[] = [
  "firstName",
  "lastName",
  "headline",
  "summary",
  "nationalId",
]

function firstInvalidRequiredField(
  errors: CandidateProfileRequiredFieldErrors
): keyof CandidateProfileRequiredFieldErrors | null {
  return REQUIRED_FIELD_ORDER.find((key) => errors[key]) ?? null
}

function focusProfileField(fieldId: string): void {
  document.getElementById(fieldId)?.focus()
}

const DEFAULT_EDITOR_MESSAGES: CandidateProfileEditorMessages = {
  requiredFields: "Completá nombres, apellidos, titular, resumen y documento de identidad.",
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
  const [fieldErrors, setFieldErrors] = useState<CandidateProfileRequiredFieldErrors>({})
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
    setFieldErrors({})
    syncFormFromProfile()
    setIsEditing(true)
  }, [onDismissSaveError, syncFormFromProfile])

  const handleCancelEdit = useCallback(() => {
    onDismissSaveError()
    setValidationError(null)
    setFieldErrors({})
    syncFormFromProfile()
    if (!isCreating) setIsEditing(false)
  }, [isCreating, onDismissSaveError, syncFormFromProfile])

  const patch = useCallback((partial: Partial<FullProfileFormInput>) => {
    setForm((f) => ({ ...f, ...partial }))
    setFieldErrors((prev) => {
      const next = { ...prev }
      if ("firstName" in partial) delete next.firstName
      if ("lastName" in partial) delete next.lastName
      if ("headline" in partial) delete next.headline
      if ("summary" in partial) delete next.summary
      if ("nationalId" in partial) delete next.nationalId
      return next
    })
  }, [])

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      onDismissSaveError()
      setValidationError(null)
      const firstName = form.firstName.trim()
      const lastName = form.lastName.trim()
      const h = form.headline.trim()
      const s = form.summary.trim()
      const n = form.nationalId.trim()
      const nextFieldErrors: CandidateProfileRequiredFieldErrors = {}
      if (!firstName) nextFieldErrors.firstName = true
      if (!lastName) nextFieldErrors.lastName = true
      if (!h) nextFieldErrors.headline = true
      if (!s) nextFieldErrors.summary = true
      if (!n) nextFieldErrors.nationalId = true
      const firstInvalid = firstInvalidRequiredField(nextFieldErrors)
      if (firstInvalid) {
        setFieldErrors(nextFieldErrors)
        queueMicrotask(() => focusProfileField(REQUIRED_FIELD_IDS[firstInvalid]))
        return
      }
      setFieldErrors({})
      const birthDateErrorCode = getBirthDateInputValidationErrorCode(form.birthDateInput)
      if (birthDateErrorCode) {
        queueMicrotask(() => focusProfileField("pf-birth"))
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
    fieldErrors,
    handleOpenEdit,
    handleCancelEdit,
    handleSubmit,
    triggerLabel: isCreating ? messages.triggerComplete : messages.triggerEdit,
    saving,
    saveError,
    onDismissSaveError,
  }
}
