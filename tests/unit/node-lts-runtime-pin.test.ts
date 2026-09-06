import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const ROOT = join(__dirname, "../..")

/**
 * FE-SEC-006: keep local/CI/Cloud Run on Node 24 LTS with a digest-pinned image.
 */
describe("FE-SEC-006 Node Long Term Support pins", () => {
  it("restricts package.json engines to the Node 24 major line", () => {
    const packageJson = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8")
    ) as { engines?: { node?: string } }

    expect(packageJson.engines?.node).toBe(">=24 <25")
  })

  it("pins .nvmrc to Node 24", () => {
    const nvmrc = readFileSync(join(ROOT, ".nvmrc"), "utf8").trim()
    expect(nvmrc).toBe("24")
  })

  it("uses digest-pinned node:24-bookworm-slim for Dockerfile base and runner", () => {
    const dockerfile = readFileSync(join(ROOT, "Dockerfile"), "utf8")
    const fromLines = dockerfile
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("FROM ") && !line.startsWith("FROM base"))

    expect(fromLines.length).toBeGreaterThanOrEqual(2)

    const node24DigestFrom =
      /^FROM node:24-bookworm-slim@sha256:[a-f0-9]{64} AS (base|runner)$/

    for (const line of fromLines) {
      expect(line).toMatch(node24DigestFrom)
    }

    expect(fromLines.some((line) => line.endsWith(" AS base"))).toBe(true)
    expect(fromLines.some((line) => line.endsWith(" AS runner"))).toBe(true)
  })
})
