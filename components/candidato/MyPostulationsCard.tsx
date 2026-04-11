"use client";

import Link from "next/link";
import type { CandidatePortalApplicationRow } from "@/lib/candidate-dashboard";

function getApplicationStatusStyle(statusLabel: string) {
  const t = statusLabel.toLowerCase();
  if (t.includes("evalu")) return "bg-[#DCFCE7] text-green-800";
  if (
    t.includes("descart") ||
    t.includes("rechaz") ||
    t.includes("withdraw") ||
    t.includes("retir")
  )
    return "bg-[#FEE2E2] text-red-800";
  return "bg-[#DBEAFE] text-blue-900";
}

export default function MyPostulationsCard({
  applications = [],
  loading = false,
}: {
  applications: CandidatePortalApplicationRow[];
  loading?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 lg:p-6 lg:min-w-[320px] lg:max-w-[400px]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-inter text-base font-semibold text-foreground lg:text-lg">
          Mis Postulaciones
        </h2>
        <Link
          href="/portal-candidato/estado"
          className="font-inter text-xs font-medium text-vo-purple hover:underline lg:text-sm"
        >
          Ver todas
        </Link>
      </div>
      {loading ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex animate-pulse flex-col gap-2 rounded-lg bg-muted p-4"
            >
              <div className="flex justify-between gap-2">
                <div className="h-4 w-2/3 rounded bg-border" />
                <div className="h-6 w-20 rounded-xl bg-border" />
              </div>
              <div className="h-3 w-1/2 rounded bg-border" />
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((j) => (
                  <div key={j} className="h-1.5 flex-1 rounded-sm bg-border" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : applications.length === 0 ? (
        <p className="font-inter text-sm text-muted-foreground">
          Todavía no tenés postulaciones activas. Explorá vacantes y aplicá para
          ver tu progreso aquí.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {applications.map((post) => (
            <div
              key={post.id}
              className="flex flex-col gap-2 rounded-lg bg-muted p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-inter text-sm font-medium text-foreground">
                  {post.jobTitle}
                </p>
                <span
                  className={`shrink-0 rounded-xl px-2.5 py-1 font-inter text-xs font-medium ${getApplicationStatusStyle(post.statusLabel)}`}
                >
                  {post.statusLabel}
                </span>
              </div>
              <p className="font-inter text-xs text-muted-foreground">
                {post.companyLine}
              </p>
              <div className="flex gap-1">
                {Array.from({ length: post.totalStages }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-sm ${
                      i < post.progressCurrent ? "bg-vo-purple" : "bg-border"
                    }`}
                    role="progressbar"
                    aria-valuenow={post.progressCurrent}
                    aria-valuemin={0}
                    aria-valuemax={post.totalStages}
                    aria-label={`Progreso etapa ${post.progressCurrent} de ${post.totalStages}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
