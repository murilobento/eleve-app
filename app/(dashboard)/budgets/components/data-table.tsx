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
import { CalendarDays, Check, ChevronDown, EllipsisVertical, FileDown, Pencil, RotateCcw, Search, X } from "lucide-react";

import { BudgetFormDialog } from "./budget-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AdminListPaginationFooter,
  AdminListTableCard,
  AdminListToolbar,
} from "@/components/admin-list-layout";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
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
  DropdownMenuCheckboxItem,
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
import { SortableHeader } from "@/components/sortable-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import type { CreateBudgetInput, ManagedBudget, UpdateBudgetInput } from "@/lib/budgets-admin";
import type { ManagedClient } from "@/lib/clients-admin";
import type { EquipmentOption } from "@/lib/equipment-admin";
import { usePersistentColumnVisibility } from "@/hooks/use-persistent-column-visibility";
import { useI18n, useLocale } from "@/i18n/provider";
import type { ManagedOperator } from "@/lib/operators-admin";
import type { ManagedServiceType } from "@/lib/service-types-admin";
import { cn } from "@/lib/utils";

type DataTableProps = {
  budgets: ManagedBudget[];
  clients: ManagedClient[];
  equipment: EquipmentOption[];
  serviceTypes: ManagedServiceType[];
  operators: ManagedOperator[];
  onCreateBudget: (values: CreateBudgetInput) => Promise<void>;
  onUpdateBudget: (id: string, values: UpdateBudgetInput) => Promise<void>;
  onApproveBudget: (id: string) => Promise<void>;
  onCancelBudget: (id: string) => Promise<void>;
  onRevertBudget: (id: string) => Promise<void>;
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
            <DatePickerField
              id={`${idPrefix}-from`}
              label={t("budgets.fromDate")}
              locale={locale}
              value={draftRange.from}
              onSelect={(from) => setDraftRange((current) => ({ ...current, from }))}
              placeholder={t("budgets.selectDate")}
            />
            <DatePickerField
              id={`${idPrefix}-to`}
              label={t("budgets.toDate")}
              locale={locale}
              value={draftRange.to}
              onSelect={(to) => setDraftRange((current) => ({ ...current, to }))}
              placeholder={t("budgets.selectDate")}
            />
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
  switch (status) {
    case "approved":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "cancelled":
      return "bg-rose-500/10 text-rose-700 dark:text-rose-400";
    default:
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
  }
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
  isMutating,
}: DataTableProps) {
  const { t } = useI18n();
  const locale = useLocale();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const { columnVisibility, setColumnVisibility } = usePersistentColumnVisibility("table:budgets:columns:v2", {
    updatedAt: false,
  });
  const [globalFilter, setGlobalFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<ManagedBudget | null>(null);
  const [pendingStatusAction, setPendingStatusAction] = useState<PendingStatusAction>(null);
  const [createdDateFilter, setCreatedDateFilter] = useState<DateFilterValue>({ preset: "all" });
  const [serviceDateFilter, setServiceDateFilter] = useState<DateFilterValue>({ preset: "all" });
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
          {t(`budgets.statusOptions.${row.original.status}`)}
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
              {isCancelled ? (
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

  const columnVisibilityLabels = useMemo<Record<string, string>>(
    () => ({
      services: t("budgets.services"),
      schedule: t("budgets.schedule"),
      totalValue: t("budgets.totalValue"),
      status: t("budgets.status"),
      updatedAt: t("budgets.updatedAt"),
    }),
    [t],
  );

  const table = useReactTable({
    data: filteredBudgets,
    columns,
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
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
      columnVisibility,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const statusFilter = (table.getColumn("status")?.getFilterValue() as string | undefined) ?? "all";
  const hasActiveFilters = Boolean(globalFilter.trim())
    || columnFilters.length > 0
    || createdDateFilter.preset !== "all"
    || serviceDateFilter.preset !== "all";

  const handleClearFilters = () => {
    setGlobalFilter("");
    setColumnFilters([]);
    setCreatedDateFilter({ preset: "all" });
    setServiceDateFilter({ preset: "all" });
    table.setPageIndex(0);
  };

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

          <div className="w-full min-w-[180px] space-y-2 sm:w-auto">
            <Label htmlFor="budget-status-filter" className="text-sm font-medium">
              {t("budgets.status")}
            </Label>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                table.getColumn("status")?.setFilterValue(value === "all" ? undefined : value)
              }
            >
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

          <DateFilterControl
            idPrefix="budget-created-date-filter"
            label={t("budgets.createdDateFilter")}
            locale={locale}
            value={createdDateFilter}
            onPresetChange={(preset) => setCreatedDateFilter({ preset })}
            onRangeChange={({ from, to }) =>
              setCreatedDateFilter((current) => ({
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
            value={serviceDateFilter}
            onPresetChange={(preset) => setServiceDateFilter({ preset })}
            onRangeChange={({ from, to }) =>
              setServiceDateFilter((current) => ({
                ...current,
                preset: "custom",
                from,
                to,
              }))
            }
            t={t}
          />

          <div className="w-full min-w-[180px] space-y-2 sm:ml-auto sm:w-auto">
            <div className="min-w-[180px] space-y-2">
              <Label htmlFor="budgets-column-visibility" className="text-sm font-medium">
                {t("common.columnVisibility")}
              </Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    id="budgets-column-visibility"
                    variant="outline"
                    size="lg"
                    className="h-10 w-full cursor-pointer justify-between rounded-lg px-3"
                  >
                    {t("common.columns")} <ChevronDown className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {columnVisibilityLabels[column.id] ?? column.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="w-full min-w-[160px] space-y-2 sm:w-auto">
            <Label className="text-sm font-medium text-transparent">
              {t("common.clearFilters")}
            </Label>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full cursor-pointer rounded-lg sm:w-auto"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
            >
              {t("common.clearFilters")}
            </Button>
          </div>

          <div>
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

      <ConfirmDeleteDialog
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
        onConfirm={async () => {
          if (!pendingStatusAction) {
            return;
          }

          if (pendingStatusAction.status === "approved") {
            await onApproveBudget(pendingStatusAction.budget.id);
          } else if (pendingStatusAction.status === "cancelled") {
            await onCancelBudget(pendingStatusAction.budget.id);
          } else {
            await onRevertBudget(pendingStatusAction.budget.id);
          }

          setPendingStatusAction(null);
        }}
        isLoading={isMutating}
      />
    </div>
  );
}
