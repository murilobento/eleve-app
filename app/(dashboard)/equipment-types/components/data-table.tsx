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
import { EllipsisVertical, Pencil, Search, Trash2 } from "lucide-react";

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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SortableHeader } from "@/components/sortable-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from "@/i18n/provider";
import type {
  CreateEquipmentTypeInput,
  ManagedEquipmentType,
  UpdateEquipmentTypeInput,
} from "@/lib/equipment-types-admin";

import { EquipmentTypeFormDialog } from "./equipment-type-form-dialog";

type DataTableProps = {
  equipmentTypes: ManagedEquipmentType[];
  onCreateEquipmentType: (values: CreateEquipmentTypeInput) => Promise<void>;
  onUpdateEquipmentType: (id: string, values: UpdateEquipmentTypeInput) => Promise<void>;
  onDeleteEquipmentType: (id: string) => Promise<void>;
  onDeleteEquipmentTypes: (ids: string[]) => Promise<void>;
  isMutating: boolean;
};

export function DataTable({
  equipmentTypes,
  onCreateEquipmentType,
  onUpdateEquipmentType,
  onDeleteEquipmentType,
  onDeleteEquipmentTypes,
  isMutating,
}: DataTableProps) {
  const { t } = useI18n();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingEquipmentType, setEditingEquipmentType] = useState<ManagedEquipmentType | null>(null);
  const [deletingEquipmentType, setDeletingEquipmentType] = useState<ManagedEquipmentType | null>(null);

  const columns = useMemo<ColumnDef<ManagedEquipmentType>[]>(() => [
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
      header: ({ column }) => <SortableHeader column={column} title={t("equipmentTypes.name")} className="-ml-3" />,
      enableHiding: false,
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
      header: ({ column }) => (
        <SortableHeader column={column} title={t("equipmentTypes.linkedEquipment")} className="-ml-3" />
      ),
      cell: ({ row }) => <Badge variant="secondary">{row.original.equipmentCount}</Badge>,
    },
    {
      id: "actions",
      header: t("equipmentTypes.actions"),
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const equipmentType = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" disabled={isMutating}>
                <EllipsisVertical className="size-4" />
                <span className="sr-only">{t("equipmentTypes.actions")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="cursor-pointer" onClick={() => setEditingEquipmentType(equipmentType)}>
                <Pencil className="mr-2 size-4" />
                {t("equipmentTypes.editType")}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                className="cursor-pointer"
                onClick={() => setDeletingEquipmentType(equipmentType)}
              >
                <Trash2 className="mr-2 size-4" />
                {t("common.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [isMutating, t]);
  const table = useReactTable({
    data: equipmentTypes,
    columns,
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

      return [row.original.name, row.original.description ?? ""].some((item) =>
        item.toLowerCase().includes(value),
      );
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

  return (
    <div className="w-full space-y-4">
      <AdminListToolbar>
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("equipmentTypes.searchPlaceholder")}
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="h-10 rounded-lg border-muted-foreground/20 bg-background pl-9"
          />
        </div>

        <div className="ml-auto">
          <EquipmentTypeFormDialog
            mode="create"
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSubmit={onCreateEquipmentType}
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
                await onDeleteEquipmentTypes(ids);
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
                  {t("equipmentTypes.noTypes")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </AdminListTableCard>

      <AdminListPaginationFooter
        countLabel={t("equipmentTypes.typeCount", { count: table.getFilteredRowModel().rows.length })}
        previousLabel={t("common.previous")}
        nextLabel={t("common.next")}
        onPreviousPage={() => table.previousPage()}
        onNextPage={() => table.nextPage()}
        canPreviousPage={table.getCanPreviousPage()}
        canNextPage={table.getCanNextPage()}
      />

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
