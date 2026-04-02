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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  CreateEquipmentTypeInput,
  ManagedEquipmentType,
  UpdateEquipmentTypeInput,
} from "@/lib/equipment-types-admin";
import { useI18n } from "@/i18n/provider";

import { EquipmentTypeFormDialog } from "./equipment-type-form-dialog";

type DataTableProps = {
  equipmentTypes: ManagedEquipmentType[];
  onCreateEquipmentType: (values: CreateEquipmentTypeInput) => Promise<void>;
  onUpdateEquipmentType: (id: string, values: UpdateEquipmentTypeInput) => Promise<void>;
  onDeleteEquipmentType: (id: string) => Promise<void>;
  isMutating: boolean;
};

export function DataTable({
  equipmentTypes,
  onCreateEquipmentType,
  onUpdateEquipmentType,
  onDeleteEquipmentType,
  isMutating,
}: DataTableProps) {
  const { t } = useI18n();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingEquipmentType, setEditingEquipmentType] = useState<ManagedEquipmentType | null>(null);
  const [deletingEquipmentType, setDeletingEquipmentType] = useState<ManagedEquipmentType | null>(null);

  const columns = useMemo<ColumnDef<ManagedEquipmentType>[]>(() => [
    {
      accessorKey: "name",
      header: t("equipmentTypes.name"),
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-medium">{row.original.name}</div>
          <div className="text-sm text-muted-foreground">
            {row.original.description || t("equipmentTypes.noDescription")}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "equipmentCount",
      header: t("equipmentTypes.linkedEquipment"),
      cell: ({ row }) => <Badge variant="secondary">{row.original.equipmentCount}</Badge>,
    },
    {
      id: "actions",
      header: t("equipmentTypes.actions"),
      cell: ({ row }) => {
        const equipmentType = row.original;

        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer"
              onClick={() => setEditingEquipmentType(equipmentType)}
              disabled={isMutating}
            >
              <Pencil className="size-4" />
              <span className="sr-only">{t("equipmentTypes.editType")}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer text-red-600"
              onClick={() => setDeletingEquipmentType(equipmentType)}
              disabled={isMutating}
            >
              <Trash2 className="size-4" />
              <span className="sr-only">{t("common.delete")}</span>
            </Button>
          </div>
        );
      },
    },
  ], [isMutating, onDeleteEquipmentType, t]);

  const table = useReactTable({
    data: equipmentTypes,
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

      return [row.original.name, row.original.description ?? ""].some((item) =>
        item.toLowerCase().includes(value),
      );
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

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("equipmentTypes.searchPlaceholder")}
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-9"
          />
        </div>

        <EquipmentTypeFormDialog
          mode="create"
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSubmit={onCreateEquipmentType}
          isSubmitting={isMutating}
        />
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
                  {t("equipmentTypes.noTypes")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-4 py-4">
        <div className="text-sm text-muted-foreground">
          {t("equipmentTypes.typeCount", { count: table.getFilteredRowModel().rows.length })}
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

      <EquipmentTypeFormDialog
        mode="edit"
        open={Boolean(editingEquipmentType)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingEquipmentType(null);
          }
        }}
        onSubmit={async (values) => {
          if (!editingEquipmentType) {
            return;
          }

          await onUpdateEquipmentType(editingEquipmentType.id, values as UpdateEquipmentTypeInput);
        }}
        isSubmitting={isMutating}
        equipmentType={editingEquipmentType}
      />

      <ConfirmDeleteDialog
        open={Boolean(deletingEquipmentType)}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingEquipmentType(null);
          }
        }}
        description={
          deletingEquipmentType
            ? t("equipmentTypes.confirmDelete", { name: deletingEquipmentType.name })
            : ""
        }
        onConfirm={async () => {
          if (!deletingEquipmentType) {
            return;
          }

          await onDeleteEquipmentType(deletingEquipmentType.id);
          setDeletingEquipmentType(null);
        }}
        isLoading={isMutating}
      />
    </div>
  );
}
