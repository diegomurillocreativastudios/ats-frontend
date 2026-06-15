"use client";

import { ClipboardList, Calendar, CalendarX } from "lucide-react";
import { useTranslations } from "next-intl";
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
  if (tone === "confirmed") return "bg-blue-50 text-blue-700 border border-blue-200";
  if (tone === "neutral") return "bg-gray-50 text-gray-700 border border-gray-200";
  return "bg-amber-50 text-amber-700 border border-amber-200";
}

export default function NextActivitiesCard({
  activities = [],
  loading = false,
}: {
  activities: CandidatePortalActivity[];
  loading?: boolean;
}) {
  const t = useTranslations("CandidatePortal.activities");
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-sans text-lg font-semibold text-foreground">
          {t("title")}
        </h2>
      </div>
      {loading ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex animate-pulse items-center gap-3 rounded-lg bg-muted p-4"
            >
              <div className="h-10 w-10 shrink-0 rounded-lg bg-border" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-border" />
                <div className="h-3 w-1/2 rounded bg-border" />
              </div>
              <div className="h-6 w-20 shrink-0 rounded-full bg-border" />
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <CalendarX className="h-8 w-8 text-muted-foreground" aria-hidden />
          </div>
          <div className="space-y-1">
            <p className="font-sans text-base font-semibold text-foreground">
              {t("emptyTitle")}
            </p>
            <p className="font-sans text-sm text-muted-foreground">
              {t("emptyDescription")}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {activities.map((act) => {
            const Icon = getActivityIcon(act.kind);
            const styles = getActivityIconStyles(act.kind);
            return (
              <div
                key={act.id}
                className="flex items-center gap-4 rounded-lg border border-border bg-white p-4 transition-all hover:border-blue-300 hover:shadow-sm"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${styles.iconBg}`}
                >
                  <Icon className={`h-5 w-5 ${styles.iconColor}`} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-sm font-semibold text-foreground">
                    {act.title}
                  </p>
                  <p className="mt-1 font-sans text-xs text-muted-foreground">
                    {act.detailLine}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 font-sans text-xs font-medium ${activityStatusClass(act.statusTone)}`}
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
