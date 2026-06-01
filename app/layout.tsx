import { Montserrat } from "next/font/google";
import "./globals.css";
import PageTitle from "@/components/PageTitle";

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
});

export const metadata = {
  title: { default: "ATS", template: "ATS | %s" },
  description: "Portal del candidato - Resumen de tu proceso de selección",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className="antialiased">
        <PageTitle />
        {children}
      </body>
    </html>
  );
}