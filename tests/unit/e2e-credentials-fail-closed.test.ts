import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const ROOT = join(__dirname, "../..")

/**
 * FE-SEC-008: no demo admin/admin defaults; CI must fail closed without secrets.
 */
describe("FE-SEC-008 E2E credentials fail-closed", () => {
  it("login page does not special-case admin/admin password length", () => {
    const loginPage = readFileSync(
      join(ROOT, "app/auth/iniciar-sesion/page.tsx"),
      "utf8"
    )
    expect(loginPage).not.toMatch(/isAdminDemo/)
    expect(loginPage).not.toMatch(
      /rawLogin\.toLowerCase\(\)\s*===\s*["']admin["']/
    )
  })

  it("e2e auth helper has no admin/admin credential defaults", () => {
    const authHelper = readFileSync(
      join(ROOT, "tests/e2e/helpers/auth.ts"),
      "utf8"
    )
    expect(authHelper).not.toMatch(/\|\|\s*["']admin["']/)
    expect(authHelper).not.toMatch(/\?\?\s*["']admin["']/)
  })

  it("e2e global-setup has no admin/admin credential defaults", () => {
    const globalSetup = readFileSync(
      join(ROOT, "tests/e2e/global-setup.ts"),
      "utf8"
    )
    expect(globalSetup).not.toMatch(/\|\|\s*["']admin["']/)
    expect(globalSetup).not.toMatch(/\?\?\s*["']admin["']/)
    expect(globalSetup).toMatch(/process\.env\.CI/)
  })

  it("e2e workflow has no Render URL or admin credential fallbacks", () => {
    const workflow = readFileSync(
      join(ROOT, ".github/workflows/e2e.yml"),
      "utf8"
    )
    expect(workflow).not.toMatch(/backend-7eop\.onrender\.com/)
    expect(workflow).not.toMatch(/onrender\.com/)
    expect(workflow).not.toMatch(/\|\|\s*['"]admin['"]/)
    expect(workflow).toMatch(/Require E2E secrets and API URL/)
    expect(workflow).toMatch(/vars\.E2E_API_URL/)
    expect(workflow).toMatch(/secrets\.E2E_DEMO_EMAIL/)
    expect(workflow).toMatch(/secrets\.E2E_DEMO_PASSWORD/)
  })
})
