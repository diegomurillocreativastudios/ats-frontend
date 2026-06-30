"use client"

import Link from "next/link"
import { useCallback, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { ArrowLeft, Eye, Loader2, Sparkles, Trash2 } from "lucide-react"
import CandidateSidebar from "@/components/candidato/CandidateSidebar"
import CandidateTopbar from "@/components/candidato/CandidateTopbar"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import DeleteConfirmModal from "@/components/rrhh/DeleteConfirmModal"
import { Button } from "@/components/ui/Button"
import { useCandidateSnackbar } from "@/components/candidato/candidate-portal-snackbar"
import { ProfileComparisonPanel } from "@/components/candidato/profile-tailoring/ProfileComparisonPanel"
import { AdaptedProfileEditor } from "@/components/candidato/profile-tailoring/AdaptedProfileEditor"
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

  return (
    <div className="flex min-h-screen bg-background">
      <CandidateSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <CandidateTopbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-8">
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
              <ul className="grid gap-3 md:grid-cols-2" aria-label={t("listAria")}>
                {versions.map((version) => {
                  const score = formatScore(version.estimatedMatchScore)
                  const isSelected = selectedVersion?.id === version.id
                  return (
                    <li key={version.id}>
                      <article
                        className={`rounded-xl border p-4 transition-colors ${
                          isSelected
                            ? "border-vo-purple/50 bg-vo-purple/5"
                            : "border-border bg-card"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-sans text-sm font-semibold text-foreground">
                              {version.label ||
                                version.vacancyTitle ||
                                t("versionFallback", { number: version.versionNumber })}
                            </p>
                            {version.vacancyTitle ? (
                              <p className="mt-0.5 font-sans text-xs text-muted-foreground">
                                {version.vacancyTitle}
                              </p>
                            ) : null}
                            <p className="mt-2 font-sans text-xs text-muted-foreground">
                              {t("meta", {
                                number: version.versionNumber,
                                date: formatDate(version.createdAt, "es"),
                              })}
                            </p>
                            {score ? (
                              <p className="mt-2 inline-flex items-center gap-1 font-sans text-xs font-medium text-vo-purple">
                                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                                {tRoot("comparison.estimatedScore", { score })}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => void handleViewVersion(version.id)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 font-sans text-xs font-medium hover:bg-muted"
                              aria-busy={detailLoading && isSelected}
                            >
                              <Eye className="h-3.5 w-3.5" aria-hidden />
                              {t("actions.view")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(version)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 px-2.5 py-1.5 font-sans text-xs font-medium text-destructive hover:bg-destructive/5"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden />
                              {t("actions.delete")}
                            </button>
                          </div>
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
