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
  CreateClientInput,
  ManagedClient,
  UpdateClientInput,
} from "@/lib/clients-admin";
import { useI18n, useLocale } from "@/i18n/provider";

import { ClientFormDialog } from "./client-form-dialog";

type DataTableProps = {
  clients: ManagedClient[];
  onCreateClient: (values: CreateClientInput) => Promise<void>;
  onUpdateClient: (id: string, values: UpdateClientInput) => Promise<void>;
  onDeleteClient: (id: string) => Promise<void>;
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
  isMutating,
}: DataTableProps) {
  const { t } = useI18n();
  const locale = useLocale();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ManagedClient | null>(null);
  const [deletingClient, setDeletingClient] = useState<ManagedClient | null>(null);

  const columns = useMemo<ColumnDef<ManagedClient>[]>(() => [
    {
      accessorKey: "legalName",
      header: t("clients.name"),
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
      header: t("clients.personType"),
      cell: ({ row }) => (
        <Badge variant={row.original.personType === "PJ" ? "default" : "secondary"}>
          {row.original.personType === "PJ" ? t("clients.legalEntity") : t("clients.individual")}
        </Badge>
      ),
      filterFn: "equals",
    },
    {
      accessorKey: "document",
      header: t("clients.document"),
      cell: ({ row }) => (
        <span className="text-sm">
          {formatDocument(row.original.document, row.original.personType)}
        </span>
      ),
    },
    {
      accessorKey: "contactName",
      header: t("clients.contact"),
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{row.original.contactName || "-"}</div>
          <div className="text-muted-foreground">{row.original.contactPhone || "-"}</div>
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: t("clients.email"),
      cell: ({ row }) => <span className="text-sm">{row.original.email || "-"}</span>,
    },
    {
      accessorKey: "location",
      header: t("clients.location"),
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.city} / {row.original.state}
        </span>
      ),
    },
    {
      accessorKey: "updatedAt",
      header: t("clients.updated"),
      cell: ({ row }) => <span className="text-sm">{formatDate(row.original.updatedAt, locale)}</span>,
    },
    {
      id: "actions",
      header: t("clients.actions"),
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
              className="h-8 w-8 cursor-pointer text-red-600"
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
            placeholder={t("clients.searchPlaceholder")}
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-9"
          />
        </div>

        <ClientFormDialog
          mode="create"
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSubmit={onCreateClient}
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
