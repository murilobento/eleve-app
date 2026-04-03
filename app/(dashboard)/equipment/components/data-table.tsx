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
import { ChevronDown, Pencil, Search, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
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
  CreateEquipmentInput,
  ManagedEquipment,
  UpdateEquipmentInput,
} from "@/lib/equipment-admin";
import type { ManagedEquipmentType } from "@/lib/equipment-types-admin";
import { usePersistentColumnVisibility } from "@/hooks/use-persistent-column-visibility";
import { useI18n, useLocale } from "@/i18n/provider";

import { EquipmentFormDialog } from "./equipment-form-dialog";

type DataTableProps = {
  equipment: ManagedEquipment[];
  equipmentTypes: ManagedEquipmentType[];
  onCreateEquipment: (values: CreateEquipmentInput) => Promise<void>;
  onUpdateEquipment: (id: string, values: UpdateEquipmentInput) => Promise<void>;
  onDeleteEquipment: (id: string) => Promise<void>;
  onDeleteEquipmentItems: (ids: string[]) => Promise<void>;
  isMutating: boolean;
};

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function DataTable({
  equipment,
  equipmentTypes,
  onCreateEquipment,
  onUpdateEquipment,
  onDeleteEquipment,
  onDeleteEquipmentItems,
  isMutating,
}: DataTableProps) {
  const { t } = useI18n();
  const locale = useLocale();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const { columnVisibility, setColumnVisibility } = usePersistentColumnVisibility("table:equipment:columns");
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<ManagedEquipment | null>(null);
  const [deletingEquipment, setDeletingEquipment] = useState<ManagedEquipment | null>(null);

  const columns = useMemo<ColumnDef<ManagedEquipment>[]>(() => [
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
      header: ({ column }) => <SortableHeader column={column} title={t("equipment.name")} className="-ml-3" />,
      enableHiding: false,
      cell: ({ row }) => {
        const equipmentItem = row.original;

        return (
          <div className="space-y-1">
            <div className="font-medium">{equipmentItem.name}</div>
            <div className="text-sm text-muted-foreground">
              {equipmentItem.brand} • {equipmentItem.model}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "typeName",
      header: ({ column }) => <SortableHeader column={column} title={t("equipment.type")} className="-ml-3" />,
      cell: ({ row }) => <Badge variant="outline">{row.original.typeName}</Badge>,
      filterFn: "equals",
    },
    {
      accessorKey: "licenseRequired",
      header: ({ column }) => (
        <SortableHeader column={column} title={t("equipment.licenseRequired")} className="-ml-3" />
      ),
      cell: ({ row }) => <Badge variant="secondary">{row.original.licenseRequired}</Badge>,
      filterFn: "equals",
    },
    {
      accessorKey: "status",
      header: ({ column }) => <SortableHeader column={column} title={t("equipment.status")} className="-ml-3" />,
      cell: ({ row }) => {
        const isActive = row.original.status === "active";
        const className = isActive
          ? "text-primary bg-primary/10"
          : "text-destructive bg-destructive/10";

        return (
          <Badge variant="secondary" className={className}>
            {isActive ? t("equipment.active") : t("equipment.inactive")}
          </Badge>
        );
      },
      filterFn: "equals",
    },
    {
      accessorKey: "brand",
      header: ({ column }) => <SortableHeader column={column} title={t("equipment.brand")} className="-ml-3" />,
      cell: ({ row }) => <span className="text-sm">{row.original.brand}</span>,
    },
    {
      accessorKey: "model",
      header: ({ column }) => <SortableHeader column={column} title={t("equipment.model")} className="-ml-3" />,
      cell: ({ row }) => <span className="text-sm">{row.original.model}</span>,
    },
    {
      accessorKey: "year",
      header: ({ column }) => <SortableHeader column={column} title={t("equipment.year")} className="-ml-3" />,
      cell: ({ row }) => <span className="text-sm">{row.original.year}</span>,
    },
    {
      accessorKey: "plate",
      header: ({ column }) => <SortableHeader column={column} title={t("equipment.plate")} className="-ml-3" />,
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.plate || t("equipment.noPlate")}
        </span>
      ),
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => <SortableHeader column={column} title={t("equipment.updated")} className="-ml-3" />,
      cell: ({ row }) => <span className="text-sm">{formatDate(row.original.updatedAt, locale)}</span>,
    },
    {
      id: "actions",
      header: t("equipment.actions"),
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const equipmentItem = row.original;

        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer"
              onClick={() => setEditingEquipment(equipmentItem)}
              disabled={isMutating}
            >
              <Pencil className="size-4" />
              <span className="sr-only">{t("equipment.editEquipment")}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer text-destructive"
              onClick={() => setDeletingEquipment(equipmentItem)}
              disabled={isMutating}
            >
              <Trash2 className="size-4" />
              <span className="sr-only">{t("common.delete")}</span>
            </Button>
          </div>
        );
      },
    },
  ], [isMutating, locale, t]);

  const table = useReactTable({
    data: equipment,
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
        row.original.typeName,
        row.original.brand,
        row.original.model,
        row.original.plate ?? "",
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

  const typeFilter = (table.getColumn("typeName")?.getFilterValue() as string) || "all";
  const licenseFilter = (table.getColumn("licenseRequired")?.getFilterValue() as string) || "all";
  const statusFilter = (table.getColumn("status")?.getFilterValue() as string) || "all";
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  return (
    <div className="w-full space-y-4">
      <div className="rounded-xl border bg-card/40 p-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("equipment.searchPlaceholder")}
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="h-10 rounded-lg border-muted-foreground/20 bg-background pl-9"
            />
          </div>

          <div className="min-w-[180px] space-y-2">
            <Label htmlFor="equipment-type-filter" className="text-sm font-medium">
              {t("equipment.type")}
            </Label>
            <Select
              value={typeFilter}
              onValueChange={(value) =>
                table.getColumn("typeName")?.setFilterValue(value === "all" ? undefined : value)
              }
            >
              <SelectTrigger className="h-10 w-full cursor-pointer rounded-lg" id="equipment-type-filter">
                <SelectValue placeholder={t("equipment.selectType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("equipment.allTypes")}</SelectItem>
                {equipmentTypes.map((equipmentType) => (
                  <SelectItem key={equipmentType.id} value={equipmentType.name}>
                    {equipmentType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[180px] space-y-2">
            <Label htmlFor="equipment-license-filter" className="text-sm font-medium">
              {t("equipment.licenseRequired")}
            </Label>
            <Select
              value={licenseFilter}
              onValueChange={(value) =>
                table.getColumn("licenseRequired")?.setFilterValue(value === "all" ? undefined : value)
              }
            >
              <SelectTrigger className="h-10 w-full cursor-pointer rounded-lg" id="equipment-license-filter">
                <SelectValue placeholder={t("equipment.selectLicense")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("equipment.allLicenses")}</SelectItem>
                {["A", "B", "C", "D", "E"].map((license) => (
                  <SelectItem key={license} value={license}>
                    {license}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[180px] space-y-2">
            <Label htmlFor="equipment-status-filter" className="text-sm font-medium">
              {t("equipment.status")}
            </Label>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                table.getColumn("status")?.setFilterValue(value === "all" ? undefined : value)
              }
            >
              <SelectTrigger className="h-10 w-full cursor-pointer rounded-lg" id="equipment-status-filter">
                <SelectValue placeholder={t("equipment.selectStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("equipment.allStatuses")}</SelectItem>
                <SelectItem value="active">{t("equipment.active")}</SelectItem>
                <SelectItem value="inactive">{t("equipment.inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="ml-auto">
            <div className="min-w-[170px] space-y-2">
              <Label htmlFor="equipment-column-visibility" className="text-sm font-medium">
                {t("common.columnVisibility")}
              </Label>
              <DropdownMenu>
                <DropdownMenuTrigger
                  id="equipment-column-visibility"
                  className="inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-lg border bg-background px-3 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground"
                >
                  {t("common.columns")} <ChevronDown className="ml-2 size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div>
            <EquipmentFormDialog
              mode="create"
              open={createOpen}
              onOpenChange={setCreateOpen}
              onSubmit={onCreateEquipment}
              isSubmitting={isMutating}
              equipmentTypes={equipmentTypes}
              canCreate={equipmentTypes.length > 0}
            />
          </div>
        </div>
      </div>

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
                await onDeleteEquipmentItems(ids);
                table.resetRowSelection();
              }}
              disabled={isMutating}
            >
              {t("common.deleteSelected")}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="rounded-md border">
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
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {t("equipment.noEquipment")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-4 py-4">
        <div className="text-sm text-muted-foreground">
          {t("equipment.equipmentCount", { count: table.getFilteredRowModel().rows.length })}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="cursor-pointer"
          >
            {t("common.previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="cursor-pointer"
          >
            {t("common.next")}
          </Button>
        </div>
      </div>

      <EquipmentFormDialog
        mode="edit"
        open={Boolean(editingEquipment)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingEquipment(null);
          }
        }}
        onSubmit={async (values) => {
          if (!editingEquipment) {
            return;
          }

          await onUpdateEquipment(editingEquipment.id, values as UpdateEquipmentInput);
        }}
        isSubmitting={isMutating}
        equipment={editingEquipment}
        equipmentTypes={equipmentTypes}
        canCreate={equipmentTypes.length > 0}
      />

      <ConfirmDeleteDialog
        open={Boolean(deletingEquipment)}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingEquipment(null);
          }
        }}
        description={
          deletingEquipment
            ? t("equipment.confirmDelete", { name: deletingEquipment.name })
            : ""
        }
        onConfirm={async () => {
          if (!deletingEquipment) {
            return;
          }

          await onDeleteEquipment(deletingEquipment.id);
          setDeletingEquipment(null);
        }}
        isLoading={isMutating}
      />
    </div>
  );
}
