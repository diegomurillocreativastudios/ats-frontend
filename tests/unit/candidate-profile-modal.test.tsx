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

    expect(
      screen.getByText(/salen del checklist de requisitos/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/No indica por sí sola si cada requisito se cumple/)
    ).toBeInTheDocument()

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

  it("does not list recency or relevant years as failed attributes", () => {
    renderModal(
      <CandidateProfileModal
        match={antonelliMatch}
        uploadedAtLabel="Subido: 13 ago 2026"
        onClose={() => undefined}
      />
    )

    expect(screen.queryByText("Actualidad")).not.toBeInTheDocument()
    expect(screen.queryByText("Años relevantes")).not.toBeInTheDocument()
  })

  it("renders requirement verdicts with CV evidence instead of raw attr_ scores", () => {
    renderModal(
      <CandidateProfileModal
        match={{
          ...antonelliMatch,
          componentScores: {
            attr_ingles: 0,
            attr_power_bi: 0,
            attribute_aggregate: 0.75,
            qualitativeScore: 0.9,
          },
          matchedAttributes: {},
          requirementAssessments: [
            { key: "ingles", verdict: "Met", score: 1, evidence: "Inglés intermedio-alto (B2)" },
            { key: "power_bi", verdict: "Unavailable", score: null },
            { key: "sql", verdict: "NotMet", score: 0 },
            { key: "excel", verdict: "Partial", score: 0.5, candidateValue: "básico" },
          ],
          requiresManualReview: true,
          scoreBreakdown: { attributesIncludedInTotal: false, attributeCoverage: 0.4 },
        }}
        uploadedAtLabel="Subido: 13 ago 2026"
        onClose={() => undefined}
      />
    )

    expect(screen.getByText("Inglés intermedio-alto (B2)")).toBeInTheDocument()
    expect(screen.getByText("Cumple")).toBeInTheDocument()
    expect(screen.getByText("Cumple parcialmente")).toBeInTheDocument()
    expect(screen.getByText("No cumple")).toBeInTheDocument()
    expect(screen.getByText("No evaluado")).toBeInTheDocument()
    expect(screen.getByText("básico")).toBeInTheDocument()
    expect(screen.getByText(/requiere revisión manual/)).toBeInTheDocument()
    expect(screen.getByText(/no se incluyeron en el puntaje total/)).toBeInTheDocument()
    expect(screen.getByText(/40%/)).toBeInTheDocument()
  })

  it("shows Application.MatchScore instead of semanticScore", () => {
    renderModal(
      <CandidateProfileModal
        match={{
          ...antonelliMatch,
          semanticScore: 0.71,
          totalScore: 0.82,
        }}
        uploadedAtLabel="Subido: 13 ago 2026"
        onClose={() => undefined}
      />
    )

    expect(screen.getByText(/82\.0%/)).toBeInTheDocument()
    expect(screen.queryByText(/71\.0%/)).not.toBeInTheDocument()
  })

  it("lists each checklist observation and keeps hard gates out of the considerations card", () => {
    renderModal(
      <CandidateProfileModal
        match={{
          name: "Ada Lovelace",
          totalScore: 0.8,
          qualitativeReasoningPositive:
            "3_years_of_experience: cinco años en producto. reactjs: se cumple este requisito con la información analizada.",
          qualitativeReasoningNegative:
            "Inglés: la información analizada indica A2. El cumplimiento es parcial. " +
            "Inventarios: la información analizada no respalda el cumplimiento. Se observó: solo cursos introductorios. " +
            "Viajes: no hay información suficiente para confirmar este requisito. Se recomienda consultarlo durante la entrevista.",
          requirementAssessments: [
            { key: "3_years_of_experience", verdict: "Met", score: 1, evidence: "cinco años en producto" },
            { key: "reactjs", verdict: "Met", score: 1 },
            { key: "Inglés", verdict: "Partial", score: 0.5, evidence: "A2" },
            { key: "Inventarios", verdict: "NotMet", score: 0, evidence: "solo cursos introductorios" },
            { key: "Viajes", verdict: "Unavailable", score: null },
          ],
          negativeReasons: [
            { source: "qualitative", message: "Inglés: la información analizada indica A2. El cumplimiento es parcial." },
            { source: "hard_gate", signal: "min_score", message: "Por debajo del mínimo." },
          ],
        }}
        uploadedAtLabel="Subido: 13 ago 2026"
        onClose={() => undefined}
      />
    )

    const strengths = screen.getByRole("heading", { name: "Fortalezas" }).parentElement
    expect(strengths).not.toBeNull()
    const reactBadge = within(strengths as HTMLElement).getByRole("heading", { name: "reactjs" })
    expect(reactBadge).toHaveClass("inset-ring")
    expect(reactBadge.querySelector("svg")).toHaveClass("fill-green-500")
    expect(within(strengths as HTMLElement).getByRole("heading", { name: "3 years of experience" })).toHaveClass(
      "rounded-md"
    )
    expect(within(strengths as HTMLElement).queryByText("Parcial")).not.toBeInTheDocument()
    expect(within(strengths as HTMLElement).getByText("cinco años en producto.")).toBeInTheDocument()
    expect(within(strengths as HTMLElement).queryByText(/reactjs:/)).not.toBeInTheDocument()

    const considerations = screen.getByRole("heading", { name: "Aspectos a considerar" }).parentElement
    expect(considerations).not.toBeNull()
    const aspects = considerations as HTMLElement
    expect(within(aspects).getByText("Parcial")).toBeInTheDocument()
    expect(within(aspects).getByText("Sin evidencia suficiente")).toBeInTheDocument()
    expect(within(aspects).getByText("Por confirmar")).toBeInTheDocument()
    expect(within(aspects).queryByText("No cumple")).not.toBeInTheDocument()
    expect(within(aspects).queryByText("Cumple parcialmente")).not.toBeInTheDocument()
    expect(
      within(aspects).getByText("la información analizada indica A2. El cumplimiento es parcial.")
    ).toBeInTheDocument()
    expect(
      within(aspects).getByText(
        "la información analizada no respalda el cumplimiento. Se observó: solo cursos introductorios."
      )
    ).toBeInTheDocument()
    expect(
      within(aspects).getAllByText(/Se recomienda consultarlo durante la entrevista/)
    ).toHaveLength(1)
    expect(within(aspects).queryByText("Por debajo del mínimo.")).not.toBeInTheDocument()
    expect(within(aspects).getByText("Parcial")).not.toHaveClass("text-rose-800")
    expect(within(aspects).getByText("Sin evidencia suficiente")).toHaveClass("text-slate-800")
    expect(within(aspects).getByText("Por confirmar")).toHaveClass("border")
    expect(within(aspects).getByRole("heading", { name: "Inglés" }).querySelector("svg")).toHaveClass(
      "fill-yellow-500"
    )
    expect(within(aspects).getByRole("heading", { name: "Inventarios" }).querySelector("svg")).toHaveClass(
      "fill-indigo-500"
    )
    expect(within(aspects).getByRole("heading", { name: "Inventarios" }).querySelector("svg")).not.toHaveClass(
      "fill-red-500"
    )
    expect(within(aspects).getByRole("heading", { name: "Viajes" }).querySelector("svg")).toHaveClass(
      "fill-blue-500"
    )

    const eligibility = screen.getByRole("heading", { name: "Elegibilidad" }).parentElement
    expect(eligibility).not.toBeNull()
    expect(within(eligibility as HTMLElement).getByText("Por debajo del mínimo.")).toBeInTheDocument()
    expect(within(eligibility as HTMLElement).queryByText(/Inglés:/)).not.toBeInTheDocument()
    const attributes = screen.getByRole("heading", { name: "Atributos" }).parentElement
    expect(attributes).not.toBeNull()
    expect(within(attributes as HTMLElement).getAllByText("Cumple").length).toBeGreaterThan(0)
    expect(within(attributes as HTMLElement).getByText("No cumple")).toBeInTheDocument()
  })

  it("keeps engine empty phrases as secondary notes without requirement rows", () => {
    renderModal(
      <CandidateProfileModal
        match={{
          name: "Grace Hopper",
          qualitativeReasoningPositive: "Por ahora no hay requisitos cumplidos que resaltar.",
          qualitativeReasoningNegative: "No hay brechas destacables en los requisitos revisados.",
          requirementAssessments: [
            { key: "sql", verdict: "NotMet", score: 0 },
          ],
        }}
        uploadedAtLabel="Subido: 13 ago 2026"
        onClose={() => undefined}
      />
    )

    const strengths = screen.getByRole("heading", { name: "Fortalezas" }).parentElement
    expect(within(strengths as HTMLElement).getByText("Por ahora no hay requisitos cumplidos que resaltar.")).toHaveClass(
      "text-slate-500"
    )
    expect(within(strengths as HTMLElement).queryByRole("heading", { name: "sql" })).not.toBeInTheDocument()

    const considerations = screen.getByRole("heading", { name: "Aspectos a considerar" }).parentElement
    expect(
      within(considerations as HTMLElement).getByText("No hay brechas destacables en los requisitos revisados.")
    ).toHaveClass("text-slate-500")
    expect(within(considerations as HTMLElement).queryByText("Sin evidencia suficiente")).not.toBeInTheDocument()
  })

  it("shows hard-gate eligibility without a checklist paragraph", () => {
    renderModal(
      <CandidateProfileModal
        match={{
          name: "Katherine Johnson",
          negativeReasons: [{ source: "hard_gate", message: "Fuera de la región." }],
        }}
        uploadedAtLabel="Subido: 13 ago 2026"
        onClose={() => undefined}
      />
    )

    expect(screen.getByRole("heading", { name: "Elegibilidad" })).toBeInTheDocument()
    expect(screen.getByText("Fuera de la región.")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Aspectos a considerar" })).not.toBeInTheDocument()
  })
})
