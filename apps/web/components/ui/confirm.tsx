"use client";

import { Button } from "./button";
import { Dialog, DialogActions } from "./dialog";

interface ConfirmProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Delete", loading, onConfirm, onClose }: ConfirmProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <p className="text-sm text-text-2">{message}</p>
      <DialogActions>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
