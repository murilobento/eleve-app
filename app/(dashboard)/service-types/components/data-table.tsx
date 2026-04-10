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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SortableHeader } from "@/components/sortable-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useResourcePermissions } from "@/hooks/use-resource-permissions";
import { useI18n, useLocale } from "@/i18n/provider";
import type { EquipmentOption } from "@/lib/equipment-admin";
import type {
  CreateServiceTypeInput,
  ManagedServiceType,
  UpdateServiceTypeInput,
} from "@/lib/service-types-admin";
import { getSemanticStatusBadgeClass } from "@/lib/status-badge";

import { ServiceTypeFormDialog } from "./service-type-form-dialog";

type DataTableProps = {
  serviceTypes: ManagedServiceType[];
  equipment: EquipmentOption[];
  onCreateServiceType: (values: CreateServiceTypeInput) => Promise<void>;
  onUpdateServiceType: (id: string, values: UpdateServiceTypeInput) => Promise<void>;
  onDeleteServiceType: (id: string) => Promise<void>;
  onDeleteServiceTypes: (ids: string[]) => Promise<void>;
  isMutating: boolean;
};

const billingUnits = [
  "hour",
  "daily",
  "monthly",
  "annual",
  "km",
  "freight",
  "mobilization_demobilization",
  "counterweight_transport",
] as const;

