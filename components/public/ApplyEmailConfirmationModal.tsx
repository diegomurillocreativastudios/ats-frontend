"use client"

import { useEffect, useCallback, type MouseEvent } from "react"
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
            ? "relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(35,45,76,0.97)_0%,rgba(19,27,50,0.99)_100%)] shadow-[0_40px_120px_rgba(0,0,0,0.6)] backdrop-blur-xl"
            : "relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-white shadow-xl"
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
            Confirma tu correo de contacto
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className={
              isDark
                ? "flex h-8 w-8 items-center justify-center rounded-lg text-white/64 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#f0a7ff] focus:ring-offset-2 focus:ring-offset-[#1a2238] disabled:cursor-not-allowed disabled:opacity-50"
                : "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            }
            aria-label="Cerrar modal"
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
              Correo de contacto:
            </p>
            <p
              className={
                isDark
                  ? "mt-1.5 break-all text-base font-semibold text-[#8dd8ff]"
                  : "mt-1.5 break-all text-base font-semibold text-vo-purple"
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
              El correo electrónico ingresado en este formulario será utilizado como medio
              principal de contacto para el seguimiento de tu postulación.
            </p>
            <p
              className={
                isDark
                  ? "text-sm leading-relaxed text-white/82"
                  : "text-sm leading-relaxed text-foreground"
              }
            >
              Si este correo no coincide con el correo que aparece en tu hoja de vida, se tomará
              como válido el correo ingresado en el formulario.
            </p>
          </div>

          <div
            className={
              isDark
                ? "rounded-2xl border border-[#f6c482]/20 bg-[#f6c482]/8 p-4"
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
              Antes de continuar, verifica que el correo esté escrito correctamente y que tengas
              acceso a él.
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
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className={
              isDark
                ? "inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#18213d] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                : "inline-flex items-center justify-center gap-2 rounded-lg bg-vo-purple px-5 py-2.5 text-sm font-medium text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            }
          >
            <Mail className="h-4 w-4 shrink-0" aria-hidden />
            Confirmar y enviar postulación
          </button>
        </footer>
      </div>
    </div>
  )
}
