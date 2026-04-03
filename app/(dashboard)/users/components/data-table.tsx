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

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type CreateManagedUserInput,
  type ManagedUser,
  type UpdateManagedUserInput,
} from "@/lib/users-admin";
import { usePersistentColumnVisibility } from "@/hooks/use-persistent-column-visibility";
import type { RoleRecord } from "@/lib/rbac-shared";
import { useI18n, useLocale } from "@/i18n/provider";

import { UserFormDialog } from "./user-form-dialog";

type DataTableProps = {
  users: ManagedUser[];
  roles: RoleRecord[];
  onCreateUser: (values: CreateManagedUserInput) => Promise<void>;
  onUpdateUser: (id: string, values: UpdateManagedUserInput) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onDeleteUsers: (ids: string[]) => Promise<void>;
  isMutating: boolean;
};

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function DataTable({
  users,
  roles,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  onDeleteUsers,
  isMutating,
}: DataTableProps) {
  const { t } = useI18n();
  const locale = useLocale();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const { columnVisibility, setColumnVisibility } = usePersistentColumnVisibility("table:users:columns:v2", {
    joinedDate: false,
    updatedDate: false,
  });
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);

  const columns = useMemo<ColumnDef<ManagedUser>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <div className="flex items-center justify-center px-2">
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && "indeterminate")
              }
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label={t("users.selectAll")}
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center px-2">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label={t("users.selectRow")}
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
        size: 50,
      },
      {
        accessorKey: "name",
        header: ({ column }) => <SortableHeader column={column} title={t("users.title")} className="-ml-3" />,
        enableHiding: false,
        cell: ({ row }) => {
          const user = row.original;

          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs font-medium">{user.avatar}</AvatarFallback>
              </Avatar>
              <span className="font-medium">{user.name}</span>
            </div>
          );
        },
      },
      {
        id: "roles",
        header: ({ column }) => <SortableHeader column={column} title={t("users.roles")} className="-ml-3" />,
        cell: ({ row }) => {
          const user = row.original;

          return (
            <div className="flex flex-wrap gap-1">
              {user.roles.map((role) => (
                <Badge key={role.id} variant="secondary">
                  {role.name}
                </Badge>
              ))}
            </div>
          );
        },
        filterFn: (row, _columnId, filterValue) => {
          if (!filterValue) {
            return true;
          }

          return row.original.roles.some((role) => role.slug === filterValue);
        },
      },
      {
        accessorKey: "joinedDate",
        header: ({ column }) => <SortableHeader column={column} title={t("users.joined")} className="-ml-3" />,
        cell: ({ row }) => <span className="text-sm">{formatDate(row.original.joinedDate, locale)}</span>,
      },
      {
        accessorKey: "updatedDate",
        header: ({ column }) => <SortableHeader column={column} title={t("users.updated")} className="-ml-3" />,
        cell: ({ row }) => <span className="text-sm">{formatDate(row.original.updatedDate, locale)}</span>,
      },
      {
        accessorKey: "statusLabel",
        header: ({ column }) => <SortableHeader column={column} title={t("users.status")} className="-ml-3" />,
        cell: ({ row }) => {
          const user = row.original;
          const className =
            user.status === "active"
              ? "text-primary bg-primary/10"
              : "text-destructive bg-destructive/10";

          return (
            <Badge variant="secondary" className={className}>
              {user.statusLabel}
            </Badge>
          );
        },
        filterFn: "equals",
      },
      {
        id: "actions",
        header: t("users.actions"),
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const user = row.original;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" disabled={isMutating}>
                  <EllipsisVertical className="size-4" />
                  <span className="sr-only">{t("users.actions")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="cursor-pointer" onClick={() => setEditingUser(user)}>
                  <Pencil className="mr-2 size-4" />
                  {t("users.editUser")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  className="cursor-pointer"
                  onClick={() => setDeletingUser(user)}
                >
                  <Trash2 className="mr-2 size-4" />
                  {t("common.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [isMutating, locale, onDeleteUser, t],
  );
  const columnVisibilityLabels = useMemo<Record<string, string>>(
    () => ({
      roles: t("users.roles"),
      statusLabel: t("users.status"),
      joinedDate: t("users.joined"),
      updatedDate: t("users.updated"),
    }),
    [t],
  );

  const table = useReactTable({
    data: users,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
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

  const roleFilter = (table.getColumn("roles")?.getFilterValue() as string) || "all";
  const statusFilter = (table.getColumn("statusLabel")?.getFilterValue() as string) || "all";
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  return (
    <div className="w-full space-y-4">
      <div className="rounded-xl border bg-card/40 p-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("users.searchPlaceholder")}
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="h-10 rounded-lg border-muted-foreground/20 bg-background pl-9"
            />
          </div>
          <div className="min-w-[180px] space-y-2">
            <Label htmlFor="role-filter" className="text-sm font-medium">
              {t("users.role")}
            </Label>
            <Select
              value={roleFilter}
              onValueChange={(value) =>
                table.getColumn("roles")?.setFilterValue(value === "all" ? undefined : value)
              }
            >
              <SelectTrigger className="h-10 w-full cursor-pointer rounded-lg" id="role-filter">
                <SelectValue placeholder={t("users.selectRole")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("users.allRoles")}</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.slug}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[180px] space-y-2">
            <Label htmlFor="status-filter" className="text-sm font-medium">
              {t("users.status")}
            </Label>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                table.getColumn("statusLabel")?.setFilterValue(value === "all" ? undefined : value)
              }
            >
              <SelectTrigger className="h-10 w-full cursor-pointer rounded-lg" id="status-filter">
                <SelectValue placeholder={t("users.selectStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("users.allStatuses")}</SelectItem>
                <SelectItem value="Active">{t("users.active")}</SelectItem>
                <SelectItem value="Inactive">{t("users.inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="ml-auto">
            <div className="min-w-[170px] space-y-2">
              <Label htmlFor="users-column-visibility" className="text-sm font-medium">
                {t("common.columnVisibility")}
              </Label>
              <DropdownMenu>
                <DropdownMenuTrigger
                  id="users-column-visibility"
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
            <UserFormDialog
              mode="create"
              open={createOpen}
              onOpenChange={setCreateOpen}
              onSubmit={onCreateUser}
              isSubmitting={isMutating}
              availableRoles={roles}
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
                await onDeleteUsers(ids);
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
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
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
                  {t("users.noUsers")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex items-center space-x-2">
          <Label htmlFor="page-size" className="text-sm font-medium">
            {t("users.show")}
          </Label>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="w-20 cursor-pointer" id="page-size">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 text-sm text-muted-foreground hidden sm:block">
          {t("users.selectedRows", {
            selected: table.getFilteredSelectedRowModel().rows.length,
            total: table.getFilteredRowModel().rows.length,
          })}
        </div>

        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2 hidden sm:flex">
            <p className="text-sm font-medium">{t("users.page")}</p>
            <strong className="text-sm">
              {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </strong>
          </div>
          <div className="flex items-center space-x-2">
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
      </div>

      <UserFormDialog
        mode="edit"
        open={Boolean(editingUser)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingUser(null);
          }
        }}
        onSubmit={async (values) => {
          if (!editingUser) {
            return;
          }

          await onUpdateUser(editingUser.id, values as UpdateManagedUserInput);
        }}
        isSubmitting={isMutating}
        user={editingUser}
        availableRoles={roles}
      />

      <ConfirmDeleteDialog
        open={Boolean(deletingUser)}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingUser(null);
          }
        }}
        description={
          deletingUser ? t("users.confirmDelete", { name: deletingUser.name }) : ""
        }
        onConfirm={async () => {
          if (!deletingUser) {
            return;
          }

          await onDeleteUser(deletingUser.id);
          setDeletingUser(null);
        }}
        isLoading={isMutating}
      />
    </div>
  );
}
