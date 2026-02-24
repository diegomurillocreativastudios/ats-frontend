"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, X, Sparkles, Loader2 } from "lucide-react";

const CV_KEYWORDS = ["cv", "curriculum", "curriculum vitae", "resume"];

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

const validateFile = (file) => {
  const extension = "." + file.name.split(".").pop()?.toLowerCase();
  const typeOk =
    ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.includes(extension);
  const sizeOk = file.size <= MAX_SIZE_BYTES;
  if (!typeOk)
    return { valid: false, error: `Tipo no permitido. Solo PDF, DOC o DOCX.` };
  if (!sizeOk)
    return { valid: false, error: `El archivo supera 10 MB (${formatFileSize(file.size)}).` };
  return { valid: true };
};

/**
 * @param {{ onProcess?: (file: File, index: number) => void | Promise<void>, onProcessAll?: (files: File[]) => void | Promise<void> }} props
 * - onProcess: callback al hacer clic en "Procesar" (solo para archivos tipo CV/Resume). Puede ser async.
 * - onProcessAll: callback al hacer clic en "Procesar todos" (múltiples CV/Resume). Puede ser async.
 */
export default function DocumentsUploadZone({ onProcess, onProcessAll } = {}) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [processingIndex, setProcessingIndex] = useState(null);
  const [isProcessingAll, setIsProcessingAll] = useState(false);

  const processFiles = useCallback((fileList) => {
    if (!fileList?.length) return;
    setError(null);
    const newFiles = [];
    let firstError = null;
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const { valid, error: msg } = validateFile(file);
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
  };

  const clearAll = () => {
    setFiles([]);
    setError(null);
  };

  const processableFiles = files
    .map((file, index) => ({ file, index }))
    .filter(({ file }) => isResumeLikeFile(file.name));

  const handleProcessClick = async (file, index) => {
    if (!onProcess || processingIndex !== null || isProcessingAll) return;
    setError(null);
    setProcessingIndex(index);
    try {
      await Promise.resolve(onProcess(file, index));
    } catch (err) {
      const message = err?.message || err?.detail || "Error al procesar el documento.";
      setError(message);
    } finally {
      setProcessingIndex(null);
    }
  };

  const handleProcessAllClick = async () => {
    if (!onProcessAll || processableFiles.length < 2 || isProcessingAll || processingIndex !== null) return;
    setError(null);
    setIsProcessingAll(true);
    try {
      await Promise.resolve(onProcessAll(processableFiles.map(({ file }) => file)));
    } catch (err) {
      const message = err?.message || err?.detail || "Error al procesar los documentos.";
      setError(message);
    } finally {
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
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
          PDF, DOC, DOCX hasta 10 MB
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
              {processableFiles.length >= 2 && onProcessAll && (
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
          <ul className="flex flex-col gap-2" aria-label="Archivos seleccionados para subir">
            {files.map((file, index) => {
              const showProcessButton = isResumeLikeFile(file.name);
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
                    <button
                      type="button"
                      onClick={() => handleProcessClick(file, index)}
                      disabled={processingIndex !== null || isProcessingAll}
                      className="flex shrink-0 items-center gap-1.5 rounded-md border border-vo-yellow bg-vo-yellow px-2.5 py-1.5 font-inter text-xs font-medium text-vo-yellow-foreground hover:bg-vo-yellow/90 disabled:opacity-60 disabled:cursor-not-allowed"
                      aria-label={`Procesar con IA: ${file.name}`}
                      aria-busy={processingIndex === index}
                    >
                      {processingIndex === index ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-vo-yellow-foreground" aria-hidden />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 text-vo-yellow-foreground" aria-hidden />
                      )}
                      {processingIndex === index ? "Procesando…" : "Procesar"}
                    </button>
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
      )}
    </div>
  );
}
