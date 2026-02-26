"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/lib/api";

export default function EtapaModal({ isOpen, onClose, onSubmit, editingStage, companyId }) {
  const [name, setName] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const isEditing = !!editingStage;

  useEffect(() => {
    if (isOpen && editingStage) {
      setName(editingStage.name || "");
    } else if (isOpen && !editingStage) {
      setName("");
    }
  }, [isOpen, editingStage]);

  const validate = () => {
    const nextErrors = {};
    if (!name.trim()) {
      nextErrors.name = "El nombre es requerido";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: name.trim(),
    };

    setLoading(true);
    setSubmitError(null);

    try {
      if (isEditing) {
        await apiClient.put(
          `/api/recruiter/companies/${companyId}/stages/${editingStage.id}`,
          payload
        );
      } else {
        await apiClient.post(
          `/api/recruiter/companies/${companyId}/stages`,
          payload
        );
      }
      handleClose();
      onSubmit?.();
    } catch (err) {
      setSubmitError(
        err?.message || err?.detail || `No se pudo ${isEditing ? "actualizar" : "crear"} la etapa. Intenta de nuevo.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
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
        form="etapa-form"
        aria-label={isEditing ? "Actualizar etapa" : "Crear etapa"}
        disabled={loading}
        loading={loading}
      >
        {isEditing ? "Actualizar etapa" : "Crear etapa"}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? "Editar etapa" : "Nueva etapa"}
      footer={footer}
      size="md"
      closeOnOverlayClick
      closeOnEscape
    >
      <form
        id="etapa-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col gap-2">
          <label
            htmlFor="etapa-name"
            className="font-inter text-sm font-medium text-foreground"
          >
            Nombre de la etapa <span className="text-vo-pink">*</span>
          </label>
          <input
            id="etapa-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Entrevista técnica"
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
