import { describe, it, expect } from "vitest"
import type { CandidateProfile } from "@/lib/candidate-profile"
import { normalizeAtsComplianceChecklist } from "@/lib/ats-compliance-checklist"
import {
  buildAdaptationConclusion,
  buildComparisonCriteria,
  formatCandidateName,
  formatChangeDisplayValue,
  formatChangeFieldName,
  getChecklistSummary,
  getProfileScoreEstimate,
  getTopSkillsForProfile,
  resolveVacancyDisplayTitle,
  type ChangeDisplayLabels,
} from "@/lib/profile-comparison-helpers"

const sampleProfile: CandidateProfile = {
  id: "p1",
  firstName: "DIEGO ENRIQUE",
  lastName: "MURILLO CORREA",
  headline: "Ingeniero de Software de IA",
  summary: "",
  resumeMarkdown: "",
  nationalId: "",
  country: "El Salvador",
  skills: ["React.js", "Next.js", ".NET", "C#", "AWS", "Docker"],
  workExperience: [
    {
      Role: "Desarrollador Full Stack",
      Company: "Creativa Studios",
      StartDate: "2023-01",
      EndDate: "",
      Description: "React, .NET, SQL Server",
    },
  ],
  languages: [{ Language: "Inglés", Level: "Avanzado" }],
}

const adaptedProfile: CandidateProfile = {
  ...sampleProfile,
  headline: "Desarrollador Full Stack .NET",
  summary: "Desarrollador Full Stack con experiencia en C# y ASP.NET Core.",
  skills: ["C#", "ASP.NET Core", "Entity Framework", "React.js", "SQL Server", "AWS"],
  jobPreferences: { DesiredRole: "Desarrollador Full Stack .NET" },
}

const displayLabels: ChangeDisplayLabels = {
  emptySummary: "Sin resumen",
  notDefined: "No definido",
  yes: "Sí",
  no: "No",
  jobPreferenceFields: {
    sectors: "Sectores",
    desiredRole: "Rol deseado",
    minSalary: "Salario mínimo",
    educationLevel: "Nivel educativo",
    desiredCity: "Ciudad deseada",
    availability: "Disponibilidad",
    disability: "Discapacidad",
  },
}

const changeHighlights = [
  {
    field: "Headline",
    before: "Ingeniero de Software de IA",
    after: "Desarrollador Full Stack .NET",
    reason: "Alineación con la vacante",
  },
  {
    field: "Summary",
    before: "",
    after: "Desarrollador Full Stack con experiencia en C#.",
    reason: "Crear resumen profesional",
  },
]

const checklist = normalizeAtsComplianceChecklist([
  {
    id: "title_match",
    label: "Match de cargo",
    status: "Met",
    gapType: "NotApplicable",
    note: "OK",
  },
  {
    id: "measurable_achievements",
    label: "Logros medibles",
    status: "Missing",
    gapType: "RealGap",
    note: "Sin logros cuantificables",
    suggestedAction: "Agregar métricas de impacto.",
  },
])

describe("formatCandidateName", () => {
  it("title-cases the candidate full name", () => {
    expect(formatCandidateName(sampleProfile)).toBe("Diego Enrique Murillo Correa")
  })
})

describe("getProfileScoreEstimate", () => {
  it("uses backend score for adapted profile", () => {
    expect(getProfileScoreEstimate("adapted", 0.92, checklist, changeHighlights)).toBe(92)
  })

  it("derives a lower current score from changes", () => {
    const adapted = getProfileScoreEstimate("adapted", 0.92, checklist, changeHighlights)
    const current = getProfileScoreEstimate("current", 0.92, checklist, changeHighlights)
    expect(current).toBeLessThan(adapted)
  })
})

describe("resolveVacancyDisplayTitle", () => {
  it("falls back to desired role when vacancy title is missing", () => {
    expect(resolveVacancyDisplayTitle(null, adaptedProfile, changeHighlights)).toBe(
      "Desarrollador Full Stack .NET"
    )
  })
})

describe("getTopSkillsForProfile", () => {
  it("prioritizes vacancy-relevant skills for adapted profile", () => {
    const skills = getTopSkillsForProfile(adaptedProfile, "adapted", 4)
    expect(skills[0]).toMatch(/c#|asp\.net/i)
  })
})

describe("buildComparisonCriteria", () => {
  it("marks measurable achievements as pending when checklist is missing", () => {
    const rows = buildComparisonCriteria(sampleProfile, adaptedProfile, checklist, changeHighlights)
    const measurable = rows.find((row) => row.id === "measurable_achievements")
    expect(measurable?.result).toBe("pending")
  })
})

describe("getChecklistSummary", () => {
  it("counts met criteria and pending label", () => {
    expect(getChecklistSummary(checklist)).toEqual({
      met: 1,
      total: 2,
      pending: 1,
      pendingLabel: "Logros medibles",
    })
  })
})

describe("formatChangeDisplayValue", () => {
  it("maps empty summary to placeholder", () => {
    expect(formatChangeDisplayValue("", "Summary", displayLabels)).toBe("Sin resumen")
  })

  it("formats job preferences JSON as readable text", () => {
    const raw =
      '{"Sectors":[],"DesiredRole":"Desarrollador Full Stack .NET","MinSalary":"","EducationLevel":"","DesiredCity":"","Availability":"","Disability":false}'
    expect(formatChangeDisplayValue(raw, "JobPreferences", displayLabels)).toBe(
      "Rol deseado: Desarrollador Full Stack .NET\nDiscapacidad: No"
    )
  })
})

describe("formatChangeFieldName", () => {
  it("maps technical field names to readable labels", () => {
    expect(formatChangeFieldName("JobPreferences")).toBe("Preferencias laborales")
    expect(formatChangeFieldName("WorkExperience[0]")).toBe("Experiencia laboral 1")
    expect(formatChangeFieldName("Headline")).toBe("Titular")
  })
})

describe("buildAdaptationConclusion", () => {
  it("appends suggested action for real gaps", () => {
    const conclusion = buildAdaptationConclusion("Perfil adaptado correctamente.", checklist)
    expect(conclusion).toContain("Agregar métricas de impacto.")
  })
})
