import { describe, expect, it } from "vitest"
import {
  formatApplicationSourceBadge,
  mapApplicationSourceLabel,
} from "@/lib/application-source"
import {
  buildPublicApplyFormData,
  getPublicApplyErrorMessage,
  isPdfFile,
  isValidEmailFormat,
  parsePublicApplyFieldErrors,
} from "@/lib/public-vacancy-apply"

describe("application source labels", () => {
  it("maps 1 to Personal and 0 to Recruiter", () => {
    expect(mapApplicationSourceLabel(1)).toBe("Personal")
    expect(mapApplicationSourceLabel(0)).toBe("Recruiter")
  })

  it("formats badge for Personal when applicationSource = 1", () => {
    expect(formatApplicationSourceBadge(1)).toBe("Personal")
  })

  it("formats badge for Recruiter when applicationSource = 0", () => {
    expect(formatApplicationSourceBadge(0)).toBe("Recruiter")
  })

  it("defaults missing source to Recruiter", () => {
    expect(formatApplicationSourceBadge(undefined)).toBe("Recruiter")
  })

  it("returns Origen desconocido for unexpected numeric values", () => {
    expect(formatApplicationSourceBadge(99)).toBe("Origen desconocido")
  })
})

describe("public vacancy apply helpers", () => {
  it("validates email format", () => {
    expect(isValidEmailFormat("a@b.co")).toBe(true)
    expect(isValidEmailFormat("bad")).toBe(false)
    expect(isValidEmailFormat("")).toBe(false)
  })

  it("accepts only pdf by extension or mime", () => {
    expect(isPdfFile(new File([], "cv.pdf", { type: "application/pdf" }))).toBe(true)
    expect(isPdfFile(new File([], "cv.PDF", { type: "" }))).toBe(true)
    expect(isPdfFile(new File([], "cv.doc", { type: "" }))).toBe(false)
  })

  it("returns specific messages for 404, 409 and 415", () => {
    expect(getPublicApplyErrorMessage(404, {})).toContain("disponible")
    expect(getPublicApplyErrorMessage(409, {})).toContain("postulado")
    expect(getPublicApplyErrorMessage(415, {})).toContain("PDF")
  })

  it("prefers backend message on 415 when present", () => {
    expect(
      getPublicApplyErrorMessage(415, {
        message: "Unsupported CV file format. Allowed format: PDF.",
      })
    ).toBe("Unsupported CV file format. Allowed format: PDF.")
  })

  it("parses ASP.NET-style errors dictionary", () => {
    const parsed = parsePublicApplyFieldErrors({
      errors: { email: ["Correo inválido"], firstName: "Requerido" },
    })
    expect(parsed.email).toBe("Correo inválido")
    expect(parsed.firstName).toBe("Requerido")
  })

  it("builds FormData with expected keys", () => {
    const file = new File(["%PDF"], "x.pdf", { type: "application/pdf" })
    const fd = buildPublicApplyFormData({
      firstName: " Ana ",
      lastName: "López",
      email: "a@b.co",
      phone: "",
      linkedinUrl: "https://in",
      websiteUrl: "",
      source: "linkedin",
      notes: "hola",
      cvFile: file,
    })
    expect(fd.get("firstName")).toBe("Ana")
    expect(fd.get("lastName")).toBe("López")
    expect(fd.get("email")).toBe("a@b.co")
    expect(fd.get("source")).toBe("linkedin")
    expect(fd.get("notes")).toBe("hola")
    expect(fd.get("cvFile")).toBe(file)
  })
})
