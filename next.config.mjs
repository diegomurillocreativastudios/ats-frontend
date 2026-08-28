import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin()

/** @type {import('next').NextConfig} */
const pdfRouteTraceAssets = [
  "./node_modules/@sparticuz/chromium/**",
  "./node_modules/jsdom/**",
  "./node_modules/isomorphic-dompurify/**",
  "./public/appli-ai-logo.svg",
]

const nextConfig = {
  // Required for Docker / Cloud Run (copies a minimal Node server under .next/standalone)
  output: "standalone",
  // jsdom/isomorphic-dompurify must stay external: webpack rewrites __dirname and
  // breaks fs.readFileSync(.../browser/default-stylesheet.css) during "Collecting page data".
  serverExternalPackages: [
    "pdfkit",
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
}

export default withNextIntl(nextConfig)
