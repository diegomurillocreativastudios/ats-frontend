import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"

const photoState = vi.hoisted(() => ({
  dataUri: null as string | null,
}))

const getCurrentUserStateMock = vi.hoisted(() =>
  vi.fn(() => ({ user: null, status: "idle" as const }))
)
const loadCurrentUserMock = vi.hoisted(() => vi.fn())
const subscribeCurrentUserMock = vi.hoisted(() => vi.fn())
const getRecruiterPhotoStateMock = vi.hoisted(() =>
  vi.fn(() => ({
    userId: null,
    photoFileId: null,
    dataUri: photoState.dataUri,
    status: "idle" as const,
  }))
)
const hydrateRecruiterPhotoCacheMock = vi.hoisted(() => vi.fn())
const subscribeRecruiterPhotoMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/rrhh/current-user-store", () => ({
  getCurrentUserState: () => getCurrentUserStateMock(),
  loadCurrentUser: (...args: unknown[]) => loadCurrentUserMock(...args),
  subscribeCurrentUser: (listener: () => void) =>
    subscribeCurrentUserMock(listener),
}))

vi.mock("@/lib/rrhh/recruiter-photo-cache", () => ({
  getRecruiterPhotoState: () => getRecruiterPhotoStateMock(),
  hydrateRecruiterPhotoCache: () => hydrateRecruiterPhotoCacheMock(),
  subscribeRecruiterPhoto: (listener: () => void) =>
    subscribeRecruiterPhotoMock(listener),
}))

import {
  notifyCurrentUserUpdated,
  useCurrentUser,
} from "@/hooks/useCurrentUser"

describe("useCurrentUser", () => {
  beforeEach(() => {
    photoState.dataUri = null
    getCurrentUserStateMock.mockReset()
    loadCurrentUserMock.mockReset()
    subscribeCurrentUserMock.mockReset()
    getRecruiterPhotoStateMock.mockReset()
    hydrateRecruiterPhotoCacheMock.mockReset()
    subscribeRecruiterPhotoMock.mockReset()

    getCurrentUserStateMock.mockReturnValue({ user: null, status: "idle" })
    getRecruiterPhotoStateMock.mockImplementation(() => ({
      userId: null,
      photoFileId: null,
      dataUri: photoState.dataUri,
      status: photoState.dataUri ? ("ready" as const) : ("idle" as const),
    }))
    hydrateRecruiterPhotoCacheMock.mockResolvedValue(undefined)
    loadCurrentUserMock.mockResolvedValue(undefined)
    subscribeCurrentUserMock.mockImplementation(() => () => undefined)
    subscribeRecruiterPhotoMock.mockImplementation(() => () => undefined)
  })

  it("reads photoSrc from the shared cache after subscribe (not on the server snapshot)", async () => {
    photoState.dataUri = "blob:http://localhost/cached-photo"
    let photoListener: (() => void) | null = null
    subscribeRecruiterPhotoMock.mockImplementation((listener: () => void) => {
      photoListener = listener
      return () => undefined
    })

    const { result } = renderHook(() => useCurrentUser())

    // Client subscribe may already see the cache; either way hydrate + load run.
    expect(hydrateRecruiterPhotoCacheMock).toHaveBeenCalled()
    expect(loadCurrentUserMock).toHaveBeenCalled()

    act(() => {
      photoListener?.()
    })

    await waitFor(() => {
      expect(result.current.photoSrc).toBe("blob:http://localhost/cached-photo")
    })
  })

  it("force-reloads the shared session on notifyCurrentUserUpdated", async () => {
    let userListener: (() => void) | null = null
    subscribeCurrentUserMock.mockImplementation((listener: () => void) => {
      userListener = listener
      return () => undefined
    })

    renderHook(() => useCurrentUser())
    await waitFor(() => {
      expect(loadCurrentUserMock).toHaveBeenCalled()
    })
    loadCurrentUserMock.mockClear()

    act(() => {
      notifyCurrentUserUpdated()
    })

    await waitFor(() => {
      expect(loadCurrentUserMock).toHaveBeenCalledWith({ force: true })
    })
    expect(userListener).toBeTypeOf("function")
  })
})
