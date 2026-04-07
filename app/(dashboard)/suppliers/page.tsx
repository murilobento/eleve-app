"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type FieldErrors } from "react-hook-form";
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
import { ChevronDown, EllipsisVertical, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AdminListPaginationFooter,
  AdminListTableCard,
  AdminListToolbar,
} from "@/components/admin-list-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
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
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePersistentColumnVisibility } from "@/hooks/use-persistent-column-visibility";
import { useI18n, useLocale } from "@/i18n/provider";
import type {
  CnpjLookupResult,
  CreateSupplierInput,
  ManagedSupplier,
  PostalCodeLookupResult,
  UpdateSupplierInput,
} from "@/lib/suppliers-admin";
import {
  createSupplierSchema,
  updateSupplierSchema,
} from "@/lib/suppliers-admin";
import { formatCnpj, formatCpf, formatPhone, formatPostalCode } from "@/lib/utils";

type SuppliersResponse = {
  suppliers: ManagedSupplier[];
};

type DocumentLookupResponse = {
  document: CnpjLookupResult;
};

type PostalCodeLookupResponse = {
  postalCode: PostalCodeLookupResult;
};

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed.");
  }

  return payload as T;
}

function formatSupplierDocument(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length > 11 ? formatCnpj(digits) : formatCpf(digits);
}

