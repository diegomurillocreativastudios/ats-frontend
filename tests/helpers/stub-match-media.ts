import { vi } from "vitest"
import { BELOW_LG_MEDIA_QUERY } from "@/hooks/use-is-below-lg"

/**
 * Sustituye `window.matchMedia` para tests de layout bajo o sobre 1024px.
 */
export function stubMatchMedia(isBelowLg: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === BELOW_LG_MEDIA_QUERY ? isBelowLg : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}
