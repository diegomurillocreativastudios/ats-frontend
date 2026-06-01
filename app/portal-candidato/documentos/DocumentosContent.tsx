"use client"

import { useCallback, useState } from "react"
import { Upload, FileText } from "lucide-react"
import CandidateSidebar from "@/components/candidato/CandidateSidebar"
import CandidateTopbar from "@/components/candidato/CandidateTopbar"
import DocumentsUploadZone, {
  type AiIngestProcessBatchMeta,
  type DocumentsUploadZoneLeftContext,
} from "@/components/candidato/DocumentsUploadZone"
import DocumentsList from "@/components/candidato/DocumentsList"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import AgregarCandidatoModal from "@/components/candidato/AgregarCandidatoModal"
import { useCandidateSnackbar } from "@/components/candidato/candidate-portal-snackbar"
import { apiClient } from "@/lib/api"
import { getApiErrorMessage, createSilentError } from "@/lib/api-error"
import { useCandidateDocuments } from "@/hooks/useCandidateDocuments"

const PROCESAR_ENDPOINT = "/Ingest/upload";
const ENTITY_TYPE = "Candidate";
const GENERAL_DOCUMENT_KEYWORDS = [
  "cv",
  "resume",
  "curriculum",
  "curriculum vitae",
  "hoja de vida",
  "hojadevida",
]

const isResumeLikeDocument = (fileName: string) => {
  const normalizedName = (fileName || "").toLowerCase()
  return GENERAL_DOCUMENT_KEYWORDS.some((keyword) => normalizedName.includes(keyword))
}

export default function DocumentosContent() {
  const [isUploadingGeneralDocument, setIsUploadingGeneralDocument] = useState(false)
  const [isCompleteInformationModalOpen, setIsCompleteInformationModalOpen] = useState(false)
  const { showSnackbar } = useCandidateSnackbar()
  const { candidateId, documents, loading, error, refetch, deleteDocument } =
    useCandidateDocuments()

  const handleSnackbarFromModal = useCallback(
    (message: string, variant: "success" | "error" = "success") => {
      showSnackbar(message, variant)
    },
    [showSnackbar]
  )

  const handleDeleteDocument = useCallback(
    async (documentId: string) => {
      try {
        await deleteDocument(documentId)
        showSnackbar("Documento eliminado correctamente.", "success")
      } catch (err: unknown) {
        showSnackbar(
          getApiErrorMessage(err) || "No se pudo eliminar el documento.",
          "error"
        )
      }
    },
    [deleteDocument, showSnackbar]
  )

  const handleProcess = async (
    file: File,
    _index: number,
    _meta?: AiIngestProcessBatchMeta
  ) => {
    const formData = new FormData();
    formData.append("File", file);
    formData.append("EntityType", ENTITY_TYPE);
    try {
      await apiClient.postFormData(PROCESAR_ENDPOINT, formData)
      await refetch()
      showSnackbar("Documento procesado correctamente.", "success")
    } catch (err: unknown) {
      const message =
        getApiErrorMessage(err) || "Error al procesar el documento."
      showSnackbar(message, "error")
      throw createSilentError(message)
    }
  }

  const handleProcessAll = async (files: File[]) => {
    if (!files?.length) return;
    const total = files.length;
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("File", file);
        formData.append("EntityType", ENTITY_TYPE);
        await apiClient.postFormData(PROCESAR_ENDPOINT, formData);
      }
      await refetch()
      showSnackbar(
        `${total} documento${total !== 1 ? "s" : ""} procesado${total !== 1 ? "s" : ""} correctamente.`,
        "success"
      )
    } catch (err: unknown) {
      const message =
        getApiErrorMessage(err) || "Error al procesar los documentos."
      showSnackbar(message, "error")
    }
  }

  const handleSubmitGeneralDocuments = useCallback(
    async (files: File[], clearStagedFiles: () => void) => {
      if (!files.length) {
        showSnackbar("Selecciona al menos un archivo para subir.", "error")
        return
      }
      if (!candidateId) {
        showSnackbar("No se pudo identificar tu perfil de candidato.", "error")
        return
      }
      const blocked = files.find((file) => isResumeLikeDocument(file.name))
      if (blocked) {
        showSnackbar(
          `Este endpoint es solo para documentos generales. Quita o reemplaza archivos tipo CV/Resume (por ejemplo: ${blocked.name}).`,
          "error"
        )
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
          files.length === 1
            ? "Documento general subido correctamente."
            : `${files.length} documentos generales subidos correctamente.`,
          "success"
        )
      } catch (err: unknown) {
        const message =
          getApiErrorMessage(err) || "No se pudo subir el documento general."
        showSnackbar(message, "error")
      } finally {
        setIsUploadingGeneralDocument(false)
      }
    },
    [candidateId, refetch, showSnackbar]
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
      aria-label="Subir documentos generales del candidato"
      aria-busy={isUploadingGeneralDocument}
    >
      <Upload className="h-3.5 w-3.5" aria-hidden />
      {isUploadingGeneralDocument ? "Subiendo..." : "Subir documento general"}
    </button>
  )

  return (
    <div className="h-screen overflow-hidden bg-background font-sans text-foreground">
      {/* Desktop: sidebar + main — fixed height so only main scrolls */}
      <div className="hidden h-full lg:flex">
        <CandidateSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <CandidateTopbar variant="desktop" breadcrumbLabel="Documentos" />
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            <div className="min-w-0 flex flex-col gap-8 p-8">
              <PortalPageHeader
                title="Documentos"
                description="Sube y gestiona los documentos de tu proceso de selección"
                className="pb-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                actions={
                  <button
                    type="button"
                    onClick={() => setIsCompleteInformationModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                    aria-label="Completar información del candidato"
                  >
                    <FileText className="h-4 w-4" aria-hidden />
                    Completar información
                  </button>
                }
              />
              <DocumentsUploadZone
                onProcess={handleProcess}
                onProcessAll={handleProcessAll}
                leftActions={renderGeneralUploadLeft}
              />
              {loading ? (
                <p className="rounded-lg border border-border bg-muted/50 px-4 py-6 text-center font-sans text-sm text-muted-foreground">
                  Cargando documentos...
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
        <CandidateTopbar variant="tablet" breadcrumbLabel="Documentos" />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="min-w-0 flex flex-col gap-5 p-4 md:gap-6 md:p-6">
            <PortalPageHeader
              title="Documentos"
              description="Sube y gestiona tus documentos"
              className="pb-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
              descriptionClassName="text-sm leading-6 md:text-base"
              actions={
                <button
                  type="button"
                  onClick={() => setIsCompleteInformationModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-vo-purple px-4 py-2 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                  aria-label="Completar información del candidato"
                >
                  <FileText className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">Completar información</span>
                  <span className="sm:hidden" aria-hidden>
                    Completar info
                  </span>
                </button>
              }
            />
            <DocumentsUploadZone
              onProcess={handleProcess}
              onProcessAll={handleProcessAll}
              leftActions={renderGeneralUploadLeft}
            />
            {loading ? (
              <p className="rounded-lg border border-border bg-muted/50 px-4 py-6 text-center font-sans text-sm text-muted-foreground">
                Cargando documentos...
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

      <AgregarCandidatoModal
        variant="self"
        isOpen={isCompleteInformationModalOpen}
        onClose={() => setIsCompleteInformationModalOpen(false)}
        onSuccess={refetch}
        onSnackbar={handleSnackbarFromModal}
      />
    </div>
  )
}
