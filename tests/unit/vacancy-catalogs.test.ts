import { describe, expect, it } from "vitest"
import {
  getVacancyDepartmentId,
  getVacancyDepartmentLabel,
  getVacancyModalityId,
  getVacancyModalityLabel,
  mapActiveCatalogItemsToOptions,
  mergeCatalogOption,
} from "@/lib/vacancy-catalogs"

const DEPT_GUID = "00000000-0000-0000-0000-000000000601"
const MOD_GUID = "00000000-0000-0000-0000-000000000702"
const INACTIVE_DEPT_GUID = "00000000-0000-0000-0000-000000000609"

describe("vacancy catalog helpers", () => {
  describe("getVacancyDepartmentId / getVacancyModalityId", () => {
    it("returns the top-level GUID fields from the new backend contract", () => {
      const vacancy = {
        vacancyDepartmentId: DEPT_GUID,
        vacancyDepartment: { id: DEPT_GUID, code: "technology", displayName: "Tecnología" },
        vacancyModalityId: MOD_GUID,
        vacancyModality: { id: MOD_GUID, code: "remote", displayName: "Remoto" },
      }

      expect(getVacancyDepartmentId(vacancy)).toBe(DEPT_GUID)
      expect(getVacancyModalityId(vacancy)).toBe(MOD_GUID)
    })

    it("falls back to the nested summary ID when the top-level GUID field is absent", () => {
      const vacancy = {
        vacancyDepartment: { id: DEPT_GUID, code: "technology", displayName: "Tecnología" },
        vacancyModality: { id: MOD_GUID, code: "remote", displayName: "Remoto" },
      }

      expect(getVacancyDepartmentId(vacancy)).toBe(DEPT_GUID)
      expect(getVacancyModalityId(vacancy)).toBe(MOD_GUID)
    })

    it("returns empty string for legacy free-text department strings — never sends text to backend", () => {
      const vacancy = {
        department: "Uncategorized",
        work_arrangement: "Híbrido",
      }

      expect(getVacancyDepartmentId(vacancy)).toBe("")
      expect(getVacancyModalityId(vacancy)).toBe("")
    })

    it("returns empty string when nothing is set", () => {
      expect(getVacancyDepartmentId(null)).toBe("")
      expect(getVacancyDepartmentId({})).toBe("")
      expect(getVacancyModalityId(null)).toBe("")
      expect(getVacancyModalityId({})).toBe("")
    })
  })

  describe("getVacancyDepartmentLabel / getVacancyModalityLabel", () => {
    it("prefers the nested displayName from the new backend contract", () => {
      const vacancy = {
        vacancyDepartmentId: DEPT_GUID,
        vacancyDepartment: { id: DEPT_GUID, code: "technology", displayName: "Tecnología" },
        vacancyModalityId: MOD_GUID,
        vacancyModality: { id: MOD_GUID, code: "remote", displayName: "Remoto" },
        department: "Legacy Department",
        workArrangement: "Legacy Modality",
      }

      expect(getVacancyDepartmentLabel(vacancy)).toBe("Tecnología")
      expect(getVacancyModalityLabel(vacancy)).toBe("Remoto")
    })

    it("supports summary objects returned in department/modality-shaped fields", () => {
      const vacancy = {
        department: { id: DEPT_GUID, code: "technology", displayName: "Tecnología" },
        modality: { id: MOD_GUID, code: "remote", displayName: "Remoto" },
      }

      expect(getVacancyDepartmentLabel(vacancy)).toBe("Tecnología")
      expect(getVacancyModalityLabel(vacancy)).toBe("Remoto")
      expect(getVacancyDepartmentId(vacancy)).toBe(DEPT_GUID)
      expect(getVacancyModalityId(vacancy)).toBe(MOD_GUID)
    })

    it("falls back to legacy strings for display-only purposes", () => {
      const vacancy = {
        department: "Operaciones",
        work_arrangement: "Híbrido",
      }

      expect(getVacancyDepartmentLabel(vacancy)).toBe("Operaciones")
      expect(getVacancyModalityLabel(vacancy)).toBe("Híbrido")
    })

    it("returns 'No especificado' when no data is present", () => {
      expect(getVacancyDepartmentLabel(null)).toBe("No especificado")
      expect(getVacancyModalityLabel({})).toBe("No especificado")
    })
  })

  describe("mapActiveCatalogItemsToOptions", () => {
    it("excludes inactive catalog items", () => {
      const options = mapActiveCatalogItemsToOptions([
        { id: DEPT_GUID, code: "technology", displayName: "Tecnología", description: "", sortOrder: 1, isActive: true },
        { id: INACTIVE_DEPT_GUID, code: "legacy", displayName: "Legacy", description: "", sortOrder: 9, isActive: false },
      ])

      expect(options).toHaveLength(1)
      expect(options[0].id).toBe(DEPT_GUID)
    })
  })

  describe("mergeCatalogOption", () => {
    const activeOptions = [
      { id: DEPT_GUID, code: "technology", displayName: "Tecnología" },
    ]

    it("prepends the current GUID summary when it is inactive and not in the list", () => {
      const merged = mergeCatalogOption(activeOptions, {
        id: INACTIVE_DEPT_GUID,
        code: "legacy",
        displayName: "Legacy",
      })

      expect(merged[0].id).toBe(INACTIVE_DEPT_GUID)
      expect(merged).toHaveLength(2)
    })

    it("does not duplicate an option that already exists", () => {
      const merged = mergeCatalogOption(activeOptions, {
        id: DEPT_GUID,
        code: "technology",
        displayName: "Tecnología",
      })

      expect(merged).toHaveLength(1)
    })

    it("ignores summaries whose id is not a valid GUID (legacy free-text)", () => {
      const merged = mergeCatalogOption(activeOptions, {
        id: "Uncategorized",
        code: "uncategorized",
        displayName: "Uncategorized",
      })

      expect(merged).toHaveLength(1)
      expect(merged[0].id).toBe(DEPT_GUID)
    })
  })
})
