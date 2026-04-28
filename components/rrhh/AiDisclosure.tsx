"use client";

import { Sparkles } from "lucide-react";

export function AiDisclosureBadge({ label = "Asistido por IA" }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-vo-purple/30 bg-vo-purple/10 px-2.5 py-1 font-inter text-xs font-semibold text-vo-purple">
      <Sparkles className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  );
}

export function AiDisclosureNotice({ title, description }) {
  return (
    <div className="rounded-lg border border-vo-purple/20 bg-vo-purple/5 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <AiDisclosureBadge />
        {title ? (
          <p className="font-inter text-sm font-medium text-foreground">
            {title}
          </p>
        ) : null}
      </div>
      {description ? (
        <p className="mt-1.5 font-inter text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function AiKpiCard({ label, value, helper }) {
  return (
    <article className="rounded-lg border border-border bg-card px-3 py-2.5">
      <p className="font-inter text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-inter text-base font-semibold text-foreground">
        {value}
      </p>
      {helper ? (
        <p className="mt-0.5 font-inter text-[11px] text-muted-foreground">
          {helper}
        </p>
      ) : null}
    </article>
  );
}
