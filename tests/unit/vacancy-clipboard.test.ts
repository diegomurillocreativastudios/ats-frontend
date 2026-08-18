import { afterEach, describe, expect, it, vi } from "vitest"
import {
  VACANCY_CLIPBOARD_STORAGE_KEY,
  buildVacancyClipboardPayload,
  clipboardPayloadToRequirementRows,
  hasVacancyClipboard,
  parseVacancyClipboardFromText,
  parseVacancyClipboardPayload,
  readVacancyClipboard,
  resolveClipboardCatalogId,
  resolveClipboardCompanyId,
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
  vacancyDepartment: {
    id: DEPARTMENT_ID,
    code: "flight",
    displayName: "Operaciones de vuelo",
  },
  vacancyModalityId: MODALITY_ID,
  vacancyModality: {
    id: MODALITY_ID,
    code: "onsite",
    displayName: "Presencial",
  },
  company: "Aero Cliente",
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
  return buildVacancyClipboardPayload(sourceVacancy, "company-xyz", "Aero Cliente")
}

function installClipboardMock(initialText = "") {
  const clipboard = {
    text: initialText,
    writeText: vi.fn(async (value: string) => {
      clipboard.text = value
    }),
    readText: vi.fn(async () => clipboard.text),
  }
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: clipboard.writeText,
      readText: clipboard.readText,
    },
  })
  return clipboard
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
      vacancyDepartmentCode: "flight",
      vacancyDepartmentName: "Operaciones de vuelo",
      vacancyModalityId: MODALITY_ID,
      vacancyModalityCode: "onsite",
      vacancyModalityName: "Presencial",
      companyId: "company-xyz",
      companyName: "Aero Cliente",
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
    expect(payload.companyName).toBe("")
    expect(payload.vacancyDepartmentName).toBe("")
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

  it("accepts older payloads that omit catalog and company labels", () => {
    const { vacancyDepartmentCode, vacancyDepartmentName, vacancyModalityCode, vacancyModalityName, companyName, ...legacy } =
      validPayload()
    void vacancyDepartmentCode
    void vacancyDepartmentName
    void vacancyModalityCode
    void vacancyModalityName
    void companyName

    const parsed = parseVacancyClipboardPayload(legacy)
    expect(parsed).not.toBeNull()
    expect(parsed?.vacancyDepartmentName).toBe("")
    expect(parsed?.companyName).toBe("")
    expect(parsed?.title).toBe("Piloto titular")
  })
})

describe("parseVacancyClipboardFromText", () => {
  it("parses a serialized payload and rejects garbage", () => {
    expect(parseVacancyClipboardFromText(JSON.stringify(validPayload()))).toEqual(
      validPayload()
    )
    expect(parseVacancyClipboardFromText("{not-json")).toBeNull()
    expect(parseVacancyClipboardFromText("hola")).toBeNull()
    expect(parseVacancyClipboardFromText("")).toBeNull()
  })
})

describe("vacancy clipboard sessionStorage", () => {
  afterEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    })
  })

  it("round-trips a payload through sessionStorage", async () => {
    const payload = validPayload()
    expect(await writeVacancyClipboard(payload)).toBe(true)
    expect(hasVacancyClipboard()).toBe(true)
    expect(await readVacancyClipboard()).toEqual(payload)
    expect(sessionStorage.getItem(VACANCY_CLIPBOARD_STORAGE_KEY)).toContain(
      "Piloto titular"
    )
  })

  it("treats corrupt JSON as no clipboard", async () => {
    sessionStorage.setItem(VACANCY_CLIPBOARD_STORAGE_KEY, "{not-json")
    expect(await readVacancyClipboard()).toBeNull()
    expect(hasVacancyClipboard()).toBe(false)
  })

  it("writes the payload to the system clipboard", async () => {
    const clipboard = installClipboardMock()
    const payload = validPayload()

    expect(await writeVacancyClipboard(payload)).toBe(true)
    expect(clipboard.writeText).toHaveBeenCalledTimes(1)
    expect(JSON.parse(clipboard.text)).toEqual(payload)
  })

  it("reads from the system clipboard when sessionStorage is empty", async () => {
    const payload = validPayload()
    installClipboardMock(JSON.stringify(payload))

    expect(hasVacancyClipboard()).toBe(false)
    expect(await readVacancyClipboard()).toEqual(payload)
    expect(hasVacancyClipboard()).toBe(true)
  })

  it("prefers the system clipboard over a stale sessionStorage copy", async () => {
    const sessionPayload = validPayload()
    const clipboardPayload = {
      ...validPayload(),
      title: "Otra vacante",
    }
    installClipboardMock(JSON.stringify(clipboardPayload))
    sessionStorage.setItem(
      VACANCY_CLIPBOARD_STORAGE_KEY,
      JSON.stringify(sessionPayload)
    )

    expect(await readVacancyClipboard()).toEqual(clipboardPayload)
    expect(JSON.parse(sessionStorage.getItem(VACANCY_CLIPBOARD_STORAGE_KEY) ?? "")).toEqual(
      clipboardPayload
    )
  })

  it("falls back to sessionStorage when the system clipboard is not a vacancy", async () => {
    const sessionPayload = validPayload()
    installClipboardMock("texto suelto")
    sessionStorage.setItem(
      VACANCY_CLIPBOARD_STORAGE_KEY,
      JSON.stringify(sessionPayload)
    )

    expect(await readVacancyClipboard()).toEqual(sessionPayload)
  })
})

describe("resolveClipboardCatalogId", () => {
  const options = [
    { id: "dept-local", code: "flight", displayName: "Operaciones de vuelo" },
    { id: "dept-other", code: "ops", displayName: "Operaciones" },
  ]

  it("keeps the copied id when it exists in the destination catalog", () => {
    expect(
      resolveClipboardCatalogId("dept-local", "flight", "Operaciones de vuelo", options)
    ).toBe("dept-local")
  })

  it("matches by code when the copied id belongs to another environment", () => {
    expect(
      resolveClipboardCatalogId("dept-prod", "flight", "Operaciones de vuelo", options)
    ).toBe("dept-local")
  })

  it("matches by name when code is missing", () => {
    expect(
      resolveClipboardCatalogId("dept-prod", "", "Operaciones", options)
    ).toBe("dept-other")
  })

  it("returns empty when nothing matches", () => {
    expect(resolveClipboardCatalogId("dept-prod", "unknown", "Missing", options)).toBe(
      ""
    )
  })
})

describe("resolveClipboardCompanyId", () => {
  const companies = [
    { id: "co-local", name: "Aero Cliente" },
    { id: "co-other", name: "Otra Empresa" },
  ]

  it("keeps the copied id when the company exists locally", () => {
    expect(resolveClipboardCompanyId("co-local", "Aero Cliente", companies)).toBe(
      "co-local"
    )
  })

  it("matches by name across environments", () => {
    expect(resolveClipboardCompanyId("co-prod", "Aero Cliente", companies)).toBe(
      "co-local"
    )
  })

  it("returns null when the company is unknown so the current selection is kept", () => {
    expect(resolveClipboardCompanyId("co-prod", "Cliente fantasma", companies)).toBeNull()
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
