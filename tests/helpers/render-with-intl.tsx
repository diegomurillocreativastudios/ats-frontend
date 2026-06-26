import { render, type RenderOptions } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import type { ReactElement, ReactNode } from "react"

import type { Locale } from "@/i18n/routing"
import deMessages from "@/messages/de.json"
import enMessages from "@/messages/en.json"
import esMessages from "@/messages/es.json"
import frMessages from "@/messages/fr.json"
import itMessages from "@/messages/it.json"

const messagesByLocale = {
  es: esMessages,
  en: enMessages,
  it: itMessages,
  de: deMessages,
  fr: frMessages,
} as const

interface IntlWrapperProps {
  locale: Locale
  children: ReactNode
}

function IntlWrapper({ locale, children }: IntlWrapperProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messagesByLocale[locale]}>
      {children}
    </NextIntlClientProvider>
  )
}

/**
 * Renderiza un componente envuelto en `NextIntlClientProvider` para tests unitarios.
 */
export function renderWithIntl(
  ui: ReactElement,
  options?: RenderOptions & { locale?: Locale },
) {
  const { locale = "es", ...renderOptions } = options ?? {}
  return render(ui, {
    wrapper: ({ children }) => (
      <IntlWrapper locale={locale}>{children}</IntlWrapper>
    ),
    ...renderOptions,
  })
}
