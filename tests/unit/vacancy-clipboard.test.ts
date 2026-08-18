import { afterEach, describe, expect, it } from "vitest"
import {
  VACANCY_CLIPBOARD_STORAGE_KEY,
  buildVacancyClipboardPayload,
  clipboardPayloadToRequirementRows,
  hasVacancyClipboard,
  parseVacancyClipboardPayload,
  readVacancyClipboard,
  writeVacancyClipboard,
} from "@/lib/vacancies/vacancy-clipboard"

const DEPARTMENT_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
const MODALITY_ID = "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff"

const sourceVacancy = {
  id: "vac-1",
  uuid: "should-not-copy",
  title: "Piloto titular",
  description: "Rol de carrera",
  details: "Detalles",
  salary: "US$10,000",
  advantages: "Bono anual",
  countryCode: "de",
  stateCode: "bw",
  vacancyDepartmentId: DEPARTMENT_ID,
  vacancyModalityId: MODALITY_ID,
  status: "activa",
  isActive: true,
  createdAt: "2026-08-13T00:00:00.000Z",
  applicants: [{ id: "app-1" }],
  weights: {
    semantic: 0.9,
    attributes: { licencia: 0.8 },
  },
  requirements: {
    licencia: "Pesada",
    additionalProp1: "ignore-me",
  },
}

function validPayload() {
  return buildVacancyClipboardPayload(sourceVacancy, "company-xyz")
}

describe("buildVacancyClipboardPayload", () => {
  it("copies form fields and omits ids, status and applicants", () => {
    const payload = validPayload()

    expect(payload).toEqual({
      version: 1,
      title: "Piloto titular",
      description: "Rol de carrera",
      details: "Detalles",
      salary: "US$10,000",
      advantages: "Bono anual",
      countryCode: "DE",
      stateCode: "BW",
      vacancyDepartmentId: DEPARTMENT_ID,
      vacancyModalityId: MODALITY_ID,
      companyId: "company-xyz",
      requirements: [{ requirementName: "licencia", requirementValue: "Pesada", scale: 8 }],
    })
    expect(payload).not.toHaveProperty("id")
    expect(payload).not.toHaveProperty("uuid")
    expect(payload).not.toHaveProperty("status")
    expect(payload).not.toHaveProperty("createdAt")
    expect(payload).not.toHaveProperty("applicants")
    expect(payload).not.toHaveProperty("weights")
  })

  it("uses the companyId argument instead of the vacancy record", () => {
    const payload = buildVacancyClipboardPayload(
      { ...sourceVacancy, companyId: "from-vacancy" },
      "from-argument"
    )
    expect(payload.companyId).toBe("from-argument")
  })

  it("returns empty strings and no requirements for an empty source", () => {
    const payload = buildVacancyClipboardPayload(null, "")
    expect(payload.version).toBe(1)
    expect(payload.title).toBe("")
    expect(payload.requirements).toEqual([])
    expect(payload.companyId).toBe("")
  })
})

describe("parseVacancyClipboardPayload", () => {
  it("returns null for invalid or version-mismatched payloads", () => {
    expect(parseVacancyClipboardPayload(null)).toBeNull()
    expect(parseVacancyClipboardPayload("vacante")).toBeNull()
    expect(parseVacancyClipboardPayload({ ...validPayload(), version: 2 })).toBeNull()
    expect(parseVacancyClipboardPayload({ ...validPayload(), title: 12 })).toBeNull()
    expect(
      parseVacancyClipboardPayload({ ...validPayload(), requirements: "licencia" })
    ).toBeNull()
  })

  it("drops extra fields from an otherwise valid payload", () => {
    const parsed = parseVacancyClipboardPayload({
      ...validPayload(),
      id: "vac-1",
      status: "activa",
    })
    expect(parsed).not.toBeNull()
    expect(parsed).not.toHaveProperty("id")
    expect(parsed).not.toHaveProperty("status")
    expect(parsed?.title).toBe("Piloto titular")
  })
})

describe("vacancy clipboard sessionStorage", () => {
  afterEach(() => {
    sessionStorage.clear()
  })

  it("round-trips a payload through sessionStorage", () => {
    const payload = validPayload()
    expect(writeVacancyClipboard(payload)).toBe(true)
    expect(hasVacancyClipboard()).toBe(true)
    expect(readVacancyClipboard()).toEqual(payload)
    expect(sessionStorage.getItem(VACANCY_CLIPBOARD_STORAGE_KEY)).toContain(
      "Piloto titular"
    )
  })

  it("treats corrupt JSON as no clipboard", () => {
    sessionStorage.setItem(VACANCY_CLIPBOARD_STORAGE_KEY, "{not-json")
    expect(readVacancyClipboard()).toBeNull()
    expect(hasVacancyClipboard()).toBe(false)
  })
})

describe("clipboardPayloadToRequirementRows", () => {
  it("regenerates row ids and keeps requirement values", () => {
    const first = clipboardPayloadToRequirementRows(validPayload().requirements)
    const second = clipboardPayloadToRequirementRows(validPayload().requirements)

    expect(first).toHaveLength(1)
    expect(first[0].requirementName).toBe("licencia")
    expect(first[0].requirementValue).toBe("Pesada")
    expect(first[0].scale).toBe(8)
    expect(first[0].id).not.toBe(second[0].id)
  })

  it("returns a blank row when there are no requirements", () => {
    const rows = clipboardPayloadToRequirementRows([])
    expect(rows).toHaveLength(1)
    expect(rows[0].requirementName).toBe("")
    expect(rows[0].requirementValue).toBe("")
    expect(rows[0].scale).toBe(5)
    expect(rows[0].id).toBeTruthy()
  })
})
