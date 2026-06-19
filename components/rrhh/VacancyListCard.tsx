"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
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
import { VacancyLocationLabel } from "@/components/shared/VacancyLocationLabel"
import type { VacancyListItem, VacancyListStatusKey } from "@/lib/vacancies/map-vacancy-list-item"
import { getVacancyStatusLabel } from "@/lib/vacancies/vacancy-status-labels"
import { VACANCY_STATUS_STYLES } from "@/lib/vacancies/vacancy-status-styles"

const ICON_BY_KEY = {
  palette: Palette,
  code: Code,
  briefcase: Briefcase,
} as const

// Etapa 10: el styling por estado se mantiene acoplado al enum frontend estable
// (`activa | cerrada | pausada | borrador`); el label visible se traduce vía
// `getVacancyStatusLabel`, con fallback al valor crudo si el código es desconocido.
const STATUS_STYLES: Record<
  VacancyListStatusKey,
  { bgClass: string; textClass: string }
> = {
  activa: VACANCY_STATUS_STYLES.activa,
  cerrada: VACANCY_STATUS_STYLES.cerrada,
  pausada: VACANCY_STATUS_STYLES.pausada,
  borrador: VACANCY_STATUS_STYLES.borrador,
}

interface VacancyMetaItemProps {
  icon: LucideIcon
  value: string
  muted?: boolean
}

function VacancyMetaItem({ icon: Icon, value, muted = false }: VacancyMetaItemProps) {
  return (
    <span
      className={`inline-flex min-w-0 max-w-full items-center gap-1.5 ${muted ? "text-slate-500" : ""}`}
    >
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
  const t = useTranslations("RecruiterPortal.vacancies")
  const Icon = ICON_BY_KEY[vacancy.iconKey] ?? Briefcase
  const statusStyle = STATUS_STYLES[vacancy.status] ?? STATUS_STYLES.activa
  const statusLabel = getVacancyStatusLabel(vacancy.status, t)
  const isReadOnly = !vacancy.isActive

  return (
    <article
      className={
        isReadOnly
          ? "relative flex flex-col gap-4 overflow-hidden rounded-xl border border-dashed border-slate-200 bg-slate-50/95 p-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8"
          : "flex flex-col gap-4 rounded-xl border border-border bg-card p-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8"
      }
      aria-label={
        isReadOnly
          ? t("cards.cardReadOnlyAria", { title: vacancy.title })
          : t("cards.cardAria", { title: vacancy.title })
      }
      data-read-only={isReadOnly ? "true" : undefined}
    >
      {isReadOnly ? (
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-slate-100/50"
          aria-hidden
        />
      ) : null}

      <div className="relative flex min-w-0 flex-1 items-center gap-4">
        {vacancy.logoSrc ? (
          <div
            className={
              isReadOnly
                ? "flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-slate-200 bg-background"
                : "flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-border bg-background"
            }
          >
            <img
              src={vacancy.logoSrc}
              alt={t("cards.logoAlt", { company: vacancy.company })}
              className={
                isReadOnly
                  ? "h-full w-full object-contain opacity-70"
                  : "h-full w-full object-contain"
              }
              loading="lazy"
            />
          </div>
        ) : (
          <div
            className={
              isReadOnly
                ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-slate-100"
                : "flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-vo-purple/10"
            }
            aria-hidden
          >
            <Icon className={isReadOnly ? "h-6 w-6 text-slate-400" : "h-6 w-6 text-vo-purple"} />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <h3
            className={
              isReadOnly
                ? "font-sans text-base font-semibold leading-tight text-slate-600"
                : "font-sans text-base font-semibold leading-tight text-foreground"
            }
          >
            {vacancy.title || t("cards.untitled")}
          </h3>
          <div
            className={`flex flex-col gap-1.5 font-sans text-[13px] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-1 ${isReadOnly ? "text-slate-500" : "text-muted-foreground"}`}
          >
            <VacancyMetaItem icon={Building2} value={vacancy.company} muted={isReadOnly} />
            <span className="hidden text-muted-foreground/60 sm:inline" aria-hidden>
              ·
            </span>
            <VacancyMetaItem icon={Briefcase} value={vacancy.modality} muted={isReadOnly} />
            <span className="hidden text-muted-foreground/60 sm:inline" aria-hidden>
              ·
            </span>
            <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
              <VacancyLocationLabel
                countryCode={vacancy.countryCode}
                stateCode={vacancy.stateCode}
                className="truncate"
              />
            </span>
            <span className="hidden text-muted-foreground/60 sm:inline" aria-hidden>
              ·
            </span>
            <VacancyMetaItem icon={LayoutGrid} value={vacancy.department} muted={isReadOnly} />
          </div>
        </div>
      </div>

      <div className="relative flex shrink-0 flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 lg:border-t-0 lg:pt-0">
        <div className="flex items-center justify-between gap-4 sm:justify-start">
          <div className="flex flex-col items-center gap-0.5 px-1">
            <span
              className={
                isReadOnly
                  ? "font-sans text-lg font-semibold leading-none text-slate-500"
                  : "font-sans text-lg font-semibold leading-none text-foreground"
              }
            >
              {vacancy.candidates}
            </span>
            <span className="font-sans text-xs text-muted-foreground">{t("cards.candidates")}</span>
          </div>
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 font-sans text-xs font-medium ${
              isReadOnly ? "bg-slate-100 text-slate-500" : `${statusStyle.bgClass} ${statusStyle.textClass}`
            }`}
          >
            {statusLabel}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!isReadOnly ? (
            <RematchButton
              vacancyId={vacancy.id}
              needsRematch={vacancy.needsRematch}
              variant="list"
              onSuccess={onRefresh}
              onSnackbar={onSnackbar}
            />
          ) : null}
          <Link
            href={`/portal-rrhh/vacantes/${vacancy.id}`}
            className={
              isReadOnly
                ? "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-slate-200 bg-background/90 px-5 font-sans text-sm font-medium text-slate-600 transition-colors hover:bg-background focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 sm:flex-none sm:px-6"
                : "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-border bg-background px-5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 sm:flex-none sm:px-6"
            }
            aria-label={t("actions.viewDetailsAria", { title: vacancy.title })}
          >
            {t("actions.viewDetails")}
          </Link>
        </div>
      </div>
    </article>
  )
}
