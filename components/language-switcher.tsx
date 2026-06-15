"use client"

import { useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Check, Globe } from "lucide-react"

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
}

export default function LanguageSwitcher({ className }: LanguageSwitcherProps) {
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

  return (
    <div className={`relative ${className ?? ""}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 items-center gap-2 rounded-md px-2 text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
        aria-label={t("label")}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe className="h-5 w-5 text-muted-foreground" aria-hidden />
        <span className="hidden font-sans text-sm font-medium sm:inline">
          {activeEndonym}
        </span>
      </button>
      {open && (
        <ul
          className="absolute right-0 top-full z-50 mt-2 min-w-[160px] rounded-lg border border-border bg-card py-1 shadow-lg"
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
                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left font-sans text-sm text-foreground hover:bg-muted focus:outline-none focus:bg-muted"
                  role="option"
                  aria-selected={isActive}
                  aria-label={t(meta.nameKey)}
                  lang={locale}
                >
                  <span>{meta.endonym}</span>
                  {isActive && (
                    <Check className="h-4 w-4 shrink-0 text-vo-purple" aria-hidden />
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
