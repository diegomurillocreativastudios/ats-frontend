"use client"

import { AlertTriangle, Building2, Calendar, Globe2, Tag } from "lucide-react"
import type { VacancyResultadosVacancyMeta } from "@/lib/api/vacancy-resultados"

export interface VacancyResultadosMetaPanelProps {
  vacancyTitle: string | null
  meta: VacancyResultadosVacancyMeta
  /** Oculta título principal y chips de estado cuando la página ya los muestra arriba. */
  hideVacancyHeading?: boolean
}

function formatDisplayDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("es", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function WeightsVisual({ weights }: { weights: unknown }) {
  const o = weights && typeof weights === "object" && !Array.isArray(weights)
    ? (weights as Record<string, unknown>)
    : null
  const semanticRaw = o?.semantic
  const semantic =
    typeof semanticRaw === "number" && Number.isFinite(semanticRaw)
      ? Math.min(1, Math.max(0, semanticRaw))
      : null
  const attrs = o?.attributes
  const attrEntries =
    attrs && typeof attrs === "object" && !Array.isArray(attrs)
      ? Object.entries(attrs as Record<string, unknown>).filter(
          ([, v]) => typeof v === "number" && Number.isFinite(v)
        )
      : []

  if (semantic == null && attrEntries.length === 0) {
    return (
      <p className="font-sans text-sm text-muted-foreground">
        No hay pesos de matching estructurados en la respuesta del API.
      </p>
    )
  }

  const semanticPct = semantic != null ? Math.round(semantic * 100) : null

  return (
    <div className="space-y-4">
      {semanticPct != null ? (
        <div>
          <div className="mb-1 flex items-center justify-between font-sans text-xs text-muted-foreground">
            <span>Peso similitud semántica</span>
            <span className="tabular-nums font-medium text-foreground">{semanticPct}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-linear-to-r from-vo-purple to-emerald-500"
              style={{ width: `${semanticPct}%` }}
            />
          </div>
        </div>
      ) : null}
      {attrEntries.length > 0 ? (
        <div>
          <p className="mb-2 font-sans text-xs font-medium text-muted-foreground">
            Pesos por atributo
          </p>
          <ul className="space-y-2">
            {attrEntries.map(([key, val]) => {
              const n = typeof val === "number" ? val : 0
              const pct = Math.round(Math.min(1, Math.max(0, n)) * 100)
              return (
                <li key={key}>
                  <div className="mb-0.5 flex justify-between font-sans text-xs text-muted-foreground">
                    <span className="truncate pr-2" title={key}>
                      {key}
                    </span>
                    <span className="shrink-0 tabular-nums text-foreground">{pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-[#496FB3]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ) : semanticPct != null ? (
        <p className="font-sans text-xs text-muted-foreground">
          Sin pesos adicionales por atributos en esta vacante.
        </p>
      ) : null}
    </div>
  )
}

function RequirementsBlock({ requirements }: { requirements: unknown }) {
  if (requirements == null) {
    return (
      <p className="font-sans text-sm text-muted-foreground">Sin requisitos en el payload.</p>
    )
  }
  if (typeof requirements === "object" && !Array.isArray(requirements)) {
    const keys = Object.keys(requirements as object)
    if (keys.length === 0) {
      return (
        <p className="font-sans text-sm text-muted-foreground">
          Requisitos vacíos (objeto sin claves). El match puede basarse solo en texto libre de la
          descripción.
        </p>
      )
    }
    return (
      <pre className="max-h-48 overflow-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed text-foreground">
        {JSON.stringify(requirements, null, 2)}
      </pre>
    )
  }
  return (
    <p className="whitespace-pre-wrap font-sans text-sm text-foreground">
      {String(requirements)}
    </p>
  )
}

export function VacancyResultadosMetaPanel({
  vacancyTitle,
  meta,
  hideVacancyHeading = false,
}: VacancyResultadosMetaPanelProps) {
  const created = formatDisplayDate(meta.createdAt)
  const title = vacancyTitle?.trim() || "Vacante"

  return (
    <section
      className="overflow-hidden rounded-xl border border-border bg-linear-to-br from-card via-card to-muted/30 p-4 shadow-sm sm:p-6"
      aria-labelledby="vacancy-resultados-meta-heading"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          {!hideVacancyHeading ? (
            <>
              <h2
                id="vacancy-resultados-meta-heading"
                className="font-sans text-lg font-bold tracking-tight text-foreground sm:text-xl"
              >
                {title}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {meta.status ? (
                  <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-sans text-xs font-semibold text-emerald-800">
                    {meta.status}
                  </span>
                ) : null}
                {meta.jobCategory ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-3 py-1 font-sans text-xs text-foreground">
                    <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    {meta.jobCategory}
                  </span>
                ) : null}
                {meta.needsRematch ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 font-sans text-xs font-medium text-amber-900">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Requiere re-match
                  </span>
                ) : null}
              </div>
            </>
          ) : (
            <h2 id="vacancy-resultados-meta-heading" className="sr-only">
              Contexto de la vacante: {title}
            </h2>
          )}
          <dl className="mt-4 grid gap-3 font-sans text-sm sm:grid-cols-2">
            {meta.company ? (
              <div className="flex gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <div>
                  <dt className="text-xs text-muted-foreground">Empresa</dt>
                  <dd className="font-medium text-foreground">{meta.company}</dd>
                </div>
              </div>
            ) : null}
            {meta.countryCode ? (
              <div className="flex gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <div>
                  <dt className="text-xs text-muted-foreground">País (código)</dt>
                  <dd className="font-medium text-foreground">{meta.countryCode}</dd>
                </div>
              </div>
            ) : null}
            {meta.vacancyDepartmentLabel ? (
              <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                <dt className="text-xs text-muted-foreground">Departamento</dt>
                <dd className="font-medium text-foreground">{meta.vacancyDepartmentLabel}</dd>
              </div>
            ) : null}
            {meta.vacancyModalityLabel ? (
              <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                <dt className="text-xs text-muted-foreground">Modalidad</dt>
                <dd className="font-medium text-foreground">{meta.vacancyModalityLabel}</dd>
              </div>
            ) : null}
            {created && !hideVacancyHeading ? (
              <div className="flex gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-2 sm:col-span-2">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <div>
                  <dt className="text-xs text-muted-foreground">Creada</dt>
                  <dd className="font-medium text-foreground">{created}</dd>
                </div>
              </div>
            ) : null}
          </dl>
        </div>
        <div className="w-full shrink-0 rounded-xl border border-border bg-card/80 p-4 shadow-inner lg:max-w-sm">
          <h3 className="font-sans text-sm font-semibold text-foreground">Pesos del modelo</h3>
          <div className="mt-3">
            <WeightsVisual weights={meta.weights} />
          </div>
        </div>
      </div>

      {meta.description ? (
        <details className="group mt-6 rounded-lg border border-border bg-background/50">
          <summary className="cursor-pointer list-none px-4 py-3 font-sans text-sm font-semibold text-foreground marker:hidden [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              Ver descripción completa
              <span className="text-xs font-normal text-muted-foreground group-open:hidden">
                (click para expandir)
              </span>
            </span>
          </summary>
          <div className="border-t border-border px-4 py-3">
            <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
              {meta.description}
            </p>
          </div>
        </details>
      ) : null}

      <details className="group mt-6 rounded-lg border border-border bg-muted/15">
        <summary className="cursor-pointer list-none px-4 py-3 font-sans text-sm font-semibold text-foreground marker:hidden [&::-webkit-details-marker]:hidden">
          Detalles técnicos
          <span className="ml-2 text-xs font-normal text-muted-foreground group-open:hidden">
            (requisitos, sugerencias de IA)
          </span>
        </summary>
        <div className="space-y-4 border-t border-border px-4 py-4">
          <div>
            <h3 className="font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Requisitos (payload)
            </h3>
            <div className="mt-2">
              <RequirementsBlock requirements={meta.requirements} />
            </div>
          </div>
          {meta.aiMatchSuggestions.length > 0 ? (
            <div role="region" aria-label="Sugerencias de IA">
              <h3 className="font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Sugerencias de IA ({meta.aiMatchSuggestions.length})
              </h3>
              <pre className="mt-2 max-h-56 overflow-auto rounded-md border border-border bg-background/80 p-3 font-mono text-xs text-foreground">
                {JSON.stringify(meta.aiMatchSuggestions, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      </details>
    </section>
  )
}
