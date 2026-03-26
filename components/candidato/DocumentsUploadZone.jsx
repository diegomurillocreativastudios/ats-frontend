"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, X, Sparkles, Loader2, Check } from "lucide-react";

const CV_KEYWORDS = ["cv", "curriculum", "curriculum vitae", "resume", "hoja de vida", "hojadevida"];

const isResumeLikeFile = (fileName) => {
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

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const validateFile = (file, allowedTypes, allowedExtensions) => {
  const extension = "." + file.name.split(".").pop()?.toLowerCase();
  const typeOk =
    allowedTypes.includes(file.type) || allowedExtensions.includes(extension);
  const sizeOk = file.size <= MAX_SIZE_BYTES;
  if (!typeOk)
    return { valid: false, error: `Tipo no permitido. Solo PDF, DOC o DOCX.` };
  if (!sizeOk)
    return { valid: false, error: `El archivo supera 10 MB (${formatFileSize(file.size)}).` };
  return { valid: true };
};

/**
 * @param {{
 *  onProcess?: (file: File, index: number) => void | Promise<void>,
 *  onProcessAll?: (files: File[]) => void | Promise<void>,
 *  acceptedTypes?: string[],
 *  acceptedExtensions?: string[],
 *  accept?: string,
 *  helperText?: string,
 *  processAllAcceptedFiles?: boolean,
 * }} props
 * - onProcess: callback al hacer clic en "Procesar". Puede ser async.
 * - onProcessAll: callback al hacer clic en "Procesar todos". Puede ser async.
 * - acceptedTypes / acceptedExtensions: sobreescriben los tipos/extensiones permitidos.
 * - accept: valor para el atributo `accept` del input, si se quiere personalizar.
 * - processAllAcceptedFiles: si true, todos los archivos aceptados son procesables (no solo los que tienen CV/Resume en el nombre).
 */
export default function DocumentsUploadZone({
  onProcess,
  onProcessAll,
  acceptedTypes,
  acceptedExtensions,
  accept,
  helperText,
  processAllAcceptedFiles = false,
} = {}) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [processingIndex, setProcessingIndex] = useState(null);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [processedIndices, setProcessedIndices] = useState(() => new Set());

  const effectiveAcceptedTypes =
    Array.isArray(acceptedTypes) && acceptedTypes.length > 0
      ? acceptedTypes
      : ACCEPTED_TYPES;
  const effectiveAcceptedExtensions =
    Array.isArray(acceptedExtensions) && acceptedExtensions.length > 0
      ? acceptedExtensions
      : ACCEPTED_EXTENSIONS;

  const processFiles = useCallback((fileList) => {
    if (!fileList?.length) return;
    setError(null);
    const newFiles = [];
    let firstError = null;
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const { valid, error: msg } = validateFile(
        file,
        effectiveAcceptedTypes,
        effectiveAcceptedExtensions
      );
      if (valid) {
        newFiles.push(file);
      } else if (!firstError) {
        firstError = msg;
      }
    }
    if (firstError) setError(firstError);
    if (newFiles.length > 0) {
      setFiles((prev) => [...prev, ...newFiles]);
    }
  }, []);

  const handleClick = () => {
    setError(null);
    inputRef.current?.click();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  const handleInputChange = (e) => {
    const selected = e.target.files;
    if (selected?.length) processFiles(Array.from(selected));
    e.target.value = "";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dropped = e.dataTransfer?.files;
    if (dropped?.length) processFiles(Array.from(dropped));
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setError(null);
    setProcessedIndices((prev) => {
      const next = new Set();
      prev.forEach((i) => {
        if (i < index) next.add(i);
        if (i > index) next.add(i - 1);
      });
      return next;
    });
    if (processingIndex === index) setProcessingIndex(null);
    else if (processingIndex !== null && processingIndex > index) setProcessingIndex((p) => p - 1);
  };

  const clearAll = () => {
    setFiles([]);
    setError(null);
    setProcessedIndices(new Set());
    setProcessingIndex(null);
  };

  const processableFiles = processAllAcceptedFiles
    ? files.map((file, index) => ({ file, index }))
    : files
        .map((file, index) => ({ file, index }))
        .filter(({ file }) => isResumeLikeFile(file.name));

  const handleProcessClick = async (file, index) => {
    if (!onProcess || processingIndex !== null || isProcessingAll) return;
    setError(null);
    setProcessingIndex(index);
    try {
      await Promise.resolve(onProcess(file, index));
      setProcessedIndices((prev) => new Set([...prev, index]));
    } catch (err) {
      // Si el error fue lanzado "silenciosamente" (ej. para mostrar el error
      // solo en el modal superior), no mostramos un segundo mensaje aquí.
      if (err?.silent) return;
      const message = err?.message || err?.detail || "Error al procesar el documento.";
      setError(message);
    } finally {
      setProcessingIndex(null);
    }
  };

  const handleProcessAllClick = async () => {
    if (!onProcess || processableFiles.length < 2 || isProcessingAll || processingIndex !== null) return;
    setError(null);
    setIsProcessingAll(true);
    try {
      for (const { file, index } of processableFiles) {
        setProcessingIndex(index);
        await Promise.resolve(onProcess(file, index));
        setProcessedIndices((prev) => new Set([...prev, index]));
      }
    } catch (err) {
      if (err?.silent) return;
      const message = err?.message || err?.detail || "Error al procesar los documentos.";
      setError(message);
    } finally {
      setProcessingIndex(null);
      setIsProcessingAll(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        role="button"
        tabIndex={0}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-muted p-5 transition-colors md:gap-3 md:p-6 ${
          isDragging
            ? "border-vo-purple bg-[#F3E8FF]"
            : "border-border hover:border-muted-foreground/30"
        }`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-label="Arrastra archivos o haz clic para subir documentos"
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
        <p className="text-center font-inter text-sm font-medium text-muted-foreground md:text-base">
          {isDragging ? "Suelta los archivos aquí" : "Arrastra archivos aquí o haz clic para subir"}
        </p>
        <p className="text-center font-inter text-xs text-muted-foreground">
          {helperText || "PDF, DOC, DOCX hasta 10 MB"}
        </p>
      </div>

      {error && (
        <p className="font-inter text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-inter text-sm font-medium text-foreground">
              {files.length} archivo{files.length !== 1 ? "s" : ""} seleccionado
              {files.length !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2">
              {processableFiles.length >= 2 && onProcess && (
                <button
                  type="button"
                  onClick={handleProcessAllClick}
                  disabled={isProcessingAll || processingIndex !== null}
                  className="flex shrink-0 items-center gap-1.5 rounded-md border border-vo-yellow bg-vo-yellow px-2.5 py-1.5 font-inter text-xs font-medium text-vo-yellow-foreground hover:bg-vo-yellow/90 disabled:opacity-60 disabled:cursor-not-allowed"
                  aria-label="Procesar todos los CV/Resume con IA"
                  aria-busy={isProcessingAll}
                >
                  {isProcessingAll ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-vo-yellow-foreground" aria-hidden />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-vo-yellow-foreground" aria-hidden />
                  )}
                  {isProcessingAll ? "Procesando…" : "Procesar todos"}
                </button>
              )}
              <button
                type="button"
                onClick={clearAll}
                className="font-inter text-sm font-medium text-vo-purple hover:underline"
              >
                Quitar todos
              </button>
            </div>
          </div>
          <div
            className="max-h-[min(280px,45vh)] overflow-y-auto overscroll-y-contain pr-1"
            role="region"
            aria-label="Lista de archivos seleccionados"
          >
            <ul className="flex flex-col gap-2">
            {files.map((file, index) => {
              const showProcessButton = processAllAcceptedFiles || isResumeLikeFile(file.name);
              return (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
                >
                  <span className="min-w-0 flex-1 truncate font-inter text-sm text-foreground">
                    {file.name}
                  </span>
                  <span className="shrink-0 font-inter text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </span>
                  {showProcessButton && (
                    <>
                      {processedIndices.has(index) ? (
                        <span
                          className="flex shrink-0 items-center gap-1.5 rounded-md border border-success bg-success/10 px-2.5 py-1.5 font-inter text-xs font-medium text-success"
                          aria-label={`Procesado: ${file.name}`}
                        >
                          <Check className="h-3.5 w-3.5 text-success" aria-hidden />
                          Listo
                        </span>
                      ) : processingIndex === index ? (
                        <span
                          className="flex shrink-0 items-center gap-1.5 rounded-md border border-vo-yellow bg-vo-yellow px-2.5 py-1.5 font-inter text-xs font-medium text-vo-yellow-foreground"
                          aria-busy
                          aria-label={`Procesando: ${file.name}`}
                        >
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-vo-yellow-foreground" aria-hidden />
                          Procesando…
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleProcessClick(file, index)}
                          disabled={processingIndex !== null || isProcessingAll}
                          className="flex shrink-0 items-center gap-1.5 rounded-md border border-vo-yellow bg-vo-yellow px-2.5 py-1.5 font-inter text-xs font-medium text-vo-yellow-foreground hover:bg-vo-yellow/90 disabled:opacity-60 disabled:cursor-not-allowed"
                          aria-label={`Procesar con IA: ${file.name}`}
                        >
                          <Sparkles className="h-3.5 w-3.5 text-vo-yellow-foreground" aria-hidden />
                          Procesar
                        </button>
                      )}
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="shrink-0 rounded-md p-1 hover:bg-muted"
                    aria-label={`Quitar ${file.name}`}
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
