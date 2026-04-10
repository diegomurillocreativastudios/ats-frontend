"use client";

import { useState } from "react";
import { Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/api";

/**
 * A specialized button to trigger a vacancy rematch.
 * Shows a prominent alert state if needsRematch is true.
 */
export default function RematchButton({
  vacancyId,
  needsRematch,
  onSuccess,
  onSnackbar,
  variant = "default",
}) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [errorMessage, setErrorMessage] = useState("");

  const handleRematch = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    setLoading(true);
    setStatus("loading");
    setErrorMessage("");

    try {
      await apiClient.request(`/api/recruiter/vacancies/${vacancyId}/rematch`, {
        method: "POST",
      });
      if (onSnackbar) {
        onSnackbar("Match reajustado correctamente.", "success");
      } else {
        setStatus("success");
        setTimeout(() => setStatus("idle"), 3000);
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Rematch failed:", err);
      const msg = err?.message || "Error al re-ajustar match";
      if (onSnackbar) {
        onSnackbar(msg, "error");
      } else {
        setStatus("error");
        setErrorMessage(msg);
        setTimeout(() => setStatus("idle"), 5000);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!needsRematch && status === "idle") {
    return null;
  }

  const isListVariant = variant === "list";

  if (!onSnackbar && status === "success") {
    return (
      <div className="flex items-center gap-2 text-green-600 font-inter text-sm animate-in fade-in duration-300">
        <CheckCircle2 className="h-4 w-4" />
        <span>¡Éxito!</span>
      </div>
    );
  }

  if (!onSnackbar && status === "error") {
    return (
      <div className="flex items-center gap-2 text-destructive font-inter text-xs animate-in fade-in duration-300 max-w-[150px]">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span className="truncate" title={errorMessage}>
          {errorMessage || "Error"}
        </span>
      </div>
    );
  }

  const baseClasses = "inline-flex items-center justify-center gap-2 rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  // Highlighting style if needsRematch is true
  const activeStyle = needsRematch
    ? "bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 focus:ring-amber-500"
    : "bg-background text-foreground border border-border hover:bg-muted focus:ring-vo-purple";

  const listClasses = `${baseClasses} px-4 py-2 text-[13px] font-medium ${activeStyle}`;
  const detailClasses = `${baseClasses} px-6 py-3 text-sm font-medium ${activeStyle}`;

  return (
    <button
      type="button"
      onClick={handleRematch}
      disabled={loading}
      className={isListVariant ? listClasses : detailClasses}
      aria-label="Re-ajustar matches"
      title={needsRematch ? "Requisitos actualizados. Se recomienda re-ajustar matches." : "Re-ajustar matches"}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className={`h-4 w-4 ${needsRematch ? "animate-pulse text-amber-600" : "text-vo-purple"}`} />
      )}
      <span>{loading ? "Ajustando..." : isListVariant && !needsRematch ? "Rematch" : "Re-ajustar match"}</span>
      {needsRematch && !isListVariant && (
        <span className="ml-1 inline-flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
      )}
    </button>
  );
}
