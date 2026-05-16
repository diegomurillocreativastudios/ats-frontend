import { afterEach, describe, expect, it, vi } from "vitest"
import { resolveChromiumPackUrl } from "@/lib/pdf/launch-pdf-browser"

describe("resolveChromiumPackUrl", () => {
  const env = process.env

  afterEach(() => {
    process.env = { ...env }
  })

  it("prefers CHROMIUM_PACK_URL when set", () => {
    process.env.CHROMIUM_PACK_URL = "https://cdn.example.com/chromium-pack.tar"
    delete process.env.VERCEL_URL
    delete process.env.NEXT_PUBLIC_APP_URL
    expect(resolveChromiumPackUrl()).toBe("https://cdn.example.com/chromium-pack.tar")
  })

  it("falls back to VERCEL_URL", () => {
    delete process.env.CHROMIUM_PACK_URL
    process.env.VERCEL_URL = "my-app.vercel.app"
    delete process.env.NEXT_PUBLIC_APP_URL
    expect(resolveChromiumPackUrl()).toBe("https://my-app.vercel.app/chromium-pack.tar")
  })

  it("throws when no URL is available", () => {
    delete process.env.CHROMIUM_PACK_URL
    delete process.env.VERCEL_URL
    delete process.env.NEXT_PUBLIC_APP_URL
    expect(() => resolveChromiumPackUrl()).toThrow(/CHROMIUM_PACK_URL/)
  })
})
