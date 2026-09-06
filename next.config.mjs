import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin()

/** @type {import('next').NextConfig} */
const pdfRouteTraceAssets = [
  "./node_modules/@sparticuz/chromium/**",
  "./node_modules/jsdom/**",
  "./node_modules/isomorphic-dompurify/**",
  "./public/appli-ai-logo.svg",
]

/** Static defensive headers (FE-SEC-010). CSP is per-request in proxy.ts. */
const staticSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
  {
    key: "Reporting-Endpoints",
    value: 'csp-endpoint="/api/csp-report"',
  },
]

const nextConfig = {
  // Required for Docker / Cloud Run (copies a minimal Node server under .next/standalone)
  output: "standalone",
  // FE-SEC-010: do not advertise the framework stack
  poweredByHeader: false,
  // jsdom/isomorphic-dompurify must stay external: webpack rewrites __dirname and
  // breaks fs.readFileSync(.../browser/default-stylesheet.css) during "Collecting page data".
  serverExternalPackages: [
    "pdfkit",
    "sharp",
    "puppeteer-core",
    "@sparticuz/chromium",
    "isomorphic-dompurify",
    "jsdom",
  ],
  /**
   * @sparticuz/chromium brotli binaries + logos must ship inside the PDF serverless trace on Vercel.
   * Keys are App Router route paths (sin `/route`).
   * jsdom CSS is required at runtime by isomorphic-dompurify (server sanitize).
   */
  outputFileTracingIncludes: {
    "/api/recruiter/vacancies/[vacancyId]/candidates/[candidateProfileId]/technical-sheet/pdf":
      pdfRouteTraceAssets,
    "/api/recruiter/**/technical-sheet/pdf": pdfRouteTraceAssets,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: staticSecurityHeaders,
      },
    ]
  },
}

export default withNextIntl(nextConfig)
