"use client"

import { useCallback, useState } from "react"
import { useTranslations } from "next-intl"
import { Upload } from "lucide-react"
import CandidateSidebar from "@/components/candidato/CandidateSidebar"
import CandidateTopbar from "@/components/candidato/CandidateTopbar"
import DocumentsUploadZone, {
  type DocumentsUploadZoneLeftContext,
} from "@/components/candidato/DocumentsUploadZone"
import DocumentsList from "@/components/candidato/DocumentsList"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import { useCandidateSnackbar } from "@/components/candidato/candidate-portal-snackbar"
import { apiClient } from "@/lib/api"
import { getApiErrorMessage } from "@/lib/api-error"
import { getUploadApiErrorMessage } from "@/lib/upload-constraints"
import { useCandidateDocuments } from "@/hooks/useCandidateDocuments"

export default function DocumentosContent() {
  const t = useTranslations("CandidatePortal.documents")
  const [isUploadingGeneralDocument, setIsUploadingGeneralDocument] = useState(false)
  const { showSnackbar } = useCandidateSnackbar()
  const { candidateId, documents, loading, error, refetch, deleteDocument } =
    useCandidateDocuments()

  const handleDeleteDocument = useCallback(
    async (documentId: string) => {
      try {
        await deleteDocument(documentId)
        showSnackbar(t("toastDeleted"), "success")
      } catch (err: unknown) {
        showSnackbar(
          getApiErrorMessage(err) || t("toastDeleteError"),
          "error"
        )
      }
    },
    [deleteDocument, showSnackbar, t]
  )

  const handleSubmitGeneralDocuments = useCallback(
    async (files: File[], clearStagedFiles: () => void) => {
      if (!files.length) {
        showSnackbar(t("toastSelectFile"), "error")
        return
      }
      if (!candidateId) {
        showSnackbar(t("toastNoProfile"), "error")
        return
      }

      setIsUploadingGeneralDocument(true)
      try {
        for (const file of files) {
          const formData = new FormData()
          formData.append("File", file)
          await apiClient.postFormData(
            `/api/candidate/${encodeURIComponent(candidateId)}/documents`,
            formData
          )
        }
        await refetch()
        clearStagedFiles()
        showSnackbar(
          t("toastGeneralUploaded", { count: files.length }),
          "success"
        )
      } catch (err: unknown) {
        const message =
          getUploadApiErrorMessage(err) ||
          getApiErrorMessage(err) ||
          t("toastGeneralUploadError")
        showSnackbar(message, "error")
      } finally {
        setIsUploadingGeneralDocument(false)
      }
    },
    [candidateId, refetch, showSnackbar, t]
  )

  const renderGeneralUploadLeft = ({
    files,
    clearStagedFiles,
  }: DocumentsUploadZoneLeftContext) => (
    <button
      type="button"
      onClick={() => void handleSubmitGeneralDocuments(files, clearStagedFiles)}
      disabled={!candidateId || isUploadingGeneralDocument || files.length === 0}
      className="inline-flex items-center justify-center gap-2 rounded-md border border-vo-pink bg-vo-pink px-3 py-2 font-sans text-xs font-medium text-white hover:bg-vo-pink-hover disabled:cursor-not-allowed disabled:opacity-60"
      aria-label={t("uploadGeneralAria")}
      aria-busy={isUploadingGeneralDocument}
    >
      <Upload className="h-3.5 w-3.5" aria-hidden />
      {isUploadingGeneralDocument ? t("uploading") : t("uploadGeneral")}
    </button>
  )

  return (
    <div className="h-screen overflow-hidden bg-background font-sans text-foreground">
      {/* Desktop: sidebar + main — fixed height so only main scrolls */}
      <div className="hidden h-full lg:flex">
        <CandidateSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <CandidateTopbar variant="desktop" breadcrumbLabel={t("breadcrumb")} />
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            <div className="min-w-0 flex flex-col gap-8 p-8">
              <PortalPageHeader
                title={t("title")}
                description={t("description")}
                className="pb-0"
              />
              <DocumentsUploadZone leftActions={renderGeneralUploadLeft} />
              {loading ? (
                <p className="rounded-lg border border-border bg-muted/50 px-4 py-6 text-center font-sans text-sm text-muted-foreground">
                  {t("loading")}
                </p>
              ) : (
                <>
                  {error ? (
                    <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-4 text-sm text-destructive">
                      {error}
                    </p>
                  ) : null}
                  <DocumentsList
                    documents={documents}
                    onDeleteDocument={handleDeleteDocument}
                  />
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Tablet & Mobile: topbar + content — fixed height so only main scrolls */}
      <div className="flex h-full min-w-0 flex-col overflow-hidden lg:hidden">
        <CandidateTopbar variant="tablet" breadcrumbLabel={t("breadcrumb")} />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="min-w-0 flex flex-col gap-5 p-4 md:gap-6 md:p-6">
            <PortalPageHeader
              title={t("title")}
              description={t("descriptionShort")}
              className="pb-0"
              descriptionClassName="text-sm leading-6 md:text-base"
            />
            <DocumentsUploadZone leftActions={renderGeneralUploadLeft} />
            {loading ? (
              <p className="rounded-lg border border-border bg-muted/50 px-4 py-6 text-center font-sans text-sm text-muted-foreground">
                {t("loading")}
              </p>
            ) : (
              <>
                {error ? (
                  <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-4 text-sm text-destructive">
                    {error}
                  </p>
                ) : null}
                <DocumentsList
                  documents={documents}
                  onDeleteDocument={handleDeleteDocument}
                />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
