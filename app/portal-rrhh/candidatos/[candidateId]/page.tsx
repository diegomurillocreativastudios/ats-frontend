"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { ArrowLeft } from "lucide-react"
import RRHHSidebar from "@/components/rrhh/RRHHSidebar"
import RRHHTopbar from "@/components/rrhh/RRHHTopbar"
import { RecruiterCandidateProfileView } from "@/components/rrhh/recruiter-candidate-profile-view"
import Snackbar from "@/components/ui/Snackbar"
import { useRecruiterCandidateProfile } from "@/hooks/use-recruiter-candidate-profile"
import type { CandidateProfileSaveBody } from "@/lib/candidate-profile"
import { formatCandidatoDetailDocumentTitle } from "@/lib/pageTitles"

export default function CandidatoDetallePage() {
  const t = useTranslations("RecruiterPortal.candidateDetail")
  const tCandidates = useTranslations("RecruiterPortal.candidates")
  const params = useParams()
  const candidateId = (params?.candidateId as string | undefined) ?? null

  const {
    profile,
    canonicalProfile,
    loading,
    fetchError,
    refetch,
    save,
    saving,
    saveError,
    clearSaveError,
  } = useRecruiterCandidateProfile(candidateId)

  const [snackbar, setSnackbar] = useState<{
    open: boolean
    variant: "success" | "error"
    message: string
  }>({ open: false, variant: "success", message: "" })

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }))
  }, [])

  const handleSaveProfile = useCallback(
    async (body: CandidateProfileSaveBody) => {
      try {
        await save(body)
        setSnackbar({
          open: true,
          variant: "success",
          message: t("toasts.saveSuccess"),
        })
      } catch {
        setSnackbar({
          open: true,
          variant: "error",
          message: t("toasts.saveError"),
        })
      }
    },
    [save, t]
  )

  const nd = (profile?.normalizedData ?? {}) as Record<string, unknown>
  const firstName = String(nd.FirstName ?? nd.firstName ?? "")
  const lastName = String(nd.LastName ?? nd.lastName ?? "")
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    [canonicalProfile?.firstName, canonicalProfile?.lastName]
      .filter((x) => x != null && String(x).trim() !== "")
      .join(" ")
      .trim() ||
    t("fallbacks.candidate")

  const breadcrumbLabel = loading ? t("fallbacks.candidate") : fullName
  const breadcrumbTrail = useMemo(
    () => [
      { label: tCandidates("breadcrumb"), href: "/portal-rrhh/candidatos" },
      { label: breadcrumbLabel },
    ],
    [breadcrumbLabel, tCandidates]
  )

  useEffect(() => {
    if (!candidateId) return
    if (loading) return
    document.title = formatCandidatoDetailDocumentTitle(
      profile != null ? fullName : null
    )
  }, [candidateId, loading, profile, fullName])

  const mainInner = (
    <>
      {loading ? (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center"
          aria-live="polite"
        >
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-vo-purple border-t-transparent"
            aria-hidden
          />
          <p className="font-sans text-sm text-muted-foreground">{t("page.loadingProfile")}</p>
        </div>
      ) : fetchError ? (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center"
          role="alert"
        >
          <p className="font-sans text-sm text-destructive">{fetchError}</p>
          <Link
            href="/portal-rrhh/candidatos"
            className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {t("page.backToCandidates")}
          </Link>
          <button
            type="button"
            onClick={() => void refetch()}
            className="font-sans text-sm text-vo-purple hover:underline"
          >
            {t("actions.retry")}
          </button>
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Link
              href="/portal-rrhh/candidatos"
              className="inline-flex w-fit items-center gap-2 font-sans text-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 rounded"
              aria-label={t("page.backToCandidatesAria")}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {t("page.backToCandidates")}
            </Link>
            {candidateId ? (
              <Link
                href={`/portal-rrhh/candidatos/${encodeURIComponent(String(candidateId))}/interviews`}
                className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-background px-4 py-2 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                aria-label={t("page.interviewsAria")}
              >
                {t("page.interviews")}
              </Link>
            ) : null}
          </div>

          <RecruiterCandidateProfileView
            candidateId={candidateId}
            profile={profile}
            canonicalProfile={canonicalProfile}
            onSaveProfile={handleSaveProfile}
            savingProfile={saving}
            saveProfileError={saveError}
            clearSaveProfileError={clearSaveError}
          />
        </>
      )}
    </>
  )

  return (
    <>
    <div className="h-screen overflow-hidden bg-background font-sans text-foreground">
      <div className="hidden h-full lg:flex">
        <RRHHSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <RRHHTopbar
            variant="desktop"
            breadcrumbLabel={breadcrumbLabel}
            breadcrumbTrail={breadcrumbTrail}
          />
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            <div className="min-w-0 flex flex-col p-8">{mainInner}</div>
          </main>
        </div>
      </div>

      <div className="flex h-full min-w-0 flex-col overflow-hidden lg:hidden">
        <RRHHTopbar
          variant="tablet"
          breadcrumbLabel={breadcrumbLabel}
          breadcrumbTrail={breadcrumbTrail}
        />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="min-w-0 flex flex-col p-4 md:p-6">{mainInner}</div>
        </main>
      </div>
    </div>
    <Snackbar
      open={snackbar.open}
      onClose={handleCloseSnackbar}
      variant={snackbar.variant}
      message={snackbar.message}
    />
    </>
  )
}
