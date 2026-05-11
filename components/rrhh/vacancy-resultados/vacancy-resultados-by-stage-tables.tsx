"use client"

import type { ApplicantsByStageSection } from "@/lib/rrhh/vacancy-pipeline-stats"

export interface VacancyResultadosByStageTablesProps {
  applicantsByStage: ApplicantsByStageSection[]
}

function formatScoreCell(scorePercent: number | null): string {
  if (scorePercent == null || !Number.isFinite(scorePercent)) return "—"
  return `${Math.round(scorePercent)} %`
}

export function VacancyResultadosByStageTables({
  applicantsByStage,
}: VacancyResultadosByStageTablesProps) {
  return (
    <section
      className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6"
      aria-labelledby="vacancy-resultados-detail-heading"
    >
      <h2
        id="vacancy-resultados-detail-heading"
        className="mb-1 font-sans text-base font-semibold text-foreground"
      >
        Candidatos por etapa
      </h2>
      <p className="mb-6 font-sans text-sm text-muted-foreground">
        Nombre, puntaje individual (mismo criterio que el tablero) y estado de postulación.
      </p>
      <div className="flex flex-col gap-8">
        {applicantsByStage.map(({ stageName, applicants }) => (
          <div key={stageName}>
            <h3 className="mb-2 font-sans text-sm font-semibold text-foreground">
              {stageName}
              <span className="ml-2 font-normal text-muted-foreground">
                ({applicants.length}{" "}
                {applicants.length === 1 ? "candidato" : "candidatos"})
              </span>
            </h3>
            {applicants.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-4 font-sans text-sm text-muted-foreground">
                Sin postulantes en esta etapa.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[520px] border-collapse font-sans text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-left">
                      <th scope="col" className="px-3 py-2 font-semibold text-foreground">
                        Candidato
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 font-semibold text-foreground tabular-nums"
                      >
                        Puntaje
                      </th>
                      <th scope="col" className="px-3 py-2 font-semibold text-foreground">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {applicants.map((row) => (
                      <tr
                        key={`${stageName}-${row.candidateId}`}
                        className="border-b border-border last:border-b-0 odd:bg-background even:bg-muted/20"
                      >
                        <td className="max-w-[220px] px-3 py-2 font-medium text-foreground">
                          <span className="truncate block" title={row.displayName}>
                            {row.displayName}
                          </span>
                        </td>
                        <td className="px-3 py-2 tabular-nums text-foreground">
                          {formatScoreCell(row.scorePercent)}
                        </td>
                        <td className="px-3 py-2 text-foreground">
                          <span
                            className="inline-flex max-w-xs rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium"
                            title={row.statusLabel}
                          >
                            {row.statusLabel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
