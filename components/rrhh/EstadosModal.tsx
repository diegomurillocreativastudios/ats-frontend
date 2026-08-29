"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  CircleDot,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  AdminEmptyState,
  AdminErrorPanel,
  AdminLoadingState,
  AdminSurface,
} from "@/components/portal-admin/admin-page-chrome"
import DeleteConfirmModal from "@/components/rrhh/DeleteConfirmModal"
import { Button } from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import PortalPageHeader from "@/components/ui/PortalPageHeader";
import Snackbar from "@/components/ui/Snackbar";
import { apiClient } from "@/lib/api"
import { getApiErrorMessage } from "@/lib/api-error"

/**
 * Global platform application-status catalog URL.
 */
const statusesUrl = (suffix = "") => {
  const base = `/api/recruiter/statuses`;
  return suffix ? `${base}/${suffix}` : base;
};

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
    className="flex w-full animate-pulse flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
    aria-hidden
  >
    <div className="h-5 w-32 rounded-md bg-muted" />
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="h-3 w-20 rounded bg-muted/80" />
        <div className="h-5 w-10 rounded-full bg-muted" />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="h-3 w-16 rounded bg-muted/80" />
        <div className="h-5 w-10 rounded-full bg-muted" />
      </div>
      <div className="h-10 w-24 rounded-md bg-muted/70" />
      <div className="h-10 w-28 rounded-md bg-muted/70" />
    </div>
  </div>
);

