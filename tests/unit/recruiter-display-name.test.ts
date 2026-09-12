import { describe, expect, it } from "vitest"
import {
  RECRUITER_PROFILE_BACKEND_MESSAGES,
  buildRecruiterProfilePatchBody,
  parseRecruiterProfilePatchBody,
  resolveRecruiterProfileName,
  validateRecruiterDisplayName,
} from "@/lib/rrhh/recruiter-display-name"

describe("validateRecruiterDisplayName", () => {
  it("rechaza vacío o solo espacios", () => {
    expect(validateRecruiterDisplayName("")).toBe("required")
    expect(validateRecruiterDisplayName("   ")).toBe("required")
  })

  it("rechaza un solo carácter", () => {
    expect(validateRecruiterDisplayName("A")).toBe("tooShort")
  })

  it("rechaza más de 80 caracteres", () => {
    expect(validateRecruiterDisplayName("A".repeat(81))).toBe("tooLong")
  })

  it("rechaza saltos de línea y caracteres de control", () => {
    expect(validateRecruiterDisplayName("Diego\nMurillo")).toBe("invalid")
    expect(validateRecruiterDisplayName("Diego\tMurillo")).toBe("invalid")
  })

  it("acepta un nombre visible válido", () => {
    expect(validateRecruiterDisplayName("Diego Murillo")).toBeNull()
  })
})

describe("resolveRecruiterProfileName", () => {
  it("prefiere name sobre userName", () => {
    expect(
      resolveRecruiterProfileName({
        name: "Diego Murillo",
        userName: "diego@example.com",
        email: "diego@example.com",
      })
    ).toBe("Diego Murillo")
  })

  it("usa la parte local si name es el correo", () => {
    expect(
      resolveRecruiterProfileName({
        name: "diego@example.com",
        userName: "diego@example.com",
        email: "diego@example.com",
      })
    ).toBe("diego")
  })
})

describe("parseRecruiterProfilePatchBody", () => {
  it("acepta userName y name iguales tras trim", () => {
    expect(
      parseRecruiterProfilePatchBody({
        userName: "  Ana  ",
        name: "Ana",
        email: "ana@example.com",
      })
    ).toEqual({ ok: true, userName: "Ana" })
  })

  it("rechaza campos distintos", () => {
    expect(
      parseRecruiterProfilePatchBody({ userName: "Ana", name: "Diego" })
    ).toEqual({
      ok: false,
      message: RECRUITER_PROFILE_BACKEND_MESSAGES.mismatch,
    })
  })
})

describe("buildRecruiterProfilePatchBody", () => {
  it("manda ambos campos recortados e idénticos", () => {
    expect(buildRecruiterProfilePatchBody("  Diego Murillo  ")).toEqual({
      userName: "Diego Murillo",
      name: "Diego Murillo",
    })
  })
})
