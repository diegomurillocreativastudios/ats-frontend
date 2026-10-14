"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"

import { ConfirmDialog } from "@/components/pruebas/shared/confirm-dialog"
import { EmptyState } from "@/components/pruebas/shared/empty-state"
import { ErrorState } from "@/components/pruebas/shared/error-state"
import { LoadingSkeleton } from "@/components/pruebas/shared/loading-skeleton"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import Snackbar from "@/components/ui/Snackbar"
import {
  buildActiveLinkedVersionOptions,
  buildAssignmentCandidateRows,
  defaultExpiresAtYmd,
  expiresAtIsoFromYmd,
  isAllowedAttemptsValid,
  isExpiresAtValid,
  partitionVacanciesForLinking,
  resolveCompanyName,
  type AssignCandidateRow,
} from "@/lib/pruebas/assignments"
import { MOCK_NOW } from "@/lib/pruebas/mock-fixtures"
import {
  assign,
  listApplications,
  listAssignments,
  listCandidates,
  listCompanies,
  listLinks,
  listTests,
  listVacancies,
  listVersions,
  MockServiceError,
} from "@/lib/pruebas/mock-service"
import { parseSafeRrhhReturnTo } from "@/lib/pruebas/reports"
import type {
  EligibilityReason,
  MockApplication,
  MockAssessmentLink,
  MockAssessmentTest,
  MockAssessmentVersion,
  MockAssignment,
  MockCandidateProfile,
  MockCompany,
  MockVacancy,
} from "@/lib/pruebas/types"

const CONTROL_CLASS =
  "h-11 w-full rounded-md border border-border bg-background px-3 font-sans text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"

const ELIGIBILITY_REASON_KEYS = new Set<EligibilityReason>([
  "vacancy_mismatch",
  "application_inactive",
  "application_final",
  "vacancy_closed",
  "link_inactive",
  "test_not_published",
  "duplicate_assignment",
])

