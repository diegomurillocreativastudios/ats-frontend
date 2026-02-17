"use client";

import { useState } from "react";
import CandidateSidebar from "@/components/candidato/CandidateSidebar";
import CandidateTopbar from "@/components/candidato/CandidateTopbar";
import DocumentsUploadZone from "@/components/candidato/DocumentsUploadZone";
import DocumentsList from "@/components/candidato/DocumentsList";
import { apiClient } from "@/lib/api";

const PROCESAR_ENDPOINT = "/Ingest/upload";
const ENTITY_TYPE_CV = "CV";

export default function DocumentosContent() {
  const [processMessage, setProcessMessage] = useState(null);

  const handleProcess = async (file, _index) => {
    setProcessMessage(null);
    const formData = new FormData();
    formData.append("File", file);
    formData.append("EntityType", ENTITY_TYPE_CV);
    await apiClient.postFormData(PROCESAR_ENDPOINT, formData);
    setProcessMessage({ type: "success", text: "Documento procesado correctamente." });
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* Desktop: sidebar + main */}
      <div className="hidden lg:flex lg:min-h-screen">
        <CandidateSidebar />
        <div className="flex min-h-0 flex-1 flex-col">
          <CandidateTopbar variant="desktop" breadcrumbLabel="Documentos" />
          <main className="flex-1 overflow-auto">
            <div className="flex flex-col gap-8 p-8">
              <section aria-label="Título de sección">
                <h1 className="font-inter text-[28px] font-bold text-foreground">
                  Documentos
                </h1>
                <p className="mt-2 font-inter text-base text-muted-foreground">
                  Sube y gestiona los documentos de tu proceso de selección
                </p>
              </section>
              {processMessage && (
                <p
                  role="alert"
                  className={`font-inter text-sm ${
                    processMessage.type === "success"
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  {processMessage.text}
                </p>
              )}
              <DocumentsUploadZone onProcess={handleProcess} />
              <DocumentsList />
            </div>
          </main>
        </div>
      </div>

      {/* Tablet & Mobile: topbar + content */}
      <div className="flex min-h-screen flex-col lg:hidden">
        <CandidateTopbar variant="tablet" breadcrumbLabel="Documentos" />
        <main className="flex-1 overflow-auto">
          <div className="flex flex-col gap-5 p-4 md:gap-6 md:p-6">
            <section aria-label="Título de sección">
              <h1 className="font-inter text-xl font-bold text-foreground md:text-2xl">
                Documentos
              </h1>
              <p className="mt-1 font-inter text-[13px] text-muted-foreground md:mt-1.5 md:text-sm">
                Sube y gestiona tus documentos
              </p>
            </section>
            {processMessage && (
              <p
                role="alert"
                className={`font-inter text-sm ${
                  processMessage.type === "success"
                    ? "text-success"
                    : "text-destructive"
                }`}
              >
                {processMessage.text}
              </p>
            )}
            <DocumentsUploadZone onProcess={handleProcess} />
            <DocumentsList />
          </div>
        </main>
      </div>
    </div>
  );
}
