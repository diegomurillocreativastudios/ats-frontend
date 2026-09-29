"use client"

import Image from "next/image"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { ArrowRight } from "lucide-react"
const unavailableIllustrationSrc = "/ilustrations/undraw_searching_pqji.svg"

export function PublicVacancyUnavailable({ href }: { href: string }) {
  const t = useTranslations("PublicOpportunities.unavailable")

  return (
    <section
      aria-labelledby="vacancy-unavailable-title"
      className="mx-auto flex min-h-[calc(100dvh-13rem)] w-full max-w-md flex-col items-center justify-center py-6 text-center sm:max-w-xl md:max-w-2xl md:py-10 lg:max-w-3xl lg:py-14 2xl:max-w-4xl 2xl:py-20"
    >
      <Image
        src={unavailableIllustrationSrc}
        alt=""
        aria-hidden
        width={619}
        height={800}
        priority
        className="h-56 w-auto max-w-full object-contain md:h-72 2xl:h-80"
      />
      <h1
        id="vacancy-unavailable-title"
        className="mt-8 text-[1.75rem] font-semibold leading-tight tracking-tight text-balance text-foreground md:mt-10 md:text-4xl 2xl:text-5xl"
      >
        {t("title")}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-pretty text-muted-foreground md:mt-5 md:text-lg md:leading-8 2xl:text-xl 2xl:leading-9">
        {t("body")}
      </p>
      <Link
        href={href}
        className="mt-10 inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-full bg-ats-terracotta px-6 py-4 text-base font-medium text-white transition-transform duration-200 hover:-translate-y-0.5 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-ats-cobre focus:ring-offset-2 focus:ring-offset-background motion-reduce:transition-none motion-reduce:hover:translate-y-0 md:w-auto md:max-w-none md:px-8 2xl:text-lg"
      >
        {t("cta")}
        <ArrowRight className="h-5 w-5" aria-hidden />
      </Link>
    </section>
  )
}