function findFirstErrorMessage(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  if ("message" in value && typeof value.message === "string" && value.message.length > 0) {
    return value.message;
  }

  for (const entry of Object.values(value)) {
    const message = findFirstErrorMessage(entry);
    if (message) {
      return message;
    }
  }

  return null;
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function SuppliersPage() {
  const { t } = useI18n();
  const locale = useLocale();
  const [suppliers, setSuppliers] = useState<ManagedSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const { columnVisibility, setColumnVisibility } = usePersistentColumnVisibility("table:suppliers:columns:v2", {
    updatedAt: false,
    document: false,
    email: false,
  });
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedSupplier | null>(null);
  const [deleting, setDeleting] = useState<ManagedSupplier | null>(null);
  const [isLookingUpDocument, setIsLookingUpDocument] = useState(false);
  const [isLookingUpPostalCode, setIsLookingUpPostalCode] = useState(false);

  const isEdit = Boolean(editing);
  const schema = isEdit ? updateSupplierSchema : createSupplierSchema;
  const open = createOpen || isEdit;

  const form = useForm<CreateSupplierInput | UpdateSupplierInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      supplierType: "workshop",
      status: "active",
      legalName: "",
      tradeName: "",
      document: "",
      contactName: "",
      contactPhone: "",
      email: "",
      phone: "",
      website: "",
      postalCode: "",
      street: "",
      number: "",
      complement: "",
      district: "",
      city: "",
      state: "",
      country: "Brasil",
    },
  });

  async function loadSuppliers() {
    setLoading(true);
    try {
      const payload = await parseResponse<SuppliersResponse>(await fetch("/api/suppliers", { cache: "no-store" }));
      setSuppliers(payload.suppliers);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("suppliers.loadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSuppliers();
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset({
      supplierType: editing?.supplierType ?? "workshop",
      status: editing?.status ?? "active",
      legalName: editing?.legalName ?? "",
      tradeName: editing?.tradeName ?? "",
      document: formatSupplierDocument(editing?.document ?? ""),
      contactName: editing?.contactName ?? "",
      contactPhone: editing?.contactPhone ? formatPhone(editing.contactPhone) : "",
      email: editing?.email ?? "",
      phone: formatPhone(editing?.phone ?? ""),
      website: editing?.website ?? "",
      postalCode: formatPostalCode(editing?.postalCode ?? ""),
      street: editing?.street ?? "",
      number: editing?.number ?? "",
      complement: editing?.complement ?? "",
      district: editing?.district ?? "",
      city: editing?.city ?? "",
      state: editing?.state ?? "",
      country: editing?.country ?? "Brasil",
    });
  }, [editing, form, open]);

  async function runMutation(operation: () => Promise<void>, successMessage: string) {
    setIsMutating(true);

    try {
      await operation();
      await loadSuppliers();
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("suppliers.updateError"));
      throw error;
    } finally {
      setIsMutating(false);
    }
  }

  async function handleDeleteSuppliers(ids: string[]) {
    if (!ids.length) {
      return;
    }

    setIsMutating(true);

    try {
      const results = await Promise.allSettled(
        ids.map(async (id) => {
          await parseResponse(
            await fetch(`/api/suppliers/${id}`, {
              method: "DELETE",
            }),
          );
        }),
      );

      const successCount = results.filter((result) => result.status === "fulfilled").length;
      const failedCount = ids.length - successCount;

      await loadSuppliers();

      if (successCount > 0) {
        toast.success(t("common.bulkDeleteSuccess", { count: successCount }));
      }

      if (failedCount > 0) {
        toast.error(t("common.bulkDeletePartialError", { failed: failedCount, total: ids.length }));
      }
    } finally {
      setIsMutating(false);
    }
  }

  function closeDialog() {
    setCreateOpen(false);
    setEditing(null);
    form.reset();
  }

  async function handleDocumentLookup() {
    const document = form.getValues("document").replace(/\D/g, "");
    form.clearErrors("document");

    if (document.length !== 14) {
      toast.error(t("suppliers.cnpjInvalid"));
      return;
    }

    setIsLookingUpDocument(true);
    try {
      const payload = await parseResponse<DocumentLookupResponse>(
        await fetch(`/api/suppliers/document?cnpj=${document}`, {
          cache: "no-store",
        }),
      );

      form.setValue("document", formatCnpj(payload.document.document), { shouldDirty: true, shouldValidate: true });
      form.setValue("legalName", payload.document.legalName, { shouldDirty: true, shouldValidate: true });
      form.setValue("tradeName", payload.document.tradeName, { shouldDirty: true });
      form.setValue("email", payload.document.email ?? "", { shouldDirty: true, shouldValidate: true });
      form.setValue("phone", formatPhone(payload.document.phone), { shouldDirty: true, shouldValidate: true });
      form.setValue("postalCode", formatPostalCode(payload.document.postalCode), { shouldDirty: true, shouldValidate: true });
      form.setValue("street", payload.document.street, { shouldDirty: true, shouldValidate: true });
      form.setValue("number", payload.document.number, { shouldDirty: true, shouldValidate: true });
      form.setValue("complement", payload.document.complement, { shouldDirty: true });
      form.setValue("district", payload.document.district, { shouldDirty: true, shouldValidate: true });
      form.setValue("city", payload.document.city, { shouldDirty: true, shouldValidate: true });
      form.setValue("state", payload.document.state, { shouldDirty: true, shouldValidate: true });
      toast.success(t("suppliers.cnpjLookupSuccess"));
    } catch (lookupError) {
      const message = lookupError instanceof Error ? lookupError.message : t("suppliers.cnpjLookupError");
      toast.error(message);
    } finally {
      setIsLookingUpDocument(false);
    }
  }

  async function handlePostalCodeLookup() {
    const postalCode = form.getValues("postalCode").replace(/\D/g, "");

    if (postalCode.length !== 8) {
      toast.error(t("suppliers.postalCodeInvalid"));
      return;
    }

    setIsLookingUpPostalCode(true);
    try {
      const payload = await parseResponse<PostalCodeLookupResponse>(
        await fetch(`/api/suppliers/postal-code?postalCode=${postalCode}`, {
          cache: "no-store",
        }),
      );

      form.setValue("postalCode", formatPostalCode(payload.postalCode.postalCode), { shouldDirty: true, shouldValidate: true });
      form.setValue("street", payload.postalCode.street, { shouldDirty: true, shouldValidate: true });
      form.setValue("district", payload.postalCode.district, { shouldDirty: true, shouldValidate: true });
      form.setValue("city", payload.postalCode.city, { shouldDirty: true, shouldValidate: true });
      form.setValue("state", payload.postalCode.state, { shouldDirty: true, shouldValidate: true });
      toast.success(t("suppliers.postalCodeLookupSuccess"));
    } catch (lookupError) {
      const message = lookupError instanceof Error ? lookupError.message : t("suppliers.postalCodeLookupError");
      toast.error(message);
    } finally {
      setIsLookingUpPostalCode(false);
    }
  }

  async function handleSubmit(values: CreateSupplierInput | UpdateSupplierInput) {
    const path = editing ? `/api/suppliers/${editing.id}` : "/api/suppliers";
    const method = editing ? "PUT" : "POST";

    await runMutation(async () => {
      await parseResponse(
        await fetch(path, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        }),
      );
    }, editing ? t("common.supplierUpdateSuccess") : t("common.supplierCreateSuccess"));

    closeDialog();
  }

  function handleInvalidSubmit(errors: FieldErrors<CreateSupplierInput | UpdateSupplierInput>) {
    const message = findFirstErrorMessage(errors) ?? t("suppliers.updateError");
    toast.error(message);
  }

  const columns = useMemo<ColumnDef<ManagedSupplier>[]>(() => [
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
      header: ({ column }) => <SortableHeader column={column} title={t("suppliers.name")} className="-ml-3" />,
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
      accessorKey: "supplierType",
      header: ({ column }) => <SortableHeader column={column} title={t("suppliers.type")} className="-ml-3" />,
      cell: ({ row }) => <Badge variant="outline">{t(`suppliers.types.${row.original.supplierType}`)}</Badge>,
      filterFn: "equals",
    },
    {
      accessorKey: "document",
      header: ({ column }) => <SortableHeader column={column} title={t("suppliers.document")} className="-ml-3" />,
      cell: ({ row }) => <span className="text-sm">{formatSupplierDocument(row.original.document)}</span>,
    },
    {
      accessorKey: "contactName",
      header: ({ column }) => <SortableHeader column={column} title={t("suppliers.contactName")} className="-ml-3" />,
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{row.original.contactName || "-"}</div>
          <div className="text-muted-foreground">{row.original.contactPhone || "-"}</div>
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: ({ column }) => <SortableHeader column={column} title={t("suppliers.email")} className="-ml-3" />,
      cell: ({ row }) => <span className="text-sm">{row.original.email || "-"}</span>,
    },
    {
      accessorKey: "location",
      header: ({ column }) => <SortableHeader column={column} title={t("suppliers.location")} className="-ml-3" />,
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.city} / {row.original.state}
        </span>
      ),
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => <SortableHeader column={column} title={t("suppliers.updated")} className="-ml-3" />,
      cell: ({ row }) => <span className="text-sm">{formatDate(row.original.updatedAt, locale)}</span>,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <SortableHeader column={column} title={t("suppliers.status")} className="-ml-3" />,
      cell: ({ row }) => {
        const isActive = row.original.status === "active";
        const className = isActive ? "text-primary bg-primary/10" : "text-destructive bg-destructive/10";

        return (
          <Badge variant="secondary" className={className}>
            {isActive ? t("suppliers.active") : t("suppliers.inactive")}
          </Badge>
        );
      },
      filterFn: "equals",
    },
    {
      id: "actions",
      header: t("suppliers.actions"),
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const supplier = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" disabled={isMutating}>
                <EllipsisVertical className="size-4" />
                <span className="sr-only">{t("suppliers.actions")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="cursor-pointer" onClick={() => setEditing(supplier)}>
                <Pencil className="mr-2 size-4" />
                {t("suppliers.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                className="cursor-pointer"
                onClick={() => setDeleting(supplier)}
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
      supplierType: t("suppliers.type"),
      status: t("suppliers.status"),
      document: t("suppliers.document"),
      contactName: t("suppliers.contactName"),
      email: t("suppliers.email"),
      location: t("suppliers.location"),
      updatedAt: t("suppliers.updated"),
    }),
    [t],
  );

  const table = useReactTable({
    data: suppliers,
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

  const typeFilter = (table.getColumn("supplierType")?.getFilterValue() as string) || "all";
  const statusFilter = (table.getColumn("status")?.getFilterValue() as string) || "all";
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const hasActiveFilters = Boolean(globalFilter.trim()) || columnFilters.length > 0;

  const handleClearFilters = () => {
    setGlobalFilter("");
    setColumnFilters([]);
    table.setPageIndex(0);
  };

  return (
    <>
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{t("suppliers.title")}</h1>
          <p className="text-muted-foreground">{t("suppliers.description")}</p>
        </div>
      </div>

      <div className="@container/main mt-2 space-y-4 px-4 lg:mt-4 lg:px-6">
        <AdminListToolbar>
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("suppliers.searchPlaceholder")}
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="h-10 rounded-lg border-muted-foreground/20 bg-background pl-9"
            />
          </div>

          <div className="min-w-[180px] space-y-2">
            <Label htmlFor="supplier-type-filter" className="text-sm font-medium">
              {t("suppliers.type")}
            </Label>
            <Select
              value={typeFilter}
              onValueChange={(value) =>
                table.getColumn("supplierType")?.setFilterValue(value === "all" ? undefined : value)
              }
            >
              <SelectTrigger className="h-10 w-full cursor-pointer rounded-lg" id="supplier-type-filter">
                <SelectValue placeholder={t("suppliers.selectType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("suppliers.allTypes")}</SelectItem>
                <SelectItem value="fuel_station">{t("suppliers.types.fuel_station")}</SelectItem>
                <SelectItem value="workshop">{t("suppliers.types.workshop")}</SelectItem>
                <SelectItem value="other">{t("suppliers.types.other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[180px] space-y-2">
            <Label htmlFor="supplier-status-filter" className="text-sm font-medium">
              {t("suppliers.status")}
            </Label>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                table.getColumn("status")?.setFilterValue(value === "all" ? undefined : value)
              }
            >
              <SelectTrigger className="h-10 w-full cursor-pointer rounded-lg" id="supplier-status-filter">
                <SelectValue placeholder={t("suppliers.selectStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("suppliers.allStatuses")}</SelectItem>
                <SelectItem value="active">{t("suppliers.active")}</SelectItem>
                <SelectItem value="inactive">{t("suppliers.inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="ml-auto">
            <div className="min-w-[180px] space-y-2">
              <Label htmlFor="suppliers-column-visibility" className="text-sm font-medium">
                {t("common.columnVisibility")}
              </Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    id="suppliers-column-visibility"
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

          <Button
            className="cursor-pointer"
            onClick={() => {
              setEditing(null);
              setCreateOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" />
            {t("suppliers.add")}
          </Button>
        </AdminListToolbar>

        {loading ? (
          <div className="rounded-md border px-6 py-10 text-sm text-muted-foreground">{t("suppliers.loading")}</div>
        ) : (
          <>
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
                      await handleDeleteSuppliers(ids);
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
                        {t("suppliers.noSuppliers")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </AdminListTableCard>

            <AdminListPaginationFooter
              countLabel={t("suppliers.supplierCount", { count: table.getFilteredRowModel().rows.length })}
              previousLabel={t("common.previous")}
              nextLabel={t("common.next")}
              onPreviousPage={() => table.previousPage()}
              onNextPage={() => table.nextPage()}
              canPreviousPage={table.getCanPreviousPage()}
              canNextPage={table.getCanNextPage()}
            />
          </>
        )}
      </div>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeDialog();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)} className="space-y-3">
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-3 pr-8">
                  <DialogTitle>{editing ? t("suppliers.edit") : t("suppliers.add")}</DialogTitle>
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem className="flex shrink-0 flex-row items-center gap-3 space-y-0 rounded-md border px-3 py-2">
                        <FormLabel className="cursor-pointer text-sm font-medium">
                          {field.value === "active" ? t("suppliers.active") : t("suppliers.inactive")}
                        </FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value === "active"}
                            onCheckedChange={(checked) => field.onChange(checked ? "active" : "inactive")}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <DialogDescription>{t("suppliers.formDescription")}</DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
                <FormField
                  control={form.control}
                  name="supplierType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.type")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full cursor-pointer">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="fuel_station">{t("suppliers.types.fuel_station")}</SelectItem>
                          <SelectItem value="workshop">{t("suppliers.types.workshop")}</SelectItem>
                          <SelectItem value="other">{t("suppliers.types.other")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="document"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.document")}</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            placeholder="00.000.000/0000-00 ou 000.000.000-00"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(event) => field.onChange(formatSupplierDocument(event.target.value))}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => void handleDocumentLookup()}
                          disabled={isLookingUpDocument || isMutating}
                        >
                          {isLookingUpDocument ? t("common.loading") : t("suppliers.lookupCnpj")}
                        </Button>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <FormField
                  control={form.control}
                  name="legalName"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>{t("suppliers.legalName")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tradeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.tradeName")}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.contactName")}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.contactPhone")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(11) 99999-9999"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(event) => field.onChange(formatPhone(event.target.value))}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.email")}</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="fornecedor@exemplo.com" {...field} value={field.value ?? ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.phone")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(11) 99999-9999"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(event) => field.onChange(formatPhone(event.target.value))}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.website")}</FormLabel>
                      <FormControl>
                        <Input placeholder="https://exemplo.com.br" {...field} value={field.value ?? ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.postalCode")}</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            placeholder="00000-000"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(event) => field.onChange(formatPostalCode(event.target.value))}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className="shrink-0 cursor-pointer"
                          onClick={() => void handlePostalCodeLookup()}
                          disabled={isLookingUpPostalCode || isMutating}
                        >
                          {isLookingUpPostalCode ? t("common.loading") : t("suppliers.lookupPostalCode")}
                        </Button>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.country")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_120px_180px_minmax(0,1fr)]">
                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.street")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.number")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="complement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.complement")}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.district")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_120px]">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.city")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.state")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" className="cursor-pointer" onClick={closeDialog}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" className="cursor-pointer" disabled={isMutating}>
                  {isMutating ? t("common.loading") : t("common.saveChanges")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeleting(null);
          }
        }}
        description={deleting ? t("suppliers.confirmDelete", { name: deleting.tradeName || deleting.legalName }) : ""}
        onConfirm={async () => {
          if (!deleting) {
            return;
          }

          await runMutation(async () => {
            await parseResponse(await fetch(`/api/suppliers/${deleting.id}`, { method: "DELETE" }));
          }, t("common.supplierDeleteSuccess"));
          setDeleting(null);
        }}
        isLoading={isMutating}
      />
    </>
  );
}
