"use client"

import { useEffect, useCallback, type MouseEvent } from "react"
import { useTranslations } from "next-intl"
import { X, Mail } from "lucide-react"
import type { PublicVacancyApplicationFormTheme } from "@/components/public/PublicVacancyApplicationForm"

interface ApplyEmailConfirmationModalProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  email: string
  theme?: PublicVacancyApplicationFormTheme
  isSubmitting?: boolean
}

export function ApplyEmailConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
  email,
  theme = "dark",
  isSubmitting = false,
}: ApplyEmailConfirmationModalProps) {
  const t = useTranslations("PublicOpportunities.confirmation")
  const tCommon = useTranslations("Common")
  const isDark = theme === "dark"

  const handleEscape = useCallback(
    (e: Event) => {
      if (isSubmitting || !(e instanceof KeyboardEvent) || e.key !== "Escape") return
      onCancel()
    },
    [isSubmitting, onCancel]
  )

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onCancel()
    }
  }

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = ""
    }
  }, [isOpen, handleEscape])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-email-title"
      onClick={handleOverlayClick}
    >
      <div
        className={
          isDark
            ? "relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(42,43,46,0.97)_0%,rgba(32,33,36,0.99)_100%)] shadow-[0_40px_120px_rgba(0,0,0,0.6)] backdrop-blur-xl"
            : "relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl"
        }
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <header
          className={
            isDark
              ? "flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-5"
              : "flex shrink-0 items-center justify-between border-b border-border px-6 py-5"
          }
        >
          <h2
            id="confirm-email-title"
            className={
              isDark
                ? "text-lg font-semibold text-white"
                : "text-lg font-semibold text-foreground"
            }
          >
            {t("title")}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className={
              isDark
                ? "flex h-8 w-8 items-center justify-center rounded-lg text-white/64 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-ats-cobre focus:ring-offset-2 focus:ring-offset-ats-grafito disabled:cursor-not-allowed disabled:opacity-50"
                : "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ats-terracotta focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            }
            aria-label={t("closeAria")}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div
          className={
            isDark
              ? "min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-contain px-6 py-5"
              : "min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-contain px-6 py-5"
          }
        >
          <div
            className={
              isDark
                ? "rounded-2xl border border-white/10 bg-white/6 p-4"
                : "rounded-lg border border-border bg-muted/40 p-4"
            }
          >
            <p
              className={
                isDark
                  ? "text-sm font-medium text-white/90"
                  : "text-sm font-medium text-foreground"
              }
            >
              {t("contactEmail")}
            </p>
            <p
              className={
                isDark
                  ? "mt-1.5 break-all text-base font-semibold text-ats-cobre-light"
                  : "mt-1.5 break-all text-base font-semibold text-ats-terracotta"
              }
            >
              {email}
            </p>
          </div>

          <div className="space-y-3">
            <p
              className={
                isDark
                  ? "text-sm leading-relaxed text-white/82"
                  : "text-sm leading-relaxed text-foreground"
              }
            >
              {t("body1")}
            </p>
            <p
              className={
                isDark
                  ? "text-sm leading-relaxed text-white/82"
                  : "text-sm leading-relaxed text-foreground"
              }
            >
              {t("body2")}
            </p>
          </div>

          <div
            className={
              isDark
                ? "rounded-2xl border border-ats-cobre-light/20 bg-ats-cobre-light/8 p-4"
                : "rounded-lg border border-amber-200 bg-amber-50 p-4"
            }
          >
            <p
              className={
                isDark
                  ? "text-xs leading-relaxed text-white/76"
                  : "text-xs leading-relaxed text-amber-900"
              }
            >
              {t("warning")}
            </p>
          </div>
        </div>

        <footer
          className={
            isDark
              ? "flex shrink-0 items-center justify-end gap-3 border-t border-white/10 px-6 py-5"
              : "flex shrink-0 items-center justify-end gap-3 border-t border-border px-6 py-5"
          }
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className={
              isDark
                ? "inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/16 disabled:cursor-not-allowed disabled:opacity-50"
                : "inline-flex items-center justify-center rounded-lg border border-border bg-muted px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-50"
            }
          >
            {tCommon("cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className={
              isDark
                ? "inline-flex items-center justify-center gap-2 rounded-full bg-ats-warm-white px-5 py-2.5 text-sm font-medium text-ats-grafito transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                : "inline-flex items-center justify-center gap-2 rounded-lg bg-ats-terracotta px-5 py-2.5 text-sm font-medium text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            }
          >
            <Mail className="h-4 w-4 shrink-0" aria-hidden />
            {t("confirm")}
          </button>
        </footer>
      </div>
    </div>
  )
}
