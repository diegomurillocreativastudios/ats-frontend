"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  fetchReportsCatalog,
  findReportForTemplate,
  isCatalogReportKey,
  type ReportCatalogItem,
} from "@/lib/api/recruiter-reports-catalog";
import {
  describeReportBindingError,
  saveReportBinding,
} from "@/lib/api/recruiter-report-bindings";

const slugify = (text: string) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");

interface PlantillaFormData {
  type: string
  name: string
  slug: string
  subject: string
  body: string
  channels: unknown[]
  contentTemplate: string
  outputFormat: string
  isTechnicalSheet: boolean
  isReport: boolean
  reportKey: string
  description: string
  isMandatory: boolean
}

const INITIAL_FORM: PlantillaFormData = {
  type: "Notification",
  name: "",
  slug: "",
  subject: "",
  body: "",
  channels: [],
  contentTemplate: "",
  outputFormat: "PDF",
  isTechnicalSheet: false,
  isReport: false,
  reportKey: "",
  description: "",
  isMandatory: false,
}

/** HTML de ejemplo; se pasa como variable ICU para evitar que next-intl interprete `<h1>` como rich text. */
const CONTENT_TEMPLATE_HTML_EXAMPLE = "<h1>Contrato</h1>..."

const buildPayload = (
  formData: PlantillaFormData,
  isEditing: boolean,
  editingTemplate: Record<string, unknown> | null | undefined
) => {
  const type = formData.type || "Notification"
  const payload: Record<string, unknown> = {
    $type: type,
    id: isEditing && editingTemplate ? editingTemplate.id : 0,
    type,
    name: formData.name.trim(),
    slug: formData.slug || slugify(formData.name),
  }

  if (type === "Notification") {
    payload.subjectTemplate = formData.subject.trim()
    payload.bodyTemplate = formData.body.trim()
    payload.channels = Array.isArray(formData.channels) ? formData.channels : []
  } else if (type === "Document") {
    payload.contentTemplate = formData.contentTemplate.trim()
    payload.outputFormat = formData.outputFormat || "PDF"
  } else if (type === "Questionnaire") {
    payload.description = formData.description.trim()
    payload.isMandatory = !!formData.isMandatory
  }

  payload.isTechnicalSheet =
    type === "Document" ? !!formData.isTechnicalSheet : false
  payload.isReport = type === "Document" ? !!formData.isReport : false

  return payload
}

interface PlantillaModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit?: () => void
  editingTemplate?: Record<string, unknown> | null
  onSnackbar?: (message: string, variant?: string) => void
}

