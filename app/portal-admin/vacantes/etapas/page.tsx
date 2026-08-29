"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import Nestable from "react-nestable";
import {
  Plus,
  Pencil,
  Trash2,
  ListOrdered,
  GripVertical,
} from "lucide-react";
import EtapaModal from "@/components/rrhh/EtapaModal";
import DeleteConfirmModal from "@/components/rrhh/DeleteConfirmModal";
import {
  AdminEmptyState,
  AdminErrorPanel,
  AdminLoadingState,
  AdminPageFrame,
  AdminSummaryBar,
  AdminSurface,
} from "@/components/portal-admin/admin-page-chrome";
import PortalPageHeader from "@/components/ui/PortalPageHeader";
import { Button } from "@/components/ui/Button";
import Snackbar from "@/components/ui/Snackbar";
import { apiClient } from "@/lib/api";
import { unwrapListArray } from "@/lib/api/query-paging";
import { getApiErrorMessage } from "@/lib/api-error";
import { buildRecruiterStagePutPayload } from "@/lib/recruiterStagePayload";
import "react-nestable/dist/styles/index.css";
import "./nestable-custom.css";

/**
 * Global platform stages catalog URL.
 */
const stagesUrl = (suffix = "") => {
  const base = `/api/recruiter/stages`;
  return suffix ? `${base}/${suffix}` : base;
};

/**
 * Orden de etapa: siempre `orderIndex` (mismo nombre y semántica que el API, 1…n).
 */
const mapStageFromApi = (item, index = 0) => {
  const id = String(item?.id ?? item?.uuid ?? index);
  const name = item.name ?? item.stage_name ?? "";
  const description = item.description ?? "";
  const raw = item.orderIndex ?? item.order ?? item.stage_order;
  const parsed = Number(raw);
  const orderIndex = Number.isFinite(parsed) ? parsed : index + 1;

  return {
    id,
    name,
    description,
    orderIndex,
    isDefault: Boolean(
      item.isDefault ?? item.is_default ?? item.IsDefault
    ),
    final: Boolean(item.final ?? item.Final),
    isHiredStage: Boolean(item.isHiredStage ?? item.is_hired_stage),
    triggersNotification: Boolean(item.triggersNotification),
    notificationTemplateId: item.notificationTemplateId ?? null,
  };
};

/** Mismo criterio que el API con orderIndex repetidos: ordenar por orderIndex y desempatar por id. */
const sortStagesStable = (a, b) => {
  if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
  return String(a.id).localeCompare(String(b.id));
};

const persistStageOrdersSequential = async (orderedStages) => {
  for (let i = 0; i < orderedStages.length; i++) {
    const stage = orderedStages[i];
    await apiClient.put(
      stagesUrl(stage.id),
      buildRecruiterStagePutPayload(stage)
    );
  }
};

