"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
} from "lucide-react";

const TRANSITION_MS = 280;

const VARIANT_CONFIG = {
  success: {
    container:
      "border-success/50 bg-success shadow-2xl ring-1 ring-white/25",
    icon: CheckCircle2,
    iconClass: "text-success-foreground shrink-0 drop-shadow-sm",
    textClass: "text-success-foreground",
    closeClass:
      "text-success-foreground/90 hover:bg-white/20 hover:text-success-foreground focus:ring-white focus:ring-offset-2 focus:ring-offset-success",
    role: "status",
    ariaLive: "polite",
  },
  error: {
    container:
      "border-destructive/90 bg-destructive shadow-2xl ring-1 ring-white/20",
    icon: AlertCircle,
    iconClass: "text-destructive-foreground shrink-0 drop-shadow-sm",
    textClass: "text-destructive-foreground",
    closeClass:
      "text-destructive-foreground/90 hover:bg-white/15 hover:text-destructive-foreground focus:ring-white focus:ring-offset-2 focus:ring-offset-destructive",
    role: "alert",
    ariaLive: "assertive",
  },
  warning: {
    container:
      "border-amber-700/40 bg-amber-500 shadow-2xl ring-1 ring-amber-300/50",
    icon: AlertTriangle,
    iconClass: "text-white shrink-0 drop-shadow-sm",
    textClass: "text-white",
    closeClass:
      "text-white/90 hover:bg-white/20 hover:text-white focus:ring-white focus:ring-offset-2 focus:ring-offset-amber-500",
    role: "alert",
    ariaLive: "assertive",
  },
  info: {
    container:
      "border-blue-800/40 bg-blue-600 shadow-2xl ring-1 ring-blue-400/40",
    icon: Info,
    iconClass: "text-white shrink-0 drop-shadow-sm",
    textClass: "text-white",
    closeClass:
      "text-white/90 hover:bg-white/20 hover:text-white focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600",
    role: "status",
    ariaLive: "polite",
  },
};

/**
 * Toast-style snackbar fijo (inferior izquierda). Variantes: success, error, warning, info.
 */
const Snackbar = ({
  open,
  onClose,
  variant = "info",
  message,
  duration = 5000,
  autoHide = true,
}) => {
  const [mounted, setMounted] = useState(false);
  const [displayed, setDisplayed] = useState(false);
  const [entered, setEntered] = useState(false);
  const [snapshot, setSnapshot] = useState({
    message: "",
    variant: "info",
  });
  const closeTimerRef = useRef(null);
  const autoHideTimerRef = useRef(null);
  const closingFromUiRef = useRef(false);

  const config = VARIANT_CONFIG[snapshot.variant] ?? VARIANT_CONFIG.info;
  const Icon = config.icon;

  useEffect(() => {
    setMounted(true);
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const clearAutoHideTimer = useCallback(() => {
    if (autoHideTimerRef.current != null) {
      window.clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    clearAutoHideTimer();
    if (closingFromUiRef.current) return;
    closingFromUiRef.current = true;
    setEntered(false);
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setDisplayed(false);
      onClose?.();
      closingFromUiRef.current = false;
    }, TRANSITION_MS);
  }, [onClose, clearAutoHideTimer, clearCloseTimer]);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    }
  };

  /* Abrir: snapshot + montar + animar entrada */
  useEffect(() => {
    if (!mounted) return undefined;
    if (!open || !message) return undefined;

    clearCloseTimer();
    closingFromUiRef.current = false;
    setSnapshot({ message, variant });
    setDisplayed(true);
    setEntered(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
    return () => cancelAnimationFrame(id);
  }, [open, message, variant, mounted, clearCloseTimer]);

  /* Cierre solo desde el padre (open / message cortados sin pasar por handleClose) */
  useEffect(() => {
    if (!mounted || !displayed) return undefined;
    if (open && message) return undefined;
    if (closingFromUiRef.current) return undefined;

    setEntered(false);
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setDisplayed(false);
    }, TRANSITION_MS);
    return () => {
      clearCloseTimer();
    };
  }, [open, message, mounted, displayed, clearCloseTimer]);

  /* Auto-ocultar */
  useEffect(() => {
    if (!open || !autoHide || duration <= 0 || !message) return undefined;
    clearAutoHideTimer();
    autoHideTimerRef.current = window.setTimeout(() => {
      autoHideTimerRef.current = null;
      handleClose();
    }, duration);
    return () => clearAutoHideTimer();
  }, [open, autoHide, duration, message, handleClose, clearAutoHideTimer]);

  useEffect(() => {
    return () => {
      clearCloseTimer();
      clearAutoHideTimer();
    };
  }, [clearCloseTimer, clearAutoHideTimer]);

  if (!mounted || !displayed || !snapshot.message) return null;

  const root = typeof document !== "undefined" ? document.body : null;
  if (!root) return null;

  return createPortal(
    <div className="pointer-events-none fixed bottom-0 left-0 z-9999 isolate flex justify-start p-4 sm:p-6">
      <div
        role={config.role}
        aria-live={config.ariaLive}
        className={`pointer-events-auto flex max-w-md origin-bottom-left items-start gap-3 rounded-xl border px-4 py-3 font-inter text-sm transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none sm:max-w-lg ${config.container} ${
          entered
            ? "translate-y-0 opacity-100"
            : "translate-y-2 opacity-0 motion-reduce:translate-y-0"
        }`}
      >
        <Icon className={`mt-0.5 h-5 w-5 ${config.iconClass}`} aria-hidden />
        <p className={`min-w-0 flex-1 leading-snug ${config.textClass}`}>
          {snapshot.message}
        </p>
        <button
          type="button"
          onClick={handleClose}
          onKeyDown={handleKeyDown}
          className={`shrink-0 rounded-md p-1 transition-colors focus:outline-none focus:ring-2 ${config.closeClass}`}
          aria-label="Cerrar notificación"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>,
    root
  );
};

export default Snackbar;
