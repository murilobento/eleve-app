"use client";

import type { ReactNode } from "react";
import { Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type AdminListToolbarProps = {
  children: ReactNode;
  className?: string;
};

type AdminListTableCardProps = {
  children: ReactNode;
  className?: string;
};

type AdminListPaginationFooterProps = {
  countLabel: ReactNode;
  previousLabel: string;
  nextLabel: string;
  onPreviousPage: () => void;
  onNextPage: () => void;
  canPreviousPage: boolean;
  canNextPage: boolean;
  className?: string;
};

type AdminFiltersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  activeCount?: number;
  triggerLabel: string;
  clearLabel: string;
  cancelLabel: string;
  applyLabel: string;
  onClear: () => void;
  onApply: () => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
};

type AdminFiltersSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function AdminListToolbar({ children, className }: AdminListToolbarProps) {
  return (
    <div className={cn("rounded-xl border bg-card/40 p-3", className)}>
      <div className="flex flex-wrap items-end gap-3 [&>.ml-auto]:ml-0 [&>.ml-auto]:basis-full [&>.ml-auto]:w-full [&>.ml-auto]:flex-col [&>.ml-auto]:items-stretch [&>.ml-auto]:gap-2 [&>.ml-auto>*]:w-full [&>.ml-auto_[data-slot=button]]:w-full [&>.ml-auto_a]:w-full sm:[&>.ml-auto]:ml-auto sm:[&>.ml-auto]:basis-auto sm:[&>.ml-auto]:w-auto sm:[&>.ml-auto]:flex-row sm:[&>.ml-auto]:items-center sm:[&>.ml-auto>*]:w-auto sm:[&>.ml-auto_[data-slot=button]]:w-auto sm:[&>.ml-auto_a]:w-auto">
        {children}
      </div>
    </div>
  );
}

export function AdminFiltersDialog({
  open,
  onOpenChange,
  title,
  description,
  activeCount = 0,
  triggerLabel,
  clearLabel,
  cancelLabel,
  applyLabel,
  onClear,
  onApply,
  children,
  disabled = false,
  className,
}: AdminFiltersDialogProps) {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-10 cursor-pointer rounded-lg"
        onClick={() => onOpenChange(true)}
        disabled={disabled}
      >
        <Filter className="mr-2 size-4" />
        {triggerLabel}
        {activeCount > 0 ? (
          <Badge variant="secondary" className="ml-2 min-w-5 px-1.5 text-xs">
            {activeCount}
          </Badge>
        ) : null}
      </Button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn("max-h-[90svh] overflow-y-auto p-0 sm:max-w-2xl", className)}>
          <DialogHeader className="border-b px-6 py-5">
            <div className="flex items-start justify-between gap-3 pr-8">
              <div className="space-y-1">
                <DialogTitle>{title}</DialogTitle>
                {description ? <DialogDescription>{description}</DialogDescription> : null}
              </div>
              {activeCount > 0 ? (
                <Badge variant="secondary" className="shrink-0">
                  {activeCount}
                </Badge>
              ) : null}
            </div>
          </DialogHeader>

          <div className="space-y-4 px-6 py-5">{children}</div>

          <DialogFooter className="border-t px-6 py-4 sm:justify-between">
            <Button type="button" variant="ghost" className="cursor-pointer" onClick={onClear}>
              {clearLabel}
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" className="cursor-pointer" onClick={() => onOpenChange(false)}>
                {cancelLabel}
              </Button>
              <Button type="button" className="cursor-pointer" onClick={onApply}>
                {applyLabel}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AdminFiltersSection({
  title,
  description,
  children,
  className,
}: AdminFiltersSectionProps) {
  return (
    <section className={cn("rounded-xl border bg-muted/20 p-4", className)}>
      <div className="mb-4 space-y-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function AdminListTableCard({ children, className }: AdminListTableCardProps) {
  return <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>{children}</div>;
}

export function AdminListPaginationFooter({
  countLabel,
  previousLabel,
  nextLabel,
  onPreviousPage,
  onNextPage,
  canPreviousPage,
  canNextPage,
  className,
}: AdminListPaginationFooterProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card/40 p-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="text-sm text-muted-foreground">{countLabel}</div>
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer"
          onClick={onPreviousPage}
          disabled={!canPreviousPage}
        >
          {previousLabel}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer"
          onClick={onNextPage}
          disabled={!canNextPage}
        >
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}