const DefaultStageSwitch = ({ stage, onActivate, disabled, isUpdating, tStages }) => {
  const isOn = Boolean(stage.isDefault);
  const handleClick = () => {
    if (disabled || isUpdating) return;
    if (isOn) return;
    onActivate(stage);
  };
  const handleKeyDown = (e) => {
    if (disabled || isUpdating) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    if (isOn) return;
    onActivate(stage);
  };

  return (
    <div className="relative">
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-label={
          isOn
            ? tStages("switches.defaultActive", { name: stage.name })
            : tStages("switches.markDefault", { name: stage.name })
        }
        disabled={disabled || isUpdating}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`relative inline-flex h-5 w-10 shrink-0 items-center rounded-full transition-[background-color,box-shadow,border-color,opacity] duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-pink/35 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${
          isUpdating ? "opacity-60" : "opacity-100"
        } ${
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
      {isUpdating && (
        <div className="absolute -right-6 top-1/2 -translate-y-1/2">
          <div
            className="h-3 w-3 animate-spin rounded-full border-2 border-vo-pink border-t-transparent"
            aria-hidden
          />
        </div>
      )}
    </div>
  );
};

const FinalStageSwitch = ({ stage, onToggle, disabled, isUpdating, tStages }) => {
  const isOn = Boolean(stage.final);
  const handleClick = () => {
    if (disabled || isUpdating) return;
    onToggle(stage, !isOn);
  };
  const handleKeyDown = (e) => {
    if (disabled || isUpdating) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    onToggle(stage, !isOn);
  };

  return (
    <div className="relative">
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-label={
          isOn
            ? tStages("switches.finalActive", { name: stage.name })
            : tStages("switches.markFinal", { name: stage.name })
        }
        disabled={disabled || isUpdating}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`relative inline-flex h-5 w-10 shrink-0 items-center rounded-full transition-[background-color,box-shadow,border-color,opacity] duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple/35 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${
          isUpdating ? "opacity-60" : "opacity-100"
        } ${
          isOn
            ? "bg-vo-purple shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18)]"
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
      {isUpdating && (
        <div className="absolute -right-6 top-1/2 -translate-y-1/2">
          <div
            className="h-3 w-3 animate-spin rounded-full border-2 border-vo-purple border-t-transparent"
            aria-hidden
          />
        </div>
      )}
    </div>
  );
};

const HiredStageSwitch = ({ stage, onToggle, disabled, isUpdating, tStages }) => {
  const isOn = Boolean(stage.isHiredStage);
  const handleClick = () => {
    if (disabled || isUpdating) return;
    onToggle(stage, !isOn);
  };
  const handleKeyDown = (e) => {
    if (disabled || isUpdating) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    onToggle(stage, !isOn);
  };

  return (
    <div className="relative">
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-label={
          isOn
            ? tStages("switches.hiredActive", { name: stage.name })
            : tStages("switches.markHired", { name: stage.name })
        }
        disabled={disabled || isUpdating}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`relative inline-flex h-5 w-10 shrink-0 items-center rounded-full transition-[background-color,box-shadow,border-color,opacity] duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/35 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${
          isUpdating ? "opacity-60" : "opacity-100"
        } ${
          isOn
            ? "bg-blue-600 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18)]"
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
      {isUpdating && (
        <div className="absolute -right-6 top-1/2 -translate-y-1/2">
          <div
            className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
            aria-hidden
          />
        </div>
      )}
    </div>
  );
};

const renderStageItem = ({ item, handler, tStages }) => {
  return (
    <div className="flex w-full flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-4">
        <div
          {...handler}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-vo-purple/10 cursor-grab active:cursor-grabbing"
          aria-label={tStages("actions.dragAria")}
        >
          <GripVertical className="h-6 w-6 text-vo-purple" aria-hidden />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="font-sans text-base font-semibold text-foreground">
            {item.name}
          </h3>
          {item.description && (
            <p className="font-sans text-sm text-muted-foreground line-clamp-2">
              {item.description}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="font-sans text-[11px] font-normal leading-none tracking-wide text-muted-foreground/70">
            {tStages("fields.defaultStage")}
          </span>
          <DefaultStageSwitch
            stage={item}
            onActivate={item.onDefaultActivate}
            disabled={item.defaultSwitchDisabled}
            isUpdating={item.defaultSwitchUpdating}
            tStages={tStages}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="font-sans text-[11px] font-normal leading-none tracking-wide text-muted-foreground/70">
            {tStages("fields.finalStage")}
          </span>
          <FinalStageSwitch
            stage={item}
            onToggle={item.onFinalToggle}
            disabled={item.finalSwitchDisabled}
            isUpdating={item.finalSwitchUpdating}
            tStages={tStages}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="font-sans text-[11px] font-normal leading-none tracking-wide text-muted-foreground/70">
            {tStages("fields.hiredStage")}
          </span>
          <HiredStageSwitch
            stage={item}
            onToggle={item.onHiredToggle}
            disabled={item.hiredSwitchDisabled}
            isUpdating={item.hiredSwitchUpdating}
            tStages={tStages}
          />
        </div>
        <button
          type="button"
          onClick={() => item.onEdit(item)}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
          aria-label={tStages("aria.editStage", { name: item.name })}
        >
          <Pencil className="h-4 w-4" aria-hidden />
          {tStages("actions.edit")}
        </button>
        <button
          type="button"
          onClick={() => item.onDelete(item)}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-destructive/30 bg-background px-4 py-2.5 font-sans text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2"
          aria-label={tStages("aria.deleteStage", { name: item.name })}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          {tStages("actions.delete")}
        </button>
      </div>
    </div>
  );
};

export default function EtapasPage() {
  const tStages = useTranslations("AdminPortal.stages");
  const tCommon = useTranslations("Common");
  const stagesFetchGenerationRef = useRef(0);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [stageToDelete, setStageToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [reorderLoading, setReorderLoading] = useState(false);
  const [defaultStageSwitchLoading, setDefaultStageSwitchLoading] = useState(false);
  const [finalStageSwitchLoading, setFinalStageSwitchLoading] = useState(false);
  const [hiredStageSwitchLoading, setHiredStageSwitchLoading] = useState(false);
  const [updatingDefaultStageId, setUpdatingDefaultStageId] = useState(null);
  const [updatingFinalStageId, setUpdatingFinalStageId] = useState(null);
  const [updatingHiredStageId, setUpdatingHiredStageId] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    variant: "success",
    message: "",
  });

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const stagesLoadFailedMessage = tStages("errors.loadFailed");

  const fetchStages = useCallback(async () => {
    const generation = ++stagesFetchGenerationRef.current;
    setLoading(true);
    setFetchError(null);
    try {
      const data = await apiClient.get(stagesUrl());
      if (generation !== stagesFetchGenerationRef.current) return;
      const list = unwrapListArray(data);
      const mapped = list.map((item, i) => mapStageFromApi(item, i));
      setStages([...mapped].sort(sortStagesStable));
    } catch (err) {
      if (generation !== stagesFetchGenerationRef.current) return;
      setFetchError(
        getApiErrorMessage(err) || stagesLoadFailedMessage
      );
      setStages([]);
    } finally {
      if (generation === stagesFetchGenerationRef.current) {
        setLoading(false);
      }
    }
  }, [stagesLoadFailedMessage]);

  useEffect(() => {
    void fetchStages();
  }, [fetchStages]);

  const handleModalSubmit = async (wasCreating, createdStage) => {
    await fetchStages();
    
    // Si se creó una etapa, dejarla primera (orderIndex 1) y reenumerar el resto
    if (wasCreating && createdStage) {
      try {
        const data = await apiClient.get(stagesUrl());
        const list = unwrapListArray(data);
        const mappedStages = list.map((item, i) => mapStageFromApi(item, i));
        
        const createdId = String(createdStage?.id ?? createdStage?.uuid ?? "");
        const newStage = mappedStages.find((s) => String(s.id) === createdId);
        const others = mappedStages
          .filter((s) => String(s.id) !== createdId)
          .sort(sortStagesStable);

        const sortedStages = newStage
          ? [newStage, ...others]
          : [...mappedStages].sort(sortStagesStable);
        const reorderedStages = sortedStages.map((stage, index) => ({
          ...stage,
          orderIndex: index + 1,
        }));
        
        await persistStageOrdersSequential(reorderedStages);

        await fetchStages();
      } catch (err) {
        console.error("Error reordering stages:", err);
      }
    }

    setEditingStage(null);
    setSnackbar({
      open: true,
      variant: "success",
      message: wasCreating
        ? tStages("toasts.created")
        : tStages("toasts.updated"),
    });
  };

  const handleDefaultStageActivate = async (targetStage) => {
    if (defaultStageSwitchLoading) return;
    if (targetStage.isDefault) return;
    const stageId = String(targetStage.id);
    
    // Actualización optimista: actualizar el estado local inmediatamente
    setStages((prevStages) =>
      prevStages.map((s) =>
        String(s.id) === stageId
          ? { ...s, isDefault: true }
          : { ...s, isDefault: false }
      )
    );
    
    setUpdatingDefaultStageId(stageId);
    setDefaultStageSwitchLoading(true);

    try {
      const target =
        stages.find((s) => String(s.id) === stageId) ?? targetStage;
      
      await apiClient.put(
        stagesUrl(stageId),
        buildRecruiterStagePutPayload({ ...target, isDefault: true })
      );
      
      // Desactivar las demás etapas
      for (const s of stages) {
        if (String(s.id) === stageId) continue;
        await apiClient.put(
          stagesUrl(s.id),
          buildRecruiterStagePutPayload({ ...s, isDefault: false })
        );
      }

      // Pequeño delay para una transición más suave
      await new Promise((resolve) => setTimeout(resolve, 300));

      setSnackbar({
        open: true,
        variant: "success",
        message: tStages("toasts.defaultUpdated"),
      });
    } catch (err) {
      // Revertir el cambio optimista en caso de error
      // Intentar restaurar el estado anterior o refrescar desde el servidor
      await fetchStages();
      
      setSnackbar({
        open: true,
        variant: "error",
        message:
          getApiErrorMessage(err) || tStages("errors.defaultUpdateFailed"),
      });
    } finally {
      setUpdatingDefaultStageId(null);
      setDefaultStageSwitchLoading(false);
    }
  };

  const handleFinalStageToggle = async (targetStage, newValue) => {
    if (finalStageSwitchLoading) return;
    const stageId = String(targetStage.id);
    
    // Actualización optimista: actualizar el estado local inmediatamente
    setStages((prevStages) =>
      prevStages.map((s) =>
        String(s.id) === stageId ? { ...s, final: newValue } : s
      )
    );
    
    setUpdatingFinalStageId(stageId);
    setFinalStageSwitchLoading(true);

    try {
      const target =
        stages.find((s) => String(s.id) === stageId) ?? targetStage;
      
      await apiClient.put(
        stagesUrl(stageId),
        buildRecruiterStagePutPayload({ ...target, final: newValue })
      );

      // Pequeño delay para una transición más suave
      await new Promise((resolve) => setTimeout(resolve, 300));

      setSnackbar({
        open: true,
        variant: "success",
        message: newValue
          ? tStages("toasts.finalMarked")
          : tStages("toasts.finalUnmarked"),
      });
    } catch (err) {
      // Revertir el cambio optimista en caso de error
      setStages((prevStages) =>
        prevStages.map((s) =>
          String(s.id) === stageId ? { ...s, final: !newValue } : s
        )
      );
      
      setSnackbar({
        open: true,
        variant: "error",
        message:
          getApiErrorMessage(err) || tStages("errors.updateFailed"),
      });
    } finally {
      setUpdatingFinalStageId(null);
      setFinalStageSwitchLoading(false);
    }
  };

  const handleHiredStageToggle = async (targetStage, newValue) => {
    if (hiredStageSwitchLoading) return;
    const stageId = String(targetStage.id);
    
    // Actualización optimista: actualizar el estado local inmediatamente
    setStages((prevStages) =>
      prevStages.map((s) =>
        String(s.id) === stageId ? { ...s, isHiredStage: newValue } : s
      )
    );
    
    setUpdatingHiredStageId(stageId);
    setHiredStageSwitchLoading(true);

    try {
      // Usar el endpoint PATCH específico para isHiredStage
      const updatedStage = await apiClient.patch(
        `${stagesUrl(stageId)}/hired-stage`,
        { isHiredStage: newValue }
      );

      // Actualizar con la respuesta del backend
      setStages((prevStages) =>
        prevStages.map((s) =>
          String(s.id) === stageId ? mapStageFromApi(updatedStage) : s
        )
      );

      // Pequeño delay para una transición más suave
      await new Promise((resolve) => setTimeout(resolve, 300));

      setSnackbar({
        open: true,
        variant: "success",
        message: newValue
          ? tStages("toasts.hiredMarked")
          : tStages("toasts.hiredUnmarked"),
      });
    } catch (err) {
      // Revertir el cambio optimista en caso de error
      setStages((prevStages) =>
        prevStages.map((s) =>
          String(s.id) === stageId ? { ...s, isHiredStage: !newValue } : s
        )
      );
      
      // Manejar errores específicos
      let errorMessage = tStages("errors.hiredUpdateFailed");
      
      if (err?.status === 403 || err?.response?.status === 403) {
        errorMessage = tStages("errors.forbidden");
      } else if (err?.status === 404 || err?.response?.status === 404) {
        errorMessage = tStages("errors.notFound");
        setTimeout(() => fetchStages(), 1000);
      } else if (getApiErrorMessage(err)) {
        errorMessage = getApiErrorMessage(err);
      }
      
      setSnackbar({
        open: true,
        variant: "error",
        message: errorMessage,
      });
    } finally {
      setUpdatingHiredStageId(null);
      setHiredStageSwitchLoading(false);
    }
  };

  const handleEdit = (stage) => {
    setEditingStage(stage);
    setIsModalOpen(true);
  };

  const handleDelete = (stage) => {
    setStageToDelete(stage);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!stageToDelete) return;
    setDeleteLoading(true);
    try {
      await apiClient.delete(
        stagesUrl(stageToDelete.id)
      );
      setIsDeleteModalOpen(false);
      setStageToDelete(null);
      
      // After deleting, reorder all remaining stages
      try {
        const data = await apiClient.get(stagesUrl());
        const list = unwrapListArray(data);
        const mappedStages = list.map((item, i) => mapStageFromApi(item, i));
        
        // Sort by current order and reassign sequential order
        const sortedStages = [...mappedStages].sort(sortStagesStable);
        const reorderedStages = sortedStages.map((stage, index) => ({
          ...stage,
          orderIndex: index + 1,
        }));

        await persistStageOrdersSequential(reorderedStages);

        // Refresh the list
        await fetchStages();
      } catch (err) {
        console.error("Error reordering stages after delete:", err);
        // Still refresh even if reorder fails
        await fetchStages();
      }

      setSnackbar({
        open: true,
        variant: "success",
        message: tStages("toasts.deleted"),
      });
    } catch (err) {
      setSnackbar({
        open: true,
        variant: "error",
        message:
          getApiErrorMessage(err) || tStages("errors.deleteFailed"),
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCloseDeleteModal = () => {
    if (!deleteLoading) {
      setIsDeleteModalOpen(false);
      setStageToDelete(null);
    }
  };

  const handleNewStage = () => {
    setEditingStage(null);
    setIsModalOpen(true);
  };

  const handleReorder = async ({ items }) => {
    if (reorderLoading) return;

    if (items.length !== stages.length) {
      setSnackbar({
        open: true,
        variant: "warning",
        message: tStages("errors.reorderFailed"),
      });
      await fetchStages();
      return;
    }

    const updatedStages = items.map((item, index) => ({
      ...item,
      orderIndex: index + 1,
    }));

    setStages(updatedStages);
    setReorderLoading(true);

    try {
      await persistStageOrdersSequential(updatedStages);
      setSnackbar({
        open: true,
        variant: "success",
        message: tStages("toasts.orderSaved"),
      });
    } catch (err) {
      setSnackbar({
        open: true,
        variant: "error",
        message:
          getApiErrorMessage(err) || tStages("errors.reorderFailed"),
      });
      await fetchStages();
    } finally {
      setReorderLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStage(null);
  };

  const sortedStages = [...stages].sort(sortStagesStable);

  const nestableItems = sortedStages.map((stage) => ({
    ...stage,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onDefaultActivate: handleDefaultStageActivate,
    onFinalToggle: handleFinalStageToggle,
    onHiredToggle: handleHiredStageToggle,
    defaultSwitchDisabled: reorderLoading || deleteLoading,
    defaultSwitchUpdating: updatingDefaultStageId === String(stage.id),
    finalSwitchDisabled: reorderLoading || deleteLoading,
    finalSwitchUpdating: updatingFinalStageId === String(stage.id),
    hiredSwitchDisabled: reorderLoading || deleteLoading,
    hiredSwitchUpdating: updatingHiredStageId === String(stage.id),
  }));

  return (
    <>
      <AdminPageFrame>
              <PortalPageHeader
                  title={tStages("page.title")}
                  description={tStages("page.description")}
                  layout="split"
                  actions={
                    <>
                      <Button
                        type="button"
                        variant="primary"
                        onClick={handleNewStage}
                        disabled={false}
                        aria-label={tStages("actions.newStageAria")}
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                        {tStages("actions.newStage")}
                      </Button>
                    </>
                  }
                />
                {reorderLoading ? (
                  <AdminSummaryBar ariaLabel={tStages("loadingStates.savingOrder")}>
                    <div className="flex items-center gap-2 text-vo-purple">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-vo-purple border-t-transparent" aria-hidden />
                      <span className="font-sans text-sm font-medium">
                        {tStages("loadingStates.savingOrder")}
                      </span>
                    </div>
                  </AdminSummaryBar>
                ) : null}
                {loading ? (
                    <AdminSurface>
                      <AdminLoadingState label={tStages("loadingStates.loading")} />
                    </AdminSurface>
                  ) : fetchError ? (
                    <AdminErrorPanel
                      message={fetchError}
                      onRetry={fetchStages}
                      retryLabel={tStages("actions.retry")}
                    />
                  ) : sortedStages.length === 0 ? (
                    <AdminSurface>
                      <AdminEmptyState
                        icon={ListOrdered}
                        title={tStages("emptyStates.notFound")}
                        action={
                          <Button type="button" variant="primary" onClick={handleNewStage}>
                            <Plus className="h-4 w-4" aria-hidden />
                            {tStages("actions.createStage")}
                          </Button>
                        }
                      />
                    </AdminSurface>
                  ) : (
                    <div
                      className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm"
                      role="region"
                      aria-label={tStages("page.listAria")}
                    >
                    <Nestable
                      items={nestableItems}
                      renderItem={(props) => renderStageItem({ ...props, tStages })}
                      onChange={handleReorder}
                      maxDepth={1}
                    />
                    </div>
                  )}
      </AdminPageFrame>

      <EtapaModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleModalSubmit}
        editingStage={editingStage}
        setAsDefaultOnCreate={!editingStage && stages.length === 0}
        onSnackbar={(message, variant = "success") =>
          setSnackbar({ open: true, message, variant })
        }
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title={tStages("deleteConfirm.title")}
        message={
          stageToDelete
            ? tStages("deleteConfirm.message", { name: stageToDelete.name })
            : ""
        }
        confirmText={tStages("actions.accept")}
        cancelText={tCommon("cancel")}
        loading={deleteLoading}
      />

      <Snackbar
        open={snackbar.open}
        onClose={handleCloseSnackbar}
        variant={snackbar.variant}
        message={snackbar.message}
      />
    </>
  );
}
