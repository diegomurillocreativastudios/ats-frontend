/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    "pdfkit",
    "puppeteer-core",
    "@sparticuz/chromium-min",
    "puppeteer",
  ],
}

export default nextConfig
