"use client"

import { useCallback, useEffect, useState } from "react"
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

const mapSaveError = (err: unknown): string => {
  const status =
    typeof err === "object" && err !== null && "status" in err
      ? Number((err as { status: number }).status)
      : 0
  let message = getApiErrorMessage(err)
  if (status === 400) {
    message = message || "Revisá los datos: hay campos inválidos."
  } else if (status === 403) {
    message =
      message ||
      "Tu cuenta no tiene permiso para editar este perfil."
  } else if (status === 409) {
    message =
      message ||
      "Ese documento de identidad ya está asociado a otro perfil."
  }
  return message
}

export function useRecruiterCandidateProfile(candidateId: string | null) {
  const [profile, setProfile] = useState<RecruiterCandidateDetailState | null>(null)
  const [canonicalProfile, setCanonicalProfile] = useState<CandidateProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!candidateId) {
      setLoading(false)
      setFetchError("Falta el identificador del candidato.")
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
      setFetchError(
        getApiErrorMessage(err) || "No se pudo cargar el perfil del candidato."
      )
      setProfile(null)
      setCanonicalProfile(null)
    } finally {
      setLoading(false)
    }
  }, [candidateId])

  const clearSaveError = useCallback(() => setSaveError(null), [])

  const save = useCallback(
    async (body: CandidateProfileSaveBody) => {
      if (!candidateId) {
        throw new Error("Falta el identificador del candidato.")
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
        const msg = mapSaveError(err)
        setSaveError(msg)
        throw err
      } finally {
        setSaving(false)
      }
    },
    [candidateId, profile?.normalizedData, load]
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
