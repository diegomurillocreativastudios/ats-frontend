import AuthPoweredBy from "@/components/auth/AuthPoweredBy"

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
