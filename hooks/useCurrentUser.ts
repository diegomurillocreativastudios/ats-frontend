"use client"

import { useState, useEffect } from "react"
import {
  getCurrentUserState,
  loadCurrentUser,
  subscribeCurrentUser,
} from "@/lib/rrhh/current-user-store"
import {
  getRecruiterPhotoState,
  hydrateRecruiterPhotoCache,
  subscribeRecruiterPhoto,
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
 * Session and photo are shared across sidebar, topbar, and profile mounts.
 */
export const useCurrentUser = () => {
  const [user, setUser] = useState(() => getCurrentUserState().user)
  const [photoSrc, setPhotoSrc] = useState<string | null>(
    () => getRecruiterPhotoState().dataUri
  )
  const [loading, setLoading] = useState(
    () => getCurrentUserState().status !== "ready"
  )

  useEffect(() => {
    void hydrateRecruiterPhotoCache()

    const syncPhoto = () => {
      setPhotoSrc(getRecruiterPhotoState().dataUri)
    }
    syncPhoto()
    return subscribeRecruiterPhoto(syncPhoto)
  }, [])

  useEffect(() => {
    const syncUser = () => {
      const next = getCurrentUserState()
      setUser(next.user)
      setLoading(next.status !== "ready")
    }
    syncUser()
    const unsubscribe = subscribeCurrentUser(syncUser)

    void loadCurrentUser()

    const handleUpdated = () => {
      void loadCurrentUser({ force: true })
    }
    window.addEventListener(CURRENT_USER_UPDATED_EVENT, handleUpdated)

    return () => {
      unsubscribe()
      window.removeEventListener(CURRENT_USER_UPDATED_EVENT, handleUpdated)
    }
  }, [])

  return { user, photoSrc, loading }
}
