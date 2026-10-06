import type { Metadata } from "next"
import { Inter, Manrope, Fraunces } from "next/font/google"
import { connection } from "next/server"
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getMessages, getTranslations } from "next-intl/server"
import { APP_NAME } from "@/lib/app-brand"
import {
  DEFAULT_SOCIAL_IMAGE,
  readGoogleSiteVerification,
  readMetadataBase,
} from "@/lib/seo/site-origin"
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata.root")
  const description = t("description")
  const metadataBase = readMetadataBase()
  const google = readGoogleSiteVerification()

  return {
    ...(metadataBase ? { metadataBase } : {}),
    title: { default: APP_NAME, template: `${APP_NAME} | %s` },
    description,
    openGraph: {
      type: "website",
      siteName: APP_NAME,
      locale: "es",
      title: APP_NAME,
      description,
      images: [
        {
          url: DEFAULT_SOCIAL_IMAGE.url,
          width: DEFAULT_SOCIAL_IMAGE.width,
          height: DEFAULT_SOCIAL_IMAGE.height,
          alt: APP_NAME,
        },
      ],
    },
    twitter: {
      card: "summary",
      title: APP_NAME,
      description,
      images: [DEFAULT_SOCIAL_IMAGE.url],
    },
    icons: {
      icon: [{ url: DEFAULT_SOCIAL_IMAGE.url, type: "image/png" }],
      apple: [{ url: DEFAULT_SOCIAL_IMAGE.url }],
    },
    ...(google ? { verification: { google } } : {}),
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