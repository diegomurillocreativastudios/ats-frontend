import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"
import { proxy } from "../../proxy"

const ROOT = join(__dirname, "../..")

/**
 * FE-SEC-023: drop unused Chromium pack and the 64 KiB header raise.
 * Keep vercel.json — Vercel and Cloud Run are both live deploy targets.
 */
describe("FE-SEC-023 legacy artifacts", () => {
  it("does not ship or generate a public chromium-pack.tar", () => {
    expect(existsSync(join(ROOT, "public/chromium-pack.tar"))).toBe(false)
    expect(existsSync(join(ROOT, "scripts/create-chromium-pack.mjs"))).toBe(false)

    const publicPaths = readFileSync(join(ROOT, "lib/auth/public-paths.ts"), "utf8")
    expect(publicPaths).not.toMatch(/chromium-pack/i)

    const proxySource = readFileSync(join(ROOT, "proxy.ts"), "utf8")
    expect(proxySource).not.toMatch(/\|tar\)/)
  })

  it("returns 404 for /chromium-pack.tar", () => {
    const response = proxy(
      new NextRequest("https://dev-applicantree-ats.vercel.app/chromium-pack.tar")
    )
    expect(response.status).toBe(404)
  })

  it("keeps Node default HTTP header size (no 64 KiB raise)", () => {
    const packageJson = readFileSync(join(ROOT, "package.json"), "utf8")
    const dockerfile = readFileSync(join(ROOT, "Dockerfile"), "utf8")

    expect(packageJson).not.toMatch(/max-http-header-size/)
    expect(dockerfile).not.toMatch(/max-http-header-size/)
    expect(dockerfile).not.toMatch(/SKIP_CHROMIUM_PACK/)
    expect(dockerfile).not.toMatch(/65536/)
  })

  it("keeps vercel.json for the dual Vercel + Cloud Run PDF deploy", () => {
    const vercel = JSON.parse(
      readFileSync(join(ROOT, "vercel.json"), "utf8")
    ) as {
      functions?: Record<string, { memory?: number; maxDuration?: number }>
    }

    const pdfRoutes = Object.entries(vercel.functions ?? {}).filter(([path]) =>
      path.includes("/pdf/")
    )
    expect(pdfRoutes.length).toBeGreaterThan(0)
    for (const [, config] of pdfRoutes) {
      expect(config.memory).toBeGreaterThanOrEqual(2048)
      expect(config.maxDuration).toBeGreaterThan(0)
    }
  })
})
