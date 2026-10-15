"use client"

import { useTranslations } from "next-intl"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const COLOR_BAR = "#6EB940"

export interface PruebasResultsScoreChartProps {
  title: string
  points: { name: string; value: number }[]
  yDomain?: [number, number]
  footnote?: string
  summaryCaption: string
  emptyMessage: string
  testId: string
}

export function PruebasResultsScoreChart({
  title,
  points,
  yDomain,
  footnote,
  summaryCaption,
  emptyMessage,
  testId,
}: PruebasResultsScoreChartProps) {
  const t = useTranslations("PruebasPortal.results.detail")

  return (
    <section
      className="glass-card rounded-2xl p-4 sm:p-5"
      aria-labelledby={`${testId}-heading`}
      data-testid={testId}
    >
      <h2
        id={`${testId}-heading`}
        className="mb-3 font-display text-base font-semibold text-foreground"
      >
        {title}
      </h2>
      {points.length === 0 ? (
        <p className="font-sans text-sm text-muted-foreground" role="status">
          {emptyMessage}
        </p>
      ) : (
        <>
          <div className="h-[240px] w-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={points} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                  domain={yDomain}
                />
                <Tooltip />
                <Bar
                  dataKey="value"
                  name={t("score")}
                  fill={COLOR_BAR}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>{summaryCaption}</caption>
            <thead>
              <tr>
                <th scope="col">{title}</th>
                <th scope="col">{t("score")}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.name}>
                  <td>{point.name}</td>
                  <td>{point.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {footnote ? (
            <p
              className="mt-3 font-sans text-xs text-muted-foreground"
              data-testid={`${testId}-footnote`}
            >
              {footnote}
            </p>
          ) : null}
        </>
      )}
    </section>
  )
}
