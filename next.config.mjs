/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["pdfkit", "puppeteer-core", "@sparticuz/chromium"],
  /**
   * @sparticuz/chromium loads brotli binaries from `node_modules/.../bin` at runtime.
   * Ensures those files are copied into the serverless trace for this route (Webpack
   * build runs the include pass; `next build --webpack` is set in package.json for Vercel).
   */
  outputFileTracingIncludes: {
    "/api/recruiter/**/technical-sheet/pdf": [
      "./node_modules/@sparticuz/chromium/**/*",
    ],
  },
}

export default nextConfig
