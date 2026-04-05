"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/provider";

type StatusTransitionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: (reason?: string) => Promise<void>;
  isLoading?: boolean;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: React.ComponentProps<typeof Button>["variant"];
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
};

export function StatusTransitionDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  isLoading = false,
  confirmLabel,
  cancelLabel,
  confirmVariant = "default",
  requireReason = false,
  reasonLabel,
  reasonPlaceholder,
}: StatusTransitionDialogProps) {
  const { t } = useI18n();
  const [reason, setReason] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (!open) {
      setReason("");
    }
  }, [open]);

  async function handleConfirm() {
    setIsConfirming(true);

    try {
      await onConfirm(reason.trim() || undefined);
      onOpenChange(false);
    } catch {
      return;
    } finally {
      setIsConfirming(false);
    }
  }

  const disabled = isLoading || isConfirming;
  const isReasonInvalid = requireReason && reason.trim().length < 3;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {requireReason ? (
          <div className="space-y-2">
            <Label htmlFor="status-transition-reason">{reasonLabel ?? t("common.reason")}</Label>
            <Textarea
              id="status-transition-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={reasonPlaceholder ?? t("common.reasonPlaceholder")}
              rows={4}
              disabled={disabled}
            />
          </div>
        ) : null}

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
            disabled={disabled || isReasonInvalid}
          >
            {disabled ? t("common.loading") : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
