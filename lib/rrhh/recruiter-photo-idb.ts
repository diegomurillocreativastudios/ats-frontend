const DB_NAME = "ats-recruiter-photo"
const DB_VERSION = 1
const STORE_NAME = "photos"

export type PersistedRecruiterPhoto = {
  userId: string
  photoFileId: string
  contentType: string
  blob: Blob
}

function canUseIndexedDb(): boolean {
  return typeof indexedDB !== "undefined"
}

function openPhotoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!canUseIndexedDb()) {
      reject(new Error("IndexedDB unavailable"))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => {
      reject(request.error ?? new Error("IndexedDB open failed"))
    }
    request.onsuccess = () => {
      resolve(request.result)
    }
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "userId" })
      }
    }
  })
}

/**
 * Reads the persisted recruiter photo for a user, if any.
 */
export async function readPersistedRecruiterPhoto(
  userId: string
): Promise<PersistedRecruiterPhoto | null> {
  const id = userId.trim()
  if (!id || !canUseIndexedDb()) return null

  try {
    const db = await openPhotoDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly")
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(id)
      request.onerror = () => {
        reject(request.error ?? new Error("IndexedDB get failed"))
      }
      request.onsuccess = () => {
        const row = request.result as PersistedRecruiterPhoto | undefined
        if (
          !row ||
          typeof row.userId !== "string" ||
          typeof row.photoFileId !== "string" ||
          !(row.blob instanceof Blob)
        ) {
          resolve(null)
          return
        }
        resolve(row)
      }
      tx.oncomplete = () => {
        db.close()
      }
    })
  } catch {
    return null
  }
}

/**
 * Reads any single persisted photo (used for instant hydrate before /me).
 */
export async function readAnyPersistedRecruiterPhoto(): Promise<PersistedRecruiterPhoto | null> {
  if (!canUseIndexedDb()) return null

  try {
    const db = await openPhotoDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly")
      const store = tx.objectStore(STORE_NAME)
      const request = store.openCursor()
      request.onerror = () => {
        reject(request.error ?? new Error("IndexedDB cursor failed"))
      }
      request.onsuccess = () => {
        const cursor = request.result
        if (!cursor) {
          resolve(null)
          return
        }
        const row = cursor.value as PersistedRecruiterPhoto
        if (
          typeof row.userId !== "string" ||
          typeof row.photoFileId !== "string" ||
          !(row.blob instanceof Blob)
        ) {
          resolve(null)
          return
        }
        resolve(row)
      }
      tx.oncomplete = () => {
        db.close()
      }
    })
  } catch {
    return null
  }
}

/**
 * Persists a recruiter photo blob keyed by userId.
 */
export async function writePersistedRecruiterPhoto(
  photo: PersistedRecruiterPhoto
): Promise<void> {
  const userId = photo.userId.trim()
  const photoFileId = photo.photoFileId.trim()
  if (!userId || !photoFileId || !canUseIndexedDb()) return

  try {
    const db = await openPhotoDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)
      store.put({
        userId,
        photoFileId,
        contentType: photo.contentType || photo.blob.type || "image/png",
        blob: photo.blob,
      } satisfies PersistedRecruiterPhoto)
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        reject(tx.error ?? new Error("IndexedDB put failed"))
      }
    })
  } catch {
    // Best-effort persistence; memory cache still works.
  }
}

/**
 * Removes the persisted photo for one user, or all photos when omitted.
 */
export async function clearPersistedRecruiterPhoto(
  userId?: string | null
): Promise<void> {
  if (!canUseIndexedDb()) return

  try {
    const db = await openPhotoDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)
      const id = userId?.trim()
      if (id) {
        store.delete(id)
      } else {
        store.clear()
      }
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        reject(tx.error ?? new Error("IndexedDB clear failed"))
      }
    })
  } catch {
    // Best-effort clear.
  }
}

/**
 * Converts a raster data URI into a Blob for IndexedDB storage.
 */
export function dataUriToBlob(dataUri: string): Blob | null {
  const trimmed = dataUri.trim()
  if (!trimmed.startsWith("data:")) return null

  const match = /^data:([^;,]+);base64,(.+)$/i.exec(trimmed)
  if (!match) return null

  const contentType = match[1]?.trim() || "image/png"
  const base64 = match[2]
  if (!base64) return null

  try {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }
    return new Blob([bytes], { type: contentType })
  } catch {
    return null
  }
}
