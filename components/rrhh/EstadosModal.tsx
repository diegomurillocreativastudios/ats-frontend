"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/lib/api"
import { getApiErrorMessage } from "@/lib/api-error"
import DeleteConfirmModal from "@/components/rrhh/DeleteConfirmModal"
import Snackbar from "@/components/ui/Snackbar";

const COMPANY_ID = "00000000-0000-0000-0000-000000000001";

const mapStatusFromApi = (item, index = 0) => {
  const id = String(item?.id ?? item?.uuid ?? index);
  const name = item.name ?? item.status_name ?? "";
  const isDefault = Boolean(
    item.isDefault ?? item.is_default ?? item.IsDefault
  );

  return { id, name, isDefault };
};

const DefaultStatusSwitch = ({
  status,
  onActivate,
  disabled,
  defaultActiveAria,
  markDefaultAria,
}) => {
  const isOn = Boolean(status.isDefault);
  const handleClick = () => {
    if (disabled) return;
    if (isOn) return;
    onActivate(status);
  };
  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    if (isOn) return;
    onActivate(status);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      aria-label={
        isOn
          ? defaultActiveAria(status.name)
          : markDefaultAria(status.name)
      }
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`relative inline-flex h-5 w-10 shrink-0 items-center rounded-full transition-[background-color,box-shadow,border-color] duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-pink/35 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 ${
        isOn
          ? "bg-vo-pink shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18)]"
          : "border border-slate-300/80 bg-slate-100 shadow-[inset_0_1px_1px_rgba(15,23,42,0.06)]"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background transition-[transform,box-shadow] duration-200 ease-out ${
          isOn
            ? "translate-x-5 shadow-[0_1px_3px_rgba(15,23,42,0.18)]"
            : "translate-x-0.5 shadow-[0_1px_2px_rgba(15,23,42,0.12)] ring-1 ring-slate-300/40"
        }`}
        aria-hidden
      />
    </button>
  );
};

const StatusItem = ({
  status,
  onEdit,
  onDelete,
  onDefaultActivate,
  defaultSwitchDisabled,
  defaultStatusLabel,
  defaultActiveAria,
  markDefaultAria,
  editAria,
  deleteAria,
}) => {
  return (
    <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 rounded-lg border border-border bg-background px-4 py-3.5">
      <p className="row-span-2 min-w-0 self-center font-sans text-sm font-medium leading-snug text-foreground">
        <span className="block truncate">{status.name}</span>
      </p>
      <span
        className="col-start-2 justify-self-end font-sans text-[11px] font-normal leading-none tracking-wide text-muted-foreground/70"
        aria-hidden
      >
        {defaultStatusLabel}
      </span>
      <div className="col-start-2 flex shrink-0 items-center justify-end gap-1.5">
        <DefaultStatusSwitch
          status={status}
          onActivate={onDefaultActivate}
          disabled={defaultSwitchDisabled}
          defaultActiveAria={defaultActiveAria}
          markDefaultAria={markDefaultAria}
        />
        <button
          type="button"
          onClick={() => onEdit(status)}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple"
          aria-label={editAria(status.name)}
        >
          <Pencil className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => onDelete(status)}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-destructive"
          aria-label={deleteAria(status.name)}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
};

