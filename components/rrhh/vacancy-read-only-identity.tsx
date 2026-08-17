"use client"

import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import { VacancyLocationLabel } from "@/components/shared/VacancyLocationLabel"

interface VacancyReadOnlyIdentityProps {
  title: string
  companyName: string
  department: string
  modality: string
  countryCode?: string | null
  stateCode?: string | null
  createdAtLabel: string
  statusLabel: string
  statusClassName: string
  titleClassName: string
}

function IdentityFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="font-sans text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-sans text-sm text-foreground">{children}</dd>
    </div>
  )
}

/**
 * Read-only vacancy heading: title, status, company, and labeled facts.
 */
export function VacancyReadOnlyIdentity({
  title,
  companyName,
  department,
  modality,
  countryCode,
  stateCode,
  createdAtLabel,
  statusLabel,
  statusClassName,
  titleClassName,
}: VacancyReadOnlyIdentityProps) {
  const t = useTranslations("RecruiterPortal.vacancies.detail.headerMeta")

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className={`min-w-0 font-sans font-bold text-foreground ${titleClassName}`}>
            {title}
          </h1>
          <span
            className={`inline-flex w-fit shrink-0 rounded-xl px-2.5 py-1 font-sans text-xs font-medium ${statusClassName}`}
          >
            {statusLabel}
          </span>
        </div>
        <p className="font-sans text-sm font-medium text-foreground">{companyName}</p>
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
        <IdentityFact label={t("department")}>{department}</IdentityFact>
        <IdentityFact label={t("modality")}>{modality}</IdentityFact>
        <IdentityFact label={t("location")}>
          <VacancyLocationLabel countryCode={countryCode} stateCode={stateCode} />
        </IdentityFact>
      </dl>
      <p className="font-sans text-xs text-muted-foreground">{createdAtLabel}</p>
    </div>
  )
}
