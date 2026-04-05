"use client";

import { useMemo, useState } from "react";
import { addDays, endOfDay, endOfMonth, startOfDay, startOfMonth, subDays, subMonths } from "date-fns";
import { CalendarDays, CheckCircle2, Clock3, EllipsisVertical, Pencil, Play, RotateCcw, Search, XCircle } from "lucide-react";

import { ServiceOrderFormDialog } from "./service-order-form-dialog";
import {
  AdminListPaginationFooter,
  AdminListTableCard,
  AdminListToolbar,
} from "@/components/admin-list-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { StatusHistoryDialog } from "@/components/status-history-dialog";
import { StatusTransitionDialog } from "@/components/status-transition-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ManagedBudget } from "@/lib/budgets-admin";
import type { ManagedClient } from "@/lib/clients-admin";
import type { EquipmentOption } from "@/lib/equipment-admin";
import type { ManagedOperator } from "@/lib/operators-admin";
import type {
  CreateServiceOrderInput,
  ManagedServiceOrder,
  ManagedServiceOrderStatusHistory,
  UpdateServiceOrderInput,
} from "@/lib/service-orders-admin";
import type { ManagedServiceType } from "@/lib/service-types-admin";
import { useI18n, useLocale } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type DataTableProps = {
  serviceOrders: ManagedServiceOrder[];
  clients: ManagedClient[];
  equipment: EquipmentOption[];
  serviceTypes: ManagedServiceType[];
  operators: ManagedOperator[];
  approvedBudgets: ManagedBudget[];
  onCreateServiceOrder: (values: CreateServiceOrderInput) => Promise<void>;
  onUpdateServiceOrder: (id: string, values: UpdateServiceOrderInput) => Promise<void>;
  onChangeStatus: (id: string, status: "pending" | "scheduled" | "in_progress" | "completed" | "cancelled", reason?: string) => Promise<void>;
  isMutating: boolean;
};

type PendingStatusAction =
  | { serviceOrder: ManagedServiceOrder; status: "pending" | "scheduled" | "in_progress" | "completed" | "cancelled" }
  | null;

type DateFilterPreset = "all" | "today" | "yesterday" | "tomorrow" | "thisMonth" | "lastMonth" | "custom";

type DateFilterValue = {
  preset: DateFilterPreset;
  from?: Date;
  to?: Date;
};

type ResolvedDateRange =
  | {
    from?: Date;
    to?: Date;
  }
  | null;

type DateFilterControlProps = {
  idPrefix: string;
  label: string;
  locale: string;
  value: DateFilterValue;
  onPresetChange: (preset: DateFilterPreset) => void;
  onRangeChange: (nextRange: Pick<DateFilterValue, "from" | "to">) => void;
  t: ReturnType<typeof useI18n>["t"];
};

type DatePickerFieldProps = {
  id: string;
  label: string;
  locale: string;
  value?: Date;
  onSelect: (value?: Date) => void;
  placeholder: string;
};

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function formatCalendarDate(value: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(value);
}

function formatCompactCalendarDate(value: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
  }).format(value);
}

