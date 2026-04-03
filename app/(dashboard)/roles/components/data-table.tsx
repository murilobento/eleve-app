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
import { ChevronDown, EllipsisVertical, Pencil, Search, ShieldCheck, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePersistentColumnVisibility } from "@/hooks/use-persistent-column-visibility";
import { useI18n } from "@/i18n/provider";
import type { CreateRoleInput, ManagedRole, UpdateRoleInput } from "@/lib/roles-admin";

import { RoleFormDialog } from "./role-form-dialog";

type DataTableProps = {
  roles: ManagedRole[];
  onCreateRole: (values: CreateRoleInput) => Promise<void>;
  onUpdateRole: (id: string, values: UpdateRoleInput) => Promise<void>;
  onDeleteRole: (id: string) => Promise<void>;
  onDeleteRoles: (ids: string[]) => Promise<void>;
  isMutating: boolean;
};

export function DataTable({
  roles,
  onCreateRole,
  onUpdateRole,
  onDeleteRole,
  onDeleteRoles,
  isMutating,
}: DataTableProps) {
  const { t } = useI18n();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const { columnVisibility, setColumnVisibility } = usePersistentColumnVisibility("table:roles:columns");
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<ManagedRole | null>(null);
  const [deletingRole, setDeletingRole] = useState<ManagedRole | null>(null);

  const columns = useMemo<ColumnDef<ManagedRole>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center px-2">
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(value) => {
              table.getRowModel().rows.forEach((row) => {
                if (!row.original.isSystem) {
                  row.toggleSelected(!!value);
                }
              });
            }}
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
            disabled={row.original.isSystem}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 50,
    },
    {
      accessorKey: "name",
      header: ({ column }) => <SortableHeader column={column} title={t("roles.role")} className="-ml-3" />,
      enableHiding: false,
    },
    {
      accessorKey: "permissionsCount",
      header: ({ column }) => <SortableHeader column={column} title={t("roles.permissions")} className="-ml-3" />,
      cell: ({ row }) => <Badge variant="secondary">{row.original.permissionsCount}</Badge>,
    },
    {
      accessorKey: "usersCount",
      header: ({ column }) => <SortableHeader column={column} title={t("roles.users")} className="-ml-3" />,
      cell: ({ row }) => <span className="text-sm">{row.original.usersCount}</span>,
    },
    {
      accessorKey: "isSystem",
      header: ({ column }) => <SortableHeader column={column} title={t("roles.type")} className="-ml-3" />,
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
      sortingFn: "basic",
    },
    {
      id: "actions",
      header: t("roles.actions"),
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const role = row.original;
        const isProtected = role.isSystem;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" disabled={isMutating}>
                <EllipsisVertical className="size-4" />
                <span className="sr-only">{t("roles.actions")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="cursor-pointer" onClick={() => setEditingRole(role)}>
                <Pencil className="mr-2 size-4" />
                {t("roles.editRole")}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                className="cursor-pointer"
                onClick={() => setDeletingRole(role)}
                disabled={isProtected}
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
  const columnVisibilityLabels = useMemo<Record<string, string>>(
    () => ({
      permissionsCount: t("roles.permissions"),
      usersCount: t("roles.users"),
      isSystem: t("roles.type"),
    }),
    [t],
  );

  const table = useReactTable({
    data: roles,
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
    enableRowSelection: (row) => !row.original.isSystem,
    globalFilterFn: (row, _columnId, filterValue) => {
      const value = String(filterValue).toLowerCase();

      return row.original.name.toLowerCase().includes(value);
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

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  return (
    <div className="w-full space-y-4">
      <div className="rounded-xl border bg-card/40 p-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("roles.searchPlaceholder")}
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="h-10 rounded-lg border-muted-foreground/20 bg-background pl-9"
            />
          </div>

          <div className="ml-auto">
            <div className="min-w-[170px] space-y-2">
              <Label htmlFor="roles-column-visibility" className="text-sm font-medium">
                {t("common.columnVisibility")}
              </Label>
              <DropdownMenu>
                <DropdownMenuTrigger
                  id="roles-column-visibility"
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

          <div>
            <RoleFormDialog
              mode="create"
              open={createOpen}
              onOpenChange={setCreateOpen}
              onSubmit={onCreateRole}
              isSubmitting={isMutating}
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
                const ids = table.getSelectedRowModel().rows
                  .map((row) => row.original)
                  .filter((role) => !role.isSystem)
                  .map((role) => role.id);

                if (!ids.length) {
                  return;
                }

                await onDeleteRoles(ids);
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

      <ConfirmDeleteDialog
        open={Boolean(deletingRole)}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingRole(null);
          }
        }}
        description={
          deletingRole ? t("roles.confirmDelete", { name: deletingRole.name }) : ""
        }
        onConfirm={async () => {
          if (!deletingRole) {
            return;
          }

          await onDeleteRole(deletingRole.id);
          setDeletingRole(null);
        }}
        isLoading={isMutating}
      />
    </div>
  );
}
