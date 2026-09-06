import type { TechnicalSheetSchema } from "@/lib/technical-sheet/schema/technical-sheet-schema-types"

/**
 * Default technical-sheet schema. Mirrors the former HTML template sections.
 */
export const DEFAULT_TECHNICAL_SHEET_SCHEMA: TechnicalSheetSchema = {
  version: 1,
  kind: "technical-sheet",
  title: "Ficha técnica",
  sections: [
    {
      type: "repeatCards",
      title: "Experiencia laboral",
      rowsBinding: "candidate.workExperience",
      fields: [
        { label: "Empresa", binding: "company" },
        { label: "Cargo desempeñado", binding: "role" },
        { label: "Periodo", binding: "{{startDate}} — {{endDate}}" },
      ],
      bullets: {
        title: "Funciones principales",
        rowsBinding: "responsibilities",
        item: "{{.}}",
      },
    },
    {
      type: "repeatCards",
      title: "Educación",
      rowsBinding: "candidate.education",
      fields: [
        { label: "Institución", binding: "institution" },
        { label: "Título / estudio", binding: "degree" },
        { label: "Periodo", binding: "{{startDate}} — {{endDate}}" },
      ],
    },
    {
      type: "bulletList",
      title: "Cursos y certificaciones",
      rowsBinding: "candidate.certifications",
      item: "{{name}} {{institution}} {{year}}",
    },
    {
      type: "bulletList",
      title: "Habilidades técnicas",
      rowsBinding: "candidate.technicalSkills",
      item: "{{.}}",
    },
    {
      type: "bulletList",
      title: "Habilidades blandas",
      rowsBinding: "candidate.softSkills",
      item: "{{.}}",
    },
    {
      type: "bulletList",
      title: "Idiomas",
      rowsBinding: "candidate.languages",
      item: "{{language}} — {{level}}",
    },
    {
      type: "facts",
      title: "Información adicional",
      items: [
        { label: "Disponibilidad", value: "{{candidate.availability}}" },
        { label: "Modalidad", value: "{{candidate.workMode}}" },
        { label: "País", value: "{{candidate.country}}" },
        { label: "Expectativa salarial", value: "{{candidate.salaryExpectation}}" },
      ],
    },
    {
      type: "paragraph",
      title: "Resumen del perfil",
      text: "{{candidate.profileSummary}}",
    },
  ],
}

export const DEFAULT_TECHNICAL_SHEET_SCHEMA_TEXT = JSON.stringify(
  DEFAULT_TECHNICAL_SHEET_SCHEMA,
  null,
  2
)