export function PruebasAssignmentsScreen() {
  const t = useTranslations("PruebasPortal.assignments")
  const locale = useLocale()
  const searchParams = useSearchParams()
  const returnTo = parseSafeRrhhReturnTo(searchParams.get("returnTo"))

  const [applications, setApplications] = useState<MockApplication[]>([])
  const [assignments, setAssignments] = useState<MockAssignment[]>([])
  const [candidates, setCandidates] = useState<MockCandidateProfile[]>([])
  const [links, setLinks] = useState<MockAssessmentLink[]>([])
  const [tests, setTests] = useState<MockAssessmentTest[]>([])
  const [versions, setVersions] = useState<MockAssessmentVersion[]>([])
  const [vacancies, setVacancies] = useState<MockVacancy[]>([])
  const [companies, setCompanies] = useState<MockCompany[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isStoreEmpty, setIsStoreEmpty] = useState(false)

  const [vacancyId, setVacancyId] = useState("")
  const [versionId, setVersionId] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expiresYmd, setExpiresYmd] = useState(() =>
    defaultExpiresAtYmd(MOCK_NOW),
  )
  const [allowedAttempts, setAllowedAttempts] = useState(1)
  const [formError, setFormError] = useState<string | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isConfirmLoading, setIsConfirmLoading] = useState(false)
  const [preselectApplied, setPreselectApplied] = useState(false)

  const [snackbar, setSnackbar] = useState({
    open: false,
    variant: "success" as "success" | "error",
    message: "",
  })

  const load = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const [
        applicationRows,
        assignmentRows,
        candidateRows,
        linkRows,
        testRows,
        versionRows,
        vacancyRows,
        companyRows,
      ] = await Promise.all([
        listApplications(),
        listAssignments(),
        listCandidates(),
        listLinks(),
        listTests(),
        listVersions(),
        listVacancies(),
        listCompanies(),
      ])
      setApplications(applicationRows)
      setAssignments(assignmentRows)
      setCandidates(candidateRows)
      setLinks(linkRows)
      setTests(testRows)
      setVersions(versionRows)
      setVacancies(vacancyRows)
      setCompanies(companyRows)
      setIsStoreEmpty(
        vacancyRows.length === 0 &&
          testRows.length === 0 &&
          applicationRows.length === 0,
      )
    } catch (error) {
      setApplications([])
      setAssignments([])
      setCandidates([])
      setLinks([])
      setTests([])
      setVersions([])
      setVacancies([])
      setCompanies([])
      setIsStoreEmpty(false)
      setLoadError(
        error instanceof MockServiceError
          ? t("errors.scenario_error")
          : t("errors.generic"),
      )
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const { open: openVacancies, excluded: excludedVacancies } = useMemo(
    () => partitionVacanciesForLinking(vacancies, companies),
    [vacancies, companies],
  )

  const versionOptions = useMemo(
    () =>
      buildActiveLinkedVersionOptions(vacancyId, links, tests, versions),
    [vacancyId, links, tests, versions],
  )

  const rows = useMemo(
    () =>
      buildAssignmentCandidateRows({
        vacancyId,
        testVersionId: versionId,
        applications,
        candidates,
        vacancies,
        links,
        tests,
        versions,
        assignments,
      }),
    [
      vacancyId,
      versionId,
      applications,
      candidates,
      vacancies,
      links,
      tests,
      versions,
      assignments,
    ],
  )

  const eligibleRows = useMemo(
    () => rows.filter((row) => row.isEligible),
    [rows],
  )

  useEffect(() => {
    if (preselectApplied || isLoading || openVacancies.length === 0) return
    const fromQuery = searchParams.get("vacancyId")
    if (
      fromQuery &&
      openVacancies.some((item) => item.vacancyId === fromQuery)
    ) {
      setVacancyId(fromQuery)
    }
    setPreselectApplied(true)
  }, [preselectApplied, isLoading, openVacancies, searchParams])

  useEffect(() => {
    if (!versionId) return
    if (!versionOptions.some((option) => option.versionId === versionId)) {
      setVersionId("")
      setSelectedIds(new Set())
    }
  }, [versionId, versionOptions])

  useEffect(() => {
    setSelectedIds((current) => {
      if (current.size === 0) return current
      const eligibleIds = new Set(eligibleRows.map((row) => row.applicationId))
      const next = new Set(
        [...current].filter((id) => eligibleIds.has(id)),
      )
      return next.size === current.size ? current : next
    })
  }, [eligibleRows])

  const selectedVacancy = openVacancies.find(
    (item) => item.vacancyId === vacancyId,
  )
  const selectedVersion = versionOptions.find(
    (item) => item.versionId === versionId,
  )
  const companyName = resolveCompanyName(vacancyId, vacancies, companies)
  const selectedPreview = rows.filter((row) =>
    selectedIds.has(row.applicationId),
  )

  const reasonLabel = (reason: EligibilityReason | null) => {
    if (!reason || !ELIGIBILITY_REASON_KEYS.has(reason)) {
      return t("reasons.unknown")
    }
    return t(`reasons.${reason}` as "reasons.duplicate_assignment")
  }

  const showToast = (variant: "success" | "error", message: string) => {
    setSnackbar({ open: true, variant, message })
  }

  const toggleRow = (row: AssignCandidateRow) => {
    if (!row.isEligible) return
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(row.applicationId)) {
        next.delete(row.applicationId)
      } else {
        next.add(row.applicationId)
      }
      return next
    })
    setFormError(null)
  }

  const selectAllEligible = () => {
    setSelectedIds(new Set(eligibleRows.map((row) => row.applicationId)))
    setFormError(null)
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setFormError(null)
  }

  const openConfirm = () => {
    setFormError(null)
    if (!vacancyId) {
      setFormError(t("validation.vacancyRequired"))
      return
    }
    if (!versionId) {
      setFormError(t("validation.versionRequired"))
      return
    }
    if (selectedIds.size === 0) {
      setFormError(t("validation.selectionRequired"))
      return
    }
    if (!isExpiresAtValid(expiresYmd, MOCK_NOW)) {
      setFormError(t("validation.expiresInvalid"))
      return
    }
    if (!isAllowedAttemptsValid(allowedAttempts)) {
      setFormError(t("validation.attemptsInvalid"))
      return
    }
    setIsConfirmOpen(true)
  }

  const handleConfirm = async () => {
    setIsConfirmLoading(true)
    try {
      const result = await assign({
        vacancyId,
        testVersionId: versionId,
        applicationIds: [...selectedIds],
        expiresAt: expiresAtIsoFromYmd(expiresYmd, MOCK_NOW),
        allowedAttempts,
      })
      if (result.ok === false) {
        const names = result.failures
          .map((failure) => {
            const row = rows.find(
              (item) => item.applicationId === failure.applicationId,
            )
            const name = row?.fullName ?? failure.applicationId
            return t("toasts.failureItem", {
              name,
              reason: reasonLabel(failure.reason),
            })
          })
          .join(t("toasts.failureSeparator"))
        showToast(
          "error",
          t("toasts.rejected", { details: names || t("errors.generic") }),
        )
        setIsConfirmOpen(false)
        return
      }
      showToast(
        "success",
        t("toasts.assigned", { count: result.assignments.length }),
      )
      setSelectedIds(new Set())
      setIsConfirmOpen(false)
      await load()
    } catch (error) {
      showToast(
        "error",
        error instanceof MockServiceError && error.code === "link_missing"
          ? t("errors.link_missing")
          : error instanceof MockServiceError && error.code === "scenario_error"
            ? t("errors.scenario_error")
            : t("errors.generic"),
      )
      setIsConfirmOpen(false)
    } finally {
      setIsConfirmLoading(false)
    }
  }

  const formattedExpires = useMemo(() => {
    if (!isExpiresAtValid(expiresYmd, MOCK_NOW)) return expiresYmd
    try {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
      }).format(new Date(expiresAtIsoFromYmd(expiresYmd, MOCK_NOW)))
    } catch {
      return expiresYmd
    }
  }, [expiresYmd, locale])

  if (isLoading && vacancies.length === 0 && !loadError) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <PortalPageHeader
          id="pruebas-assignments"
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

  if (loadError) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <PortalPageHeader
          id="pruebas-assignments"
          title={t("title")}
          description={t("description")}
        />
        <ErrorState
          title={t("states.errorTitle")}
          description={loadError || t("states.errorDescription")}
          action={
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex min-h-11 items-center rounded-md border border-border bg-background px-4 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
            >
              {t("states.retry")}
            </button>
          }
        />
      </div>
    )
  }

  if (isStoreEmpty) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <PortalPageHeader
          id="pruebas-assignments"
          title={t("title")}
          description={t("description")}
        />
        <EmptyState
          title={t("states.emptyTitle")}
          description={t("states.emptyDescription")}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 px-4 py-6 md:px-6 lg:px-8">
      <div className="flex flex-col gap-3">
        {returnTo ? (
          <Link
            href={returnTo}
            className="inline-flex min-h-11 w-fit items-center justify-center rounded-md border border-border bg-background px-4 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
            data-testid="assignments-back-to-rrhh"
            aria-label={t("backToRrhhAria")}
          >
            {t("backToRrhh")}
          </Link>
        ) : null}
        <PortalPageHeader
          id="pruebas-assignments"
          title={t("title")}
          description={t("description")}
        />
      </div>

      <aside
        className="rounded-xl border border-border bg-muted/40 px-4 py-3 font-sans text-sm text-foreground"
        role="note"
        data-testid="assignments-scope-notice"
      >
        {t("scopeNotice")}
      </aside>

      <section
        aria-labelledby="pruebas-assignments-form-heading"
        className="glass-card flex flex-col gap-4 rounded-2xl p-4 md:p-6"
      >
        <h2
          id="pruebas-assignments-form-heading"
          className="font-display text-lg font-semibold text-foreground"
        >
          {t("form.title")}
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 font-sans text-sm">
            <span className="font-medium text-foreground">
              {t("form.vacancy")}
            </span>
            <select
              className={CONTROL_CLASS}
              value={vacancyId}
              onChange={(event) => {
                setVacancyId(event.target.value)
                setVersionId("")
                setSelectedIds(new Set())
                setFormError(null)
              }}
              data-testid="assignments-vacancy-select"
            >
              <option value="">{t("form.vacancyPlaceholder")}</option>
              {openVacancies.map((option) => (
                <option key={option.vacancyId} value={option.vacancyId}>
                  {option.title}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 font-sans text-sm">
            <span className="font-medium text-foreground">
              {t("form.version")}
            </span>
            <select
              className={CONTROL_CLASS}
              value={versionId}
              disabled={!vacancyId || versionOptions.length === 0}
              onChange={(event) => {
                setVersionId(event.target.value)
                setSelectedIds(new Set())
                setFormError(null)
              }}
              data-testid="assignments-version-select"
            >
              <option value="">{t("form.versionPlaceholder")}</option>
              {versionOptions.map((option) => (
                <option key={option.versionId} value={option.versionId}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p
          className="font-sans text-sm text-muted-foreground"
          data-testid="assignments-company-summary"
        >
          {selectedVacancy && companyName
            ? t("form.companySummary", { company: companyName })
            : t("form.companyEmpty")}
        </p>

        {excludedVacancies.length > 0 ? (
          <p
            className="font-sans text-sm text-muted-foreground"
            data-testid="assignments-excluded-vacancies"
          >
            {t("form.excludedVacancies", {
              list: excludedVacancies
                .map((item) =>
                  t("form.excludedVacancyItem", { title: item.title }),
                )
                .join(t("form.excludedListSeparator")),
            })}
          </p>
        ) : null}

        {vacancyId && versionOptions.length === 0 ? (
          <p
            className="font-sans text-sm text-muted-foreground"
            role="status"
            data-testid="assignments-no-active-links"
          >
            {t("form.noActiveLinks")}
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 font-sans text-sm">
            <span className="font-medium text-foreground">
              {t("form.expiresAt")}
            </span>
            <input
              type="date"
              className={CONTROL_CLASS}
              value={expiresYmd}
              onChange={(event) => {
                setExpiresYmd(event.target.value)
                setFormError(null)
              }}
              data-testid="assignments-expires"
            />
            <span className="text-xs text-muted-foreground">
              {t("form.expiresHint", { days: 14 })}
            </span>
          </label>

          <label className="flex flex-col gap-1.5 font-sans text-sm">
            <span className="font-medium text-foreground">
              {t("form.attempts")}
            </span>
            <input
              type="number"
              min={1}
              step={1}
              className={CONTROL_CLASS}
              value={allowedAttempts}
              onChange={(event) => {
                setAllowedAttempts(Number(event.target.value))
                setFormError(null)
              }}
              data-testid="assignments-attempts"
            />
          </label>
        </div>
      </section>

      <section
        aria-labelledby="pruebas-assignments-candidates-heading"
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2
            id="pruebas-assignments-candidates-heading"
            className="font-display text-lg font-semibold text-foreground"
          >
            {t("candidates.title")}
          </h2>
          <p
            className="font-sans text-sm text-muted-foreground"
            data-testid="assignments-selection-count"
          >
            {t("candidates.selectedCount", { count: selectedIds.size })}
          </p>
        </div>

        {!vacancyId || !versionId ? (
          <EmptyState
            title={t("states.selectPromptTitle")}
            description={t("states.selectPromptDescription")}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title={t("states.noApplicationsTitle")}
            description={t("states.noApplicationsDescription")}
          />
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectAllEligible}
                disabled={eligibleRows.length === 0}
                className="inline-flex h-11 items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="assignments-select-eligible"
              >
                {t("candidates.selectEligible")}
              </button>
              <button
                type="button"
                onClick={clearSelection}
                disabled={selectedIds.size === 0}
                className="inline-flex h-11 items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="assignments-clear-selection"
              >
                {t("candidates.clearSelection")}
              </button>
            </div>

            <div className="hidden overflow-x-auto rounded-xl border border-border lg:block">
              <table className="w-full min-w-[640px] border-collapse text-left font-sans text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-foreground">
                      <span className="sr-only">{t("candidates.select")}</span>
                    </th>
                    <th className="px-4 py-3 font-medium text-foreground">
                      {t("candidates.name")}
                    </th>
                    <th className="px-4 py-3 font-medium text-foreground">
                      {t("candidates.email")}
                    </th>
                    <th className="px-4 py-3 font-medium text-foreground">
                      {t("candidates.stage")}
                    </th>
                    <th className="px-4 py-3 font-medium text-foreground">
                      {t("candidates.eligibility")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.applicationId}
                      className="border-t border-border"
                      data-testid="assignment-candidate-row"
                      data-application-id={row.applicationId}
                      data-eligible={row.isEligible ? "true" : "false"}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="h-5 w-5 rounded border-border"
                          checked={selectedIds.has(row.applicationId)}
                          disabled={!row.isEligible}
                          onChange={() => toggleRow(row)}
                          aria-label={t("candidates.selectAria", {
                            name: row.fullName,
                          })}
                          data-testid={`assignment-check-${row.applicationId}`}
                        />
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {row.fullName}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.email}
                      </td>
                      <td className="px-4 py-3 text-foreground">{row.stage}</td>
                      <td className="px-4 py-3">
                        {row.isEligible ? (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900">
                            {t("candidates.eligible")}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                            {reasonLabel(row.reason)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="flex flex-col gap-3 lg:hidden">
              {rows.map((row) => (
                <li
                  key={row.applicationId}
                  className="glass-card flex flex-col gap-3 rounded-2xl p-4"
                  data-testid="assignment-candidate-row"
                  data-application-id={row.applicationId}
                  data-eligible={row.isEligible ? "true" : "false"}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 rounded border-border"
                      checked={selectedIds.has(row.applicationId)}
                      disabled={!row.isEligible}
                      onChange={() => toggleRow(row)}
                      aria-label={t("candidates.selectAria", {
                        name: row.fullName,
                      })}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-base font-semibold text-foreground">
                        {row.fullName}
                      </p>
                      <p className="font-sans text-sm text-muted-foreground">
                        {row.email}
                      </p>
                      <p className="mt-1 font-sans text-sm text-foreground">
                        {row.stage}
                      </p>
                      <p className="mt-2">
                        {row.isEligible ? (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900">
                            {t("candidates.eligible")}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                            {reasonLabel(row.reason)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {selectedPreview.length > 0 ? (
          <aside
            className="rounded-xl border border-border bg-muted/30 px-4 py-3"
            data-testid="assignments-preview"
          >
            <p className="font-sans text-sm font-medium text-foreground">
              {t("preview.title")}
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 font-sans text-sm text-foreground">
              {selectedPreview.map((row) => (
                <li key={row.applicationId}>{row.fullName}</li>
              ))}
            </ul>
            <p className="mt-2 font-sans text-sm text-muted-foreground">
              {t("preview.summary", {
                version: selectedVersion?.label ?? "",
                vacancy: selectedVacancy?.title ?? "",
                expires: formattedExpires,
                attempts: allowedAttempts,
              })}
            </p>
            <p className="mt-1 font-sans text-xs text-muted-foreground">
              {t("preview.noEmail")}
            </p>
          </aside>
        ) : null}

        {formError ? (
          <p className="font-sans text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}

        <div>
          <button
            type="button"
            onClick={openConfirm}
            className="inline-flex h-11 items-center justify-center rounded-md bg-vo-purple px-6 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
            data-testid="assignments-submit"
          >
            {t("form.submit")}
          </button>
        </div>
      </section>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title={t("confirm.title")}
        description={t("confirm.description", {
          count: selectedIds.size,
          version: selectedVersion?.label ?? "",
          vacancy: selectedVacancy?.title ?? "",
          expires: formattedExpires,
          attempts: allowedAttempts,
        })}
        confirmLabel={t("confirm.confirm")}
        cancelLabel={t("confirm.cancel")}
        onConfirm={() => void handleConfirm()}
        onClose={() => {
          if (isConfirmLoading) return
          setIsConfirmOpen(false)
        }}
        isConfirmLoading={isConfirmLoading}
      />

      <Snackbar
        open={snackbar.open}
        variant={snackbar.variant}
        message={snackbar.message}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
      />
    </div>
  )
}
