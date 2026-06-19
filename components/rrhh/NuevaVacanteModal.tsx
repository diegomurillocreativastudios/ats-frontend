"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, GripVertical } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/lib/api";
import { listAdminVacancyCatalog } from "@/lib/api/admin-vacancy-catalogs";
import {
  DEFAULT_RECRUITER_COMPANY_ID,
  listRecruiterCompanies,
  persistVacancyCompanyId,
  type RecruiterCompanyOption,
} from "@/lib/api/recruiter-companies";
import { VacancyLocationFields } from "@/components/rrhh/VacancyLocationFields";
import { appendVacancyLocationToPayload } from "@/lib/vacancies/vacancy-location";
import { mapActiveCatalogItemsToOptions } from "@/lib/vacancy-catalogs";

const toSnakeCase = (str) =>
  str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

const REQUIREMENT_SCALE_MIN = 1;
const REQUIREMENT_SCALE_MAX = 10;

export const createEmptyRequirement = () => ({
  id: crypto.randomUUID?.() ?? `req-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  requirementName: "",
  requirementValue: "",
  scale: 5,
});

export default function NuevaVacanteModal({ isOpen, onClose, onSubmit, onSnackbar }) {
  const t = useTranslations("RecruiterPortal.vacancies.form");
  const tLocation = useTranslations("RecruiterPortal.vacancies.location");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [detalles, setDetalles] = useState("");
  const [salario, setSalario] = useState("");
  const [ventajas, setVentajas] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [vacancyDepartmentId, setVacancyDepartmentId] = useState("");
  const [vacancyModalityId, setVacancyModalityId] = useState("");
  const [requerimientos, setRequerimientos] = useState([createEmptyRequirement()]);
  const [companyOptions, setCompanyOptions] = useState<RecruiterCompanyOption[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(DEFAULT_RECRUITER_COMPANY_ID);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companyLoadError, setCompanyLoadError] = useState<string | null>(null);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [modalityOptions, setModalityOptions] = useState([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [catalogLoadError, setCatalogLoadError] = useState(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (!isOpen) return

    let cancelled = false

    const loadCompanies = async () => {
      setLoadingCompanies(true)
      setCompanyLoadError(null)

      try {
        const companies = await listRecruiterCompanies()
        if (cancelled) return

        setCompanyOptions(companies)
        const defaultId =
          companies.find((c) => c.id === DEFAULT_RECRUITER_COMPANY_ID)?.id ??
          companies[0]?.id ??
          DEFAULT_RECRUITER_COMPANY_ID
        setSelectedCompanyId(defaultId)
      } catch (error) {
        if (cancelled) return
        setCompanyOptions([])
        setSelectedCompanyId(DEFAULT_RECRUITER_COMPANY_ID)
        setCompanyLoadError(
          (error as { message?: string })?.message ||
            (error as { detail?: string })?.detail ||
            ""
        )
      } finally {
        if (!cancelled) setLoadingCompanies(false)
      }
    }

    const loadCatalogs = async () => {
      setLoadingCatalogs(true)
      setCatalogLoadError(null)

      try {
        const [departments, modalities] = await Promise.all([
          listAdminVacancyCatalog("departments"),
          listAdminVacancyCatalog("modalities"),
        ])

        if (cancelled) return

        setDepartmentOptions(mapActiveCatalogItemsToOptions(departments))
        setModalityOptions(mapActiveCatalogItemsToOptions(modalities))
      } catch (error) {
        if (cancelled) return
        setDepartmentOptions([])
        setModalityOptions([])
        setCatalogLoadError(
          error?.message ||
            error?.detail ||
            ""
        )
      } finally {
        if (!cancelled) setLoadingCatalogs(false)
      }
    }

    void loadCompanies()
    void loadCatalogs()

    return () => {
      cancelled = true
    }
  }, [isOpen])

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
    const nextErrors: Record<string, string> = {};
    if (!nombre.trim()) {
      nextErrors.nombre = t("validation.nameRequired");
    }
    if (!descripcion.trim()) {
      nextErrors.descripcion = t("validation.descriptionRequired");
    }
    if (!selectedCompanyId.trim()) {
      nextErrors.empresa = t("validation.companyRequired");
    }
    requerimientos.forEach((req) => {
      const hasName = !!req.requirementName.trim();
      const hasValue = !!req.requirementValue.trim();
      if (hasName && !hasValue) {
        nextErrors[`req-value-${req.id}`] = t("validation.requirementValueRequired");
      }
      if (!hasName && hasValue) {
        nextErrors[`req-name-${req.id}`] = t("validation.requirementNameRequired");
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

    const trimmedDetalles = detalles.trim()
    const trimmedSalario = salario.trim()
    const trimmedVentajas = ventajas.trim()

    const payload: Record<string, unknown> = {
      title: nombre.trim(),
      description: descripcion.trim(),
      details: trimmedDetalles || null,
      salary: trimmedSalario || null,
      advantages: trimmedVentajas || null,
      companyId: selectedCompanyId || DEFAULT_RECRUITER_COMPANY_ID,
      requirements,
      weights: {
        semantic: 0.5,
        attributes,
      },
    };
    appendVacancyLocationToPayload(payload, { countryCode, stateCode });
    if (vacancyDepartmentId) {
      payload.vacancyDepartmentId = vacancyDepartmentId
    }
    if (vacancyModalityId) {
      payload.vacancyModalityId = vacancyModalityId
    }

    setLoading(true);
    setSubmitError(null);

    try {
      const data = await apiClient.post("/api/recruiter/vacancies", payload);
      const created =
        data && typeof data === "object" && !Array.isArray(data)
          ? (data as Record<string, unknown>)
          : null
      const createdId = created?.id ?? created?.uuid
      const createdCompanyId =
        created?.companyId ?? created?.company_id ?? payload.companyId
      if (createdId != null && createdCompanyId != null) {
        persistVacancyCompanyId(String(createdId), String(createdCompanyId))
      }
      handleClose();
      onSubmit?.(data);
    } catch (err) {
      const msg =
        err?.message || err?.detail || t("errors.createFailed")
      setSubmitError(msg)
      onSnackbar?.(msg, "error")
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNombre("");
    setDescripcion("");
    setDetalles("");
    setSalario("");
    setVentajas("");
    setCountryCode("");
    setStateCode("");
    setVacancyDepartmentId("");
    setVacancyModalityId("");
    setSelectedCompanyId(DEFAULT_RECRUITER_COMPANY_ID);
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
        aria-label={t("actions.cancel")}
      >
        {t("actions.cancel")}
      </Button>
      <Button
        type="submit"
        form="nueva-vacante-form"
        aria-label={t("actions.submit")}
        disabled={loading}
        loading={loading}
      >
        {t("actions.submit")}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("title")}
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
            className="font-sans text-sm font-medium text-foreground"
          >
            {t("fields.name.label")} <span className="text-vo-pink">*</span>
          </label>
          <input
            id="vacante-nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={t("fields.name.placeholder")}
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
            aria-invalid={!!errors.nombre}
            aria-describedby={errors.nombre ? "nombre-error" : undefined}
          />
          {errors.nombre && (
            <p id="nombre-error" className="font-sans text-sm text-vo-pink" role="alert">
              {errors.nombre}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="vacante-descripcion"
            className="font-sans text-sm font-medium text-foreground"
          >
            {t("fields.description.label")} <span className="text-vo-pink">*</span>
          </label>
          <textarea
            id="vacante-descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder={t("fields.description.placeholder")}
            rows={4}
            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]"
            aria-invalid={!!errors.descripcion}
            aria-describedby={errors.descripcion ? "descripcion-error" : undefined}
          />
          {errors.descripcion && (
            <p id="descripcion-error" className="font-sans text-sm text-vo-pink" role="alert">
              {errors.descripcion}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="vacante-detalles"
            className="font-sans text-sm font-medium text-foreground"
          >
            {t("fields.details.label")}
          </label>
          <textarea
            id="vacante-detalles"
            value={detalles}
            onChange={(e) => setDetalles(e.target.value)}
            placeholder={t("fields.details.placeholder")}
            rows={3}
            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
            aria-label={t("fields.details.label")}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="vacante-salario"
            className="font-sans text-sm font-medium text-foreground"
          >
            {t("fields.salary.label")}
          </label>
          <input
            id="vacante-salario"
            type="text"
            value={salario}
            onChange={(e) => setSalario(e.target.value)}
            placeholder={t("fields.salary.placeholder")}
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={t("fields.salary.ariaLabel")}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="vacante-ventajas"
            className="font-sans text-sm font-medium text-foreground"
          >
            {t("fields.advantages.label")}
          </label>
          <textarea
            id="vacante-ventajas"
            value={ventajas}
            onChange={(e) => setVentajas(e.target.value)}
            placeholder={t("fields.advantages.placeholder")}
            rows={3}
            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
            aria-label={t("fields.advantages.label")}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="vacante-cliente"
            className="font-sans text-sm font-medium text-foreground"
          >
            {t("fields.client.label")} <span className="text-vo-pink">*</span>
          </label>
          <select
            id="vacante-cliente"
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={t("fields.client.ariaLabel")}
            aria-invalid={!!errors.empresa}
            aria-describedby={errors.empresa ? "empresa-error" : undefined}
            disabled={loading || loadingCompanies}
          >
            {companyOptions.length === 0 ? (
              <option value={DEFAULT_RECRUITER_COMPANY_ID}>Appli AI</option>
            ) : (
              companyOptions.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))
            )}
          </select>
          {errors.empresa ? (
            <p id="empresa-error" className="font-sans text-sm text-vo-pink" role="alert">
              {errors.empresa}
            </p>
          ) : null}
        </div>

        {companyLoadError !== null ? (
          <div
            className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 font-sans text-sm text-amber-800"
            role="status"
          >
            {companyLoadError || t("errors.companiesLoadFailed")} {t("errors.companiesLoadFallbackSuffix")}
          </div>
        ) : null}

        <VacancyLocationFields
          countryCode={countryCode}
          stateCode={stateCode}
          onChange={({ countryCode: nextCountryCode, stateCode: nextStateCode }) => {
            setCountryCode(nextCountryCode)
            setStateCode(nextStateCode)
          }}
          countrySelectId="vacante-pais"
          stateSelectId="vacante-estado"
          countryLabel={t("fields.country.label")}
          stateLabel={t("fields.state.label")}
          helperText={t("fields.locationHelper")}
          unspecifiedLabel={tLocation("unspecified")}
          loadCountriesErrorLabel={tLocation("loadCountriesError")}
          loadStatesErrorLabel={tLocation("loadStatesError")}
          disabled={loading}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="vacante-department"
              className="font-sans text-sm font-medium text-foreground"
            >
              {t("fields.department.label")}
            </label>
            <select
              id="vacante-department"
              value={vacancyDepartmentId}
              onChange={(e) => setVacancyDepartmentId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={t("fields.department.ariaLabel")}
              disabled={loading || loadingCatalogs}
            >
              <option value="">{t("fields.unspecifiedOption")}</option>
              {departmentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="vacante-modality"
              className="font-sans text-sm font-medium text-foreground"
            >
              {t("fields.modality.label")}
            </label>
            <select
              id="vacante-modality"
              value={vacancyModalityId}
              onChange={(e) => setVacancyModalityId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={t("fields.modality.ariaLabel")}
              disabled={loading || loadingCatalogs}
            >
              <option value="">{t("fields.unspecifiedOption")}</option>
              {modalityOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {catalogLoadError !== null ? (
          <div
            className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 font-sans text-sm text-amber-800"
            role="status"
          >
            {catalogLoadError || t("errors.catalogsLoadFailed")} {t("errors.catalogsLoadFallbackSuffix")}
          </div>
        ) : null}

        {submitError && (
          <div
            className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 font-sans text-sm text-destructive"
            role="alert"
          >
            {submitError}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="font-sans text-sm font-medium text-foreground">
              {t("fields.requirements.label")}
            </label>
            <button
              type="button"
              onClick={handleAddRequirement}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-sans text-sm font-medium text-vo-purple transition-colors hover:bg-vo-purple/10 focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
              aria-label={t("actions.addRequirementAria")}
            >
              <Plus className="h-4 w-4" aria-hidden />
              {t("actions.add")}
            </button>
          </div>

          <div className="flex flex-col gap-3 max-h-[280px] overflow-y-auto pr-1">
            {requerimientos.map((req, index) => (
              <div
                key={req.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3"
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
                        placeholder={t("fields.requirements.namePlaceholder")}
                        className="h-9 w-full rounded-md border border-input bg-background px-2.5 py-1.5 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent"
                        aria-label={t("fields.requirements.nameAria", { index: index + 1 })}
                      />
                      {errors[`req-name-${req.id}`] && (
                        <p className="font-sans text-xs text-vo-pink" role="alert">
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
                        placeholder={t("fields.requirements.valuePlaceholder")}
                        className="h-9 w-full rounded-md border border-input bg-background px-2.5 py-1.5 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent"
                        aria-label={t("fields.requirements.valueAria", { index: index + 1 })}
                      />
                      {errors[`req-value-${req.id}`] && (
                        <p className="font-sans text-xs text-vo-pink" role="alert">
                          {errors[`req-value-${req.id}`]}
                        </p>
                      )}
                    </div>
                    <div className="flex min-w-[140px] flex-col gap-1 sm:shrink-0">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor={`scale-${req.id}`}
                          className="font-sans text-xs text-muted-foreground"
                        >
                          {t("fields.requirements.importanceLabel")}
                        </label>
                        <span className="font-sans text-xs font-medium text-foreground tabular-nums">
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
                        aria-label={t("fields.requirements.scaleAria", { index: index + 1 })}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveRequirement(req.id)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-vo-purple"
                      aria-label={t("fields.requirements.removeAria", { index: index + 1 })}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="font-sans text-xs text-muted-foreground">
            {t("fields.requirements.helper")}
          </p>
        </div>
      </form>
    </Modal>
  );
}
