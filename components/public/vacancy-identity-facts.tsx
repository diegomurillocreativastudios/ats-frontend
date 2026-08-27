"use client"

import type { LucideIcon } from "lucide-react"
import { Briefcase, Building, Building2, MapPin } from "lucide-react"

import { VacancyLocationLabel } from "@/components/shared/VacancyLocationLabel"

interface VacancyIdentityFactsProps {
  companyName?: string
  countryCode?: string | null
  stateCode?: string | null
  emptyLocationLabel: string
  showLocation: boolean
  departmentLabel?: string | null
  modalityLabel?: string | null
}

const factsClassName =
  "grid grid-cols-[1rem_minmax(0,1fr)] items-center gap-x-1.5 gap-y-1.5 text-sm leading-5 text-muted-foreground"

const factIconToneClassName = {
  terracotta: "text-ats-terracotta",
  cobre: "text-ats-cobre",
} as const

function FactIcon({
  icon: Icon,
  tone,
}: {
  icon: LucideIcon
  tone: keyof typeof factIconToneClassName
}) {
  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center ${factIconToneClassName[tone]}`}
      aria-hidden
    >
      <Icon className="h-4 w-4" />
    </span>
  )
}

/**
 * Compact company, location, department and modality facts for vacancy rails.
 */
export function VacancyIdentityFacts({
  companyName,
  countryCode,
  stateCode,
  emptyLocationLabel,
  showLocation,
  departmentLabel,
  modalityLabel,
}: VacancyIdentityFactsProps) {
  const hasCompany = Boolean(companyName)
  const hasDepartment = Boolean(departmentLabel)
  const hasModality = Boolean(modalityLabel)

  if (!hasCompany && !showLocation && !hasDepartment && !hasModality) {
    return null
  }

  return (
    <div className={factsClassName}>
      {hasCompany ? (
        <>
          <FactIcon icon={Building2} tone="terracotta" />
          <p className="min-w-0">{companyName}</p>
        </>
      ) : null}
      {showLocation ? (
        <>
          <FactIcon icon={MapPin} tone="terracotta" />
          <p className="min-w-0">
            <VacancyLocationLabel
              countryCode={countryCode}
              stateCode={stateCode}
              emptyLabel={emptyLocationLabel}
            />
          </p>
        </>
      ) : null}
      {hasDepartment ? (
        <>
          <FactIcon icon={Building} tone="terracotta" />
          <p className="min-w-0">{departmentLabel}</p>
        </>
      ) : null}
      {hasModality ? (
        <>
          <FactIcon icon={Briefcase} tone="cobre" />
          <p className="min-w-0">{modalityLabel}</p>
        </>
      ) : null}
    </div>
  )
}
