"use client"

import {
  useEffect,
  useCallback,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type AnimationEvent,
  type ReactNode,
  type MouseEvent,
} from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { useTranslations } from "next-intl"

/** Fallback if `animationend` does not fire (reduced motion / interrupted). */
const EXIT_FALLBACK_MS = 280

const MODAL_STYLES = {
  overlayBase:
    "ui-modal-backdrop fixed inset-0 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[3px]",
  getContent: (sizeClass: string) =>
    `ui-modal-panel glass-modal glass-iridescent-border relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl ${sizeClass}`,
  header:
    "shrink-0 flex items-center justify-between border-b border-border px-6 py-4",
  body: "min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 py-5",
  footer:
    "shrink-0 flex items-center justify-end gap-3 border-t border-border px-6 py-4",
}

const SIZE_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
}

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  size?: keyof typeof SIZE_CLASSES
  /** Clases extra para el cuerpo (p. ej. overflow-visible si hay menús absolutos). */
  bodyClassName?: string
  /** Clases extra para el panel (p. ej. fondo sólido). */
  contentClassName?: string
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  /** Por defecto z-50; use p. ej. z-[100] si este modal se abre encima de otro. */
  overlayZIndexClass?: string
}

type ModalPhase = "closed" | "open" | "closing"

/**
 * Modal de pantalla completa vía portal a `document.body`, para no quedar
 * recortado por contenedores con `overflow-hidden` / stacking contexts.
 * Entrada/salida con keyframes (backdrop + panel) y easing tipo spring.
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  bodyClassName = "",
  contentClassName = "",
  closeOnOverlayClick = true,
  closeOnEscape = true,
  overlayZIndexClass = "z-50",
}: ModalProps) {
  const t = useTranslations("Common")
  const titleId = useId()
  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.md
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const [phase, setPhase] = useState<ModalPhase>("closed")
  const exitTimerRef = useRef<number | null>(null)
  const isInteractive = phase === "open"

  const clearExitTimer = useCallback(() => {
    if (exitTimerRef.current != null) {
      window.clearTimeout(exitTimerRef.current)
      exitTimerRef.current = null
    }
  }, [])

  const finishClose = useCallback(() => {
    clearExitTimer()
    setPhase("closed")
  }, [clearExitTimer])

  const handleEscape = useCallback(
    (e: Event) => {
      if (!closeOnEscape || !(e instanceof KeyboardEvent) || e.key !== "Escape") {
        return
      }
      if (!isInteractive) return
      onClose?.()
    },
    [closeOnEscape, onClose, isInteractive]
  )

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!isInteractive) return
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose?.()
    }
  }

  const handlePanelAnimationEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    if (phase !== "closing") return
    if (e.animationName !== "ui-modal-panel-out") return
    finishClose()
  }

  useEffect(() => {
    if (!isClient) return undefined

    if (isOpen) {
      clearExitTimer()
      setPhase("open")
      return undefined
    }

    let cancelled = false
    setPhase((current) => (current === "closed" ? "closed" : "closing"))
    clearExitTimer()
    exitTimerRef.current = window.setTimeout(() => {
      exitTimerRef.current = null
      if (!cancelled) setPhase("closed")
    }, EXIT_FALLBACK_MS)

    return () => {
      cancelled = true
      clearExitTimer()
    }
  }, [isOpen, isClient, clearExitTimer])

  useEffect(() => {
    if (phase === "closed") return undefined
    document.addEventListener("keydown", handleEscape)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = ""
    }
  }, [phase, handleEscape])

  useEffect(() => {
    return () => clearExitTimer()
  }, [clearExitTimer])

  if (!isClient || phase === "closed") return null

  const isClosing = phase === "closing"

  return createPortal(
    <div
      className={[
        MODAL_STYLES.overlayBase,
        isClosing ? "ui-modal-backdrop--exit" : "",
        isClosing ? "pointer-events-none" : "",
        overlayZIndexClass,
      ]
        .filter(Boolean)
        .join(" ")}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={handleOverlayClick}
    >
      <div
        className={[
          MODAL_STYLES.getContent(sizeClass),
          isClosing ? "ui-modal-panel--exit" : "",
          contentClassName,
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={handlePanelAnimationEnd}
        role="document"
      >
        <header className={MODAL_STYLES.header}>
          <h2
            id={titleId}
            className="font-sans text-lg font-semibold text-foreground"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={!isInteractive}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            aria-label={t("closeModal")}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>
        <div className={`${MODAL_STYLES.body} ${bodyClassName}`.trim()}>
          {children}
        </div>
        {footer ? <footer className={MODAL_STYLES.footer}>{footer}</footer> : null}
      </div>
    </div>,
    document.body
  )
}
