"use client"

import Link from "next/link"
import { useCallback, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { ArrowLeft, Briefcase, Eye, Loader2, Sparkles, Trash2 } from "lucide-react"
import CandidateSidebar from "@/components/candidato/CandidateSidebar"
import CandidateTopbar from "@/components/candidato/CandidateTopbar"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import DeleteConfirmModal from "@/components/rrhh/DeleteConfirmModal"
import { Button } from "@/components/ui/Button"
import { useCandidateSnackbar } from "@/components/candidato/candidate-portal-snackbar"
import { ProfileComparisonPanel } from "@/components/candidato/profile-tailoring/ProfileComparisonPanel"
import { AdaptedProfileEditor } from "@/components/candidato/profile-tailoring/AdaptedProfileEditor"
import { VersionLabelEditor } from "@/components/candidato/profile-tailoring/VersionLabelEditor"
import { useProfileVersions } from "@/hooks/use-profile-versions"
import { useCandidateProfile } from "@/hooks/useCandidateProfile"
import {
  adaptedProfileToFormState,
  formStateToDisplayProfile,
  type ProfileVersionSummary,
} from "@/lib/candidate-profile-version"
import { buildCandidateProfileSaveBody, type FullProfileFormInput } from "@/lib/candidate-profile"
import { getApiErrorMessage } from "@/lib/api-error"

function formatScore(score: number | null): string | null {
  if (score == null || Number.isNaN(score)) return null
  const percent = score <= 1 ? Math.round(score * 100) : Math.round(score)
  return `${percent}%`
}

function formatDate(value: string, locale: string): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function ProfileVersionHistoryContent() {
  const t = useTranslations("CandidatePortal.profileTailoring.history")
  const tRoot = useTranslations("CandidatePortal.profileTailoring")
  const { showSnackbar } = useCandidateSnackbar()
  const { profile: currentProfile, loading: profileLoading } = useCandidateProfile()
  const {
    versions,
    loading,
    error,
    selectedVersion,
    detailLoading,
    detailError,
    mutating,
    loadDetail,
    saveVersion,
    removeVersion,
    clearSelectedVersion,
  } = useProfileVersions()

  const [adaptedForm, setAdaptedForm] = useState<FullProfileFormInput | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProfileVersionSummary | null>(null)
  const [renamingVersionId, setRenamingVersionId] = useState<string | null>(null)

  const handleViewVersion = useCallback(
    async (versionId: string) => {
      const detail = await loadDetail(versionId)
      if (detail) {
        setAdaptedForm(adaptedProfileToFormState(detail.profileSnapshot))
      }
    },
    [loadDetail]
  )

  const handleSaveVersion = useCallback(async () => {
    if (!selectedVersion || !adaptedForm) return
    try {
      await saveVersion(selectedVersion.id, {
        profileSnapshot: buildCandidateProfileSaveBody(adaptedForm),
      })
      showSnackbar(t("toasts.saved"), "success")
    } catch (err: unknown) {
      showSnackbar(getApiErrorMessage(err) || t("toasts.saveError"), "error")
    }
  }, [adaptedForm, saveVersion, selectedVersion, showSnackbar, t])

  const handleRenameVersion = useCallback(
    async (versionId: string, label: string | null) => {
      setRenamingVersionId(versionId)
      try {
        await saveVersion(versionId, { label })
        showSnackbar(t("toasts.renamed"), "success")
      } catch (err: unknown) {
        showSnackbar(getApiErrorMessage(err) || t("toasts.renameError"), "error")
        throw err
      } finally {
        setRenamingVersionId(null)
      }
    },
    [saveVersion, showSnackbar, t]
  )

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await removeVersion(deleteTarget.id)
      showSnackbar(t("toasts.deleted"), "success")
      if (selectedVersion?.id === deleteTarget.id) {
        clearSelectedVersion()
        setAdaptedForm(null)
      }
    } catch (err: unknown) {
      showSnackbar(getApiErrorMessage(err) || t("toasts.deleteError"), "error")
    } finally {
      setDeleteTarget(null)
    }
  }, [
    clearSelectedVersion,
    deleteTarget,
    removeVersion,
    selectedVersion?.id,
    showSnackbar,
    t,
  ])

  const patchAdaptedForm = useCallback((patch: Partial<FullProfileFormInput>) => {
    setAdaptedForm((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const adaptedDisplayProfile = useMemo(
    () => (adaptedForm ? formStateToDisplayProfile(adaptedForm) : null),
    [adaptedForm]
  )

  const pageContent = (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <PortalPageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Link
            href="/portal-candidato/adecuar-perfil"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {t("backToTailoring")}
          </Link>
        }
      />

      {loading ? (
        <p className="flex items-center gap-2 font-sans text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t("loading")}
        </p>
      ) : null}

      {error ? (
        <p className="font-sans text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && versions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="font-sans text-sm text-muted-foreground">{t("empty")}</p>
          <Link
            href="/portal-candidato/adecuar-perfil"
            className="mt-4 inline-flex font-sans text-sm font-medium text-vo-purple hover:underline"
          >
            {t("emptyCta")}
          </Link>
        </div>
      ) : null}

      {versions.length > 0 ? (
        <ul
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          aria-label={t("listAria")}
        >
          {versions.map((version, index) => {
            const score = formatScore(version.estimatedMatchScore)
            const isSelected = selectedVersion?.id === version.id
            const isLatest = index === 0
            return (
              <li key={version.id}>
                <article
                  className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border p-5 motion-safe:transition-all motion-safe:duration-200 ${
                    isSelected
                      ? "border-vo-purple/50 bg-linear-to-br from-vo-purple/[0.07] via-white to-white shadow-md ring-1 ring-vo-purple/20"
                      : "border-border/80 bg-white shadow-sm hover:-translate-y-0.5 hover:border-vo-purple/30 hover:shadow-md"
                  }`}
                >
                  <div
                    className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl motion-safe:transition-opacity motion-safe:duration-200 ${
                      isSelected
                        ? "bg-vo-purple/15 opacity-100"
                        : "bg-vo-purple/10 opacity-0 group-hover:opacity-100"
                    }`}
                    aria-hidden
                  />

                  <div className="relative flex items-start gap-3">
                    <span
                      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl motion-safe:transition-colors ${
                        isSelected
                          ? "bg-vo-purple/15 text-vo-purple"
                          : "bg-muted text-muted-foreground group-hover:bg-vo-purple/10 group-hover:text-vo-purple"
                      }`}
                      aria-hidden
                    >
                      <Sparkles className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <VersionLabelEditor
                          version={version}
                          saving={renamingVersionId === version.id}
                          onSave={handleRenameVersion}
                        />
                        {isLatest ? (
                          <span className="inline-flex shrink-0 items-center rounded-full border border-vo-purple/25 bg-vo-purple/12 px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wide text-vo-purple">
                            {t("latestBadge")}
                          </span>
                        ) : null}
                      </div>
                      {version.vacancyTitle ? (
                        <p className="mt-1 flex items-center gap-1.5 font-sans text-xs text-muted-foreground">
                          <Briefcase className="h-3 w-3 shrink-0" aria-hidden />
                          <span className="truncate">{version.vacancyTitle}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="relative mt-4 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 font-sans text-[11px] font-medium text-muted-foreground">
                      {t("meta", {
                        number: version.versionNumber,
                        date: formatDate(version.createdAt, "es"),
                      })}
                    </span>
                    {score ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-vo-purple/25 bg-vo-purple/10 px-2.5 py-1 font-sans text-[11px] font-semibold text-vo-purple">
                        {tRoot("comparison.estimatedScore", { score })}
                      </span>
                    ) : null}
                  </div>

                  <div className="relative mt-5 flex items-center gap-2 border-t border-border/60 pt-4">
                    <button
                      type="button"
                      onClick={() => void handleViewVersion(version.id)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-vo-purple px-3 py-2 font-sans text-xs font-semibold text-white shadow-sm motion-safe:transition-colors hover:bg-vo-purple-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
                      aria-busy={detailLoading && isSelected}
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden />
                      {t("actions.view")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(version)}
                      aria-label={t("actions.delete")}
                      title={t("actions.delete")}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/70 text-muted-foreground motion-safe:transition-colors hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 focus-visible:ring-offset-2"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      ) : null}

      {detailError ? (
        <p className="font-sans text-sm text-destructive" role="alert">
          {detailError}
        </p>
      ) : null}

      {selectedVersion && adaptedForm && adaptedDisplayProfile && currentProfile && !profileLoading ? (
        <section className="flex flex-col gap-6 border-t border-border pt-8">
          <ProfileComparisonPanel
            currentProfile={currentProfile}
            adaptedProfile={adaptedDisplayProfile}
            adaptationSummary={selectedVersion.adaptationSummary}
            changeHighlights={selectedVersion.changeHighlights}
            estimatedMatchScore={selectedVersion.estimatedMatchScore}
            vacancyTitle={selectedVersion.vacancyTitle}
          />
          <details className="rounded-2xl border border-border bg-card">
            <summary className="cursor-pointer list-none px-4 py-3 font-sans text-sm font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
              {tRoot("comparison.editToggle")}
            </summary>
            <div className="border-t border-border p-4">
              <AdaptedProfileEditor
                form={adaptedForm}
                setForm={setAdaptedForm}
                patch={patchAdaptedForm}
                saving={mutating}
              />
            </div>
          </details>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleSaveVersion()}
            disabled={mutating}
            aria-busy={mutating}
          >
            {mutating ? tRoot("actions.savingVersion") : tRoot("actions.saveVersion")}
          </Button>
        </section>
      ) : null}
    </div>
  )

  return (
    <div className="h-screen overflow-hidden bg-background font-sans text-foreground">
      <div className="hidden h-full lg:flex">
        <CandidateSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <CandidateTopbar variant="desktop" breadcrumbLabel={t("title")} />
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            <div className="min-w-0 p-8">{pageContent}</div>
          </main>
        </div>
      </div>

      <div className="flex h-full min-w-0 flex-col overflow-hidden lg:hidden">
        <CandidateTopbar variant="tablet" breadcrumbLabel={t("title")} />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="min-w-0 p-4 md:p-6">{pageContent}</div>
        </main>
      </div>

      <DeleteConfirmModal
        isOpen={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title={t("deleteConfirm.title")}
        message={t("deleteConfirm.message")}
        loading={mutating}
      />
    </div>
  )
}
