import { describe, expect, it } from "vitest"
import { DEFAULT_TECHNICAL_SHEET_SCHEMA_TEXT } from "@/lib/technical-sheet/schema/technical-sheet-default-schema"
import { renderTechnicalSheetPdfBuffer } from "@/lib/technical-sheet/render-technical-sheet-pdf-response"

describe("technical sheet schema PDF (PDFKit)", () => {
  it(
    "renders a schema template to a valid PDF buffer",
    async () => {
      const buf = await renderTechnicalSheetPdfBuffer({
        payload: {
          personal: { firstName: "Smoke", lastName: "Test" },
          candidate: { profileSummary: "Smoke test profile", technicalSkills: ["TypeScript"] },
        },
        templates: [
          {
            id: 1,
            type: "Document",
            name: "Ficha",
            contentTemplate: DEFAULT_TECHNICAL_SHEET_SCHEMA_TEXT,
            isTechnicalSheet: true,
            isReport: false,
          },
        ],
        candidateProfileId: "00000000-0000-0000-0000-000000000001",
        vacancyTitleFallback: "RPA",
      })

      expect(buf.length).toBeGreaterThan(1000)
      expect(buf.subarray(0, 4).toString("utf8")).toBe("%PDF")
    },
    30_000
  )
})
