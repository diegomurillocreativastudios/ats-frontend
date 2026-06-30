"use client"

import { useCallback, useEffect, useState } from "react"
import {
  deleteProfileVersion,
  getProfileVersion,
  listProfileVersions,
  patchProfileVersion,
} from "@/lib/api/candidate-profile-tailor"
import type {
  ProfileVersionDetail,
  ProfileVersionPatchBody,
  ProfileVersionSummary,
} from "@/lib/candidate-profile-version"
import { getApiErrorMessage } from "@/lib/api-error"

export function useProfileVersions(options?: { autoLoad?: boolean }) {
  const autoLoad = options?.autoLoad ?? true
  const [versions, setVersions] = useState<ProfileVersionSummary[]>([])
  const [loading, setLoading] = useState(autoLoad)
  const [error, setError] = useState<string | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<ProfileVersionDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [mutating, setMutating] = useState(false)

  const loadList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await listProfileVersions()
      setVersions(items)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err) || "No se pudo cargar el historial de versiones.")
      setVersions([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadDetail = useCallback(async (versionId: string) => {
    setDetailLoading(true)
    setDetailError(null)
    try {
      const detail = await getProfileVersion(versionId)
      setSelectedVersion(detail)
      return detail
    } catch (err: unknown) {
      const message = getApiErrorMessage(err) || "No se pudo cargar la versión."
      setDetailError(message)
      setSelectedVersion(null)
      return null
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const saveVersion = useCallback(
    async (versionId: string, body: ProfileVersionPatchBody) => {
      setMutating(true)
      try {
        const detail = await patchProfileVersion(versionId, body)
        setSelectedVersion(detail)
        await loadList()
        return detail
      } finally {
        setMutating(false)
      }
    },
    [loadList]
  )

  const removeVersion = useCallback(
    async (versionId: string) => {
      setMutating(true)
      try {
        await deleteProfileVersion(versionId)
        setSelectedVersion((prev) => (prev?.id === versionId ? null : prev))
        await loadList()
      } finally {
        setMutating(false)
      }
    },
    [loadList]
  )

  useEffect(() => {
    if (autoLoad) void loadList()
  }, [autoLoad, loadList])

  return {
    versions,
    loading,
    error,
    selectedVersion,
    detailLoading,
    detailError,
    mutating,
    loadList,
    loadDetail,
    saveVersion,
    removeVersion,
    clearSelectedVersion: () => setSelectedVersion(null),
  }
}
