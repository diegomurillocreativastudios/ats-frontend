"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { resolveRecruiterVacancyIdFromPathSegment } from "@/lib/api/recruiter-vacancy-by-path"
import {
  buildRecruiterVacancyPath,
  isVacancyGuid,
} from "@/lib/vacancies/vacancy-public-path"

export type ResolvedRecruiterVacancyPath = {
  /** Guid for API calls. Empty while loading or on error. */
  vacancyId: string
  publicSlug: string | null
  /** Original URL segment (slug or Guid). */
  pathSegment: string
  loading: boolean
  error: boolean
}

/**
 * Resolves a vacantes/[id] URL segment (Guid or publicSlug) to the Guid used by APIs.
 * Optionally replaces the URL when the canonical publicSlug differs from the segment.
 */
export function useResolvedRecruiterVacancyPath(
  pathSegment: string,
  options?: {
    /** Path suffix under /portal-rrhh/vacantes/{segment}/… for canonical replace. */
    pathSuffix?: string
    replaceCanonical?: boolean
  }
): ResolvedRecruiterVacancyPath {
  const router = useRouter()
  const replaceCanonical = options?.replaceCanonical !== false
  const pathSuffix = options?.pathSuffix ?? ""
  const [vacancyId, setVacancyId] = useState("")
  const [publicSlug, setPublicSlug] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(pathSegment))
  const [error, setError] = useState(false)

  useEffect(() => {
    const segment = String(pathSegment ?? "").trim()
    if (!segment) {
      setVacancyId("")
      setPublicSlug(null)
      setLoading(false)
      setError(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(false)

    resolveRecruiterVacancyIdFromPathSegment(segment)
      .then((resolved) => {
        if (cancelled) return
        if (!resolved) {
          setVacancyId("")
          setPublicSlug(null)
          setError(true)
          return
        }
        setVacancyId(resolved.id)
        setPublicSlug(resolved.publicSlug)

        if (
          replaceCanonical &&
          resolved.publicSlug &&
          segment !== resolved.publicSlug
        ) {
          const next = buildRecruiterVacancyPath(
            { id: resolved.id, publicSlug: resolved.publicSlug },
            pathSuffix
          )
          router.replace(next)
        }
      })
      .catch(() => {
        if (cancelled) return
        // Legacy: segment is already a Guid — keep using it if lookup fails oddly.
        if (isVacancyGuid(segment)) {
          setVacancyId(segment)
          setPublicSlug(null)
          setError(false)
        } else {
          setVacancyId("")
          setPublicSlug(null)
          setError(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [pathSegment, pathSuffix, replaceCanonical, router])

  return {
    vacancyId,
    publicSlug,
    pathSegment,
    loading,
    error,
  }
}
