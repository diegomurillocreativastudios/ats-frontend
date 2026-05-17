import { afterEach, describe, expect, it } from "vitest"
import {
  getChromiumExecutablePathTimeoutMs,
  resolveChromiumPackUrl,
} from "@/lib/pdf/launch-pdf-browser"

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

  it("prefers NEXT_PUBLIC_APP_URL over VERCEL_URL", () => {
    delete process.env.CHROMIUM_PACK_URL
    process.env.NEXT_PUBLIC_APP_URL = "https://prod.example.com"
    process.env.VERCEL_URL = "preview-abc.vercel.app"
    expect(resolveChromiumPackUrl()).toBe("https://prod.example.com/chromium-pack.tar")
  })

  it("falls back to VERCEL_URL when app URL is missing", () => {
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

describe("getChromiumExecutablePathTimeoutMs", () => {
  const env = process.env

  afterEach(() => {
    process.env = { ...env }
    delete process.env.CHROMIUM_EXECUTABLE_PATH_TIMEOUT_MS
    delete process.env.VERCEL
  })

  it("uses 120s on Vercel by default", () => {
    process.env.VERCEL = "1"
    expect(getChromiumExecutablePathTimeoutMs()).toBe(120_000)
  })

  it("respects CHROMIUM_EXECUTABLE_PATH_TIMEOUT_MS", () => {
    process.env.CHROMIUM_EXECUTABLE_PATH_TIMEOUT_MS = "90000"
    expect(getChromiumExecutablePathTimeoutMs()).toBe(90_000)
  })
})
