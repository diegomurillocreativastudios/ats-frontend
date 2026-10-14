"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"

import { ConfirmDialog } from "@/components/pruebas/shared/confirm-dialog"
import { EmptyState } from "@/components/pruebas/shared/empty-state"
import { ErrorState } from "@/components/pruebas/shared/error-state"
import { LoadingSkeleton } from "@/components/pruebas/shared/loading-skeleton"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import Snackbar from "@/components/ui/Snackbar"
import { formatMockDate } from "@/lib/pruebas/formatters"
import {
  buildLinkListRows,
  buildPublishedVersionOptions,
  partitionVacanciesForLinking,
  type LinkListRow,
} from "@/lib/pruebas/links"
import {
  createLink,
  listCompanies,
  listLinks,
  listTests,
  listVacancies,
  listVersions,
  MockServiceError,
  setLinkActive,
} from "@/lib/pruebas/mock-service"
import type {
  MockAssessmentLink,
  MockAssessmentTest,
  MockAssessmentVersion,
  MockCompany,
  MockVacancy,
} from "@/lib/pruebas/types"

const CONTROL_CLASS =
  "h-11 w-full rounded-md border border-border bg-background px-3 font-sans text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"

type ConfirmKind = "create" | "deactivate" | "reactivate"

const LINK_ERROR_CODES = new Set([
  "duplicate_link",
  "vacancy_closed",
  "version_not_published",
  "test_not_published",
  "not_found",
  "scenario_error",
])

function resolveErrorMessage(
  error: unknown,
  t: ReturnType<typeof useTranslations<"PruebasPortal.links">>,
): string {
  if (error instanceof MockServiceError && LINK_ERROR_CODES.has(error.code)) {
    return t(`errors.${error.code}` as "errors.duplicate_link")
  }
  return t("errors.generic")
}

