"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Sparkles } from "lucide-react";
import Modal from "@/components/ui/Modal";
import SingleFileUploadZone from "@/components/candidato/SingleFileUploadZone";
import DocumentsUploadZone from "@/components/candidato/DocumentsUploadZone";
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
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { canStaffBulkPdfCvUpload } from "@/lib/roles";
import {
  PDF_DOCX_TXT_ACCEPT,
  PDF_DOCX_TXT_EXTENSIONS,
  PDF_DOCX_TXT_TYPES,
  PDF_ONLY_ACCEPT,
  PDF_ONLY_EXTENSIONS,
  PDF_ONLY_TYPES,
  UPLOAD_MAX_BYTES_15_MB,
  getUploadApiErrorMessage,
} from "@/lib/upload-constraints";

const CV_ACCEPTED_TYPES = [...PDF_DOCX_TXT_TYPES];
const CV_ACCEPTED_EXTENSIONS = [...PDF_DOCX_TXT_EXTENSIONS];
const CV_ACCEPT_ATTR = PDF_DOCX_TXT_ACCEPT;

const STAFF_CV_ACCEPTED_TYPES = [...PDF_ONLY_TYPES];
const STAFF_CV_ACCEPTED_EXTENSIONS = [...PDF_ONLY_EXTENSIONS];
const STAFF_CV_ACCEPT_ATTR = PDF_ONLY_ACCEPT;

const IDENTITY_DOC_ACCEPTED_TYPES = [...PDF_ONLY_TYPES];
const IDENTITY_DOC_ACCEPTED_EXTENSIONS = [...PDF_ONLY_EXTENSIONS];
const IDENTITY_DOC_ACCEPT_ATTR = PDF_ONLY_ACCEPT;

const AI_INGEST_COMPLETED_HOLD_MS = 550;

interface AiBarState {
  active: boolean;
  cycleKey: string | null;
  isCompleted: boolean;
  currentFileName: string | null;
  batchIndex: number;
  batchTotal: number;
}

const initialAiProcessingBar = (): AiBarState => ({
  active: false,
  cycleKey: null,
  isCompleted: false,
  currentFileName: null,
  batchIndex: 0,
  batchTotal: 0,
});

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

