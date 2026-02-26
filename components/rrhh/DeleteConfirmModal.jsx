"use client";

import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Eliminar",
  cancelText = "Cancelar",
  loading = false,
}) {
  const handleConfirm = () => {
    onConfirm?.();
  };

  const footer = (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={onClose}
        disabled={loading}
        aria-label={cancelText}
      >
        {cancelText}
      </Button>
      <Button
        type="button"
        onClick={handleConfirm}
        disabled={loading}
        loading={loading}
        className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive"
        aria-label={confirmText}
      >
        {confirmText}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={footer}
      size="sm"
      closeOnOverlayClick={!loading}
      closeOnEscape={!loading}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden />
          </div>
          <p className="flex-1 font-inter text-sm text-foreground">
            {message}
          </p>
        </div>
      </div>
    </Modal>
  );
}
