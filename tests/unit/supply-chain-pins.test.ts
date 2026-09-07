import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const ROOT = join(__dirname, "../..")
const WORKFLOWS_DIR = join(ROOT, ".github/workflows")
const CLOUDBUILD_PATH = join(ROOT, "cloudbuild.yaml")

const FULL_SHA = "[a-f0-9]{40}"
const DIGEST = "sha256:[a-f0-9]{64}"

/**
 * FE-SEC-017: GitHub Actions must pin `uses:` to a full commit SHA (not a mutable tag).
 */
function collectUsesLines(workflowYaml: string): string[] {
  return workflowYaml
    .split("\n")
    .map((line) => line.trim().replace(/^-\s+/, ""))
    .filter((line) => line.startsWith("uses:"))
}

/**
 * FE-SEC-017: Cloud Build step images must be digest-pinned; :latest must not deploy.
 */
describe("FE-SEC-017 supply chain pins", () => {
  it("pins every GitHub Actions uses: reference to a full commit SHA", () => {
    const workflowFiles = readdirSync(WORKFLOWS_DIR).filter((name) =>
      /\.ya?ml$/i.test(name)
    )
    expect(workflowFiles.length).toBeGreaterThan(0)

    const pinnedUses =
      new RegExp(`^uses:\\s+[^\\s@]+@${FULL_SHA}(\\s+#.+)?$`)

    for (const file of workflowFiles) {
      const content = readFileSync(join(WORKFLOWS_DIR, file), "utf8")
      const usesLines = collectUsesLines(content)
      expect(usesLines.length, `${file} should declare uses:`).toBeGreaterThan(
        0
      )

      for (const line of usesLines) {
        expect(
          line,
          `${file}: expected SHA-pinned uses, got "${line}"`
        ).toMatch(pinnedUses)
        expect(
          line,
          `${file}: mutable tag refs are not allowed (${line})`
        ).not.toMatch(/@[vV]?\d+(\.\d+)*(\s|$)/)
      }
    }
  })

  it("pins Cloud Build step images by digest and omits :latest deploy tags", () => {
    const cloudbuild = readFileSync(CLOUDBUILD_PATH, "utf8")

    const nameLines = cloudbuild
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("- name:") || line.startsWith("name:"))

    const stepImageLines = nameLines.filter((line) =>
      /gcr\.io\//.test(line)
    )
    expect(stepImageLines.length).toBeGreaterThanOrEqual(2)

    const digestPinnedName = new RegExp(
      `^- name:\\s+[^\\s@]+@${DIGEST}$`
    )

    for (const line of stepImageLines) {
      expect(
        line,
        `Cloud Build step must be digest-pinned: ${line}`
      ).toMatch(digestPinnedName)
    }

    expect(cloudbuild).toMatch(/requestedVerifyOption:\s*VERIFIED/)
    expect(cloudbuild).not.toMatch(/:latest(\s|$)/)
    expect(cloudbuild).not.toMatch(/--all-tags/)
  })

  it("declares a supply-chain workflow that generates a CycloneDX SBOM", () => {
    const supplyChain = readFileSync(
      join(WORKFLOWS_DIR, "supply-chain.yml"),
      "utf8"
    )
    expect(supplyChain).toMatch(/npm sbom/)
    expect(supplyChain).toMatch(/cyclonedx/i)
    expect(supplyChain).toMatch(/actions\/attest-sbom@/)
  })
})
