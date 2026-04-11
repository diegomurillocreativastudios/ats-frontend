"use client";

import Link from "next/link";
import { ClipboardList, Calendar } from "lucide-react";
import type { CandidatePortalActivity } from "@/lib/candidate-dashboard";

function getActivityIcon(kind: string) {
  if (kind === "interview") return Calendar;
  return ClipboardList;
}

function getActivityIconStyles(kind: string) {
  if (kind === "interview")
    return { iconBg: "bg-[#DCFCE7]", iconColor: "text-success" as const };
  return { iconBg: "bg-[#DBEAFE]", iconColor: "text-vo-navy" as const };
}

function activityStatusClass(tone: string) {
  if (tone === "confirmed") return "bg-[#DBEAFE] text-blue-900";
  if (tone === "neutral") return "bg-muted text-foreground";
  return "bg-[#FEF3C7] text-amber-800";
}

function shortenDetailForCompact(detail: string) {
  const part = detail.split("•")[0]?.trim() ?? detail;
  return part.length > 28 ? `${part.slice(0, 25)}…` : part;
}

export default function NextActivitiesCard({
  compact = false,
  activities = [],
  loading = false,
}: {
  compact?: boolean;
  activities: CandidatePortalActivity[];
  loading?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 md:p-5 lg:p-6">
      <div className="mb-4 flex items-center justify-between md:mb-4 lg:mb-4">
        <h2 className="font-inter text-base font-semibold text-foreground md:text-base lg:text-lg">
          Próximas Actividades
        </h2>
        <Link
          href="/portal-candidato/evaluaciones"
          className="font-inter text-xs font-medium text-vo-purple hover:underline md:text-sm"
        >
          Ver todas
        </Link>
      </div>
      {loading ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex animate-pulse items-center gap-3 rounded-lg bg-muted p-3 md:gap-3 md:p-3"
            >
              <div className="h-8 w-8 shrink-0 rounded-md bg-border md:h-9 md:w-9" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3.5 w-3/4 rounded bg-border" />
                <div className="h-3 w-1/2 rounded bg-border" />
              </div>
              <div className="h-6 w-16 shrink-0 rounded-xl bg-border" />
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <p className="font-inter text-sm text-muted-foreground">
          No hay actividades próximas registradas. Cuando tengas evaluaciones o
          citas, aparecerán aquí.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {activities.map((act) => {
            const Icon = getActivityIcon(act.kind);
            const styles = getActivityIconStyles(act.kind);
            const detail = compact
              ? shortenDetailForCompact(act.detailLine)
              : act.detailLine;
            const title = compact
              ? act.title.length > 42
                ? `${act.title.slice(0, 39)}…`
                : act.title
              : act.title;
            return (
              <div
                key={act.id}
                className="flex items-center gap-3 rounded-lg bg-muted p-3 md:gap-3 md:p-3"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md md:h-9 md:w-9 ${styles.iconBg}`}
                >
                  <Icon
                    className={`h-4 w-4 md:h-[18px] md:w-[18px] ${styles.iconColor}`}
                    aria-hidden
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`font-inter font-medium text-foreground ${
                      compact ? "text-xs" : "text-sm md:text-[13px]"
                    }`}
                  >
                    {title}
                  </p>
                  <p className="font-inter text-[10px] text-muted-foreground md:text-xs">
                    {detail}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-xl px-2.5 py-1 font-inter text-[10px] font-medium md:px-2.5 md:py-1 md:text-xs ${activityStatusClass(act.statusTone)}`}
                >
                  {act.statusLabel}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
