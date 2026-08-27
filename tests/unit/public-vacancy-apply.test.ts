import { describe, expect, it } from "vitest"
import {
  formatApplicationSourceBadge,
  mapApplicationSourceLabel,
} from "@/lib/application-source"
import {
  buildPublicApplyFormData,
  getPublicApplyErrorMessage,
  isAllowedCvFile,
  isCvFileWithinSizeLimit,
  isValidEmailFormat,
  parsePublicApplyFieldErrors,
  PUBLIC_CV_MAX_BYTES,
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

  it("accepts pdf by extension or mime and rejects docx", () => {
    expect(isAllowedCvFile(new File([], "cv.pdf", { type: "application/pdf" }))).toBe(true)
    expect(isAllowedCvFile(new File([], "cv.PDF", { type: "" }))).toBe(true)
    expect(isAllowedCvFile(new File([], "cv.docx", { type: "" }))).toBe(false)
    expect(
      isAllowedCvFile(
        new File([], "cv", {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        })
      )
    ).toBe(false)
    expect(isAllowedCvFile(new File([], "cv.doc", { type: "" }))).toBe(false)
  })

  it("rejects files larger than 15 MB", () => {
    const oversized = {
      name: "cv.pdf",
      type: "application/pdf",
      size: PUBLIC_CV_MAX_BYTES + 1,
    } as File
    const ok = {
      name: "cv.pdf",
      type: "application/pdf",
      size: PUBLIC_CV_MAX_BYTES,
    } as File
    expect(isCvFileWithinSizeLimit(oversized)).toBe(false)
    expect(isCvFileWithinSizeLimit(ok)).toBe(true)
  })

  it("returns specific messages for 403, 404, 413, 415, 422 and 429", () => {
    expect(getPublicApplyErrorMessage(403, {})).toContain("coincidir")
    expect(getPublicApplyErrorMessage(404, {})).toContain("disponible")
    expect(getPublicApplyErrorMessage(413, {})).toContain("15 MB")
    expect(getPublicApplyErrorMessage(415, {})).toMatch(/PDF válido|coincide/)
    expect(getPublicApplyErrorMessage(422, {})).toContain("procesar")
    expect(getPublicApplyErrorMessage(429, {})).toContain("Demasiados intentos")
    expect(
      getPublicApplyErrorMessage(429, {
        message: "Demasiados intentos. Probá de nuevo más tarde.",
      })
    ).toBe("Demasiados intentos. Probá de nuevo más tarde.")
  })

  it("maps 400 to unsupported format fallback instead of size", () => {
    expect(getPublicApplyErrorMessage(400, {})).toContain("Formato")
    expect(
      getPublicApplyErrorMessage(400, { message: "SVG no permitido" })
    ).toBe("SVG no permitido")
  })

  it("falls back to generic unexpected error for unknown statuses", () => {
    expect(getPublicApplyErrorMessage(500, {})).toContain("error inesperado")
  })

  it("maps AUTH_CONSENT error codes from personal-appliance", () => {
    expect(
      getPublicApplyErrorMessage(400, { code: "AUTH_CONSENT_VALIDATION" })
    ).toContain("autorización")
    expect(
      getPublicApplyErrorMessage(409, { code: "AUTH_CONSENT_VERSION_MISMATCH" })
    ).toContain("actualizó")
    expect(
      getPublicApplyErrorMessage(409, {
        code: "AUTH_CONSENT_NATIONAL_ID_CONFLICT",
      })
    ).toContain("documento de identidad")
  })

  it("prefers backend message on 422 when present", () => {
    expect(
      getPublicApplyErrorMessage(422, {
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
    const fd = buildPublicApplyFormData("vacancy-123", {
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
    expect(fd.get("vacancyId")).toBe("vacancy-123")
    expect(fd.get("cvFile")).toBe(file)
    const candidate = JSON.parse(String(fd.get("candidate") ?? "{}")) as Record<
      string,
      string
    >
    expect(candidate.firstName).toBe("Ana")
    expect(candidate.lastName).toBe("López")
    expect(candidate.email).toBe("a@b.co")
    expect(candidate.source).toBe("linkedin")
    expect(candidate.notes).toBe("hola")
  })

  it("appends authConsent JSON when provided", () => {
    const file = new File(["%PDF"], "x.pdf", { type: "application/pdf" })
    const authConsent = {
      documentVersion: "v1",
      documentLocale: "es",
      sectionsAccepted: {
        profileUse: true,
        personalData: true,
        confidentiality: true,
        communications: true,
        nonExclusivity: true,
        electronicSignature: true,
        acceptance: true,
      },
      firstNames: "Ana",
      lastNames: "López",
      signature: "Ana López",
      identityDocument: "123",
      phoneCountryIso2: "SV",
      phoneNationalNumber: "77778888",
      clientDeclaredDate: "2026-08-07",
    }
    const fd = buildPublicApplyFormData("vacancy-123", {
      firstName: "Ana",
      lastName: "López",
      email: "a@b.co",
      cvFile: file,
      authConsent,
    })
    expect(JSON.parse(String(fd.get("authConsent") ?? "{}"))).toEqual(authConsent)
  })
})