const StatusListSkeleton = () => (
  <div
    className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm"
    aria-busy="true"
    aria-live="polite"
  >
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
  editLabel,
  deleteLabel,
  isRemoving,
}) => {
  return (
    <div
      className={`flex w-full flex-col gap-4 overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300 ease-in-out motion-reduce:transition-none sm:flex-row sm:items-center sm:justify-between ${
        isRemoving
          ? "pointer-events-none max-h-0 scale-[0.98] border-transparent p-0 opacity-0"
          : "max-h-40 scale-100 opacity-100"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="font-sans text-base font-semibold text-foreground">
            {status.name}
          </h3>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="font-sans text-[11px] font-normal leading-none tracking-wide text-muted-foreground/70">
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
        <div className="flex flex-col gap-1.5">
          <span className="font-sans text-[11px] font-normal leading-none tracking-wide text-muted-foreground/70">
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
        <button
          type="button"
          onClick={() => onEdit(status)}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
          aria-label={editAria(status.name)}
        >
          <Pencil className="h-4 w-4" aria-hidden />
          {editLabel}
        </button>
        <button
          type="button"
          onClick={() => onDelete(status)}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-destructive/30 bg-background px-4 py-2.5 font-sans text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2"
          aria-label={deleteAria(status.name)}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          {deleteLabel}
        </button>
      </div>
    </div>
  );
};

interface EstadosModalProps {
  isOpen?: boolean
  onClose?: () => void
  onSnackbar?: (message: string, variant?: string) => void
  variant?: "modal" | "inline"
}

export default function EstadosModal({
  isOpen = false,
  onClose,
  onSnackbar,
  variant = "modal",
}: EstadosModalProps) {
  const t = useTranslations("AdminPortal.statuses.modal");
  const tPage = useTranslations("AdminPortal.statuses.page");
  const tCommon = useTranslations("Common");
  const statusesFetchGenerationRef = useRef(0);
  const isVisible = variant === "inline" || isOpen;
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
    if (!isVisible) return false;

    const generation = ++statusesFetchGenerationRef.current;
    const showInitialLoader = !silent && !hasStatusesRef.current;

    if (showInitialLoader) {
      setInitialLoading(true);
    } else if (!silent) {
      setIsSyncing(true);
    }
    setFetchError(null);

    try {
      const data = await apiClient.get(statusesUrl());
      if (generation !== statusesFetchGenerationRef.current) return false;
      const nextStatuses = parseStatusesResponse(data);
      setStatuses(nextStatuses);
      hasStatusesRef.current = nextStatuses.length > 0;
      return true;
    } catch (err: unknown) {
      if (generation !== statusesFetchGenerationRef.current) return false;
      const msg =
        getApiErrorMessage(err) || t("loadFailed");
      setFetchError(msg);
      if (!hasStatusesRef.current) {
        setStatuses([]);
      }
      showSnackbar(msg, "error");
      return false;
    } finally {
      if (generation === statusesFetchGenerationRef.current) {
        setInitialLoading(false);
        setIsSyncing(false);
      }
    }
  }, [isVisible, showSnackbar, t]);

  useEffect(() => {
    if (!isVisible) {
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

    hasStatusesRef.current = false;
    setStatuses([]);
    void fetchStatuses();
  }, [isVisible, fetchStatuses]);


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
            statusesUrl(target.id),
            {
              name: target.name,
              isDefault: true,
            }
          );
          for (const s of statuses) {
            if (String(s.id) === targetId) continue;
            await apiClient.put(
              statusesUrl(s.id),
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
        statusesUrl(statusId),
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
        statusesUrl(deletedId)
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
          statusesUrl(editingStatus.id),
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
          statusesUrl(),
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


  const statusFormFields = (
    <form
      id="status-form"
      onSubmit={handleSubmit}
      className="flex flex-col gap-5"
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
    </form>
  )

  const statusFormFooter = (
    <>
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
        form="status-form"
        disabled={submitLoading}
        loading={submitLoading}
      >
        {editingStatus ? t("update") : t("create")}
      </Button>
    </>
  )

  const statusItems = statuses.map((status, index) => (
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
        editLabel={tCommon("edit")}
        deleteLabel={tCommon("delete")}
      />
    </div>
  ))

  const statusList = (
    <div
      className={`flex flex-col gap-4 transition-opacity duration-300 ease-in-out motion-reduce:transition-none ${
        isSyncing ? "opacity-80" : "opacity-100"
      }`}
    >
      {initialLoading ? (
        variant === "inline" ? (
          <AdminSurface>
            <AdminLoadingState label={t("loading")} />
          </AdminSurface>
        ) : (
          <StatusListSkeleton />
        )
      ) : fetchError && statuses.length === 0 ? (
        variant === "inline" ? (
          <AdminErrorPanel
            message={fetchError}
            onRetry={() => void fetchStatuses()}
            retryLabel={t("retry")}
          />
        ) : (
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
        )
      ) : statuses.length === 0 ? (
        variant === "inline" ? (
          <AdminSurface>
            <AdminEmptyState
              icon={CircleDot}
              title={t("empty")}
              action={
                <Button type="button" variant="primary" onClick={handleNewStatus}>
                  <Plus className="h-4 w-4" aria-hidden />
                  {t("createStatus")}
                </Button>
              }
            />
          </AdminSurface>
        ) : (
          <div className="flex animate-in fade-in flex-col items-center justify-center gap-3 rounded-lg border border-border bg-muted/30 py-12 text-center duration-300 motion-reduce:animate-none">
            <p className="font-sans text-sm text-muted-foreground">
              {t("empty")}
            </p>
          </div>
        )
      ) : (
        <div
          className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm"
          role="region"
          aria-label={tPage("listAria")}
          aria-busy={isSyncing}
        >
          <div className="flex flex-col gap-4">{statusItems}</div>
        </div>
      )}
    </div>
  )

  const listOrForm = isFormOpen ? (
    <div className="flex animate-in fade-in slide-in-from-bottom-1 flex-col gap-4 duration-300 motion-reduce:animate-none">
      {statusFormFields}
      <div className="flex items-center justify-end gap-3 pt-2">
        {statusFormFooter}
      </div>
    </div>
  ) : (
    statusList
  )

  const newStatusButton = (
    <Button
      type="button"
      variant="primary"
      onClick={handleNewStatus}
      disabled={false}
      aria-label={tPage("newStatusAria")}
    >
      <Plus className="h-4 w-4" aria-hidden />
      {t("newStatus")}
    </Button>
  )

  const deleteModal = (
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
  )

  const snackbarEl = !onSnackbar ? (
    <Snackbar
      open={snackbar.open}
      onClose={handleSnackbarClose}
      variant={snackbar.variant}
      message={snackbar.message}
    />
  ) : null

  const statusFormModal = (
    <Modal
      isOpen={isFormOpen}
      onClose={handleCloseForm}
      title={editingStatus ? t("editTitle") : t("createTitle")}
      footer={statusFormFooter}
      size="md"
      closeOnOverlayClick
      closeOnEscape
    >
      {statusFormFields}
    </Modal>
  )

  if (variant === "inline") {
    return (
      <>
        <PortalPageHeader
          title={tPage("title")}
          description={tPage("description")}
          layout="split"
          actions={
            <>
                            {newStatusButton}
            </>
          }
        />
                {statusList}
        {statusFormModal}
        {isVisible ? deleteModal : null}
        {snackbarEl}
      </>
    )
  }

  return (
    <>
      {isVisible ? (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <div
          className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl bg-background shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col gap-3 border-b border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-sans text-xl font-semibold text-foreground">
              {t("title")}
            </h2>
            <div className="flex items-center gap-3">
                            <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple"
                aria-label={t("close")}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </div>

          <div
            className="overflow-y-auto px-6 py-5 transition-opacity duration-300 ease-in-out"
            style={{ maxHeight: "calc(90vh - 140px)" }}
          >
                        {listOrForm}
          </div>

          {!isFormOpen ? (
            <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                {t("close")}
              </Button>
              {newStatusButton}
            </div>
          ) : null}
        </div>
      </div>
      ) : null}

      {isVisible ? deleteModal : null}
      {snackbarEl}
    </>
  );
}