export default function PlantillaModal({
  isOpen,
  onClose,
  onSubmit,
  editingTemplate,
  onSnackbar,
}: PlantillaModalProps) {
  const t = useTranslations("AdminPortal.templates.modal");
  const tTemplates = useTranslations("AdminPortal.templates");
  const tCommon = useTranslations("Common");
  const [formData, setFormData] = useState<PlantillaFormData>(INITIAL_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // The reportKey we believe the template is linked to right now (server truth).
  const [initialReportKey, setInitialReportKey] = useState("")

  const [reportsCatalog, setReportsCatalog] = useState<ReportCatalogItem[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [catalogReloadCounter, setCatalogReloadCounter] = useState(0)
  const catalogLoadedRef = useRef(false)
  const catalogFetchInFlightRef = useRef(false)

  const isEditing = !!editingTemplate
  const editingTemplateId =
    editingTemplate?.id != null ? String(editingTemplate.id) : null

  useEffect(() => {
    if (!isOpen) return

    if (editingTemplate) {
      const t = editingTemplate
      setFormData({
        type: String(t["type"] ?? "Notification"),
        name: String(t["name"] ?? ""),
        slug: String(t["slug"] ?? ""),
        subject: String(t["subject"] ?? t["subjectTemplate"] ?? ""),
        body: String(t["body"] ?? t["bodyTemplate"] ?? t["content"] ?? ""),
        contentTemplate: String(t["contentTemplate"] ?? ""),
        outputFormat: String(t["outputFormat"] ?? "PDF"),
        isTechnicalSheet: Boolean(t["isTechnicalSheet"]),
        isReport: Boolean(t["isReport"]),
        reportKey: "",
        description: String(t["description"] ?? ""),
        isMandatory: Boolean(t["isMandatory"]),
        channels: Array.isArray(t["channels"]) ? t["channels"] : [],
      })
    } else {
      setFormData(INITIAL_FORM)
    }
    setInitialReportKey("")
    setErrors({})
    setSubmitError(null)
  }, [isOpen, editingTemplateId])

  useEffect(() => {
    if (!isOpen) {
      catalogLoadedRef.current = false
      catalogFetchInFlightRef.current = false
      setReportsCatalog([])
      setCatalogError(null)
      setCatalogLoading(false)
    }
  }, [isOpen])

  const shouldLoadCatalog =
    isOpen && formData.type === "Document" && formData.isReport

  useEffect(() => {
    if (!shouldLoadCatalog) return
    if (catalogLoadedRef.current || catalogFetchInFlightRef.current) return

    catalogFetchInFlightRef.current = true
    setCatalogLoading(true)
    setCatalogError(null)
    fetchReportsCatalog()
      .then((items) => {
        setReportsCatalog(items)
        catalogLoadedRef.current = true

        // Catalog is the source of truth: if we're editing a template that is
        // already linked to a report, preselect it.
        if (editingTemplateId) {
          const linked = findReportForTemplate(items, editingTemplateId)
          if (linked) {
            setInitialReportKey(linked.reportKey)
            setFormData((prev) =>
              prev.reportKey === linked.reportKey
                ? prev
                : { ...prev, reportKey: linked.reportKey }
            )
          }
        }
      })
      .catch((err: unknown) => {
        const msg =
          getApiErrorMessage(err) || t("reportCatalogLoadFailed");
        setCatalogError(msg)
      })
      .finally(() => {
        catalogFetchInFlightRef.current = false
        setCatalogLoading(false)
      })
  }, [shouldLoadCatalog, catalogReloadCounter, editingTemplateId])

  const handleRetryCatalog = () => {
    catalogLoadedRef.current = false
    setCatalogError(null)
    setReportsCatalog([])
    setCatalogReloadCounter((n) => n + 1)
  }

  /**
   * Reports already linked to a *different* template should not be selectable
   * (the backend would return 409). We still allow selecting the currently
   * linked report to keep the user's existing binding.
   */
  const lockedReportKeys = useMemo(() => {
    const locked = new Set<string>()
    if (!editingTemplateId) {
      for (const item of reportsCatalog) {
        if (item.linkedTemplate) locked.add(item.reportKey)
      }
      return locked
    }
    const ownLinked = findReportForTemplate(reportsCatalog, editingTemplateId)
    for (const item of reportsCatalog) {
      if (!item.linkedTemplate) continue
      if (ownLinked && ownLinked.reportKey === item.reportKey) continue
      locked.add(item.reportKey)
    }
    return locked
  }, [reportsCatalog, editingTemplateId])

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    if (!formData.name.trim()) nextErrors.name = t("validation.nameRequired")

    if (formData.type === "Notification") {
      if (!formData.subject.trim()) nextErrors.subject = t("validation.subjectRequired")
      if (!formData.body.trim()) nextErrors.body = t("validation.contentRequired")
    } else if (formData.type === "Document") {
      if (!formData.contentTemplate.trim()) {
        nextErrors.contentTemplate = t("validation.contentTemplateRequired")
      }
      const selectedReportKey = formData.reportKey.trim()
      if (
        formData.isReport &&
        selectedReportKey &&
        reportsCatalog.length > 0 &&
        !isCatalogReportKey(selectedReportKey, reportsCatalog)
      ) {
        nextErrors.reportKey = t("validation.reportTypeRequired")
      }
    } else if (formData.type === "Questionnaire") {
      if (!formData.description.trim()) {
        nextErrors.description = t("validation.descriptionRequired")
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const syncReportBinding = async (
    templateId: number | string | undefined
  ): Promise<string | null> => {
    if (templateId == null || templateId === "") return null

    const rawWantKey =
      formData.type === "Document" && formData.isReport && formData.reportKey
        ? formData.reportKey.trim()
        : ""
    const wantReportKey =
      !rawWantKey
        ? ""
        : reportsCatalog.length === 0 ||
            isCatalogReportKey(rawWantKey, reportsCatalog)
          ? rawWantKey
          : ""
    const hadReportKey = initialReportKey.trim()

    if (wantReportKey === hadReportKey) return null

    try {
      await saveReportBinding(
        { templateId, reportKey: wantReportKey },
        { hadReportKey }
      )
      return null
    } catch (err) {
      return describeReportBindingError(err)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validate()) return

    const payload = buildPayload(formData, isEditing, editingTemplate)

    setLoading(true)
    setSubmitError(null)

    try {
      let templateId: number | string | undefined
      if (isEditing && editingTemplate) {
        await apiClient.put(`/api/Templates/${editingTemplate.id}`, payload)
        templateId = editingTemplate.id as number | string | undefined
      } else {
        const created = await apiClient.post("/api/Templates", payload)
        const createdRec =
          created && typeof created === "object"
            ? (created as Record<string, unknown>)
            : null
        const newId = createdRec?.id ?? createdRec?.Id
        templateId =
          typeof newId === "number" || typeof newId === "string"
            ? newId
            : undefined
      }

      const bindingWarning = await syncReportBinding(templateId)

      if (bindingWarning) {
        onSnackbar?.(bindingWarning, "warning")
      } else {
        onSnackbar?.(
          isEditing ? t("toastUpdated") : t("toastCreated"),
          "success"
        )
      }
      handleClose()
      onSubmit?.()
    } catch (err) {
      const msg = getApiErrorMessage(err) || t("toastSaveFailed")
      setSubmitError(msg)
      onSnackbar?.(msg, "error")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData(INITIAL_FORM)
    setErrors({})
    setSubmitError(null)
    setInitialReportKey("")
    onClose?.()
  }

  const footer = (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleClose}
        disabled={loading}
        aria-label={t("cancel")}
      >
        {tCommon("cancel")}
      </Button>
      <Button
        type="submit"
        form="plantilla-form"
        aria-label={isEditing ? t("update") : t("create")}
        disabled={loading}
        loading={loading}
      >
        {isEditing ? t("update") : t("create")}
      </Button>
    </>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? t("editTitle") : t("createTitle")}
      footer={footer}
      size="lg"
      closeOnOverlayClick
      closeOnEscape
    >
      <form
        id="plantilla-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col gap-2">
          <label
            htmlFor="plantilla-type"
            className="font-sans text-sm font-medium text-foreground"
          >
            {t("typeLabel")} <span className="text-vo-pink">*</span>
          </label>
          <select
            id="plantilla-type"
            value={formData.type}
            onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isEditing}
          >
            <option value="Notification">{t("typeNotification")}</option>
            <option value="Document">{t("typeDocument")}</option>
            <option value="Questionnaire">{t("typeQuestionnaire")}</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="plantilla-name"
            className="font-sans text-sm font-medium text-foreground"
          >
            {t("nameLabel")} <span className="text-vo-pink">*</span>
          </label>
          <input
            id="plantilla-name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder={t("namePlaceholder")}
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "name-error" : undefined}
          />
          {errors.name && (
            <p id="name-error" className="font-sans text-sm text-vo-pink" role="alert">
              {errors.name}
            </p>
          )}
        </div>

        {formData.type === "Notification" && (
          <>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="plantilla-subject"
                className="font-sans text-sm font-medium text-foreground"
              >
                {t("subjectLabel")} <span className="text-vo-pink">*</span>
              </label>
              <input
                id="plantilla-subject"
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                placeholder={t("subjectPlaceholder")}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent"
                aria-invalid={!!errors.subject}
              />
              {errors.subject && (
                <p className="font-sans text-sm text-vo-pink" role="alert">
                  {errors.subject}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="plantilla-body"
                className="font-sans text-sm font-medium text-foreground"
              >
                {t("contentLabel")} <span className="text-vo-pink">*</span>
              </label>
              <textarea
                id="plantilla-body"
                value={formData.body}
                onChange={(e) => setFormData((prev) => ({ ...prev, body: e.target.value }))}
                placeholder={t("contentPlaceholder")}
                rows={6}
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent min-h-[120px]"
                aria-invalid={!!errors.body}
              />
              {errors.body && (
                <p className="font-sans text-sm text-vo-pink" role="alert">
                  {errors.body}
                </p>
              )}
            </div>
          </>
        )}

        {formData.type === "Document" && (
          <>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="plantilla-content-template"
                className="font-sans text-sm font-medium text-foreground"
              >
                {t("contentTemplateLabel")} <span className="text-vo-pink">*</span>
              </label>
              <textarea
                id="plantilla-content-template"
                value={formData.contentTemplate}
                onChange={(e) => setFormData((prev) => ({ ...prev, contentTemplate: e.target.value }))}
                placeholder={t("contentTemplatePlaceholder", {
                  htmlExample: CONTENT_TEMPLATE_HTML_EXAMPLE,
                })}
                rows={8}
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent min-h-[150px]"
                aria-invalid={!!errors.contentTemplate}
              />
              {errors.contentTemplate && (
                <p className="font-sans text-sm text-vo-pink" role="alert">
                  {errors.contentTemplate}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="plantilla-output-format"
                className="font-sans text-sm font-medium text-foreground"
              >
                {t("outputFormatLabel")}
              </label>
              <select
                id="plantilla-output-format"
                value={formData.outputFormat}
                onChange={(e) => setFormData((prev) => ({ ...prev, outputFormat: e.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent"
              >
                <option value="PDF">PDF</option>
                <option value="DOCX">DOCX</option>
                <option value="HTML">HTML Only</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <input
                  id="plantilla-is-technical-sheet"
                  type="checkbox"
                  checked={formData.isTechnicalSheet}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      isTechnicalSheet: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-vo-purple focus:ring-vo-purple"
                  aria-describedby="plantilla-is-technical-sheet-hint"
                />
                <label
                  htmlFor="plantilla-is-technical-sheet"
                  className="font-sans text-sm font-medium text-foreground cursor-pointer"
                >
                  {t("isTechnicalSheet")}
                </label>
              </div>
              <p
                id="plantilla-is-technical-sheet-hint"
                className="pl-6 font-sans text-xs text-muted-foreground"
              >
                {t("technicalSheetHint")}
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <input
                  id="plantilla-is-report"
                  type="checkbox"
                  checked={formData.isReport}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setFormData((prev) => ({
                      ...prev,
                      isReport: checked,
                      reportKey: checked ? prev.reportKey : "",
                    }))
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-vo-purple focus:ring-vo-purple"
                  aria-describedby="plantilla-is-report-hint"
                />
                <label
                  htmlFor="plantilla-is-report"
                  className="cursor-pointer font-sans text-sm font-medium text-foreground"
                >
                  {t("isReport")}
                </label>
              </div>
              <p
                id="plantilla-is-report-hint"
                className="pl-6 font-sans text-xs text-muted-foreground"
              >
                {t("reportHint")}
              </p>
            </div>

            {formData.isReport && (
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="plantilla-report-key"
                  className="font-sans text-sm font-medium text-foreground"
                >
                  {t("reportTypeLabel")}
                </label>
                {catalogError ? (
                  <div className="flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5">
                    <p
                      className="font-sans text-sm text-destructive"
                      role="alert"
                    >
                      {catalogError}
                    </p>
                    <button
                      type="button"
                      onClick={handleRetryCatalog}
                      className="self-start font-sans text-xs font-medium text-vo-purple hover:underline focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                    >
                      {tTemplates("actions.retry")}
                    </button>
                  </div>
                ) : (
                  <select
                    id="plantilla-report-key"
                    value={formData.reportKey}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        reportKey: e.target.value,
                      }))
                    }
                    disabled={catalogLoading}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                    aria-invalid={!!errors.reportKey}
                    aria-describedby={
                      errors.reportKey
                        ? "plantilla-report-key-error"
                        : "plantilla-report-key-hint"
                    }
                  >
                    <option value="">
                      {catalogLoading
                        ? t("reportCatalogLoading")
                        : t("reportSelectPlaceholder")}
                    </option>
                    {reportsCatalog.map((item) => {
                      const isLocked = lockedReportKeys.has(item.reportKey)
                      const linkedName = item.linkedTemplate?.name
                      const label = isLocked && linkedName
                        ? t("reportLinkedOption", { name: item.name, linkedName })
                        : item.name
                      return (
                        <option
                          key={item.reportKey}
                          value={item.reportKey}
                          disabled={isLocked}
                        >
                          {label}
                        </option>
                      )
                    })}
                  </select>
                )}
                {errors.reportKey && (
                  <p
                    id="plantilla-report-key-error"
                    className="font-sans text-sm text-vo-pink"
                    role="alert"
                  >
                    {errors.reportKey}
                  </p>
                )}
                <p
                  id="plantilla-report-key-hint"
                  className="font-sans text-xs text-muted-foreground"
                >
                  {t("reportLinkHint")}
                </p>
              </div>
            )}
          </>
        )}

        {formData.type === "Questionnaire" && (
          <>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="plantilla-description"
                className="font-sans text-sm font-medium text-foreground"
              >
                {t("descriptionLabel")} <span className="text-vo-pink">*</span>
              </label>
              <textarea
                id="plantilla-description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder={t("descriptionPlaceholder")}
                rows={4}
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent"
                aria-invalid={!!errors.description}
              />
              {errors.description && (
                <p className="font-sans text-sm text-vo-pink" role="alert">
                  {errors.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                id="plantilla-is-mandatory"
                type="checkbox"
                checked={formData.isMandatory}
                onChange={(e) => setFormData((prev) => ({ ...prev, isMandatory: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-vo-purple focus:ring-vo-purple"
              />
              <label
                htmlFor="plantilla-is-mandatory"
                className="font-sans text-sm font-medium text-foreground cursor-pointer"
              >
                {t("isRequired")}
              </label>
            </div>
          </>
        )}

        {submitError && (
          <div
            className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 font-sans text-sm text-destructive"
            role="alert"
          >
            {submitError}
          </div>
        )}
      </form>
    </Modal>
  )
}
