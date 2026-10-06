import AuthPoweredBy from "@/components/auth/AuthPoweredBy"
import { NOINDEX_NOFOLLOW } from "@/lib/seo/public-metadata"

export async function generateMetadata() {
  return { robots: NOINDEX_NOFOLLOW }
}

interface AuthLayoutProps {
  children: React.ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <>
      {children}
      <AuthPoweredBy />
    </>
  )
}
