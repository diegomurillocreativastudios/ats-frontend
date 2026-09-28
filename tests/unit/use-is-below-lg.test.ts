import { afterEach, describe, expect, it } from "vitest"
import { renderHook } from "@testing-library/react"

import { useIsBelowLg } from "@/hooks/use-is-below-lg"
import { stubMatchMedia } from "@/tests/helpers/stub-match-media"

describe("useIsBelowLg", () => {
  afterEach(() => {
    stubMatchMedia(false)
  })

  it("es false desde 1024px", () => {
    stubMatchMedia(false)
    const { result } = renderHook(() => useIsBelowLg())
    expect(result.current).toBe(false)
  })

  it("es true bajo 1024px", () => {
    stubMatchMedia(true)
    const { result } = renderHook(() => useIsBelowLg())
    expect(result.current).toBe(true)
  })
})
