"use client"

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { useTranslations } from "next-intl"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/Button"
import { publicOpportunitiesTheme } from "@/lib/public-opportunities-theme"

interface ApplyPrivacyNoticeDialogProps {
  isOpen: boolean
  onAccept: () => void
  onDecline: () => void
}

/**
 * Aviso de privacidad obligatorio antes de usar el formulario de postulación pública.
 * Panel con entrada desde arriba; al aceptar, salida inversa hacia arriba.
 * Sin cierre por overlay ni Escape.
 */
export function ApplyPrivacyNoticeDialog({
  isOpen,
  onAccept,
  onDecline,
}: ApplyPrivacyNoticeDialogProps) {
  const t = useTranslations("PublicOpportunities.privacy")
  const [isExitAnimating, setIsExitAnimating] = useState(false)
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const titleId = useId()
  const bodyId = useId()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const id = requestAnimationFrame(() => {
      document.getElementById("apply-privacy-decline")?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    document.addEventListener("keydown", handleKeyDown, true)
    return () => document.removeEventListener("keydown", handleKeyDown, true)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const getFocusable = (root: HTMLElement) =>
      root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !containerRef.current) return
      const focusable = getFocusable(containerRef.current)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  const handlePanelAnimationEnd = useCallback(
    (e: React.AnimationEvent<HTMLDivElement>) => {
      if (e.animationName === "apply-privacy-panel-slide-exit") {
        onAccept()
      }
    },
    [onAccept]
  )

  const handleAccept = useCallback(() => {
    setIsExitAnimating(true)
  }, [])

  if (!isClient || !isOpen) {
    return null
  }

  return createPortal(
    <div
      className={[
        isExitAnimating
          ? "apply-privacy-backdrop apply-privacy-backdrop--exit"
          : "apply-privacy-backdrop",
        "fixed inset-0 z-200 flex flex-col items-stretch justify-start bg-foreground/25 px-3 pt-3 pb-6 backdrop-blur-sm sm:pt-5 sm:px-5",
        isExitAnimating ? "pointer-events-none" : "pointer-events-auto",
      ].join(" ")}
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
    >
      <div
        className={[
          "apply-privacy-panel",
          isExitAnimating && "apply-privacy-panel--exit",
          `mx-auto flex w-full max-h-[min(90dvh,920px)] max-w-2xl flex-col overflow-hidden rounded-[20px] ${publicOpportunitiesTheme.panel} sm:rounded-[24px]`,
        ]
          .filter(Boolean)
          .join(" ")}
        onAnimationEnd={handlePanelAnimationEnd}
      >
        <div className="shrink-0 border-b border-border px-4 py-4 sm:px-6 sm:py-5">
          <h2
            id={titleId}
            className="text-balance text-center text-base font-semibold uppercase leading-snug tracking-[0.06em] text-foreground sm:text-lg"
          >
            {t("title")}
          </h2>
        </div>

        <div
          id={bodyId}
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 text-sm leading-relaxed text-foreground/90 sm:px-6 sm:py-5"
        >
          <p className="text-pretty text-foreground/88">{t("intro")}</p>
          <p className="mt-4 font-medium text-foreground/92">{t("dataTreatmentHeading")}</p>
          <ul className="mt-2 list-inside list-disc space-y-2.5 pl-0.5 text-foreground/86 marker:text-ats-terracotta">
            <li>{t("purposeItem")}</li>
            <li>{t("accessItem")}</li>
            <li>{t("confidentialityItem")}</li>
            <li>{t("rightsItem")}</li>
          </ul>
          <p className="mt-4 text-foreground/86">{t("compliance")}</p>
          <p className="mt-4 text-foreground/86">
            {t("contactPrefix")}{" "}
            <a
              className="font-medium text-ats-terracotta underline decoration-border underline-offset-2 transition-colors hover:text-ats-terracotta-hover hover:decoration-ats-terracotta/40 focus:outline-none focus:ring-2 focus:ring-ats-cobre focus:ring-offset-2 focus:ring-offset-background"
              href="mailto:info@applicantree.com"
            >
              info@applicantree.com
            </a>
          </p>
        </div>

        <div className={`shrink-0 border-t border-border bg-muted/20 px-4 py-4 sm:px-6 sm:py-4`}>
          <div className="flex w-full flex-col items-stretch justify-end gap-2.5 sm:flex-row sm:items-center sm:gap-3">
            <Button
              id="apply-privacy-decline"
              type="button"
              variant="outline"
              onClick={onDecline}
              disabled={isExitAnimating}
              className="w-full border-border bg-card text-foreground hover:bg-muted/40 hover:text-foreground focus-visible:ring-ats-cobre sm:w-auto"
            >
              {t("decline")}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleAccept}
              disabled={isExitAnimating}
              className="w-full sm:w-auto"
            >
              {t("accept")}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
