"use client"

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useLocale, useTranslations } from "next-intl"
import { ChevronDown } from "lucide-react"
import Modal from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import { PhoneCountryInput } from "@/components/ui/PhoneCountryInput"
import { getCompanyName } from "@/lib/app-brand"
import {
  CANDIDATE_AUTH_CONSENT_DOCUMENT_VERSION,
  CANDIDATE_AUTH_CONSENT_SECTION_IDS,
  type CandidateAuthConsentSubmitBody,
} from "@/lib/candidate-auth-consent"

const SECTION_IDS = CANDIDATE_AUTH_CONSENT_SECTION_IDS

type SectionId = (typeof SECTION_IDS)[number]

const DEFAULT_COUNTRY_ISO2 = "SV"

interface ConsentSignatureFields {
  firstNames: string
  lastNames: string
  signature: string
  documentId: string
  date: string
  email: string
  phone: string
  phoneCountryIso2: string
}

export type ConsentAuthorizationSubmitPayload = CandidateAuthConsentSubmitBody

export interface ConsentAuthorizationInitialValues {
  firstNames?: string | null
  lastNames?: string | null
  documentId?: string | null
  email?: string | null
  phone?: string | null
  phoneCountryIso2?: string | null
}

interface ConsentAuthorizationModalProps {
  isOpen: boolean
  onClose: () => void
  /** Called with the API payload; may be async (modal shows submitting state). */
  onAccept: (payload: ConsentAuthorizationSubmitPayload) => void | Promise<void>
  /** @deprecated Prefer `initialValues.email`. Kept for mi-perfil callers. */
  initialEmail?: string | null
  /** Prefill signature fields (e.g. from public vacancy apply form). */
  initialValues?: ConsentAuthorizationInitialValues | null
  /** Visual accents: candidate portal (VO) vs public opportunities. */
  variant?: "candidate" | "public"
  /** When true, overlay/cancel close is disabled (e.g. consent required). */
  isDismissible?: boolean
}

const VARIANT_STYLES = {
  candidate: {
    checkbox:
      "h-4 w-4 shrink-0 rounded border border-input accent-vo-purple text-vo-purple focus:outline-none focus:ring-2 focus:ring-vo-purple/50 focus:ring-offset-1 disabled:opacity-50",
    progressText: "font-sans text-xs font-medium text-vo-purple",
    focusRing:
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2",
    requiredMark: "ml-1 text-vo-pink",
  },
  public: {
    checkbox:
      "h-4 w-4 shrink-0 rounded border border-input accent-ats-terracotta text-ats-terracotta focus:outline-none focus:ring-2 focus:ring-ats-cobre/50 focus:ring-offset-1 disabled:opacity-50",
    progressText: "font-sans text-xs font-medium text-ats-terracotta",
    focusRing:
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-ats-cobre focus-visible:ring-offset-2",
    requiredMark: "ml-1 text-ats-terracotta",
  },
} as const

const fieldClassName =
  "glass-input h-10 w-full rounded-md px-3 py-2 font-sans text-sm disabled:cursor-not-allowed disabled:opacity-70"

const fieldLabelClassName =
  "font-sans text-xs font-medium text-muted-foreground"

function resolveInitialSignature(
  initialValues: ConsentAuthorizationInitialValues | null | undefined,
  initialEmail: string | null | undefined
): ConsentSignatureFields {
  const emailFromValues = initialValues?.email?.trim() ?? ""
  const emailFallback = initialEmail?.trim() ?? ""
  return {
    firstNames: initialValues?.firstNames?.trim() ?? "",
    lastNames: initialValues?.lastNames?.trim() ?? "",
    signature: "",
    documentId: initialValues?.documentId?.trim() ?? "",
    date: getLocalDateIso(),
    email: emailFromValues || emailFallback,
    phone: initialValues?.phone?.trim() ?? "",
    phoneCountryIso2:
      initialValues?.phoneCountryIso2?.trim().toUpperCase() ||
      DEFAULT_COUNTRY_ISO2,
  }
}