function formatMoney(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function DataTable({
  serviceTypes,
  equipment,
  onCreateServiceType,
  onUpdateServiceType,
  onDeleteServiceType,
  onDeleteServiceTypes,
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
  const [editingServiceType, setEditingServiceType] = useState<ManagedServiceType | null>(null);
  const [deletingServiceType, setDeletingServiceType] = useState<ManagedServiceType | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [draftBillingUnitFilter, setDraftBillingUnitFilter] = useState("all");
  const [draftStatusFilter, setDraftStatusFilter] = useState("all");
  const { canCreate, canUpdate, canDelete } = useResourcePermissions("service-types");
  const canSelectRows = canDelete;

  const columns = useMemo<ColumnDef<ManagedServiceType>[]>(() => {
    const nextColumns: ColumnDef<ManagedServiceType>[] = [];

    if (canSelectRows) {
      nextColumns.push({
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
      });
    }

    nextColumns.push({
      accessorKey: "name",
      header: ({ column }) => <SortableHeader column={column} title={t("serviceTypes.name")} className="-ml-3" />,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-medium">{row.original.name}</div>
          <div className="text-sm text-muted-foreground">
            {row.original.description || t("serviceTypes.noDescription")}
          </div>
        </div>
      ),
    });
    nextColumns.push({
      accessorKey: "billingUnit",
      header: ({ column }) => <SortableHeader column={column} title={t("serviceTypes.billingUnit")} className="-ml-3" />,
      cell: ({ row }) => <Badge variant="outline">{t(`serviceTypes.billingUnits.${row.original.billingUnit}`)}</Badge>,
      filterFn: "equals",
    });
    nextColumns.push({
      accessorKey: "baseValue",
      header: ({ column }) => <SortableHeader column={column} title={t("serviceTypes.baseValue")} className="-ml-3" />,
      cell: ({ row }) => <span className="text-sm font-medium">{formatMoney(row.original.baseValue, locale)}</span>,
    });
    nextColumns.push({
      accessorKey: "equipmentCount",
      header: ({ column }) => (
        <SortableHeader column={column} title={t("serviceTypes.linkedEquipment")} className="-ml-3" />
      ),
      cell: ({ row }) => (
        <div className="space-y-1">
          <Badge variant="secondary">{row.original.equipmentCount}</Badge>
          {row.original.equipment.length > 0 ? (
            <div className="text-xs text-muted-foreground">
              {row.original.equipment.slice(0, 2).map((item) => item.name).join(", ")}
              {row.original.equipment.length > 2 ? ` +${row.original.equipment.length - 2}` : ""}
            </div>
          ) : null}
        </div>
      ),
    });
    nextColumns.push({
      accessorKey: "status",
      header: ({ column }) => <SortableHeader column={column} title={t("serviceTypes.status")} className="-ml-3" />,
      cell: ({ row }) => {
        const isActive = row.original.status === "active";

        return (
          <Badge variant="secondary" className={getSemanticStatusBadgeClass(row.original.status)}>
            {isActive ? t("serviceTypes.active") : t("serviceTypes.inactive")}
          </Badge>
        );
      },
      filterFn: "equals",
    });
    if (canUpdate || canDelete) {
      nextColumns.push({
        id: "actions",
        header: t("serviceTypes.actions"),
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const serviceType = row.original;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" disabled={isMutating}>
                  <EllipsisVertical className="size-4" />
                  <span className="sr-only">{t("serviceTypes.actions")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canUpdate ? (
                  <DropdownMenuItem className="cursor-pointer" onClick={() => setEditingServiceType(serviceType)}>
                    <Pencil className="mr-2 size-4" />
                    {t("serviceTypes.editType")}
                  </DropdownMenuItem>
                ) : null}
                {canDelete ? (
                  <DropdownMenuItem
                    variant="destructive"
                    className="cursor-pointer"
                    onClick={() => setDeletingServiceType(serviceType)}
                  >
                    <Trash2 className="mr-2 size-4" />
                    {t("common.delete")}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      });
    }

    return nextColumns;
  }, [canDelete, canSelectRows, canUpdate, isMutating, locale, t]);

  const table = useReactTable({
    data: serviceTypes,
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

      return [
        row.original.name,
        row.original.description ?? "",
        ...row.original.equipment.map((item) => `${item.name} ${item.brand} ${item.model}`),
      ].some((item) => item.toLowerCase().includes(value));
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
  const billingUnitFilter = (table.getColumn("billingUnit")?.getFilterValue() as string | undefined) ?? "all";
  const statusFilter = (table.getColumn("status")?.getFilterValue() as string | undefined) ?? "all";
  const activeFilterCount = [billingUnitFilter, statusFilter].filter((value) => value !== "all").length;

  const handleOpenFilters = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraftBillingUnitFilter(billingUnitFilter);
      setDraftStatusFilter(statusFilter);
    }

    setFiltersOpen(nextOpen);
  };

  const handleApplyFilters = () => {
    table.getColumn("billingUnit")?.setFilterValue(draftBillingUnitFilter === "all" ? undefined : draftBillingUnitFilter);
    table.getColumn("status")?.setFilterValue(draftStatusFilter === "all" ? undefined : draftStatusFilter);
    table.setPageIndex(0);
    setFiltersOpen(false);
  };

  const handleClearFilters = () => {
    setColumnFilters([]);
    setDraftBillingUnitFilter("all");
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
            placeholder={t("serviceTypes.searchPlaceholder")}
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
                <Label htmlFor="service-type-unit-filter">{t("serviceTypes.billingUnit")}</Label>
                <Select value={draftBillingUnitFilter} onValueChange={setDraftBillingUnitFilter}>
                  <SelectTrigger className="h-10 w-full cursor-pointer rounded-lg" id="service-type-unit-filter">
                    <SelectValue placeholder={t("serviceTypes.selectBillingUnit")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("serviceTypes.allBillingUnits")}</SelectItem>
                    {billingUnits.map((billingUnit) => (
                      <SelectItem key={billingUnit} value={billingUnit}>
                        {t(`serviceTypes.billingUnits.${billingUnit}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-type-status-filter">{t("serviceTypes.status")}</Label>
                <Select value={draftStatusFilter} onValueChange={setDraftStatusFilter}>
                  <SelectTrigger className="h-10 w-full cursor-pointer rounded-lg" id="service-type-status-filter">
                    <SelectValue placeholder={t("serviceTypes.selectStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("serviceTypes.allStatuses")}</SelectItem>
                    <SelectItem value="active">{t("serviceTypes.active")}</SelectItem>
                    <SelectItem value="inactive">{t("serviceTypes.inactive")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AdminFiltersSection>
        </AdminFiltersDialog>

        <div className="ml-auto">
          {canCreate ? (
            <ServiceTypeFormDialog
              mode="create"
              open={createOpen}
              onOpenChange={setCreateOpen}
              onSubmit={onCreateServiceType}
              isSubmitting={isMutating}
              equipment={equipment}
            />
          ) : null}
        </div>
      </AdminListToolbar>

      {canDelete && selectedCount > 0 ? (
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
              onClick={() => setBulkDeleteOpen(true)}
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
                  {t("serviceTypes.noTypes")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </AdminListTableCard>

      <AdminListPaginationFooter
        countLabel={t("serviceTypes.typeCount", { count: table.getFilteredRowModel().rows.length })}
        previousLabel={t("common.previous")}
        nextLabel={t("common.next")}
        onPreviousPage={() => table.previousPage()}
        onNextPage={() => table.nextPage()}
        canPreviousPage={table.getCanPreviousPage()}
        canNextPage={table.getCanNextPage()}
      />

      {canUpdate ? (
        <ServiceTypeFormDialog
          mode="edit"
          open={Boolean(editingServiceType)}
          onOpenChange={(open) => {
            if (!open) {
              setEditingServiceType(null);
            }
          }}
          onSubmit={async (values) => {
            if (!editingServiceType) {
              return;
            }

            await onUpdateServiceType(editingServiceType.id, values);
            setEditingServiceType(null);
          }}
          isSubmitting={isMutating}
          serviceType={editingServiceType}
          equipment={equipment}
        />
      ) : null}

      {canDelete ? (
        <>
          <ConfirmDeleteDialog
            open={bulkDeleteOpen}
            onOpenChange={setBulkDeleteOpen}
            description={t("serviceTypes.confirmBulkDelete", { count: selectedCount })}
            onConfirm={async () => {
              const ids = table.getSelectedRowModel().rows.map((row) => row.original.id);
              if (!ids.length) {
                return;
              }

              await onDeleteServiceTypes(ids);
              table.resetRowSelection();
              setBulkDeleteOpen(false);
            }}
            isLoading={isMutating}
          />

          <ConfirmDeleteDialog
            open={Boolean(deletingServiceType)}
            onOpenChange={(open) => {
              if (!open) {
                setDeletingServiceType(null);
              }
            }}
            description={deletingServiceType
              ? t("serviceTypes.confirmDelete", { name: deletingServiceType.name })
              : ""}
            onConfirm={async () => {
              if (!deletingServiceType) {
                return;
              }

              await onDeleteServiceType(deletingServiceType.id);
              setDeletingServiceType(null);
            }}
            isLoading={isMutating}
          />
        </>
      ) : null}
    </div>
  );
}