export default function EstadosModal({ isOpen, onClose, onSnackbar }) {
  const t = useTranslations("AdminPortal.statuses.modal");
  const tCommon = useTranslations("Common");
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [statusToDelete, setStatusToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [defaultSwitchLoading, setDefaultSwitchLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    variant: "success",
  });

  const showSnackbar = useCallback(
    (message, variant = "success") => {
      if (onSnackbar) {
        onSnackbar(message, variant);
        return;
      }
      setSnackbar({ open: true, message, variant });
    },
    [onSnackbar]
  );

  const handleSnackbarClose = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  const fetchStatuses = useCallback(async (silentFlag?: unknown) => {
    const silent = silentFlag === true
    if (!isOpen) return false;

    if (!silent) {
      setLoading(true);
    }
    setFetchError(null);
    try {
      const data = await apiClient.get(
        `/api/recruiter/companies/${COMPANY_ID}/statuses`
      );
      const list = Array.isArray(data) ? data : data?.statuses ?? data?.items ?? data?.data ?? [];
      setStatuses(list.map((item, i) => mapStatusFromApi(item, i)));
      return true;
    } catch (err: unknown) {
      const msg =
        getApiErrorMessage(err) || t("loadFailed");
      setFetchError(msg);
      setStatuses([]);
      showSnackbar(msg, "error");
      return false;
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [isOpen, showSnackbar]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  const handleEdit = (status) => {
    setEditingStatus(status);
    setFormData({ name: status.name });
    setIsFormOpen(true);
  };

  /** Solo un isDefault true: sincroniza todos los estados en el API.
   *  Orden secuencial: primero el nuevo default a true (evita 500 si el backend exige al menos uno),
   *  luego el resto a false. Promise.all en paralelo podía aplicar antes el false del anterior.
   */
  const handleDefaultActivate = async (targetStatus) => {
    if (defaultSwitchLoading) return;
    if (targetStatus.isDefault) return;

    setDefaultSwitchLoading(true);
    setFetchError(null);
    try {
      const target = statuses.find((s) => s.id === targetStatus.id) ?? targetStatus;
      await apiClient.put(
        `/api/recruiter/companies/${COMPANY_ID}/statuses/${target.id}`,
        {
          name: target.name,
          isDefault: true,
        }
      );
      for (const s of statuses) {
        if (s.id === target.id) continue;
        await apiClient.put(
          `/api/recruiter/companies/${COMPANY_ID}/statuses/${s.id}`,
          {
            name: s.name,
            isDefault: false,
          }
        );
      }
      const refreshed = await fetchStatuses(true);
      if (refreshed) {
        showSnackbar(t("defaultChanged"), "info");
      }
    } catch (err) {
      const msg =
        getApiErrorMessage(err) || t("defaultUpdateFailed");
      setFetchError(msg);
      showSnackbar(msg, "error");
    } finally {
      setDefaultSwitchLoading(false);
    }
  };

  const handleDelete = (status) => {
    setStatusToDelete(status);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!statusToDelete) return;

    setDeleteLoading(true);
    try {
      await apiClient.delete(
        `/api/recruiter/companies/${COMPANY_ID}/statuses/${statusToDelete.id}`
      );
      setIsDeleteModalOpen(false);
      setStatusToDelete(null);
      const refreshed = await fetchStatuses();
      if (refreshed) {
        showSnackbar(t("deleted"), "success");
      }
    } catch (err: unknown) {
      const msg =
        getApiErrorMessage(err) || t("deleteFailed");
      setFetchError(msg);
      showSnackbar(msg, "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCloseDeleteModal = () => {
    if (!deleteLoading) {
      setIsDeleteModalOpen(false);
      setStatusToDelete(null);
    }
  };

  const handleNewStatus = () => {
    setEditingStatus(null);
    setFormData({ name: "" });
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingStatus(null);
    setFormData({ name: "" });
    setFormErrors({});
    setSubmitError(null);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) {
      errors.name = t("validationNameRequired");
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      name: formData.name.trim(),
      isDefault: editingStatus
        ? Boolean(editingStatus.isDefault)
        : false,
    };

    setSubmitLoading(true);
    setSubmitError(null);

    const wasEditing = Boolean(editingStatus);

    try {
      if (editingStatus) {
        await apiClient.put(
          `/api/recruiter/companies/${COMPANY_ID}/statuses/${editingStatus.id}`,
          payload
        );
      } else {
        await apiClient.post(
          `/api/recruiter/companies/${COMPANY_ID}/statuses`,
          payload
        );
      }
      handleCloseForm();
      const refreshed = await fetchStatuses(true);
      if (refreshed) {
        showSnackbar(
          wasEditing ? t("updated") : t("created"),
          "success"
        );
      }
    } catch (err: unknown) {
      const msg =
        getApiErrorMessage(err) || t("saveFailed");
      setSubmitError(msg);
      showSnackbar(msg, "error");
    } finally {
      setSubmitLoading(false);
    }
  };


  return (
    <>
      {isOpen && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <div
          className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl bg-background shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="font-sans text-xl font-semibold text-foreground">
              {t("title")}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple"
              aria-label={t("close")}
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto px-6 py-5" style={{ maxHeight: "calc(90vh - 140px)" }}>
            {isFormOpen ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="status-name"
                    className="font-sans text-sm font-medium text-foreground"
                  >
                    {t("nameLabel")} <span className="text-vo-pink">*</span>
                  </label>
                  <input
                    id="status-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ name: e.target.value })}
                    placeholder={t("namePlaceholder")}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                    aria-invalid={!!formErrors.name}
                    aria-describedby={formErrors.name ? "name-error" : undefined}
                  />
                  {formErrors.name && (
                    <p id="name-error" className="font-sans text-sm text-vo-pink" role="alert">
                      {formErrors.name}
                    </p>
                  )}
                </div>

                {submitError && (
                  <div
                    className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 font-sans text-sm text-destructive"
                    role="alert"
                  >
                    {submitError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseForm}
                    disabled={submitLoading}
                  >
                    {tCommon("cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitLoading}
                    loading={submitLoading}
                  >
                    {editingStatus ? t("update") : t("create")}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-vo-purple border-t-transparent" aria-hidden />
                    <p className="font-sans text-sm text-muted-foreground">
                      {t("loading")}
                    </p>
                  </div>
                ) : fetchError ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 py-12 text-center">
                    <p className="font-sans text-sm text-destructive" role="alert">
                      {fetchError}
                    </p>
                    <button
                      type="button"
                      onClick={fetchStatuses}
                      className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover"
                    >
                      {t("retry")}
                    </button>
                  </div>
                ) : statuses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-muted/30 py-12 text-center">
                    <p className="font-sans text-sm text-muted-foreground">
                      {t("empty")}
                    </p>
                  </div>
                ) : (
                  <div
                    className="flex flex-col gap-3"
                    role="group"
                    aria-labelledby="estados-default-legend"
                  >
                    <p
                      id="estados-default-legend"
                      className="font-sans text-[12px] leading-snug text-muted-foreground/75"
                    >
                      {t("defaultLegend")}
                    </p>
                    {statuses.map((status) => (
                      <StatusItem
                        key={status.id}
                        status={status}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onDefaultActivate={handleDefaultActivate}
                        defaultSwitchDisabled={defaultSwitchLoading}
                        defaultStatusLabel={t("defaultStatus")}
                        defaultActiveAria={(name) => t("defaultActiveAria", { name })}
                        markDefaultAria={(name) => t("markDefaultAria", { name })}
                        editAria={(name) => t("editAria", { name })}
                        deleteAria={(name) => t("deleteAria", { name })}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {!isFormOpen && (
            <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                {t("close")}
              </Button>
              <Button
                type="button"
                onClick={handleNewStatus}
              >
                <Plus className="h-4 w-4" aria-hidden />
                {t("newStatus")}
              </Button>
            </div>
          )}
        </div>
      </div>
      )}

      {isOpen && (
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title={t("deleteTitle")}
        message={
          statusToDelete
            ? t("deleteMessage", { name: statusToDelete.name })
            : ""
        }
        confirmText={t("accept")}
        cancelText={tCommon("cancel")}
        loading={deleteLoading}
      />
      )}

      {!onSnackbar && (
        <Snackbar
          open={snackbar.open}
          onClose={handleSnackbarClose}
          variant={snackbar.variant}
          message={snackbar.message}
        />
      )}
    </>
  );
}
