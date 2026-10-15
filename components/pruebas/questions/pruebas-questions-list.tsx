"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Plus } from "lucide-react"

import { QuestionCandidatePreview } from "@/components/pruebas/questions/question-candidate-preview"
import { EmptyState } from "@/components/pruebas/shared/empty-state"
import { ErrorState } from "@/components/pruebas/shared/error-state"
import { LoadingSkeleton } from "@/components/pruebas/shared/loading-skeleton"
import { ListPaginationBar } from "@/components/ui/list-pagination-bar"
import Modal from "@/components/ui/Modal"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import { ResponsiveFilters } from "@/components/ui/responsive-filters"
import Snackbar from "@/components/ui/Snackbar"
import { getApiErrorMessage } from "@/lib/api-error"
import {
  filterQuestionsLocally,
  listAssessmentTestsForBank,
  listQuestionsForTest,
  paginateQuestionsLocally,
  type AssessmentQuestionBankView,
} from "@/lib/api/recruiter-assessments-questions"
import type { AssessmentTestView } from "@/lib/api/recruiter-assessments-tests"
import {
  BANK_QUESTION_KINDS,
  type QuestionListFilters,
} from "@/lib/pruebas/question-editor"
import { PRUEBAS_HOME_HREF } from "@/lib/pruebas/portal-nav"
import type { QuestionKind } from "@/lib/pruebas/types"

const CONTROL_CLASS =
  "h-11 w-full rounded-md border border-border bg-background px-3 font-sans text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"

const EMPTY_FILTERS: QuestionListFilters = {
  query: "",
  kind: null,
}

function filtersHaveValues(filters: QuestionListFilters): boolean {
  return Boolean(filters.query.trim() || filters.kind)
}

