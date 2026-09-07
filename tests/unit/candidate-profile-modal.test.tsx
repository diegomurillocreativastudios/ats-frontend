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

  it("does not render boolean matched attributes as the word true", () => {
    renderModal(
      <CandidateProfileModal
        match={{
          ...antonelliMatch,
          componentScores: {
            Git: 1,
            CSS: 1,
            attribute_aggregate: 0.813,
          },
          matchedAttributes: {
            Git: true,
            HTML: "true",
            CSS: "layout responsivo y estados de UI",
          },
        }}
        uploadedAtLabel="Subido: 13 ago 2026"
        onClose={() => undefined}
      />
    )

    expect(screen.getByText("Git")).toBeInTheDocument()
    expect(screen.getByText("layout responsivo y estados de UI")).toBeInTheDocument()
    expect(screen.getAllByText("Sin detalle").length).toBeGreaterThan(0)
    expect(screen.queryByText("true")).not.toBeInTheDocument()
    expect(screen.queryByText("false")).not.toBeInTheDocument()
  })

  it("hides presence flags from PascalCase and nested matching payloads", () => {
    renderModal(
      <CandidateProfileModal
        match={{
          ...antonelliMatch,
          componentScores: undefined,
          ComponentScores: {
            Git: 1,
            React: 1,
            attribute_aggregate: 0.813,
          },
          matchedAttributes: undefined,
          MatchedAttributes: {
            Git: { matched: true },
            React: { matched: true, evidence: "2+ años en producción" },
            TypeScript: { Level: "True" },
          },
        }}
        uploadedAtLabel="Subido: 13 ago 2026"
        onClose={() => undefined}
      />
    )

    expect(screen.getByText("Git")).toBeInTheDocument()
    expect(screen.getByText("2+ años en producción")).toBeInTheDocument()
    expect(screen.getAllByText("Sin detalle").length).toBeGreaterThan(0)
    expect(screen.queryByText("true")).not.toBeInTheDocument()
    expect(screen.queryByText("True")).not.toBeInTheDocument()
    expect(screen.queryByText("false")).not.toBeInTheDocument()
  })

  it("keeps attribute evidence on one line and exposes the full text on hover", () => {
    const evidence =
      "HTML semántico, accesibilidad, manejo de focus y aria-invalid en flujos de alta y edición."

    renderModal(
      <CandidateProfileModal
        match={{
          ...antonelliMatch,
          componentScores: {
            HTML: 0,
            JavaScript: 1,
            attribute_aggregate: 0.683,
          },
          matchedAttributes: {
            HTML: evidence,
          },
        }}
        uploadedAtLabel="Subido: 4 sept 2026"
        onClose={() => undefined}
      />
    )

    const evidenceNode = screen.getByText(evidence)
    expect(evidenceNode).toHaveClass("truncate")
    expect(evidenceNode).toHaveClass("text-[10px]")
    expect(evidenceNode).toHaveAttribute("title", evidence)
    expect(screen.getByText("HTML")).toHaveClass("truncate")
    expect(screen.getByText("JavaScript")).toBeInTheDocument()
    expect(screen.getByText("Sin detalle")).toBeInTheDocument()
  })
})
