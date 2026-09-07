import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import { AuthSplitShell } from "@/components/auth/AuthSplitShell"
import SsoSuccessContent from "./SsoSuccessContent"

export async function generateMetadata() {
  const t = await getTranslations("Auth.sso")

  return {
    title: t("validating"),
    description: t("errorDescription"),
  }
}

export default function SsoSuccessPage() {
  return (
    <AuthSplitShell>
      <Suspense fallback={<p className="text-sm text-slate-500">…</p>}>
        <SsoSuccessContent />
      </Suspense>
    </AuthSplitShell>
  )
}
