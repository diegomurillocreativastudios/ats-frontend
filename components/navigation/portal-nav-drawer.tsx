"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
  type ReactNode,
  type TransitionEvent,
} from "react"
import { createPortal } from "react-dom"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { X } from "lucide-react"

const DRAWER_TRANSITION_MS = 300

interface PortalNavDrawerProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}

/**
 * Left slide-over for portal navigation below `lg`. Reuses each portal sidebar
 * as children; closes on Escape, overlay click, or route change.
 * Enter/exit animate overlay fade + panel slide.
 */
export function PortalNavDrawer({
  isOpen,
  onClose,
  children,
}: PortalNavDrawerProps) {
  const t = useTranslations("Topbar")
  const pathname = usePathname()
  const pathnameWhenOpened = useRef<string | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [isEntered, setIsEntered] = useState(false)
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  useEffect(() => {
    if (!isOpen) {
      pathnameWhenOpened.current = null
      return
    }
    pathnameWhenOpened.current = pathname
  }, [isOpen, pathname])

  useEffect(() => {
    if (!isOpen) return
    if (pathnameWhenOpened.current === null) return
    if (pathname !== pathnameWhenOpened.current) {
      onClose()
    }
  }, [pathname, isOpen, onClose])

  useEffect(() => {
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current)
      exitTimerRef.current = null
    }

    if (isOpen) {
      setIsMounted(true)
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsEntered(true)
        })
      })
      return () => cancelAnimationFrame(frame)
    }

    if (!isMounted) return

    setIsEntered(false)
    exitTimerRef.current = setTimeout(() => {
      setIsMounted(false)
      exitTimerRef.current = null
    }, DRAWER_TRANSITION_MS)

    return () => {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current)
        exitTimerRef.current = null
      }
    }
  }, [isOpen, isMounted])

  const handleEscape = useCallback(
    (event: Event) => {
      if (!(event instanceof KeyboardEvent) || event.key !== "Escape") return
      onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (!isMounted) return

    document.addEventListener("keydown", handleEscape)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    if (isEntered) {
      closeButtonRef.current?.focus()
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = previousOverflow
    }
  }, [isMounted, isEntered, handleEscape])

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  const handlePanelTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== panelRef.current) return
    if (event.propertyName !== "transform") return
    if (isOpen) return
    setIsMounted(false)
  }

  if (!isClient || !isMounted) return null

  return createPortal(
    <div
      className={`fixed inset-0 z-60 flex transition-[background-color,backdrop-filter] duration-300 ease-out motion-reduce:transition-none ${
        isEntered ? "bg-black/45 backdrop-blur-sm" : "bg-transparent"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={t("navigationMenu")}
      onClick={handleOverlayClick}
    >
      <div
        ref={panelRef}
        className={`relative flex h-dvh max-h-dvh w-[min(100vw,280px)] shrink-0 flex-col overflow-hidden bg-white shadow-xl transition-transform duration-300 ease-out motion-reduce:transition-none ${
          isEntered ? "translate-x-0" : "-translate-x-full"
        }`}
        onClick={(event) => event.stopPropagation()}
        onTransitionEnd={handlePanelTransitionEnd}
        role="document"
      >
        <div className="flex shrink-0 items-center justify-end border-b border-border px-2 py-1">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
            aria-label={t("closeMenu")}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col [&_aside]:h-full [&_aside]:w-full [&_aside]:max-w-none [&_aside]:border-0 [&_aside]:bg-transparent [&_aside]:pt-3">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
