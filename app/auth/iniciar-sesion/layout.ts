import { getTranslations } from "next-intl/server"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.auth.login")
  return {
    title: t("title"),
  }
}

export default function AuthIniciarSesionLayout({ children }) {
  return children
}
