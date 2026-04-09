"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, endOfDay, endOfMonth, startOfDay, startOfMonth, subDays, subMonths } from "date-fns";
import { CalendarDays, CheckCircle2, Clock3, EllipsisVertical, Pencil, Play, RotateCcw, Search, Trash2, XCircle } from "lucide-react";

import { ServiceOrderFormDialog } from "./service-order-form-dialog";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  AdminFiltersDialog,
  AdminFiltersSection,
  AdminListPaginationFooter,
  AdminListTableCard,
  AdminListToolbar,
} from "@/components/admin-list-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { DatePickerInput } from "@/components/date-picker-input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SortableHeader } from "@/components/sortable-header";
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
import { getSemanticStatusBadgeClass } from "@/lib/status-badge";
import { useI18n, useLocale } from "@/i18n/provider";
import { toast } from "sonner";

type DataTableProps = {
  serviceOrders: ManagedServiceOrder[];
  clients: ManagedClient[];
  equipment: EquipmentOption[];
  serviceTypes: ManagedServiceType[];
  operators: ManagedOperator[];
  approvedBudgets: ManagedBudget[];
  openCreateDialogFromQuery?: boolean;
  editServiceOrderIdFromQuery?: string | null;
  onCreateServiceOrder: (values: CreateServiceOrderInput) => Promise<void>;
  onUpdateServiceOrder: (id: string, values: UpdateServiceOrderInput) => Promise<void>;
  onChangeStatus: (id: string, status: "pending" | "scheduled" | "in_progress" | "completed" | "cancelled", reason?: string) => Promise<void>;
  onCancelServiceOrders: (ids: string[]) => Promise<void>;
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
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-from`} className="text-xs font-medium text-muted-foreground">
                {t("serviceOrders.fromDate")}
              </Label>
              <DatePickerInput
                id={`${idPrefix}-from`}
                value={draftRange.from}
                onChange={(from) => setDraftRange((current) => ({ ...current, from }))}
                placeholder={t("serviceOrders.selectDate")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-to`} className="text-xs font-medium text-muted-foreground">
                {t("serviceOrders.toDate")}
              </Label>
              <DatePickerInput
                id={`${idPrefix}-to`}
                value={draftRange.to}
                onChange={(to) => setDraftRange((current) => ({ ...current, to }))}
                placeholder={t("serviceOrders.selectDate")}
              />
            </div>
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
    case "in_progress":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
    case "scheduled":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
    default:
      return getSemanticStatusBadgeClass(status, "bg-muted text-muted-foreground");
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
  openCreateDialogFromQuery = false,
  editServiceOrderIdFromQuery = null,
  onCreateServiceOrder,
  onUpdateServiceOrder,
  onChangeStatus,
  onCancelServiceOrders,
  isMutating,
}: DataTableProps) {
  const { t } = useI18n();
  const locale = useLocale();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [createdDateFilter, setCreatedDateFilter] = useState<DateFilterValue>({ preset: "all" });
  const [serviceDateFilter, setServiceDateFilter] = useState<DateFilterValue>({ preset: "all" });
  const [draftStatusFilter, setDraftStatusFilter] = useState("all");
  const [draftCreatedDateFilter, setDraftCreatedDateFilter] = useState<DateFilterValue>({ preset: "all" });
  const [draftServiceDateFilter, setDraftServiceDateFilter] = useState<DateFilterValue>({ preset: "all" });
  const [createOpen, setCreateOpen] = useState(openCreateDialogFromQuery);
  const [editingServiceOrder, setEditingServiceOrder] = useState<ManagedServiceOrder | null>(null);
  const [pendingStatusAction, setPendingStatusAction] = useState<PendingStatusAction>(null);
  const [historyServiceOrder, setHistoryServiceOrder] = useState<ManagedServiceOrder | null>(null);
  const [serviceOrderHistory, setServiceOrderHistory] = useState<ManagedServiceOrderStatusHistory[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [bulkCancelDialog, setBulkCancelDialog] = useState(false);

  useEffect(() => {
    if (openCreateDialogFromQuery) {
      setCreateOpen(true);
    }
  }, [openCreateDialogFromQuery]);

  useEffect(() => {
    if (!editServiceOrderIdFromQuery) {
      return;
    }

    const serviceOrder = serviceOrders.find((item) => item.id === editServiceOrderIdFromQuery);

    if (serviceOrder) {
      setEditingServiceOrder(serviceOrder);
    }
  }, [editServiceOrderIdFromQuery, serviceOrders]);

  const createdDateRange = useMemo(() => resolveDateFilterRange(createdDateFilter), [createdDateFilter]);
  const serviceDateRange = useMemo(() => resolveDateFilterRange(serviceDateFilter), [serviceDateFilter]);

  const filteredServiceOrders = useMemo(() => {
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

      return true;
    });
  }, [createdDateRange, serviceDateRange, serviceOrders, statusFilter]);

  const columns = useMemo<ColumnDef<ManagedServiceOrder>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center px-2">
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label={t("common.selectAll")}
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center px-2">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={t("common.selectRow")}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 50,
    },
    {
      accessorKey: "number",
      header: ({ column }) => <SortableHeader column={column} title={t("serviceOrders.number")} className="-ml-3" />,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-medium">{row.original.number}</div>
          {row.original.sourceBudgetNumber ? (
            <div className="text-xs text-muted-foreground">
              {t("serviceOrders.fromBudget", { number: row.original.sourceBudgetNumber })}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: "clientName",
      header: ({ column }) => <SortableHeader column={column} title={t("serviceOrders.client")} className="-ml-3" />,
      cell: ({ row }) => (
        <div className="space-y-1">
          <div>{row.original.clientName}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.serviceCity} • {row.original.serviceState}
          </div>
        </div>
      ),
    },
    {
      id: "originType",
      accessorFn: (row) => getOriginLabel(row.originType, t),
      header: ({ column }) => <SortableHeader column={column} title={t("serviceOrders.originType")} className="-ml-3" />,
      cell: ({ row }) => <Badge variant="outline">{getOriginLabel(row.original.originType, t)}</Badge>,
    },
    {
      id: "schedule",
      accessorFn: (row) => {
        const firstDate = row.items[0]?.serviceDate;
        const lastDate = row.items[row.items.length - 1]?.serviceDate;
        return firstDate ? (firstDate === lastDate ? formatDate(firstDate, locale) : `${formatDate(firstDate, locale)} - ${formatDate(lastDate ?? firstDate, locale)}`) : "";
      },
      header: ({ column }) => <SortableHeader column={column} title={t("serviceOrders.schedule")} className="-ml-3" />,
      cell: ({ row }) => (
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-muted-foreground" />
            {row.original.items[0]?.serviceDate
              ? row.original.items[0].serviceDate === row.original.items[row.original.items.length - 1]?.serviceDate
                ? formatDate(row.original.items[0].serviceDate, locale)
                : `${formatDate(row.original.items[0].serviceDate, locale)} - ${formatDate(row.original.items[row.original.items.length - 1]?.serviceDate ?? row.original.items[0].serviceDate, locale)}`
              : t("serviceOrders.noSchedule")}
          </div>
          <div className="text-xs text-muted-foreground">
            {t("serviceOrders.itemsCountSummary", { count: row.original.itemCount })}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <SortableHeader column={column} title={t("serviceOrders.status")} className="-ml-3" />,
      cell: ({ row }) => (
        <Badge variant="secondary" className={getStatusBadgeClass(row.original.status)}>
          {getStatusLabel(row.original.status, t)}
        </Badge>
      ),
      filterFn: "equals",
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <SortableHeader column={column} title={t("serviceOrders.createdAt")} className="-ml-3" />,
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDateTime(row.original.createdAt, locale)}</span>,
    },
    {
      id: "actions",
      header: t("serviceOrders.actions"),
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const serviceOrder = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" disabled={isMutating}>
                <EllipsisVertical className="size-4" />
                <span className="sr-only">{t("serviceOrders.actions")}</span>
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
        );
      },
    },
  ], [isMutating, locale, t]);

  const table = useReactTable({
    data: filteredServiceOrders,
    columns,
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const value = String(filterValue).toLowerCase();

      return [
        row.original.number,
        row.original.clientName,
        row.original.sourceBudgetNumber ?? "",
        row.original.serviceCity,
        row.original.serviceStreet,
        ...row.original.items.flatMap((item) => [item.serviceDescription, item.equipmentName, item.operatorName]),
      ].some((item) => item.toLowerCase().includes(value));
    },
    state: {
      sorting,
      columnFilters,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const activeFilterCount = [
    statusFilter !== "all",
    createdDateFilter.preset !== "all",
    serviceDateFilter.preset !== "all",
  ].filter(Boolean).length;

  const handleOpenFilters = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraftStatusFilter(statusFilter);
      setDraftCreatedDateFilter(createdDateFilter);
      setDraftServiceDateFilter(serviceDateFilter);
    }

    setFiltersOpen(nextOpen);
  };

  const handleApplyFilters = () => {
    setStatusFilter(draftStatusFilter);
    table.getColumn("status")?.setFilterValue(draftStatusFilter === "all" ? undefined : draftStatusFilter);
    setCreatedDateFilter(draftCreatedDateFilter);
    setServiceDateFilter(draftServiceDateFilter);
    table.setPageIndex(0);
    setFiltersOpen(false);
  };

  const handleClearFilters = () => {
    setColumnFilters([]);
    setStatusFilter("all");
    setCreatedDateFilter({ preset: "all" });
    setServiceDateFilter({ preset: "all" });
    setDraftStatusFilter("all");
    setDraftCreatedDateFilter({ preset: "all" });
    setDraftServiceDateFilter({ preset: "all" });
    table.setPageIndex(0);
    setFiltersOpen(false);
  };

  return (
    <div className="w-full space-y-4">
      <AdminListToolbar>
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("serviceOrders.searchPlaceholder")}
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="h-10 rounded-lg border-muted-foreground/20 bg-background pl-9"
          />
        </div>

        <AdminFiltersDialog
          open={filtersOpen}
          onOpenChange={handleOpenFilters}
          title={t("common.filters")}
          description={t("common.activeFilters", { count: activeFilterCount })}
          activeCount={activeFilterCount}
          triggerLabel={t("common.filters")}
          clearLabel={t("common.clearFilters")}
          cancelLabel={t("common.cancel")}
          applyLabel={t("common.apply")}
          onClear={handleClearFilters}
          onApply={handleApplyFilters}
        >
          <AdminFiltersSection title={t("common.filters")}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="service-order-status-filter">{t("serviceOrders.status")}</Label>
                <Select value={draftStatusFilter} onValueChange={setDraftStatusFilter}>
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
            </div>
          </AdminFiltersSection>

          <AdminFiltersSection title={t("serviceOrders.schedule")}>
            <div className="grid gap-4 lg:grid-cols-2">
              <DateFilterControl
                idPrefix="service-order-created-date"
                label={t("serviceOrders.createdDateFilter")}
                locale={locale}
                value={draftCreatedDateFilter}
                onPresetChange={(preset) => setDraftCreatedDateFilter({ preset })}
                onRangeChange={({ from, to }) =>
                  setDraftCreatedDateFilter((current) => ({
                    ...current,
                    preset: "custom",
                    from,
                    to,
                  }))
                }
                t={t}
              />

              <DateFilterControl
                idPrefix="service-order-service-date"
                label={t("serviceOrders.serviceDateFilter")}
                locale={locale}
                value={draftServiceDateFilter}
                onPresetChange={(preset) => setDraftServiceDateFilter({ preset })}
                onRangeChange={({ from, to }) =>
                  setDraftServiceDateFilter((current) => ({
                    ...current,
                    preset: "custom",
                    from,
                    to,
                  }))
                }
                t={t}
              />
            </div>
          </AdminFiltersSection>
        </AdminFiltersDialog>

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

      {selectedCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
          <span className="text-sm text-muted-foreground">
            {t("common.selectedCount", { count: selectedCount })}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="cursor-pointer"
              onClick={() => table.resetRowSelection()}
              disabled={isMutating}
            >
              {t("common.clearSelection")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="cursor-pointer"
              onClick={() => setBulkCancelDialog(true)}
              disabled={isMutating}
            >
              <Trash2 className="mr-2 size-4" />
              {t("serviceOrders.cancelSelected")}
            </Button>
          </div>
        </div>
      ) : null}

      <AdminListTableCard>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {t("serviceOrders.noServiceOrders")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </AdminListTableCard>

      <AdminListPaginationFooter
        countLabel={t("serviceOrders.serviceOrderCount", { count: table.getFilteredRowModel().rows.length })}
        previousLabel={t("common.previous")}
        nextLabel={t("common.next")}
        onPreviousPage={() => table.previousPage()}
        onNextPage={() => table.nextPage()}
        canPreviousPage={table.getCanPreviousPage()}
        canNextPage={table.getCanNextPage()}
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

      <ConfirmDeleteDialog
        open={bulkCancelDialog}
        onOpenChange={setBulkCancelDialog}
        title={t("serviceOrders.bulkCancelTitle")}
        description={t("serviceOrders.bulkCancelDescription", { count: selectedCount })}
        onConfirm={async () => {
          const selectedRows = table.getSelectedRowModel().rows;
          const cancellableOrders = selectedRows.filter(
            (row) => row.original.status === "pending" || row.original.status === "scheduled"
          );

          if (cancellableOrders.length === 0) {
            toast.error(t("serviceOrders.noCancellableSelected"));
            setBulkCancelDialog(false);
            return;
          }

          const ids = cancellableOrders.map((row) => row.original.id);
          await onCancelServiceOrders(ids);
          table.resetRowSelection();
          setBulkCancelDialog(false);
        }}
        isLoading={isMutating}
        confirmLabel={t("serviceOrders.cancelSelected")}
      />
    </div>
  );
}
