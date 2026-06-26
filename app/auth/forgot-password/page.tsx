import { getTranslations } from "next-intl/server"
import ForgotPasswordContent from "./ForgotPasswordContent"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.auth.forgotPassword")

  return {
    title: t("title"),
    description: t("description"),
  }
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordContent />
}
