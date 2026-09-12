"use client"

import { useSyncExternalStore } from "react"

export const BELOW_LG_MEDIA_QUERY = "(max-width: 1023px)"

function subscribeBelowLg(onStoreChange: () => void) {
  const media = window.matchMedia(BELOW_LG_MEDIA_QUERY)
  media.addEventListener("change", onStoreChange)
  return () => media.removeEventListener("change", onStoreChange)
}

function getBelowLgSnapshot() {
  return window.matchMedia(BELOW_LG_MEDIA_QUERY).matches
}

function getBelowLgServerSnapshot() {
  return false
}

/**
 * True cuando el viewport es menor que el breakpoint `lg` de Tailwind (1024px).
 */
export function useIsBelowLg() {
  return useSyncExternalStore(
    subscribeBelowLg,
    getBelowLgSnapshot,
    getBelowLgServerSnapshot
  )
}