export default function AgregarCandidatoModal({
  isOpen,
  onClose,
  onSuccess,
  onSnackbar,
  variant = "recruiter",
}: AgregarCandidatoModalProps) {
  const { user } = useCurrentUser();
  const allowsStaffCvUpload = canStaffBulkPdfCvUpload({
    variant,
    role: user?.role,
  });
  const requiresIdentityDocuments = !allowsStaffCvUpload;
  const t = useTranslations("CandidatePortal.documents.modal");
  const copy = {
    title: t(`${variant}.title`),
    submitLabel: t(`${variant}.submit`),
    processingLabel: t("processing"),
    successMessage: t(`${variant}.success`),
    errorPrefix: t(`${variant}.errorPrefix`),
    cvRequiredError: t(`${variant}.cvRequired`),
    cvHeading: t(`${variant}.cvHeading`),
    cvDescription: t(`${variant}.cvDescription`),
    aiValidationNote: t(`${variant}.aiNote`),
  };
  const aiModalKpis = [
    {
      label: t("kpis.cv.label"),
      value: t("kpis.cv.value"),
      helper: t("kpis.cv.helper"),
    },
    {
      label: t("kpis.insert.label"),
      value: t("kpis.insert.value"),
      helper: t("kpis.insert.helper"),
    },
    {
      label: t("kpis.savings.label"),
      value: t("kpis.savings.value"),
      helper: t("kpis.savings.helper"),
    },
  ];
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvFiles, setCvFiles] = useState<File[]>([]);
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
  const [aiProcessingBar, setAiProcessingBar] = useState<AiBarState>(
    initialAiProcessingBar
  );
  const processingPanelRef = useRef<HTMLDivElement>(null);

  const scrollToProcessingPanel = useCallback(() => {
    const node = processingPanelRef.current;
    if (!node) return;

    const behavior =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth";

    window.requestAnimationFrame(() => {
      node.scrollIntoView({ behavior, block: "end" });
    });
  }, []);

  const resetUploadForm = useCallback(() => {
    setCvFile(null);
    setCvFiles([]);
    setIdentityFile(null);
    setIdentityDocumentTypeId("");
    setSubmitError(null);
    setAiProcessingBar(initialAiProcessingBar());
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
        getApiErrorMessage(err) || t("documentTypesLoadError");
      setIdentityDocumentTypes([]);
      setDocumentTypesError(message);
    } finally {
      setIsLoadingDocumentTypes(false);
    }
  }, [t]);

  useEffect(() => {
    if (!isOpen || !requiresIdentityDocuments) return;
    void fetchIdentityDocumentTypes();
  }, [isOpen, requiresIdentityDocuments, fetchIdentityDocumentTypes]);

  useEffect(() => {
    if (!aiProcessingBar.active || !aiProcessingBar.cycleKey) return;
    scrollToProcessingPanel();
  }, [
    aiProcessingBar.active,
    aiProcessingBar.cycleKey,
    aiProcessingBar.batchIndex,
    scrollToProcessingPanel,
  ]);

  const hasCvSelected = allowsStaffCvUpload
    ? cvFiles.length > 0
    : Boolean(cvFile);

  const isSubmitDisabled =
    isSubmittingCandidate ||
    !hasCvSelected ||
    (requiresIdentityDocuments &&
      (!identityFile || !identityDocumentTypeId.trim()));

  const handleCreateCandidate = async () => {
    if (isSubmittingCandidate) return;

    const filesToProcess = allowsStaffCvUpload
      ? cvFiles
      : cvFile
        ? [cvFile]
        : [];

    if (filesToProcess.length === 0) {
      setSubmitError(copy.cvRequiredError);
      return;
    }
    if (requiresIdentityDocuments) {
      if (!identityDocumentTypeId.trim()) {
        setSubmitError(t("documentTypeRequired"));
        return;
      }
      if (!identityFile) {
        setSubmitError(t("identityRequired"));
        return;
      }
    }

    setSubmitError(null);
    setIsSubmittingCandidate(true);

    try {
      for (let index = 0; index < filesToProcess.length; index++) {
        const file = filesToProcess[index];
        const cycleKey = createIngestCycleKey();
        setAiProcessingBar({
          active: true,
          cycleKey,
          isCompleted: false,
          currentFileName: file.name,
          batchIndex: index + 1,
          batchTotal: filesToProcess.length,
        });

        const formData = new FormData();
        formData.append("CvFile", file);
        if (requiresIdentityDocuments && identityFile) {
          formData.append("IdentityDocumentFile", identityFile);
          formData.append(
            "IdentityDocumentTypeId",
            identityDocumentTypeId.trim()
          );
        }
        formData.append("EntityType", "Candidate");

        await apiClient.postFormData("/Ingest/upload", formData);

        const isLastFile = index === filesToProcess.length - 1;
        if (isLastFile) {
          setAiProcessingBar({
            active: true,
            cycleKey,
            isCompleted: true,
            currentFileName: file.name,
            batchIndex: index + 1,
            batchTotal: filesToProcess.length,
          });
          await new Promise((resolve) =>
            setTimeout(resolve, AI_INGEST_COMPLETED_HOLD_MS)
          );
        }
      }

      onSuccess?.();
      onClose();
      resetUploadForm();
      const successMessage =
        allowsStaffCvUpload && filesToProcess.length > 1
          ? t("recruiter.successMany", { count: filesToProcess.length })
          : copy.successMessage;
      onSnackbar?.(successMessage, "success");
    } catch (err: unknown) {
      const message =
        getUploadApiErrorMessage(err) ||
        getApiErrorMessage(err) ||
        (variant === "self"
          ? t("processErrorSelf")
          : t("processErrorRecruiter"));
      setSubmitError(message);
      setAiProcessingBar(initialAiProcessingBar());
      onSnackbar?.(`${copy.errorPrefix}: ${message}`, "error");
    } finally {
      setIsSubmittingCandidate(false);
    }
  };

  const documentTypeSelectOptions = useMemo(
    () => identityDocumentTypes,
    [identityDocumentTypes]
  );

  const externalProcessingIndex =
    aiProcessingBar.active && !aiProcessingBar.isCompleted
      ? aiProcessingBar.batchIndex - 1
      : null;

  const processingStatusLabel =
    aiProcessingBar.currentFileName && aiProcessingBar.batchTotal > 1
      ? t("processingCurrentCvBatch", {
          fileName: aiProcessingBar.currentFileName,
          current: aiProcessingBar.batchIndex,
          total: aiProcessingBar.batchTotal,
        })
      : aiProcessingBar.currentFileName
        ? t("processingCurrentCvSingle", {
            fileName: aiProcessingBar.currentFileName,
          })
        : null;

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
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("cancel")}
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
          <p className="font-sans text-sm text-foreground">
            {t("aiIntro")}
          </p>
          <p className="font-sans text-xs text-muted-foreground">
            {copy.aiValidationNote}
          </p>
        </div>

        <div
          className="grid gap-2 sm:grid-cols-3"
          aria-label={t("kpisAria")}
        >
          {aiModalKpis.map((item) => (
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
          {!allowsStaffCvUpload ? (
            <SingleFileUploadZone
              file={cvFile}
              onFileChange={setCvFile}
              acceptedTypes={CV_ACCEPTED_TYPES}
              acceptedExtensions={CV_ACCEPTED_EXTENSIONS}
              accept={CV_ACCEPT_ATTR}
              primaryText={t("cvPrimaryText")}
              helperText={t("cvHelperText")}
              ariaLabel={t("cvAria")}
              typeErrorMessage={t("cvTypeError")}
              maxSizeBytes={UPLOAD_MAX_BYTES_15_MB}
              disabled={isSubmittingCandidate}
              inputId="candidato-cv-input"
            />
          ) : (
            <DocumentsUploadZone
              acceptedTypes={STAFF_CV_ACCEPTED_TYPES}
              acceptedExtensions={STAFF_CV_ACCEPTED_EXTENSIONS}
              accept={STAFF_CV_ACCEPT_ATTR}
              helperText={t("cvHelperTextPdfOnly")}
              stagingOnly
              processAllAcceptedFiles
              maxSizeBytes={UPLOAD_MAX_BYTES_15_MB}
              onFilesChange={setCvFiles}
              externalProcessingIndex={externalProcessingIndex}
            />
          )}
        </section>

        {requiresIdentityDocuments ? (
          <>
            <section
              className="flex flex-col gap-2"
              aria-labelledby="candidato-document-type-heading"
            >
              <div className="flex flex-col gap-1">
                <h3
                  id="candidato-document-type-heading"
                  className="font-sans text-sm font-semibold text-foreground"
                >
                  {t("documentTypeHeading")}
                  <span className="text-vo-pink ml-1" aria-hidden>
                    *
                  </span>
                </h3>
                <p className="font-sans text-xs text-muted-foreground">
                  {t("documentTypeDescription")}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <select
                  id="candidato-document-type-select"
                  aria-label={t("documentTypeAria")}
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
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-vo-purple disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">
                    {isLoadingDocumentTypes
                      ? t("selectLoading")
                      : documentTypesError
                        ? t("selectLoadError")
                        : documentTypeSelectOptions.length === 0
                          ? t("selectEmpty")
                          : t("selectPlaceholder")}
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
                    {t("selectLoading")}
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
                      {t("retry")}
                    </button>
                  </div>
                ) : null}
                {!isLoadingDocumentTypes &&
                !documentTypesError &&
                documentTypeSelectOptions.length === 0 ? (
                  <p className="font-sans text-xs text-muted-foreground">
                    {t("noTypesConfigured")}
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
                  {t("identityHeading")}
                  <span className="text-vo-pink ml-1" aria-hidden>
                    *
                  </span>
                </h3>
                <p className="font-sans text-xs text-muted-foreground">
                  {t("identityDescription")}
                </p>
              </div>
              <SingleFileUploadZone
                file={identityFile}
                onFileChange={setIdentityFile}
                acceptedTypes={IDENTITY_DOC_ACCEPTED_TYPES}
                acceptedExtensions={IDENTITY_DOC_ACCEPTED_EXTENSIONS}
                accept={IDENTITY_DOC_ACCEPT_ATTR}
                primaryText={t("identityPrimaryText")}
                helperText={t("identityHelperText")}
                ariaLabel={t("identityAria")}
                typeErrorMessage={t("identityTypeError")}
                maxSizeBytes={UPLOAD_MAX_BYTES_15_MB}
                disabled={isSubmittingCandidate}
                inputId="candidato-identity-input"
              />
            </section>
          </>
        ) : null}

        {aiProcessingBar.active && aiProcessingBar.cycleKey ? (
          <div
            ref={processingPanelRef}
            className="flex flex-col gap-2 rounded-lg border border-vo-purple/20 bg-vo-purple/5 p-3 scroll-mt-4"
            role="status"
            aria-live="polite"
            aria-label={t("processingPanelAria")}
          >
            <AiDisclosureBadge />
            <AiDisclosurePillProgress
              key={aiProcessingBar.cycleKey}
              percent={null}
              isCompleted={aiProcessingBar.isCompleted}
              ingestStepLabels
              className="mt-0!"
            />
            {processingStatusLabel ? (
              <p className="font-sans text-sm font-medium text-foreground">
                {processingStatusLabel}
              </p>
            ) : null}
            <p className="font-sans text-xs text-muted-foreground">
              {copy.aiValidationNote}
            </p>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
