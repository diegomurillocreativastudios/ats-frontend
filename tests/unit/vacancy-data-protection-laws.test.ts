import { describe, expect, it } from "vitest"
import {
  mergeLinkedLawOptions,
  readVacancyDataProtectionLawIds,
  readVacancyDataProtectionLaws,
} from "@/lib/vacancies/vacancy-data-protection-laws"

describe("readVacancyDataProtectionLaws", () => {
  it("reads camelCase and snake_case law lists", () => {
    expect(
      readVacancyDataProtectionLaws({
        data_protection_laws: [
          {
            id: "law-1",
            code: "gdpr",
            display_name: "GDPR",
            jurisdiction_code: "eu",
            is_active: false,
            body: "texto",
          },
        ],
      }),
    ).toEqual([
      {
        id: "law-1",
        code: "gdpr",
        displayName: "GDPR",
        jurisdictionCode: "EU",
        officialReference: "",
        summary: "",
        locale: "",
        body: "texto",
        isActive: false,
      },
    ])
  })

  it("falls back to identifier arrays when the nested list is absent", () => {
    expect(
      readVacancyDataProtectionLawIds({ dataProtectionLawIds: ["a", " ", "b"] }),
    ).toEqual(["a", "b"])
  })

  it("keeps inactive linked laws visible beside active options", () => {
    const merged = mergeLinkedLawOptions(
      [{ id: "active", code: "a", displayName: "Activa", jurisdictionCode: "SV", officialReference: "", summary: "", locale: "es", body: "", isActive: true }],
      [{ id: "old", code: "b", displayName: "Vieja", jurisdictionCode: "EU", officialReference: "", summary: "", locale: "es", body: "", isActive: false }],
    )
    expect(merged.map((law) => law.id)).toEqual(["active", "old"])
  })
})
