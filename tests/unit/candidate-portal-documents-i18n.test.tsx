import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import DocumentsUploadZone from "@/components/candidato/DocumentsUploadZone"
import DocumentsList from "@/components/candidato/DocumentsList"
import SingleFileUploadZone from "@/components/candidato/SingleFileUploadZone"
import AgregarCandidatoModal from "@/components/candidato/AgregarCandidatoModal"
import { locales, type Locale } from "@/i18n/routing"
import esMessages from "@/messages/es.json"
import enMessages from "@/messages/en.json"
import itMessages from "@/messages/it.json"
import deMessages from "@/messages/de.json"
import frMessages from "@/messages/fr.json"

/**
 * Etapa 5C — i18n del Portal Candidato (documentos, zonas de subida, modal).
 *
 * Verifica que los componentes estáticos de documentos resuelven su UI desde
 * `next-intl` (namespace `CandidatePortal.documents`) en `es` y `en`, y que las
 * nuevas subsecciones existen con paridad en los 5 idiomas. NO se prueba data
 * dinámica/IA: solo texto estático de UI controlado por frontend.
 */

vi.mock("@/lib/api", () => ({
  apiClient: { postFormData: vi.fn() },
}))

vi.mock("@/lib/api/identity-document-types", () => ({
  listIdentityDocumentTypes: vi.fn(async () => []),
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

describe("DocumentsUploadZone i18n (Etapa 5C)", () => {
  it("renderiza el prompt y el helper estáticos en español", () => {
    renderWithIntl(<DocumentsUploadZone />, "es")
    expect(
      screen.getByText("Arrastra archivos aquí o haz clic para subir"),
    ).toBeInTheDocument()
    expect(screen.getByText("PDF, DOC, DOCX hasta 10 MB")).toBeInTheDocument()
  })

  it("renderiza los mismos textos traducidos en inglés", () => {
    renderWithIntl(<DocumentsUploadZone />, "en")
    expect(
      screen.getByText("Drag files here or click to upload"),
    ).toBeInTheDocument()
    expect(screen.getByText("PDF, DOC, DOCX up to 10 MB")).toBeInTheDocument()
  })
})

describe("DocumentsList i18n (Etapa 5C)", () => {
  it("traduce el encabezado y el empty state según el locale", () => {
    const { unmount } = renderWithIntl(<DocumentsList documents={[]} />, "es")
    expect(screen.getByText("Mis documentos")).toBeInTheDocument()
    expect(
      screen.getByText("Aún no hay documentos. Los que subas aparecerán aquí."),
    ).toBeInTheDocument()
    unmount()

    renderWithIntl(<DocumentsList documents={[]} />, "en")
    expect(screen.getByText("My documents")).toBeInTheDocument()
    expect(
      screen.getByText(
        "There are no documents yet. The ones you upload will appear here.",
      ),
    ).toBeInTheDocument()
  })
})

describe("SingleFileUploadZone i18n (Etapa 5C)", () => {
  it("usa el prompt por defecto traducido cuando no se pasa primaryText", () => {
    const { unmount } = renderWithIntl(
      <SingleFileUploadZone file={null} onFileChange={vi.fn()} />,
      "es",
    )
    expect(
      screen.getByText("Arrastra el archivo aquí o haz clic para subir"),
    ).toBeInTheDocument()
    unmount()

    renderWithIntl(
      <SingleFileUploadZone file={null} onFileChange={vi.fn()} />,
      "en",
    )
    expect(
      screen.getByText("Drag the file here or click to upload"),
    ).toBeInTheDocument()
  })
})

describe("AgregarCandidatoModal i18n (Etapa 5C)", () => {
  it("traduce el título y el botón cancelar de la variante self", async () => {
    const { unmount } = renderWithIntl(
      <AgregarCandidatoModal variant="self" isOpen onClose={vi.fn()} />,
      "es",
    )
    expect(await screen.findByText("Completar información")).toBeInTheDocument()
    expect(screen.getByText("Cancelar")).toBeInTheDocument()
    unmount()

    renderWithIntl(
      <AgregarCandidatoModal variant="self" isOpen onClose={vi.fn()} />,
      "en",
    )
    expect(await screen.findByText("Complete information")).toBeInTheDocument()
    expect(screen.getByText("Cancel")).toBeInTheDocument()
  })
})

describe("Namespace CandidatePortal.documents (Etapa 5C)", () => {
  it("expone las subsecciones de documentos en los 5 idiomas", () => {
    const expectedSubsections = ["upload", "list", "singleUpload", "modal"]
    for (const locale of locales) {
      const documents = (
        (messagesByLocale[locale] as Record<string, unknown>)
          .CandidatePortal as Record<string, unknown>
      ).documents as Record<string, unknown>
      for (const subsection of expectedSubsections) {
        expect(
          Object.keys(documents),
          `${subsection} ausente en CandidatePortal.documents de ${locale}.json`,
        ).toContain(subsection)
      }
    }
  })

  it("conserva las variantes self/recruiter del modal en los 5 idiomas", () => {
    for (const locale of locales) {
      const modal = (
        (
          (messagesByLocale[locale] as Record<string, unknown>)
            .CandidatePortal as Record<string, unknown>
        ).documents as Record<string, unknown>
      ).modal as Record<string, unknown>
      expect(Object.keys(modal)).toContain("self")
      expect(Object.keys(modal)).toContain("recruiter")
    }
  })
})
