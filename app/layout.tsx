import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import PageTitle from "@/components/PageTitle";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: { default: "ATS", template: "ATS | %s" },
  description: "Portal del candidato - Resumen de tu proceso de selección",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${spaceGrotesk.variable} antialiased`}>
        <PageTitle />
        {children}
      </body>
    </html>
  );
}