function formatDate(value: string, locale: string) {
  return formatCalendarDate(parseDateOnly(value), locale);
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function normalizeCustomDateRange(from?: Date, to?: Date) {
  if (from && to && from > to) {
    return {
      from: to,
      to: from,
    };
  }

  return { from, to };
}

function buildPresetDateRange(preset: Exclude<DateFilterPreset, "all" | "custom">): ResolvedDateRange {
  const now = new Date();

  switch (preset) {
    case "today":
      return {
        from: startOfDay(now),
        to: endOfDay(now),
      };
    case "yesterday": {
      const yesterday = subDays(now, 1);
      return {
        from: startOfDay(yesterday),
        to: endOfDay(yesterday),
      };
    }
    case "tomorrow": {
      const tomorrow = addDays(now, 1);
      return {
        from: startOfDay(tomorrow),
        to: endOfDay(tomorrow),
      };
    }
    case "thisMonth":
      return {
        from: startOfMonth(now),
        to: endOfMonth(now),
      };
    case "lastMonth": {
      const previousMonth = subMonths(now, 1);
      return {
        from: startOfMonth(previousMonth),
        to: endOfMonth(previousMonth),
      };
    }
    default:
      return null;
  }
}

function resolveDateFilterRange(filter: DateFilterValue): ResolvedDateRange {
  if (filter.preset === "all") {
    return null;
  }

  if (filter.preset === "custom") {
    const { from, to } = normalizeCustomDateRange(filter.from, filter.to);

    if (!from && !to) {
      return null;
    }

    return {
      from: from ? startOfDay(from) : undefined,
      to: to ? endOfDay(to) : undefined,
    };
  }

  return buildPresetDateRange(filter.preset);
}

function isDateInRange(value: Date, range: ResolvedDateRange) {
  if (!range) {
    return true;
  }

  if (range.from && value < range.from) {
    return false;
  }

  if (range.to && value > range.to) {
    return false;
  }

  return true;
}

function matchesCreatedDateFilter(serviceOrder: ManagedServiceOrder, range: ResolvedDateRange) {
  return isDateInRange(new Date(serviceOrder.createdAt), range);
}

function matchesServiceDateFilter(serviceOrder: ManagedServiceOrder, range: ResolvedDateRange) {
  if (!range) {
    return true;
  }

  return serviceOrder.items.some((item) => isDateInRange(parseDateOnly(item.serviceDate), range));
}

function DatePickerField({
  id,
  label,
  locale,
  value,
  onSelect,
  placeholder,
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className={cn(
              "h-10 w-full justify-start rounded-lg text-left font-normal",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarDays className="mr-2 size-4" />
            {value ? formatCompactCalendarDate(value, locale) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(nextDate) => {
              onSelect(nextDate);
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function DateFilterControl({
  idPrefix,
  label,
  locale,
  value,
  onPresetChange,
  onRangeChange,
  t,
}: DateFilterControlProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<Pick<DateFilterValue, "from" | "to">>({
    from: value.from,
    to: value.to,
  });
  const hasCustomRange = Boolean(value.from || value.to);
  const customSelectValue = value.preset === "custom" && hasCustomRange ? "customApplied" : value.preset;
  const customRangeLabel = hasCustomRange
    ? `${t("serviceOrders.customRange")} • ${value.from ? formatCompactCalendarDate(value.from, locale) : "..."}` +
      ` - ${value.to ? formatCompactCalendarDate(value.to, locale) : "..."}`
    : t("serviceOrders.customRange");

  const openCustomRangeDialog = () => {
    const normalizedRange = normalizeCustomDateRange(value.from, value.to);
    setDraftRange(normalizedRange);
    setDialogOpen(true);
  };

  const handleApplyCustomRange = () => {
    const normalizedRange = normalizeCustomDateRange(draftRange.from, draftRange.to);

    if (!normalizedRange.from && !normalizedRange.to) {
      onPresetChange("all");
    } else {
      onRangeChange(normalizedRange);
    }

    setDialogOpen(false);
  };

  return (
    <div className="w-full min-w-[260px] space-y-2 sm:w-auto">
      <Label htmlFor={`${idPrefix}-preset`} className="text-sm font-medium">
        {label}
      </Label>
      <Select
        value={customSelectValue}
        onValueChange={(nextValue) => {
          if (nextValue === "custom") {
            openCustomRangeDialog();
            return;
          }

          if (nextValue === "customApplied") {
            return;
          }

          onPresetChange(nextValue as DateFilterPreset);
        }}
      >
        <SelectTrigger className="h-10 w-full cursor-pointer rounded-lg" id={`${idPrefix}-preset`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("serviceOrders.allDates")}</SelectItem>
          <SelectItem value="today">{t("serviceOrders.today")}</SelectItem>
          <SelectItem value="yesterday">{t("serviceOrders.yesterday")}</SelectItem>
          <SelectItem value="tomorrow">{t("serviceOrders.tomorrow")}</SelectItem>
          <SelectItem value="thisMonth">{t("serviceOrders.thisMonth")}</SelectItem>
          <SelectItem value="lastMonth">{t("serviceOrders.previousMonth")}</SelectItem>
          {hasCustomRange ? (
            <SelectItem value="customApplied" disabled>
              {customRangeLabel}
            </SelectItem>
          ) : null}
          <SelectItem value="custom">{t("serviceOrders.customRange")}</SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{`${label} • ${t("serviceOrders.customRange")}`}</DialogTitle>
            <DialogDescription>{t("serviceOrders.customRangeDescription")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 md:grid-cols-2">
            <DatePickerField
              id={`${idPrefix}-from`}
              label={t("serviceOrders.fromDate")}
              locale={locale}
              value={draftRange.from}
              onSelect={(from) => setDraftRange((current) => ({ ...current, from }))}
              placeholder={t("serviceOrders.selectDate")}
            />
            <DatePickerField
              id={`${idPrefix}-to`}
              label={t("serviceOrders.toDate")}
              locale={locale}
              value={draftRange.to}
              onSelect={(to) => setDraftRange((current) => ({ ...current, to }))}
              placeholder={t("serviceOrders.selectDate")}
            />
          </div>

          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="cursor-pointer"
              onClick={() => setDraftRange({ from: undefined, to: undefined })}
            >
              {t("serviceOrders.clearDateRange")}
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => setDialogOpen(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                className="cursor-pointer"
                onClick={handleApplyCustomRange}
              >
                {t("serviceOrders.applyDateRange")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getStatusBadgeClass(status: ManagedServiceOrder["status"]) {
  switch (status) {
    case "completed":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "cancelled":
      return "bg-red-500/10 text-red-700 dark:text-red-400";
    case "in_progress":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
    case "scheduled":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getStatusLabel(status: ManagedServiceOrder["status"], t: ReturnType<typeof useI18n>["t"]) {
  switch (status) {
    case "pending":
      return t("serviceOrders.statusOptions.pending");
    case "scheduled":
      return t("serviceOrders.statusOptions.scheduled");
    case "in_progress":
      return t("serviceOrders.statusOptions.inProgress");
    case "completed":
      return t("serviceOrders.statusOptions.completed");
    case "cancelled":
      return t("serviceOrders.statusOptions.cancelled");
    default:
      return status;
  }
}

function getOriginLabel(originType: ManagedServiceOrder["originType"], t: ReturnType<typeof useI18n>["t"]) {
  return originType === "budget" ? t("serviceOrders.originBudget") : t("serviceOrders.originManual");
}

export function DataTable({
  serviceOrders,
  clients,
  equipment,
  serviceTypes,
  operators,
  approvedBudgets,
  onCreateServiceOrder,
  onUpdateServiceOrder,
  onChangeStatus,
  isMutating,
}: DataTableProps) {
  const { t } = useI18n();
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createdDateFilter, setCreatedDateFilter] = useState<DateFilterValue>({ preset: "all" });
  const [serviceDateFilter, setServiceDateFilter] = useState<DateFilterValue>({ preset: "all" });
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingServiceOrder, setEditingServiceOrder] = useState<ManagedServiceOrder | null>(null);
  const [pendingStatusAction, setPendingStatusAction] = useState<PendingStatusAction>(null);
  const [historyServiceOrder, setHistoryServiceOrder] = useState<ManagedServiceOrder | null>(null);
  const [serviceOrderHistory, setServiceOrderHistory] = useState<ManagedServiceOrderStatusHistory[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const createdDateRange = useMemo(() => resolveDateFilterRange(createdDateFilter), [createdDateFilter]);
  const serviceDateRange = useMemo(() => resolveDateFilterRange(serviceDateFilter), [serviceDateFilter]);

  const filteredServiceOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return serviceOrders.filter((serviceOrder) => {
      if (statusFilter !== "all" && serviceOrder.status !== statusFilter) {
        return false;
      }

      if (!matchesCreatedDateFilter(serviceOrder, createdDateRange)) {
        return false;
      }

      if (!matchesServiceDateFilter(serviceOrder, serviceDateRange)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        serviceOrder.number,
        serviceOrder.clientName,
        serviceOrder.sourceBudgetNumber ?? "",
        serviceOrder.serviceCity,
        serviceOrder.serviceStreet,
        ...serviceOrder.items.map((item) => item.serviceDescription),
        ...serviceOrder.items.map((item) => item.equipmentName),
        ...serviceOrder.items.map((item) => item.operatorName),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [createdDateRange, search, serviceDateRange, serviceOrders, statusFilter]);

  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filteredServiceOrders.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const paginatedServiceOrders = filteredServiceOrders.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const hasActiveFilters = Boolean(search.trim())
    || statusFilter !== "all"
    || createdDateFilter.preset !== "all"
    || serviceDateFilter.preset !== "all";

  return (
    <div className="space-y-4">
      <AdminListToolbar>
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("serviceOrders.searchPlaceholder")}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            className="h-10 rounded-lg border-muted-foreground/20 bg-background pl-9"
          />
        </div>

        <div className="min-w-[180px] space-y-2">
          <Label htmlFor="service-order-status-filter" className="text-sm font-medium">
            {t("serviceOrders.status")}
          </Label>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setPage(0);
            }}
          >
            <SelectTrigger id="service-order-status-filter" className="h-10 cursor-pointer rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("serviceOrders.allStatuses")}</SelectItem>
              <SelectItem value="pending">{t("serviceOrders.statusOptions.pending")}</SelectItem>
              <SelectItem value="scheduled">{t("serviceOrders.statusOptions.scheduled")}</SelectItem>
              <SelectItem value="in_progress">{t("serviceOrders.statusOptions.inProgress")}</SelectItem>
              <SelectItem value="completed">{t("serviceOrders.statusOptions.completed")}</SelectItem>
              <SelectItem value="cancelled">{t("serviceOrders.statusOptions.cancelled")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DateFilterControl
          idPrefix="service-order-created-date"
          label={t("serviceOrders.createdDateFilter")}
          locale={locale}
          value={createdDateFilter}
          onPresetChange={(preset) => {
            setCreatedDateFilter((current) => ({
              preset,
              from: preset === "custom" ? current.from : undefined,
              to: preset === "custom" ? current.to : undefined,
            }));
            setPage(0);
          }}
          onRangeChange={(nextRange) => {
            setCreatedDateFilter({ preset: "custom", ...nextRange });
            setPage(0);
          }}
          t={t}
        />

        <DateFilterControl
          idPrefix="service-order-service-date"
          label={t("serviceOrders.serviceDateFilter")}
          locale={locale}
          value={serviceDateFilter}
          onPresetChange={(preset) => {
            setServiceDateFilter((current) => ({
              preset,
              from: preset === "custom" ? current.from : undefined,
              to: preset === "custom" ? current.to : undefined,
            }));
            setPage(0);
          }}
          onRangeChange={(nextRange) => {
            setServiceDateFilter({ preset: "custom", ...nextRange });
            setPage(0);
          }}
          t={t}
        />

        {hasActiveFilters ? (
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setCreatedDateFilter({ preset: "all" });
              setServiceDateFilter({ preset: "all" });
              setPage(0);
            }}
          >
            {t("common.clearFilters")}
          </Button>
        ) : null}

        <div className="ml-auto">
          <ServiceOrderFormDialog
            mode="create"
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSubmit={onCreateServiceOrder}
            isSubmitting={isMutating}
            clients={clients}
            equipment={equipment}
            serviceTypes={serviceTypes}
            operators={operators}
            approvedBudgets={approvedBudgets}
          />
        </div>
      </AdminListToolbar>

      <AdminListTableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("serviceOrders.number")}</TableHead>
              <TableHead>{t("serviceOrders.client")}</TableHead>
              <TableHead>{t("serviceOrders.originType")}</TableHead>
              <TableHead>{t("serviceOrders.schedule")}</TableHead>
              <TableHead>{t("serviceOrders.status")}</TableHead>
              <TableHead>{t("serviceOrders.createdAt")}</TableHead>
              <TableHead className="text-right">{t("serviceOrders.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedServiceOrders.length > 0 ? paginatedServiceOrders.map((serviceOrder) => {
              const firstDate = serviceOrder.items[0]?.serviceDate;
              const lastDate = serviceOrder.items[serviceOrder.items.length - 1]?.serviceDate;

              return (
                <TableRow key={serviceOrder.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{serviceOrder.number}</div>
                      {serviceOrder.sourceBudgetNumber ? (
                        <div className="text-xs text-muted-foreground">
                          {t("serviceOrders.fromBudget", { number: serviceOrder.sourceBudgetNumber })}
                        </div>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div>{serviceOrder.clientName}</div>
                      <div className="text-xs text-muted-foreground">
                        {serviceOrder.serviceCity} • {serviceOrder.serviceState}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{getOriginLabel(serviceOrder.originType, t)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="size-4 text-muted-foreground" />
                        {firstDate
                          ? firstDate === lastDate
                            ? formatDate(firstDate, locale)
                            : `${formatDate(firstDate, locale)} - ${formatDate(lastDate ?? firstDate, locale)}`
                          : t("serviceOrders.noSchedule")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("serviceOrders.itemsCountSummary", { count: serviceOrder.itemCount })}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={getStatusBadgeClass(serviceOrder.status)}>
                      {getStatusLabel(serviceOrder.status, t)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(serviceOrder.createdAt, locale)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" disabled={isMutating}>
                          <EllipsisVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {serviceOrder.status !== "completed" && serviceOrder.status !== "cancelled" ? (
                          <DropdownMenuItem className="cursor-pointer" onClick={() => setEditingServiceOrder(serviceOrder)}>
                            <Pencil className="mr-2 size-4" />
                            {t("serviceOrders.editServiceOrder")}
                          </DropdownMenuItem>
                        ) : null}

                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={async () => {
                            setHistoryServiceOrder(serviceOrder);
                            setIsHistoryLoading(true);

                            try {
                              const response = await fetch(`/api/service-orders/${serviceOrder.id}/history`, { cache: "no-store" });
                              const payload = await response.json().catch(() => null);

                              if (!response.ok) {
                                throw new Error(payload?.error || t("serviceOrders.updateError"));
                              }

                              setServiceOrderHistory(payload.history ?? []);
                            } catch (error) {
                              toast.error(error instanceof Error ? error.message : t("serviceOrders.updateError"));
                              setHistoryServiceOrder(null);
                            } finally {
                              setIsHistoryLoading(false);
                            }
                          }}
                        >
                          <Clock3 className="mr-2 size-4" />
                          {t("serviceOrders.viewHistory")}
                        </DropdownMenuItem>

                        {serviceOrder.status === "pending" ? (
                          <DropdownMenuItem className="cursor-pointer" onClick={() => setPendingStatusAction({ serviceOrder, status: "scheduled" })}>
                            <CheckCircle2 className="mr-2 size-4" />
                            {t("serviceOrders.scheduleServiceOrder")}
                          </DropdownMenuItem>
                        ) : null}

                        {serviceOrder.status === "scheduled" ? (
                          <DropdownMenuItem className="cursor-pointer" onClick={() => setPendingStatusAction({ serviceOrder, status: "in_progress" })}>
                            <Play className="mr-2 size-4" />
                            {t("serviceOrders.startServiceOrder")}
                          </DropdownMenuItem>
                        ) : null}

                        {serviceOrder.status === "in_progress" ? (
                          <DropdownMenuItem className="cursor-pointer" onClick={() => setPendingStatusAction({ serviceOrder, status: "completed" })}>
                            <CheckCircle2 className="mr-2 size-4" />
                            {t("serviceOrders.completeServiceOrder")}
                          </DropdownMenuItem>
                        ) : null}

                        {(serviceOrder.status === "pending" || serviceOrder.status === "scheduled") ? (
                          <DropdownMenuItem className="cursor-pointer text-destructive" onClick={() => setPendingStatusAction({ serviceOrder, status: "cancelled" })}>
                            <XCircle className="mr-2 size-4" />
                            {t("serviceOrders.cancelServiceOrder")}
                          </DropdownMenuItem>
                        ) : null}

                        {(serviceOrder.status === "completed" || serviceOrder.status === "cancelled") ? (
                          <DropdownMenuItem className="cursor-pointer" onClick={() => setPendingStatusAction({ serviceOrder, status: "pending" })}>
                            <RotateCcw className="mr-2 size-4" />
                            {t("serviceOrders.revertServiceOrder")}
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            }) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  {t("serviceOrders.noServiceOrders")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </AdminListTableCard>

      <AdminListPaginationFooter
        countLabel={t("serviceOrders.serviceOrderCount", { count: filteredServiceOrders.length })}
        previousLabel={t("common.previous")}
        nextLabel={t("common.next")}
        onPreviousPage={() => setPage((current) => Math.max(current - 1, 0))}
        onNextPage={() => setPage((current) => Math.min(current + 1, pageCount - 1))}
        canPreviousPage={safePage > 0}
        canNextPage={safePage < pageCount - 1}
      />

      <ServiceOrderFormDialog
        mode="edit"
        open={Boolean(editingServiceOrder)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingServiceOrder(null);
          }
        }}
        onSubmit={async (values) => {
          if (!editingServiceOrder) {
            return;
          }

          await onUpdateServiceOrder(editingServiceOrder.id, values as UpdateServiceOrderInput);
          setEditingServiceOrder(null);
        }}
        isSubmitting={isMutating}
        serviceOrder={editingServiceOrder}
        clients={clients}
        equipment={equipment}
        serviceTypes={serviceTypes}
        operators={operators}
        approvedBudgets={approvedBudgets}
      />

      <StatusTransitionDialog
        open={Boolean(pendingStatusAction)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingStatusAction(null);
          }
        }}
        title={
          pendingStatusAction?.status === "scheduled"
            ? t("serviceOrders.confirmScheduleTitle")
            : pendingStatusAction?.status === "in_progress"
              ? t("serviceOrders.confirmStartTitle")
              : pendingStatusAction?.status === "completed"
                ? t("serviceOrders.confirmCompleteTitle")
                : pendingStatusAction?.status === "cancelled"
                  ? t("serviceOrders.confirmCancelTitle")
                  : t("serviceOrders.confirmRevertTitle")
        }
        description={
          pendingStatusAction?.status === "scheduled"
            ? t("serviceOrders.confirmScheduleDescription")
            : pendingStatusAction?.status === "in_progress"
              ? t("serviceOrders.confirmStartDescription")
              : pendingStatusAction?.status === "completed"
                ? t("serviceOrders.confirmCompleteDescription")
                : pendingStatusAction?.status === "cancelled"
                  ? t("serviceOrders.confirmCancelDescription")
                  : t("serviceOrders.confirmRevertDescription")
        }
        confirmLabel={
          pendingStatusAction?.status === "scheduled"
            ? t("serviceOrders.scheduleServiceOrder")
            : pendingStatusAction?.status === "in_progress"
              ? t("serviceOrders.startServiceOrder")
              : pendingStatusAction?.status === "completed"
                ? t("serviceOrders.completeServiceOrder")
                : pendingStatusAction?.status === "cancelled"
                  ? t("serviceOrders.cancelServiceOrder")
                  : t("serviceOrders.revertServiceOrder")
        }
        confirmVariant={pendingStatusAction?.status === "cancelled" ? "destructive" : "default"}
        requireReason={pendingStatusAction?.status === "pending"}
        onConfirm={async (reason) => {
          if (!pendingStatusAction) {
            return;
          }

          await onChangeStatus(pendingStatusAction.serviceOrder.id, pendingStatusAction.status, reason);
          setPendingStatusAction(null);
        }}
        isLoading={isMutating}
      />

      <StatusHistoryDialog
        open={Boolean(historyServiceOrder)}
        onOpenChange={(open) => {
          if (!open) {
            setHistoryServiceOrder(null);
            setServiceOrderHistory([]);
          }
        }}
        title={
          historyServiceOrder
            ? `${t("serviceOrders.historyTitle")} • ${historyServiceOrder.number}`
            : t("serviceOrders.historyTitle")
        }
        description={t("serviceOrders.historyDescription")}
        entries={serviceOrderHistory}
        isLoading={isHistoryLoading}
        emptyMessage={t("serviceOrders.noHistory")}
        getStatusLabel={(status) => getStatusLabel(status as ManagedServiceOrder["status"], t)}
      />
    </div>
  );
}