export function PruebasLinksScreen() {
  const t = useTranslations("PruebasPortal.links")
  const locale = useLocale()
  const searchParams = useSearchParams()

  const [links, setLinks] = useState<MockAssessmentLink[]>([])
  const [tests, setTests] = useState<MockAssessmentTest[]>([])
  const [versions, setVersions] = useState<MockAssessmentVersion[]>([])
  const [vacancies, setVacancies] = useState<MockVacancy[]>([])
  const [companies, setCompanies] = useState<MockCompany[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isStoreEmpty, setIsStoreEmpty] = useState(false)

  const [versionId, setVersionId] = useState("")
  const [vacancyId, setVacancyId] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmKind, setConfirmKind] = useState<ConfirmKind | null>(null)
  const [confirmRow, setConfirmRow] = useState<LinkListRow | null>(null)
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
      const [linkRows, testRows, versionRows, vacancyRows, companyRows] =
        await Promise.all([
          listLinks(),
          listTests(),
          listVersions(),
          listVacancies(),
          listCompanies(),
        ])
      setLinks(linkRows)
      setTests(testRows)
      setVersions(versionRows)
      setVacancies(vacancyRows)
      setCompanies(companyRows)
      setIsStoreEmpty(
        testRows.length === 0 && vacancyRows.length === 0 && linkRows.length === 0,
      )
    } catch (error) {
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

  const versionOptions = useMemo(
    () => buildPublishedVersionOptions(tests, versions),
    [tests, versions],
  )

  const { open: openVacancies, excluded: excludedVacancies } = useMemo(
    () => partitionVacanciesForLinking(vacancies, companies),
    [vacancies, companies],
  )

  const rows = useMemo(
    () => buildLinkListRows(links, tests, versions, vacancies, companies),
    [links, tests, versions, vacancies, companies],
  )

  useEffect(() => {
    if (preselectApplied || isLoading || versionOptions.length === 0) return
    const fromQuery = searchParams.get("version")
    if (!fromQuery) {
      setPreselectApplied(true)
      return
    }
    if (versionOptions.some((option) => option.versionId === fromQuery)) {
      setVersionId(fromQuery)
    }
    setPreselectApplied(true)
  }, [preselectApplied, isLoading, versionOptions, searchParams])

  const selectedVacancy = openVacancies.find(
    (item) => item.vacancyId === vacancyId,
  )
  const selectedVersion = versionOptions.find(
    (item) => item.versionId === versionId,
  )

  const showToast = (variant: "success" | "error", message: string) => {
    setSnackbar({ open: true, variant, message })
  }

  const openCreateConfirm = () => {
    setFormError(null)
    if (!versionId) {
      setFormError(t("validation.versionRequired"))
      return
    }
    if (!vacancyId) {
      setFormError(t("validation.vacancyRequired"))
      return
    }
    setConfirmKind("create")
    setConfirmRow(null)
  }

  const openToggleConfirm = (row: LinkListRow) => {
    setConfirmRow(row)
    setConfirmKind(row.link.active ? "deactivate" : "reactivate")
  }

  const handleConfirm = async () => {
    if (!confirmKind) return
    setIsConfirmLoading(true)
    try {
      if (confirmKind === "create") {
        await createLink({ vacancyId, testVersionId: versionId })
        showToast("success", t("toasts.linked"))
        setVacancyId("")
        setFormError(null)
      } else if (confirmRow) {
        const nextActive = confirmKind === "reactivate"
        await setLinkActive(confirmRow.link.id, nextActive)
        showToast(
          "success",
          nextActive ? t("toasts.reactivated") : t("toasts.deactivated"),
        )
      }
      setConfirmKind(null)
      setConfirmRow(null)
      await load()
    } catch (error) {
      showToast("error", resolveErrorMessage(error, t))
      setConfirmKind(null)
      setConfirmRow(null)
    } finally {
      setIsConfirmLoading(false)
    }
  }

  const confirmTitle =
    confirmKind === "create"
      ? t("confirm.createTitle")
      : confirmKind === "deactivate"
        ? t("confirm.deactivateTitle")
        : t("confirm.reactivateTitle")

  const confirmDescription =
    confirmKind === "create"
      ? t("confirm.createDescription", {
          version: selectedVersion?.label ?? "",
          vacancy: selectedVacancy?.title ?? "",
        })
      : confirmKind === "deactivate"
        ? t("confirm.deactivateDescription", {
            version: confirmRow
              ? `${confirmRow.testTitle} · v${confirmRow.versionNumber}`
              : "",
            vacancy: confirmRow?.vacancyTitle ?? "",
          })
        : t("confirm.reactivateDescription", {
            version: confirmRow
              ? `${confirmRow.testTitle} · v${confirmRow.versionNumber}`
              : "",
            vacancy: confirmRow?.vacancyTitle ?? "",
          })

  const confirmLabel =
    confirmKind === "create"
      ? t("confirm.createConfirm")
      : confirmKind === "deactivate"
        ? t("confirm.deactivateConfirm")
        : t("confirm.reactivateConfirm")

  if (isLoading && links.length === 0 && !loadError) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <PortalPageHeader
          id="pruebas-links"
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
          id="pruebas-links"
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
          id="pruebas-links"
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
      <PortalPageHeader
        id="pruebas-links"
        title={t("title")}
        description={t("description")}
      />

      <section
        aria-labelledby="pruebas-links-form-heading"
        className="glass-card flex flex-col gap-4 rounded-2xl p-4 md:p-6"
      >
        <h2
          id="pruebas-links-form-heading"
          className="font-display text-lg font-semibold text-foreground"
        >
          {t("form.title")}
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 font-sans text-sm">
            <span className="font-medium text-foreground">
              {t("form.version")}
            </span>
            <select
              className={CONTROL_CLASS}
              value={versionId}
              onChange={(event) => {
                setVersionId(event.target.value)
                setFormError(null)
              }}
              data-testid="links-version-select"
            >
              <option value="">{t("form.versionPlaceholder")}</option>
              {versionOptions.map((option) => (
                <option key={option.versionId} value={option.versionId}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 font-sans text-sm">
            <span className="font-medium text-foreground">
              {t("form.vacancy")}
            </span>
            <select
              className={CONTROL_CLASS}
              value={vacancyId}
              onChange={(event) => {
                setVacancyId(event.target.value)
                setFormError(null)
              }}
              data-testid="links-vacancy-select"
            >
              <option value="">{t("form.vacancyPlaceholder")}</option>
              {openVacancies.map((option) => (
                <option key={option.vacancyId} value={option.vacancyId}>
                  {option.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p
          className="font-sans text-sm text-muted-foreground"
          data-testid="links-company-summary"
        >
          {selectedVacancy
            ? t("form.companySummary", { company: selectedVacancy.companyName })
            : t("form.companyEmpty")}
        </p>

        {excludedVacancies.length > 0 ? (
          <p
            className="font-sans text-sm text-muted-foreground"
            data-testid="links-excluded-vacancies"
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

        {formError ? (
          <p className="font-sans text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}

        <div>
          <button
            type="button"
            onClick={openCreateConfirm}
            className="inline-flex h-11 items-center justify-center rounded-md bg-vo-purple px-6 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
            data-testid="links-submit"
          >
            {t("form.submit")}
          </button>
        </div>
      </section>

      <section
        aria-labelledby="pruebas-links-list-heading"
        className="flex flex-col gap-4"
      >
        <h2
          id="pruebas-links-list-heading"
          className="font-display text-lg font-semibold text-foreground"
        >
          {t("list.title")}
        </h2>

        {rows.length === 0 ? (
          <EmptyState
            title={t("states.listEmptyTitle")}
            description={t("states.listEmptyDescription")}
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-xl border border-border lg:block">
              <table className="w-full min-w-[640px] border-collapse text-left font-sans text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-foreground">
                      {t("list.test")}
                    </th>
                    <th className="px-4 py-3 font-medium text-foreground">
                      {t("list.version")}
                    </th>
                    <th className="px-4 py-3 font-medium text-foreground">
                      {t("list.vacancy")}
                    </th>
                    <th className="px-4 py-3 font-medium text-foreground">
                      {t("list.company")}
                    </th>
                    <th className="px-4 py-3 font-medium text-foreground">
                      {t("list.status")}
                    </th>
                    <th className="px-4 py-3 font-medium text-foreground">
                      {t("list.linkedAt")}
                    </th>
                    <th className="px-4 py-3 font-medium text-foreground">
                      {t("list.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.link.id}
                      className="border-t border-border"
                      data-testid="link-row"
                      data-link-id={row.link.id}
                    >
                      <td className="px-4 py-3 text-foreground">
                        {row.testTitle}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {t("list.versionValue", {
                          number: row.versionNumber,
                        })}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {row.vacancyTitle}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {row.companyName}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            row.link.active
                              ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900"
                              : "inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
                          }
                        >
                          {row.link.active
                            ? t("list.statusActive")
                            : t("list.statusInactive")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatMockDate(row.link.linkedAt, locale)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openToggleConfirm(row)}
                          className="inline-flex h-11 items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
                        >
                          {row.link.active
                            ? t("list.deactivate")
                            : t("list.reactivate")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="flex flex-col gap-3 lg:hidden">
              {rows.map((row) => (
                <li
                  key={row.link.id}
                  className="glass-card flex flex-col gap-3 rounded-2xl p-4"
                  data-testid="link-row"
                  data-link-id={row.link.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-display text-base font-semibold text-foreground">
                        {row.testTitle}
                      </p>
                      <p className="font-sans text-sm text-muted-foreground">
                        {t("list.versionValue", {
                          number: row.versionNumber,
                        })}
                      </p>
                    </div>
                    <span
                      className={
                        row.link.active
                          ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900"
                          : "inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
                      }
                    >
                      {row.link.active
                        ? t("list.statusActive")
                        : t("list.statusInactive")}
                    </span>
                  </div>
                  <dl className="grid gap-1 font-sans text-sm">
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">
                        {t("list.vacancy")}
                      </dt>
                      <dd className="text-foreground">{row.vacancyTitle}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">
                        {t("list.company")}
                      </dt>
                      <dd className="text-foreground">{row.companyName}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">
                        {t("list.linkedAt")}
                      </dt>
                      <dd className="text-foreground">
                        {formatMockDate(row.link.linkedAt, locale)}
                      </dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    onClick={() => openToggleConfirm(row)}
                    className="inline-flex h-11 w-full items-center justify-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
                  >
                    {row.link.active
                      ? t("list.deactivate")
                      : t("list.reactivate")}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <ConfirmDialog
        isOpen={confirmKind !== null}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={confirmLabel}
        cancelLabel={t("confirm.cancel")}
        onConfirm={() => void handleConfirm()}
        onClose={() => {
          if (isConfirmLoading) return
          setConfirmKind(null)
          setConfirmRow(null)
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
