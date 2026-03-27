"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/lib/api";

const toSnakeCase = (str) =>
  str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

const REQUIREMENT_SCALE_MIN = 1;
const REQUIREMENT_SCALE_MAX = 10;
const COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export const createEmptyRequirement = () => ({
  id: crypto.randomUUID?.() ?? `req-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  requirementName: "",
  requirementValue: "",
  scale: 5,
});

export default function NuevaVacanteModal({ isOpen, onClose, onSubmit }) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [requerimientos, setRequerimientos] = useState([createEmptyRequirement()]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handleAddRequirement = () => {
    setRequerimientos((prev) => [...prev, createEmptyRequirement()]);
  };

  const handleRemoveRequirement = (id) => {
    setRequerimientos((prev) => {
      const next = prev.filter((r) => r.id !== id);
      if (next.length === 0) {
        return [createEmptyRequirement()];
      }
      return next;
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`req-${id}`];
      return next;
    });
  };

  const handleUpdateRequirement = (id, field, value) => {
    setRequerimientos((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              [field]: field === "scale" ? parseInt(value, 10) || 1 : value,
            }
          : r
      )
    );
  };

  const validate = () => {
    const nextErrors = {};
    if (!nombre.trim()) {
      nextErrors.nombre = "El nombre es requerido";
    }
    if (!descripcion.trim()) {
      nextErrors.descripcion = "La descripción es requerida";
    }
    requerimientos.forEach((req) => {
      const hasName = !!req.requirementName.trim();
      const hasValue = !!req.requirementValue.trim();
      if (hasName && !hasValue) {
        nextErrors[`req-value-${req.id}`] = "Valor requerido";
      }
      if (!hasName && hasValue) {
        nextErrors[`req-name-${req.id}`] = "Nombre requerido";
      }
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const validReqs = requerimientos.filter(
      (r) => r.requirementName.trim() && r.requirementValue.trim()
    );

    const requirements = {};
    const attributes = {};

    validReqs.forEach((r) => {
      const key = toSnakeCase(r.requirementName);
      if (key) {
        requirements[key] = r.requirementValue.trim();
        attributes[key] = r.scale / 10;
      }
    });

    const payload = {
      title: nombre.trim(),
      description: descripcion.trim(),
      companyId: COMPANY_ID,
      requirements,
      weights: {
        semantic: 0.5,
        attributes,
      },
    };

    setLoading(true);
    setSubmitError(null);

    try {
      const data = await apiClient.post("/api/recruiter/vacancies", payload);
      handleClose();
      onSubmit?.(data);
    } catch (err) {
      setSubmitError(
        err?.message || err?.detail || "No se pudo crear la vacante. Intenta de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNombre("");
    setDescripcion("");
    setRequerimientos([createEmptyRequirement()]);
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
        form="nueva-vacante-form"
        aria-label="Crear vacante"
        disabled={loading}
        loading={loading}
      >
        Crear vacante
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Nueva vacante"
      footer={footer}
      size="lg"
      closeOnOverlayClick
      closeOnEscape
    >
      <form
        id="nueva-vacante-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col gap-2">
          <label
            htmlFor="vacante-nombre"
            className="font-inter text-sm font-medium text-foreground"
          >
            Nombre de la vacante <span className="text-vo-pink">*</span>
          </label>
          <input
            id="vacante-nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Frontend Developer"
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-inter text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
            aria-invalid={!!errors.nombre}
            aria-describedby={errors.nombre ? "nombre-error" : undefined}
          />
          {errors.nombre && (
            <p id="nombre-error" className="font-inter text-sm text-vo-pink" role="alert">
              {errors.nombre}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="vacante-descripcion"
            className="font-inter text-sm font-medium text-foreground"
          >
            Descripción de la vacante <span className="text-vo-pink">*</span>
          </label>
          <textarea
            id="vacante-descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Describe el puesto, responsabilidades y competencias..."
            rows={4}
            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-inter text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]"
            aria-invalid={!!errors.descripcion}
            aria-describedby={errors.descripcion ? "descripcion-error" : undefined}
          />
          {errors.descripcion && (
            <p id="descripcion-error" className="font-inter text-sm text-vo-pink" role="alert">
              {errors.descripcion}
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

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="font-inter text-sm font-medium text-foreground">
              Requerimientos
            </label>
            <button
              type="button"
              onClick={handleAddRequirement}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-inter text-sm font-medium text-vo-purple transition-colors hover:bg-vo-purple/10 focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
              aria-label="Agregar requerimiento"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Agregar
            </button>
          </div>

          <div className="flex flex-col gap-3 max-h-[280px] overflow-y-auto pr-1">
            {requerimientos.map((req, index) => (
              <div
                key={req.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-white p-3"
              >
                <div className="flex items-start gap-2">
                  <div
                    className="mt-2 shrink-0 text-muted-foreground"
                    aria-hidden
                  >
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        value={req.requirementName}
                        onChange={(e) =>
                          handleUpdateRequirement(req.id, "requirementName", e.target.value)
                        }
                        placeholder="Nombre (ej: Licencia de conducir)"
                        className="h-9 w-full rounded-md border border-input bg-background px-2.5 py-1.5 font-inter text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent"
                        aria-label={`Requerimiento ${index + 1} - Nombre`}
                      />
                      {errors[`req-name-${req.id}`] && (
                        <p className="font-inter text-xs text-vo-pink" role="alert">
                          {errors[`req-name-${req.id}`]}
                        </p>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        value={req.requirementValue}
                        onChange={(e) =>
                          handleUpdateRequirement(req.id, "requirementValue", e.target.value)
                        }
                        placeholder="Valor (ej: Pesada)"
                        className="h-9 w-full rounded-md border border-input bg-background px-2.5 py-1.5 font-inter text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent"
                        aria-label={`Requerimiento ${index + 1} - Valor`}
                      />
                      {errors[`req-value-${req.id}`] && (
                        <p className="font-inter text-xs text-vo-pink" role="alert">
                          {errors[`req-value-${req.id}`]}
                        </p>
                      )}
                    </div>
                    <div className="flex min-w-[140px] flex-col gap-1 sm:shrink-0">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor={`scale-${req.id}`}
                          className="font-inter text-xs text-muted-foreground"
                        >
                          Importancia (1-10)
                        </label>
                        <span className="font-inter text-xs font-medium text-foreground tabular-nums">
                          {req.scale}
                        </span>
                      </div>
                      <input
                        id={`scale-${req.id}`}
                        type="range"
                        min={REQUIREMENT_SCALE_MIN}
                        max={REQUIREMENT_SCALE_MAX}
                        value={req.scale}
                        onChange={(e) =>
                          handleUpdateRequirement(req.id, "scale", e.target.value)
                        }
                        className="h-2 w-full cursor-pointer accent-vo-purple"
                        aria-label={`Requerimiento ${index + 1} - Nivel promedio del 1 al 10`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveRequirement(req.id)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-vo-purple"
                      aria-label={`Eliminar requerimiento ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="font-inter text-xs text-muted-foreground">
            Cada requerimiento tiene un nombre, un valor y un nivel promedio del 1 al 10.
          </p>
        </div>
      </form>
    </Modal>
  );
}
