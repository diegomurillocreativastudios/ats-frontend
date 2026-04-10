"use client"

import { useEffect, useCallback, type ReactNode, type MouseEvent } from "react"
import { X } from "lucide-react"

const MODAL_STYLES = {
  overlay:
    "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4",
  getContent: (sizeClass: string) =>
    `relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl bg-white shadow-xl ${sizeClass}`,
  header: "shrink-0 flex items-center justify-between border-b border-border px-6 py-4",
  body: "min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 py-5",
  footer:
    "shrink-0 flex items-center justify-end gap-3 border-t border-border px-6 py-4",
};

const SIZE_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  size?: keyof typeof SIZE_CLASSES
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  closeOnOverlayClick = true,
  closeOnEscape = true,
}: ModalProps) {
  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.md
  const handleEscape = useCallback(
    (e: Event) => {
      if (!closeOnEscape || !(e instanceof KeyboardEvent) || e.key !== "Escape") return
      onClose?.()
    },
    [closeOnEscape, onClose]
  )

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose?.()
    }
  }

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <div
      className={MODAL_STYLES.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={handleOverlayClick}
    >
      <div
        className={MODAL_STYLES.getContent(sizeClass)}
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <header className={MODAL_STYLES.header}>
          <h2
            id="modal-title"
            className="font-inter text-lg font-semibold text-foreground"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>
        <div className={MODAL_STYLES.body}>{children}</div>
        {footer && <footer className={MODAL_STYLES.footer}>{footer}</footer>}
      </div>
    </div>
  );
}
