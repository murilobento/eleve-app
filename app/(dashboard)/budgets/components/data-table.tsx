"use client";

import { useMemo, useState } from "react";
import { addDays, endOfDay, endOfMonth, startOfDay, startOfMonth, subDays, subMonths } from "date-fns";
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
import { Check, Clock3, EllipsisVertical, FileDown, Pencil, RotateCcw, Search, X, Trash2 } from "lucide-react";

import { BudgetFormDialog } from "./budget-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { DatePickerInput } from "@/components/date-picker-input";
import {
  AdminFiltersDialog,
  AdminFiltersSection,
  AdminListPaginationFooter,
  AdminListTableCard,
  AdminListToolbar,
} from "@/components/admin-list-layout";
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
import { StatusHistoryDialog } from "@/components/status-history-dialog";
import { StatusTransitionDialog } from "@/components/status-transition-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  CreateBudgetInput,
  ManagedBudget,
  ManagedBudgetStatusHistory,
  UpdateBudgetInput,
} from "@/lib/budgets-admin";
import type { ManagedClient } from "@/lib/clients-admin";
import type { EquipmentOption } from "@/lib/equipment-admin";
import { useI18n, useLocale } from "@/i18n/provider";
import type { ManagedOperator } from "@/lib/operators-admin";
import type { ManagedServiceType } from "@/lib/service-types-admin";
import { getSemanticStatusBadgeClass } from "@/lib/status-badge";
import { toast } from "sonner";

type DataTableProps = {
  budgets: ManagedBudget[];
  clients: ManagedClient[];
  equipment: EquipmentOption[];
  serviceTypes: ManagedServiceType[];
  operators: ManagedOperator[];
  onCreateBudget: (values: CreateBudgetInput) => Promise<void>;
  onUpdateBudget: (id: string, values: UpdateBudgetInput) => Promise<void>;
  onApproveBudget: (id: string, reason?: string) => Promise<void>;
  onCancelBudget: (id: string, reason?: string) => Promise<void>;
  onRevertBudget: (id: string, reason?: string) => Promise<void>;
  onCancelBudgets: (ids: string[]) => Promise<void>;
  isMutating: boolean;
};

type PendingStatusAction =
  | { budget: ManagedBudget; status: "approved" | "cancelled" | "pending" }
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

function formatMoney(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "BRL",
  }).format(value);
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

function matchesCreatedDateFilter(budget: ManagedBudget, range: ResolvedDateRange) {
  return isDateInRange(new Date(budget.createdAt), range);
}

