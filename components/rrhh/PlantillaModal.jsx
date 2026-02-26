"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/lib/api";

const buildPayload = (formData, isEditing, editingTemplate) => {
  const payload = {
    id: isEditing && editingTemplate ? editingTemplate.id : 0,
    name: formData.name.trim(),
    subjectTemplate: formData.subject.trim(),
    bodyTemplate: formData.body.trim(),
    channels: Array.isArray(formData.channels) ? formData.channels : [],
  };
  return payload;
};

export default function PlantillaModal({ isOpen, onClose, onSubmit, editingTemplate }) {
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    body: "",
    channels: [],
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const isEditing = !!editingTemplate;

  useEffect(() => {
    if (isOpen && editingTemplate) {
      setFormData({
        name: editingTemplate.name ?? "",
        subject: editingTemplate.subject ?? editingTemplate.subjectTemplate ?? "",
        body: editingTemplate.body ?? editingTemplate.bodyTemplate ?? editingTemplate.content ?? "",
        content: "",
        channels: editingTemplate.channels ?? [],
      });
    } else if (isOpen && !editingTemplate) {
      setFormData({ name: "", subject: "", body: "", content: "", channels: [] });
    }
  }, [isOpen, editingTemplate]);

  const validate = () => {
    const nextErrors = {};
    if (!formData.name.trim()) {
      nextErrors.name = "El nombre es requerido";
    }
    if (formData.subject == null || String(formData.subject).trim() === "") {
      nextErrors.subject = "El asunto es requerido";
    }
    if (formData.body == null || String(formData.body).trim() === "") {
      nextErrors.body = "El contenido es requerido";
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
          `/api/Notification/templates/${editingTemplate.id}`,
          payload
        );
      } else {
        await apiClient.post("/api/Notification/templates", payload);
      }
      handleClose();
      onSubmit?.();
    } catch (err) {
      setSubmitError(
        err?.message || err?.detail || `No se pudo ${isEditing ? "actualizar" : "crear"} la plantilla. Intenta de nuevo.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: "", subject: "", body: "", channels: [] });
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
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-inter text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
            aria-invalid={!!errors.subject}
            aria-describedby={errors.subject ? "subject-error" : undefined}
          />
          {errors.subject && (
            <p id="subject-error" className="font-inter text-sm text-vo-pink" role="alert">
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
            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-inter text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 min-h-[120px]"
            aria-invalid={!!errors.body}
            aria-describedby={errors.body ? "body-error" : undefined}
          />
          {errors.body && (
            <p id="body-error" className="font-inter text-sm text-vo-pink" role="alert">
              {errors.body}
            </p>
          )}
        </div>

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
