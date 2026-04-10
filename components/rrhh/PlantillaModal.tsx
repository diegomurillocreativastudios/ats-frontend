"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/lib/api";

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w-]+/g, '')  // Remove all non-word chars
    .replace(/--+/g, '-');    // Replace multiple - with single -
};

const buildPayload = (formData, isEditing, editingTemplate) => {
  const type = formData.type || "Notification";
  const payload: Record<string, unknown> = {
    $type: type,
    id: isEditing && editingTemplate ? editingTemplate.id : 0,
    type: type,
    name: formData.name.trim(),
    slug: formData.slug || slugify(formData.name),
  };

  if (type === "Notification") {
    payload.subjectTemplate = formData.subject.trim();
    payload.bodyTemplate = formData.body.trim();
    payload.channels = Array.isArray(formData.channels) ? formData.channels : [];
  } else if (type === "Document") {
    payload.contentTemplate = formData.contentTemplate.trim();
    payload.outputFormat = formData.outputFormat || "PDF";
  } else if (type === "Questionnaire") {
    payload.description = formData.description.trim();
    payload.isMandatory = !!formData.isMandatory;
  }

  return payload;
};

export default function PlantillaModal({
  isOpen,
  onClose,
  onSubmit,
  editingTemplate,
  onSnackbar,
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit?: () => void
  editingTemplate?: Record<string, unknown> | null
  onSnackbar?: (message: string, variant?: string) => void
}) {
  const [formData, setFormData] = useState({
    type: "Notification",
    name: "",
    slug: "",
    subject: "",
    body: "",
    channels: [],
    contentTemplate: "",
    outputFormat: "PDF",
    description: "",
    isMandatory: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const isEditing = !!editingTemplate;

  useEffect(() => {
    if (isOpen && editingTemplate) {
      const t = editingTemplate
      setFormData({
        type: String(t["type"] ?? "Notification"),
        name: String(t["name"] ?? ""),
        slug: String(t["slug"] ?? ""),
        subject: String(
          t["subject"] ?? t["subjectTemplate"] ?? ""
        ),
        body: String(
          t["body"] ?? t["bodyTemplate"] ?? t["content"] ?? ""
        ),
        contentTemplate: String(t["contentTemplate"] ?? ""),
        outputFormat: String(t["outputFormat"] ?? "PDF"),
        description: String(t["description"] ?? ""),
        isMandatory: Boolean(t["isMandatory"]),
        channels: Array.isArray(t["channels"]) ? t["channels"] : [],
      });
    } else if (isOpen && !editingTemplate) {
      setFormData({
        type: "Notification",
        name: "",
        slug: "",
        subject: "",
        body: "",
        contentTemplate: "",
        outputFormat: "PDF",
        description: "",
        isMandatory: false,
        channels: [],
      });
    }
  }, [isOpen, editingTemplate]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      nextErrors.name = "El nombre es requerido";
    }

    if (formData.type === "Notification") {
      if (!formData.subject.trim()) {
        nextErrors.subject = "El asunto es requerido";
      }
      if (!formData.body.trim()) {
        nextErrors.body = "El contenido es requerido";
      }
    } else if (formData.type === "Document") {
      if (!formData.contentTemplate.trim()) {
        nextErrors.contentTemplate = "La plantilla de contenido es requerida";
      }
    } else if (formData.type === "Questionnaire") {
      if (!formData.description.trim()) {
        nextErrors.description = "La descripción es requerida";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = buildPayload(formData, isEditing, editingTemplate);

    setLoading(true);
    setSubmitError(null);

    try {
      if (isEditing) {
        await apiClient.put(
          `/api/Templates/${editingTemplate.id}`,
          payload
        );
        onSnackbar?.("Plantilla actualizada correctamente.", "success");
      } else {
        await apiClient.post("/api/Templates", payload);
        onSnackbar?.("Plantilla creada correctamente.", "success");
      }
      handleClose();
      onSubmit?.();
    } catch (err) {
      const msg =
        err?.message || err?.detail || `No se pudo ${isEditing ? "actualizar" : "crear"} la plantilla. Intenta de nuevo.`
      setSubmitError(msg);
      onSnackbar?.(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      type: "Notification",
      name: "",
      slug: "",
      subject: "",
      body: "",
      contentTemplate: "",
      outputFormat: "PDF",
      description: "",
      isMandatory: false,
      channels: [],
    });
    setErrors({});
    setSubmitError(null);
    onClose?.();
  };

  const footer = (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleClose}
        disabled={loading}
        aria-label="Cancelar"
      >
        Cancelar
      </Button>
      <Button
        type="submit"
        form="plantilla-form"
        aria-label={isEditing ? "Actualizar plantilla" : "Crear plantilla"}
        disabled={loading}
        loading={loading}
      >
        {isEditing ? "Actualizar plantilla" : "Crear plantilla"}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? "Editar plantilla" : "Nueva plantilla"}
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
            className="font-inter text-sm font-medium text-foreground"
          >
            Tipo de plantilla <span className="text-vo-pink">*</span>
          </label>
          <select
            id="plantilla-type"
            value={formData.type}
            onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-inter text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isEditing}
          >
            <option value="Notification">Notificación (Email/SMS)</option>
            <option value="Document">Documento (PDF/Contrato)</option>
            <option value="Questionnaire">Cuestionario</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="plantilla-name"
            className="font-inter text-sm font-medium text-foreground"
          >
            Nombre <span className="text-vo-pink">*</span>
          </label>
          <input
            id="plantilla-name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Ej: Notificación de entrevista"
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-inter text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "name-error" : undefined}
          />
          {errors.name && (
            <p id="name-error" className="font-inter text-sm text-vo-pink" role="alert">
              {errors.name}
            </p>
          )}
        </div>

        {formData.type === "Notification" && (
          <>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="plantilla-subject"
                className="font-inter text-sm font-medium text-foreground"
              >
                Asunto <span className="text-vo-pink">*</span>
              </label>
              <input
                id="plantilla-subject"
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                placeholder="Ej: Tu entrevista ha sido programada"
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-inter text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent"
                aria-invalid={!!errors.subject}
              />
              {errors.subject && (
                <p className="font-inter text-sm text-vo-pink" role="alert">
                  {errors.subject}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="plantilla-body"
                className="font-inter text-sm font-medium text-foreground"
              >
                Contenido <span className="text-vo-pink">*</span>
              </label>
              <textarea
                id="plantilla-body"
                value={formData.body}
                onChange={(e) => setFormData((prev) => ({ ...prev, body: e.target.value }))}
                placeholder="Escribe el contenido de la plantilla..."
                rows={6}
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-inter text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent min-h-[120px]"
                aria-invalid={!!errors.body}
              />
              {errors.body && (
                <p className="font-inter text-sm text-vo-pink" role="alert">
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
                className="font-inter text-sm font-medium text-foreground"
              >
                Plantilla de contenido <span className="text-vo-pink">*</span>
              </label>
              <textarea
                id="plantilla-content-template"
                value={formData.contentTemplate}
                onChange={(e) => setFormData((prev) => ({ ...prev, contentTemplate: e.target.value }))}
                placeholder="Ej: <h1>Contrato</h1>..."
                rows={8}
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-inter text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent min-h-[150px]"
                aria-invalid={!!errors.contentTemplate}
              />
              {errors.contentTemplate && (
                <p className="font-inter text-sm text-vo-pink" role="alert">
                  {errors.contentTemplate}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="plantilla-output-format"
                className="font-inter text-sm font-medium text-foreground"
              >
                Formato de salida
              </label>
              <select
                id="plantilla-output-format"
                value={formData.outputFormat}
                onChange={(e) => setFormData((prev) => ({ ...prev, outputFormat: e.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-inter text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent"
              >
                <option value="PDF">PDF</option>
                <option value="DOCX">DOCX</option>
                <option value="HTML">HTML Only</option>
              </select>
            </div>
          </>
        )}

        {formData.type === "Questionnaire" && (
          <>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="plantilla-description"
                className="font-inter text-sm font-medium text-foreground"
              >
                Descripción <span className="text-vo-pink">*</span>
              </label>
              <textarea
                id="plantilla-description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Ej: Por favor completa esta información técnica..."
                rows={4}
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-inter text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent"
                aria-invalid={!!errors.description}
              />
              {errors.description && (
                <p className="font-inter text-sm text-vo-pink" role="alert">
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
                className="font-inter text-sm font-medium text-foreground cursor-pointer"
              >
                Es obligatorio
              </label>
            </div>
          </>
        )}

        {submitError && (
          <div
            className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 font-inter text-sm text-destructive"
            role="alert"
          >
            {submitError}
          </div>
        )}
      </form>
    </Modal>
  );
}
