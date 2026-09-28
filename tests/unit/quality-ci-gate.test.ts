import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const ROOT = join(__dirname, "../..")
const QUALITY_WORKFLOW = join(ROOT, ".github/workflows/quality.yml")

/**
 * FE-SEC-022: lint and unit tests must be GitHub Actions merge gates.
 */
describe("FE-SEC-022 quality CI gate", () => {
  it("declares a quality workflow that runs lint and unit tests", () => {
    const yaml = readFileSync(QUALITY_WORKFLOW, "utf8")
    expect(yaml).toMatch(/name:\s*Quality/)
    expect(yaml).toMatch(/npm run lint/)
    expect(yaml).toMatch(/npm test/)
    expect(yaml).not.toMatch(/continue-on-error:\s*true/)
  })

  it("keeps global-error.tsx as a generic boundary without raw error.message", () => {
    const source = readFileSync(join(ROOT, "app/global-error.tsx"), "utf8")
    expect(source).toMatch(/Algo salió mal/)
    expect(source).not.toMatch(/error\.message/)
  })
})
