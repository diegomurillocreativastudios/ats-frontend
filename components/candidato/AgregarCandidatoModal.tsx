"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2, Sparkles } from "lucide-react";
import Modal from "@/components/ui/Modal";
import SingleFileUploadZone from "@/components/candidato/SingleFileUploadZone";
import {
  AiDisclosureBadge,
  AiDisclosurePillProgress,
  AiKpiCard,
} from "@/components/rrhh/AiDisclosure";
import {
  listIdentityDocumentTypes,
  type IdentityDocumentTypeOptionDto,
} from "@/lib/api/identity-document-types";
import { apiClient } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";

const AI_MODAL_KPIS = [
  {
    label: "Desglose de CV",
    value: "De hasta 15 min a 30s-1min por CV",
    helper: "Captura estructurada en una sola corrida",
  },
  {
    label: "Inserción de datos",
    value: "Registro automático en el mismo flujo",
    helper: "Sin transcripción manual a BD o Excel",
  },
  {
    label: "Ahorro estimado",
    value: "Reducción operativa del 93.3% al 96.7%",
    helper: "En extracción, desglose e inserción de CV",
  },
];

const CV_ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const CV_ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".doc", ".txt"];
const CV_ACCEPT_ATTR =
  ".pdf,.docx,.doc,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

const IDENTITY_DOC_ACCEPTED_TYPES = ["application/pdf"];
const IDENTITY_DOC_ACCEPTED_EXTENSIONS = [".pdf"];
const IDENTITY_DOC_ACCEPT_ATTR = "application/pdf,.pdf";

const AI_INGEST_COMPLETED_HOLD_MS = 550;

interface AiBarState {
  active: boolean;
  cycleKey: string | null;
  isCompleted: boolean;
}

