import { describe, expect, it } from "vitest"

import {
  canChangePortal,
  canStaffBulkPdfCvUpload,
  isAdminRole,
  isCandidateRole,
  isRecruiterRole,
} from "@/lib/roles"

describe("roles", () => {
  it("detecta admin y recruiter", () => {
    expect(isAdminRole("Admin")).toBe(true)
    expect(isRecruiterRole("Recruiter")).toBe(true)
    expect(isRecruiterRole("Human Resources")).toBe(true)
    expect(isCandidateRole("Candidate")).toBe(true)
    expect(isCandidateRole("candidato")).toBe(true)
    expect(isCandidateRole("admin")).toBe(false)
  })

  it("habilita CV múltiple PDF en portal RRHH o roles staff", () => {
    expect(canStaffBulkPdfCvUpload({ variant: "recruiter" })).toBe(true)
    expect(canStaffBulkPdfCvUpload({ variant: "self", role: "admin" })).toBe(
      true,
    )
    expect(
      canStaffBulkPdfCvUpload({ variant: "self", role: "recruiter" }),
    ).toBe(true)
    expect(
      canStaffBulkPdfCvUpload({ variant: "self", role: "candidate" }),
    ).toBe(false)
  })

  it("permite cambiar de portal solo a Admin o Recruiter con sesión", () => {
    expect(canChangePortal(null)).toBe(false)
    expect(canChangePortal(undefined)).toBe(false)
    expect(canChangePortal("Candidate")).toBe(false)
    expect(canChangePortal("Admin")).toBe(true)
    expect(canChangePortal("Recruiter")).toBe(true)
    expect(canChangePortal("Human Resources")).toBe(true)
  })
})