function matchesServiceDateFilter(budget: ManagedBudget, range: ResolvedDateRange) {
  if (!range) {
    return true;
  }

  return budget.items.some((item) => isDateInRange(parseDateOnly(item.serviceDate), range));
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
    ? `${t("budgets.customRange")} • ${value.from ? formatCompactCalendarDate(value.from, locale) : "..."}` +
      ` - ${value.to ? formatCompactCalendarDate(value.to, locale) : "..."}`
    : t("budgets.customRange");

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
          <SelectItem value="all">{t("budgets.allDates")}</SelectItem>
          <SelectItem value="today">{t("budgets.today")}</SelectItem>
          <SelectItem value="yesterday">{t("budgets.yesterday")}</SelectItem>
          <SelectItem value="tomorrow">{t("budgets.tomorrow")}</SelectItem>
          <SelectItem value="thisMonth">{t("budgets.thisMonth")}</SelectItem>
          <SelectItem value="lastMonth">{t("budgets.previousMonth")}</SelectItem>
          {hasCustomRange ? (
            <SelectItem value="customApplied" disabled>
              {customRangeLabel}
            </SelectItem>
          ) : null}
          <SelectItem value="custom">{t("budgets.customRange")}</SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{`${label} • ${t("budgets.customRange")}`}</DialogTitle>
            <DialogDescription>{t("budgets.customRangeDescription")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-from`} className="text-xs font-medium text-muted-foreground">
                {t("budgets.fromDate")}
              </Label>
              <DatePickerInput
                id={`${idPrefix}-from`}
                value={draftRange.from}
                onChange={(from) => setDraftRange((current) => ({ ...current, from }))}
                placeholder={t("budgets.selectDate")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-to`} className="text-xs font-medium text-muted-foreground">
                {t("budgets.toDate")}
              </Label>
              <DatePickerInput
                id={`${idPrefix}-to`}
                value={draftRange.to}
                onChange={(to) => setDraftRange((current) => ({ ...current, to }))}
                placeholder={t("budgets.selectDate")}
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
              {t("budgets.clearDateRange")}
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
                {t("budgets.applyDateRange")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getStatusBadgeClass(status: ManagedBudget["status"]) {
  return getSemanticStatusBadgeClass(status, "bg-amber-500/10 text-amber-700 dark:text-amber-400");
}

function getBudgetStatusLabel(status: ManagedBudget["status"], t: ReturnType<typeof useI18n>["t"]) {
  return t(`budgets.statusOptions.${status}`);
}

function buildServicesSummary(budget: ManagedBudget, t: ReturnType<typeof useI18n>["t"]) {
  const serviceNames = [...new Set(budget.items.map((item) => item.serviceTypeName).filter(Boolean))];

  if (!serviceNames.length) {
    return t("budgets.noServiceItems");
  }

  const visibleNames = serviceNames.slice(0, 2);
  const hiddenCount = serviceNames.length - visibleNames.length;

  return hiddenCount > 0
    ? `${visibleNames.join(" • ")} ${t("budgets.moreServices", { count: hiddenCount })}`
    : visibleNames.join(" • ");
}

function buildScheduleSummary(budget: ManagedBudget, locale: string, t: ReturnType<typeof useI18n>["t"]) {
  const sortedDates = [...budget.items]
    .map((item) => item.serviceDate)
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));

  if (!sortedDates.length) {
    return t("budgets.noSchedule");
  }

  if (sortedDates.length === 1) {
    return formatDate(sortedDates[0], locale);
  }

  return t("budgets.serviceDatesRange", {
    start: formatDate(sortedDates[0], locale),
    end: formatDate(sortedDates[sortedDates.length - 1], locale),
  });
}

