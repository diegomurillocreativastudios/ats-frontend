import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import SsoSuccessContent from "./SsoSuccessContent"

export async function generateMetadata() {
  const t = await getTranslations("Auth.sso")

  return {
    title: t("validating"),
    description: t("errorDescription"),
  }
}

function SsoSuccessFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <p className="text-sm text-muted-foreground">…</p>
    </div>
  )
}

export default function SsoSuccessPage() {
  return (
    <Suspense fallback={<SsoSuccessFallback />}>
      <SsoSuccessContent />
    </Suspense>
  )
}