function RequiredFieldLabel({
  children,
  requiredMarkClassName,
}: {
  children: ReactNode
  requiredMarkClassName: string
}) {
  return (
    <span className={fieldLabelClassName}>
      {children}
      <span className={requiredMarkClassName} aria-hidden>
        *
      </span>
    </span>
  )
}

function splitParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

function getLocalDateIso(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function hasPhoneDigits(phone: string): boolean {
  return phone.replace(/\D/g, "").length >= 6
}

function isFormComplete(fields: ConsentSignatureFields): boolean {
  return (
    fields.firstNames.trim() !== "" &&
    fields.lastNames.trim() !== "" &&
    fields.signature.trim() !== "" &&
    fields.documentId.trim() !== "" &&
    fields.date.trim() !== "" &&
    fields.email.trim() !== "" &&
    hasPhoneDigits(fields.phone) &&
    fields.phoneCountryIso2.trim() !== ""
  )
}

function areAllSectionsAccepted(accepted: Record<SectionId, boolean>): boolean {
  return SECTION_IDS.every((id) => accepted[id] === true)
}

/**
 * High-contrast styles for the last-section confirmation control so the
 * disabled, ready, and accepted states stay visually distinct.
 */
function getAcceptanceConfirmClassName(
  formComplete: boolean,
  isAccepted: boolean
): string {
  const base =
    "mt-3 inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-center font-sans text-sm transition-colors"

  if (!formComplete) {
    return `${base} cursor-not-allowed border border-border bg-muted font-medium text-foreground/65`
  }

  if (isAccepted) {
    return `${base} cursor-pointer border-2 border-emerald-800 bg-emerald-800 font-semibold text-white dark:border-emerald-600 dark:bg-emerald-700`
  }

  return `${base} cursor-pointer border-2 border-emerald-800 bg-white font-semibold text-emerald-950 shadow-sm hover:bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-950 dark:text-emerald-50 dark:hover:bg-emerald-900`
}

/**
 * Modal de autorización y consentimiento con secciones tipo accordion + checkbox.
 * El CTA final solo se habilita cuando las 7 secciones están aceptadas
 * y los datos de firma de la sección 8 están completos.
 */
export function ConsentAuthorizationModal({
  isOpen,
  onClose,
  onAccept,
  initialEmail = "",
  initialValues = null,
  variant = "candidate",
  isDismissible = true,
}: ConsentAuthorizationModalProps) {
  const t = useTranslations("CandidatePortal.profile.consent")
  const locale = useLocale()
  const companyName = getCompanyName()
  const baseId = useId()
  const styles = VARIANT_STYLES[variant]

  const [expandedId, setExpandedId] = useState<SectionId | null>("profileUse")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [accepted, setAccepted] = useState<Record<SectionId, boolean>>(() =>
    Object.fromEntries(SECTION_IDS.map((id) => [id, false])) as Record<
      SectionId,
      boolean
    >
  )
  const [signature, setSignature] = useState<ConsentSignatureFields>(() =>
    resolveInitialSignature(initialValues, initialEmail)
  )
  const wasOpenRef = useRef(false)

  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current
    wasOpenRef.current = isOpen
    if (!justOpened) return

    setIsSubmitting(false)
    setExpandedId("profileUse")
    setAccepted(
      Object.fromEntries(SECTION_IDS.map((id) => [id, false])) as Record<
        SectionId,
        boolean
      >
    )
    setSignature(resolveInitialSignature(initialValues, initialEmail))
  }, [isOpen, initialValues, initialEmail])

  useEffect(() => {
    if (!isOpen) return
    const composed = [signature.firstNames, signature.lastNames]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" ")
    setSignature((prev) =>
      prev.signature === composed ? prev : { ...prev, signature: composed }
    )
  }, [isOpen, signature.firstNames, signature.lastNames])

  const formComplete = useMemo(() => isFormComplete(signature), [signature])
  const allChecked = useMemo(() => areAllSectionsAccepted(accepted), [accepted])

  const acceptedCount = useMemo(
    () => SECTION_IDS.filter((id) => accepted[id]).length,
    [accepted]
  )
  const totalSections = SECTION_IDS.length
  const progressPercent = Math.round((acceptedCount / totalSections) * 100)

  const canSubmit = allChecked && formComplete

  useEffect(() => {
    if (formComplete) return
    setAccepted((prev) => {
      if (!prev.acceptance) return prev
      return { ...prev, acceptance: false }
    })
  }, [formComplete])

  const handleToggleExpanded = useCallback((id: SectionId) => {
    setExpandedId((current) => (current === id ? null : id))
  }, [])

  const handleToggleAccepted = useCallback(
    (id: SectionId, next: boolean) => {
      if (next && id === "acceptance" && !isFormComplete(signature)) {
        setExpandedId("acceptance")
        return
      }
      setAccepted((prev) => ({ ...prev, [id]: next }))
      if (!next) return

      const currentIndex = SECTION_IDS.indexOf(id)
      const followingId =
        currentIndex >= 0 && currentIndex < SECTION_IDS.length - 1
          ? SECTION_IDS[currentIndex + 1]
          : null
      setExpandedId(followingId)

      if (!followingId) return
      requestAnimationFrame(() => {
        document
          .getElementById(`${baseId}-${followingId}-header`)
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" })
      })
    },
    [signature, baseId]
  )

  const handleSignatureChange = useCallback(
    (field: keyof ConsentSignatureFields, value: string) => {
      setSignature((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  const handleClose = useCallback(() => {
    if (isSubmitting || !isDismissible) return
    onClose()
  }, [isSubmitting, isDismissible, onClose])

  const handleAccept = useCallback(async () => {
    if (
      isSubmitting ||
      !areAllSectionsAccepted(accepted) ||
      !isFormComplete(signature)
    ) {
      return
    }

    const sectionsAccepted = Object.fromEntries(
      SECTION_IDS.map((id) => [id, accepted[id] === true])
    ) as CandidateAuthConsentSubmitBody["sectionsAccepted"]

    const payload: CandidateAuthConsentSubmitBody = {
      documentVersion: CANDIDATE_AUTH_CONSENT_DOCUMENT_VERSION,
      documentLocale: locale,
      sectionsAccepted,
      firstNames: signature.firstNames.trim(),
      lastNames: signature.lastNames.trim(),
      signature: signature.signature.trim(),
      identityDocument: signature.documentId.trim(),
      phoneCountryIso2: signature.phoneCountryIso2.trim().toUpperCase(),
      phoneNationalNumber: signature.phone.trim(),
      clientDeclaredDate: signature.date.trim(),
    }

    setIsSubmitting(true)
    try {
      await onAccept(payload)
    } finally {
      setIsSubmitting(false)
    }
  }, [accepted, signature, onAccept, isSubmitting, locale])

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("title")}
      size="lg"
      closeOnOverlayClick={false}
      closeOnEscape={false}
      overlayZIndexClass="z-200"
      footer={
        <>
          <p className="mr-auto hidden max-w-56 font-sans text-xs text-muted-foreground sm:block">
            {canSubmit ? t("footerReady") : t("footerHint")}
          </p>
          {isDismissible ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {t("cancel")}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="strong"
            onClick={() => void handleAccept()}
            disabled={!canSubmit || isSubmitting}
            loading={isSubmitting}
            aria-disabled={!canSubmit || isSubmitting}
          >
            {t("accept")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="font-sans text-sm text-muted-foreground">{t("subtitle")}</p>

        <div>
          <p className={styles.progressText}>
            {t("progress", { accepted: acceptedCount, total: totalSections })}
          </p>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={totalSections}
            aria-valuenow={acceptedCount}
            aria-label={t("progress", {
              accepted: acceptedCount,
              total: totalSections,
            })}
          >
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <ul className="flex flex-col gap-2" role="list">
          {SECTION_IDS.map((id) => {
            const isExpanded = expandedId === id
            const isAccepted = accepted[id]
            const panelId = `${baseId}-${id}-panel`
            const headerId = `${baseId}-${id}-header`
            const isAcceptance = id === "acceptance"

            return (
              <li key={id}>
                <div
                  className={[
                    "rounded-xl border transition-colors duration-300",
                    isAccepted
                      ? "border-emerald-600/40 bg-emerald-50 dark:bg-emerald-950/30"
                      : isAcceptance
                        ? "border-amber-600/35 bg-amber-50/80 dark:bg-amber-950/20"
                        : "border-border bg-card",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-3 px-3 py-3 sm:px-4">
                    <input
                      id={`${baseId}-${id}-check`}
                      type="checkbox"
                      className={`mt-1 ${styles.checkbox}${
                        isAcceptance ? " border-emerald-800 accent-emerald-800" : ""
                      }`}
                      checked={isAccepted}
                      disabled={isAcceptance && !formComplete}
                      onChange={(e) =>
                        handleToggleAccepted(id, e.target.checked)
                      }
                      aria-describedby={headerId}
                      title={
                        isAcceptance && !formComplete
                          ? t("signature.completeFormFirst")
                          : undefined
                      }
                    />
                    <button
                      type="button"
                      id={headerId}
                      className={`flex min-w-0 flex-1 items-start gap-2 rounded-md text-left ${styles.focusRing}`}
                      aria-expanded={isExpanded}
                      aria-controls={panelId}
                      onClick={() => handleToggleExpanded(id)}
                    >
                      <span
                        className={[
                          "mt-0.5 shrink-0 text-muted-foreground transition-transform duration-300 ease-out",
                          isExpanded ? "rotate-0" : "-rotate-90",
                        ].join(" ")}
                        aria-hidden
                      >
                        <ChevronDown className="h-4 w-4" />
                      </span>
                      <span
                        className={[
                          "font-sans text-sm font-semibold leading-snug",
                          isAccepted
                            ? "text-emerald-900 dark:text-emerald-100"
                            : isAcceptance
                              ? "text-amber-950 dark:text-amber-100"
                              : "text-foreground",
                        ].join(" ")}
                      >
                        {t(`sections.${id}.title`)}
                      </span>
                    </button>
                  </div>

                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={headerId}
                    className={[
                      "grid transition-[grid-template-rows] duration-300 ease-in-out",
                      isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    ].join(" ")}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="border-t border-border/70 px-3 pb-3 pt-3 sm:px-4">
                        <div className="rounded-lg border border-border/60 bg-background px-3 py-3 sm:px-4">
                          <div className="flex flex-col gap-3">
                            {splitParagraphs(
                              t(`sections.${id}.body`, { companyName })
                            ).map(
                              (paragraph, index) => (
                                <p
                                  key={`${id}-p-${index}`}
                                  className="font-sans text-sm leading-relaxed text-foreground/90"
                                >
                                  {paragraph}
                                </p>
                              )
                            )}
                          </div>

                          {isAcceptance ? (
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <label className="flex flex-col gap-1.5">
                                <RequiredFieldLabel
                                  requiredMarkClassName={styles.requiredMark}
                                >
                                  {t("signature.firstNames")}
                                </RequiredFieldLabel>
                                <input
                                  type="text"
                                  value={signature.firstNames}
                                  onChange={(e) =>
                                    handleSignatureChange(
                                      "firstNames",
                                      e.target.value
                                    )
                                  }
                                  className={fieldClassName}
                                  autoComplete="given-name"
                                  required
                                />
                              </label>
                              <label className="flex flex-col gap-1.5">
                                <RequiredFieldLabel
                                  requiredMarkClassName={styles.requiredMark}
                                >
                                  {t("signature.lastNames")}
                                </RequiredFieldLabel>
                                <input
                                  type="text"
                                  value={signature.lastNames}
                                  onChange={(e) =>
                                    handleSignatureChange(
                                      "lastNames",
                                      e.target.value
                                    )
                                  }
                                  className={fieldClassName}
                                  autoComplete="family-name"
                                  required
                                />
                              </label>
                              <label className="flex flex-col gap-1.5 sm:col-span-2">
                                <RequiredFieldLabel
                                  requiredMarkClassName={styles.requiredMark}
                                >
                                  {t("signature.signature")}
                                </RequiredFieldLabel>
                                <input
                                  type="text"
                                  value={signature.signature}
                                  disabled
                                  readOnly
                                  className={`${fieldClassName} italic`}
                                  placeholder={t("signature.signaturePlaceholder")}
                                  required
                                />
                              </label>
                              <label className="flex flex-col gap-1.5">
                                <RequiredFieldLabel
                                  requiredMarkClassName={styles.requiredMark}
                                >
                                  {t("signature.documentId")}
                                </RequiredFieldLabel>
                                <input
                                  type="text"
                                  value={signature.documentId}
                                  onChange={(e) =>
                                    handleSignatureChange(
                                      "documentId",
                                      e.target.value
                                    )
                                  }
                                  className={fieldClassName}
                                  required
                                />
                              </label>
                              <label className="flex flex-col gap-1.5">
                                <RequiredFieldLabel
                                  requiredMarkClassName={styles.requiredMark}
                                >
                                  {t("signature.date")}
                                </RequiredFieldLabel>
                                <input
                                  type="date"
                                  value={signature.date}
                                  disabled
                                  readOnly
                                  className={fieldClassName}
                                  required
                                />
                              </label>
                              <label className="flex flex-col gap-1.5 sm:col-span-2">
                                <RequiredFieldLabel
                                  requiredMarkClassName={styles.requiredMark}
                                >
                                  {t("signature.email")}
                                </RequiredFieldLabel>
                                <input
                                  type="email"
                                  value={signature.email}
                                  disabled
                                  readOnly
                                  className={fieldClassName}
                                  autoComplete="email"
                                  required
                                />
                              </label>
                              <label className="flex flex-col gap-1.5 sm:col-span-2">
                                <RequiredFieldLabel
                                  requiredMarkClassName={styles.requiredMark}
                                >
                                  {t("signature.phone")}
                                </RequiredFieldLabel>
                                <PhoneCountryInput
                                  id={`${baseId}-phone`}
                                  phone={signature.phone}
                                  countryIso2={signature.phoneCountryIso2}
                                  onPhoneChange={(value) =>
                                    handleSignatureChange("phone", value)
                                  }
                                  onCountryChange={(iso2) =>
                                    handleSignatureChange(
                                      "phoneCountryIso2",
                                      iso2
                                    )
                                  }
                                  placeholder={t("signature.phonePlaceholder")}
                                  countryAriaLabel={t("signature.countryAria")}
                                  loadingLabel={t("signature.countryLoading")}
                                  searchPlaceholder={t("signature.countrySearchPlaceholder")}
                                  emptyResultsLabel={t("signature.countryNoResults")}
                                  required
                                />
                              </label>
                            </div>
                          ) : null}
                        </div>

                        <label
                          htmlFor={`${baseId}-${id}-check`}
                          className={
                            isAcceptance
                              ? getAcceptanceConfirmClassName(
                                  formComplete,
                                  isAccepted
                                )
                              : "mt-3 flex cursor-pointer items-center gap-2 font-sans text-sm text-foreground"
                          }
                          title={
                            isAcceptance && !formComplete
                              ? t("signature.completeFormFirst")
                              : undefined
                          }
                          aria-disabled={
                            isAcceptance && !formComplete ? true : undefined
                          }
                        >
                          {isAcceptance ? (
                            t("signature.finalConfirm")
                          ) : (
                            <span
                              className={
                                isAccepted
                                  ? "text-emerald-800 dark:text-emerald-200"
                                  : "text-muted-foreground"
                              }
                            >
                              {t("acceptSection")}
                            </span>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        <p className="font-sans text-xs text-muted-foreground sm:hidden">
          {canSubmit ? t("footerReady") : t("footerHint")}
        </p>
      </div>
    </Modal>
  )
}
