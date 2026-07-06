import { describe, it, expect } from "vitest"
import {
  resolveExclusiveVacancySource,
  tabHasDraftContent,
  MAX_VACANCY_TEXT_LENGTH,
} from "@/lib/profile-tailoring-vacancy-source"
import {
  adaptedProfileToFormState,
  formStateToDisplayProfile,
  getVersionDisplayTitle,
  normalizeProfileVersionDetail,
  normalizeTailorToVacancyResult,
} from "@/lib/candidate-profile-version"

describe("resolveExclusiveVacancySource", () => {
  it("returns none when no source is provided", () => {
    expect(resolveExclusiveVacancySource({ file: null, text: "", vacancyId: null })).toEqual({
      source: null,
      error: "none",
    })
  })

  it("returns multiple when more than one source is active", () => {
    const file = new File(["x"], "vacancy.pdf", { type: "application/pdf" })
    expect(
      resolveExclusiveVacancySource({
        file,
        text: "Job description",
        vacancyId: null,
      })
    ).toEqual({ source: null, error: "multiple" })
  })

  it("accepts a single file source", () => {
    const file = new File(["x"], "vacancy.pdf", { type: "application/pdf" })
    const result = resolveExclusiveVacancySource({
      file,
      text: "",
      vacancyId: null,
    })
    expect(result.error).toBe("none")
    expect(result.source?.kind).toBe("file")
  })

  it("rejects text above max length", () => {
    const result = resolveExclusiveVacancySource({
      file: null,
      text: "a".repeat(MAX_VACANCY_TEXT_LENGTH + 1),
      vacancyId: null,
    })
    expect(result).toEqual({ source: null, error: "text_too_long" })
  })
})

describe("tabHasDraftContent", () => {
  it("detects draft content per tab", () => {
    const input = {
      file: new File(["x"], "v.pdf", { type: "application/pdf" }),
      text: "hello",
      vacancyId: "vac-1",
    }
    expect(tabHasDraftContent("file", input)).toBe(true)
    expect(tabHasDraftContent("text", input)).toBe(true)
    expect(tabHasDraftContent("platform", input)).toBe(true)
  })
})

describe("normalizeTailorToVacancyResult", () => {
  it("maps API response to form state via adapted profile", () => {
    const raw = {
      versionId: "ver-1",
      versionNumber: 2,
      vacancySource: "text",
      vacancyTitle: "Backend Dev",
      estimatedMatchScore: 0.82,
      currentProfile: {
        id: "p1",
        headline: "Dev",
        summary: "Current",
        resumeMarkdown: "cv",
        nationalId: "123",
      },
      adaptedProfile: {
        id: "p1",
        headline: "Senior Dev",
        summary: "Adapted summary",
        resumeMarkdown: "cv adapted",
        nationalId: "123",
        skills: ["TypeScript", "NET"],
      },
      adaptationSummary: "Emphasized backend skills.",
      changeHighlights: [
        { field: "headline", before: "Dev", after: "Senior Dev", reason: "Closer match" },
      ],
      promptVersion: "v2",
      atsComplianceChecklist: [
        {
          id: "readable_format",
          label: "Formato legible",
          status: "Met",
          gapType: "NotApplicable",
          note: "OK",
        },
      ],
    }

    const result = normalizeTailorToVacancyResult(raw)
    expect(result?.versionId).toBe("ver-1")
    expect(result?.promptVersion).toBe("v2")
    expect(result?.atsComplianceChecklist).toHaveLength(1)
    expect(result?.atsComplianceChecklist[0]?.id).toBe("readable_format")
    expect(result?.adaptedProfile.headline).toBe("Senior Dev")

    const form = adaptedProfileToFormState(result!.adaptedProfile)
    expect(form.headline).toBe("Senior Dev")
    expect(form.summary).toBe("Adapted summary")
    expect(form.skillsText).toContain("TypeScript")
  })

  it("defaults atsComplianceChecklist to an empty array", () => {
    const result = normalizeTailorToVacancyResult({
      versionId: "ver-2",
      versionNumber: 1,
      currentProfile: { headline: "Dev" },
      adaptedProfile: { headline: "Senior Dev" },
      changeHighlights: [],
    })
    expect(result?.atsComplianceChecklist).toEqual([])
  })
})

describe("normalizeProfileVersionDetail", () => {
  it("maps atsComplianceChecklist from version detail", () => {
    const detail = normalizeProfileVersionDetail({
      id: "ver-3",
      versionNumber: 2,
      createdAt: "2026-01-01T00:00:00.000Z",
      promptVersion: "v2",
      adaptedProfile: { headline: "Senior Dev" },
      atsComplianceChecklist: [
        {
          id: "title_match",
          label: "Match de cargo",
          status: "Partial",
          gapType: "WritingGap",
          note: "Titular mejorable",
        },
      ],
    })
    expect(detail?.atsComplianceChecklist).toHaveLength(1)
    expect(detail?.atsComplianceChecklist[0]?.status).toBe("Partial")
  })
})

describe("getVersionDisplayTitle", () => {
  it("prefers custom label over vacancy title and fallback", () => {
    const version = {
      label: "Perfil backend",
      vacancyTitle: "Senior Developer",
      versionNumber: 2,
    }
    expect(getVersionDisplayTitle(version, "Versión 2")).toBe("Perfil backend")
  })

  it("falls back to vacancy title then version number", () => {
    expect(
      getVersionDisplayTitle(
        { label: null, vacancyTitle: "QA Lead", versionNumber: 1 },
        "Versión 1"
      )
    ).toBe("QA Lead")
    expect(
      getVersionDisplayTitle({ label: null, vacancyTitle: null, versionNumber: 3 }, "Versión 3")
    ).toBe("Versión 3")
  })
})

describe("formStateToDisplayProfile", () => {
  it("maps edited form state back to a display profile", () => {
    const raw = {
      versionId: "ver-1",
      versionNumber: 1,
      adaptedProfile: {
        headline: "Senior Dev",
        summary: "Adapted summary",
        skills: ["TypeScript"],
      },
      currentProfile: { headline: "Dev", summary: "Current" },
      changeHighlights: [],
    }
    const result = normalizeTailorToVacancyResult(raw)
    const form = adaptedProfileToFormState(result!.adaptedProfile)
    form.headline = "Lead Backend Engineer"

    const display = formStateToDisplayProfile(form)
    expect(display.headline).toBe("Lead Backend Engineer")
    expect(display.summary).toBe("Adapted summary")
  })
})
