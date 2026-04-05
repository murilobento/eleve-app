"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/i18n/provider";

type ConfirmDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: React.ComponentProps<typeof Button>["variant"];
};

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  description,
  onConfirm,
  isLoading = false,
  title,
  confirmLabel,
  cancelLabel,
  confirmVariant = "destructive",
}: ConfirmDeleteDialogProps) {
  const { t } = useI18n();
  const [isConfirming, setIsConfirming] = useState(false);

  async function handleConfirm() {
    setIsConfirming(true);

    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      return;
    } finally {
      setIsConfirming(false);
    }
  }

  const disabled = isLoading || isConfirming;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title ?? t("common.confirmDeleteTitle")}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={() => onOpenChange(false)}
            disabled={disabled}
          >
            {cancelLabel ?? t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            className="cursor-pointer"
            onClick={() => void handleConfirm()}
            disabled={disabled}
          >
            {disabled ? t("common.loading") : confirmLabel ?? t("common.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
