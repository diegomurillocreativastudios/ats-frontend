"use client"

import { useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Check, ChevronDown, Globe } from "lucide-react"

import { useRouter } from "@/i18n/navigation"
import { locales, localeCookieName, type Locale } from "@/i18n/routing"

/**
 * Selector de idioma de la plataforma (Etapa 2 de i18n).
 *
 * Ruteo SIN prefijo de URL: el cambio de idioma se persiste en la cookie
 * `NEXT_LOCALE` (ver `i18n/routing.ts` -> `localeCookieName`) y se refleja en la
 * UI con `router.refresh()`, que re-ejecuta los Server Components y vuelve a
 * resolver el locale en `i18n/request.ts`.
 *
 * IMPORTANTE: solo cambia la UI estática preparada con `next-intl`. NO traduce,
 * transforma ni reprocesa data generada por IA, contenido de BD/API ni input de
 * usuario. Los nombres de idioma mostrados son endónimos (no se traducen).
 */

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365

interface LocaleMeta {
  /** Nombre nativo del idioma (endónimo). No se traduce. */
  endonym: string
  /** Clave del diccionario `LanguageSwitcher` para el nombre traducido (a11y). */
  nameKey: "spanish" | "english" | "italian" | "german" | "french"
}

const LOCALE_META: Record<Locale, LocaleMeta> = {
  es: { endonym: "Español", nameKey: "spanish" },
  en: { endonym: "English", nameKey: "english" },
  it: { endonym: "Italiano", nameKey: "italian" },
  de: { endonym: "Deutsch", nameKey: "german" },
  fr: { endonym: "Français", nameKey: "french" },
}

/** Persiste el locale elegido en la cookie `NEXT_LOCALE` (cliente). */
function persistLocaleCookie(locale: Locale) {
  document.cookie = `${localeCookieName}=${locale}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; samesite=lax`
}

interface LanguageSwitcherProps {
  /** Clase adicional para el contenedor (posicionamiento en topbars/sidebars). */
  className?: string
  /** `onDark` para navbars o paneles con fondo oscuro. */
  tone?: "default" | "onDark"
  /** Sobrescribe las clases del botón disparador (p. ej. para igualar otros controles del navbar). */
  triggerClassName?: string
}

export default function LanguageSwitcher({
  className,
  tone = "default",
  triggerClassName,
}: LanguageSwitcherProps) {
  const t = useTranslations("LanguageSwitcher")
  const activeLocale = useLocale() as Locale
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("click", handleClickOutside)
    }
    return () => document.removeEventListener("click", handleClickOutside)
  }, [open])

  const handleSelect = (locale: Locale) => {
    setOpen(false)
    if (locale === activeLocale) return
    persistLocaleCookie(locale)
    router.refresh()
  }

  const activeEndonym = LOCALE_META[activeLocale]?.endonym ?? activeLocale
  const isOnDark = tone === "onDark"

  const defaultOnDarkTriggerClass =
    "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 sm:px-4 text-sm font-medium text-white/88 transition-colors hover:border-white/20 hover:bg-white/12 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ats-grafito"

  const triggerClass =
    triggerClassName ??
    (isOnDark
      ? defaultOnDarkTriggerClass
      : "flex h-10 items-center gap-2 rounded-md px-2 text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2")

  return (
    <div className={`relative ${className ?? ""}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={triggerClass}
        aria-label={t("label")}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe
          className={`h-4 w-4 shrink-0 ${isOnDark ? "text-white/70" : "h-5 w-5 text-muted-foreground"}`}
          aria-hidden
        />
        <span className={isOnDark ? "hidden sm:inline" : "hidden font-sans text-sm font-medium sm:inline"}>
          {activeEndonym}
        </span>
        {isOnDark ? (
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-white/50 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        ) : null}
      </button>
      {open && (
        <ul
          className={
            isOnDark
              ? "absolute right-0 top-full z-120 mt-2 min-w-46 overflow-hidden rounded-2xl border border-white/12 bg-[#2A2B2E]/98 py-1.5 shadow-[0_18px_48px_rgba(7,12,27,0.55)] backdrop-blur-md"
              : "absolute right-0 top-full z-50 mt-2 min-w-[160px] rounded-lg border border-border bg-card py-1 shadow-lg"
          }
          role="listbox"
          aria-label={t("label")}
        >
          {locales.map((locale) => {
            const isActive = locale === activeLocale
            const meta = LOCALE_META[locale]
            return (
              <li key={locale} role="none">
                <button
                  type="button"
                  onClick={() => handleSelect(locale)}
                  className={
                    isOnDark
                      ? `flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm transition-colors focus:outline-none ${
                          isActive
                            ? "bg-white/10 font-medium text-white"
                            : "text-white/82 hover:bg-white/8 focus:bg-white/8"
                        }`
                      : "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left font-sans text-sm text-foreground hover:bg-muted focus:outline-none focus:bg-muted"
                  }
                  role="option"
                  aria-selected={isActive}
                  aria-label={t(meta.nameKey)}
                  lang={locale}
                >
                  <span>{meta.endonym}</span>
                  {isActive && (
                    <Check
                      className={`h-4 w-4 shrink-0 ${isOnDark ? "text-ats-cobre-light" : "text-vo-purple"}`}
                      aria-hidden
                    />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
