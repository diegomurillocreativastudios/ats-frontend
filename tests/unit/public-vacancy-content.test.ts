import { describe, expect, it } from "vitest"
import {
  hasVacancyFieldValue,
  parseVacancyRichText,
  unwrapHardWrappedLines,
  isOverlappingVacancyText,
  buildVacancyStory,
} from "@/lib/public-vacancy-content"

const wrappedDescription = `Ejecutivo de Negocios y Créditos

Objetivo del puesto

Incorporar un ejecutivo comercial-crediticio responsable de la prospección, captación y seguimiento de clientes
para los productos financieros de Prisma Capital, principalmente créditos para micro y pequeñas empresas,
créditos con garantía y factoraje.

La posición combinará desarrollo comercial, trabajo de campo y análisis crediticio preliminar.`

const wrappedDetails = `Perfil profesional requerido
• Experiencia ideal de 2 a 3 años en instituciones financieras.
• Experiencia comprobable en colocación de créditos.
Formación académica
Preferentemente estudiante avanzado, egresado o graduado de:
• Administración de Empresas
• Economía`

describe("unwrapHardWrappedLines", () => {
  it("une cortes duros de un mismo párrafo", () => {
    const lines = unwrapHardWrappedLines(wrappedDescription)
    const paragraph = lines.find((line) => line.includes("Prisma Capital"))

    expect(paragraph).toContain("seguimiento de clientes para los productos")
    expect(paragraph).toContain("créditos con garantía y factoraje.")
  })
})

describe("parseVacancyRichText", () => {
  it("omite el título duplicado y marca subtítulos", () => {
    const blocks = parseVacancyRichText(wrappedDescription, {
      omitTitle: "Ejecutivo de negocios y créditos",
    })

    expect(blocks[0]).toEqual({ kind: "heading", text: "Objetivo del puesto" })
    expect(blocks[1]?.kind).toBe("paragraph")
    expect(blocks[1] && "text" in blocks[1] ? blocks[1].text : "").toContain(
      "Prisma Capital"
    )
  })

  it("agrupa viñetas bajo un encabezado", () => {
    const blocks = parseVacancyRichText(wrappedDetails)
    const list = blocks.find((block) => block.kind === "list")

    expect(blocks[0]).toEqual({
      kind: "heading",
      text: "Perfil profesional requerido",
    })
    expect(list?.kind).toBe("list")
    if (list?.kind === "list") {
      expect(list.items).toHaveLength(2)
      expect(list.items[0]).toContain("2 a 3 años")
    }

    const intro = blocks.find(
      (block) =>
        block.kind === "paragraph" &&
        block.text.startsWith("Preferentemente estudiante avanzado")
    )
    expect(intro).toBeDefined()
    expect(
      blocks.find((block) => block.kind === "heading" && block.text === "Formación académica")
    ).toEqual({ kind: "heading", text: "Formación académica" })
  })

  it("une viñetas partidas y omite pies de página de Word", () => {
    const blocks = parseVacancyRichText(`Perfil profesional requerido
• Experiencia ideal de 2 a 3 años en instituciones financieras, cooperativas, cajas de crédito,
microfinancieras, fintechs, empresas de factoraje o negocios similares.
• Experiencia comprobable en colocación de créditos.
www.prismacapital.co | contacto@prismacapital.co | Perfil de contratación ejecutivo
PRISMA CAPITAL
Formación académica
Preferentemente estudiante avanzado, egresado o graduado de:
• Administración de Empresas`)

    const firstList = blocks.find((block) => block.kind === "list")
    expect(firstList?.kind).toBe("list")
    if (firstList?.kind === "list") {
      expect(firstList.items[0]).toContain("cajas de crédito, microfinancieras")
      expect(firstList.items).toHaveLength(2)
    }

    expect(blocks.some((block) => block.kind === "heading" && block.text === "PRISMA CAPITAL")).toBe(
      false
    )
    expect(
      blocks.some((block) => "text" in block && /www\.prismacapital/i.test(block.text))
    ).toBe(false)
  })
})

describe("hasVacancyFieldValue", () => {
  it("oculta vacíos y el fallback de no especificado", () => {
    expect(hasVacancyFieldValue("Presencial")).toBe(true)
    expect(hasVacancyFieldValue("No especificado")).toBe(false)
    expect(hasVacancyFieldValue("  ")).toBe(false)
  })
})

describe("isOverlappingVacancyText", () => {
  it("detecta el mismo documento pegado dos veces", () => {
    expect(isOverlappingVacancyText(wrappedDescription, wrappedDescription)).toBe(true)
    expect(isOverlappingVacancyText(wrappedDescription, wrappedDetails)).toBe(false)
  })
})

describe("buildVacancyStory", () => {
  it("omite detalles duplicados y deja listas propias", () => {
    const story = buildVacancyStory({
      title: "Ejecutivo de negocios y créditos",
      description: wrappedDescription,
      details: wrappedDescription,
      requirements: ["Licencia vigente"],
    })

    expect(story.requirements).toEqual(["Licencia vigente"])
    expect(story.details).toEqual([])
  })

  it("conserva detalles distintos de la descripción", () => {
    const story = buildVacancyStory({
      title: "Ejecutivo de negocios y créditos",
      description: wrappedDescription,
      details: wrappedDetails,
    })

    expect(story.description[0]).toEqual({
      kind: "heading",
      text: "Objetivo del puesto",
    })
    expect(story.details[0]).toEqual({
      kind: "heading",
      text: "Perfil profesional requerido",
    })
  })
})
