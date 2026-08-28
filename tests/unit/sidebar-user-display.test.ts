import { describe, expect, it } from "vitest"

import {
  formatSidebarDisplayName,
  resolveSidebarRoleLabelKey,
} from "@/lib/sidebar-user-display"

describe("formatSidebarDisplayName", () => {
  it("capitaliza un token en minúsculas", () => {
    expect(formatSidebarDisplayName("admin", "admin@example.com")).toBe("Admin")
  })

  it("conserva nombres propios y correos usados como nombre", () => {
    expect(formatSidebarDisplayName("María Castro", "maria@example.com")).toBe(
      "María Castro",
    )
    expect(formatSidebarDisplayName("jane@example.com", null)).toBe(
      "jane@example.com",
    )
  })

  it("usa el correo si no hay nombre", () => {
    expect(formatSidebarDisplayName("  ", "ada@example.com")).toBe(
      "ada@example.com",
    )
    expect(formatSidebarDisplayName(null, null)).toBeNull()
  })
})

describe("resolveSidebarRoleLabelKey", () => {
  it("mapea admin, recruiter y candidate", () => {
    expect(resolveSidebarRoleLabelKey("Admin")).toBe("roleAdmin")
    expect(resolveSidebarRoleLabelKey("recruiter")).toBe("roleRecruiter")
    expect(resolveSidebarRoleLabelKey("Human Resources")).toBe("roleRecruiter")
    expect(resolveSidebarRoleLabelKey("candidato")).toBe("roleCandidate")
  })

  it("devuelve null si el rol es desconocido", () => {
    expect(resolveSidebarRoleLabelKey("auditor")).toBeNull()
    expect(resolveSidebarRoleLabelKey(undefined)).toBeNull()
  })
})
