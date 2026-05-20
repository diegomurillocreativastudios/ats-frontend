"use client"

import Link from "next/link"
import { ExternalLink } from "lucide-react"
import Modal from "@/components/ui/Modal"
import type { AdminCalendarEvent } from "@/lib/api/admin-interviews-calendar"
import { formatInterviewLocalDateTime } from "@/lib/interview-datetime"
import { InterviewStatusBadge } from "@/components/rrhh/interviews/interview-status-badge"

export interface EventDetailModalProps {
  event: AdminCalendarEvent | null
  isOpen: boolean
  onClose: () => void
}

function formatTimeRange(event: AdminCalendarEvent): string {
  const start = formatInterviewLocalDateTime(event.startUtc)
  const end = formatInterviewLocalDateTime(event.endUtc)
  if (start === "—") return "—"
  if (end === "—" || start === end) return start
  return `${start} – ${end}`
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,7rem)_1fr] gap-2 border-b border-border py-2 last:border-0">
      <dt className="font-sans text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="font-sans text-sm text-foreground">{value}</dd>
    </div>
  )
}

export function EventDetailModal({ event, isOpen, onClose }: EventDetailModalProps) {
  if (!event) return null

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const durationLabel =
    event.durationMinutes != null && event.durationMinutes > 0
      ? `${event.durationMinutes} min`
      : "—"

  const googleCalendarUrl = event.googleCalendarEventId
    ? `https://calendar.google.com/calendar/event?eid=${encodeURIComponent(event.googleCalendarEventId)}`
    : null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalle de entrevista"
      size="lg"
      closeOnOverlayClick
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <Link
            href={`/portal-rrhh/entrevistas/${encodeURIComponent(event.vacancy.id)}`}
            className="font-sans text-sm font-medium text-vo-purple hover:underline"
          >
            Abrir en portal RRHH →
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 font-sans text-sm font-medium hover:bg-muted"
          >
            Cerrar
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-sans text-lg font-semibold text-foreground">
              {event.candidate.name}
            </p>
            {event.candidate.email ? (
              <p className="font-sans text-sm text-muted-foreground">
                {event.candidate.email}
              </p>
            ) : null}
          </div>
          <InterviewStatusBadge
            status={event.status}
            label={event.statusDisplayName}
          />
        </div>

        <dl className="rounded-lg border border-border bg-muted/20 px-3">
          <DetailRow label="Cuándo" value={formatTimeRange(event)} />
          <DetailRow label="Duración" value={durationLabel} />
          <DetailRow label="Zona horaria" value={tz} />
          <DetailRow
            label="Vacante"
            value={`${event.vacancy.title}${event.vacancy.companyName ? ` · ${event.vacancy.companyName}` : ""}`}
          />
          <DetailRow
            label="Reclutador"
            value={
              event.recruiter.email
                ? `${event.recruiter.userName} · ${event.recruiter.email}`
                : event.recruiter.userName
            }
          />
          <DetailRow
            label="Tipo"
            value={event.interviewType?.displayName ?? "—"}
          />
          <DetailRow
            label="Modalidad"
            value={event.interviewModality?.displayName ?? "—"}
          />
          <DetailRow
            label="Entrevistador"
            value={event.interviewerName?.trim() || "—"}
          />
        </dl>

        {(event.googleMeetUrl || googleCalendarUrl) && (
          <div className="flex flex-wrap gap-2">
            {event.googleMeetUrl ? (
              <a
                href={event.googleMeetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 font-sans text-sm font-medium hover:bg-muted"
              >
                Google Meet
                <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            ) : null}
            {googleCalendarUrl ? (
              <a
                href={googleCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 font-sans text-sm font-medium hover:bg-muted"
              >
                Google Calendar
                <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            ) : null}
          </div>
        )}
      </div>
    </Modal>
  )
}
