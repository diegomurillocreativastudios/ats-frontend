import { cookies } from "next/headers"
import { getRequestConfig } from "next-intl/server"

import { defaultLocale, isLocale, localeCookieName, type Locale } from "./routing"

type Messages = Record<string, unknown>

const isPlainObject = (value: unknown): value is Messages =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/**
 * Deep-merge que garantiza el fallback a `es`: cualquier clave ausente en el
 * locale activo hereda su valor desde el diccionario español (fuente de verdad).
 */
function mergeWithFallback(base: Messages, override: Messages): Messages {
  const result: Messages = { ...base }

  for (const [key, overrideValue] of Object.entries(override)) {
    const baseValue = result[key]
    result[key] =
      isPlainObject(baseValue) && isPlainObject(overrideValue)
        ? mergeWithFallback(baseValue, overrideValue)
        : overrideValue
  }

  return result
}

async function loadMessages(locale: Locale): Promise<Messages> {
  return (await import(`../messages/${locale}.json`)).default as Messages
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get(localeCookieName)?.value
  const locale: Locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale

  const fallbackMessages = await loadMessages(defaultLocale)
  const messages =
    locale === defaultLocale
      ? fallbackMessages
      : mergeWithFallback(fallbackMessages, await loadMessages(locale))

  return { locale, messages }
})
