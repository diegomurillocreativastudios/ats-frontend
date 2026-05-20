"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle2,
  Compass,
  MapPin,
  Sparkles,
} from "lucide-react"
import {
  buildOpportunityCompanyLogoDataUri,
  getPublicVacancyDetail,
  type OpportunityVacancyDetail,
} from "@/lib/api/public-vacancies"
import { PublicOpportunitiesNavbar } from "@/components/public/PublicOpportunitiesNavbar"
import { VacancyLocationLabel } from "@/components/shared/VacancyLocationLabel"

const darkPanelClassName =
  "border border-white/10 bg-[linear-gradient(180deg,rgba(35,45,76,0.94)_0%,rgba(19,27,50,0.96)_100%)] shadow-[0_24px_80px_rgba(7,12,27,0.42)] backdrop-blur"

function formatPublishedLabel(publishedAt?: string): string | null {
  if (!publishedAt) return null

  const date = new Date(publishedAt)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat("es-SV", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

function getCompanyInitials(companyName: string): string {
  return companyName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("")
}

function DetailPill({ value }: { value: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/7 px-3 py-1.5 text-xs font-medium text-white/82">
      {value}
    </span>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/10 py-3 last:border-b-0 last:pb-0">
      <dt className="text-sm font-medium text-white/48">{label}</dt>
      <dd className="max-w-[60%] text-right text-sm font-medium text-white">{value}</dd>
    </div>
  )
}

function BulletList({
  title,
  items,
}: {
  title: string
  items: string[]
}) {
  if (!items.length) return null

  return (
    <section className={`rounded-[30px] p-6 sm:p-7 ${darkPanelClassName}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-white/10 bg-white/6 text-[#f0a7ff]">
          <CheckCircle2 className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/46">Bloque clave</p>
          <h2 className="text-2xl font-semibold tracking-tight text-white">{title}</h2>
        </div>
      </div>

      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-3 rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-sm leading-7 text-white/72"
          >
            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#f0a7ff]" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function VacancyDescription({ description }: { description?: string }) {
  const paragraphs = description
    ? description
        .split(/\r?\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
    : []

  return (
    <section className={`rounded-[30px] p-6 sm:p-7 ${darkPanelClassName}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-white/10 bg-white/6 text-[#8dd8ff]">
          <Compass className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/46">Contexto del rol</p>
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Descripción del puesto
          </h2>
        </div>
      </div>

      <div className="mt-5 space-y-4 text-sm leading-8 text-white/72">
        {paragraphs.length ? (
          paragraphs.map((paragraph, index) => (
            <p key={`${index}-${paragraph}`}>{paragraph}</p>
          ))
        ) : (
          <p>No especificado</p>
        )}
      </div>
    </section>
  )
}

function VacancySkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <div className="animate-pulse rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(31,42,71,0.9)_0%,rgba(18,25,44,0.94)_100%)] p-8">
          <div className="h-6 w-32 rounded-full bg-white/10" />
          <div className="mt-5 h-10 w-2/3 rounded-2xl bg-white/10" />
          <div className="mt-4 h-5 w-1/2 rounded-xl bg-white/10" />
          <div className="mt-5 flex gap-2">
            <div className="h-8 w-28 rounded-full bg-white/10" />
            <div className="h-8 w-24 rounded-full bg-white/10" />
            <div className="h-8 w-20 rounded-full bg-white/10" />
          </div>
        </div>
        <div className="animate-pulse rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(31,42,71,0.9)_0%,rgba(18,25,44,0.94)_100%)] p-8">
          <div className="h-6 w-48 rounded-xl bg-white/10" />
          <div className="mt-5 space-y-3">
            <div className="h-4 w-full rounded bg-white/10" />
            <div className="h-4 w-[94%] rounded bg-white/10" />
            <div className="h-4 w-[76%] rounded bg-white/10" />
          </div>
        </div>
      </div>

      <div className="animate-pulse rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(31,42,71,0.9)_0%,rgba(18,25,44,0.94)_100%)] p-8">
        <div className="h-6 w-32 rounded-xl bg-white/10" />
        <div className="mt-5 space-y-4">
          <div className="h-4 w-full rounded bg-white/10" />
          <div className="h-4 w-[85%] rounded bg-white/10" />
          <div className="h-4 w-[72%] rounded bg-white/10" />
        </div>
      </div>
    </div>
  )
}

export function PublicVacancyDetailPage({
  vacancyId,
}: {
  vacancyId: string
}) {
  const searchParams = useSearchParams()
  const [vacancy, setVacancy] = useState<OpportunityVacancyDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const queryString = searchParams.toString()

  const backHref = useMemo(() => {
    return queryString ? `/oportunidades?${queryString}` : "/oportunidades"
  }, [queryString])

  useEffect(() => {
    let isCancelled = false

    const loadVacancy = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const nextVacancy = await getPublicVacancyDetail(vacancyId)

        if (isCancelled) return
        if (!nextVacancy) {
          setVacancy(null)
          setErrorMessage("No encontramos la vacante solicitada.")
          return
        }

        setVacancy(nextVacancy)
      } catch (error) {
        if (isCancelled) return
        const message =
          error instanceof Error && error.message.trim() !== ""
            ? error.message
            : "No se pudo cargar la vacante."
        setVacancy(null)
        setErrorMessage(message)
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadVacancy()

    return () => {
      isCancelled = true
    }
  }, [vacancyId])

  useEffect(() => {
    if (!vacancy?.title) return
    document.title = `ATS | Oportunidades | ${vacancy.title}`
  }, [vacancy?.title])

  const publishedLabel = formatPublishedLabel(vacancy?.publishedAt)
  const companyName = vacancy?.company.name?.trim() ?? ""
  const companyLogoSrc = buildOpportunityCompanyLogoDataUri(vacancy?.company.logo ?? null)
  const companyLogoAlt = companyName ? `Logo de ${companyName}` : "Logo de la empresa"
  const applyHref = queryString
    ? `/oportunidades/${vacancyId}/aplicar?${queryString}`
    : `/oportunidades/${vacancyId}/aplicar`

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b1224] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[420px] bg-[linear-gradient(180deg,#5b2b86_0%,#25365d_38%,#0b1224_100%)]" />
        <div className="absolute left-[-8%] top-6 h-72 w-72 rounded-full bg-[#c73277]/26 blur-3xl" />
        <div className="absolute right-[10%] top-16 h-80 w-80 rounded-full bg-[#71bced]/16 blur-3xl" />
      </div>

      <PublicOpportunitiesNavbar className="mb-5" />

      <div className="relative flex w-full flex-col px-4 pb-6 pt-5 sm:px-6 sm:pt-5 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-5">
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 text-sm font-medium text-white/76 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#161d34]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Volver a oportunidades
            </Link>
          </div>

          {errorMessage ? (
            <div className={`rounded-[30px] p-8 ${darkPanelClassName}`}>
              <p className="text-sm text-[#ffd0e7]" role="alert">
                {errorMessage}
              </p>
              <div className="mt-5">
                <Link
                  href="/oportunidades"
                  className="inline-flex items-center gap-2 text-sm font-medium text-white hover:text-[#ffd0e7]"
                >
                  Ver todas las oportunidades
                </Link>
              </div>
            </div>
          ) : isLoading ? (
            <VacancySkeleton />
          ) : vacancy ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-6">
              <section className={`relative overflow-hidden rounded-[34px] px-6 py-7 sm:px-8 sm:py-8 ${darkPanelClassName}`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(199,50,119,0.35),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(113,188,237,0.16),transparent_24%)]" />

                <div className="relative flex flex-col gap-7">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-4">
                      <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/7 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-white/76">
                        <Sparkles className="h-3.5 w-3.5 text-[#f5b0ff]" aria-hidden />
                        Vacante activa
                      </p>

                      <div className="space-y-3">
                        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
                          {vacancy.title}
                        </h1>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/68">
                          {companyName ? (
                            <span className="inline-flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-[#8dd8ff]" aria-hidden />
                              {companyName}
                            </span>
                          ) : null}
                          <span className="inline-flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-[#f6c482]" aria-hidden />
                            <VacancyLocationLabel
                              countryCode={vacancy.countryCode}
                              stateCode={vacancy.stateCode}
                              emptyLabel="Ubicación no especificada"
                            />
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-[#f5b0ff]" aria-hidden />
                            {vacancy.modality?.displayName ?? "No especificado"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {companyLogoSrc ? (
                      <div
                        className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[24px] border border-white/12 bg-white/8"
                        aria-label={companyLogoAlt}
                      >
                        <img
                          src={companyLogoSrc}
                          alt={companyLogoAlt}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : companyName ? (
                      <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-[24px] border border-white/12 bg-white/8 text-base font-semibold text-white/88 sm:flex">
                        {getCompanyInitials(companyName) || "AT"}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <DetailPill value={vacancy.department?.displayName ?? "No especificado"} />
                    <DetailPill value={vacancy.modality?.displayName ?? "No especificado"} />
                    <DetailPill
                      value={
                        <VacancyLocationLabel
                          countryCode={vacancy.countryCode}
                          stateCode={vacancy.stateCode}
                          emptyLabel="No especificado"
                        />
                      }
                    />
                    {publishedLabel ? <DetailPill value={`Publicada ${publishedLabel}`} /> : null}
                    <Link
                      href={applyHref}
                      className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#18213d] shadow-sm transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#161d34]"
                    >
                      Postularme
                    </Link>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-[24px] border border-white/10 bg-black/10 p-4">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-white/44">Departamento</p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {vacancy.department?.displayName ?? "No especificado"}
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-black/10 p-4">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-white/44">Modalidad</p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {vacancy.modality?.displayName ?? "No especificado"}
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-black/10 p-4">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-white/44">Ubicación</p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        <VacancyLocationLabel
                          countryCode={vacancy.countryCode}
                          stateCode={vacancy.stateCode}
                          emptyLabel="No especificado"
                        />
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <VacancyDescription description={vacancy.description} />

              <BulletList title="Responsabilidades" items={vacancy.responsibilities ?? []} />
              <BulletList title="Requisitos" items={vacancy.requirements ?? []} />
              <BulletList title="Beneficios" items={vacancy.benefits ?? []} />
            </div>

              <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
                <section className={`rounded-[30px] p-6 ${darkPanelClassName}`}>
                  <h2 className="text-xl font-semibold text-white">Detalles de la vacante</h2>

                  <dl className="mt-4">
                    {companyName ? (
                      <DetailRow
                        label="Empresa"
                        value={
                          <span className="inline-flex items-center justify-end gap-2">
                            {companyLogoSrc ? (
                              <span
                                className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/6"
                                aria-hidden
                              >
                                <img
                                  src={companyLogoSrc}
                                  alt=""
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                />
                              </span>
                            ) : null}
                            <span className="truncate">{companyName}</span>
                          </span>
                        }
                      />
                    ) : null}
                    <DetailRow
                      label="Departamento"
                      value={vacancy.department?.displayName ?? "No especificado"}
                    />
                    <DetailRow
                      label="Modalidad"
                      value={vacancy.modality?.displayName ?? "No especificado"}
                    />
                    <DetailRow
                      label="Ubicación"
                      value={
                        <VacancyLocationLabel
                          countryCode={vacancy.countryCode}
                          stateCode={vacancy.stateCode}
                          emptyLabel="No especificado"
                        />
                      }
                    />
                    {publishedLabel ? (
                      <DetailRow label="Publicación" value={publishedLabel} />
                    ) : null}
                  </dl>

                  <div className="mt-6">
                    <Link
                      href={applyHref}
                      className="inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-medium text-[#18213d] transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#161d34]"
                    >
                      Postularme
                    </Link>
                  </div>
                </section>
              </aside>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
