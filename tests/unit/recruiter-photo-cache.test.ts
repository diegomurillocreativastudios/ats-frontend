import { beforeEach, describe, expect, it, vi } from "vitest"

const getRecruiterProfilePhotoMock = vi.hoisted(() => vi.fn())
const readAnyPersistedRecruiterPhotoMock = vi.hoisted(() => vi.fn())
const readPersistedRecruiterPhotoMock = vi.hoisted(() => vi.fn())
const writePersistedRecruiterPhotoMock = vi.hoisted(() => vi.fn())
const clearPersistedRecruiterPhotoMock = vi.hoisted(() => vi.fn())
const dataUriToBlobMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/api/recruiter-profile-photo", () => ({
  getRecruiterProfilePhoto: (...args: unknown[]) =>
    getRecruiterProfilePhotoMock(...args),
}))

vi.mock("@/lib/rrhh/recruiter-photo-idb", () => ({
  readAnyPersistedRecruiterPhoto: (...args: unknown[]) =>
    readAnyPersistedRecruiterPhotoMock(...args),
  readPersistedRecruiterPhoto: (...args: unknown[]) =>
    readPersistedRecruiterPhotoMock(...args),
  writePersistedRecruiterPhoto: (...args: unknown[]) =>
    writePersistedRecruiterPhotoMock(...args),
  clearPersistedRecruiterPhoto: (...args: unknown[]) =>
    clearPersistedRecruiterPhotoMock(...args),
  dataUriToBlob: (...args: unknown[]) => dataUriToBlobMock(...args),
}))

import {
  clearRecruiterPhotoCache,
  getRecruiterPhotoState,
  hydrateRecruiterPhotoCache,
  loadRecruiterPhotoIfNeeded,
  resetRecruiterPhotoCacheForTests,
  writeRecruiterPhotoCache,
} from "@/lib/rrhh/recruiter-photo-cache"

describe("recruiter-photo-cache", () => {
  beforeEach(() => {
    resetRecruiterPhotoCacheForTests()
    getRecruiterProfilePhotoMock.mockReset()
    readAnyPersistedRecruiterPhotoMock.mockReset()
    readPersistedRecruiterPhotoMock.mockReset()
    writePersistedRecruiterPhotoMock.mockReset()
    clearPersistedRecruiterPhotoMock.mockReset()
    dataUriToBlobMock.mockReset()
    readAnyPersistedRecruiterPhotoMock.mockResolvedValue(null)
    readPersistedRecruiterPhotoMock.mockResolvedValue(null)
    writePersistedRecruiterPhotoMock.mockResolvedValue(undefined)
    clearPersistedRecruiterPhotoMock.mockResolvedValue(undefined)
  })

  it("hydrates from IndexedDB and skips the network for the same user", async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" })
    readAnyPersistedRecruiterPhotoMock.mockResolvedValueOnce({
      userId: "u-1",
      photoFileId: "p-1",
      contentType: "image/png",
      blob,
    })
    readPersistedRecruiterPhotoMock.mockResolvedValue({
      userId: "u-1",
      photoFileId: "p-1",
      contentType: "image/png",
      blob,
    })

    await hydrateRecruiterPhotoCache()
    const hydrated = getRecruiterPhotoState()
    expect(hydrated.status).toBe("ready")
    expect(hydrated.userId).toBe("u-1")
    expect(hydrated.photoFileId).toBe("p-1")
    expect(hydrated.dataUri).toMatch(/^blob:/)

    await loadRecruiterPhotoIfNeeded("u-1")
    expect(getRecruiterProfilePhotoMock).not.toHaveBeenCalled()
  })

  it("dedupes concurrent network loads for the same user", async () => {
    let resolvePhoto: (value: unknown) => void = () => undefined
    getRecruiterProfilePhotoMock.mockReturnValue(
      new Promise((resolve) => {
        resolvePhoto = resolve
      })
    )
    dataUriToBlobMock.mockReturnValue(
      new Blob([new Uint8Array([9])], { type: "image/png" })
    )

    const first = loadRecruiterPhotoIfNeeded("u-1")
    const second = loadRecruiterPhotoIfNeeded("u-1")

    await vi.waitFor(() => {
      expect(getRecruiterProfilePhotoMock).toHaveBeenCalledTimes(1)
    })

    resolvePhoto({
      photoFileId: "p-1",
      contentType: "image/png",
      fileName: null,
      sizeBytes: 1,
      dataUri: "data:image/png;base64,aa",
    })
    await Promise.all([first, second])

    expect(getRecruiterPhotoState().dataUri).toMatch(/^blob:/)
    expect(writePersistedRecruiterPhotoMock).toHaveBeenCalled()
  })

  it("clears memory and IndexedDB on clear", () => {
    dataUriToBlobMock.mockReturnValue(
      new Blob([new Uint8Array([1])], { type: "image/png" })
    )
    writeRecruiterPhotoCache("u-1", "data:image/png;base64,aa", "p-1")
    expect(getRecruiterPhotoState().dataUri).toMatch(/^blob:/)

    clearRecruiterPhotoCache()
    expect(getRecruiterPhotoState()).toEqual({
      userId: null,
      photoFileId: null,
      dataUri: null,
      status: "idle",
    })
    expect(clearPersistedRecruiterPhotoMock).toHaveBeenCalled()
  })

  it("replaces a hydrated user when a different user loads", async () => {
    const blob = new Blob([new Uint8Array([1])], { type: "image/png" })
    readAnyPersistedRecruiterPhotoMock.mockResolvedValueOnce({
      userId: "u-old",
      photoFileId: "p-old",
      contentType: "image/png",
      blob,
    })
    await hydrateRecruiterPhotoCache()
    expect(getRecruiterPhotoState().userId).toBe("u-old")

    getRecruiterProfilePhotoMock.mockResolvedValueOnce({
      photoFileId: "p-new",
      contentType: "image/png",
      fileName: null,
      sizeBytes: 1,
      dataUri: "data:image/png;base64,bb",
    })
    dataUriToBlobMock.mockReturnValue(
      new Blob([new Uint8Array([2])], { type: "image/png" })
    )

    await loadRecruiterPhotoIfNeeded("u-new")
    expect(clearPersistedRecruiterPhotoMock).toHaveBeenCalledWith("u-old")
    expect(getRecruiterPhotoState().userId).toBe("u-new")
    expect(getRecruiterProfilePhotoMock).toHaveBeenCalledTimes(1)
  })
})
