"use client"

import { useCallback, useState, type SetStateAction } from "react"
import { tailorProfileToVacancy } from "@/lib/api/candidate-profile-tailor"
import {
  adaptedProfileToFormState,
  type TailorToVacancyResult,
} from "@/lib/candidate-profile-version"
import { getApiErrorMessage } from "@/lib/api-error"
import type { FullProfileFormInput } from "@/lib/candidate-profile"
import {
  resolveExclusiveVacancySource,
  type VacancySourceInput,
  type VacancySourceValidationError,
} from "@/lib/profile-tailoring-vacancy-source"

export interface UseProfileTailoringState {
  result: TailorToVacancyResult | null
  adaptedForm: FullProfileFormInput | null
  processing: boolean
  error: string | null
  validationError: VacancySourceValidationError | null
}

export function useProfileTailoring() {
  const [result, setResult] = useState<TailorToVacancyResult | null>(null)
  const [adaptedForm, setAdaptedForm] = useState<FullProfileFormInput | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] =
    useState<VacancySourceValidationError | null>(null)

  const clearError = useCallback(() => setError(null), [])

  const resetResult = useCallback(() => {
    setResult(null)
    setAdaptedForm(null)
    setError(null)
    setValidationError(null)
  }, [])

  const loadFromTailorResult = useCallback((data: TailorToVacancyResult) => {
    setResult(data)
    setAdaptedForm(adaptedProfileToFormState(data.adaptedProfile))
    setError(null)
    setValidationError(null)
  }, [])

  const processForVacancy = useCallback(
    async (input: {
      file: File | null
      text: string
      vacancyId: string | null
      vacancyTitle?: string | null
      label?: string | null
    }) => {
      const { source, error: sourceError } = resolveExclusiveVacancySource({
        file: input.file,
        text: input.text,
        vacancyId: input.vacancyId,
      })
      setValidationError(sourceError)
      if (!source || sourceError !== "none") {
        return null
      }

      let resolvedSource: VacancySourceInput = source
      if (source.kind === "platform" && input.vacancyTitle?.trim()) {
        resolvedSource = {
          ...source,
          vacancyTitle: input.vacancyTitle.trim(),
        }
      }

      setProcessing(true)
      setError(null)
      try {
        const data = await tailorProfileToVacancy({
          source: resolvedSource,
          label: input.label,
          vacancyTitle:
            resolvedSource.kind === "platform" ? resolvedSource.vacancyTitle : input.vacancyTitle,
        })
        loadFromTailorResult(data)
        return data
      } catch (err: unknown) {
        const message = getApiErrorMessage(err) || "No se pudo procesar el perfil para la vacante."
        setError(message)
        return null
      } finally {
        setProcessing(false)
      }
    },
    [loadFromTailorResult]
  )

  const patchAdaptedForm = useCallback((patch: Partial<FullProfileFormInput>) => {
    setAdaptedForm((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const setAdaptedFormState = useCallback(
    (updater: SetStateAction<FullProfileFormInput>) => {
      setAdaptedForm((prev) => {
        if (!prev) return prev
        return typeof updater === "function" ? updater(prev) : updater
      })
    },
    []
  )

  return {
    result,
    adaptedForm,
    processing,
    error,
    validationError,
    clearError,
    resetResult,
    processForVacancy,
    loadFromTailorResult,
    patchAdaptedForm,
    setAdaptedFormState,
  }
}
