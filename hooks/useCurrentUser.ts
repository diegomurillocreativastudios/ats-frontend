"use client"

import { useEffect, useSyncExternalStore } from "react"
import {
  getCurrentUserState,
  loadCurrentUser,
  subscribeCurrentUser,
  type CurrentUserStoreState,
} from "@/lib/rrhh/current-user-store"
import {
  getRecruiterPhotoState,
  hydrateRecruiterPhotoCache,
  subscribeRecruiterPhoto,
} from "@/lib/rrhh/recruiter-photo-cache"

export const CURRENT_USER_UPDATED_EVENT = "ats-current-user-updated"

const SERVER_USER_SNAPSHOT: CurrentUserStoreState = {
  user: null,
  status: "idle",
}

/**
 * Avisa a los consumers de `useCurrentUser` para recargar GET /api/auth/me.
 */
export function notifyCurrentUserUpdated() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(CURRENT_USER_UPDATED_EVENT))
}

function getPhotoSrcSnapshot(): string | null {
  return getRecruiterPhotoState().dataUri
}

function getServerPhotoSrcSnapshot(): string | null {
  return null
}

function getUserSnapshot(): CurrentUserStoreState {
  return getCurrentUserState()
}

function getServerUserSnapshot(): CurrentUserStoreState {
  return SERVER_USER_SNAPSHOT
}

/**
 * Returns the currently logged-in user from GET /api/auth/me only.
 * Fail-closed: never reads identity from the `ats_user` cookie.
 * Session and photo are shared across sidebar, topbar, and profile mounts.
 *
 * Photo/user start from a stable server snapshot so Soft Navigation + cached
 * blob URLs cannot cause hydration mismatches in RecruiterAvatar.
 */
export const useCurrentUser = () => {
  const userState = useSyncExternalStore(
    subscribeCurrentUser,
    getUserSnapshot,
    getServerUserSnapshot,
  )
  const photoSrc = useSyncExternalStore(
    subscribeRecruiterPhoto,
    getPhotoSrcSnapshot,
    getServerPhotoSrcSnapshot,
  )

  useEffect(() => {
    void hydrateRecruiterPhotoCache()
  }, [])

  useEffect(() => {
    void loadCurrentUser()

    const handleUpdated = () => {
      void loadCurrentUser({ force: true })
    }
    window.addEventListener(CURRENT_USER_UPDATED_EVENT, handleUpdated)

    return () => {
      window.removeEventListener(CURRENT_USER_UPDATED_EVENT, handleUpdated)
    }
  }, [])

  return {
    user: userState.user,
    photoSrc,
    loading: userState.status !== "ready",
  }
}
