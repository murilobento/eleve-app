"use client";

import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DetailField = {
  label: string;
  value: ReactNode;
  fullWidth?: boolean;
};

type DetailSection = {
  title: string;
  description?: string;
  fields: DetailField[];
};

type EntityDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  subtitle?: ReactNode;
  badges?: ReactNode[];
  sections: DetailSection[];
  footer?: ReactNode;
};

export function EntityDetailsDialog({
  open,
  onOpenChange,
  title,
  description,
  subtitle,
  badges = [],
  sections,
  footer,
}: EntityDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-hidden p-0 sm:max-w-5xl">
        <div className="border-b bg-gradient-to-r from-muted/70 via-background to-background px-5 py-4">
          <DialogHeader className="gap-2 text-left">
            <div className="flex flex-col gap-3 pr-8 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-1">
                <DialogTitle className="truncate text-xl tracking-tight">{title}</DialogTitle>
                {subtitle ? <div className="truncate text-sm text-muted-foreground">{subtitle}</div> : null}
                {description ? <DialogDescription className="hidden lg:block">{description}</DialogDescription> : null}
              </div>
              {badges.length ? (
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {badges.map((badge, index) => (
                    <div key={index}>{badge}</div>
                  ))}
                </div>
              ) : null}
            </div>
          </DialogHeader>
        </div>

        <div className="max-h-[calc(88vh-132px)] overflow-y-auto p-5">
          <div className="grid gap-3 lg:grid-cols-2">
          {sections.map((section) => (
            <Card key={section.title} className="gap-0 py-0">
              <CardHeader className="border-b px-4 py-3">
                <CardTitle className="text-sm">{section.title}</CardTitle>
                {section.description ? <CardDescription className="text-xs">{section.description}</CardDescription> : null}
              </CardHeader>
              <CardContent className="px-4 py-3">
                <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
                  {section.fields.map((field) => (
                    <div
                      key={`${section.title}-${field.label}`}
                      className={cn("space-y-1", field.fullWidth ? "md:col-span-2" : undefined)}
                    >
                      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {field.label}
                      </div>
                      <div className="break-words text-sm leading-5">{field.value}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        </div>

        {footer ? <div className="border-t px-5 py-3">{footer}</div> : null}
      </DialogContent>
    </Dialog>
  );
}
