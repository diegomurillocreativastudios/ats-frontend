import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import type { Locale } from "@/i18n/routing"
import esMessages from "@/messages/es.json"
import enMessages from "@/messages/en.json"
import { InterviewStatusBadge } from "@/components/rrhh/interviews/interview-status-badge"
import type { InterviewStatus } from "@/lib/api/interviews"

const messagesByLocale: Record<Locale, Record<string, unknown>> = {
  es: esMessages,
  en: enMessages,
  it: esMessages,
  de: esMessages,
  fr: esMessages,
}

function renderWithIntl(ui: React.ReactNode, locale: Locale) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messagesByLocale[locale]}>
      {ui}
    </NextIntlClientProvider>
  )
}

describe("InterviewStatusBadge (Etapa 11)", () => {
  it("muestra la etiqueta traducida en español para Scheduled", () => {
    renderWithIntl(<InterviewStatusBadge status="Scheduled" />, "es")
    expect(screen.getByTestId("interview-status-badge")).toHaveTextContent(
      "Programada"
    )
  })

  it("muestra la etiqueta traducida en inglés para Scheduled", () => {
    renderWithIntl(<InterviewStatusBadge status="Scheduled" />, "en")
    expect(screen.getByTestId("interview-status-badge")).toHaveTextContent(
      "Scheduled"
    )
  })

  it("expone el estado en data-status para pruebas", () => {
    renderWithIntl(<InterviewStatusBadge status="Completed" />, "es")
    expect(screen.getByTestId("interview-status-badge")).toHaveAttribute(
      "data-status",
      "Completed"
    )
  })

  it("prioriza el label del API (raw) cuando se pasa label", () => {
    renderWithIntl(
      <InterviewStatusBadge status="Cancelled" label="Cancelada (API)" />,
      "es"
    )
    expect(screen.getByTestId("interview-status-badge")).toHaveTextContent(
      "Cancelada (API)"
    )
  })

  it("devuelve el valor crudo para un estado desconocido sin label", () => {
    renderWithIntl(
      <InterviewStatusBadge status={"Weird" as InterviewStatus} />,
      "es"
    )
    expect(screen.getByTestId("interview-status-badge")).toHaveTextContent(
      "Weird"
    )
  })
})
