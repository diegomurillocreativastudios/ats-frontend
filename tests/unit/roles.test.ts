import { describe, expect, it } from "vitest"

import {
  canStaffBulkPdfCvUpload,
  isAdminRole,
  isRecruiterRole,
} from "@/lib/roles"

describe("roles", () => {
  it("detecta admin y recruiter", () => {
    expect(isAdminRole("Admin")).toBe(true)
    expect(isRecruiterRole("Recruiter")).toBe(true)
    expect(isRecruiterRole("Human Resources")).toBe(true)
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
})
