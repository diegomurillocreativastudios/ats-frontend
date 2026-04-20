"use client"

import { useMemo } from "react"
import type { LucideIcon } from "lucide-react"
import {
  Calendar,
  CalendarClock,
  ExternalLink,
  History,
  Loader2,
  UserRound,
} from "lucide-react"
import CandidateSidebar from "@/components/candidato/CandidateSidebar"
import CandidateTopbar from "@/components/candidato/CandidateTopbar"
import { InterviewStatusBadge } from "@/components/rrhh/interviews/interview-status-badge"
import { useCandidateSelfInterviews } from "@/hooks/useCandidateSelfInterviews"
import type { Interview } from "@/lib/api/interviews"
import { formatInterviewLocalDateTime } from "@/lib/interview-datetime"

function partitionByUpcoming(list: Interview[]) {
  const now = Date.now()
  const upcoming: Interview[] = []
  const history: Interview[] = []
  for (const row of list) {
    const t = new Date(row.scheduledAtUtc).getTime()
    const isFutureOrNow =
      !Number.isNaN(t) && t >= now && row.status === "Scheduled"
    if (isFutureOrNow) upcoming.push(row)
    else history.push(row)
  }
  upcoming.sort(
    (a, b) =>
      new Date(a.scheduledAtUtc).getTime() -
      new Date(b.scheduledAtUtc).getTime()
  )
  history.sort(
    (a, b) =>
      new Date(b.scheduledAtUtc).getTime() -
      new Date(a.scheduledAtUtc).getTime()
  )
  return { upcoming, history }
}

function vacancyLabel(row: Interview) {
  const title = row.jobTitle?.trim()
  if (title) return title
  if (row.vacancyId) return `Vacante · ${row.vacancyId.slice(0, 8)}…`
  return "Proceso de selección"
}

function formatDuration(minutes: number | null) {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0)
    return null
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h} h ${m} min` : `${h} h`
}

function InterviewCandidateCard({ row }: { row: Interview }) {
  const typeLine =
    row.interviewTypeLabel?.trim() ||
    row.interviewType?.trim() ||
    "Entrevista"
  const durationLine = formatDuration(row.durationMinutes)

  return (
    <article
      className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-5"
      aria-label={`Entrevista: ${vacancyLabel(row)}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-inter text-base font-semibold text-foreground md:text-lg">
              {vacancyLabel(row)}
            </h2>
            <InterviewStatusBadge
              status={row.status}
              label={row.statusDisplayName}
            />
          </div>
          <div className="flex flex-col gap-1.5 font-inter text-sm text-muted-foreground">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <CalendarClock
                className="h-4 w-4 shrink-0 text-vo-purple"
                aria-hidden
              />
              <span className="text-foreground">
                {formatInterviewLocalDateTime(row.scheduledAtUtc)}
              </span>
              {durationLine ? (
                <span className="text-muted-foreground">· {durationLine}</span>
              ) : null}
            </p>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Calendar className="h-4 w-4 shrink-0" aria-hidden />
              <span>{typeLine}</span>
            </p>
            {row.interviewerName?.trim() ? (
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <UserRound className="h-4 w-4 shrink-0" aria-hidden />
                <span>
                  Contacto:{" "}
                  <span className="font-medium text-foreground">
                    {row.interviewerName.trim()}
                  </span>
                </span>
              </p>
            ) : null}
            {row.googleMeetUrl?.trim() ? (
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
                <a
                  href={row.googleMeetUrl.trim()}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-medium text-vo-purple hover:underline"
                >
                  Unirse a Google Meet
                </a>
              </p>
            ) : null}
          </div>
        </div>
      </div>
      {row.notes?.trim() ? (
        <div className="mt-4 rounded-lg border border-border/80 bg-muted/40 px-3 py-2.5">
          <p className="font-inter text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Indicaciones
          </p>
          <p className="mt-1 whitespace-pre-wrap font-inter text-sm text-foreground">
            {row.notes.trim()}
          </p>
        </div>
      ) : null}
    </article>
  )
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="mb-4 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-vo-purple" aria-hidden />
        <h2 className="font-inter text-lg font-semibold text-foreground">
          {title}
        </h2>
      </div>
      <p className="font-inter text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

export default function CandidateInterviewsContent() {
  const { items, loading, error } = useCandidateSelfInterviews()
  const { upcoming, history } = useMemo(
    () => partitionByUpcoming(items),
    [items]
  )

  const mainSections = (
    <>
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 font-inter text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16"
          aria-busy="true"
        >
          <Loader2
            className="h-8 w-8 animate-spin text-vo-purple"
            aria-hidden
          />
          <p className="font-inter text-sm text-muted-foreground">
            Cargando tus entrevistas…
          </p>
        </div>
      ) : !error && items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground" aria-hidden />
          <p className="max-w-md font-inter text-sm text-muted-foreground">
            Todavía no hay entrevistas agendadas para tu perfil. Cuando RRHH
            programe una cita, la verás aquí con fecha, modalidad e indicaciones.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          <section aria-label="Entrevistas próximas">
            <SectionTitle
              icon={CalendarClock}
              title="Próximas entrevistas"
              description="Confirmá fecha y hora; si algo cambia, el equipo de selección te contactará."
            />
            {upcoming.length === 0 ? (
              <p className="rounded-lg border border-border bg-muted/30 px-4 py-6 text-center font-inter text-sm text-muted-foreground">
                No tenés entrevistas programadas en este momento.
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {upcoming.map((row) => (
                  <li key={row.id}>
                    <InterviewCandidateCard row={row} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Historial de entrevistas">
            <SectionTitle
              icon={History}
              title="Historial"
              description="Entrevistas ya realizadas, canceladas o reprogramadas."
            />
            {history.length === 0 ? (
              <p className="rounded-lg border border-border bg-muted/30 px-4 py-6 text-center font-inter text-sm text-muted-foreground">
                Sin entrevistas anteriores registradas.
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {history.map((row) => (
                  <li key={row.id}>
                    <InterviewCandidateCard row={row} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  )

  return (
    <div className="h-screen overflow-hidden bg-background font-sans text-foreground">
      <div className="hidden h-full lg:flex">
        <CandidateSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <CandidateTopbar variant="desktop" breadcrumbLabel="Entrevistas" />
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            <div className="min-w-0 flex flex-col gap-8 p-8">
              <section aria-label="Título de sección">
                <h1 className="font-inter text-[28px] font-bold text-foreground">
                  Tus entrevistas
                </h1>
                <p className="mt-2 max-w-2xl font-inter text-base text-muted-foreground">
                  Vista pensada para vos: próximas citas, datos del contacto y
                  el detalle que comparte la empresa, sin pasos de edición.
                </p>
              </section>
              {mainSections}
            </div>
          </main>
        </div>
      </div>

      <div className="flex h-full min-w-0 flex-col overflow-hidden lg:hidden">
        <CandidateTopbar variant="tablet" breadcrumbLabel="Entrevistas" />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="min-w-0 flex flex-col gap-5 p-4 md:gap-6 md:p-6">
            <section aria-label="Título de sección">
              <h1 className="font-inter text-xl font-bold text-foreground md:text-2xl">
                Tus entrevistas
              </h1>
              <p className="mt-1 font-inter text-[13px] text-muted-foreground md:text-sm">
                Próximas citas e historial de tu proceso.
              </p>
            </section>
            {mainSections}
          </div>
        </main>
      </div>
    </div>
  )
}
