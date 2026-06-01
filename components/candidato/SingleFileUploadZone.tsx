"use client"

import {
  useRef,
  useState,
  useCallback,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react"
import { Upload, X, FileText } from "lucide-react"

const DEFAULT_MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface ValidationResult {
  valid: boolean
  error?: string
}

const validateSingleFile = (
  file: File,
  allowedTypes: string[],
  allowedExtensions: string[],
  maxSizeBytes: number,
  typeErrorMessage: string
): ValidationResult => {
  const extension = "." + (file.name.split(".").pop()?.toLowerCase() ?? "")
  const typeOk =
    (allowedTypes.length === 0 || allowedTypes.includes(file.type)) ||
    allowedExtensions.includes(extension)
  if (!typeOk) {
    return { valid: false, error: typeErrorMessage }
  }
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `El archivo supera ${formatFileSize(maxSizeBytes)} (${formatFileSize(file.size)}).`,
    }
  }
  return { valid: true }
}

interface SingleFileUploadZoneProps {
  /** Archivo actualmente seleccionado. */
  file: File | null
  /** Notifica al padre el cambio de archivo (null al quitar). */
  onFileChange: (file: File | null) => void
  /** MIME types aceptados para validación (p. ej. ["application/pdf"]). */
  acceptedTypes?: string[]
  /** Extensiones aceptadas (incluye el punto, p. ej. [".pdf"]). */
  acceptedExtensions?: string[]
  /** Valor para el atributo `accept` del input file. */
  accept?: string
  /** Texto secundario debajo del prompt principal (p. ej. "Solo archivos PDF hasta 10 MB"). */
  helperText?: string
  /** Texto principal del dropzone (p. ej. "Arrastra el documento aquí o haz clic para subir"). */
  primaryText?: string
  /** Etiqueta accesible para el botón del dropzone. */
  ariaLabel?: string
  /** Tamaño máximo permitido. Por defecto 10 MB. */
  maxSizeBytes?: number
  /** Mensaje de error a mostrar cuando el tipo de archivo no es válido. */
  typeErrorMessage?: string
  /** Inhabilita las interacciones (durante envío, por ejemplo). */
  disabled?: boolean
  /** ID del input para asociar con un label externo. */
  inputId?: string
}

/**
 * Dropzone reutilizable para subir un único archivo. Reemplaza la selección
 * previa al volver a soltar/seleccionar y muestra un resumen del archivo con
 * acción para quitarlo.
 */
export default function SingleFileUploadZone({
  file,
  onFileChange,
  acceptedTypes = [],
  acceptedExtensions = [],
  accept,
  helperText,
  primaryText = "Arrastra el archivo aquí o haz clic para subir",
  ariaLabel = "Arrastra un archivo o haz clic para subir",
  maxSizeBytes = DEFAULT_MAX_SIZE_BYTES,
  typeErrorMessage = "Tipo de archivo no permitido.",
  disabled = false,
  inputId,
}: SingleFileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFiles = useCallback(
    (incoming: FileList | File[] | null) => {
      if (!incoming) return
      const list = Array.from(incoming)
      if (list.length === 0) return
      const next = list[0]
      const { valid, error: msg } = validateSingleFile(
        next,
        acceptedTypes,
        acceptedExtensions,
        maxSizeBytes,
        typeErrorMessage
      )
      if (!valid) {
        setError(msg ?? "Archivo no válido.")
        return
      }
      setError(null)
      onFileChange(next)
    },
    [
      acceptedTypes,
      acceptedExtensions,
      maxSizeBytes,
      onFileChange,
      typeErrorMessage,
    ]
  )

  const handleClick = () => {
    if (disabled) return
    setError(null)
    inputRef.current?.click()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handleClick()
    }
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files
    handleFiles(selected)
    event.target.value = ""
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (disabled) return
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const rel = event.relatedTarget
    if (rel instanceof Node && event.currentTarget.contains(rel)) return
    setIsDragging(false)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (disabled) return
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
    const dropped = event.dataTransfer?.files
    handleFiles(dropped ?? null)
  }

  const handleRemove = () => {
    if (disabled) return
    onFileChange(null)
    setError(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-label={ariaLabel}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-muted p-5 transition-colors md:gap-3 md:p-6 ${
          isDragging
            ? "border-vo-purple bg-[#F3E8FF]"
            : "border-border hover:border-muted-foreground/30"
        } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          className="sr-only"
          aria-hidden
          disabled={disabled}
          onChange={handleInputChange}
        />
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted-foreground/10 md:h-12 md:w-12">
          <Upload
            className="h-5 w-5 text-muted-foreground md:h-6 md:w-6"
            aria-hidden
          />
        </div>
        <p className="text-center font-sans text-sm font-medium text-muted-foreground md:text-base">
          {isDragging ? "Suelta el archivo aquí" : primaryText}
        </p>
        {helperText ? (
          <p className="text-center font-sans text-xs text-muted-foreground">
            {helperText}
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="font-sans text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {file ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-vo-purple/10">
            <FileText className="h-4 w-4 text-vo-purple" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-sans text-sm font-medium text-foreground">
              {file.name}
            </p>
            <p className="font-sans text-xs text-muted-foreground">
              {formatFileSize(file.size)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="shrink-0 rounded-md p-1 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Quitar ${file.name}`}
          >
            <X className="h-4 w-4 text-muted-foreground" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  )
}
