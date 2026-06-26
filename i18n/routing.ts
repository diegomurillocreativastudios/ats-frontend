/**
 * Definición centralizada de los locales soportados por el frontend.
 *
 * Etapa 1 (setup base): `next-intl` se configura SIN ruteo por prefijo de URL
 * (`/en`, `/it`, ...) para no refactorizar las ~62 rutas existentes hacia
 * `app/[locale]/`. El locale activo se resuelve en `i18n/request.ts` a partir
 * de la cookie `NEXT_LOCALE` (ver `localeCookieName`), con `es` como
 * default/fallback. La migración a ruteo por prefijo queda para una etapa
 * posterior y solo requerirá ajustar este archivo + `i18n/navigation.ts`.
 */

export const locales = ["es", "en", "it", "de", "fr"] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "es"

export const localeCookieName = "NEXT_LOCALE"

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value)
}
