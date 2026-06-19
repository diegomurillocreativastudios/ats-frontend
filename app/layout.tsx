import { Montserrat } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { APP_NAME } from "@/lib/app-brand";
import "./globals.css";
import PageTitle from "@/components/PageTitle";

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
});

export async function generateMetadata() {
  const t = await getTranslations("Metadata.root");
  return {
    title: { default: APP_NAME, template: `${APP_NAME} | %s` },
    description: t("description"),
  };
}

export default async function RootLayout({ children }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={montserrat.variable}>
      <body className="antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <PageTitle />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}