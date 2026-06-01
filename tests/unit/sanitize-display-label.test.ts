import { describe, expect, it } from "vitest"
import { sanitizeLocationDisplayLabel } from "@/lib/locations/sanitize-display-label"

describe("sanitizeLocationDisplayLabel", () => {
  it("removes Departamento de prefix", () => {
    expect(sanitizeLocationDisplayLabel("Departamento de Boyacá")).toBe("Boyacá")
  })

  it("removes Estado de prefix", () => {
    expect(sanitizeLocationDisplayLabel("Estado de Jalisco")).toBe("Jalisco")
  })

  it("leaves short names unchanged", () => {
    expect(sanitizeLocationDisplayLabel("México")).toBe("México")
  })
})
