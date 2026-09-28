import {
  mapRecruiterAccount,
  type RecruiterAccount,
} from "@/lib/api/recruiter-account"
import {
  clearRecruiterPhotoCache,
  loadRecruiterPhotoIfNeeded,
  writeRecruiterPhotoCache,
} from "@/lib/rrhh/recruiter-photo-cache"

export type CurrentUserStoreState = {
  user: RecruiterAccount | null
  status: "idle" | "loading" | "ready"
}

let state: CurrentUserStoreState = {
  user: null,
  status: "idle",
}

const listeners = new Set<() => void>()
let inflight: Promise<void> | null = null
let loadGeneration = 0

function emit() {
  for (const listener of listeners) listener()
}

/**
 * Snapshot of the shared authenticated-user store.
 */
export function getCurrentUserState(): CurrentUserStoreState {
  return state
}

/**
 * Subscribe to session user updates (sidebar, topbar, profile).
 */
export function subscribeCurrentUser(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Loads GET /api/auth/me once, shared across all useCurrentUser mounts.
 */
export async function loadCurrentUser(options?: {
  force?: boolean
}): Promise<void> {
  const force = options?.force === true

  if (!force && state.status === "ready") {
    return
  }
  if (inflight && !force) {
    return inflight
  }

  if (state.status !== "ready") {
    state = {
      user: state.user,
      status: "loading",
    }
    emit()
  }

  const generation = ++loadGeneration
  const run = (async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" })
      if (generation !== loadGeneration) return

      if (res.ok) {
        const data = (await res.json()) as Record<string, unknown>
        const account = mapRecruiterAccount(data)
        state = {
          user: account,
          status: "ready",
        }
        emit()

        if (account.hasPhoto && account.id) {
          void loadRecruiterPhotoIfNeeded(account.id)
          return
        }
        writeRecruiterPhotoCache(account.id, null)
        return
      }

      state = {
        user: null,
        status: "ready",
      }
      clearRecruiterPhotoCache()
    } catch {
      if (generation !== loadGeneration) return
      state = {
        user: null,
        status: "ready",
      }
      clearRecruiterPhotoCache()
    } finally {
      if (inflight === run) {
        inflight = null
      }
      if (generation === loadGeneration) {
        emit()
      }
    }
  })()

  inflight = run
  return run
}

/**
 * Clears the shared session user (logout / hard failure).
 */
export function clearCurrentUserStore() {
  loadGeneration += 1
  inflight = null
  state = {
    user: null,
    status: "idle",
  }
  emit()
}

/**
 * Test helper: resets module state.
 */
export function resetCurrentUserStoreForTests() {
  inflight = null
  loadGeneration = 0
  state = {
    user: null,
    status: "idle",
  }
}
