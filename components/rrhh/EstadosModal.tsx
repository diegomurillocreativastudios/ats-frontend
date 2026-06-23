"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  const final = Boolean(item.final ?? item.isFinal ?? item.is_final);

  return { id, name, isDefault, final };
};

const parseStatusesResponse = (data) => {
  const list = Array.isArray(data)
    ? data
    : data?.statuses ?? data?.items ?? data?.data ?? [];
  return list.map((item, i) => mapStatusFromApi(item, i));
};

const unwrapStatusResponse = (data, fallbackIndex = 0) => {
  if (!data || typeof data !== "object") return null;
  if (data.id || data.uuid || data.name || data.status_name) {
    return mapStatusFromApi(data, fallbackIndex);
  }
  if (data.status) return mapStatusFromApi(data.status, fallbackIndex);
  if (data.data) return mapStatusFromApi(data.data, fallbackIndex);
  return null;
};

const StatusItemSkeleton = () => (
  <div
    className="flex w-full animate-pulse items-center justify-between gap-4 rounded-lg border border-border bg-background px-4 py-3.5"
    aria-hidden
  >
    <div className="h-4 w-28 rounded-md bg-muted" />
    <div className="flex shrink-0 items-end gap-3">
      <div className="flex flex-col items-center gap-1.5">
        <div className="h-3 w-16 rounded bg-muted/80" />
        <div className="h-5 w-10 rounded-full bg-muted" />
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <div className="h-3 w-14 rounded bg-muted/80" />
        <div className="h-5 w-10 rounded-full bg-muted" />
      </div>
      <div className="flex items-center gap-1.5 pb-0.5">
        <div className="h-9 w-9 rounded-md bg-muted/70" />
        <div className="h-9 w-9 rounded-md bg-muted/70" />
      </div>
    </div>
  </div>
);

const StatusListSkeleton = () => (
  <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
    <div className="flex flex-col gap-1">
      <div className="h-3 w-full max-w-md animate-pulse rounded bg-muted/70" />
      <div className="h-3 w-full max-w-sm animate-pulse rounded bg-muted/60" />
    </div>
    <StatusItemSkeleton />
    <StatusItemSkeleton />
    <StatusItemSkeleton />
  </div>
);

const SWITCH_TRACK_TRANSITION =
  "transition-[background-color,box-shadow,border-color,opacity,transform] duration-300 ease-in-out motion-reduce:transition-none";
const SWITCH_THUMB_TRANSITION =
  "transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.2,0.64,1)] motion-reduce:transition-none";

const waitForSmoothTransition = (ms = 280) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const SmoothToggleSwitch = ({
  isOn,
  onChange,
  disabled,
  isUpdating,
  activeAria,
  inactiveAria,
  activeClassName = "bg-vo-pink shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18)]",
  focusRingClassName = "focus-visible:ring-vo-pink/35",
}) => {
  const handleClick = () => {
    if (disabled || isUpdating) return;
    onChange(!isOn);
  };
  const handleKeyDown = (e) => {
    if (disabled || isUpdating) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    onChange(!isOn);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      aria-busy={isUpdating}
      aria-label={isOn ? activeAria : inactiveAria}
      disabled={disabled || isUpdating}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`relative inline-flex h-5 w-10 shrink-0 items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.97] disabled:cursor-not-allowed ${SWITCH_TRACK_TRANSITION} ${focusRingClassName} ${
        isUpdating ? "opacity-80" : "opacity-100"
      } ${
        isOn
          ? activeClassName
          : "border border-slate-300/80 bg-slate-100 shadow-[inset_0_1px_1px_rgba(15,23,42,0.06)]"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background ${SWITCH_THUMB_TRANSITION} ${
          isOn
            ? "translate-x-5 shadow-[0_1px_3px_rgba(15,23,42,0.18)]"
            : "translate-x-0.5 shadow-[0_1px_2px_rgba(15,23,42,0.12)] ring-1 ring-slate-300/40"
        }`}
        aria-hidden
      />
      {isUpdating && (
        <span
          className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-inset ring-white/25"
          aria-hidden
        />
      )}
    </button>
  );
};

