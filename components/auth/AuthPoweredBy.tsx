"use client"

import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"

export default function AuthPoweredBy() {
  const pathname = usePathname()
  const t = useTranslations("Auth")

  if (pathname?.startsWith("/auth/") && pathname !== "/auth/iniciar-sesion-neo") {
    return null
  }

  return (
    <p
      className="fixed bottom-4 left-0 right-0 z-40 px-4 text-center text-xs text-muted-foreground md:left-auto md:right-0 md:w-[448px] lg:w-[560px]"
      data-testid="auth-powered-by"
    >
      {t.rich("poweredBy", {
        link: (chunks) => (
          <a
            href="https://creativastudios.us/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 transition-colors hover:text-foreground"
          >
            {chunks}
          </a>
        ),
      })}
    </p>
  )
}
