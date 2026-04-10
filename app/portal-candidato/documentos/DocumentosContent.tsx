"use client"

import { useCallback } from "react"
import CandidateSidebar from "@/components/candidato/CandidateSidebar"
import CandidateTopbar from "@/components/candidato/CandidateTopbar"
import DocumentsUploadZone from "@/components/candidato/DocumentsUploadZone"
import DocumentsList from "@/components/candidato/DocumentsList"
import { useCandidateSnackbar } from "@/components/candidato/candidate-portal-snackbar"
import { apiClient } from "@/lib/api"
import { getApiErrorMessage, createSilentError } from "@/lib/api-error"

const PROCESAR_ENDPOINT = "/Ingest/upload";
const ENTITY_TYPE = "Candidate";

export default function DocumentosContent() {
  const { showSnackbar } = useCandidateSnackbar()

  const handleProcess = async (file: File, _index: number) => {
    const formData = new FormData();
    formData.append("File", file);
    formData.append("EntityType", ENTITY_TYPE);
    try {
      await apiClient.postFormData(PROCESAR_ENDPOINT, formData)
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
              <DocumentsUploadZone onProcess={handleProcess} onProcessAll={handleProcessAll} />
              <DocumentsList />
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
            <DocumentsUploadZone onProcess={handleProcess} onProcessAll={handleProcessAll} />
            <DocumentsList />
          </div>
        </main>
      </div>
    </div>
  )
}