const DefaultStatusSwitch = ({
  status,
  onToggle,
  disabled,
  isUpdating,
  defaultActiveAria,
  markDefaultAria,
}) => {
  const isOn = Boolean(status.isDefault);

  return (
    <SmoothToggleSwitch
      isOn={isOn}
      onChange={(nextValue) => {
        if (!nextValue || isOn) return;
        onToggle(status);
      }}
      disabled={disabled}
      isUpdating={isUpdating}
      activeAria={defaultActiveAria(status.name)}
      inactiveAria={markDefaultAria(status.name)}
    />
  );
};

const FinalStatusSwitch = ({
  status,
  onToggle,
  disabled,
  isUpdating,
  finalActiveAria,
  markFinalAria,
}) => {
  return (
    <SmoothToggleSwitch
      isOn={Boolean(status.final)}
      onChange={(nextValue) => onToggle(status, nextValue)}
      disabled={disabled}
      isUpdating={isUpdating}
      activeAria={finalActiveAria(status.name)}
      inactiveAria={markFinalAria(status.name)}
      activeClassName="bg-vo-purple shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18)]"
      focusRingClassName="focus-visible:ring-vo-purple/35"
    />
  );
};

const StatusItem = ({
  status,
  onEdit,
  onDelete,
  onDefaultActivate,
  onFinalToggle,
  updatingDefaultStatusId,
  updatingFinalStatusId,
  defaultStatusLabel,
  finalStatusLabel,
  defaultActiveAria,
  markDefaultAria,
  finalActiveAria,
  markFinalAria,
  editAria,
  deleteAria,
  isRemoving,
}) => {
  return (
    <div
      className={`flex w-full items-center justify-between gap-4 overflow-hidden rounded-lg border border-border bg-background px-4 py-3.5 transition-all duration-300 ease-in-out motion-reduce:transition-none ${
        isRemoving
          ? "pointer-events-none max-h-0 scale-[0.98] border-transparent py-0 opacity-0"
          : "max-h-24 scale-100 opacity-100"
      }`}
    >
      <p className="min-w-0 flex-1 font-sans text-sm font-medium leading-snug text-foreground transition-colors duration-300">
        <span className="block truncate">{status.name}</span>
      </p>
      <div className="flex shrink-0 items-end gap-3">
        <div className="flex flex-col items-center gap-1.5">
          <span
            className={`font-sans text-[11px] font-normal leading-none tracking-wide transition-colors duration-300 ${
              status.isDefault
                ? "text-vo-pink/90"
                : "text-muted-foreground/70"
            }`}
          >
            {defaultStatusLabel}
          </span>
          <DefaultStatusSwitch
            status={status}
            onToggle={onDefaultActivate}
            disabled={updatingDefaultStatusId !== null}
            isUpdating={updatingDefaultStatusId === status.id}
            defaultActiveAria={defaultActiveAria}
            markDefaultAria={markDefaultAria}
          />
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <span
            className={`font-sans text-[11px] font-normal leading-none tracking-wide transition-colors duration-300 ${
              status.final
                ? "text-vo-purple/90"
                : "text-muted-foreground/70"
            }`}
          >
            {finalStatusLabel}
          </span>
          <FinalStatusSwitch
            status={status}
            onToggle={onFinalToggle}
            disabled={updatingFinalStatusId !== null && updatingFinalStatusId !== status.id}
            isUpdating={updatingFinalStatusId === status.id}
            finalActiveAria={finalActiveAria}
            markFinalAria={markFinalAria}
          />
        </div>
        <div className="flex items-center gap-1.5 pb-0.5">
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
    </div>
  );
};

