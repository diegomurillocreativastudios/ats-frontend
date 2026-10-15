"use client"

import { useTranslations } from "next-intl"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type {
  AssessmentsDashboardActivityPoint,
  AssessmentsDashboardStatusSlice,
} from "@/lib/api/recruiter-assessments-dashboard"
import type { AssignmentStatus } from "@/lib/pruebas/types"

const COLOR_ASSIGNED = "#6EB940"
const STATUS_COLORS: Record<AssignmentStatus, string> = {
  pending: "#549E3C",
  in_progress: "#337C37",
  completed: "#6EB940",
  expired: "#57585B",
  cancelled: "#8A8C8A",
}

export interface PruebasDashboardChartsProps {
  activitySeries: AssessmentsDashboardActivityPoint[]
  statusDistribution: AssessmentsDashboardStatusSlice[]
}

function statusLabelKey(
  status: AssignmentStatus,
):
  | "statusPending"
  | "statusInProgress"
  | "statusCompleted"
  | "statusExpired"
  | "statusCancelled" {
  switch (status) {
    case "pending":
      return "statusPending"
    case "in_progress":
      return "statusInProgress"
    case "completed":
      return "statusCompleted"
    case "expired":
      return "statusExpired"
    case "cancelled":
      return "statusCancelled"
  }
}

export function PruebasDashboardCharts({
  activitySeries,
  statusDistribution,
}: PruebasDashboardChartsProps) {
  const t = useTranslations("PruebasPortal.dashboard")
  const tFilters = useTranslations("PruebasPortal.dashboard.filters")

  const statusTotal = statusDistribution.reduce(
    (sum, slice) => sum + slice.count,
    0,
  )
  const pieData =
    statusTotal > 0
      ? statusDistribution.map((slice) => ({
          ...slice,
          name: tFilters(statusLabelKey(slice.status)),
        }))
      : []

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section
        className="glass-card rounded-2xl p-4 sm:p-5"
        aria-labelledby="pruebas-dashboard-activity-heading"
      >
        <h2
          id="pruebas-dashboard-activity-heading"
          className="mb-1 font-display text-base font-semibold text-foreground"
        >
          {t("charts.activityTitle")}
        </h2>
        <p className="mb-3 font-sans text-xs text-muted-foreground">
          {t("charts.activityLegend")}
        </p>
        {activitySeries.length === 0 ? (
          <p className="font-sans text-sm text-muted-foreground" role="status">
            {t("charts.activityEmpty")}
          </p>
        ) : (
          <>
            <div className="h-[220px] w-full min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activitySeries}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="count"
                    name={t("charts.activityLegend")}
                    fill={COLOR_ASSIGNED}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table className="sr-only">
              <caption>{t("charts.activitySummary")}</caption>
              <thead>
                <tr>
                  <th scope="col">{t("filters.assignedFrom")}</th>
                  <th scope="col">{t("charts.activityLegend")}</th>
                </tr>
              </thead>
              <tbody>
                {activitySeries.map((point) => (
                  <tr key={point.date}>
                    <td>{point.date}</td>
                    <td>{point.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      <section
        className="glass-card rounded-2xl p-4 sm:p-5"
        aria-labelledby="pruebas-dashboard-distribution-heading"
      >
        <h2
          id="pruebas-dashboard-distribution-heading"
          className="mb-3 font-display text-base font-semibold text-foreground"
        >
          {t("charts.distributionTitle")}
        </h2>
        {pieData.length === 0 ? (
          <p className="font-sans text-sm text-muted-foreground" role="status">
            {t("charts.distributionEmpty")}
          </p>
        ) : (
          <div className="h-[220px] w-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {pieData.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={STATUS_COLORS[entry.status]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  )
}
