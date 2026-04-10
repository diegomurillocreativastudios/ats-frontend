"use client"

import { useCallback, useEffect, useState } from "react"
import {
  mergeCandidateProfilePreservingCvRefs,
  normalizeCandidateProfileFromApi,
  type CandidateProfile,
  type CandidateProfileSaveBody,
} from "@/lib/candidate-profile"
import { apiClient } from "@/lib/api"
import { getApiErrorMessage } from "@/lib/api-error"

export interface CandidateProfileError {
  status: number
  message: string
}

const mapLoadError = (err: unknown): CandidateProfileError => {
  const status =
    typeof err === "object" && err !== null && "status" in err
      ? Number((err as { status: number }).status)
      : 0
  let message = getApiErrorMessage(err)
  if (status === 403) {
    message =
      "Tu cuenta no tiene permiso para acceder al perfil. Si creés que es un error, contactá soporte."
  }
  return { status, message }
}

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
      "Tu cuenta no tiene permiso para guardar el perfil. Si creés que es un error, contactá soporte."
  } else if (status === 409) {
    message =
      message ||
      "Ese documento de identidad ya está asociado a otro perfil. Usá otro valor o contactá soporte."
  }
  return message
}

export const useCandidateProfile = () => {
  const [profile, setProfile] = useState<CandidateProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<CandidateProfileError | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNotFound(false)
    try {
      const raw = await apiClient.get("/api/candidate/profile")
      setProfile(normalizeCandidateProfileFromApi(raw))
    } catch (err: unknown) {
      const status =
        typeof err === "object" && err !== null && "status" in err
          ? Number((err as { status: number }).status)
          : 0
      if (status === 404) {
        setProfile(null)
        setNotFound(true)
        setError(null)
      } else {
        setProfile(null)
        setNotFound(false)
        setError(mapLoadError(err))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const clearSaveError = useCallback(() => setSaveError(null), [])

  const save = useCallback(async (body: CandidateProfileSaveBody) => {
    setSaving(true)
    setSaveError(null)
    try {
      const raw = await apiClient.put("/api/candidate/profile", body)
      const data = normalizeCandidateProfileFromApi(raw)
      let merged: CandidateProfile = data
      setProfile((prev) => {
        merged = mergeCandidateProfilePreservingCvRefs(prev, data)
        return merged
      })
      setNotFound(false)
      setError(null)
      return merged
    } catch (err: unknown) {
      const msg = mapSaveError(err)
      setSaveError(msg)
      throw err
    } finally {
      setSaving(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return {
    profile,
    loading,
    error,
    notFound,
    refetch: load,
    save,
    saving,
    saveError,
    clearSaveError,
  }
}
