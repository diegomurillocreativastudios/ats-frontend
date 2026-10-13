"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"

import { AssessmentStatusBadge } from "@/components/pruebas/shared/assessment-status-badge"
import { AssessmentTypeBadge } from "@/components/pruebas/shared/assessment-type-badge"
import { EmptyState } from "@/components/pruebas/shared/empty-state"
import { ErrorState } from "@/components/pruebas/shared/error-state"
import { LoadingSkeleton } from "@/components/pruebas/shared/loading-skeleton"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import {
  questionPointsOrDimension,
  resolveCurrentVersion,
  resolveLinksForTest,
  resolveQuestionsForVersion,
} from "@/lib/pruebas/evaluations"
import { formatDurationMinutes, formatMockDate } from "@/lib/pruebas/formatters"
import { resolveLatestPublishedVersionId } from "@/lib/pruebas/links"
import {
  getTest,
  listLinks,
  listQuestions,
  listVacancies,
  listVersions,
  MockServiceError,
} from "@/lib/pruebas/mock-service"
import { PRUEBAS_HOME_HREF } from "@/lib/pruebas/portal-nav"
import type {
  MockAssessmentLink,
  MockAssessmentTest,
  MockAssessmentVersion,
  MockQuestion,
  MockVacancy,
} from "@/lib/pruebas/types"

interface PruebasEvaluationDetailProps {
  testId: string
}

