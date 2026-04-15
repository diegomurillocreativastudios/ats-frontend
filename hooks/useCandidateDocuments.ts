"use client"

import { useCallback, useEffect, useState } from "react"
import { getApiErrorMessage } from "@/lib/api-error"
import { apiClient } from "@/lib/api"
import {
  normalizeCandidateDocuments,
  type CandidateDocument,
} from "@/lib/candidate-documents"

const resolveCandidateDocumentOwnerId = (rawProfile: unknown): string | null => {
  if (!rawProfile || typeof rawProfile !== "object") return null
  const profile = rawProfile as Record<string, unknown>
  const possibleIds = [profile.id, profile.candidateProfileId, profile.candidateId]
  for (const value of possibleIds) {
    if (value == null) continue
    const parsed = String(value).trim()
    if (parsed) return parsed
  }
  return null
}

export function useCandidateDocuments() {
  const [documents, setDocuments] = useState<CandidateDocument[]>([])
  const [candidateId, setCandidateId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const profile = await apiClient.get("/api/candidate/profile")
      const candidateId = resolveCandidateDocumentOwnerId(profile)
      if (!candidateId) {
        throw new Error("No se pudo resolver el id del perfil del candidato")
      }
      setCandidateId(candidateId)

      const payload = await apiClient.get(
        `/api/candidate/${encodeURIComponent(candidateId)}/documents`
      )
      setDocuments(normalizeCandidateDocuments(payload))
    } catch (err: unknown) {
      setDocuments([])
      setCandidateId(null)
      setError(getApiErrorMessage(err) || "No se pudieron cargar los documentos")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return {
    candidateId,
    documents,
    loading,
    error,
    refetch: load,
  }
}
