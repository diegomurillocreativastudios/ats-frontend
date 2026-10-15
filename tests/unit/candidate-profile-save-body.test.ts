import { describe, expect, it } from "vitest"
import {
  buildCandidateProfileSaveBody,
  isValidRequiredJobMinSalary,
  resolveResumeMarkdownForApi,
  type FullProfileFormInput,
} from "@/lib/candidate-profile"
import { buildFullFormStateFromSources } from "@/lib/candidate-profile-hydrate"
import {
  emptyEduRow,
  emptyLangRow,
  emptyRefRow,
  emptyWorkRow,
} from "@/lib/candidate-profile-structured"

const baseForm = (): FullProfileFormInput => ({
  headline: "Desarrollador",
  summary: "Resumen profesional",
  resumeMarkdown: "",
  nationalId: "12345678-9",
  firstName: "Diego",
  lastName: "Correa",
  country: "",
  birthDateInput: "",
  birthCity: "",
  maritalStatus: "",
  gender: "",
  minSalary: "",
  availability: "",
  hasDisabilityChoice: "",
  email: "",
  phoneNumber: "",
  videoLink: "",
  sectors: [],
  jobDesiredRole: "",
  jobMinSalary: "",
  jobEducationLevel: "",
  jobDesiredCity: "",
  jobAvailability: "",
  jobDisability: "",
  workRows: [emptyWorkRow()],
  educationRows: [emptyEduRow()],
  languageRows: [emptyLangRow()],
  skillsText: "",
  socialRows: [],
  referenceRows: [emptyRefRow()],
  recognitionsText: "",
})

describe("resolveResumeMarkdownForApi", () => {
  it("conserva el texto extraído del currículum", () => {
    expect(
      resolveResumeMarkdownForApi({
        resumeMarkdown: "  # CV extraído  ",
        firstName: "Diego",
        lastName: "Correa",
        headline: "Dev",
        summary: "Resumen",
      }),
    ).toBe("# CV extraído")
  })

  it("arma markdown no vacío con nombre, titular y resumen si no hay CV en texto", () => {
    const markdown = resolveResumeMarkdownForApi({
      resumeMarkdown: "",
      firstName: "Diego",
      lastName: "Correa",
      headline: "Desarrollador",
      summary: "Resumen profesional",
    })
    expect(markdown).toContain("# Diego Correa")
    expect(markdown).toContain("Desarrollador")
    expect(markdown).toContain("Resumen profesional")
    expect(markdown.trim()).not.toBe("")
  })
})

describe("isValidRequiredJobMinSalary", () => {
  it("rechaza vacío e inválidos; acepta 0 y montos positivos", () => {
    expect(isValidRequiredJobMinSalary("")).toBe(false)
    expect(isValidRequiredJobMinSalary("   ")).toBe(false)
    expect(isValidRequiredJobMinSalary("abc")).toBe(false)
    expect(isValidRequiredJobMinSalary("-1")).toBe(false)
    expect(isValidRequiredJobMinSalary("0")).toBe(true)
    expect(isValidRequiredJobMinSalary("1500.50")).toBe(true)
  })
})

describe("buildCandidateProfileSaveBody", () => {
  it("nunca envía resumeMarkdown vacío cuando la ficha tiene identidad", () => {
    const body = buildCandidateProfileSaveBody(baseForm())
    expect(body.resumeMarkdown.trim()).not.toBe("")
    expect(body.headline).toBe("Desarrollador")
    expect(body.nationalId).toBe("12345678-9")
  })

  it("incluye minSalary y jobPreferences.MinSalary desde jobMinSalary", () => {
    const body = buildCandidateProfileSaveBody({
      ...baseForm(),
      jobMinSalary: "1500.5",
    })
    expect(body.minSalary).toBe(1500.5)
    const prefs = body.jobPreferences as Record<string, unknown>
    expect(prefs.MinSalary).toBe(1500.5)
  })
})

describe("buildFullFormStateFromSources resumeMarkdown", () => {
  it("hidrata desde latestResume.rawText si el perfil no tiene markdown", () => {
    const form = buildFullFormStateFromSources(null, {
      latestResume: { rawText: "Texto extraído del PDF" },
    })
    expect(form.resumeMarkdown).toBe("Texto extraído del PDF")
  })
})
