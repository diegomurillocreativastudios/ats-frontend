/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["pdfkit", "puppeteer-core", "@sparticuz/chromium-min"],
}

export default nextConfig
