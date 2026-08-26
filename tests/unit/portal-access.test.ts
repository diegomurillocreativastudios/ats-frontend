import { describe, expect, it } from "vitest"

import {
  getAccessiblePortalKeys,
  PORTAL_HOME_HREF,
  PORTAL_SELECTION_PATH,
  resolvePostAuthPath,
  resolveSolePortalHref,
} from "@/lib/portal-access"

describe("getAccessiblePortalKeys", () => {
  it("da al admin las cuatro vistas", () => {
    expect(getAccessiblePortalKeys("Admin")).toEqual([
      "candidate",
      "opportunities",
      "rrhh",
      "admin",
    ])
  })

  it("da al reclutador oportunidades y RRHH", () => {
    expect(getAccessiblePortalKeys("Recruiter")).toEqual([
      "opportunities",
      "rrhh",
    ])
    expect(getAccessiblePortalKeys("Human Resources")).toEqual([
      "opportunities",
      "rrhh",
    ])
  })

  it("da al candidato solo su portal", () => {
    expect(getAccessiblePortalKeys("Candidate")).toEqual(["candidate"])
    expect(getAccessiblePortalKeys("candidato")).toEqual(["candidate"])
  })

  it("sin rol clasificado ofrece las tres vistas no admin", () => {
    expect(getAccessiblePortalKeys(null)).toEqual([
      "candidate",
      "opportunities",
      "rrhh",
    ])
  })
})

describe("resolveSolePortalHref", () => {
  it("redirige al candidato a su único portal", () => {
    expect(resolveSolePortalHref("candidate")).toBe(PORTAL_HOME_HREF.candidate)
  })

  it("no fuerza destino si hay dos o más vistas", () => {
    expect(resolveSolePortalHref("recruiter")).toBeNull()
    expect(resolveSolePortalHref("admin")).toBeNull()
    expect(resolveSolePortalHref(null)).toBeNull()
  })
})

describe("resolvePostAuthPath", () => {
  it("manda al candidato directo a su portal", () => {
    expect(resolvePostAuthPath("Candidate")).toBe("/portal-candidato")
  })

  it("manda a staff a la selección de portal", () => {
    expect(resolvePostAuthPath("recruiter")).toBe(PORTAL_SELECTION_PATH)
    expect(resolvePostAuthPath("admin")).toBe(PORTAL_SELECTION_PATH)
  })
})
