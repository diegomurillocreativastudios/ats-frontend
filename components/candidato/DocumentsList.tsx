"use client";

import { FileText, Download } from "lucide-react";

/**
 * Lista de documentos del candidato.
 * Por ahora no se muestran ítems hasta que se implemente el GET del backend.
 * @param {{ documents?: Array<{ id: string; name: string; type?: string; date?: string; size?: string }> }} props
 */
export default function DocumentsList({ documents = [] }) {
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
                  {doc.name}
                </p>
                {(doc.type || doc.date || doc.size) && (
                  <p className="font-inter text-xs text-muted-foreground md:text-sm">
                    {[doc.type, doc.date, doc.size].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md hover:bg-muted"
                aria-label={`Descargar ${doc.name}`}
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
