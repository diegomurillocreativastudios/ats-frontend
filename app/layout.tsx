import { Inter, Manrope, Fraunces } from "next/font/google"
import { connection } from "next/server"
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getMessages, getTranslations } from "next-intl/server"
import { APP_NAME } from "@/lib/app-brand"
import "./globals.css"
import PageTitle from "@/components/PageTitle"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
})

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: "700",
  style: "italic",
  display: "swap",
  variable: "--font-fraunces",
})

export async function generateMetadata() {
  const t = await getTranslations("Metadata.root")
  return {
    title: { default: APP_NAME, template: `${APP_NAME} | %s` },
    description: t("description"),
  }
}

export default async function RootLayout({ children }) {
  // FE-SEC-010: nonce-based Content Security Policy requires dynamic rendering
  await connection()

  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} className={`${inter.variable} ${manrope.variable} ${fraunces.variable}`}>
      <body className="font-sans antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <PageTitle />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}