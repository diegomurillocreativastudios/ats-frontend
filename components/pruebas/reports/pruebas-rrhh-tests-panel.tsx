"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { useTranslations } from "next-intl"

import {
  listApplications,
  listAssignments,
  listCandidates,
  listResults,
  listTests,
  listVacancies,
  listVersions,
} from "@/lib/pruebas/mock-service"
import {
  buildRrhhTestsPanelRows,
  type RrhhTestsPanelRow,
} from "@/lib/pruebas/reports"
import type { AssignmentStatus } from "@/lib/pruebas/types"

const STATUS_STYLES: Record<AssignmentStatus, string> = {
  pending: "border-border bg-muted text-foreground",
  in_progress: "border-vo-purple/40 bg-vo-purple/10 text-emerald-900",
  completed: "border-emerald-300 bg-emerald-50 text-emerald-900",
  expired: "border-amber-300 bg-amber-50 text-amber-800",
  cancelled: "border-border bg-muted text-muted-foreground",
}

export function PruebasRrhhTestsPanel() {
  const t = useTranslations("PruebasPortal.reports")
  const [rows, setRows] = useState<RrhhTestsPanelRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [
        assignments,
        applications,
        candidates,
        vacancies,
        tests,
        versions,
        results,
      ] = await Promise.all([
        listAssignments(),
        listApplications(),
        listCandidates(),
        listVacancies(),
        listTests(),
        listVersions(),
        listResults(),
      ])
      setRows(
        buildRrhhTestsPanelRows({
          assignments,
          applications,
          candidates,
          vacancies,
          tests,
          versions,
          results,
        }),
      )
    } catch {
      setRows([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <section
      className="scroll-mt-28 rounded-xl border border-border bg-card p-6"
      aria-labelledby="rrhh-pruebas-panel-heading"
      data-testid="rrhh-pruebas-panel"
    >
      <div className="mb-4 flex flex-col gap-2">
        <h2
          id="rrhh-pruebas-panel-heading"
          className="font-display text-lg font-semibold text-foreground"
        >
          {t("panel.title")}
        </h2>
        <p className="font-sans text-sm text-muted-foreground">
          {t("panel.description")}
        </p>
      </div>

      {isLoading ? (
        <p className="font-sans text-sm text-muted-foreground" role="status">
          {t("states.loading")}
        </p>
      ) : rows.length === 0 ? (
        <p className="font-sans text-sm text-muted-foreground" role="status">
          {t("panel.empty")}
        </p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-border lg:block">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-3 py-2 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("panel.candidate")}
                  </th>
                  <th className="px-3 py-2 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("panel.test")}
                  </th>
                  <th className="px-3 py-2 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("panel.status")}
                  </th>
                  <th className="px-3 py-2 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("panel.open")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.assignmentId}
                    className="border-b border-border last:border-b-0"
                    data-testid="rrhh-pruebas-panel-row"
                    data-assignment-id={row.assignmentId}
                  >
                    <td className="px-3 py-2 font-sans text-sm text-foreground">
                      {row.candidateName}
                    </td>
                    <td className="px-3 py-2 font-sans text-sm text-foreground">
                      {row.testTitle}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 font-sans text-xs font-medium ${STATUS_STYLES[row.status]}`}
                        data-status={row.status}
                      >
                        {t(`status.${row.status}`)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={row.href}
                        className="inline-flex min-h-11 items-center justify-center rounded-md border border-vo-purple/40 bg-vo-purple/10 px-3 font-sans text-sm font-medium text-emerald-900 hover:bg-vo-purple/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
                        data-testid={`rrhh-pruebas-open-${row.assignmentId}`}
                      >
                        {row.status === "completed"
                          ? t("panel.openResults")
                          : t("panel.openTracking")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-3 lg:hidden">
            {rows.map((row) => (
              <li
                key={row.assignmentId}
                className="flex flex-col gap-2 rounded-lg border border-border p-3"
                data-testid="rrhh-pruebas-panel-row"
                data-assignment-id={row.assignmentId}
              >
                <p className="font-sans text-sm font-medium text-foreground">
                  {row.candidateName}
                </p>
                <p className="font-sans text-sm text-muted-foreground">
                  {row.testTitle}
                </p>
                <span
                  className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 font-sans text-xs font-medium ${STATUS_STYLES[row.status]}`}
                  data-status={row.status}
                >
                  {t(`status.${row.status}`)}
                </span>
                <Link
                  href={row.href}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-vo-purple/40 bg-vo-purple/10 px-3 font-sans text-sm font-medium text-emerald-900 hover:bg-vo-purple/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
                  data-testid={`rrhh-pruebas-open-${row.assignmentId}`}
                >
                  {row.status === "completed"
                    ? t("panel.openResults")
                    : t("panel.openTracking")}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
