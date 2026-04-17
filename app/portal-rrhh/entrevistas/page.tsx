"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Briefcase, Calendar, Loader2, MapPin, Users } from "lucide-react"
import RRHHSidebar from "@/components/rrhh/RRHHSidebar"
import RRHHTopbar from "@/components/rrhh/RRHHTopbar"
import { apiClient } from "@/lib/api"
import { getApiErrorMessage } from "@/lib/api-error"
import { formatCountryCodeLabel } from "@/lib/profile-form-options"

interface VacancyRow {
  id: string
  title: string
  countryLabel: string
  statusKey: keyof typeof STATUS_LABELS
  candidatesAmount: number
  createdAtLabel: string | null
}

const mapStatusKey = (item: Record<string, unknown>) => {
  const raw = String(item?.status ?? item?.state ?? "open").toLowerCase().trim()
  if (
    raw === "open" ||
    raw === "active" ||
    raw === "activa" ||
    raw.includes("abierta")
  ) {
    return "activa" as const
  }
  if (raw === "closed" || raw === "cerrada" || raw.includes("cerrad")) {
    return "cerrada" as const
  }
  if (raw === "draft" || raw === "borrador") {
    return "borrador" as const
  }
  if (raw === "paused" || raw === "pausada" || raw.includes("paus")) {
    return "pausada" as const
  }
  return "activa" as const
}

const formatCreatedAtLabel = (iso: unknown): string | null => {
  if (iso == null || typeof iso !== "string") return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(d)
}

const STATUS_LABELS = {
  activa: {
    label: "Activa",
    bgClass: "bg-[#DCFCE7]",
    textClass: "text-[#166534]",
  },
  cerrada: {
    label: "Cerrada",
    bgClass: "bg-muted",
    textClass: "text-muted-foreground",
  },
  pausada: {
    label: "Pausada",
    bgClass: "bg-amber-100",
    textClass: "text-amber-800",
  },
  borrador: {
    label: "Borrador",
    bgClass: "bg-slate-100",
    textClass: "text-slate-700",
  },
}

export default function EntrevistasHubPage() {
  const [vacancies, setVacancies] = useState<VacancyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.get("/api/recruiter/vacancies")
      const list = Array.isArray(data)
        ? data
        : (data as { vacancies?: unknown })?.vacancies ??
          (data as { items?: unknown })?.items ??
          (data as { data?: unknown })?.data ??
          []
      if (!Array.isArray(list)) {
        setVacancies([])
        return
      }
      const mapped: VacancyRow[] = list.map((item: Record<string, unknown>, i: number) => {
        const id = String(item?.id ?? item?.uuid ?? i)
        const title = String(item?.title ?? item?.name ?? "—")
        const ccRaw = item?.countryCode ?? item?.country_code
        const countryCode =
          ccRaw != null && String(ccRaw).trim() !== ""
            ? String(ccRaw).trim().toUpperCase()
            : null
        const candidatesRaw =
          item?.candidatesAmount ??
          item?.candidates ??
          item?.candidates_count ??
          item?.applicants_count
        const candidatesAmount =
          typeof candidatesRaw === "number" && !Number.isNaN(candidatesRaw)
            ? candidatesRaw
            : Number.parseInt(String(candidatesRaw ?? "0"), 10) || 0
        return {
          id,
          title,
          countryLabel: formatCountryCodeLabel(countryCode),
          statusKey: mapStatusKey(item),
          candidatesAmount,
          createdAtLabel: formatCreatedAtLabel(
            item?.createdAt ?? item?.created_at
          ),
        }
      })
      setVacancies(mapped)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err) || "No se pudieron cargar las vacantes.")
      setVacancies([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const mainContent = (
    <div className="min-w-0 flex flex-col">
      <section
        className="flex flex-col gap-4 border-b border-border px-4 py-5 md:px-8"
        aria-label="Encabezado de entrevistas"
      >
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-inter text-2xl font-bold text-foreground">
            Entrevistas
          </h1>
          <p className="font-inter text-sm text-muted-foreground">
            Elige una vacante para ver y gestionar sus entrevistas.
          </p>
        </div>
      </section>
      <section className="flex flex-col gap-4 p-4 md:p-8" aria-label="Vacantes">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16">
            <Loader2
              className="h-8 w-8 animate-spin text-vo-purple"
              aria-hidden
            />
            <p className="font-inter text-sm text-muted-foreground">
              Cargando vacantes…
            </p>
          </div>
        ) : error ? (
          <p className="font-inter text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : vacancies.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground" aria-hidden />
            <p className="font-inter text-sm text-muted-foreground">
              No hay vacantes. Crea una vacante primero para agendar entrevistas.
            </p>
            <Link
              href="/portal-rrhh/vacantes"
              className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-inter text-sm font-medium text-white hover:bg-vo-purple-hover"
            >
              Ir a vacantes
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3" role="list">
            {vacancies.map((v) => {
              const statusCfg =
                STATUS_LABELS[v.statusKey] ?? STATUS_LABELS.activa
              return (
                <li key={v.id}>
                  <article className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-vo-purple/10"
                        aria-hidden
                      >
                        <Briefcase className="h-5 w-5 text-vo-purple" />
                      </div>
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2 gap-y-1">
                          <h2 className="font-inter text-base font-semibold text-foreground">
                            {v.title}
                          </h2>
                          <span
                            className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 font-inter text-xs font-medium ${statusCfg.bgClass} ${statusCfg.textClass}`}
                          >
                            {statusCfg.label}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 font-inter text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin
                              className="h-3.5 w-3.5 shrink-0 opacity-80"
                              aria-hidden
                            />
                            {v.countryLabel}
                          </span>
                          <span className="hidden sm:inline" aria-hidden>
                            ·
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Users
                              className="h-3.5 w-3.5 shrink-0 opacity-80"
                              aria-hidden
                            />
                            {v.candidatesAmount}{" "}
                            {v.candidatesAmount === 1
                              ? "candidato"
                              : "candidatos"}
                          </span>
                          {v.createdAtLabel ? (
                            <>
                              <span className="hidden sm:inline" aria-hidden>
                                ·
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <Calendar
                                  className="h-3.5 w-3.5 shrink-0 opacity-80"
                                  aria-hidden
                                />
                                {v.createdAtLabel}
                              </span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <Link
                      href={`/portal-rrhh/entrevistas/${encodeURIComponent(v.id)}`}
                      className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 sm:w-auto"
                      aria-label={`Ver entrevistas de la vacante ${v.title}`}
                    >
                      <Calendar className="h-4 w-4 shrink-0" aria-hidden />
                      Ver entrevistas
                    </Link>
                  </article>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )

  return (
    <div className="h-screen overflow-hidden bg-background font-sans text-foreground">
      <div className="hidden h-full lg:flex">
        <RRHHSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <RRHHTopbar variant="desktop" breadcrumbLabel="Entrevistas" />
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            {mainContent}
          </main>
        </div>
      </div>
      <div className="flex h-full min-w-0 flex-col overflow-hidden lg:hidden">
        <RRHHTopbar variant="tablet" breadcrumbLabel="Entrevistas" />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          {mainContent}
        </main>
      </div>
    </div>
  )
}