export function DataTable({
  budgets,
  clients,
  equipment,
  serviceTypes,
  operators,
  onCreateBudget,
  onUpdateBudget,
  onApproveBudget,
  onCancelBudget,
  onRevertBudget,
  onCancelBudgets,
  isMutating,
}: DataTableProps) {
  const { t } = useI18n();
  const locale = useLocale();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<ManagedBudget | null>(null);
  const [pendingStatusAction, setPendingStatusAction] = useState<PendingStatusAction>(null);
  const [historyBudget, setHistoryBudget] = useState<ManagedBudget | null>(null);
  const [budgetHistory, setBudgetHistory] = useState<ManagedBudgetStatusHistory[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [createdDateFilter, setCreatedDateFilter] = useState<DateFilterValue>({ preset: "all" });
  const [serviceDateFilter, setServiceDateFilter] = useState<DateFilterValue>({ preset: "all" });
  const [draftStatusFilter, setDraftStatusFilter] = useState("all");
  const [draftCreatedDateFilter, setDraftCreatedDateFilter] = useState<DateFilterValue>({ preset: "all" });
  const [draftServiceDateFilter, setDraftServiceDateFilter] = useState<DateFilterValue>({ preset: "all" });
  const createdDateRange = useMemo(() => resolveDateFilterRange(createdDateFilter), [createdDateFilter]);
  const serviceDateRange = useMemo(() => resolveDateFilterRange(serviceDateFilter), [serviceDateFilter]);
  const filteredBudgets = useMemo(
    () =>
      budgets.filter(
        (budget) =>
          matchesCreatedDateFilter(budget, createdDateRange)
          && matchesServiceDateFilter(budget, serviceDateRange),
      ),
    [budgets, createdDateRange, serviceDateRange],
  );

  const columns = useMemo<ColumnDef<ManagedBudget>[]>(() => [
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
      header: ({ column }) => <SortableHeader column={column} title={t("budgets.number")} className="-ml-3" />,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-medium">{row.original.number}</div>
          <div className="text-sm text-muted-foreground">{row.original.clientName}</div>
        </div>
      ),
    },
    {
      id: "services",
      accessorFn: (row) => buildServicesSummary(row, t),
      header: ({ column }) => <SortableHeader column={column} title={t("budgets.services")} className="-ml-3" />,
      cell: ({ row }) => (
        <div className="space-y-1 text-sm">
          <div className="font-medium">{buildServicesSummary(row.original, t)}</div>
          <div className="text-muted-foreground">{t("budgets.itemsCountSummary", { count: row.original.itemCount })}</div>
        </div>
      ),
    },
    {
      id: "schedule",
      accessorFn: (row) => buildScheduleSummary(row, locale, t),
      header: ({ column }) => <SortableHeader column={column} title={t("budgets.schedule")} className="-ml-3" />,
      cell: ({ row }) => (
        <div className="space-y-1 text-sm">
          <div>{buildScheduleSummary(row.original, locale, t)}</div>
          <div className="text-muted-foreground">
            {row.original.items[0]
              ? `${row.original.items[0].startTime} - ${row.original.items[row.original.items.length - 1]?.endTime ?? row.original.items[0].endTime}`
              : t("budgets.noSchedule")}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "totalValue",
      header: ({ column }) => <SortableHeader column={column} title={t("budgets.totalValue")} className="-ml-3" />,
      cell: ({ row }) => (
        <div className="space-y-1 text-sm">
          <div className="font-medium">{formatMoney(row.original.totalValue, locale)}</div>
          <div className="text-muted-foreground">
            {t("budgets.subtotalWithAdjustment", {
              subtotal: formatMoney(row.original.subtotalValue, locale),
              adjustment: formatMoney(row.original.manualAdjustment, locale),
            })}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <SortableHeader column={column} title={t("budgets.status")} className="-ml-3" />,
      cell: ({ row }) => (
        <Badge variant="secondary" className={getStatusBadgeClass(row.original.status)}>
          {getBudgetStatusLabel(row.original.status, t)}
        </Badge>
      ),
      filterFn: "equals",
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => <SortableHeader column={column} title={t("budgets.updatedAt")} className="-ml-3" />,
      cell: ({ row }) => <span className="text-sm">{formatDateTime(row.original.updatedAt, locale)}</span>,
    },
    {
      id: "actions",
      header: t("budgets.actions"),
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const budget = row.original;
        const isPending = budget.status === "pending";
        const isApproved = budget.status === "approved";
        const isCancelled = budget.status === "cancelled";

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" disabled={isMutating}>
                <EllipsisVertical className="size-4" />
                <span className="sr-only">{t("budgets.actions")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isPending ? (
                <DropdownMenuItem className="cursor-pointer" onClick={() => setEditingBudget(budget)}>
                  <Pencil className="mr-2 size-4" />
                  {t("budgets.editBudget")}
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => window.open(`/api/budgets/${budget.id}/pdf`, "_blank", "noopener,noreferrer")}
              >
                <FileDown className="mr-2 size-4" />
                {t("budgets.downloadPdf")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={async () => {
                  setHistoryBudget(budget);
                  setIsHistoryLoading(true);

                  try {
                    const response = await fetch(`/api/budgets/${budget.id}/history`, { cache: "no-store" });
                    const payload = await response.json().catch(() => null);

                    if (!response.ok) {
                      throw new Error(payload?.error || t("budgets.updateError"));
                    }

                    setBudgetHistory(payload.history ?? []);
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : t("budgets.updateError"));
                    setHistoryBudget(null);
                  } finally {
                    setIsHistoryLoading(false);
                  }
                }}
              >
                <Clock3 className="mr-2 size-4" />
                {t("budgets.viewHistory")}
              </DropdownMenuItem>
              {isPending ? (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setPendingStatusAction({ budget, status: "approved" })}
                >
                  <Check className="mr-2 size-4" />
                  {t("budgets.approveBudget")}
                </DropdownMenuItem>
              ) : null}
              {isPending ? (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setPendingStatusAction({ budget, status: "cancelled" })}
                >
                  <X className="mr-2 size-4" />
                  {t("budgets.cancelBudget")}
                </DropdownMenuItem>
              ) : null}
              {isApproved || isCancelled ? (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setPendingStatusAction({ budget, status: "pending" })}
                >
                  <RotateCcw className="mr-2 size-4" />
                  {t("budgets.revertBudget")}
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [isMutating, locale, t]);

  const table = useReactTable({
    data: filteredBudgets,
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
        row.original.serviceCity,
        row.original.serviceState,
        row.original.serviceStreet,
        ...row.original.items.flatMap((item) => [
          item.serviceTypeName,
          item.serviceDescription,
          item.equipmentName,
          item.equipmentBrand,
          item.equipmentModel,
          item.operatorName,
        ]),
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

  const statusFilter = (table.getColumn("status")?.getFilterValue() as string | undefined) ?? "all";
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
    table.getColumn("status")?.setFilterValue(draftStatusFilter === "all" ? undefined : draftStatusFilter);
    setCreatedDateFilter(draftCreatedDateFilter);
    setServiceDateFilter(draftServiceDateFilter);
    table.setPageIndex(0);
    setFiltersOpen(false);
  };

  const handleClearFilters = () => {
    setColumnFilters([]);
    setCreatedDateFilter({ preset: "all" });
    setServiceDateFilter({ preset: "all" });
    setDraftStatusFilter("all");
    setDraftCreatedDateFilter({ preset: "all" });
    setDraftServiceDateFilter({ preset: "all" });
    table.setPageIndex(0);
    setFiltersOpen(false);
  };

  const [bulkCancelDialog, setBulkCancelDialog] = useState(false);

  return (
    <div className="w-full space-y-4">
      <AdminListToolbar>
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("budgets.searchPlaceholder")}
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
                <Label htmlFor="budget-status-filter">{t("budgets.status")}</Label>
                <Select value={draftStatusFilter} onValueChange={setDraftStatusFilter}>
                  <SelectTrigger className="h-10 w-full cursor-pointer rounded-lg" id="budget-status-filter">
                    <SelectValue placeholder={t("budgets.selectStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("budgets.allStatuses")}</SelectItem>
                    <SelectItem value="pending">{t("budgets.statusOptions.pending")}</SelectItem>
                    <SelectItem value="approved">{t("budgets.statusOptions.approved")}</SelectItem>
                    <SelectItem value="cancelled">{t("budgets.statusOptions.cancelled")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AdminFiltersSection>

          <AdminFiltersSection title={t("budgets.schedule")}>
            <div className="grid gap-4 lg:grid-cols-2">
              <DateFilterControl
                idPrefix="budget-created-date-filter"
                label={t("budgets.createdDateFilter")}
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
                idPrefix="budget-service-date-filter"
                label={t("budgets.serviceDateFilter")}
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
          <BudgetFormDialog
            mode="create"
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSubmit={onCreateBudget}
            isSubmitting={isMutating}
            clients={clients}
            equipment={equipment}
            serviceTypes={serviceTypes}
            operators={operators}
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
              {t("budgets.cancelSelected")}
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
                <TableRow key={row.id}>
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
                  {t("budgets.noBudgets")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </AdminListTableCard>

      <AdminListPaginationFooter
        countLabel={t("budgets.budgetCount", { count: table.getFilteredRowModel().rows.length })}
        previousLabel={t("common.previous")}
        nextLabel={t("common.next")}
        onPreviousPage={() => table.previousPage()}
        onNextPage={() => table.nextPage()}
        canPreviousPage={table.getCanPreviousPage()}
        canNextPage={table.getCanNextPage()}
      />

      <BudgetFormDialog
        mode="edit"
        open={Boolean(editingBudget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setEditingBudget(null);
          }
        }}
        onSubmit={async (values) => {
          if (!editingBudget) {
            return;
          }

          await onUpdateBudget(editingBudget.id, values);
          setEditingBudget(null);
        }}
        isSubmitting={isMutating}
        budget={editingBudget}
        clients={clients}
        equipment={equipment}
        serviceTypes={serviceTypes}
        operators={operators}
      />

      <StatusTransitionDialog
        open={Boolean(pendingStatusAction)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setPendingStatusAction(null);
          }
        }}
        title={
          pendingStatusAction?.status === "approved"
            ? t("budgets.confirmApproveTitle")
            : pendingStatusAction?.status === "cancelled"
              ? t("budgets.confirmCancelTitle")
              : t("budgets.confirmRevertTitle")
        }
        description={
          pendingStatusAction?.status === "approved"
            ? t("budgets.confirmApproveDescription")
            : pendingStatusAction?.status === "cancelled"
              ? t("budgets.confirmCancelDescription")
              : t("budgets.confirmRevertDescription")
        }
        confirmLabel={
          pendingStatusAction?.status === "approved"
            ? t("budgets.approveBudget")
            : pendingStatusAction?.status === "cancelled"
              ? t("budgets.cancelBudget")
              : t("budgets.revertBudget")
        }
        confirmVariant={pendingStatusAction?.status === "cancelled" ? "destructive" : "default"}
        requireReason={pendingStatusAction?.status === "pending"}
        onConfirm={async (reason) => {
          if (!pendingStatusAction) {
            return;
          }

          if (pendingStatusAction.status === "approved") {
            await onApproveBudget(pendingStatusAction.budget.id, reason);
          } else if (pendingStatusAction.status === "cancelled") {
            await onCancelBudget(pendingStatusAction.budget.id, reason);
          } else {
            await onRevertBudget(pendingStatusAction.budget.id, reason);
          }

          setPendingStatusAction(null);
        }}
        isLoading={isMutating}
      />

      <StatusHistoryDialog
        open={Boolean(historyBudget)}
        onOpenChange={(open) => {
          if (!open) {
            setHistoryBudget(null);
            setBudgetHistory([]);
          }
        }}
        title={historyBudget ? `${t("budgets.historyTitle")} • ${historyBudget.number}` : t("budgets.historyTitle")}
        description={t("budgets.historyDescription")}
        entries={budgetHistory}
        isLoading={isHistoryLoading}
        emptyMessage={t("budgets.noHistory")}
        getStatusLabel={(status) => getBudgetStatusLabel(status as ManagedBudget["status"], t)}
      />

      <ConfirmDeleteDialog
        open={bulkCancelDialog}
        onOpenChange={setBulkCancelDialog}
        title={t("budgets.bulkCancelTitle")}
        description={t("budgets.bulkCancelDescription", { count: selectedCount })}
        onConfirm={async () => {
          const selectedRows = table.getSelectedRowModel().rows;
          const pendingBudgets = selectedRows.filter((row) => row.original.status === "pending");
          
          if (pendingBudgets.length === 0) {
            toast.error(t("budgets.noPendingBudgetsSelected"));
            setBulkCancelDialog(false);
            return;
          }

          const ids = pendingBudgets.map((row) => row.original.id);
          await onCancelBudgets(ids);
          table.resetRowSelection();
          setBulkCancelDialog(false);
        }}
        isLoading={isMutating}
        confirmLabel={t("budgets.cancelSelected")}
      />
    </div>
  );
}
