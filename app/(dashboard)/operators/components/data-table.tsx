"use client";

import { useMemo, useState } from "react";
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
import { ChevronDown, EllipsisVertical, Pencil, Search, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AdminListPaginationFooter,
  AdminListTableCard,
  AdminListToolbar,
} from "@/components/admin-list-layout";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SortableHeader } from "@/components/sortable-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  CreateOperatorInput,
  ManagedOperator,
  UpdateOperatorInput,
} from "@/lib/operators-admin";
import { usePersistentColumnVisibility } from "@/hooks/use-persistent-column-visibility";
import { useI18n, useLocale } from "@/i18n/provider";

import { OperatorFormDialog } from "./operator-form-dialog";

type DataTableProps = {
  operators: ManagedOperator[];
  onCreateOperator: (values: CreateOperatorInput) => Promise<void>;
  onUpdateOperator: (id: string, values: UpdateOperatorInput) => Promise<void>;
  onDeleteOperator: (id: string) => Promise<void>;
  onDeleteOperators: (ids: string[]) => Promise<void>;
  isMutating: boolean;
};

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function DataTable({
  operators,
  onCreateOperator,
  onUpdateOperator,
  onDeleteOperator,
  onDeleteOperators,
  isMutating,
}: DataTableProps) {
  const { t } = useI18n();
  const locale = useLocale();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const { columnVisibility, setColumnVisibility } = usePersistentColumnVisibility("table:operators:columns:v1", {
    updatedAt: false,
  });
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<ManagedOperator | null>(null);
  const [deletingOperator, setDeletingOperator] = useState<ManagedOperator | null>(null);

  const columns = useMemo<ColumnDef<ManagedOperator>[]>(() => [
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
      accessorKey: "name",
      header: ({ column }) => <SortableHeader column={column} title={t("operators.name")} className="-ml-3" />,
      enableHiding: false,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "phone",
      header: ({ column }) => <SortableHeader column={column} title={t("operators.phone")} className="-ml-3" />,
      cell: ({ row }) => <span className="text-sm">{row.original.phone}</span>,
    },
    {
      accessorKey: "license",
      header: ({ column }) => <SortableHeader column={column} title={t("operators.license")} className="-ml-3" />,
      cell: ({ row }) => <Badge variant="outline">{row.original.license}</Badge>,
      filterFn: "equals",
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => <SortableHeader column={column} title={t("operators.updated")} className="-ml-3" />,
      cell: ({ row }) => <span className="text-sm">{formatDate(row.original.updatedAt, locale)}</span>,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <SortableHeader column={column} title={t("operators.status")} className="-ml-3" />,
      cell: ({ row }) => {
        const isActive = row.original.status === "active";
        const className = isActive
          ? "text-primary bg-primary/10"
          : "text-destructive bg-destructive/10";

        return (
          <Badge variant="secondary" className={className}>
            {isActive ? t("operators.active") : t("operators.inactive")}
          </Badge>
        );
      },
      filterFn: "equals",
    },
    {
      id: "actions",
      header: t("operators.actions"),
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const operator = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" disabled={isMutating}>
                <EllipsisVertical className="size-4" />
                <span className="sr-only">{t("operators.actions")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="cursor-pointer" onClick={() => setEditingOperator(operator)}>
                <Pencil className="mr-2 size-4" />
                {t("operators.editOperator")}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                className="cursor-pointer"
                onClick={() => setDeletingOperator(operator)}
              >
                <Trash2 className="mr-2 size-4" />
                {t("common.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [isMutating, locale, t]);

  const columnVisibilityLabels = useMemo<Record<string, string>>(
    () => ({
      phone: t("operators.phone"),
      license: t("operators.license"),
      status: t("operators.status"),
      updatedAt: t("operators.updated"),
    }),
    [t],
  );

  const table = useReactTable({
    data: operators,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const value = String(filterValue).toLowerCase();
      return [
        row.original.name,
        row.original.phone,
      ].some((item) => item.toLowerCase().includes(value));
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const licenseFilter = (table.getColumn("license")?.getFilterValue() as string) || "all";
  const statusFilter = (table.getColumn("status")?.getFilterValue() as string) || "all";
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const hasActiveFilters = Boolean(globalFilter.trim()) || columnFilters.length > 0;

  const handleClearFilters = () => {
    setGlobalFilter("");
    setColumnFilters([]);
    table.setPageIndex(0);
  };

  return (
    <div className="w-full space-y-4">
      <AdminListToolbar>
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("operators.searchPlaceholder")}
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="h-10 rounded-lg border-muted-foreground/20 bg-background pl-9"
            />
          </div>

          <div className="min-w-[180px] space-y-2">
            <Label htmlFor="operator-license-filter" className="text-sm font-medium">
              {t("operators.license")}
            </Label>
            <Select
              value={licenseFilter}
              onValueChange={(value) =>
                table.getColumn("license")?.setFilterValue(value === "all" ? undefined : value)
              }
            >
              <SelectTrigger className="h-10 w-full cursor-pointer rounded-lg" id="operator-license-filter">
                <SelectValue placeholder={t("operators.selectLicense")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("operators.allLicenses")}</SelectItem>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="C">C</SelectItem>
                <SelectItem value="D">D</SelectItem>
                <SelectItem value="E">E</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[180px] space-y-2">
            <Label htmlFor="operator-status-filter" className="text-sm font-medium">
              {t("operators.status")}
            </Label>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                table.getColumn("status")?.setFilterValue(value === "all" ? undefined : value)
              }
            >
              <SelectTrigger className="h-10 w-full cursor-pointer rounded-lg" id="operator-status-filter">
                <SelectValue placeholder={t("operators.selectStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("operators.allStatuses")}</SelectItem>
                <SelectItem value="active">{t("operators.active")}</SelectItem>
                <SelectItem value="inactive">{t("operators.inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="ml-auto">
            <div className="min-w-[180px] space-y-2">
              <Label htmlFor="operators-column-visibility" className="text-sm font-medium">
                {t("common.columnVisibility")}
              </Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    id="operators-column-visibility"
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
            <OperatorFormDialog
              mode="create"
              open={createOpen}
              onOpenChange={setCreateOpen}
              onSubmit={onCreateOperator}
              isSubmitting={isMutating}
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
              onClick={async () => {
                const ids = table.getSelectedRowModel().rows.map((row) => row.original.id);
                if (!ids.length) {
                  return;
                }
                await onDeleteOperators(ids);
                table.resetRowSelection();
              }}
              disabled={isMutating}
            >
              {t("common.deleteSelected")}
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
                  {t("operators.noOperators")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </AdminListTableCard>

      <AdminListPaginationFooter
        countLabel={t("operators.operatorCount", { count: table.getFilteredRowModel().rows.length })}
        previousLabel={t("common.previous")}
        nextLabel={t("common.next")}
        onPreviousPage={() => table.previousPage()}
        onNextPage={() => table.nextPage()}
        canPreviousPage={table.getCanPreviousPage()}
        canNextPage={table.getCanNextPage()}
      />

      <OperatorFormDialog
        mode="edit"
        open={Boolean(editingOperator)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingOperator(null);
          }
        }}
        onSubmit={async (values) => {
          if (!editingOperator) {
            return;
          }

          await onUpdateOperator(editingOperator.id, values as UpdateOperatorInput);
        }}
        isSubmitting={isMutating}
        operator={editingOperator}
      />

      <ConfirmDeleteDialog
        open={Boolean(deletingOperator)}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingOperator(null);
          }
        }}
        description={deletingOperator ? t("operators.confirmDelete", { name: deletingOperator.name }) : ""}
        onConfirm={async () => {
          if (!deletingOperator) {
            return;
          }

          await onDeleteOperator(deletingOperator.id);
          setDeletingOperator(null);
        }}
        isLoading={isMutating}
      />
    </div>
  );
}
