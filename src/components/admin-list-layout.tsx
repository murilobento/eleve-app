"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
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

export function AdminListToolbar({ children, className }: AdminListToolbarProps) {
  return (
    <div className={cn("rounded-xl border bg-card/40 p-3", className)}>
      <div className="flex flex-wrap items-end gap-3">{children}</div>
    </div>
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
