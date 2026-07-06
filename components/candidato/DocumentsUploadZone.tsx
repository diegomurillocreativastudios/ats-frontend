"use client"

import { useRef, useState, useCallback, useEffect, type ReactNode, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react"
import { useTranslations } from "next-intl"
import { Upload, X, Sparkles, Loader2, Check } from "lucide-react"
import { getApiErrorMessage, isSilentError } from "@/lib/api-error"

const CV_KEYWORDS = ["cv", "curriculum", "curriculum vitae", "resume", "hoja de vida", "hojadevida"]

const isResumeLikeFile = (fileName: string) => {
  const lower = (fileName || "").toLowerCase();
  return CV_KEYWORDS.some((keyword) => lower.includes(keyword));
};

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
];
const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface UploadValidationResult {
  valid: boolean
  reason?: "type" | "size"
  size?: string
}

const validateFile = (
  file: File,
  allowedTypes: string[],
  allowedExtensions: string[]
): UploadValidationResult => {
  const extension = "." + file.name.split(".").pop()?.toLowerCase();
  const typeOk =
    allowedTypes.includes(file.type) || allowedExtensions.includes(extension);
  const sizeOk = file.size <= MAX_SIZE_BYTES;
  if (!typeOk) return { valid: false, reason: "type" };
  if (!sizeOk)
    return { valid: false, reason: "size", size: formatFileSize(file.size) };
  return { valid: true };
};

function createIngestCycleKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `ingest-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export interface DocumentsUploadZoneLeftContext {
  files: File[]
  clearStagedFiles: () => void
}

/** Metadatos por archivo al procesar con IA (modal RRHH y otros consumidores de `onProcess`). */
export interface AiIngestProcessBatchMeta {
  batchIndex: number
  batchTotal: number
  isLastInBatch: boolean
  currentFileName: string
  cycleKey: string
}

export interface AiProcessingBarState {
  active: boolean
  /** `null` while running a single file (avance simulado por tiempo en la barra RRHH) */
  percent: number | null
  /** Etapa visible simulada (opcional; si no se envía, la barra RRHH puede derivarla del %) */
  statusLabel?: string
  /** Éxito final: barra al 100% en modo completado antes de cerrar el modal */
  isCompleted?: boolean
  batchIndex?: number
  batchTotal?: number
  currentFileName?: string
  /** Clave única por archivo para remount del stepper (`key={cycleKey}` en el padre). */
  cycleKey?: string
}

interface DocumentsUploadZoneProps {
  onProcess?: (file: File, index: number, meta?: AiIngestProcessBatchMeta) => void | Promise<void>
  onProcessAll?: (files: File[]) => void | Promise<void>
  /** Fired when “Procesar” / “Procesar todos” starts and ends so parents (e.g. RRHH modal) can show the IA pill progress bar */
  onAiProcessingBarChange?: (state: AiProcessingBarState) => void
  acceptedTypes?: string[]
  acceptedExtensions?: string[]
  accept?: string
  helperText?: string
  processAllAcceptedFiles?: boolean
  leftActions?:
    | ReactNode
    | ((context: DocumentsUploadZoneLeftContext) => ReactNode)
  /** Solo staging: oculta botones de procesar con IA del componente */
  stagingOnly?: boolean
  /** Límite de archivos en cola (p. ej. 1 para vacante) */
  maxFiles?: number
  /** Notifica al padre cuando cambia la lista de archivos staged */
  onFilesChange?: (files: File[]) => void
  /** Índice del archivo que un padre está procesando (p. ej. ingest en modal RRHH) */
  externalProcessingIndex?: number | null
}

export default function DocumentsUploadZone({
  onProcess,
  onProcessAll,
  onAiProcessingBarChange,
  acceptedTypes,
  acceptedExtensions,
  accept,
  helperText,
  processAllAcceptedFiles = false,
  leftActions,
  stagingOnly = false,
  maxFiles,
  onFilesChange,
  externalProcessingIndex = null,
}: DocumentsUploadZoneProps = {}) {
  const t = useTranslations("CandidatePortal.documents.upload")
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [processingIndex, setProcessingIndex] = useState<number | null>(null)
  const [isProcessingAll, setIsProcessingAll] = useState(false)
  const [processedIndices, setProcessedIndices] = useState(() => new Set<number>())
  const onFilesChangeRef = useRef(onFilesChange)

  useEffect(() => {
    onFilesChangeRef.current = onFilesChange
  }, [onFilesChange])

  useEffect(() => {
    onFilesChangeRef.current?.(files)
  }, [files])

  const effectiveAcceptedTypes =
    Array.isArray(acceptedTypes) && acceptedTypes.length > 0
      ? acceptedTypes
      : ACCEPTED_TYPES;
  const effectiveAcceptedExtensions =
    Array.isArray(acceptedExtensions) && acceptedExtensions.length > 0
      ? acceptedExtensions
      : ACCEPTED_EXTENSIONS;

  const processFiles = useCallback((fileList: File[]) => {
    if (!fileList?.length) return
    setError(null)
    const newFiles: File[] = []
    let firstError: string | null = null
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      const { valid, reason, size } = validateFile(
        file,
        effectiveAcceptedTypes,
        effectiveAcceptedExtensions
      );
      if (valid) {
        newFiles.push(file);
      } else if (!firstError) {
        firstError =
          reason === "size"
            ? t("errorTooLarge", { size: size ?? "" })
            : t("errorTypeNotAllowed");
      }
    }
    if (firstError) setError(firstError)
    if (newFiles.length > 0) {
      setFiles((prev) => {
        const limit = maxFiles != null && maxFiles > 0 ? maxFiles : null
        const merged = limit === 1 ? newFiles.slice(0, 1) : [...prev, ...newFiles]
        return limit != null ? merged.slice(-limit) : merged
      })
    }
  }, [effectiveAcceptedTypes, effectiveAcceptedExtensions, maxFiles, t])

  const handleClick = () => {
    setError(null);
    inputRef.current?.click();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (selected?.length) processFiles(Array.from(selected));
    e.target.value = "";
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rel = e.relatedTarget
    if (rel instanceof Node && e.currentTarget.contains(rel)) return
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dropped = e.dataTransfer?.files;
    if (dropped?.length) processFiles(Array.from(dropped));
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setError(null);
    setProcessedIndices((prev) => {
      const next = new Set<number>()
      prev.forEach((i) => {
        if (i < index) next.add(i)
        if (i > index) next.add(i - 1)
      })
      return next
    })
    if (processingIndex === index) setProcessingIndex(null)
    else if (processingIndex !== null && processingIndex > index)
      setProcessingIndex((p) => (p !== null ? p - 1 : null))
  };

  const clearAll = () => {
    setFiles([]);
    setError(null);
    setProcessedIndices(new Set());
    setProcessingIndex(null);
  };

  const resolvedLeftActions =
    typeof leftActions === "function"
      ? leftActions({ files, clearStagedFiles: clearAll })
      : leftActions

  const processableFiles = stagingOnly
    ? []
    : processAllAcceptedFiles
    ? files.map((file, index) => ({ file, index }))
    : files
        .map((file, index) => ({ file, index }))
        .filter(({ file }) => isResumeLikeFile(file.name));

  const handleProcessClick = async (file: File, index: number) => {
    if (!onProcess || processingIndex !== null || isProcessingAll) return;
    setError(null);
    setProcessingIndex(index);
    const cycleKey = createIngestCycleKey()
    const meta: AiIngestProcessBatchMeta = {
      batchIndex: 1,
      batchTotal: 1,
      isLastInBatch: true,
      currentFileName: file.name,
      cycleKey,
    }
    onAiProcessingBarChange?.({
      active: true,
      percent: null,
      isCompleted: false,
      batchIndex: meta.batchIndex,
      batchTotal: meta.batchTotal,
      currentFileName: meta.currentFileName,
      cycleKey: meta.cycleKey,
    })
    try {
      await Promise.resolve(onProcess(file, index, meta));
      setProcessedIndices((prev) => new Set([...prev, index]));
    } catch (err: unknown) {
      if (isSilentError(err)) return
      const detail = getApiErrorMessage(err) || t("processError")
      setError(t("processErrorSingle", { fileName: file.name, detail }))
    } finally {
      setProcessingIndex(null);
      onAiProcessingBarChange?.({ active: false, percent: null })
    }
  };

  const handleProcessAllClick = async () => {
    if (!onProcess || processableFiles.length < 2 || isProcessingAll || processingIndex !== null) return;
    setError(null);
    setIsProcessingAll(true);
    const total = processableFiles.length;
    let lastTriedFile: File | null = null
    try {
      for (let k = 0; k < processableFiles.length; k++) {
        const { file, index } = processableFiles[k];
        lastTriedFile = file
        const cycleKey = createIngestCycleKey()
        const batchIndex = k + 1
        const meta: AiIngestProcessBatchMeta = {
          batchIndex,
          batchTotal: total,
          isLastInBatch: k === total - 1,
          currentFileName: file.name,
          cycleKey,
        }
        onAiProcessingBarChange?.({
          active: true,
          percent: null,
          isCompleted: false,
          batchIndex: meta.batchIndex,
          batchTotal: meta.batchTotal,
          currentFileName: meta.currentFileName,
          cycleKey: meta.cycleKey,
        })
        setProcessingIndex(index);
        await Promise.resolve(onProcess(file, index, meta));
        setProcessedIndices((prev) => new Set([...prev, index]));
      }
    } catch (err: unknown) {
      if (isSilentError(err)) return
      const detail = getApiErrorMessage(err) || t("processErrorMany")
      const label = lastTriedFile?.name ?? t("fileFallback")
      setError(t("processErrorSingle", { fileName: label, detail }))
    } finally {
      setProcessingIndex(null);
      setIsProcessingAll(false);
      onAiProcessingBarChange?.({ active: false, percent: null })
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        role="button"
        tabIndex={0}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-muted p-5 transition-colors md:gap-3 md:p-6 ${
          isDragging
            ? "border-vo-purple bg-ats-arena/70"
            : "border-border hover:border-muted-foreground/30"
        }`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-label={t("dropzoneAria")}
      >
        <input
          ref={inputRef}
          type="file"
          accept={
            accept ||
            ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          }
          multiple
          className="sr-only"
          aria-hidden
          onChange={handleInputChange}
        />
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted-foreground/10 md:h-12 md:w-12">
          <Upload className="h-5 w-5 text-muted-foreground md:h-6 md:w-6" aria-hidden />
        </div>
        <p className="text-center font-sans text-sm font-medium text-muted-foreground md:text-base">
          {isDragging ? t("dropActive") : t("dropPrompt")}
        </p>
        <p className="text-center font-sans text-xs text-muted-foreground">
          {helperText || t("helperDefault")}
        </p>
      </div>

      {error && (
        <p className="font-sans text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {resolvedLeftActions}
              <span className="font-sans text-sm font-medium text-foreground">
                {t("selectedCount", { count: files.length })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {processableFiles.length >= 2 && onProcess && (
                <button
                  type="button"
                  onClick={handleProcessAllClick}
                  disabled={isProcessingAll || processingIndex !== null}
                  className="flex shrink-0 items-center gap-1.5 rounded-md border border-vo-yellow bg-vo-yellow px-2.5 py-1.5 font-sans text-xs font-medium text-vo-yellow-foreground hover:bg-vo-yellow/90 disabled:opacity-60 disabled:cursor-not-allowed"
                  aria-label={t("processAllAria")}
                  aria-busy={isProcessingAll}
                >
                  {isProcessingAll ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-vo-yellow-foreground" aria-hidden />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-vo-yellow-foreground" aria-hidden />
                  )}
                  {isProcessingAll ? t("processing") : t("processAll")}
                </button>
              )}
              <button
                type="button"
                onClick={clearAll}
                className="font-sans text-sm font-medium text-vo-purple hover:underline"
              >
                {t("removeAll")}
              </button>
            </div>
          </div>
          <div
            className="max-h-[min(280px,45vh)] overflow-y-auto overscroll-y-contain pr-1"
            role="region"
            aria-label={t("selectedListAria")}
          >
            <ul className="flex flex-col gap-2">
            {files.map((file, index) => {
              const showProcessButton =
                !stagingOnly &&
                (processAllAcceptedFiles || isResumeLikeFile(file.name));
              const isExternallyProcessing = externalProcessingIndex === index
              const isExternallyCompleted =
                externalProcessingIndex != null && index < externalProcessingIndex
              const showExternalStatus =
                externalProcessingIndex != null &&
                (isExternallyProcessing || isExternallyCompleted)
              return (
                <li
                  key={`${file.name}-${index}`}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
                    isExternallyProcessing
                      ? "border-vo-purple bg-vo-purple/5 ring-1 ring-vo-purple/30"
                      : isExternallyCompleted
                        ? "border-success/40 bg-success/5"
                        : "border-border bg-card"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate font-sans text-sm text-foreground">
                    {file.name}
                  </span>
                  <span className="shrink-0 font-sans text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </span>
                  {showExternalStatus ? (
                    isExternallyCompleted ? (
                      <span
                        className="flex shrink-0 items-center gap-1.5 rounded-md border border-success bg-success/10 px-2.5 py-1.5 font-sans text-xs font-medium text-success"
                        aria-label={t("processedAria", { fileName: file.name })}
                      >
                        <Check className="h-3.5 w-3.5 text-success" aria-hidden />
                        {t("done")}
                      </span>
                    ) : (
                      <span
                        className="flex shrink-0 items-center gap-1.5 rounded-md border border-vo-purple bg-vo-purple/10 px-2.5 py-1.5 font-sans text-xs font-medium text-vo-purple"
                        aria-busy
                        aria-label={t("processingAria", { fileName: file.name })}
                      >
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-vo-purple" aria-hidden />
                        {t("processing")}
                      </span>
                    )
                  ) : null}
                  {showProcessButton && (
                    <>
                      {processedIndices.has(index) ? (
                        <span
                          className="flex shrink-0 items-center gap-1.5 rounded-md border border-success bg-success/10 px-2.5 py-1.5 font-sans text-xs font-medium text-success"
                          aria-label={t("processedAria", { fileName: file.name })}
                        >
                          <Check className="h-3.5 w-3.5 text-success" aria-hidden />
                          {t("done")}
                        </span>
                      ) : processingIndex === index ? (
                        <span
                          className="flex shrink-0 items-center gap-1.5 rounded-md border border-vo-yellow bg-vo-yellow px-2.5 py-1.5 font-sans text-xs font-medium text-vo-yellow-foreground"
                          aria-busy
                          aria-label={t("processingAria", { fileName: file.name })}
                        >
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-vo-yellow-foreground" aria-hidden />
                          {t("processing")}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleProcessClick(file, index)}
                          disabled={processingIndex !== null || isProcessingAll}
                          className="flex shrink-0 items-center gap-1.5 rounded-md border border-vo-yellow bg-vo-yellow px-2.5 py-1.5 font-sans text-xs font-medium text-vo-yellow-foreground hover:bg-vo-yellow/90 disabled:opacity-60 disabled:cursor-not-allowed"
                          aria-label={t("processAria", { fileName: file.name })}
                        >
                          <Sparkles className="h-3.5 w-3.5 text-vo-yellow-foreground" aria-hidden />
                          {t("process")}
                        </button>
                      )}
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    disabled={externalProcessingIndex !== null}
                    className="shrink-0 rounded-md p-1 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={t("removeFileAria", { fileName: file.name })}
                  >
                    <X className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </button>
                </li>
              );
            })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
