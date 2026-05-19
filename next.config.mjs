/** @type {import('next').NextConfig} */
const pdfRouteTraceAssets = [
  "./node_modules/@sparticuz/chromium/**",
  "./public/visible-icon.png",
  "./public/visible-text.png",
]

const nextConfig = {
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

export default nextConfig
