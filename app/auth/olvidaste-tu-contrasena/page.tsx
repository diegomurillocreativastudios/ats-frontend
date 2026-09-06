import { getTranslations } from "next-intl/server"
import OlvidasteTuContrasenaContent from "./OlvidasteTuContrasenaContent"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.auth.forgotPassword")

  return {
    title: t("title"),
    description: t("description"),
  }
}

export default function OlvidasteTuContrasenaPage() {
  return <OlvidasteTuContrasenaContent />
}