const createIngestCycleKey = (): string => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `ingest-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

export type AgregarCandidatoModalVariant = "recruiter" | "self";

interface AgregarCandidatoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onSnackbar?: (message: string, variant: "success" | "error") => void;
  /** RRHH crea candidatos nuevos; self actualiza el perfil del candidato autenticado. */
  variant?: AgregarCandidatoModalVariant;
}

const MODAL_COPY: Record<
  AgregarCandidatoModalVariant,
  {
    title: string;
    submitLabel: string;
    processingLabel: string;
    successMessage: string;
    errorPrefix: string;
    cvRequiredError: string;
    cvHeading: string;
    cvDescription: string;
    aiValidationNote: string;
  }
> = {
  recruiter: {
    title: "Agregar candidato",
    submitLabel: "Crear candidato",
    processingLabel: "Procesando...",
    successMessage: "Candidato creado y procesado correctamente.",
    errorPrefix: "Error al crear el candidato",
    cvRequiredError: "Debes subir el CV del candidato.",
    cvHeading: "CV del candidato",
    cvDescription:
      "Sube el CV del candidato para crear su perfil automáticamente.",
    aiValidationNote: "Resultado generado por IA. Requiere validación de RRHH.",
  },
  self: {
    title: "Completar información",
    submitLabel: "Guardar información",
    processingLabel: "Procesando...",
    successMessage:
      "Tu información fue actualizada correctamente. Revisá tu perfil para ver los datos.",
    errorPrefix: "Error al guardar tu información",
    cvRequiredError: "Debes subir tu CV.",
    cvHeading: "Tu CV",
    cvDescription:
      "Sube tu CV para completar automáticamente la información de tu perfil.",
    aiValidationNote:
      "Resultado generado por IA. Revisá los datos en Mi perfil antes de postular.",
  },
};

export default function AgregarCandidatoModal({
  isOpen,
  onClose,
  onSuccess,
  onSnackbar,
  variant = "recruiter",
}: AgregarCandidatoModalProps) {
  const copy = MODAL_COPY[variant];
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [identityFile, setIdentityFile] = useState<File | null>(null);
  const [identityDocumentTypeId, setIdentityDocumentTypeId] = useState("");
  const [identityDocumentTypes, setIdentityDocumentTypes] = useState<
    IdentityDocumentTypeOptionDto[]
  >([]);
  const [isLoadingDocumentTypes, setIsLoadingDocumentTypes] = useState(false);
  const [documentTypesError, setDocumentTypesError] = useState<string | null>(
    null
  );
  const [isSubmittingCandidate, setIsSubmittingCandidate] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [aiProcessingBar, setAiProcessingBar] = useState<AiBarState>({
    active: false,
    cycleKey: null,
    isCompleted: false,
  });

  const resetUploadForm = useCallback(() => {
    setCvFile(null);
    setIdentityFile(null);
    setIdentityDocumentTypeId("");
    setSubmitError(null);
    setAiProcessingBar({ active: false, cycleKey: null, isCompleted: false });
  }, []);

  const handleCloseModal = () => {
    if (isSubmittingCandidate) return;
    onClose();
    resetUploadForm();
  };

  const fetchIdentityDocumentTypes = useCallback(async () => {
    setIsLoadingDocumentTypes(true);
    setDocumentTypesError(null);
    try {
      const options = await listIdentityDocumentTypes();
      setIdentityDocumentTypes(options);
    } catch (err: unknown) {
      const message =
        getApiErrorMessage(err) ||
        "No se pudieron cargar los tipos de documento.";
      setIdentityDocumentTypes([]);
      setDocumentTypesError(message);
    } finally {
      setIsLoadingDocumentTypes(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    void fetchIdentityDocumentTypes();
  }, [isOpen, fetchIdentityDocumentTypes]);

  const isSubmitDisabled =
    isSubmittingCandidate ||
    !cvFile ||
    !identityFile ||
    !identityDocumentTypeId.trim();

  const handleCreateCandidate = async () => {
    if (isSubmittingCandidate) return;

    if (!cvFile) {
      setSubmitError(copy.cvRequiredError);
      return;
    }
    if (!identityDocumentTypeId.trim()) {
      setSubmitError("Debes seleccionar el tipo de documento.");
      return;
    }
    if (!identityFile) {
      setSubmitError("Debes subir el documento de identidad.");
      return;
    }

    setSubmitError(null);
    const cycleKey = createIngestCycleKey();
    setAiProcessingBar({ active: true, cycleKey, isCompleted: false });
    setIsSubmittingCandidate(true);

    const formData = new FormData();
    formData.append("CvFile", cvFile);
    formData.append("IdentityDocumentFile", identityFile);
    formData.append("IdentityDocumentTypeId", identityDocumentTypeId.trim());
    formData.append("EntityType", "Candidate");

    try {
      await apiClient.postFormData("/Ingest/upload", formData);

      setAiProcessingBar({ active: true, cycleKey, isCompleted: true });
      await new Promise((resolve) =>
        setTimeout(resolve, AI_INGEST_COMPLETED_HOLD_MS)
      );

      onSuccess?.();
      onClose();
      resetUploadForm();
      onSnackbar?.(copy.successMessage, "success");
    } catch (err: unknown) {
      const message =
        getApiErrorMessage(err) ||
        (variant === "self"
          ? "Error al procesar tu información."
          : "Error al procesar el candidato.");
      setSubmitError(message);
      setAiProcessingBar({ active: false, cycleKey: null, isCompleted: false });
      onSnackbar?.(`${copy.errorPrefix}: ${message}`, "error");
    } finally {
      setIsSubmittingCandidate(false);
    }
  };

  const documentTypeSelectOptions = useMemo(
    () => identityDocumentTypes,
    [identityDocumentTypes]
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCloseModal}
      title={copy.title}
      size="lg"
      closeOnEscape={!isSubmittingCandidate}
      closeOnOverlayClick={!isSubmittingCandidate}
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {submitError ? (
            <p
              className="font-sans text-sm text-destructive sm:mr-auto"
              role="alert"
            >
              {submitError}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={isSubmittingCandidate}
              className="inline-flex items-center justify-center rounded-md border border-border bg-white px-4 py-2 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreateCandidate}
              disabled={isSubmitDisabled}
              aria-busy={isSubmittingCandidate}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-vo-purple px-4 py-2 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmittingCandidate ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden />
              )}
              {isSubmittingCandidate ? copy.processingLabel : copy.submitLabel}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2 rounded-lg border border-vo-purple/20 bg-vo-purple/5 p-3">
          <AiDisclosureBadge />
          {aiProcessingBar.active && aiProcessingBar.cycleKey ? (
            <AiDisclosurePillProgress
              key={aiProcessingBar.cycleKey}
              percent={null}
              isCompleted={aiProcessingBar.isCompleted}
              ingestStepLabels
            />
          ) : null}
          <p className="font-sans text-sm text-foreground">
            Los CVs y documentos de identidad se procesan con IA para extraer
            información preliminar del perfil.
          </p>
          <p className="font-sans text-xs text-muted-foreground">
            {copy.aiValidationNote}
          </p>
        </div>

        <div
          className="grid gap-2 sm:grid-cols-3"
          aria-label="KPIs de eficiencia del ATS"
        >
          {AI_MODAL_KPIS.map((item) => (
            <AiKpiCard
              key={item.label}
              label={item.label}
              value={item.value}
              helper={item.helper}
            />
          ))}
        </div>

        <section
          className="flex flex-col gap-2"
          aria-labelledby="candidato-cv-heading"
        >
          <div className="flex flex-col gap-1">
            <h3
              id="candidato-cv-heading"
              className="font-sans text-sm font-semibold text-foreground"
            >
                {copy.cvHeading}
                <span className="text-vo-pink ml-1" aria-hidden>
                  *
                </span>
              </h3>
              <p className="font-sans text-xs text-muted-foreground">
                {copy.cvDescription}
              </p>
          </div>
          <SingleFileUploadZone
            file={cvFile}
            onFileChange={setCvFile}
            acceptedTypes={CV_ACCEPTED_TYPES}
            acceptedExtensions={CV_ACCEPTED_EXTENSIONS}
            accept={CV_ACCEPT_ATTR}
            primaryText="Arrastra el CV aquí o haz clic para subir"
            helperText="PDF, DOCX o TXT hasta 10 MB"
            ariaLabel="Arrastra el CV o haz clic para subir"
            typeErrorMessage="Tipo no permitido. Solo PDF, DOCX o TXT."
            disabled={isSubmittingCandidate}
            inputId="candidato-cv-input"
          />
        </section>

        <section
          className="flex flex-col gap-2"
          aria-labelledby="candidato-document-type-heading"
        >
          <div className="flex flex-col gap-1">
            <h3
              id="candidato-document-type-heading"
              className="font-sans text-sm font-semibold text-foreground"
            >
              Tipo de documento de identidad
              <span className="text-vo-pink ml-1" aria-hidden>
                *
              </span>
            </h3>
            <p className="font-sans text-xs text-muted-foreground">
              Selecciona el tipo de documento que corresponde al PDF que se
              cargará.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <select
              id="candidato-document-type-select"
              aria-label="Tipo de documento de identidad"
              value={identityDocumentTypeId}
              onChange={(event) =>
                setIdentityDocumentTypeId(event.target.value)
              }
              disabled={
                isSubmittingCandidate ||
                isLoadingDocumentTypes ||
                Boolean(documentTypesError) ||
                documentTypeSelectOptions.length === 0
              }
              className="h-10 w-full rounded-md border border-input bg-white px-3 py-2 font-sans text-sm text-black focus:border-transparent focus:outline-none focus:ring-2 focus:ring-vo-purple disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">
                {isLoadingDocumentTypes
                  ? "Cargando tipos de documento..."
                  : documentTypesError
                    ? "No se pudieron cargar los tipos de documento"
                    : documentTypeSelectOptions.length === 0
                      ? "No hay tipos de documento disponibles"
                      : "Selecciona el tipo de documento"}
              </option>
              {documentTypeSelectOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
            {isLoadingDocumentTypes ? (
              <p
                className="flex items-center gap-2 font-sans text-xs text-muted-foreground"
                aria-live="polite"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Cargando tipos de documento...
              </p>
            ) : null}
            {documentTypesError ? (
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className="font-sans text-xs text-destructive"
                  role="alert"
                >
                  {documentTypesError}
                </p>
                <button
                  type="button"
                  onClick={() => void fetchIdentityDocumentTypes()}
                  className="font-sans text-xs font-medium text-vo-purple hover:underline focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                >
                  Reintentar
                </button>
              </div>
            ) : null}
            {!isLoadingDocumentTypes &&
            !documentTypesError &&
            documentTypeSelectOptions.length === 0 ? (
              <p className="font-sans text-xs text-muted-foreground">
                Aún no hay tipos de documento configurados. Pídele a un
                administrador que cree los catálogos.
              </p>
            ) : null}
          </div>
        </section>

        <section
          className="flex flex-col gap-2"
          aria-labelledby="candidato-identity-heading"
        >
          <div className="flex flex-col gap-1">
            <h3
              id="candidato-identity-heading"
              className="font-sans text-sm font-semibold text-foreground"
            >
              Documento de identidad
              <span className="text-vo-pink ml-1" aria-hidden>
                *
              </span>
            </h3>
            <p className="font-sans text-xs text-muted-foreground">
              Sube el documento de identidad del candidato en formato PDF.
            </p>
          </div>
          <SingleFileUploadZone
            file={identityFile}
            onFileChange={setIdentityFile}
            acceptedTypes={IDENTITY_DOC_ACCEPTED_TYPES}
            acceptedExtensions={IDENTITY_DOC_ACCEPTED_EXTENSIONS}
            accept={IDENTITY_DOC_ACCEPT_ATTR}
            primaryText="Arrastra el documento aquí o haz clic para subir"
            helperText="Solo archivos PDF hasta 10 MB"
            ariaLabel="Arrastra el documento de identidad o haz clic para subir"
            typeErrorMessage="Tipo no permitido. Solo archivos PDF."
            disabled={isSubmittingCandidate}
            inputId="candidato-identity-input"
          />
        </section>
      </div>
    </Modal>
  );
}
