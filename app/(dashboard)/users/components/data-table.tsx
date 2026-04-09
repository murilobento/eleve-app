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

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AdminFiltersDialog,
  AdminFiltersSection,
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
import type { RoleRecord } from "@/lib/rbac-shared";
import { getSemanticStatusBadgeClass } from "@/lib/status-badge";
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
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);
  const [draftRoleFilter, setDraftRoleFilter] = useState("all");
  const [draftStatusFilter, setDraftStatusFilter] = useState("all");

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
        accessorKey: "status",
        header: ({ column }) => <SortableHeader column={column} title={t("users.status")} className="-ml-3" />,
        cell: ({ row }) => {
          const user = row.original;
          const statusLabel = user.status === "active" ? t("users.active") : t("users.inactive");

          return (
            <Badge variant="secondary" className={getSemanticStatusBadgeClass(user.status)}>
              {statusLabel}
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
  const table = useReactTable({
    data: users,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
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
  const statusFilter = (table.getColumn("status")?.getFilterValue() as string) || "all";
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const activeFilterCount = [roleFilter, statusFilter].filter((value) => value !== "all").length;

  const handleOpenFilters = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraftRoleFilter(roleFilter);
      setDraftStatusFilter(statusFilter);
    }

    setFiltersOpen(nextOpen);
  };

  const handleApplyFilters = () => {
    table.getColumn("roles")?.setFilterValue(draftRoleFilter === "all" ? undefined : draftRoleFilter);
    table.getColumn("status")?.setFilterValue(draftStatusFilter === "all" ? undefined : draftStatusFilter);
    table.setPageIndex(0);
    setFiltersOpen(false);
  };

  const handleClearFilters = () => {
    setColumnFilters([]);
    setDraftRoleFilter("all");
    setDraftStatusFilter("all");
    table.setPageIndex(0);
    setFiltersOpen(false);
  };

  return (
    <div className="w-full space-y-4">
      <AdminListToolbar>
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("users.searchPlaceholder")}
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
                <Label htmlFor="role-filter">{t("users.role")}</Label>
                <Select value={draftRoleFilter} onValueChange={setDraftRoleFilter}>
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

              <div className="space-y-2">
                <Label htmlFor="status-filter">{t("users.status")}</Label>
                <Select value={draftStatusFilter} onValueChange={setDraftStatusFilter}>
                  <SelectTrigger className="h-10 w-full cursor-pointer rounded-lg" id="status-filter">
                    <SelectValue placeholder={t("users.selectStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("users.allStatuses")}</SelectItem>
                    <SelectItem value="active">{t("users.active")}</SelectItem>
                    <SelectItem value="inactive">{t("users.inactive")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AdminFiltersSection>
        </AdminFiltersDialog>

        <div className="ml-auto">
          <UserFormDialog
            mode="create"
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSubmit={onCreateUser}
            isSubmitting={isMutating}
            availableRoles={roles}
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

      <AdminListTableCard>
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
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {t("users.noUsers")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </AdminListTableCard>

      <AdminListPaginationFooter
        countLabel={t("users.selectedRows", {
          selected: table.getFilteredSelectedRowModel().rows.length,
          total: table.getFilteredRowModel().rows.length,
        })}
        previousLabel={t("common.previous")}
        nextLabel={t("common.next")}
        onPreviousPage={() => table.previousPage()}
        onNextPage={() => table.nextPage()}
        canPreviousPage={table.getCanPreviousPage()}
        canNextPage={table.getCanNextPage()}
      />

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