export function PruebasEvaluationDetail({
  testId,
}: PruebasEvaluationDetailProps) {
  const t = useTranslations("PruebasPortal.evaluations")
  const locale = useLocale()

  const [test, setTest] = useState<MockAssessmentTest | null>(null)
  const [versions, setVersions] = useState<MockAssessmentVersion[]>([])
  const [questions, setQuestions] = useState<MockQuestion[]>([])
  const [links, setLinks] = useState<MockAssessmentLink[]>([])
  const [vacancies, setVacancies] = useState<MockVacancy[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorCode, setErrorCode] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setErrorCode(null)
    try {
      const [testRow, versionRows, questionRows, linkRows, vacancyRows] =
        await Promise.all([
          getTest(testId),
          listVersions(testId),
          listQuestions(),
          listLinks(),
          listVacancies(),
        ])
      setTest(testRow)
      setVersions(versionRows)
      setQuestions(questionRows)
      setLinks(linkRows)
      setVacancies(vacancyRows)
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

  const currentVersion = useMemo(
    () => resolveCurrentVersion(versions, testId),
    [versions, testId],
  )

  const versionQuestions = useMemo(
    () => resolveQuestionsForVersion(currentVersion, questions),
    [currentVersion, questions],
  )

  const linkRows = useMemo(
    () => resolveLinksForTest(testId, versions, links, vacancies),
    [testId, versions, links, vacancies],
  )

  const latestPublishedVersionId = useMemo(
    () => resolveLatestPublishedVersionId(testId, versions),
    [testId, versions],
  )

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <PortalPageHeader
          id="pruebas-evaluation-detail"
          title={t("detail.title")}
        />
        <p className="sr-only" role="status">
          {t("states.loading")}
        </p>
        <LoadingSkeleton rows={6} />
      </div>
    )
  }

  if (errorCode === "not_found" || (!test && errorCode)) {
    const isNotFound = errorCode === "not_found"
    return (
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <PortalPageHeader
          id="pruebas-evaluation-detail"
          title={t("detail.title")}
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

  const canLink = test.lifecycleStatus === "published"
  const canEditPublished = test.lifecycleStatus === "published"
  const canEditDraft = test.lifecycleStatus === "draft"
  const versionLabel = currentVersion
    ? currentVersion.publishedAt
      ? t("detail.versionLabel", { number: currentVersion.versionNumber })
      : t("detail.draftVersion")
    : null

  return (
    <div className="flex flex-col gap-8 px-4 py-6 md:px-6 lg:px-8">
      <PortalPageHeader
        id="pruebas-evaluation-detail"
        title={test.title}
        description={test.description}
        layout="split"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`${PRUEBAS_HOME_HREF}/evaluaciones/${test.id}/versiones`}
              className="inline-flex h-11 items-center rounded-md border border-border bg-background px-4 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
            >
              {t("detail.openVersions")}
            </Link>
            {canEditDraft ? (
              <Link
                href={`${PRUEBAS_HOME_HREF}/evaluaciones/${test.id}/editar`}
                className="inline-flex h-11 items-center rounded-md border border-border bg-background px-4 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
              >
                {t("actions.edit")}
              </Link>
            ) : null}
            {canEditPublished ? (
              <Link
                href={`${PRUEBAS_HOME_HREF}/evaluaciones/${test.id}/editar`}
                className="inline-flex h-11 items-center rounded-md border border-border bg-background px-4 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
              >
                {t("editor.detailEditDraft")}
              </Link>
            ) : null}
            {canLink ? (
              <Link
                href={
                  latestPublishedVersionId
                    ? `${PRUEBAS_HOME_HREF}/vinculaciones?version=${encodeURIComponent(latestPublishedVersionId)}`
                    : `${PRUEBAS_HOME_HREF}/vinculaciones`
                }
                className="inline-flex h-11 items-center rounded-md bg-vo-purple px-4 font-sans text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
              >
                {t("detail.linkVacancy")}
              </Link>
            ) : (
              <span
                className="inline-flex h-11 cursor-not-allowed items-center rounded-md border border-border bg-muted px-4 font-sans text-sm font-medium text-muted-foreground"
                title={t("detail.linkVacancyDisabled")}
              >
                {t("detail.linkVacancy")}
              </span>
            )}
          </div>
        }
      />

      <section
        aria-labelledby="pruebas-eval-summary"
        className="glass-card rounded-2xl p-4 md:p-6"
      >
        <h2
          id="pruebas-eval-summary"
          className="font-display text-lg font-semibold text-foreground"
        >
          {t("detail.summary")}
        </h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="font-sans text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("table.kind")}
            </dt>
            <dd className="mt-1">
              <AssessmentTypeBadge
                kind={test.kind}
                label={t(`kind.${test.kind}`)}
              />
            </dd>
          </div>
          <div>
            <dt className="font-sans text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("table.status")}
            </dt>
            <dd className="mt-1">
              <AssessmentStatusBadge
                lifecycleStatus={test.lifecycleStatus}
                label={t(`status.${test.lifecycleStatus}`)}
              />
            </dd>
          </div>
          <div>
            <dt className="font-sans text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("detail.createdAt")}
            </dt>
            <dd className="mt-1 font-sans text-sm text-foreground">
              {formatMockDate(test.createdAt, locale)}
            </dd>
          </div>
          {versionLabel ? (
            <div>
              <dt className="font-sans text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("detail.configuration")}
              </dt>
              <dd className="mt-1 font-sans text-sm text-foreground">
                {versionLabel}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section
        aria-labelledby="pruebas-eval-config"
        className="glass-card rounded-2xl p-4 md:p-6"
      >
        <h2
          id="pruebas-eval-config"
          className="font-display text-lg font-semibold text-foreground"
        >
          {t("detail.configuration")}
        </h2>
        {currentVersion ? (
          <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="font-sans text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("detail.instructions")}
              </dt>
              <dd className="mt-1 font-sans text-sm text-foreground">
                {currentVersion.instructions || "—"}
              </dd>
            </div>
            <div>
              <dt className="font-sans text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("detail.duration")}
              </dt>
              <dd className="mt-1 font-sans text-sm text-foreground">
                {t("detail.durationValue", {
                  minutes: formatDurationMinutes(currentVersion.durationMinutes),
                })}
              </dd>
            </div>
            <div>
              <dt className="font-sans text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("detail.maxAttempts")}
              </dt>
              <dd className="mt-1 font-sans text-sm text-foreground">
                {currentVersion.maxAttempts}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 font-sans text-sm text-muted-foreground">
            {t("detail.noVersion")}
          </p>
        )}
      </section>

      <section
        aria-labelledby="pruebas-eval-questions"
        className="glass-card rounded-2xl p-4 md:p-6"
      >
        <h2
          id="pruebas-eval-questions"
          className="font-display text-lg font-semibold text-foreground"
        >
          {t("detail.questions")}
        </h2>
        {versionQuestions.length === 0 ? (
          <p className="mt-3 font-sans text-sm text-muted-foreground">
            {t("detail.noQuestions")}
          </p>
        ) : (
          <ol className="mt-4 flex flex-col gap-3">
            {versionQuestions.map((question, index) => {
              const meta = questionPointsOrDimension(question)
              return (
                <li
                  key={question.id}
                  className="rounded-xl border border-border bg-background/60 p-3"
                >
                  <p className="font-sans text-sm font-medium text-foreground">
                    {index + 1}. {question.prompt}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 font-sans text-xs text-muted-foreground">
                    <span>{t(`questionKind.${question.kind}`)}</span>
                    {typeof meta === "number" ? (
                      <span>{t("detail.points", { points: meta })}</span>
                    ) : (
                      <span>{t("detail.dimension", { dimension: meta })}</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <section
        aria-labelledby="pruebas-eval-links"
        className="glass-card rounded-2xl p-4 md:p-6"
      >
        <h2
          id="pruebas-eval-links"
          className="font-display text-lg font-semibold text-foreground"
        >
          {t("detail.links")}
        </h2>
        {linkRows.length === 0 ? (
          <EmptyState
            title={t("detail.noLinks")}
            description={
              canLink
                ? undefined
                : t("detail.linkVacancyDisabled")
            }
            className="mt-3 border-0 bg-transparent p-0"
          />
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {linkRows.map(({ link, vacancyTitle }) => (
              <li
                key={link.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-3"
              >
                <span className="font-sans text-sm text-foreground">
                  {vacancyTitle}
                </span>
                <span className="font-sans text-xs font-medium text-muted-foreground">
                  {link.active
                    ? t("detail.linkActive")
                    : t("detail.linkInactive")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
