import { describe, expect, it } from "vitest"
import { readTechnicalSheetCompanyBrandFromVacancy } from "@/lib/technical-sheet/vacancy-company-brand"
import { buildTechnicalSheetPageHtml } from "@/lib/technical-sheet/technical-sheet-page-shell"
import { APP_NAME } from "@/lib/app-brand"

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

describe("readTechnicalSheetCompanyBrandFromVacancy", () => {
  it("reads company name and safe logo from a vacancy detail payload", () => {
    const brand = readTechnicalSheetCompanyBrandFromVacancy({
      id: "vac-1",
      companyName: "Creativa Studios",
      hasLogo: true,
      logo: {
        base64: TINY_PNG_BASE64,
        contentType: "image/png",
      },
    })

    expect(brand).toEqual({
      name: "Creativa Studios",
      logoDataUri: `data:image/png;base64,${TINY_PNG_BASE64}`,
    })
  })

  it("returns name without logo when hasLogo is false", () => {
    const brand = readTechnicalSheetCompanyBrandFromVacancy({
      company: "Acme Corp",
      hasLogo: false,
      logo: {
        base64: TINY_PNG_BASE64,
        contentType: "image/png",
      },
    })

    expect(brand).toEqual({
      name: "Acme Corp",
      logoDataUri: null,
    })
  })

  it("rejects SVG logos and keeps the company name", () => {
    const brand = readTechnicalSheetCompanyBrandFromVacancy({
      companyName: "Svg Co",
      hasLogo: true,
      logo: {
        base64: "PHN2Zy8+",
        contentType: "image/svg+xml",
      },
    })

    expect(brand).toEqual({
      name: "Svg Co",
      logoDataUri: null,
    })
  })

  it("returns null when there is no company name and no usable logo", () => {
    expect(
      readTechnicalSheetCompanyBrandFromVacancy({
        title: "Engineer",
        hasLogo: false,
      })
    ).toBeNull()
  })

  it("unwraps nested vacancy envelopes", () => {
    const brand = readTechnicalSheetCompanyBrandFromVacancy({
      data: {
        companyName: "Nested Co",
        hasLogo: true,
        logo: {
          base64: TINY_PNG_BASE64,
          contentType: "image/png",
        },
      },
    })

    expect(brand?.name).toBe("Nested Co")
    expect(brand?.logoDataUri).toContain("data:image/png;base64,")
  })
})

describe("buildTechnicalSheetPageHtml company brand", () => {
  const baseHeader = {
    fullName: "Ana Pérez",
    address: "CDMX",
    englishLevel: "B2",
  }

  it("keeps ApplicanTree and adds company logo + name for vacancy sheets", () => {
    const html = buildTechnicalSheetPageHtml({
      logoUrl: "data:image/svg+xml;base64,abc",
      header: baseHeader,
      bodyHtml: "<article></article>",
      companyBrand: {
        name: "Creativa Studios",
        logoDataUri: `data:image/png;base64,${TINY_PNG_BASE64}`,
      },
    })

    expect(html).toContain(APP_NAME)
    expect(html).toContain("technical-sheet-page__company")
    expect(html).toContain("Creativa Studios")
    expect(html).toContain(`data:image/png;base64,${TINY_PNG_BASE64}`)
  })

  it("shows company name without logo when logo is missing", () => {
    const html = buildTechnicalSheetPageHtml({
      logoUrl: "data:image/svg+xml;base64,abc",
      header: baseHeader,
      bodyHtml: "<article></article>",
      companyBrand: {
        name: "Acme Corp",
        logoDataUri: null,
      },
    })

    expect(html).toContain(APP_NAME)
    expect(html).toContain("Acme Corp")
    expect(html).toContain("technical-sheet-page__company")
  })

  it("omits the company block for profile sheets (no companyBrand)", () => {
    const html = buildTechnicalSheetPageHtml({
      logoUrl: "data:image/svg+xml;base64,abc",
      header: baseHeader,
      bodyHtml: "<article></article>",
    })

    expect(html).toContain(APP_NAME)
    expect(html).not.toContain("technical-sheet-page__company")
  })
})
