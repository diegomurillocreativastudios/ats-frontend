"use client"

import { useCallback, useEffect, useState } from "react"
import {
  sanitizeCandidateSelfProfileDto,
  type CandidateSelfProfileDto,
} from "@/lib/candidate-self-profile"
import { apiClient } from "@/lib/api"
import { getApiErrorMessage } from "@/lib/api-error"

export interface CandidateSelfProfileError {
  status: number
  message: string
}

const mapError = (err: unknown): CandidateSelfProfileError => {
  const status =
    typeof err === "object" && err !== null && "status" in err
      ? Number((err as { status: number }).status)
      : 0
  let message = getApiErrorMessage(err)
  if (status === 404) {
    message =
      "No encontramos un perfil de candidato asociado a tu cuenta. Si recién te registraste, puede tardar unos minutos; si el problema continúa, contactá soporte."
  } else if (status === 403) {
    message =
      "Tu cuenta no tiene permiso para ver este perfil. Si creés que es un error, contactá soporte."
  }
  return { status, message }
}

export const useCandidateSelfProfile = () => {
  const [profile, setProfile] = useState<CandidateSelfProfileDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<CandidateSelfProfileError | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const raw = (await apiClient.get("/api/candidate/me")) as CandidateSelfProfileDto
      setProfile(sanitizeCandidateSelfProfileDto(raw))
    } catch (err: unknown) {
      setProfile(null)
      setError(mapError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { profile, loading, error, refetch: load }
}
