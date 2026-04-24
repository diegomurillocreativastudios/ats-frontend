import Image from "next/image"
import Link from "next/link"

interface PublicOpportunitiesNavbarProps {
  className?: string
}

export function PublicOpportunitiesNavbar({
  className = "",
}: PublicOpportunitiesNavbarProps) {
  return (
    <nav
      className={`relative w-full overflow-hidden rounded-none border-0 border-b border-white/10 bg-[linear-gradient(180deg,rgba(35,45,76,0.94)_0%,rgba(19,27,50,0.96)_100%)] px-4 py-3 shadow-[0_12px_40px_rgba(7,12,27,0.22)] backdrop-blur sm:px-6 lg:px-8 ${className}`}
      aria-label="Navegacion principal de oportunidades"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(255,255,255,0.12),transparent_22%),radial-gradient(circle_at_right,rgba(199,50,119,0.18),transparent_26%)]" />

      <div className="relative flex items-center">
        <Link
          href="/oportunidades"
          className="inline-flex items-center gap-3 rounded-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1e2744]"
          aria-label="Ir al portal de oportunidades"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/10 bg-white/95 shadow-[0_10px_30px_rgba(255,255,255,0.08)]">
            <Image
              src="/logo-icon-only.webp"
              alt="Logo icono ATS"
              width={42}
              height={31}
              className="h-auto w-[34px] object-contain"
              priority
            />
          </span>

          <span className="flex min-w-0 flex-col">
            <Image
              src="/logo-text.png"
              alt="ATS"
              width={735}
              height={201}
              className="h-auto w-[122px] object-contain brightness-0 invert sm:w-[142px]"
              priority
            />
            <span className="mt-1 text-[11px] uppercase tracking-[0.24em] text-white/52">
              Portal de oportunidades
            </span>
          </span>
        </Link>
      </div>
    </nav>
  )
}
