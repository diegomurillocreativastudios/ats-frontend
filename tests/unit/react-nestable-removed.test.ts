import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const ROOT = join(__dirname, "../..")

/**
 * FE-SEC-017: react-nestable pulled React 15/18 into a React 19 app; it must stay gone.
 */
describe("FE-SEC-017 react-nestable removal", () => {
  it("does not list react-nestable in package.json dependencies", () => {
    const packageJson = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8")
    ) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }

    expect(packageJson.dependencies?.["react-nestable"]).toBeUndefined()
    expect(packageJson.devDependencies?.["react-nestable"]).toBeUndefined()
  })

  it("does not keep react-nestable or its nested React 15/18 packages in the lockfile", () => {
    const lockfile = readFileSync(join(ROOT, "package-lock.json"), "utf8")

    expect(lockfile).not.toMatch(/"node_modules\/react-nestable"/)
    expect(lockfile).not.toMatch(/"node_modules\/react-nestable\/node_modules\/react"/)
    expect(lockfile).not.toMatch(
      /"node_modules\/react-nestable\/node_modules\/react-dom"/
    )
    expect(lockfile).not.toMatch(/"node_modules\/react-addons-shallow-compare"/)
    expect(lockfile).not.toMatch(/"node_modules\/react-addons-update"/)
  })

  it("depends on @dnd-kit/sortable for the stages list", () => {
    const packageJson = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8")
    ) as { dependencies?: Record<string, string> }

    expect(packageJson.dependencies?.["@dnd-kit/core"]).toBeTruthy()
    expect(packageJson.dependencies?.["@dnd-kit/sortable"]).toBeTruthy()
    expect(packageJson.dependencies?.["@dnd-kit/utilities"]).toBeTruthy()
  })
})
