import { describe, expect, it } from "vitest"

import {
  recruiterDisplayName,
  recruiterOptionLabel,
} from "@/components/rrhh/interviews/interviewer-recruiter-select"
import type { AdminUserListItem } from "@/lib/api/admin-users"

function recruiter(
  overrides: Partial<AdminUserListItem> = {},
): AdminUserListItem {
  return {
    id: "user-1",
    email: "diego@creativastudios.us",
    userName: "diego@creativastudios.us",
    emailConfirmed: true,
    lockoutActive: false,
    roles: ["Recruiter"],
    ...overrides,
  }
}

describe("recruiterDisplayName", () => {
  it("usa la parte local del correo como nombre", () => {
    expect(recruiterDisplayName("diego@creativastudios.us")).toBe("Diego")
    expect(recruiterDisplayName("diegocorrea7@gmail.com")).toBe("Diegocorrea7")
  })

  it("capitaliza un userName corto que no es correo", () => {
    expect(recruiterDisplayName("admin")).toBe("Admin")
  })

  it("conserva un nombre propio con espacios", () => {
    expect(recruiterDisplayName("María Castro")).toBe("María Castro")
  })

  it("separa puntos y guiones del handle", () => {
    expect(recruiterDisplayName("diego.murillo@example.com")).toBe(
      "Diego Murillo",
    )
  })
})

describe("recruiterOptionLabel", () => {
  it("no muestra el correo cuando userName es el email", () => {
    expect(recruiterOptionLabel(recruiter())).toBe("Diego")
  })

  it("usa el userName distinto del correo", () => {
    expect(
      recruiterOptionLabel(
        recruiter({ userName: "admin", email: "admin@example.com" }),
      ),
    ).toBe("Admin")
  })

  it("cae al correo si no hay userName", () => {
    expect(recruiterOptionLabel(recruiter({ userName: "" }))).toBe("Diego")
  })
})
