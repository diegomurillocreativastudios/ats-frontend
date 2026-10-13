"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"

import { ErrorState } from "@/components/pruebas/shared/error-state"
import { LoadingSkeleton } from "@/components/pruebas/shared/loading-skeleton"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import {
  resolveQuestionsForVersion,
  sortVersionsDesc,
} from "@/lib/pruebas/evaluations"
import { formatDurationMinutes, formatMockDate } from "@/lib/pruebas/formatters"
import {
  getTest,
  listQuestions,
  listVersions,
  MockServiceError,
} from "@/lib/pruebas/mock-service"
import { PRUEBAS_HOME_HREF } from "@/lib/pruebas/portal-nav"
import type {
  MockAssessmentTest,
  MockAssessmentVersion,
  MockQuestion,
} from "@/lib/pruebas/types"

interface PruebasEvaluationVersionsProps {
  testId: string
}

export function PruebasEvaluationVersions({
  testId,
}: PruebasEvaluationVersionsProps) {
  const t = useTranslations("PruebasPortal.evaluations")
  const locale = useLocale()

  const [test, setTest] = useState<MockAssessmentTest | null>(null)
  const [versions, setVersions] = useState<MockAssessmentVersion[]>([])
  const [questions, setQuestions] = useState<MockQuestion[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorCode, setErrorCode] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setErrorCode(null)
    try {
      const [testRow, versionRows, questionRows] = await Promise.all([
        getTest(testId),
        listVersions(testId),
        listQuestions(),
      ])
      const sorted = sortVersionsDesc(versionRows)
      setTest(testRow)
      setVersions(sorted)
      setQuestions(questionRows)
      setSelectedId((current) => current ?? sorted[0]?.id ?? null)
    } catch (error) {
      setTest(null)
      if (error instanceof MockServiceError) {
        setErrorCode(error.code)
      } else {
        setErrorCode("scenario_error")
      }
    } finally {
      setIsLoading(false)
    }
  }, [testId])

  useEffect(() => {
    void load()
  }, [load])

  const selected = useMemo(
    () => versions.find((version) => version.id === selectedId) ?? null,
    [versions, selectedId],
  )

  const selectedQuestions = useMemo(
    () => resolveQuestionsForVersion(selected, questions),
    [selected, questions],
  )

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <PortalPageHeader
          id="pruebas-evaluation-versions"
          title={t("versions.title")}
          description={t("versions.description")}
        />
        <LoadingSkeleton rows={4} />
      </div>
    )
  }

  if (errorCode === "not_found" || (!test && errorCode)) {
    const isNotFound = errorCode === "not_found"
    return (
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <PortalPageHeader
          id="pruebas-evaluation-versions"
          title={t("versions.title")}
        />
        <ErrorState
          title={
            isNotFound ? t("states.notFoundTitle") : t("states.errorTitle")
          }
          description={
            isNotFound
              ? t("states.notFoundDescription")
              : t(`errors.${errorCode}` as "errors.scenario_error")
          }
          action={
            <Link
              href={`${PRUEBAS_HOME_HREF}/evaluaciones`}
              className="inline-flex min-h-11 items-center rounded-md border border-border bg-background px-4 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
            >
              {t("states.backToList")}
            </Link>
          }
        />
      </div>
    )
  }

  if (!test) {
    return null
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <PortalPageHeader
        id="pruebas-evaluation-versions"
        title={`${t("versions.title")}: ${test.title}`}
        description={t("versions.description")}
        layout="split"
        actions={
          <Link
            href={`${PRUEBAS_HOME_HREF}/evaluaciones/${test.id}`}
            className="inline-flex h-11 items-center rounded-md border border-border bg-background px-4 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
          >
            {t("actions.view")}
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
        <nav
          aria-label={t("versions.listLabel")}
          className="glass-card rounded-2xl p-3"
        >
          <ul className="flex flex-col gap-1">
            {versions.map((version) => {
              const isSelected = version.id === selectedId
              const isDraft = version.publishedAt === undefined
              const label = isDraft
                ? t("versions.draftLabel")
                : t("versions.versionNumber", {
                    number: version.versionNumber,
                  })
              return (
                <li key={version.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(version.id)}
                    className={`flex w-full min-h-11 flex-col items-start rounded-md px-3 py-2 text-left font-sans transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 ${
                      isSelected
                        ? "bg-vo-purple/10 text-foreground"
                        : "text-foreground hover:bg-muted"
                    }`}
                    aria-current={isSelected ? "true" : undefined}
                  >
                    <span className="text-sm font-medium">{label}</span>
                    <span className="text-xs text-muted-foreground">
                      {isDraft
                        ? t("versions.draftLabel")
                        : t("versions.publishedAt", {
                            date: formatMockDate(
                              version.publishedAt!,
                              locale,
                            ),
                          })}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <section
          aria-labelledby="pruebas-version-snapshot"
          className="glass-card rounded-2xl p-4 md:p-6"
        >
          <h2
            id="pruebas-version-snapshot"
            className="font-display text-lg font-semibold text-foreground"
          >
            {t("versions.snapshot")}
          </h2>
          {!selected ? (
            <p className="mt-3 font-sans text-sm text-muted-foreground">
              {t("versions.selectPrompt")}
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              {selected.publishedAt ? (
                <p className="font-sans text-sm text-muted-foreground">
                  {t("versions.readonlyNotice")}
                </p>
              ) : null}
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="font-sans text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("detail.instructions")}
                  </dt>
                  <dd className="mt-1 font-sans text-sm text-foreground">
                    {selected.instructions || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="font-sans text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("detail.duration")}
                  </dt>
                  <dd className="mt-1 font-sans text-sm text-foreground">
                    {t("detail.durationValue", {
                      minutes: formatDurationMinutes(selected.durationMinutes),
                    })}
                  </dd>
                </div>
                <div>
                  <dt className="font-sans text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("detail.maxAttempts")}
                  </dt>
                  <dd className="mt-1 font-sans text-sm text-foreground">
                    {selected.maxAttempts}
                  </dd>
                </div>
              </dl>
              <div>
                <h3 className="font-sans text-sm font-semibold text-foreground">
                  {t("detail.questions")}
                </h3>
                {selectedQuestions.length === 0 ? (
                  <p className="mt-2 font-sans text-sm text-muted-foreground">
                    {t("detail.noQuestions")}
                  </p>
                ) : (
                  <ol className="mt-2 flex flex-col gap-2">
                    {selectedQuestions.map((question, index) => (
                      <li
                        key={question.id}
                        className="rounded-lg border border-border px-3 py-2 font-sans text-sm text-foreground"
                      >
                        {index + 1}. {question.prompt}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
