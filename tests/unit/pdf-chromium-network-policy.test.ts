import { afterEach, describe, expect, it, vi } from "vitest"
import {
  isBlockedPdfChromiumHost,
  isPdfChromiumRequestAllowed,
} from "@/lib/technical-sheet/pdf-chromium-network-policy"

describe("isBlockedPdfChromiumHost", () => {
  it("blocks localhost and loopback", () => {
    expect(isBlockedPdfChromiumHost("localhost")).toBe(true)
    expect(isBlockedPdfChromiumHost("127.0.0.1")).toBe(true)
    expect(isBlockedPdfChromiumHost("127.0.0.2")).toBe(true)
    expect(isBlockedPdfChromiumHost("::1")).toBe(true)
  })

  it("blocks RFC1918 and link-local / GCP metadata", () => {
    expect(isBlockedPdfChromiumHost("10.0.0.5")).toBe(true)
    expect(isBlockedPdfChromiumHost("172.16.1.1")).toBe(true)
    expect(isBlockedPdfChromiumHost("172.31.255.1")).toBe(true)
    expect(isBlockedPdfChromiumHost("192.168.1.10")).toBe(true)
    expect(isBlockedPdfChromiumHost("169.254.169.254")).toBe(true)
    expect(isBlockedPdfChromiumHost("metadata.google.internal")).toBe(true)
    expect(isBlockedPdfChromiumHost("instance.metadata.google.internal")).toBe(true)
  })

  it("allows public hostnames", () => {
    expect(isBlockedPdfChromiumHost("example.com")).toBe(false)
    expect(isBlockedPdfChromiumHost("cdn.example.org")).toBe(false)
  })
})

describe("isPdfChromiumRequestAllowed", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("allows data URIs and about:blank", () => {
    expect(isPdfChromiumRequestAllowed("data:image/png;base64,abc")).toBe(true)
    expect(isPdfChromiumRequestAllowed("about:blank")).toBe(true)
    expect(isPdfChromiumRequestAllowed("blob:https://example.com/uuid")).toBe(true)
  })

  it("denies file, ftp and javascript protocols", () => {
    expect(isPdfChromiumRequestAllowed("file:///etc/passwd")).toBe(false)
    expect(isPdfChromiumRequestAllowed("ftp://files.example.com/a")).toBe(false)
    expect(isPdfChromiumRequestAllowed("javascript:alert(1)")).toBe(false)
  })

  it("denies localhost and GCP metadata even over http(s)", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com")
    expect(isPdfChromiumRequestAllowed("http://127.0.0.1/")).toBe(false)
    expect(isPdfChromiumRequestAllowed("http://localhost:3000/logo.svg")).toBe(false)
    expect(
      isPdfChromiumRequestAllowed("http://169.254.169.254/computeMetadata/v1/")
    ).toBe(false)
    expect(
      isPdfChromiumRequestAllowed("http://metadata.google.internal/computeMetadata/v1/")
    ).toBe(false)
    expect(isPdfChromiumRequestAllowed("http://10.0.0.8/secret")).toBe(false)
  })

  it("allows only the configured public app origin", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com")
    expect(isPdfChromiumRequestAllowed("https://app.example.com/Applican_Tree.svg")).toBe(
      true
    )
    expect(isPdfChromiumRequestAllowed("https://evil.example.com/x.png")).toBe(false)
    expect(isPdfChromiumRequestAllowed("http://app.example.com/Applican_Tree.svg")).toBe(
      false
    )
  })

  it("denies all http(s) when no public origin is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "")
    vi.stubEnv("VERCEL_URL", "")
    expect(isPdfChromiumRequestAllowed("https://app.example.com/x.svg")).toBe(false)
  })
})
