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
import { Pencil, Search, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useI18n, useLocale } from "@/i18n/provider";

import { EquipmentFormDialog } from "./equipment-form-dialog";

type DataTableProps = {
  equipment: ManagedEquipment[];
  equipmentTypes: ManagedEquipmentType[];
  onCreateEquipment: (values: CreateEquipmentInput) => Promise<void>;
  onUpdateEquipment: (id: string, values: UpdateEquipmentInput) => Promise<void>;
  onDeleteEquipment: (id: string) => Promise<void>;
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
  isMutating,
}: DataTableProps) {
  const { t } = useI18n();
  const locale = useLocale();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<ManagedEquipment | null>(null);
  const [deletingEquipment, setDeletingEquipment] = useState<ManagedEquipment | null>(null);

  const columns = useMemo<ColumnDef<ManagedEquipment>[]>(() => [
    {
      accessorKey: "name",
      header: t("equipment.name"),
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
      header: t("equipment.type"),
      cell: ({ row }) => <Badge variant="outline">{row.original.typeName}</Badge>,
      filterFn: "equals",
    },
    {
      accessorKey: "licenseRequired",
      header: t("equipment.licenseRequired"),
      cell: ({ row }) => <Badge variant="secondary">{row.original.licenseRequired}</Badge>,
      filterFn: "equals",
    },
    {
      accessorKey: "brand",
      header: t("equipment.brand"),
      cell: ({ row }) => <span className="text-sm">{row.original.brand}</span>,
    },
    {
      accessorKey: "model",
      header: t("equipment.model"),
      cell: ({ row }) => <span className="text-sm">{row.original.model}</span>,
    },
    {
      accessorKey: "year",
      header: t("equipment.year"),
      cell: ({ row }) => <span className="text-sm">{row.original.year}</span>,
    },
    {
      accessorKey: "plate",
      header: t("equipment.plate"),
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.plate || t("equipment.noPlate")}
        </span>
      ),
    },
    {
      accessorKey: "updatedAt",
      header: t("equipment.updated"),
      cell: ({ row }) => <span className="text-sm">{formatDate(row.original.updatedAt, locale)}</span>,
    },
    {
      id: "actions",
      header: t("equipment.actions"),
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
              className="h-8 w-8 cursor-pointer text-red-600"
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
  ], [isMutating, locale, onDeleteEquipment, t]);

  const table = useReactTable({
    data: equipment,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
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

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("equipment.searchPlaceholder")}
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-9"
          />
        </div>

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

      <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
        <div className="space-y-2">
          <Label htmlFor="equipment-type-filter" className="text-sm font-medium">
            {t("equipment.type")}
          </Label>
          <Select
            value={typeFilter}
            onValueChange={(value) =>
              table.getColumn("typeName")?.setFilterValue(value === "all" ? undefined : value)
            }
          >
            <SelectTrigger className="w-full cursor-pointer" id="equipment-type-filter">
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

        <div className="space-y-2">
          <Label htmlFor="equipment-license-filter" className="text-sm font-medium">
            {t("equipment.licenseRequired")}
          </Label>
          <Select
            value={licenseFilter}
            onValueChange={(value) =>
              table.getColumn("licenseRequired")?.setFilterValue(value === "all" ? undefined : value)
            }
          >
            <SelectTrigger className="w-full cursor-pointer" id="equipment-license-filter">
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
      </div>

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
