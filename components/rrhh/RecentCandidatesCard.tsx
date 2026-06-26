"use client"

import { useTranslations } from "next-intl"

const RECENT_CANDIDATES = [
  { initials: "MC", name: "María Castro", role: "Diseñador UX/UI Senior", badge: "Entrevista", badgeClass: "bg-[#DBEAFE] text-[#1E40AF]" },
  { initials: "JP", name: "Juan Pérez", role: "Frontend Developer", badge: "Evaluación", badgeClass: "bg-[#FEF3C7] text-[#92400E]" },
  { initials: "AL", name: "Ana López", role: "Product Manager", badge: "Contratado", badgeClass: "bg-[#DCFCE7] text-[#166534]" },
]

export default function RecentCandidatesCard() {
  const t = useTranslations("RecruiterPortal.dashboard")

  return (
    <div
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6"
      aria-label={t("recentCandidatesAria")}
    >
      <div className="flex items-center justify-between">
        <h2 className="font-sans text-base font-semibold text-foreground">
          {t("recentCandidatesTitle")}
        </h2>
        <span className="rounded-xl bg-[#DBEAFE] px-2.5 py-1 font-sans text-xs font-medium text-[#1E40AF]">
          {t("newCandidatesBadge", { count: 15 })}
        </span>
      </div>
      <ul className="flex flex-col gap-3">
        {RECENT_CANDIDATES.map((candidate) => (
          <li key={candidate.name}>
            <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-vo-purple font-sans text-sm font-semibold text-white"
                aria-hidden
              >
                {candidate.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-sans text-sm font-semibold text-foreground">
                  {candidate.name}
                </p>
                <p className="font-sans text-xs text-muted-foreground">
                  {candidate.role}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-xl px-2.5 py-1 font-sans text-xs font-medium ${candidate.badgeClass}`}
              >
                {candidate.badge}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
