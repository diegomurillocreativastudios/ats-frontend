"use client"

import { useState, useEffect } from "react"
import {
  mapRecruiterAccount,
  type RecruiterAccount,
} from "@/lib/api/recruiter-account"
import {
  clearRecruiterPhotoCache,
  getRecruiterPhotoState,
  loadRecruiterPhotoIfNeeded,
  subscribeRecruiterPhoto,
  writeRecruiterPhotoCache,
} from "@/lib/rrhh/recruiter-photo-cache"

export const CURRENT_USER_UPDATED_EVENT = "ats-current-user-updated"

/**
 * Avisa a los consumers de `useCurrentUser` para recargar GET /api/auth/me.
 */
export function notifyCurrentUserUpdated() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(CURRENT_USER_UPDATED_EVENT))
}

/**
 * Returns the currently logged-in user from GET /api/auth/me only.
 * Fail-closed: never reads identity from the `ats_user` cookie.
 */
export const useCurrentUser = () => {
  const [user, setUser] = useState<RecruiterAccount | null>(null)
  const [photoSrc, setPhotoSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const syncPhoto = () => {
      setPhotoSrc(getRecruiterPhotoState().dataUri)
    }
    syncPhoto()
    return subscribeRecruiterPhoto(syncPhoto)
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" })
        if (cancelled) return
        if (res.ok) {
          const data = (await res.json()) as Record<string, unknown>
          const account = mapRecruiterAccount(data)
          setUser(account)
          if (account.hasPhoto && account.id) {
            void loadRecruiterPhotoIfNeeded(account.id)
            return
          }
          writeRecruiterPhotoCache(account.id, null)
          return
        }
        setUser(null)
        clearRecruiterPhotoCache()
      } catch {
        if (!cancelled) {
          setUser(null)
          clearRecruiterPhotoCache()
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    const handleUpdated = () => {
      void load()
    }
    window.addEventListener(CURRENT_USER_UPDATED_EVENT, handleUpdated)

    return () => {
      cancelled = true
      window.removeEventListener(CURRENT_USER_UPDATED_EVENT, handleUpdated)
    }
  }, [])

  return { user, photoSrc, loading }
}
