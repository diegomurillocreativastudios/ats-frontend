import { describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import type { ReactNode } from "react"

import { CandidateProfileModal } from "@/components/rrhh/candidate-profile-modal"
import esMessages from "@/messages/es.json"

vi.mock("@/lib/api/recruiter-candidate-cv", () => ({
  downloadRecruiterCandidateCv: vi.fn(),
  isRecruiterCandidateCvError: () => false,
}))

function renderModal(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      {ui}
    </NextIntlClientProvider>
  )
}

const antonelliMatch = {
  name: "Kimi Antonelli",
  email: "kimi.antonelli-4c32755e1d9e46e3b8d96234e3a6b8ba@local.dev",
  totalScore: 0.897,
  candidateProfileId: "cp-kimi",
  componentScores: {
    Analisis_de_datos: 1,
    Recency: 0,
    "Relevant years": 0,
    attribute_aggregate: 1,
    qualitativeScore: 0.99,
    vectorSimilarity: 0.777,
  },
  matchedAttributes: {
    Analisis_de_datos: "Avanzado",
    Resistencia_fisica: "Avanzado",
  },
  matchedAttributePaths: {
    Analisis_de_datos: "analisis_de_datos",
  },
  qualitativeReasoningPositive:
    "Programa junior Mercedes. Experiencia en F2 y FRECA. Super License FIA.",
  qualitativeReasoningNegative:
    "No hay debilidades mayores. El CV ya lo posiciona como piloto de F1 para 2025.",
}

describe("CandidateProfileModal", () => {
  it("keeps the familiar stacked layout without duplicate attributes or technical routes", () => {
    const { container } = renderModal(
      <CandidateProfileModal
        match={antonelliMatch}
        uploadedAtLabel="Subido: 13 ago 2026, 03:32 p. m."
        onClose={() => undefined}
      />
    )

    expect(screen.getByRole("dialog", { name: "Perfil de Kimi Antonelli" })).toBeInTheDocument()
    expect(container.querySelector("details")).toBeNull()
    expect(container.querySelector("summary")).toBeNull()

    expect(screen.getByText(/Puntaje total del emparejamiento:/)).toBeInTheDocument()
    expect(screen.getByText(/89\.7%/)).toBeInTheDocument()
    expect(screen.getByText("Análisis procesado con IA")).toBeInTheDocument()

    expect(screen.getByRole("heading", { name: "Atributos" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Puntaje cualitativo" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Similitud semántica" })).toBeInTheDocument()

    expect(screen.getByText("Analisis de datos")).toBeInTheDocument()
    expect(screen.getByText("Resistencia fisica")).toBeInTheDocument()
    expect(screen.getAllByText("Avanzado").length).toBeGreaterThan(0)
    expect(screen.getByText("Atributos en conjunto")).toBeInTheDocument()

    expect(screen.queryByRole("heading", { name: "Coincidencia de atributos" })).not.toBeInTheDocument()
    expect(screen.queryByText(/Ruta:/)).not.toBeInTheDocument()
    expect(screen.queryByText("analisis_de_datos")).not.toBeInTheDocument()

    const strengthsSection = screen.getByRole("heading", { name: "Fortalezas" }).closest("div")
    expect(strengthsSection).not.toBeNull()
    expect(
      within(strengthsSection as HTMLElement).getByText(/Programa junior Mercedes\./)
    ).toBeInTheDocument()

    expect(screen.getByRole("link", { name: "Abrir perfil del candidato en una nueva pestaña" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cerrar perfil" })).toBeInTheDocument()
  })

  it("truncates a long email without dropping the full address", () => {
    renderModal(
      <CandidateProfileModal
        match={antonelliMatch}
        uploadedAtLabel="Subido: 13 ago 2026"
        onClose={() => undefined}
      />
    )

    const email = screen.getByText(
      "kimi.antonelli-4c32755e1d9e46e3b8d96234e3a6b8ba@local.dev"
    )
    expect(email).toHaveClass("truncate")
    expect(email).toHaveAttribute(
      "title",
      "kimi.antonelli-4c32755e1d9e46e3b8d96234e3a6b8ba@local.dev"
    )
  })
})
