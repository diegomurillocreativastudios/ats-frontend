"use client"

import { useCallback, useState } from "react"
import { Upload } from "lucide-react"
import CandidateSidebar from "@/components/candidato/CandidateSidebar"
import CandidateTopbar from "@/components/candidato/CandidateTopbar"
import DocumentsUploadZone, {
  type DocumentsUploadZoneLeftContext,
} from "@/components/candidato/DocumentsUploadZone"
import DocumentsList from "@/components/candidato/DocumentsList"
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
  const { showSnackbar } = useCandidateSnackbar()
  const { candidateId, documents, loading, error, refetch } = useCandidateDocuments()

  const handleProcess = async (file: File, _index: number) => {
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
      className="inline-flex items-center justify-center gap-2 rounded-md border border-vo-pink bg-vo-pink px-3 py-2 font-inter text-xs font-medium text-white hover:bg-vo-pink-hover disabled:cursor-not-allowed disabled:opacity-60"
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
              <section aria-label="Título de sección">
                <h1 className="font-inter text-[28px] font-bold text-foreground">
                  Documentos
                </h1>
                <p className="mt-2 font-inter text-base text-muted-foreground">
                  Sube y gestiona los documentos de tu proceso de selección
                </p>
              </section>
              <DocumentsUploadZone
                onProcess={handleProcess}
                onProcessAll={handleProcessAll}
                leftActions={renderGeneralUploadLeft}
              />
              {loading ? (
                <p className="rounded-lg border border-border bg-muted/50 px-4 py-6 text-center font-inter text-sm text-muted-foreground">
                  Cargando documentos...
                </p>
              ) : (
                <>
                  {error ? (
                    <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-4 text-sm text-destructive">
                      {error}
                    </p>
                  ) : null}
                  <DocumentsList documents={documents} />
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
            <section aria-label="Título de sección">
              <h1 className="font-inter text-xl font-bold text-foreground md:text-2xl">
                Documentos
              </h1>
              <p className="mt-1 font-inter text-[13px] text-muted-foreground md:mt-1.5 md:text-sm">
                Sube y gestiona tus documentos
              </p>
            </section>
            <DocumentsUploadZone
              onProcess={handleProcess}
              onProcessAll={handleProcessAll}
              leftActions={renderGeneralUploadLeft}
            />
            {loading ? (
              <p className="rounded-lg border border-border bg-muted/50 px-4 py-6 text-center font-inter text-sm text-muted-foreground">
                Cargando documentos...
              </p>
            ) : (
              <>
                {error ? (
                  <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-4 text-sm text-destructive">
                    {error}
                  </p>
                ) : null}
                <DocumentsList documents={documents} />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
