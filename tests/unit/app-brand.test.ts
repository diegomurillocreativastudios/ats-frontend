import { afterEach, describe, expect, it, vi } from "vitest"

import { getCompanyName } from "@/lib/app-brand"

describe("getCompanyName", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("usa NEXT_PUBLIC_COMPANY_NAME cuando está definida", () => {
    vi.stubEnv("NEXT_PUBLIC_COMPANY_NAME", "Creativa Studios LLC")
    expect(getCompanyName()).toBe("Creativa Studios LLC")
  })

  it("recorta espacios alrededor del valor", () => {
    vi.stubEnv("NEXT_PUBLIC_COMPANY_NAME", "  Acme Corp  ")
    expect(getCompanyName()).toBe("Acme Corp")
  })

  it("cae a Applican Tree si la variable está vacía", () => {
    vi.stubEnv("NEXT_PUBLIC_COMPANY_NAME", "   ")
    expect(getCompanyName()).toBe("Applican Tree")
  })
})
