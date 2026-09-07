import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import { AuthSplitShell } from "@/components/auth/AuthSplitShell"
import RestablecerContrasenaContent from "./RestablecerContrasenaContent"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.auth.resetPassword")

  return {
    title: t("title"),
    description: t("description"),
  }
}

export default async function AuthRestablecerContrasenaPage() {
  const t = await getTranslations("Auth")
  return (
    <AuthSplitShell>
      <Suspense
        fallback={<p className="text-sm text-slate-500">{t("loadingFallback")}</p>}
      >
        <RestablecerContrasenaContent />
      </Suspense>
    </AuthSplitShell>
  )
}
