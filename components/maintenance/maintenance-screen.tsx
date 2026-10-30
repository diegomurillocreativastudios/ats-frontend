import { ApplicanTreeLogo } from "@/components/branding/ApplicanTreeLogo"

export interface MaintenanceScreenProps {
  title: string
  description: string
  loadingLabel: string
}

export function MaintenanceScreen({
  title,
  description,
  loadingLabel,
}: MaintenanceScreenProps) {
  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 py-8 text-center sm:py-10">
        <ApplicanTreeLogo className="h-28 w-auto sm:h-40" />
        {/* Static public SVG. next/image does not change this asset. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/ilustrations/mantenimiento.svg"
          alt=""
          className="mt-10 h-auto max-h-[min(16rem,26vh)] w-full object-contain sm:mt-16"
        />
        <h1 className="mt-10 max-w-xl font-display text-3xl font-extrabold tracking-tight text-balance text-foreground sm:mt-16 sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-md font-serif text-lg font-bold italic leading-snug text-muted-foreground sm:text-xl">
          {description}
        </p>
        <div className="mt-6" role="status">
          <span
            className="inline-block size-6 animate-spin rounded-full border-2 border-ats-terracotta/30 border-t-ats-terracotta motion-reduce:animate-none"
            aria-hidden="true"
          />
          <span className="sr-only">{loadingLabel}</span>
        </div>
      </div>
    </main>
  )
}