export function PruebasQuestionsList() {
  const t = useTranslations("PruebasPortal.questionsBank")
  const searchParams = useSearchParams()
  const router = useRouter()

  const selectedTestId = searchParams.get("testId") ?? ""

  const [tests, setTests] = useState<AssessmentTestView[]>([])
  const [questions, setQuestions] = useState<AssessmentQuestionBankView[]>([])
  const [isLoadingTests, setIsLoadingTests] = useState(true)
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filters, setFilters] = useState<QuestionListFilters>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [previewQuestion, setPreviewQuestion] =
    useState<AssessmentQuestionBankView | null>(null)
  const [snackbar, setSnackbar] = useState({
    open: false,
    variant: "success" as "success" | "error",
    message: "",
  })

  const selectTest = useCallback(
    (testId: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (testId) {
        params.set("testId", testId)
      } else {
        params.delete("testId")
      }
      params.delete("saved")
      params.delete("cloned")
      const qs = params.toString()
      router.replace(
        qs
          ? `${PRUEBAS_HOME_HREF}/preguntas?${qs}`
          : `${PRUEBAS_HOME_HREF}/preguntas`,
      )
      setPage(1)
    },
    [router, searchParams],
  )

  const loadTests = useCallback(async () => {
    setIsLoadingTests(true)
    setLoadError(null)
    try {
      const rows = await listAssessmentTestsForBank()
      setTests(rows)
      if (!selectedTestId && rows[0]) {
        selectTest(rows[0].id)
      }
    } catch (error) {
      setTests([])
      setLoadError(getApiErrorMessage(error) || t("toasts.error"))
    } finally {
      setIsLoadingTests(false)
    }
  }, [selectTest, selectedTestId, t])

  const loadQuestions = useCallback(async () => {
    if (!selectedTestId) {
      setQuestions([])
      setIsLoadingQuestions(false)
      return
    }
    setIsLoadingQuestions(true)
    setLoadError(null)
    try {
      const result = await listQuestionsForTest(selectedTestId)
      setQuestions(result.questions)
    } catch (error) {
      setQuestions([])
      setLoadError(getApiErrorMessage(error) || t("toasts.error"))
    } finally {
      setIsLoadingQuestions(false)
    }
  }, [selectedTestId, t])

  useEffect(() => {
    void loadTests()
    // Only on mount / explicit retry — selectTest may update URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load
  }, [])

  useEffect(() => {
    void loadQuestions()
  }, [loadQuestions])

  useEffect(() => {
    const saved = searchParams.get("saved")
    const cloned = searchParams.get("cloned")
    if (cloned === "1") {
      setSnackbar({
        open: true,
        variant: "success",
        message: t("toasts.cloned"),
      })
    } else if (saved === "1") {
      setSnackbar({
        open: true,
        variant: "success",
        message: t("toasts.saved"),
      })
    }
  }, [searchParams, t])

  const filtered = useMemo(
    () => filterQuestionsLocally(questions, filters),
    [questions, filters],
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize) || 1)
  const safePage = Math.min(page, totalPages)
  const pageItems = useMemo(
    () => paginateQuestionsLocally(filtered, safePage, pageSize),
    [filtered, safePage, pageSize],
  )

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const patchFilters = (patch: Partial<QuestionListFilters>) => {
    setFilters((current) => ({ ...current, ...patch }))
    setPage(1)
  }

  const handleClearFilters = () => {
    setFilters(EMPTY_FILTERS)
    setPage(1)
  }

  const createHref = selectedTestId
    ? `${PRUEBAS_HOME_HREF}/preguntas/nueva?testId=${encodeURIComponent(selectedTestId)}`
    : `${PRUEBAS_HOME_HREF}/preguntas/nueva`

  const isLoading = isLoadingTests || (Boolean(selectedTestId) && isLoadingQuestions)

  if (isLoadingTests && tests.length === 0 && !loadError) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <PortalPageHeader
          id="pruebas-questions"
          title={t("title")}
          description={t("description")}
        />
        <p className="sr-only" role="status">
          {t("states.loading")}
        </p>
        <LoadingSkeleton rows={5} />
      </div>
    )
  }

  if (loadError && tests.length === 0) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <PortalPageHeader
          id="pruebas-questions"
          title={t("title")}
          description={t("description")}
        />
        <ErrorState
          title={t("states.errorTitle")}
          description={loadError || t("states.errorDescription")}
          action={
            <button
              type="button"
              onClick={() => void loadTests()}
              className="inline-flex min-h-11 items-center rounded-md border border-border bg-background px-4 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
            >
              {t("states.retry")}
            </button>
          }
        />
      </div>
    )
  }

  if (tests.length === 0) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <PortalPageHeader
          id="pruebas-questions"
          title={t("title")}
          description={t("description")}
        />
        <EmptyState
          title={t("states.noTestsTitle")}
          description={t("states.noTestsDescription")}
          action={
            <Link
              href={`${PRUEBAS_HOME_HREF}/evaluaciones/nueva`}
              className="inline-flex h-11 items-center justify-center rounded-md bg-vo-purple px-6 font-sans text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
            >
              {t("states.createTest")}
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <PortalPageHeader
        id="pruebas-questions"
        title={t("title")}
        description={t("description")}
        actions={
          <Link
            href={createHref}
            aria-disabled={!selectedTestId}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-md bg-vo-purple px-6 font-sans text-sm font-medium text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 ${
              selectedTestId
                ? "hover:bg-vo-purple"
                : "pointer-events-none opacity-50"
            }`}
          >
            <Plus className="size-4" aria-hidden />
            {t("create")}
          </Link>
        }
      />

      <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-3 md:p-4 sm:max-w-md">
        <label
          htmlFor="pruebas-q-test"
          className="font-sans text-sm font-medium text-foreground"
        >
          {t("filters.test")}
        </label>
        <select
          id="pruebas-q-test"
          className={CONTROL_CLASS}
          value={selectedTestId}
          onChange={(event) => selectTest(event.target.value)}
          disabled={isLoadingTests}
        >
          <option value="">{t("filters.selectTest")}</option>
          {tests.map((test) => (
            <option key={test.id} value={test.id}>
              {test.title}
            </option>
          ))}
        </select>
      </div>

      {!selectedTestId ? (
        <EmptyState
          title={t("states.selectTestTitle")}
          description={t("states.selectTestDescription")}
        />
      ) : loadError ? (
        <ErrorState
          title={t("states.errorTitle")}
          description={loadError || t("states.errorDescription")}
          action={
            <button
              type="button"
              onClick={() => void loadQuestions()}
              className="inline-flex min-h-11 items-center rounded-md border border-border bg-background px-4 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
            >
              {t("states.retry")}
            </button>
          }
        />
      ) : isLoadingQuestions && questions.length === 0 ? (
        <LoadingSkeleton rows={4} />
      ) : (
        <>
          <ResponsiveFilters
            toggleLabel={t("filters.toggle")}
            title={t("filters.title")}
            regionLabel={t("filters.regionLabel")}
            hasActiveFilters={filtersHaveValues(filters)}
            disabled={isLoading}
            desktopClassName="w-full rounded-xl border border-border bg-card p-3 md:p-4"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label
                  htmlFor="pruebas-q-search"
                  className="font-sans text-sm font-medium text-foreground"
                >
                  {t("search")}
                </label>
                <input
                  id="pruebas-q-search"
                  type="search"
                  className={CONTROL_CLASS}
                  placeholder={t("searchPlaceholder")}
                  value={filters.query}
                  onChange={(event) =>
                    patchFilters({ query: event.target.value })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="pruebas-q-kind"
                  className="font-sans text-sm font-medium text-foreground"
                >
                  {t("filters.kind")}
                </label>
                <select
                  id="pruebas-q-kind"
                  className={CONTROL_CLASS}
                  value={filters.kind ?? ""}
                  onChange={(event) =>
                    patchFilters({
                      kind: (event.target.value || null) as QuestionKind | null,
                    })
                  }
                >
                  <option value="">{t("filters.all")}</option>
                  {BANK_QUESTION_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {t(`kind.${kind}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {filtersHaveValues(filters) ? (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inline-flex min-h-11 items-center rounded-md border border-border bg-background px-4 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
                >
                  {t("filters.clear")}
                </button>
              </div>
            ) : null}
          </ResponsiveFilters>

          {filtered.length === 0 ? (
            <EmptyState
              title={
                filtersHaveValues(filters)
                  ? t("states.filterEmptyTitle")
                  : t("states.emptyTitle")
              }
              description={
                filtersHaveValues(filters)
                  ? t("states.filterEmptyDescription")
                  : t("states.emptyDescription")
              }
              action={
                filtersHaveValues(filters) ? (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="inline-flex min-h-11 items-center rounded-md border border-border bg-background px-4 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
                  >
                    {t("filters.clear")}
                  </button>
                ) : (
                  <Link
                    href={createHref}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-vo-purple px-6 font-sans text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
                  >
                    <Plus className="size-4" aria-hidden />
                    {t("create")}
                  </Link>
                )
              }
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-xl border border-border bg-card lg:block">
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("table.prompt")}
                      </th>
                      <th className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("table.kind")}
                      </th>
                      <th className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("table.actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((question) => {
                      const editHref = `${PRUEBAS_HOME_HREF}/preguntas/${question.id}/editar?testId=${encodeURIComponent(selectedTestId)}`
                      return (
                        <tr
                          key={question.id}
                          className="border-b border-border last:border-b-0"
                          data-testid="question-row"
                          data-kind={question.kind}
                        >
                          <td className="px-4 py-3 font-sans text-sm font-medium text-foreground">
                            <span className="line-clamp-2">{question.prompt}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 font-sans text-xs font-medium text-emerald-900">
                              {t(`kind.${question.kind}`)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                className="inline-flex h-11 items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
                                onClick={() => setPreviewQuestion(question)}
                              >
                                {t("table.preview")}
                              </button>
                              <Link
                                href={editHref}
                                className="inline-flex h-11 items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
                              >
                                {t("table.edit")}
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <ul
                className="grid grid-cols-1 gap-3 lg:hidden"
                data-testid="question-cards"
              >
                {pageItems.map((question) => {
                  const editHref = `${PRUEBAS_HOME_HREF}/preguntas/${question.id}/editar?testId=${encodeURIComponent(selectedTestId)}`
                  return (
                    <li key={question.id}>
                      <article
                        className="glass-card flex flex-col gap-3 rounded-2xl p-4"
                        data-testid="question-card"
                        data-kind={question.kind}
                      >
                        <p className="font-sans text-sm font-medium text-foreground">
                          {question.prompt}
                        </p>
                        <span className="inline-flex w-fit rounded-full bg-emerald-100 px-2.5 py-1 font-sans text-xs font-medium text-emerald-900">
                          {t(`kind.${question.kind}`)}
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="inline-flex h-11 items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
                            onClick={() => setPreviewQuestion(question)}
                          >
                            {t("table.preview")}
                          </button>
                          <Link
                            href={editHref}
                            className="inline-flex h-11 items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
                          >
                            {t("table.edit")}
                          </Link>
                        </div>
                      </article>
                    </li>
                  )
                })}
              </ul>

              <ListPaginationBar
                page={safePage}
                pageSize={pageSize}
                totalCount={filtered.length}
                loading={isLoading}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size)
                  setPage(1)
                }}
                labels={{
                  perPage: t("pagination.perPage"),
                  pageSizeAria: t("pagination.pageSizeAria"),
                  regionAria: t("pagination.regionAria"),
                  summary: t("pagination.summary", {
                    page: safePage,
                    totalPages,
                  }),
                  prev: t("pagination.prev"),
                  next: t("pagination.next"),
                  count: t("pagination.count", { count: filtered.length }),
                }}
              />
            </>
          )}
        </>
      )}

      <Modal
        isOpen={previewQuestion !== null}
        onClose={() => setPreviewQuestion(null)}
        title={t("preview.title")}
        size="lg"
      >
        {previewQuestion ? (
          <QuestionCandidatePreview question={previewQuestion} />
        ) : null}
      </Modal>

      <Snackbar
        open={snackbar.open}
        variant={snackbar.variant}
        message={snackbar.message}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
      />
    </div>
  )
}
