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
import { Pencil, Search, ShieldCheck, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CreateRoleInput, ManagedRole, UpdateRoleInput } from "@/lib/roles-admin";
import { useI18n } from "@/i18n/provider";

import { RoleFormDialog } from "./role-form-dialog";

type DataTableProps = {
  roles: ManagedRole[];
  onCreateRole: (values: CreateRoleInput) => Promise<void>;
  onUpdateRole: (id: string, values: UpdateRoleInput) => Promise<void>;
  onDeleteRole: (id: string) => Promise<void>;
  isMutating: boolean;
};

export function DataTable({
  roles,
  onCreateRole,
  onUpdateRole,
  onDeleteRole,
  isMutating,
}: DataTableProps) {
  const { t } = useI18n();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<ManagedRole | null>(null);

  const columns = useMemo<ColumnDef<ManagedRole>[]>(() => [
    {
      accessorKey: "name",
      header: t("roles.role"),
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-medium">{row.original.name}</div>
          <div className="text-sm text-muted-foreground">{row.original.slug}</div>
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: t("roles.descriptionLabel"),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.description || t("roles.noDescription")}
        </span>
      ),
    },
    {
      accessorKey: "permissionsCount",
      header: t("roles.permissions"),
      cell: ({ row }) => <Badge variant="secondary">{row.original.permissionsCount}</Badge>,
    },
    {
      accessorKey: "usersCount",
      header: t("roles.users"),
      cell: ({ row }) => <span className="text-sm">{row.original.usersCount}</span>,
    },
    {
      accessorKey: "isSystem",
      header: t("roles.type"),
      cell: ({ row }) => (
        row.original.isSystem ? (
          <Badge variant="secondary" className="gap-1">
            <ShieldCheck className="size-3" />
            {t("roles.system")}
          </Badge>
        ) : (
          <Badge variant="outline">{t("roles.custom")}</Badge>
        )
      ),
    },
    {
      id: "actions",
      header: t("roles.actions"),
      cell: ({ row }) => {
        const role = row.original;
        const isProtected = role.isSystem;

        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer"
              onClick={() => setEditingRole(role)}
              disabled={isMutating}
            >
              <Pencil className="size-4" />
              <span className="sr-only">{t("roles.editRole")}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer text-red-600"
              onClick={async () => {
                const confirmed = window.confirm(t("roles.confirmDelete", { name: role.name }));

                if (!confirmed) {
                  return;
                }

                await onDeleteRole(role.id);
              }}
              disabled={isMutating || isProtected}
            >
              <Trash2 className="size-4" />
              <span className="sr-only">{t("common.delete")}</span>
            </Button>
          </div>
        );
      },
    },
  ], [isMutating, onDeleteRole, t]);

  const table = useReactTable({
    data: roles,
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
        row.original.slug,
        row.original.description ?? "",
      ].some((item) => item.toLowerCase().includes(value));
    },
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  });

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("roles.searchPlaceholder")}
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-9"
          />
        </div>

        <RoleFormDialog
          mode="create"
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSubmit={onCreateRole}
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
                  {t("roles.noRoles")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-4 py-4">
        <div className="text-sm text-muted-foreground">
          {t("roles.roleCount", { count: table.getFilteredRowModel().rows.length })}
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

      <RoleFormDialog
        mode="edit"
        open={Boolean(editingRole)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingRole(null);
          }
        }}
        onSubmit={async (values) => {
          if (!editingRole) {
            return;
          }

          await onUpdateRole(editingRole.id, values as UpdateRoleInput);
        }}
        isSubmitting={isMutating}
        role={editingRole}
      />
    </div>
  );
}
