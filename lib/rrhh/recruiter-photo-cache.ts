import { getRecruiterProfilePhoto } from "@/lib/api/recruiter-profile-photo"

export type RecruiterPhotoCacheState = {
  userId: string | null
  dataUri: string | null
  status: "idle" | "loading" | "ready"
}

let state: RecruiterPhotoCacheState = {
  userId: null,
  dataUri: null,
  status: "idle",
}

const listeners = new Set<() => void>()
let inflightUserId: string | null = null
let inflight: Promise<void> | null = null

function emit() {
  for (const listener of listeners) listener()
}

/**
 * Snapshot of the shared recruiter photo cache.
 */
export function getRecruiterPhotoState(): RecruiterPhotoCacheState {
  return state
}

/**
 * Subscribe to photo cache writes (header, sidebar, profile).
 */
export function subscribeRecruiterPhoto(
  listener: () => void
): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Writes a known photo (or clears it) after upload/delete.
 */
export function writeRecruiterPhotoCache(
  userId: string | null,
  dataUri: string | null
) {
  state = {
    userId,
    dataUri,
    status: "ready",
  }
  emit()
}

/**
 * Drops the cached photo, e.g. when the session ends.
 */
export function clearRecruiterPhotoCache() {
  inflight = null
  inflightUserId = null
  state = {
    userId: null,
    dataUri: null,
    status: "idle",
  }
  emit()
}

/**
 * Loads the photo once per user when `hasPhoto` is true.
 */
export async function loadRecruiterPhotoIfNeeded(userId: string) {
  const id = userId.trim()
  if (!id) return

  if (state.userId === id && state.status === "ready" && state.dataUri) {
    return
  }
  if (inflight && inflightUserId === id) {
    return inflight
  }

  state = {
    userId: id,
    dataUri: state.userId === id ? state.dataUri : null,
    status: "loading",
  }
  emit()

  inflightUserId = id
  inflight = (async () => {
    try {
      const photo = await getRecruiterProfilePhoto()
      if (state.userId !== id) return
      state = {
        userId: id,
        dataUri: photo?.dataUri ?? null,
        status: "ready",
      }
    } catch {
      if (state.userId !== id) return
      state = {
        userId: id,
        dataUri: null,
        status: "ready",
      }
    } finally {
      if (inflightUserId === id) {
        inflight = null
        inflightUserId = null
      }
      emit()
    }
  })()

  return inflight
}