export default function EstadosModal({ isOpen, onClose, onSnackbar }) {
  const t = useTranslations("AdminPortal.statuses.modal");
  const tCommon = useTranslations("Common");
  const [statuses, setStatuses] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [removingStatusId, setRemovingStatusId] = useState(null);
  const hasStatusesRef = useRef(false);
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
  const [updatingDefaultStatusId, setUpdatingDefaultStatusId] = useState(null);
  const [updatingFinalStatusId, setUpdatingFinalStatusId] = useState(null);
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

  const fetchStatuses = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!isOpen) return false;

    const showInitialLoader = !silent && !hasStatusesRef.current;

    if (showInitialLoader) {
      setInitialLoading(true);
    } else if (!silent) {
      setIsSyncing(true);
    }
    setFetchError(null);

    try {
      const data = await apiClient.get(
        `/api/recruiter/companies/${COMPANY_ID}/statuses`
      );
      const nextStatuses = parseStatusesResponse(data);
      setStatuses(nextStatuses);
      hasStatusesRef.current = nextStatuses.length > 0;
      return true;
    } catch (err: unknown) {
      const msg =
        getApiErrorMessage(err) || t("loadFailed");
      setFetchError(msg);
      if (!hasStatusesRef.current) {
        setStatuses([]);
      }
      showSnackbar(msg, "error");
      return false;
    } finally {
      setInitialLoading(false);
      setIsSyncing(false);
    }
  }, [isOpen, showSnackbar, t]);

  useEffect(() => {
    if (!isOpen) {
      hasStatusesRef.current = false;
      setInitialLoading(true);
      setIsSyncing(false);
      setStatuses([]);
      setFetchError(null);
      setIsFormOpen(false);
      setEditingStatus(null);
      setRemovingStatusId(null);
      return;
    }

    void fetchStatuses();
  }, [isOpen, fetchStatuses]);

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
    if (updatingDefaultStatusId !== null) return;
    if (targetStatus.isDefault) return;

    const targetId = String(targetStatus.id);
    const previousStatuses = statuses;

    setStatuses((prevStatuses) =>
      prevStatuses.map((s) => ({
        ...s,
        isDefault: String(s.id) === targetId,
      }))
    );
    setUpdatingDefaultStatusId(targetId);
    setFetchError(null);

    try {
      const target =
        statuses.find((s) => String(s.id) === targetId) ?? targetStatus;

      await Promise.all([
        (async () => {
          await apiClient.put(
            `/api/recruiter/companies/${COMPANY_ID}/statuses/${target.id}`,
            {
              name: target.name,
              isDefault: true,
            }
          );
          for (const s of statuses) {
            if (String(s.id) === targetId) continue;
            await apiClient.put(
              `/api/recruiter/companies/${COMPANY_ID}/statuses/${s.id}`,
              {
                name: s.name,
                isDefault: false,
              }
            );
          }
        })(),
        waitForSmoothTransition(),
      ]);

      showSnackbar(t("defaultChanged"), "info");
    } catch (err) {
      setStatuses(previousStatuses);
      const msg =
        getApiErrorMessage(err) || t("defaultUpdateFailed");
      setFetchError(msg);
      showSnackbar(msg, "error");
    } finally {
      setUpdatingDefaultStatusId(null);
    }
  };

  const handleFinalToggle = async (targetStatus, newValue) => {
    if (updatingFinalStatusId !== null) return;

    const statusId = String(targetStatus.id);
    const previousStatuses = statuses;

    setStatuses((prevStatuses) =>
      prevStatuses.map((s) =>
        String(s.id) === statusId ? { ...s, final: newValue } : s
      )
    );

    setUpdatingFinalStatusId(statusId);
    setFetchError(null);

    try {
      await apiClient.patch(
        `/api/recruiter/companies/${COMPANY_ID}/statuses/${statusId}`,
        { final: newValue }
      );

      await waitForSmoothTransition();

      showSnackbar(
        newValue ? t("finalMarked") : t("finalUnmarked"),
        "info"
      );
    } catch (err) {
      setStatuses(previousStatuses);
      const msg =
        getApiErrorMessage(err) || t("finalUpdateFailed");
      setFetchError(msg);
      showSnackbar(msg, "error");
    } finally {
      setUpdatingFinalStatusId(null);
    }
  };

  const handleDelete = (status) => {
    setStatusToDelete(status);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!statusToDelete) return;

    const deletedId = String(statusToDelete.id);
    const previousStatuses = statuses;

    setDeleteLoading(true);
    setRemovingStatusId(deletedId);

    try {
      await waitForSmoothTransition(260);
      setStatuses((prev) => {
        const next = prev.filter((s) => String(s.id) !== deletedId);
        hasStatusesRef.current = next.length > 0;
        return next;
      });
      setIsDeleteModalOpen(false);
      setStatusToDelete(null);
      setRemovingStatusId(null);

      await apiClient.delete(
        `/api/recruiter/companies/${COMPANY_ID}/statuses/${deletedId}`
      );

      showSnackbar(t("deleted"), "success");
    } catch (err: unknown) {
      setStatuses(previousStatuses);
      hasStatusesRef.current = previousStatuses.length > 0;
      setRemovingStatusId(null);
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
      final: editingStatus
        ? Boolean(editingStatus.final)
        : false,
    };

    setSubmitLoading(true);
    setSubmitError(null);

    const wasEditing = Boolean(editingStatus);

    try {
      if (editingStatus) {
        const updated = await apiClient.put(
          `/api/recruiter/companies/${COMPANY_ID}/statuses/${editingStatus.id}`,
          payload
        );
        const mapped =
          unwrapStatusResponse(updated) ?? {
            ...editingStatus,
            name: payload.name,
            isDefault: payload.isDefault,
            final: payload.final,
          };
        setStatuses((prev) =>
          prev.map((s) =>
            String(s.id) === String(editingStatus.id) ? mapped : s
          )
        );
      } else {
        const created = await apiClient.post(
          `/api/recruiter/companies/${COMPANY_ID}/statuses`,
          payload
        );
        const mapped =
          unwrapStatusResponse(created, statuses.length) ?? {
            id: `local-${Date.now()}`,
            name: payload.name,
            isDefault: payload.isDefault,
            final: payload.final,
          };
        setStatuses((prev) => [...prev, mapped]);
        hasStatusesRef.current = true;
      }

      handleCloseForm();
      await waitForSmoothTransition();

      showSnackbar(
        wasEditing ? t("updated") : t("created"),
        "success"
      );
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
          <div
            className="overflow-y-auto px-6 py-5 transition-opacity duration-300 ease-in-out"
            style={{ maxHeight: "calc(90vh - 140px)" }}
          >
            {isFormOpen ? (
              <form
                onSubmit={handleSubmit}
                className="flex animate-in fade-in slide-in-from-bottom-1 flex-col gap-4 duration-300 motion-reduce:animate-none"
              >
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
              <div
                className={`flex flex-col gap-4 transition-opacity duration-300 ease-in-out motion-reduce:transition-none ${
                  isSyncing ? "opacity-80" : "opacity-100"
                }`}
              >
                {initialLoading ? (
                  <StatusListSkeleton />
                ) : fetchError && statuses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 py-12 text-center">
                    <p className="font-sans text-sm text-destructive" role="alert">
                      {fetchError}
                    </p>
                    <button
                      type="button"
                      onClick={() => void fetchStatuses()}
                      className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover"
                    >
                      {t("retry")}
                    </button>
                  </div>
                ) : statuses.length === 0 ? (
                  <div className="flex animate-in fade-in flex-col items-center justify-center gap-3 rounded-lg border border-border bg-muted/30 py-12 text-center duration-300 motion-reduce:animate-none">
                    <p className="font-sans text-sm text-muted-foreground">
                      {t("empty")}
                    </p>
                  </div>
                ) : (
                  <div
                    className="flex animate-in fade-in flex-col gap-3 duration-300 motion-reduce:animate-none"
                    role="group"
                    aria-labelledby="estados-switches-legend"
                    aria-busy={isSyncing}
                  >
                    <div
                      id="estados-switches-legend"
                      className="flex flex-col gap-1 font-sans text-[12px] leading-snug text-muted-foreground/75"
                    >
                      <p>{t("defaultLegend")}</p>
                      <p>{t("finalLegend")}</p>
                    </div>
                    {statuses.map((status, index) => (
                      <div
                        key={status.id}
                        className="animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none"
                        style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
                      >
                        <StatusItem
                          status={status}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onDefaultActivate={handleDefaultActivate}
                          onFinalToggle={handleFinalToggle}
                          updatingDefaultStatusId={updatingDefaultStatusId}
                          updatingFinalStatusId={updatingFinalStatusId}
                          isRemoving={removingStatusId === status.id}
                          defaultStatusLabel={t("defaultStatus")}
                          finalStatusLabel={t("finalStatus")}
                          defaultActiveAria={(name) => t("defaultActiveAria", { name })}
                          markDefaultAria={(name) => t("markDefaultAria", { name })}
                          finalActiveAria={(name) => t("finalActiveAria", { name })}
                          markFinalAria={(name) => t("markFinalAria", { name })}
                          editAria={(name) => t("editAria", { name })}
                          deleteAria={(name) => t("deleteAria", { name })}
                        />
                      </div>
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
