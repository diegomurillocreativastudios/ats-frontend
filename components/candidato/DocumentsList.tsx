"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, Download, Loader2, Trash2 } from "lucide-react";
import type { CandidateDocument } from "@/lib/candidate-documents";
import { resolveBffUrl } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import DeleteConfirmModal from "@/components/rrhh/DeleteConfirmModal";

interface DocumentsListProps {
  documents?: CandidateDocument[];
  /** Si se define, se muestra el botón Eliminar por documento */
  onDeleteDocument?: (documentId: string) => void | Promise<void>;
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
export default function DocumentsList({
  documents = [],
  onDeleteDocument,
}: DocumentsListProps) {
  const t = useTranslations("CandidatePortal.documents.list");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [documentPendingDelete, setDocumentPendingDelete] =
    useState<CandidateDocument | null>(null);

  const handleDownload = async (doc: CandidateDocument) => {
    const path = doc.storagePath?.trim();
    if (!path) return;

    setDownloadingId(doc.id);
    setDownloadError(null);
    try {
      const url = resolveBffUrl(
        `/api/Storage/files/${encodeURIComponent(path)}`
      );
      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) throw new Error(t("downloadError"));
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      const suggestedName = resolveDocumentName(doc);
      a.download =
        suggestedName && suggestedName !== `Documento ${doc.id}`
          ? suggestedName
          : path.split("/").pop() || "documento";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    } catch (err: unknown) {
      setDownloadError(getApiErrorMessage(err) || t("downloadError"));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOpenDeleteModal = (doc: CandidateDocument) => {
    if (!onDeleteDocument) return;
    setDocumentPendingDelete(doc);
  };

  const handleCloseDeleteModal = () => {
    if (deletingId !== null) return;
    setDocumentPendingDelete(null);
  };

  const handleConfirmDelete = () => {
    const doc = documentPendingDelete;
    if (!doc || !onDeleteDocument) return;
    void (async () => {
      setDeletingId(doc.id);
      try {
        await onDeleteDocument(doc.id);
        setDocumentPendingDelete(null);
      } finally {
        setDeletingId(null);
      }
    })();
  };

  const deleteModalLoading =
    Boolean(documentPendingDelete) &&
    deletingId === documentPendingDelete?.id;

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <h2 className="font-sans text-sm font-semibold text-foreground md:text-base">
        {t("heading")}
      </h2>
      {downloadError ? (
        <p
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {downloadError}
        </p>
      ) : null}
      {documents.length === 0 ? (
        <p className="rounded-lg border border-border bg-muted/50 px-4 py-6 text-center font-sans text-sm text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-3" aria-label={t("listAria")}>
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 md:gap-5 md:p-5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ats-arena/70 md:h-12 md:w-12">
                <FileText className="h-5 w-5 text-vo-purple md:h-6 md:w-6" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-sans text-sm font-medium text-foreground md:text-base">
                  {resolveDocumentName(doc)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => void handleDownload(doc)}
                  disabled={!doc.storagePath?.trim() || downloadingId === doc.id}
                  className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={t("downloadAria", { name: resolveDocumentName(doc) })}
                  aria-busy={downloadingId === doc.id}
                >
                  {downloadingId === doc.id ? (
                    <Loader2
                      className="h-4 w-4 animate-spin text-muted-foreground md:h-5 md:w-5"
                      aria-hidden
                    />
                  ) : (
                    <Download
                      className="h-4 w-4 text-muted-foreground md:h-5 md:w-5"
                      aria-hidden
                    />
                  )}
                </button>
                {onDeleteDocument ? (
                  <button
                    type="button"
                    onClick={() => handleOpenDeleteModal(doc)}
                    disabled={deletingId === doc.id}
                    className="flex h-9 w-9 items-center justify-center rounded-md text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={t("deleteAria", { name: resolveDocumentName(doc) })}
                    aria-busy={deletingId === doc.id}
                  >
                    {deletingId === doc.id ? (
                      <Loader2
                        className="h-4 w-4 animate-spin text-destructive md:h-5 md:w-5"
                        aria-hidden
                      />
                    ) : (
                      <Trash2
                        className="h-4 w-4 text-destructive md:h-5 md:w-5"
                        aria-hidden
                      />
                    )}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {onDeleteDocument ? (
        <DeleteConfirmModal
          isOpen={documentPendingDelete !== null}
          onClose={handleCloseDeleteModal}
          onConfirm={handleConfirmDelete}
          title={t("deleteTitle")}
          message={
            documentPendingDelete
              ? t.rich("deleteMessage", {
                  name: () => (
                    <span className="font-medium text-foreground">
                      &ldquo;{resolveDocumentName(documentPendingDelete)}&rdquo;
                    </span>
                  ),
                })
              : null
          }
          confirmText={t("deleteConfirm")}
          cancelText={t("deleteCancel")}
          loading={deleteModalLoading}
        />
      ) : null}
    </div>
  );
}
