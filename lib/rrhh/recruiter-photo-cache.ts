import { getRecruiterProfilePhoto } from "@/lib/api/recruiter-profile-photo"
import {
  clearPersistedRecruiterPhoto,
  dataUriToBlob,
  readAnyPersistedRecruiterPhoto,
  readPersistedRecruiterPhoto,
  writePersistedRecruiterPhoto,
} from "@/lib/rrhh/recruiter-photo-idb"

export type RecruiterPhotoCacheState = {
  userId: string | null
  photoFileId: string | null
  /** Display URL: blob: preferred, data: fallback. */
  dataUri: string | null
  status: "idle" | "loading" | "ready" | "hydrating"
}

let state: RecruiterPhotoCacheState = {
  userId: null,
  photoFileId: null,
  dataUri: null,
  status: "idle",
}

const listeners = new Set<() => void>()
let inflightUserId: string | null = null
let inflight: Promise<void> | null = null
let hydratePromise: Promise<void> | null = null
let objectUrl: string | null = null

function emit() {
  for (const listener of listeners) listener()
}

function revokeObjectUrl() {
  if (!objectUrl) return
  if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(objectUrl)
  }
  objectUrl = null
}

function setMemoryState(next: RecruiterPhotoCacheState) {
  state = next
  emit()
}

function applyBlobToMemory(
  userId: string,
  photoFileId: string,
  blob: Blob
): string | null {
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    return null
  }
  revokeObjectUrl()
  objectUrl = URL.createObjectURL(blob)
  setMemoryState({
    userId,
    photoFileId,
    dataUri: objectUrl,
    status: "ready",
  })
  return objectUrl
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
export function subscribeRecruiterPhoto(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Hydrates the in-memory cache from IndexedDB once per page lifetime.
 */
export function hydrateRecruiterPhotoCache(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (hydratePromise) return hydratePromise
  if (state.status === "ready" && state.dataUri) {
    return Promise.resolve()
  }

  setMemoryState({
    ...state,
    status: state.dataUri ? state.status : "hydrating",
  })

  hydratePromise = (async () => {
    try {
      const persisted = await readAnyPersistedRecruiterPhoto()
      if (!persisted) {
        if (state.status === "hydrating") {
          setMemoryState({
            userId: null,
            photoFileId: null,
            dataUri: null,
            status: "idle",
          })
        }
        return
      }
      if (state.status === "ready" && state.dataUri && state.userId) {
        return
      }
      applyBlobToMemory(persisted.userId, persisted.photoFileId, persisted.blob)
    } catch {
      if (state.status === "hydrating") {
        setMemoryState({
          userId: null,
          photoFileId: null,
          dataUri: null,
          status: "idle",
        })
      }
    }
  })()

  return hydratePromise
}

if (typeof window !== "undefined") {
  void hydrateRecruiterPhotoCache()
}

/**
 * Writes a known photo (or clears it) after upload/delete.
 */
export function writeRecruiterPhotoCache(
  userId: string | null,
  dataUri: string | null,
  photoFileId?: string | null
) {
  const id = userId?.trim() || null
  const fileId = photoFileId?.trim() || null

  if (!id || !dataUri) {
    revokeObjectUrl()
    setMemoryState({
      userId: id,
      photoFileId: null,
      dataUri: null,
      status: "ready",
    })
    void clearPersistedRecruiterPhoto(id)
    return
  }

  const blob = dataUriToBlob(dataUri)
  if (blob && fileId) {
    applyBlobToMemory(id, fileId, blob)
    void writePersistedRecruiterPhoto({
      userId: id,
      photoFileId: fileId,
      contentType: blob.type || "image/png",
      blob,
    })
    return
  }

  revokeObjectUrl()
  setMemoryState({
    userId: id,
    photoFileId: fileId,
    dataUri,
    status: "ready",
  })
}

/**
 * Drops the cached photo, e.g. when the session ends.
 */
export function clearRecruiterPhotoCache() {
  inflight = null
  inflightUserId = null
  hydratePromise = null
  revokeObjectUrl()
  setMemoryState({
    userId: null,
    photoFileId: null,
    dataUri: null,
    status: "idle",
  })
  void clearPersistedRecruiterPhoto()
}

/**
 * Loads the photo once per user when `hasPhoto` is true.
 * Skips the network when IndexedDB already has a photo for this user.
 */
export async function loadRecruiterPhotoIfNeeded(userId: string) {
  const id = userId.trim()
  if (!id) return

  if (
    state.userId === id &&
    state.status === "ready" &&
    state.dataUri &&
    state.photoFileId
  ) {
    return
  }
  if (inflight && inflightUserId === id) {
    return inflight
  }

  inflightUserId = id
  inflight = (async () => {
    try {
      await hydrateRecruiterPhotoCache()

      if (
        state.userId === id &&
        state.status === "ready" &&
        state.dataUri &&
        state.photoFileId
      ) {
        return
      }

      if (state.userId && state.userId !== id) {
        const previousUserId = state.userId
        revokeObjectUrl()
        setMemoryState({
          userId: id,
          photoFileId: null,
          dataUri: null,
          status: "loading",
        })
        void clearPersistedRecruiterPhoto(previousUserId)
      }

      const persisted = await readPersistedRecruiterPhoto(id)
      if (persisted?.photoFileId && persisted.blob) {
        applyBlobToMemory(id, persisted.photoFileId, persisted.blob)
        return
      }

      setMemoryState({
        userId: id,
        photoFileId: state.userId === id ? state.photoFileId : null,
        dataUri: state.userId === id ? state.dataUri : null,
        status: "loading",
      })

      const photo = await getRecruiterProfilePhoto()
      if (state.userId !== id) return

      if (!photo?.dataUri) {
        revokeObjectUrl()
        setMemoryState({
          userId: id,
          photoFileId: null,
          dataUri: null,
          status: "ready",
        })
        void clearPersistedRecruiterPhoto(id)
        return
      }

      const fileId = photo.photoFileId.trim() || `legacy-${id}`
      const blob = dataUriToBlob(photo.dataUri)
      if (blob) {
        applyBlobToMemory(id, fileId, blob)
        void writePersistedRecruiterPhoto({
          userId: id,
          photoFileId: fileId,
          contentType: photo.contentType || blob.type || "image/png",
          blob,
        })
        return
      }

      revokeObjectUrl()
      setMemoryState({
        userId: id,
        photoFileId: fileId,
        dataUri: photo.dataUri,
        status: "ready",
      })
    } catch {
      if (state.userId !== id) return
      if (state.dataUri) {
        setMemoryState({
          ...state,
          status: "ready",
        })
        return
      }
      setMemoryState({
        userId: id,
        photoFileId: null,
        dataUri: null,
        status: "ready",
      })
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

/**
 * Test helper: resets module state without touching IndexedDB side effects already queued.
 */
export function resetRecruiterPhotoCacheForTests() {
  inflight = null
  inflightUserId = null
  hydratePromise = null
  revokeObjectUrl()
  state = {
    userId: null,
    photoFileId: null,
    dataUri: null,
    status: "idle",
  }
}
