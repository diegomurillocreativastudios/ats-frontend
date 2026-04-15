"use client";

import { FileText, Download } from "lucide-react";
import type { CandidateDocument } from "@/lib/candidate-documents"

interface DocumentsListProps {
  documents?: CandidateDocument[]
}

const resolveDocumentName = (doc: CandidateDocument) => {
  if (!doc.storagePath) return `Documento ${doc.id}`
  const segment = doc.storagePath.split("/").filter(Boolean).pop()
  if (!segment) return `Documento ${doc.id}`

  const rawName = segment.trim()
  const nameWithoutUuidPrefix = rawName.replace(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i,
    ""
  )
  const nameWithoutNumericPrefix = nameWithoutUuidPrefix.replace(/^\d+_/, "")

  return nameWithoutNumericPrefix || rawName
}

/**
 * Lista de documentos del candidato.
 */
export default function DocumentsList({ documents = [] }: DocumentsListProps) {
  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <h2 className="font-inter text-sm font-semibold text-foreground md:text-base">
        Mis documentos
      </h2>
      {documents.length === 0 ? (
        <p className="rounded-lg border border-border bg-muted/50 px-4 py-6 text-center font-inter text-sm text-muted-foreground">
          Aún no hay documentos. Los que subas aparecerán aquí.
        </p>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Lista de documentos">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 md:gap-5 md:p-5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F3E8FF] md:h-12 md:w-12">
                <FileText className="h-5 w-5 text-vo-purple md:h-6 md:w-6" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-inter text-sm font-medium text-foreground md:text-base">
                  {resolveDocumentName(doc)}
                </p>
              </div>
              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md hover:bg-muted"
                aria-label={`Descargar ${resolveDocumentName(doc)}`}
              >
                <Download className="h-4 w-4 text-muted-foreground md:h-5 md:w-5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
