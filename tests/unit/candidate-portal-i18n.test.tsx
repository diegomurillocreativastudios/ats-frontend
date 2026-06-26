import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import StatCard from "@/components/candidato/StatCard"
import NextActivitiesCard from "@/components/candidato/NextActivitiesCard"
import MyPostulationsCard from "@/components/candidato/MyPostulationsCard"
import ProcessTrackingCard from "@/components/candidato/ProcessTrackingCard"
import CandidatePortalHome from "@/components/candidato/candidate-portal-home"
import CandidateInterviewsContent from "@/components/candidato/CandidateInterviewsContent"
import { locales, type Locale } from "@/i18n/routing"
import esMessages from "@/messages/es.json"
import enMessages from "@/messages/en.json"
import itMessages from "@/messages/it.json"
import deMessages from "@/messages/de.json"
import frMessages from "@/messages/fr.json"

/**
 * Etapa 5B — i18n del Portal Candidato básico.
 *
 * Verifica que los componentes estáticos migrados del portal candidato resuelven
 * su UI desde `next-intl` (namespace `CandidatePortal`) en `es` y `en`, y que el
 * namespace existe con paridad en los 5 idiomas. NO se prueba data dinámica/IA:
 * solo texto estático de UI controlado por frontend.
 */

const { useCurrentUserMock } = vi.hoisted(() => ({
  useCurrentUserMock: vi.fn(() => ({
    user: { name: "Ada Lovelace", email: "ada@example.com", role: "candidate" },
    loading: false,
  })),
}))

vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: useCurrentUserMock,
}))

vi.mock("@/hooks/useCandidateDashboard", () => ({
  useCandidateDashboard: () => ({
    data: { greetingName: "Ada", stats: null, activities: [], applications: [] },
    loading: false,
    error: null,
  }),
}))

vi.mock("@/hooks/useCandidateSelfInterviews", () => ({
  useCandidateSelfInterviews: () => ({ items: [], loading: true, error: null }),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/portal-candidato",
}))

const messagesByLocale: Record<Locale, Record<string, unknown>> = {
  es: esMessages,
  en: enMessages,
  it: itMessages,
  de: deMessages,
  fr: frMessages,
}

function renderWithIntl(ui: React.ReactNode, locale: Locale) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messagesByLocale[locale]}>
      {ui}
    </NextIntlClientProvider>,
  )
}

beforeEach(() => {
  useCurrentUserMock.mockClear()
})

describe("StatCard i18n (Etapa 5B)", () => {
  it("renderiza las etiquetas de estadísticas en español", () => {
    renderWithIntl(<StatCard stats={null} loading={false} />, "es")
    expect(screen.getByText("Postulaciones activas")).toBeInTheDocument()
    expect(screen.getByText("Entrevistas próximas")).toBeInTheDocument()
  })

  it("renderiza las mismas etiquetas traducidas en inglés", () => {
    renderWithIntl(<StatCard stats={null} loading={false} />, "en")
    expect(screen.getByText("Active applications")).toBeInTheDocument()
    expect(screen.getByText("Upcoming interviews")).toBeInTheDocument()
  })
})

describe("NextActivitiesCard i18n (Etapa 5B)", () => {
  it("traduce el título y el empty state según el locale", () => {
    const { unmount } = renderWithIntl(
      <NextActivitiesCard activities={[]} loading={false} />,
      "es",
    )
    expect(screen.getByText("No tienes actividades próximas")).toBeInTheDocument()
    unmount()

    renderWithIntl(<NextActivitiesCard activities={[]} loading={false} />, "en")
    expect(screen.getByText("You have no upcoming activities")).toBeInTheDocument()
  })
})

describe("MyPostulationsCard i18n (Etapa 5B)", () => {
  it("traduce el empty state según el locale", () => {
    const { unmount } = renderWithIntl(
      <MyPostulationsCard applications={[]} loading={false} />,
      "es",
    )
    expect(screen.getByText("Mis postulaciones")).toBeInTheDocument()
    expect(screen.getByText("No tienes postulaciones activas")).toBeInTheDocument()
    unmount()

    renderWithIntl(<MyPostulationsCard applications={[]} loading={false} />, "en")
    expect(screen.getByText("My applications")).toBeInTheDocument()
    expect(screen.getByText("You have no active applications")).toBeInTheDocument()
  })
})

describe("ProcessTrackingCard i18n (Etapa 5B)", () => {
  it("traduce el empty state cuando no hay postulación seleccionada", () => {
    const { unmount } = renderWithIntl(
      <ProcessTrackingCard application={null} />,
      "es",
    )
    expect(screen.getByText("No tienes postulaciones activas")).toBeInTheDocument()
    unmount()

    renderWithIntl(<ProcessTrackingCard application={null} />, "en")
    expect(screen.getByText("You have no active applications")).toBeInTheDocument()
  })
})

describe("CandidatePortalHome i18n (Etapa 5B)", () => {
  it("renderiza la descripción estática del home en es y en", () => {
    const { unmount } = renderWithIntl(<CandidatePortalHome />, "es")
    expect(
      screen.getAllByText(
        "Aquí puedes consultar el avance de tus postulaciones y próximas actividades.",
      ).length,
    ).toBeGreaterThan(0)
    unmount()

    renderWithIntl(<CandidatePortalHome />, "en")
    expect(
      screen.getAllByText(
        "Here you can check the progress of your applications and upcoming activities.",
      ).length,
    ).toBeGreaterThan(0)
  })
})

describe("CandidateInterviewsContent i18n (Etapa 5B)", () => {
  it("traduce el estado de carga estático en es y en", () => {
    const { unmount } = renderWithIntl(<CandidateInterviewsContent />, "es")
    expect(
      screen.getAllByText("Cargando tus entrevistas…").length,
    ).toBeGreaterThan(0)
    unmount()

    renderWithIntl(<CandidateInterviewsContent />, "en")
    expect(
      screen.getAllByText("Loading your interviews…").length,
    ).toBeGreaterThan(0)
  })
})

describe("Namespace CandidatePortal (Etapa 5B)", () => {
  it("define el namespace CandidatePortal en los 5 idiomas", () => {
    for (const locale of locales) {
      expect(
        Object.keys(messagesByLocale[locale]),
        `CandidatePortal ausente en ${locale}.json`,
      ).toContain("CandidatePortal")
    }
  })

  it("expone las secciones esperadas del namespace en los 5 idiomas", () => {
    const expectedSections = [
      "home",
      "stats",
      "activities",
      "applications",
      "process",
      "interviews",
      "documents",
    ]
    for (const locale of locales) {
      const namespace = (messagesByLocale[locale] as Record<string, unknown>)
        .CandidatePortal as Record<string, unknown>
      for (const section of expectedSections) {
        expect(
          Object.keys(namespace),
          `${section} ausente en CandidatePortal de ${locale}.json`,
        ).toContain(section)
      }
    }
  })
})
