"use client"

import type { LucideIcon } from "lucide-react"
import { Briefcase, Building, Building2, MapPin, Scale } from "lucide-react"

import { VacancyLocationLabel } from "@/components/shared/VacancyLocationLabel"

export interface VacancyIdentityLawFact {
  id: string
  displayName: string
  code?: string
  jurisdictionCode?: string
}

interface VacancyIdentityFactsProps {
  companyName?: string
  countryCode?: string | null
  stateCode?: string | null
  emptyLocationLabel: string
  showLocation: boolean
  departmentLabel?: string | null
  modalityLabel?: string | null
  laws?: VacancyIdentityLawFact[]
  lawsLabel?: string
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
  align = "center",
}: {
  icon: LucideIcon
  tone: keyof typeof factIconToneClassName
  align?: "center" | "start"
}) {
  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center ${
        align === "start" ? "mt-0.5 self-start" : ""
      } ${factIconToneClassName[tone]}`}
      aria-hidden
    >
      <Icon className="h-4 w-4" />
    </span>
  )
}

function formatLawLabel(law: VacancyIdentityLawFact): string {
  const name = law.displayName.trim() || law.code?.trim() || ""
  const jurisdiction = law.jurisdictionCode?.trim()
  if (!name) return jurisdiction ?? ""
  if (!jurisdiction) return name
  return `${name} · ${jurisdiction}`
}

/**
 * Compact company, location, department, modality and data-protection law facts for vacancy rails.
 */
export function VacancyIdentityFacts({
  companyName,
  countryCode,
  stateCode,
  emptyLocationLabel,
  showLocation,
  departmentLabel,
  modalityLabel,
  laws = [],
  lawsLabel,
}: VacancyIdentityFactsProps) {
  const hasCompany = Boolean(companyName)
  const hasDepartment = Boolean(departmentLabel)
  const hasModality = Boolean(modalityLabel)
  const visibleLaws = laws.filter((law) => Boolean(formatLawLabel(law)))
  const hasLaws = visibleLaws.length > 0

  if (!hasCompany && !showLocation && !hasDepartment && !hasModality && !hasLaws) {
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
      {hasLaws ? (
        <>
          <FactIcon icon={Scale} tone="cobre" align="start" />
          <div className="min-w-0" aria-label={lawsLabel}>
            {lawsLabel ? (
              <p className="font-medium text-foreground/80">{lawsLabel}</p>
            ) : null}
            <ul className={lawsLabel ? "mt-0.5 flex flex-col gap-0.5" : "flex flex-col gap-0.5"}>
              {visibleLaws.map((law) => (
                <li key={law.id}>{formatLawLabel(law)}</li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  )
}
