"use client"

import { useCallback, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { apiClient } from "@/lib/api"
import { getApiErrorMessage } from "@/lib/api-error"
import {
  normalizeCandidateProfileFromApi,
  type CandidateProfile,
  type CandidateProfileSaveBody,
} from "@/lib/candidate-profile"
import {
  buildRecruiterCandidateProfilePutPayload,
  extractRecruiterCandidateDetail,
  type RecruiterCandidateDetailState,
} from "@/lib/recruiter-candidate-profile-api"
import {
  mergeRecruiterNormalizedWithCanonicalProfile,
  pickEmbeddedCanonicalProfile,
} from "@/lib/recruiter-canonical-profile-merge"

const getErrorStatus = (err: unknown): number => {
  if (typeof err === "object" && err !== null && "status" in err) {
    return Number((err as { status: number }).status)
  }
  return 0
}

export interface RecruiterCandidateLoadError {
  message: string
  canRetry: boolean
}

/**
 * Traduce un error de carga del detalle de candidato a copy de producto.
 * Un 400 (GUID inválido) no se reintenta: el enlace no va a volverse válido.
 */
export function mapRecruiterCandidateLoadError(
  err: unknown,
  t: (key: string) => string,
): RecruiterCandidateLoadError {
  const status = getErrorStatus(err)
  if (status === 400) {
    return { message: t("errors.invalidCandidateId"), canRetry: false }
  }
  if (status === 401 || status === 403 || status === 404) {
    return { message: t("errors.candidateUnavailable"), canRetry: false }
  }
  return {
    message: getApiErrorMessage(err) || t("errors.loadProfileFailed"),
    canRetry: true,
  }
}

const mapSaveError = (
  err: unknown,
  t: (key: string) => string,
): string => {
  const status = getErrorStatus(err)
  let message = getApiErrorMessage(err)
  if (status === 400) {
    message = message || t("errors.saveInvalidFields")
  } else if (status === 403 || status === 404) {
    message = message || t("errors.saveForbidden")
  } else if (status === 409) {
    message = message || t("errors.saveDuplicateNationalId")
  }
  return message
}

export function useRecruiterCandidateProfile(candidateId: string | null) {
  const t = useTranslations("RecruiterPortal.candidateDetail")
  const [profile, setProfile] = useState<RecruiterCandidateDetailState | null>(null)
  const [canonicalProfile, setCanonicalProfile] = useState<CandidateProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<RecruiterCandidateLoadError | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!candidateId) {
      setLoading(false)
      setFetchError({ message: t("errors.missingCandidateId"), canRetry: false })
      setProfile(null)
      setCanonicalProfile(null)
      return
    }
    setLoading(true)
    setFetchError(null)
    try {
      const data = await apiClient.get(`/api/recruiter/candidates/${candidateId}`)
      const base = extractRecruiterCandidateDetail(data)
      const root = (data as Record<string, unknown> | null | undefined)?.data ?? data
      let canonicalRaw: unknown = null
      if (root && typeof root === "object" && !Array.isArray(root)) {
        canonicalRaw = pickEmbeddedCanonicalProfile(root as Record<string, unknown>)
      }
      if (!canonicalRaw) {
        try {
          canonicalRaw = await apiClient.get(
            `/api/recruiter/candidates/${encodeURIComponent(String(candidateId))}/profile`
          )
        } catch {
          canonicalRaw = null
        }
      }
      const normalized = mergeRecruiterNormalizedWithCanonicalProfile(
        base.normalizedData,
        canonicalRaw
      )
      setProfile({ ...base, normalizedData: normalized })
      setCanonicalProfile(
        canonicalRaw != null ? normalizeCandidateProfileFromApi(canonicalRaw) : null
      )
    } catch (err: unknown) {
      setFetchError(mapRecruiterCandidateLoadError(err, t))
      setProfile(null)
      setCanonicalProfile(null)
    } finally {
      setLoading(false)
    }
  }, [candidateId, t])

  const clearSaveError = useCallback(() => setSaveError(null), [])

  const save = useCallback(
    async (body: CandidateProfileSaveBody) => {
      if (!candidateId) {
        throw new Error(t("errors.missingCandidateId"))
      }
      setSaving(true)
      setSaveError(null)
      try {
        const existingNd = profile?.normalizedData ?? {}
        const payload = buildRecruiterCandidateProfilePutPayload(body, existingNd)
        await apiClient.put(
          `/api/recruiter/candidates/${encodeURIComponent(String(candidateId))}/profile`,
          payload
        )
        await load()
      } catch (err: unknown) {
        const msg = mapSaveError(err, t)
        setSaveError(msg)
        throw err
      } finally {
        setSaving(false)
      }
    },
    [candidateId, profile?.normalizedData, load, t]
  )

  useEffect(() => {
    void load()
  }, [load])

  return {
    profile,
    canonicalProfile,
    loading,
    fetchError,
    refetch: load,
    save,
    saving,
    saveError,
    clearSaveError,
  }
}
