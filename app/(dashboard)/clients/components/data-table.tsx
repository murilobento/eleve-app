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
import { ChevronDown, EllipsisVertical, Eye, Pencil, Search, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AdminListPaginationFooter,
  AdminListTableCard,
  AdminListToolbar,
} from "@/components/admin-list-layout";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { EntityDetailsDialog } from "@/components/entity-details-dialog";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  CreateClientInput,
  ManagedClient,
  UpdateClientInput,
} from "@/lib/clients-admin";
import { getSemanticStatusBadgeClass } from "@/lib/status-badge";
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
  const { columnVisibility, setColumnVisibility } = usePersistentColumnVisibility("table:clients:columns:v4", {
    updatedAt: false,
    personType: false,
    document: false,
    email: false,
  });
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewingClient, setViewingClient] = useState<ManagedClient | null>(null);
  const [editingClient, setEditingClient] = useState<ManagedClient | null>(null);
  const [deletingClient, setDeletingClient] = useState<ManagedClient | null>(null);

  const getDisplayValue = (value?: string | null) => {
    if (!value?.trim()) {
      return t("common.notProvided");
    }

    return value;
  };

  const renderLinkValue = (value?: string | null, href?: string) => {
    if (!value?.trim() || !href) {
      return getDisplayValue(value);
    }

    return (
      <a className="text-primary underline-offset-4 hover:underline" href={href} target="_blank" rel="noreferrer">
        {value}
      </a>
    );
  };

  const clientDetailsSections = viewingClient ? [
    {
      title: t("common.registrationData"),
      fields: [
        { label: t("clients.name"), value: getDisplayValue(viewingClient.legalName) },
        { label: t("clients.tradeName"), value: getDisplayValue(viewingClient.tradeName) },
        {
          label: t("clients.personType"),
          value: viewingClient.personType === "PF" ? t("clients.individual") : t("clients.legalEntity"),
        },
        { label: t("clients.document"), value: formatDocument(viewingClient.document, viewingClient.personType) },
      ],
    },
    {
      title: t("common.contactInfo"),
      fields: [
        { label: t("clients.contactName"), value: getDisplayValue(viewingClient.contactName) },
        { label: t("clients.contactPhone"), value: getDisplayValue(viewingClient.contactPhone) },
        { label: t("clients.phone"), value: getDisplayValue(viewingClient.phone) },
        { label: t("clients.email"), value: renderLinkValue(viewingClient.email, viewingClient.email ? `mailto:${viewingClient.email}` : undefined) },
        { label: t("clients.website"), value: renderLinkValue(viewingClient.website, viewingClient.website ?? undefined), fullWidth: true },
      ],
    },
    {
      title: t("common.addressInfo"),
      fields: [
        {
          label: t("common.addressInfo"),
          value: `${viewingClient.street}, ${viewingClient.number}${viewingClient.complement ? ` - ${viewingClient.complement}` : ""}`,
          fullWidth: true,
        },
        { label: t("clients.postalCode"), value: getDisplayValue(viewingClient.postalCode) },
        { label: t("clients.district"), value: getDisplayValue(viewingClient.district) },
        { label: t("clients.city"), value: getDisplayValue(viewingClient.city) },
        { label: t("clients.state"), value: getDisplayValue(viewingClient.state) },
        { label: t("clients.country"), value: getDisplayValue(viewingClient.country) },
      ],
    },
    {
      title: t("common.recordInfo"),
      fields: [
        { label: "ID", value: viewingClient.id },
        { label: t("common.created"), value: formatDate(viewingClient.createdAt, locale) },
        { label: t("clients.updated"), value: formatDate(viewingClient.updatedAt, locale) },
      ],
    },
  ] : [];

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
        <Badge variant="outline">
          {row.original.personType}
        </Badge>
      ),
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
      accessorKey: "status",
      header: ({ column }) => <SortableHeader column={column} title={t("clients.status")} className="-ml-3" />,
      cell: ({ row }) => {
        const isActive = row.original.status === "active";

        return (
          <Badge variant="secondary" className={getSemanticStatusBadgeClass(row.original.status)}>
            {isActive ? t("clients.active") : t("clients.inactive")}
          </Badge>
        );
      },
      filterFn: "equals",
    },
    {
      id: "actions",
      header: t("clients.actions"),
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const client = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" disabled={isMutating}>
                <EllipsisVertical className="size-4" />
                <span className="sr-only">{t("clients.actions")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="cursor-pointer" onClick={() => setViewingClient(client)}>
                <Eye className="mr-2 size-4" />
                {t("common.details")}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => setEditingClient(client)}>
                <Pencil className="mr-2 size-4" />
                {t("clients.editClient")}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                className="cursor-pointer"
                onClick={() => setDeletingClient(client)}
              >
                <Trash2 className="mr-2 size-4" />
                {t("common.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [isMutating, locale, t]);

  const columnVisibilityLabels = useMemo<Record<string, string>>(
    () => ({
      personType: t("clients.personType"),
      status: t("clients.status"),
      document: t("clients.document"),
      contactName: t("clients.contactName"),
      email: t("clients.email"),
      location: t("clients.location"),
      updatedAt: t("clients.updated"),
    }),
    [t]
  );

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
  const hasActiveFilters = Boolean(globalFilter.trim()) || columnFilters.length > 0;

  const handleClearFilters = () => {
    setGlobalFilter("");
    setColumnFilters([]);
    table.setPageIndex(0);
  };

  const shouldIgnoreRowClick = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return Boolean(
      target.closest(
        'button, a, input, select, textarea, [role="checkbox"], [role="menu"], [role="menuitem"], [data-no-row-click="true"]',
      ),
    );
  };

  return (
    <div className="w-full space-y-4">
      <AdminListToolbar>
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
            <div className="min-w-[180px] space-y-2">
              <Label htmlFor="clients-column-visibility" className="text-sm font-medium">
                {t("common.columnVisibility")}
              </Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    id="clients-column-visibility"
                    variant="outline"
                    size="lg"
                    className="h-10 w-full cursor-pointer justify-between rounded-lg px-3"
                  >
                    {t("common.columns")} <ChevronDown className="size-4" />
                  </Button>
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

          <div className="w-full min-w-[160px] space-y-2 sm:w-auto">
            <Label className="text-sm font-medium text-transparent">
              {t("common.clearFilters")}
            </Label>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full cursor-pointer rounded-lg sm:w-auto"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
            >
              {t("common.clearFilters")}
            </Button>
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
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="cursor-pointer"
                  onClick={(event) => {
                    if (shouldIgnoreRowClick(event.target)) {
                      return;
                    }

                    setViewingClient(row.original);
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      data-no-row-click={cell.column.id === "select" || cell.column.id === "actions" ? "true" : undefined}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {t("clients.noClients")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </AdminListTableCard>

      <AdminListPaginationFooter
        countLabel={t("clients.clientCount", { count: table.getFilteredRowModel().rows.length })}
        previousLabel={t("common.previous")}
        nextLabel={t("common.next")}
        onPreviousPage={() => table.previousPage()}
        onNextPage={() => table.nextPage()}
        canPreviousPage={table.getCanPreviousPage()}
        canNextPage={table.getCanNextPage()}
      />

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

      <EntityDetailsDialog
        open={Boolean(viewingClient)}
        onOpenChange={(open) => {
          if (!open) {
            setViewingClient(null);
          }
        }}
        title={viewingClient?.legalName ?? ""}
        description={t("clients.detailsDescription")}
        subtitle={viewingClient ? (viewingClient.tradeName || viewingClient.contactName || viewingClient.email || null) : null}
        badges={viewingClient ? [
          <Badge key="personType" variant="outline">
            {viewingClient.personType === "PF" ? t("clients.individual") : t("clients.legalEntity")}
          </Badge>,
          <Badge
            key="status"
            variant="secondary"
            className={getSemanticStatusBadgeClass(viewingClient.status)}
          >
            {viewingClient.status === "active" ? t("clients.active") : t("clients.inactive")}
          </Badge>,
        ] : []}
        sections={clientDetailsSections}
        footer={viewingClient ? (
          <div className="flex justify-end">
            <Button
              className="cursor-pointer"
              onClick={() => {
                setEditingClient(viewingClient);
                setViewingClient(null);
              }}
            >
              <Pencil className="mr-2 size-4" />
              {t("clients.editClient")}
            </Button>
          </div>
        ) : null}
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
