"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  Briefcase,
  Building2,
  Code,
  LayoutGrid,
  MapPin,
  Palette,
} from "lucide-react"
import RematchButton from "@/components/rrhh/RematchButton"
import type { VacancyListItem, VacancyListStatusKey } from "@/lib/vacancies/map-vacancy-list-item"

const ICON_BY_KEY = {
  palette: Palette,
  code: Code,
  briefcase: Briefcase,
} as const

const STATUS_LABELS: Record<
  VacancyListStatusKey,
  { label: string; bgClass: string; textClass: string }
> = {
  activa: { label: "Activa", bgClass: "bg-[#DCFCE7]", textClass: "text-[#166534]" },
  cerrada: { label: "Cerrada", bgClass: "bg-muted", textClass: "text-muted-foreground" },
  pausada: { label: "Pausada", bgClass: "bg-amber-100", textClass: "text-amber-800" },
  borrador: { label: "Borrador", bgClass: "bg-slate-100", textClass: "text-slate-700" },
}

interface VacancyMetaItemProps {
  icon: LucideIcon
  value: string
}

function VacancyMetaItem({ icon: Icon, value }: VacancyMetaItemProps) {
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
      <span className="truncate">{value}</span>
    </span>
  )
}

export interface VacancyListCardProps {
  vacancy: VacancyListItem
  onRefresh: () => void
  onSnackbar: (message: string, variant?: "success" | "error") => void
}

export function VacancyListCard({ vacancy, onRefresh, onSnackbar }: VacancyListCardProps) {
  const Icon = ICON_BY_KEY[vacancy.iconKey] ?? Briefcase
  const statusConfig = STATUS_LABELS[vacancy.status] ?? STATUS_LABELS.activa

  return (
    <article
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8"
      aria-label={`Vacante: ${vacancy.title}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-vo-purple/10"
          aria-hidden
        >
          <Icon className="h-6 w-6 text-vo-purple" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="font-sans text-base font-semibold leading-tight text-foreground">
            {vacancy.title || "Sin título"}
          </h3>
          <div className="flex flex-col gap-1.5 font-sans text-[13px] text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-1">
            <VacancyMetaItem icon={Building2} value={vacancy.company} />
            <span className="hidden text-muted-foreground/60 sm:inline" aria-hidden>
              ·
            </span>
            <VacancyMetaItem icon={Briefcase} value={vacancy.modality} />
            <span className="hidden text-muted-foreground/60 sm:inline" aria-hidden>
              ·
            </span>
            <VacancyMetaItem icon={MapPin} value={vacancy.countryLabel} />
            <span className="hidden text-muted-foreground/60 sm:inline" aria-hidden>
              ·
            </span>
            <VacancyMetaItem icon={LayoutGrid} value={vacancy.department} />
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 lg:border-t-0 lg:pt-0">
        <div className="flex items-center justify-between gap-4 sm:justify-start">
          <div className="flex flex-col items-center gap-0.5 px-1">
            <span className="font-sans text-lg font-semibold leading-none text-foreground">
              {vacancy.candidates}
            </span>
            <span className="font-sans text-xs text-muted-foreground">Candidatos</span>
          </div>
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 font-sans text-xs font-medium ${statusConfig.bgClass} ${statusConfig.textClass}`}
          >
            {statusConfig.label}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <RematchButton
            vacancyId={vacancy.id}
            needsRematch={vacancy.needsRematch}
            variant="list"
            onSuccess={onRefresh}
            onSnackbar={onSnackbar}
          />
          <Link
            href={`/portal-rrhh/vacantes/${vacancy.id}`}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-border bg-background px-5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 sm:flex-none sm:px-6"
            aria-label={`Ver detalles de vacante ${vacancy.title}`}
          >
            Ver detalles
          </Link>
        </div>
      </div>
    </article>
  )
}
