import { getTranslations } from "next-intl/server"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.auth.register")
  return {
    title: t("title"),
  }
}

export default function AuthRegistrarseLayout({ children }) {
  return children
}
