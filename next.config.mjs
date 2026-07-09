import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin()

/** @type {import('next').NextConfig} */
const pdfRouteTraceAssets = [
  "./node_modules/@sparticuz/chromium/**",
  "./public/appli-ai-logo.svg",
]

const nextConfig = {
  // Required for Docker / Cloud Run (copies a minimal Node server under .next/standalone)
  output: "standalone",
  serverExternalPackages: ["pdfkit", "puppeteer-core", "@sparticuz/chromium"],
  /**
   * @sparticuz/chromium brotli binaries + logos must ship inside the PDF serverless trace on Vercel.
   * Keys are App Router route paths (sin `/route`).
   */
  outputFileTracingIncludes: {
    "/api/recruiter/vacancies/[vacancyId]/candidates/[candidateProfileId]/technical-sheet/pdf":
      pdfRouteTraceAssets,
    "/api/recruiter/**/technical-sheet/pdf": pdfRouteTraceAssets,
  },
}

export default withNextIntl(nextConfig)
