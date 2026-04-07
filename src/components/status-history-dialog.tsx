"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n, useLocale } from "@/i18n/provider";
import { getSemanticStatusBadgeClass } from "@/lib/status-badge";

type HistoryItem = {
  id: string;
  previousStatus: string | null;
  nextStatus: string;
  reason: string | null;
  actorNameSnapshot: string | null;
  actorEmailSnapshot: string | null;
  createdAt: string;
};

type StatusHistoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  entries: HistoryItem[];
  isLoading?: boolean;
  emptyMessage: string;
  getStatusLabel: (status: string) => string;
};

export function StatusHistoryDialog({
  open,
  onOpenChange,
  title,
  description,
  entries,
  isLoading = false,
  emptyMessage,
  getStatusLabel,
}: StatusHistoryDialogProps) {
  const { t } = useI18n();
  const locale = useLocale();

  const formatDateTime = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));

  const getActorLabel = (entry: HistoryItem) =>
    entry.actorNameSnapshot || entry.actorEmailSnapshot || t("common.system");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-3">
            {isLoading ? (
              <div className="rounded-lg border px-4 py-6 text-sm text-muted-foreground">
                {t("common.loading")}
              </div>
            ) : entries.length === 0 ? (
              <div className="rounded-lg border px-4 py-6 text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              entries.map((entry) => (
                <div key={entry.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {entry.previousStatus ? (
                      <Badge variant="outline" className={getSemanticStatusBadgeClass(entry.previousStatus)}>
                        {getStatusLabel(entry.previousStatus)}
                      </Badge>
                    ) : (
                      <Badge variant="outline">{t("common.created")}</Badge>
                    )}
                    <span className="text-sm text-muted-foreground">→</span>
                    <Badge className={getSemanticStatusBadgeClass(entry.nextStatus)}>{getStatusLabel(entry.nextStatus)}</Badge>
                  </div>
                  <div className="mt-2 text-sm">
                    <div className="font-medium">{getActorLabel(entry)}</div>
                    <div className="text-muted-foreground">{formatDateTime(entry.createdAt)}</div>
                  </div>
                  {entry.reason ? (
                    <div className="mt-3 rounded-md bg-muted px-3 py-2 text-sm">
                      <span className="font-medium">{t("common.reason")}:</span> {entry.reason}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
