"use client";

import { Briefcase, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CandidatePortalApplicationRow } from "@/lib/candidate-dashboard";
import {
  translateApplicationStatus,
  getApplicationStatusStyle,
} from "@/lib/candidate-portal-translations";

export default function MyPostulationsCard({
  applications = [],
  loading = false,
  onSelectApplication,
}: {
  applications: CandidatePortalApplicationRow[];
  loading?: boolean;
  onSelectApplication?: (application: CandidatePortalApplicationRow) => void;
}) {
  const t = useTranslations("CandidatePortal.applications");
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
              className="flex animate-pulse flex-col gap-3 rounded-lg border border-border bg-muted p-4"
            >
              <div className="flex justify-between gap-2">
                <div className="h-4 w-2/3 rounded bg-border" />
                <div className="h-6 w-20 rounded-full bg-border" />
              </div>
              <div className="h-3 w-1/2 rounded bg-border" />
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-2 flex-1 rounded-full bg-border" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Briefcase className="h-8 w-8 text-muted-foreground" aria-hidden />
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
          {applications.map((post) => {
            const companyDisplay = post.companyLine?.trim() ?? "";
            const showCompanyLine = companyDisplay !== "";
            const translatedStatus = translateApplicationStatus(post.statusLabel);
            const progressPercentage = post.totalStages > 0
              ? Math.round((post.progressCurrent / post.totalStages) * 100)
              : 0;

            return (
              <button
                key={post.id}
                onClick={() => onSelectApplication?.(post)}
                className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4 text-left transition-all hover:border-blue-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-sans text-sm font-semibold text-foreground">
                      {post.jobTitle}
                    </p>
                    {showCompanyLine && (
                      <p className="mt-1 font-sans text-xs text-muted-foreground">
                        {companyDisplay}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 font-sans text-xs font-medium ${getApplicationStatusStyle(translatedStatus)}`}
                    >
                      {translatedStatus}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-xs text-muted-foreground">
                      {t("stageProgress", {
                        current: post.progressCurrent,
                        total: post.totalStages,
                      })}
                    </span>
                    <span className="font-sans text-xs font-semibold text-foreground">
                      {progressPercentage}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${progressPercentage}%` }}
                      role="progressbar"
                      aria-valuenow={progressPercentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={t("progressAria", { percentage: progressPercentage })}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
