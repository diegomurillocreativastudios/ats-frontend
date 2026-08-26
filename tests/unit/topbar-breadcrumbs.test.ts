import { describe, expect, it } from "vitest"

import { buildTopbarTrail, formatTopbarTrailText } from "@/lib/topbar-breadcrumbs"

describe("buildTopbarTrail", () => {
  it("antepone el portal y evita duplicarlo si ya viene en el trail", () => {
    const crumbs = buildTopbarTrail(
      "Portal RRHH",
      "/portal-rrhh/candidatos",
      [
        { label: "Portal RRHH", href: "/portal-rrhh/entrevistas" },
        { label: "Configuración" },
      ],
      "Dashboard",
    )

    expect(crumbs).toEqual([
      { label: "Portal RRHH", href: "/portal-rrhh/candidatos" },
      { label: "Configuración" },
    ])
  })

  it("conserva segmentos intermedios cuando no hay duplicado", () => {
    const crumbs = buildTopbarTrail(
      "Portal RRHH",
      "/portal-rrhh/candidatos",
      [
        { label: "Candidatos", href: "/portal-rrhh/candidatos" },
        { label: "Ada Lovelace" },
      ],
      "Candidato",
    )

    expect(crumbs.map((crumb) => crumb.label)).toEqual([
      "Portal RRHH",
      "Candidatos",
      "Ada Lovelace",
    ])
  })

  it("usa el fallback si no hay trail", () => {
    const crumbs = buildTopbarTrail(
      "Portal RRHH",
      "/portal-rrhh/candidatos",
      null,
      "Candidatos",
    )

    expect(formatTopbarTrailText(crumbs)).toBe("Portal RRHH > Candidatos")
  })
})
