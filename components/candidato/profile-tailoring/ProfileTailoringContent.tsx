"use client"

import Link from "next/link"
import { useCallback, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { FileText, History, Loader2, Sparkles, Upload } from "lucide-react"
import CandidateSidebar from "@/components/candidato/CandidateSidebar"
import CandidateTopbar from "@/components/candidato/CandidateTopbar"
import DocumentsUploadZone from "@/components/candidato/DocumentsUploadZone"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import Modal from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import { useCandidateSnackbar } from "@/components/candidato/candidate-portal-snackbar"
import { AiDisclosureBadge, AiDisclosurePillProgress } from "@/components/rrhh/AiDisclosure"
import { AdaptedProfileEditor } from "@/components/candidato/profile-tailoring/AdaptedProfileEditor"
import { ProfileComparisonPanel } from "@/components/candidato/profile-tailoring/ProfileComparisonPanel"
import { VacancySystemPicker } from "@/components/candidato/profile-tailoring/VacancySystemPicker"
import { useProfileTailoring } from "@/hooks/use-profile-tailoring"
import { useCandidateProfile } from "@/hooks/useCandidateProfile"
import { patchProfileVersion } from "@/lib/api/candidate-profile-tailor"
import { buildCandidateProfileSaveBody } from "@/lib/candidate-profile"
import { formStateToDisplayProfile } from "@/lib/candidate-profile-version"
import {
  MAX_VACANCY_TEXT_LENGTH,
  tabHasDraftContent,
  type VacancyInputTab,
} from "@/lib/profile-tailoring-vacancy-source"
import { getApiErrorMessage } from "@/lib/api-error"
import {
  UPLOAD_MAX_BYTES_10_MB,
  VACANCY_FILE_ACCEPT,
  VACANCY_FILE_EXTENSIONS,
  VACANCY_FILE_TYPES,
} from "@/lib/upload-constraints"

const TAILORING_TYPICAL_MS = 55_000

type TabId = VacancyInputTab

export default function ProfileTailoringContent() {
  const t = useTranslations("CandidatePortal.profileTailoring")
  const { showSnackbar } = useCandidateSnackbar()
  const { save: saveMainProfile, saving: savingMainProfile } = useCandidateProfile()
  const {
    result,
    adaptedForm,
    processing,
    error,
    validationError,
    processForVacancy,
    patchAdaptedForm,
    setAdaptedFormState,
    clearError,
  } = useProfileTailoring()

  const [activeTab, setActiveTab] = useState<TabId>("file")
  const [stagedFile, setStagedFile] = useState<File | null>(null)
  const [vacancyText, setVacancyText] = useState("")
  const [selectedVacancyId, setSelectedVacancyId] = useState<string | null>(null)
  const [selectedVacancyTitle, setSelectedVacancyTitle] = useState<string | null>(null)
  const [pendingTab, setPendingTab] = useState<TabId | null>(null)
  const [showTabConfirm, setShowTabConfirm] = useState(false)
  const [showApplyConfirm, setShowApplyConfirm] = useState(false)
  const [savingVersion, setSavingVersion] = useState(false)
  const [processingComplete, setProcessingComplete] = useState(false)

  const draftInput = useMemo(
    () => ({
      file: stagedFile,
      text: vacancyText,
      vacancyId: selectedVacancyId,
    }),
    [stagedFile, vacancyText, selectedVacancyId]
  )

  const clearTabDraft = useCallback((tab: TabId) => {
    if (tab === "file") {
      setStagedFile(null)
      return
    }
    if (tab === "text") {
      setVacancyText("")
      return
    }
    setSelectedVacancyId(null)
    setSelectedVacancyTitle(null)
  }, [])

  const handleTabRequest = useCallback(
    (nextTab: TabId) => {
      if (nextTab === activeTab) return
      const otherTabs: TabId[] = ["file", "text", "platform"].filter(
        (tab) => tab !== nextTab
      ) as TabId[]
      const hasOtherDraft = otherTabs.some((tab) => tabHasDraftContent(tab, draftInput))
      if (hasOtherDraft) {
        setPendingTab(nextTab)
        setShowTabConfirm(true)
        return
      }
      setActiveTab(nextTab)
    },
    [activeTab, draftInput]
  )

  const handleConfirmTabSwitch = useCallback(() => {
    if (!pendingTab) return
    ;(["file", "text", "platform"] as TabId[]).forEach((tab) => {
      if (tab !== pendingTab) clearTabDraft(tab)
    })
    setActiveTab(pendingTab)
    setPendingTab(null)
    setShowTabConfirm(false)
  }, [clearTabDraft, pendingTab])

  const canProcess = useMemo(() => {
    if (processing) return false
    if (activeTab === "file") return stagedFile != null
    if (activeTab === "text") {
      const trimmed = vacancyText.trim()
      return trimmed.length > 0 && trimmed.length <= MAX_VACANCY_TEXT_LENGTH
    }
    return Boolean(selectedVacancyId)
  }, [activeTab, processing, stagedFile, vacancyText, selectedVacancyId])

  const validationMessage = useMemo(() => {
    if (!validationError || validationError === "none") return null
    const key = `validation.${validationError}` as const
    return t.has(key) ? t(key) : t("validation.generic")
  }, [t, validationError])

  const adaptedDisplayProfile = useMemo(
    () => (adaptedForm ? formStateToDisplayProfile(adaptedForm) : null),
    [adaptedForm]
  )

  const handleProcess = useCallback(async () => {
    clearError()
    setProcessingComplete(false)
    const data = await processForVacancy({
      file: activeTab === "file" ? stagedFile : null,
      text: activeTab === "text" ? vacancyText : "",
      vacancyId: activeTab === "platform" ? selectedVacancyId : null,
      vacancyTitle: selectedVacancyTitle,
    })
    if (data) {
      setProcessingComplete(true)
      window.setTimeout(() => setProcessingComplete(false), 1200)
      showSnackbar(t("toasts.processSuccess"), "success")
    }
  }, [
    activeTab,
    clearError,
    processForVacancy,
    selectedVacancyId,
    selectedVacancyTitle,
    showSnackbar,
    stagedFile,
    t,
    vacancyText,
  ])

  const handleSaveVersion = useCallback(async () => {
    if (!result?.versionId || !adaptedForm) return
    setSavingVersion(true)
    try {
      await patchProfileVersion(result.versionId, {
        profileSnapshot: buildCandidateProfileSaveBody(adaptedForm),
      })
      showSnackbar(t("toasts.versionSaved"), "success")
    } catch (err: unknown) {
      showSnackbar(getApiErrorMessage(err) || t("toasts.versionSaveError"), "error")
    } finally {
      setSavingVersion(false)
    }
  }, [adaptedForm, result?.versionId, showSnackbar, t])

  const handleApplyToMainProfile = useCallback(async () => {
    if (!adaptedForm) return
    try {
      await saveMainProfile(buildCandidateProfileSaveBody(adaptedForm))
      showSnackbar(t("toasts.applySuccess"), "success")
      setShowApplyConfirm(false)
    } catch {
      showSnackbar(t("toasts.applyError"), "error")
    }
  }, [adaptedForm, saveMainProfile, showSnackbar, t])

  const tabButtonClass = (tab: TabId) =>
    `flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 font-sans text-sm font-medium transition-colors ${
      activeTab === tab
        ? "bg-vo-purple/15 text-vo-purple"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`

  const pageContent = (
    <div
      className={`mx-auto flex flex-col gap-8 ${result && adaptedForm ? "max-w-[90rem]" : "max-w-6xl"}`}
    >
      <PortalPageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Link
            href="/portal-candidato/mi-perfil/versiones"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <History className="h-4 w-4" aria-hidden />
            {t("historyLink")}
          </Link>
        }
      />

      <section className="rounded-2xl border border-border bg-card p-4 md:p-6">
        <h2 className="font-sans text-base font-semibold text-foreground">
          {t("vacancyInput.title")}
        </h2>
        <p className="mt-1 font-sans text-sm text-muted-foreground">
          {t("vacancyInput.description")}
        </p>

        <div
          className="mt-4 flex flex-col gap-2 sm:flex-row"
          role="tablist"
          aria-label={t("vacancyInput.tabsAria")}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "file"}
            className={tabButtonClass("file")}
            onClick={() => handleTabRequest("file")}
          >
            <Upload className="h-4 w-4" aria-hidden />
            {t("vacancyInput.tabs.file")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "text"}
            className={tabButtonClass("text")}
            onClick={() => handleTabRequest("text")}
          >
            <FileText className="h-4 w-4" aria-hidden />
            {t("vacancyInput.tabs.text")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "platform"}
            className={tabButtonClass("platform")}
            onClick={() => handleTabRequest("platform")}
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            {t("vacancyInput.tabs.platform")}
          </button>
        </div>

        <div className="mt-4" role="tabpanel">
          {activeTab === "file" ? (
            <DocumentsUploadZone
              stagingOnly
              maxFiles={1}
              acceptedTypes={[...VACANCY_FILE_TYPES]}
              acceptedExtensions={[...VACANCY_FILE_EXTENSIONS]}
              accept={VACANCY_FILE_ACCEPT}
              maxSizeBytes={UPLOAD_MAX_BYTES_10_MB}
              helperText={t("vacancyInput.fileHelper")}
              onFilesChange={(files) => setStagedFile(files[0] ?? null)}
            />
          ) : null}

          {activeTab === "text" ? (
            <div className="flex flex-col gap-2">
              <label htmlFor="vacancy-text-input" className="font-sans text-sm font-medium">
                {t("vacancyInput.textLabel")}
              </label>
              <textarea
                id="vacancy-text-input"
                value={vacancyText}
                onChange={(e) => setVacancyText(e.target.value)}
                rows={10}
                maxLength={MAX_VACANCY_TEXT_LENGTH}
                placeholder={t("vacancyInput.textPlaceholder")}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-sans text-sm text-foreground outline-none ring-vo-purple/30 focus:ring-2"
              />
              <p className="font-sans text-xs text-muted-foreground">
                {t("vacancyInput.charCount", {
                  count: vacancyText.length,
                  max: MAX_VACANCY_TEXT_LENGTH,
                })}
              </p>
            </div>
          ) : null}

          {activeTab === "platform" ? (
            <VacancySystemPicker
              selectedId={selectedVacancyId}
              selectedTitle={selectedVacancyTitle}
              onSelect={(vacancy) => {
                setSelectedVacancyId(vacancy.id)
                setSelectedVacancyTitle(vacancy.title)
              }}
              onClear={() => {
                setSelectedVacancyId(null)
                setSelectedVacancyTitle(null)
              }}
            />
          ) : null}
        </div>

        <div className="mt-6 flex flex-col gap-4 border-t border-border pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <AiDisclosureBadge label={t("aiBadge")} />
          </div>
          <Button
            type="button"
            onClick={() => void handleProcess()}
            disabled={!canProcess}
            className="w-full sm:w-auto"
            aria-busy={processing}
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {t("processLoading")}
              </>
            ) : (
              t("processForVacancy")
            )}
          </Button>
          {processing || processingComplete ? (
            <AiDisclosurePillProgress
              percent={null}
              profileTailoringStepLabels
              isCompleted={processingComplete}
              timeBasedTypicalMs={TAILORING_TYPICAL_MS}
            />
          ) : null}
          {validationMessage ? (
            <p className="font-sans text-sm text-destructive" role="alert">
              {validationMessage}
            </p>
          ) : null}
          {error ? (
            <p className="font-sans text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </section>

      {result && adaptedForm && adaptedDisplayProfile ? (
        <section className="flex flex-col gap-6">
          <ProfileComparisonPanel
            currentProfile={result.currentProfile}
            adaptedProfile={adaptedDisplayProfile}
            adaptationSummary={result.adaptationSummary}
            changeHighlights={result.changeHighlights}
            estimatedMatchScore={result.estimatedMatchScore}
            vacancyTitle={result.vacancyTitle ?? selectedVacancyTitle}
            promptVersion={result.promptVersion}
            atsComplianceChecklist={result.atsComplianceChecklist}
            showActions
            onApplyAdapted={() => setShowApplyConfirm(true)}
            applying={savingMainProfile}
          />

          <details className="rounded-2xl border border-border bg-card">
            <summary className="cursor-pointer list-none px-4 py-3 font-sans text-sm font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
              {t("comparison.editToggle")}
            </summary>
            <div className="border-t border-border p-4">
              <AdaptedProfileEditor
                form={adaptedForm}
                setForm={setAdaptedFormState}
                patch={patchAdaptedForm}
                saving={savingVersion}
              />
            </div>
          </details>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleSaveVersion()}
              disabled={savingVersion}
              aria-busy={savingVersion}
            >
              {savingVersion ? t("actions.savingVersion") : t("actions.saveVersion")}
            </Button>
          </div>
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

      <Modal
        isOpen={showTabConfirm}
        onClose={() => {
          setShowTabConfirm(false)
          setPendingTab(null)
        }}
        title={t("tabConfirm.title")}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowTabConfirm(false)
                setPendingTab(null)
              }}
            >
              {t("tabConfirm.cancel")}
            </Button>
            <Button type="button" onClick={handleConfirmTabSwitch}>
              {t("tabConfirm.confirm")}
            </Button>
          </>
        }
      >
        <p className="font-sans text-sm text-muted-foreground">{t("tabConfirm.message")}</p>
      </Modal>

      <Modal
        isOpen={showApplyConfirm}
        onClose={() => setShowApplyConfirm(false)}
        title={t("applyConfirm.title")}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setShowApplyConfirm(false)}>
              {t("applyConfirm.cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => void handleApplyToMainProfile()}
              disabled={savingMainProfile}
              aria-busy={savingMainProfile}
            >
              {savingMainProfile ? t("actions.applying") : t("applyConfirm.confirm")}
            </Button>
          </>
        }
      >
        <p className="font-sans text-sm text-muted-foreground">{t("applyConfirm.message")}</p>
      </Modal>
    </div>
  )
}
