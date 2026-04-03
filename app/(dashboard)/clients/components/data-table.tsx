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
  CreateClientInput,
  ManagedClient,
  UpdateClientInput,
} from "@/lib/clients-admin";
import { usePersistentColumnVisibility } from "@/hooks/use-persistent-column-visibility";
import { useI18n, useLocale } from "@/i18n/provider";

import { ClientFormDialog } from "./client-form-dialog";

type DataTableProps = {
  clients: ManagedClient[];
  onCreateClient: (values: CreateClientInput) => Promise<void>;
  onUpdateClient: (id: string, values: UpdateClientInput) => Promise<void>;
  onDeleteClient: (id: string) => Promise<void>;
  onDeleteClients: (ids: string[]) => Promise<void>;
  isMutating: boolean;
};

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDocument(value: string, personType: "PF" | "PJ") {
  if (personType === "PF" && value.length === 11) {
    return value.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  }

  if (personType === "PJ" && value.length === 14) {
    return value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  }

  return value;
}

export function DataTable({
  clients,
  onCreateClient,
  onUpdateClient,
  onDeleteClient,
  onDeleteClients,
  isMutating,
}: DataTableProps) {
  const { t } = useI18n();
  const locale = useLocale();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const { columnVisibility, setColumnVisibility } = usePersistentColumnVisibility("table:clients:columns");
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ManagedClient | null>(null);
  const [deletingClient, setDeletingClient] = useState<ManagedClient | null>(null);

  const columns = useMemo<ColumnDef<ManagedClient>[]>(() => [
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
      accessorKey: "legalName",
      header: ({ column }) => <SortableHeader column={column} title={t("clients.name")} className="-ml-3" />,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-medium">{row.original.legalName}</div>
          <div className="text-sm text-muted-foreground">
            {row.original.tradeName || row.original.contactName || row.original.email || "-"}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "personType",
      header: ({ column }) => <SortableHeader column={column} title={t("clients.personType")} className="-ml-3" />,
      cell: ({ row }) => (
        <Badge variant={row.original.personType === "PJ" ? "default" : "secondary"}>
          {row.original.personType === "PJ" ? t("clients.legalEntity") : t("clients.individual")}
        </Badge>
      ),
      filterFn: "equals",
    },
    {
      accessorKey: "status",
      header: ({ column }) => <SortableHeader column={column} title={t("clients.status")} className="-ml-3" />,
      cell: ({ row }) => {
        const isActive = row.original.status === "active";
        const className = isActive
          ? "text-primary bg-primary/10"
          : "text-destructive bg-destructive/10";

        return (
          <Badge variant="secondary" className={className}>
            {isActive ? t("clients.active") : t("clients.inactive")}
          </Badge>
        );
      },
      filterFn: "equals",
    },
    {
      accessorKey: "document",
      header: ({ column }) => <SortableHeader column={column} title={t("clients.document")} className="-ml-3" />,
      cell: ({ row }) => (
        <span className="text-sm">
          {formatDocument(row.original.document, row.original.personType)}
        </span>
      ),
    },
    {
      accessorKey: "contactName",
      header: ({ column }) => <SortableHeader column={column} title={t("clients.contact")} className="-ml-3" />,
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{row.original.contactName || "-"}</div>
          <div className="text-muted-foreground">{row.original.contactPhone || "-"}</div>
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: ({ column }) => <SortableHeader column={column} title={t("clients.email")} className="-ml-3" />,
      cell: ({ row }) => <span className="text-sm">{row.original.email || "-"}</span>,
    },
    {
      accessorKey: "location",
      header: ({ column }) => <SortableHeader column={column} title={t("clients.location")} className="-ml-3" />,
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.city} / {row.original.state}
        </span>
      ),
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => <SortableHeader column={column} title={t("clients.updated")} className="-ml-3" />,
      cell: ({ row }) => <span className="text-sm">{formatDate(row.original.updatedAt, locale)}</span>,
    },
    {
      id: "actions",
      header: t("clients.actions"),
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const client = row.original;

        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer"
              onClick={() => setEditingClient(client)}
              disabled={isMutating}
            >
              <Pencil className="size-4" />
              <span className="sr-only">{t("clients.editClient")}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer text-destructive"
              onClick={() => setDeletingClient(client)}
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
    data: clients,
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
        row.original.legalName,
        row.original.tradeName ?? "",
        row.original.contactName ?? "",
        row.original.contactPhone ?? "",
        row.original.document,
        row.original.email ?? "",
        row.original.city,
        row.original.state,
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

  const personTypeFilter = (table.getColumn("personType")?.getFilterValue() as string) || "all";
  const statusFilter = (table.getColumn("status")?.getFilterValue() as string) || "all";
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  return (
    <div className="w-full space-y-4">
      <div className="rounded-xl border bg-card/40 p-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("clients.searchPlaceholder")}
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="h-10 rounded-lg border-muted-foreground/20 bg-background pl-9"
            />
          </div>

          <div className="min-w-[180px] space-y-2">
            <Label htmlFor="client-person-type-filter" className="text-sm font-medium">
              {t("clients.personType")}
            </Label>
            <Select
              value={personTypeFilter}
              onValueChange={(value) =>
                table.getColumn("personType")?.setFilterValue(value === "all" ? undefined : value)
              }
            >
              <SelectTrigger className="h-10 w-full cursor-pointer rounded-lg" id="client-person-type-filter">
                <SelectValue placeholder={t("clients.selectPersonType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("clients.allPersonTypes")}</SelectItem>
                <SelectItem value="PF">{t("clients.individual")}</SelectItem>
                <SelectItem value="PJ">{t("clients.legalEntity")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[180px] space-y-2">
            <Label htmlFor="client-status-filter" className="text-sm font-medium">
              {t("clients.status")}
            </Label>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                table.getColumn("status")?.setFilterValue(value === "all" ? undefined : value)
              }
            >
              <SelectTrigger className="h-10 w-full cursor-pointer rounded-lg" id="client-status-filter">
                <SelectValue placeholder={t("clients.selectStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("clients.allStatuses")}</SelectItem>
                <SelectItem value="active">{t("clients.active")}</SelectItem>
                <SelectItem value="inactive">{t("clients.inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="ml-auto">
            <div className="min-w-[170px] space-y-2">
              <Label htmlFor="clients-column-visibility" className="text-sm font-medium">
                {t("common.columnVisibility")}
              </Label>
              <DropdownMenu>
                <DropdownMenuTrigger
                  id="clients-column-visibility"
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
            <ClientFormDialog
              mode="create"
              open={createOpen}
              onOpenChange={setCreateOpen}
              onSubmit={onCreateClient}
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
                const ids = table.getSelectedRowModel().rows.map((row) => row.original.id);
                if (!ids.length) {
                  return;
                }
                await onDeleteClients(ids);
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
                  {t("clients.noClients")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-4 py-4">
        <div className="text-sm text-muted-foreground">
          {t("clients.clientCount", { count: table.getFilteredRowModel().rows.length })}
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

      <ClientFormDialog
        mode="edit"
        open={Boolean(editingClient)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingClient(null);
          }
        }}
        onSubmit={async (values) => {
          if (!editingClient) {
            return;
          }

          await onUpdateClient(editingClient.id, values as UpdateClientInput);
        }}
        isSubmitting={isMutating}
        client={editingClient}
      />

      <ConfirmDeleteDialog
        open={Boolean(deletingClient)}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingClient(null);
          }
        }}
        description={deletingClient ? t("clients.confirmDelete", { name: deletingClient.legalName }) : ""}
        onConfirm={async () => {
          if (!deletingClient) {
            return;
          }

          await onDeleteClient(deletingClient.id);
          setDeletingClient(null);
        }}
        isLoading={isMutating}
      />
    </div>
  );
}
