"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Check, EllipsisVertical, FileDown, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import {
  AdminListPaginationFooter,
  AdminListTableCard,
  AdminListToolbar,
} from "@/components/admin-list-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { DatePickerInput, formatDateString, parseDateString } from "@/components/date-picker-input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useRbac } from "@/hooks/use-rbac";
import { useI18n, useLocale } from "@/i18n/provider";
import type { EquipmentOption } from "@/lib/equipment-admin";
import type { FuelType } from "@/lib/fuel-admin";
import type { ManagedFuelRequisition } from "@/lib/fuel-requisitions-admin";
import type { ManagedMaintenanceRequisition, RequisitionStatus } from "@/lib/maintenance-requisitions-admin";
import type { ManagedPartsRequisition } from "@/lib/parts-requisitions-admin";
import { getSemanticStatusBadgeClass } from "@/lib/status-badge";
import type { SupplierOption } from "@/lib/suppliers-admin";

type RequisitionKind = "maintenance" | "fuel" | "parts";

type MaintenanceResponse = {
  maintenanceRequisitions: ManagedMaintenanceRequisition[];
  equipment: EquipmentOption[];
  suppliers: SupplierOption[];
};

type FuelResponse = {
  fuelRequisitions: ManagedFuelRequisition[];
  equipment: EquipmentOption[];
  suppliers: SupplierOption[];
};

type PartsResponse = {
  partsRequisitions: ManagedPartsRequisition[];
  equipment: EquipmentOption[];
  suppliers: SupplierOption[];
};

type MaintenanceFormState = {
  equipmentId: string;
  supplierId: string;
  scheduledDate: string;
  description: string;
  notes: string;
};

type FuelFormState = {
  equipmentId: string;
  supplierId: string;
  scheduledDate: string;
  fuelType: FuelType | "";
  notes: string;
};

type PartsFormState = {
  equipmentId: string;
  supplierId: string;
  scheduledDate: string;
  description: string;
  notes: string;
};

function emptyMaintenanceForm(): MaintenanceFormState {
  return {
    equipmentId: "",
    supplierId: "",
    scheduledDate: "",
    description: "",
    notes: "",
  };
}

function emptyFuelForm(): FuelFormState {
  return {
    equipmentId: "",
    supplierId: "",
    scheduledDate: "",
    fuelType: "",
    notes: "",
  };
}

function emptyPartsForm(): PartsFormState {
  return {
    equipmentId: "",
    supplierId: "",
    scheduledDate: "",
    description: "",
    notes: "",
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed.");
  }

  return payload as T;
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${value}T12:00:00`));
}

function getRequisitionBasePath(kind: RequisitionKind) {
  switch (kind) {
    case "maintenance":
      return "/api/maintenance-requisitions";
    case "fuel":
      return "/api/fuel-requisitions";
    case "parts":
      return "/api/parts-requisitions";
  }
}

export default function EquipmentRequisitionsPage() {
  const { t } = useI18n();
  const locale = useLocale();
  const { hasPermission } = useRbac();

  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [tab, setTab] = useState<RequisitionKind>("maintenance");

  const [equipment, setEquipment] = useState<EquipmentOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [maintenanceRequisitions, setMaintenanceRequisitions] = useState<ManagedMaintenanceRequisition[]>([]);
  const [fuelRequisitions, setFuelRequisitions] = useState<ManagedFuelRequisition[]>([]);
  const [partsRequisitions, setPartsRequisitions] = useState<ManagedPartsRequisition[]>([]);

  const [maintenanceSearch, setMaintenanceSearch] = useState("");
  const [fuelSearch, setFuelSearch] = useState("");
  const [partsSearch, setPartsSearch] = useState("");

  const [maintenanceSorting, setMaintenanceSorting] = useState<SortingState>([]);
  const [maintenanceColumnFilters, setMaintenanceColumnFilters] = useState<ColumnFiltersState>([]);
  const [maintenanceRowSelection, setMaintenanceRowSelection] = useState({});
  const [fuelSorting, setFuelSorting] = useState<SortingState>([]);
  const [fuelColumnFilters, setFuelColumnFilters] = useState<ColumnFiltersState>([]);
  const [fuelRowSelection, setFuelRowSelection] = useState({});
  const [partsSorting, setPartsSorting] = useState<SortingState>([]);
  const [partsColumnFilters, setPartsColumnFilters] = useState<ColumnFiltersState>([]);
  const [partsRowSelection, setPartsRowSelection] = useState({});

  const [maintenanceBulkDeleteOpen, setMaintenanceBulkDeleteOpen] = useState(false);
  const [fuelBulkDeleteOpen, setFuelBulkDeleteOpen] = useState(false);
  const [partsBulkDeleteOpen, setPartsBulkDeleteOpen] = useState(false);

  const [createMaintenanceOpen, setCreateMaintenanceOpen] = useState(false);
  const [editMaintenance, setEditMaintenance] = useState<ManagedMaintenanceRequisition | null>(null);
  const [maintenanceForm, setMaintenanceForm] = useState<MaintenanceFormState>(emptyMaintenanceForm());

  const [createFuelOpen, setCreateFuelOpen] = useState(false);
  const [editFuel, setEditFuel] = useState<ManagedFuelRequisition | null>(null);
  const [fuelForm, setFuelForm] = useState<FuelFormState>(emptyFuelForm());

  const [createPartsOpen, setCreatePartsOpen] = useState(false);
  const [editParts, setEditParts] = useState<ManagedPartsRequisition | null>(null);
  const [partsForm, setPartsForm] = useState<PartsFormState>(emptyPartsForm());

  const [deleteMaintenance, setDeleteMaintenance] = useState<ManagedMaintenanceRequisition | null>(null);
  const [deleteFuel, setDeleteFuel] = useState<ManagedFuelRequisition | null>(null);
  const [deleteParts, setDeleteParts] = useState<ManagedPartsRequisition | null>(null);

  const [statusDialog, setStatusDialog] = useState<{
    kind: RequisitionKind;
    id: string;
    status: "issued" | "completed" | "cancelled";
  } | null>(null);
  const [completedAt, setCompletedAt] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");

  const canCreate = hasPermission("equipment-requisitions.create");
  const canUpdate = hasPermission("equipment-requisitions.update");
  const canDelete = hasPermission("equipment-requisitions.delete");

  const supplierLabel = (supplier: SupplierOption) => supplier.tradeName || supplier.legalName;
  const activeSupplierOptions = useMemo(
    () => suppliers.filter((item) => item.status === "active"),
    [suppliers],
  );

  const maintenanceVisible = useMemo(() => {
    const term = maintenanceSearch.trim().toLowerCase();
    if (!term) {
      return maintenanceRequisitions;
    }

    return maintenanceRequisitions.filter((item) =>
      [item.number, item.equipmentName, item.supplierName, item.description, item.notes ?? ""]
        .some((value) => value.toLowerCase().includes(term)),
    );
  }, [maintenanceRequisitions, maintenanceSearch]);

  const fuelVisible = useMemo(() => {
    const term = fuelSearch.trim().toLowerCase();
    if (!term) {
      return fuelRequisitions;
    }

    return fuelRequisitions.filter((item) =>
      [
        item.number,
        item.equipmentName,
        item.supplierName,
        item.fuelType ? t(`equipmentRequisitions.fuelTypes.${item.fuelType}`) : "",
        item.notes ?? "",
      ].some((value) => value.toLowerCase().includes(term)),
    );
  }, [fuelRequisitions, fuelSearch, t]);

  const partsVisible = useMemo(() => {
    const term = partsSearch.trim().toLowerCase();
    if (!term) {
      return partsRequisitions;
    }

    return partsRequisitions.filter((item) =>
      [item.number, item.equipmentName, item.supplierName, item.description, item.notes ?? ""]
        .some((value) => value.toLowerCase().includes(term)),
    );
  }, [partsRequisitions, partsSearch]);

  async function loadData() {
    setLoading(true);

    try {
      const [maintenancePayload, fuelPayload, partsPayload] = await Promise.all([
        parseResponse<MaintenanceResponse>(await fetch("/api/maintenance-requisitions", { cache: "no-store" })),
        parseResponse<FuelResponse>(await fetch("/api/fuel-requisitions", { cache: "no-store" })),
        parseResponse<PartsResponse>(await fetch("/api/parts-requisitions", { cache: "no-store" })),
      ]);

      setMaintenanceRequisitions(maintenancePayload.maintenanceRequisitions);
      setFuelRequisitions(fuelPayload.fuelRequisitions);
      setPartsRequisitions(partsPayload.partsRequisitions);
      setEquipment(maintenancePayload.equipment);
      setSuppliers(maintenancePayload.suppliers);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("equipmentRequisitions.loadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (!editMaintenance) {
      setMaintenanceForm(emptyMaintenanceForm());
      return;
    }

    setMaintenanceForm({
      equipmentId: editMaintenance.equipmentId,
      supplierId: editMaintenance.supplierId,
      scheduledDate: editMaintenance.scheduledDate,
      description: editMaintenance.description,
      notes: editMaintenance.notes ?? "",
    });
  }, [editMaintenance]);

  useEffect(() => {
    if (!editFuel) {
      setFuelForm(emptyFuelForm());
      return;
    }

    setFuelForm({
      equipmentId: editFuel.equipmentId,
      supplierId: editFuel.supplierId,
      scheduledDate: editFuel.scheduledDate,
      fuelType: editFuel.fuelType ?? "",
      notes: editFuel.notes ?? "",
    });
  }, [editFuel]);

  useEffect(() => {
    if (!editParts) {
      setPartsForm(emptyPartsForm());
      return;
    }

    setPartsForm({
      equipmentId: editParts.equipmentId,
      supplierId: editParts.supplierId,
      scheduledDate: editParts.scheduledDate,
      description: editParts.description,
      notes: editParts.notes ?? "",
    });
  }, [editParts]);

  useEffect(() => {
    if (!statusDialog) {
      setCompletedAt("");
      setCompletionNotes("");
    }
  }, [statusDialog]);

  async function runMutation(operation: () => Promise<void>, successMessage: string) {
    setIsMutating(true);
    try {
      await operation();
      await loadData();
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("equipmentRequisitions.updateError"));
      throw error;
    } finally {
      setIsMutating(false);
    }
  }

  async function handleOpenPdf(kind: RequisitionKind, id: string) {
    window.open(`${getRequisitionBasePath(kind)}/${id}/pdf`, "_blank", "noopener,noreferrer");
  }

  async function handleIssue(kind: RequisitionKind, id: string) {
    await runMutation(async () => {
      await parseResponse(
        await fetch(`${getRequisitionBasePath(kind)}/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "issued" }),
        }),
      );
    }, t("common.requisitionIssueSuccess"));

    await handleOpenPdf(kind, id);
  }

  async function handleCompleteOrCancel() {
    if (!statusDialog) {
      return;
    }

    await runMutation(async () => {
      await parseResponse(
        await fetch(`${getRequisitionBasePath(statusDialog.kind)}/${statusDialog.id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: statusDialog.status,
            completedAt: statusDialog.status === "completed" ? completedAt : undefined,
            completionNotes: completionNotes || undefined,
          }),
        }),
      );
    }, t("common.requisitionStatusSuccess"));

    setStatusDialog(null);
  }

  async function handleDeleteItems(kind: RequisitionKind, ids: string[]) {
    if (!ids.length) {
      return;
    }

    setIsMutating(true);
    try {
      const results = await Promise.allSettled(
        ids.map(async (id) => {
          await parseResponse(
            await fetch(`${getRequisitionBasePath(kind)}/${id}`, { method: "DELETE" }),
          );
        }),
      );

      const successCount = results.filter((result) => result.status === "fulfilled").length;
      const failedCount = ids.length - successCount;

      await loadData();

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

  const maintenanceColumns = useMemo<ColumnDef<ManagedMaintenanceRequisition>[]>(() => [
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
      accessorKey: "number",
      header: ({ column }) => <SortableHeader column={column} title={t("equipmentRequisitions.number")} className="-ml-3" />,
      enableHiding: false,
      cell: ({ row }) => <div className="font-medium">{row.original.number}</div>,
    },
    {
      accessorKey: "scheduledDate",
      header: ({ column }) => <SortableHeader column={column} title={t("equipmentRequisitions.scheduledDate")} className="-ml-3" />,
      cell: ({ row }) => <span className="text-sm">{formatDate(row.original.scheduledDate, locale)}</span>,
    },
    {
      accessorKey: "equipmentName",
      header: ({ column }) => <SortableHeader column={column} title={t("equipmentRequisitions.equipment")} className="-ml-3" />,
      cell: ({ row }) => <span className="text-sm">{row.original.equipmentName}</span>,
    },
    {
      accessorKey: "supplierName",
      header: ({ column }) => <SortableHeader column={column} title={t("equipmentRequisitions.supplier")} className="-ml-3" />,
      cell: ({ row }) => <span className="text-sm">{row.original.supplierName}</span>,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <SortableHeader column={column} title={t("equipmentRequisitions.status")} className="-ml-3" />,
      cell: ({ row }) => (
        <Badge variant="secondary" className={getSemanticStatusBadgeClass(row.original.status)}>
          {t(`equipmentRequisitions.statuses.${row.original.status}`)}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: t("equipmentRequisitions.actions"),
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                <EllipsisVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canUpdate ? (
                <DropdownMenuItem className="cursor-pointer" onClick={() => setEditMaintenance(item)} disabled={item.status === "completed" || item.status === "cancelled"}>
                  <Pencil className="mr-2 size-4" />
                  {t("common.saveChanges")}
                </DropdownMenuItem>
              ) : null}
              {canUpdate && item.status === "draft" ? (
                <DropdownMenuItem className="cursor-pointer" onClick={() => void handleIssue("maintenance", item.id)}>
                  <Check className="mr-2 size-4" />
                  {t("equipmentRequisitions.issue")}
                </DropdownMenuItem>
              ) : null}
              {item.status !== "draft" ? (
                <DropdownMenuItem className="cursor-pointer" onClick={() => void handleOpenPdf("maintenance", item.id)}>
                  <FileDown className="mr-2 size-4" />
                  {t("equipmentRequisitions.viewPdf")}
                </DropdownMenuItem>
              ) : null}
              {canUpdate && item.status === "issued" ? (
                <DropdownMenuItem className="cursor-pointer" onClick={() => setStatusDialog({ kind: "maintenance", id: item.id, status: "completed" })}>
                  <Check className="mr-2 size-4" />
                  {t("equipmentRequisitions.complete")}
                </DropdownMenuItem>
              ) : null}
              {canUpdate && item.status === "issued" ? (
                <DropdownMenuItem className="cursor-pointer" onClick={() => setStatusDialog({ kind: "maintenance", id: item.id, status: "cancelled" })}>
                  <X className="mr-2 size-4" />
                  {t("equipmentRequisitions.cancel")}
                </DropdownMenuItem>
              ) : null}
              {canDelete ? (
                <DropdownMenuItem className="cursor-pointer text-destructive" onClick={() => setDeleteMaintenance(item)} disabled={item.status !== "draft"}>
                  <Trash2 className="mr-2 size-4" />
                  {t("common.delete")}
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [canDelete, canUpdate, locale, t]);

  const fuelColumns = useMemo<ColumnDef<ManagedFuelRequisition>[]>(() => [
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
      accessorKey: "number",
      header: ({ column }) => <SortableHeader column={column} title={t("equipmentRequisitions.number")} className="-ml-3" />,
      enableHiding: false,
      cell: ({ row }) => <div className="font-medium">{row.original.number}</div>,
    },
    {
      accessorKey: "scheduledDate",
      header: ({ column }) => <SortableHeader column={column} title={t("equipmentRequisitions.scheduledDate")} className="-ml-3" />,
      cell: ({ row }) => <span className="text-sm">{formatDate(row.original.scheduledDate, locale)}</span>,
    },
    {
      accessorKey: "equipmentName",
      header: ({ column }) => <SortableHeader column={column} title={t("equipmentRequisitions.equipment")} className="-ml-3" />,
      cell: ({ row }) => <span className="text-sm">{row.original.equipmentName}</span>,
    },
    {
      accessorKey: "supplierName",
      header: ({ column }) => <SortableHeader column={column} title={t("equipmentRequisitions.supplier")} className="-ml-3" />,
      cell: ({ row }) => <span className="text-sm">{row.original.supplierName}</span>,
    },
    {
      accessorKey: "fuelType",
      header: ({ column }) => <SortableHeader column={column} title={t("equipmentRequisitions.fuelType")} className="-ml-3" />,
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.fuelType ? t(`equipmentRequisitions.fuelTypes.${row.original.fuelType}`) : "—"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <SortableHeader column={column} title={t("equipmentRequisitions.status")} className="-ml-3" />,
      cell: ({ row }) => (
        <Badge variant="secondary" className={getSemanticStatusBadgeClass(row.original.status)}>
          {t(`equipmentRequisitions.statuses.${row.original.status}`)}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: t("equipmentRequisitions.actions"),
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                <EllipsisVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canUpdate ? (
                <DropdownMenuItem className="cursor-pointer" onClick={() => setEditFuel(item)} disabled={item.status === "completed" || item.status === "cancelled"}>
                  <Pencil className="mr-2 size-4" />
                  {t("common.saveChanges")}
                </DropdownMenuItem>
              ) : null}
              {canUpdate && item.status === "draft" ? (
                <DropdownMenuItem className="cursor-pointer" onClick={() => void handleIssue("fuel", item.id)}>
                  <Check className="mr-2 size-4" />
                  {t("equipmentRequisitions.issue")}
                </DropdownMenuItem>
              ) : null}
              {item.status !== "draft" ? (
                <DropdownMenuItem className="cursor-pointer" onClick={() => void handleOpenPdf("fuel", item.id)}>
                  <FileDown className="mr-2 size-4" />
                  {t("equipmentRequisitions.viewPdf")}
                </DropdownMenuItem>
              ) : null}
              {canUpdate && item.status === "issued" ? (
                <DropdownMenuItem className="cursor-pointer" onClick={() => setStatusDialog({ kind: "fuel", id: item.id, status: "completed" })}>
                  <Check className="mr-2 size-4" />
                  {t("equipmentRequisitions.complete")}
                </DropdownMenuItem>
              ) : null}
              {canUpdate && item.status === "issued" ? (
                <DropdownMenuItem className="cursor-pointer" onClick={() => setStatusDialog({ kind: "fuel", id: item.id, status: "cancelled" })}>
                  <X className="mr-2 size-4" />
                  {t("equipmentRequisitions.cancel")}
                </DropdownMenuItem>
              ) : null}
              {canDelete ? (
                <DropdownMenuItem className="cursor-pointer text-destructive" onClick={() => setDeleteFuel(item)} disabled={item.status !== "draft"}>
                  <Trash2 className="mr-2 size-4" />
                  {t("common.delete")}
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [canDelete, canUpdate, locale, t]);

  const partsColumns = useMemo<ColumnDef<ManagedPartsRequisition>[]>(() => [
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
      accessorKey: "number",
      header: ({ column }) => <SortableHeader column={column} title={t("equipmentRequisitions.number")} className="-ml-3" />,
      enableHiding: false,
      cell: ({ row }) => <div className="font-medium">{row.original.number}</div>,
    },
    {
      accessorKey: "scheduledDate",
      header: ({ column }) => <SortableHeader column={column} title={t("equipmentRequisitions.scheduledDate")} className="-ml-3" />,
      cell: ({ row }) => <span className="text-sm">{formatDate(row.original.scheduledDate, locale)}</span>,
    },
    {
      accessorKey: "equipmentName",
      header: ({ column }) => <SortableHeader column={column} title={t("equipmentRequisitions.equipment")} className="-ml-3" />,
      cell: ({ row }) => <span className="text-sm">{row.original.equipmentName}</span>,
    },
    {
      accessorKey: "supplierName",
      header: ({ column }) => <SortableHeader column={column} title={t("equipmentRequisitions.supplier")} className="-ml-3" />,
      cell: ({ row }) => <span className="text-sm">{row.original.supplierName}</span>,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <SortableHeader column={column} title={t("equipmentRequisitions.status")} className="-ml-3" />,
      cell: ({ row }) => (
        <Badge variant="secondary" className={getSemanticStatusBadgeClass(row.original.status)}>
          {t(`equipmentRequisitions.statuses.${row.original.status}`)}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: t("equipmentRequisitions.actions"),
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                <EllipsisVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canUpdate ? (
                <DropdownMenuItem className="cursor-pointer" onClick={() => setEditParts(item)} disabled={item.status === "completed" || item.status === "cancelled"}>
                  <Pencil className="mr-2 size-4" />
                  {t("common.saveChanges")}
                </DropdownMenuItem>
              ) : null}
              {canUpdate && item.status === "draft" ? (
                <DropdownMenuItem className="cursor-pointer" onClick={() => void handleIssue("parts", item.id)}>
                  <Check className="mr-2 size-4" />
                  {t("equipmentRequisitions.issue")}
                </DropdownMenuItem>
              ) : null}
              {item.status !== "draft" ? (
                <DropdownMenuItem className="cursor-pointer" onClick={() => void handleOpenPdf("parts", item.id)}>
                  <FileDown className="mr-2 size-4" />
                  {t("equipmentRequisitions.viewPdf")}
                </DropdownMenuItem>
              ) : null}
              {canUpdate && item.status === "issued" ? (
                <DropdownMenuItem className="cursor-pointer" onClick={() => setStatusDialog({ kind: "parts", id: item.id, status: "completed" })}>
                  <Check className="mr-2 size-4" />
                  {t("equipmentRequisitions.complete")}
                </DropdownMenuItem>
              ) : null}
              {canUpdate && item.status === "issued" ? (
                <DropdownMenuItem className="cursor-pointer" onClick={() => setStatusDialog({ kind: "parts", id: item.id, status: "cancelled" })}>
                  <X className="mr-2 size-4" />
                  {t("equipmentRequisitions.cancel")}
                </DropdownMenuItem>
              ) : null}
              {canDelete ? (
                <DropdownMenuItem className="cursor-pointer text-destructive" onClick={() => setDeleteParts(item)} disabled={item.status !== "draft"}>
                  <Trash2 className="mr-2 size-4" />
                  {t("common.delete")}
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [canDelete, canUpdate, locale, t]);

  const maintenanceTable = useReactTable({
    data: maintenanceVisible,
    columns: maintenanceColumns,
    getRowId: (row) => row.id,
    onSortingChange: setMaintenanceSorting,
    onColumnFiltersChange: setMaintenanceColumnFilters,
    onRowSelectionChange: setMaintenanceRowSelection,
    onGlobalFilterChange: setMaintenanceSearch,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const value = String(filterValue).toLowerCase();
      return [row.original.number, row.original.equipmentName, row.original.supplierName, row.original.description, row.original.notes ?? ""]
        .some((item) => item.toLowerCase().includes(value));
    },
    state: { sorting: maintenanceSorting, columnFilters: maintenanceColumnFilters, rowSelection: maintenanceRowSelection, globalFilter: maintenanceSearch },
    initialState: { pagination: { pageSize: 10 } },
  });

  const fuelTable = useReactTable({
    data: fuelVisible,
    columns: fuelColumns,
    getRowId: (row) => row.id,
    onSortingChange: setFuelSorting,
    onColumnFiltersChange: setFuelColumnFilters,
    onRowSelectionChange: setFuelRowSelection,
    onGlobalFilterChange: setFuelSearch,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const value = String(filterValue).toLowerCase();
      return [
        row.original.number,
        row.original.equipmentName,
        row.original.supplierName,
        row.original.fuelType ? t(`equipmentRequisitions.fuelTypes.${row.original.fuelType}`) : "",
        row.original.notes ?? "",
      ].some((item) => item.toLowerCase().includes(value));
    },
    state: { sorting: fuelSorting, columnFilters: fuelColumnFilters, rowSelection: fuelRowSelection, globalFilter: fuelSearch },
    initialState: { pagination: { pageSize: 10 } },
  });

  const partsTable = useReactTable({
    data: partsVisible,
    columns: partsColumns,
    getRowId: (row) => row.id,
    onSortingChange: setPartsSorting,
    onColumnFiltersChange: setPartsColumnFilters,
    onRowSelectionChange: setPartsRowSelection,
    onGlobalFilterChange: setPartsSearch,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const value = String(filterValue).toLowerCase();
      return [row.original.number, row.original.equipmentName, row.original.supplierName, row.original.description, row.original.notes ?? ""]
        .some((item) => item.toLowerCase().includes(value));
    },
    state: { sorting: partsSorting, columnFilters: partsColumnFilters, rowSelection: partsRowSelection, globalFilter: partsSearch },
    initialState: { pagination: { pageSize: 10 } },
  });

  const maintenanceSelectedCount = maintenanceTable.getFilteredSelectedRowModel().rows.length;
  const fuelSelectedCount = fuelTable.getFilteredSelectedRowModel().rows.length;
  const partsSelectedCount = partsTable.getFilteredSelectedRowModel().rows.length;

  const closeMaintenanceDialog = () => {
    setCreateMaintenanceOpen(false);
    setEditMaintenance(null);
    setMaintenanceForm(emptyMaintenanceForm());
  };

  const closeFuelDialog = () => {
    setCreateFuelOpen(false);
    setEditFuel(null);
    setFuelForm(emptyFuelForm());
  };

  const closePartsDialog = () => {
    setCreatePartsOpen(false);
    setEditParts(null);
    setPartsForm(emptyPartsForm());
  };

  const saveMaintenance = async () => {
    const path = editMaintenance ? `${getRequisitionBasePath("maintenance")}/${editMaintenance.id}` : getRequisitionBasePath("maintenance");
    const method = editMaintenance ? "PUT" : "POST";

    await runMutation(async () => {
      await parseResponse(
        await fetch(path, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(maintenanceForm),
        }),
      );
    }, editMaintenance ? t("common.requisitionUpdateSuccess") : t("common.requisitionCreateSuccess"));

    if (editMaintenance?.status === "issued") {
      await handleOpenPdf("maintenance", editMaintenance.id);
    }

    closeMaintenanceDialog();
  };

  const saveFuel = async () => {
    const path = editFuel ? `${getRequisitionBasePath("fuel")}/${editFuel.id}` : getRequisitionBasePath("fuel");
    const method = editFuel ? "PUT" : "POST";

    await runMutation(async () => {
      await parseResponse(
        await fetch(path, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fuelForm),
        }),
      );
    }, editFuel ? t("common.requisitionUpdateSuccess") : t("common.requisitionCreateSuccess"));

    if (editFuel?.status === "issued") {
      await handleOpenPdf("fuel", editFuel.id);
    }

    closeFuelDialog();
  };

  const saveParts = async () => {
    const path = editParts ? `${getRequisitionBasePath("parts")}/${editParts.id}` : getRequisitionBasePath("parts");
    const method = editParts ? "PUT" : "POST";

    await runMutation(async () => {
      await parseResponse(
        await fetch(path, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(partsForm),
        }),
      );
    }, editParts ? t("common.requisitionUpdateSuccess") : t("common.requisitionCreateSuccess"));

    if (editParts?.status === "issued") {
      await handleOpenPdf("parts", editParts.id);
    }

    closePartsDialog();
  };

  const renderSelectionBar = (count: number, resetSelection: () => void, onDelete: () => void) => {
    if (count <= 0) {
      return null;
    }

    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
        <span className="text-sm text-muted-foreground">
          {t("common.selectedCount", { count })}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="cursor-pointer" onClick={resetSelection} disabled={isMutating}>
            {t("common.clearSelection")}
          </Button>
          <Button variant="destructive" size="sm" className="cursor-pointer" onClick={onDelete} disabled={isMutating}>
            <Trash2 className="mr-2 size-4" />
            {t("common.deleteSelected")}
          </Button>
        </div>
      </div>
    );
  };

  const handleBulkDelete = async <T extends { id: string; status: RequisitionStatus }>(
    kind: RequisitionKind,
    rows: Array<{ original: T }>,
    resetSelection: () => void,
    closeDialog: () => void,
  ) => {
    const draftItems = rows.filter((row) => row.original.status === "draft");

    if (draftItems.length === 0) {
      toast.error(t("equipmentRequisitions.noDraftSelected"));
      closeDialog();
      return;
    }

    await handleDeleteItems(kind, draftItems.map((row) => row.original.id));
    resetSelection();
    closeDialog();
  };

  return (
    <>
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{t("equipmentRequisitions.title")}</h1>
          <p className="text-muted-foreground">{t("equipmentRequisitions.description")}</p>
        </div>
      </div>

      <div className="@container/main mt-2 space-y-4 px-4 lg:mt-4 lg:px-6">
        {loading ? (
          <div className="rounded-md border px-6 py-10 text-sm text-muted-foreground">
            {t("equipmentRequisitions.loading")}
          </div>
        ) : (
          <Tabs value={tab} onValueChange={(value) => setTab(value as RequisitionKind)}>
            <TabsList>
              <TabsTrigger value="maintenance">{t("equipmentRequisitions.tabs.maintenance")}</TabsTrigger>
              <TabsTrigger value="fuel">{t("equipmentRequisitions.tabs.fuel")}</TabsTrigger>
              <TabsTrigger value="parts">{t("equipmentRequisitions.tabs.parts")}</TabsTrigger>
            </TabsList>

            <TabsContent value="maintenance" className="space-y-4">
              <AdminListToolbar>
                <div className="relative min-w-[240px] flex-1">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t("equipmentRequisitions.searchPlaceholder")}
                    value={maintenanceSearch}
                    onChange={(event) => setMaintenanceSearch(event.target.value)}
                    className="h-10 rounded-lg border-muted-foreground/20 bg-background pl-9"
                  />
                </div>
                {canCreate ? (
                  <Button className="cursor-pointer" onClick={() => setCreateMaintenanceOpen(true)}>
                    <Plus className="mr-2 size-4" />
                    {t("equipmentRequisitions.addMaintenance")}
                  </Button>
                ) : null}
              </AdminListToolbar>

              {renderSelectionBar(maintenanceSelectedCount, () => maintenanceTable.resetRowSelection(), () => setMaintenanceBulkDeleteOpen(true))}

              <AdminListTableCard>
                <Table>
                  <TableHeader>
                    {maintenanceTable.getHeaderGroups().map((headerGroup) => (
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
                    {maintenanceTable.getRowModel().rows.length ? (
                      maintenanceTable.getRowModel().rows.map((row) => (
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
                        <TableCell colSpan={maintenanceColumns.length} className="h-24 text-center text-muted-foreground">
                          {t("equipmentRequisitions.noMaintenance")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </AdminListTableCard>

              <AdminListPaginationFooter
                countLabel={t("equipmentRequisitions.maintenanceCount", { count: maintenanceTable.getFilteredRowModel().rows.length })}
                previousLabel={t("common.previous")}
                nextLabel={t("common.next")}
                onPreviousPage={() => maintenanceTable.previousPage()}
                onNextPage={() => maintenanceTable.nextPage()}
                canPreviousPage={maintenanceTable.getCanPreviousPage()}
                canNextPage={maintenanceTable.getCanNextPage()}
              />
            </TabsContent>

            <TabsContent value="fuel" className="space-y-4">
              <AdminListToolbar>
                <div className="relative min-w-[240px] flex-1">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t("equipmentRequisitions.searchPlaceholder")}
                    value={fuelSearch}
                    onChange={(event) => setFuelSearch(event.target.value)}
                    className="h-10 rounded-lg border-muted-foreground/20 bg-background pl-9"
                  />
                </div>
                {canCreate ? (
                  <Button className="cursor-pointer" onClick={() => setCreateFuelOpen(true)}>
                    <Plus className="mr-2 size-4" />
                    {t("equipmentRequisitions.addFuel")}
                  </Button>
                ) : null}
              </AdminListToolbar>

              {renderSelectionBar(fuelSelectedCount, () => fuelTable.resetRowSelection(), () => setFuelBulkDeleteOpen(true))}

              <AdminListTableCard>
                <Table>
                  <TableHeader>
                    {fuelTable.getHeaderGroups().map((headerGroup) => (
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
                    {fuelTable.getRowModel().rows.length ? (
                      fuelTable.getRowModel().rows.map((row) => (
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
                        <TableCell colSpan={fuelColumns.length} className="h-24 text-center text-muted-foreground">
                          {t("equipmentRequisitions.noFuel")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </AdminListTableCard>

              <AdminListPaginationFooter
                countLabel={t("equipmentRequisitions.fuelCount", { count: fuelTable.getFilteredRowModel().rows.length })}
                previousLabel={t("common.previous")}
                nextLabel={t("common.next")}
                onPreviousPage={() => fuelTable.previousPage()}
                onNextPage={() => fuelTable.nextPage()}
                canPreviousPage={fuelTable.getCanPreviousPage()}
                canNextPage={fuelTable.getCanNextPage()}
              />
            </TabsContent>

            <TabsContent value="parts" className="space-y-4">
              <AdminListToolbar>
                <div className="relative min-w-[240px] flex-1">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t("equipmentRequisitions.searchPlaceholder")}
                    value={partsSearch}
                    onChange={(event) => setPartsSearch(event.target.value)}
                    className="h-10 rounded-lg border-muted-foreground/20 bg-background pl-9"
                  />
                </div>
                {canCreate ? (
                  <Button className="cursor-pointer" onClick={() => setCreatePartsOpen(true)}>
                    <Plus className="mr-2 size-4" />
                    {t("equipmentRequisitions.addParts")}
                  </Button>
                ) : null}
              </AdminListToolbar>

              {renderSelectionBar(partsSelectedCount, () => partsTable.resetRowSelection(), () => setPartsBulkDeleteOpen(true))}

              <AdminListTableCard>
                <Table>
                  <TableHeader>
                    {partsTable.getHeaderGroups().map((headerGroup) => (
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
                    {partsTable.getRowModel().rows.length ? (
                      partsTable.getRowModel().rows.map((row) => (
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
                        <TableCell colSpan={partsColumns.length} className="h-24 text-center text-muted-foreground">
                          {t("equipmentRequisitions.noParts")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </AdminListTableCard>

              <AdminListPaginationFooter
                countLabel={t("equipmentRequisitions.partsCount", { count: partsTable.getFilteredRowModel().rows.length })}
                previousLabel={t("common.previous")}
                nextLabel={t("common.next")}
                onPreviousPage={() => partsTable.previousPage()}
                onNextPage={() => partsTable.nextPage()}
                canPreviousPage={partsTable.getCanPreviousPage()}
                canNextPage={partsTable.getCanNextPage()}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Dialog open={createMaintenanceOpen || Boolean(editMaintenance)} onOpenChange={(open) => {
        if (!open) closeMaintenanceDialog();
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editMaintenance ? t("equipmentRequisitions.editMaintenance") : t("equipmentRequisitions.addMaintenance")}</DialogTitle>
            <DialogDescription>{t("equipmentRequisitions.maintenanceFormDescription")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>{t("equipmentRequisitions.equipment")}</Label>
              <Select value={maintenanceForm.equipmentId} onValueChange={(value) => setMaintenanceForm((current) => ({ ...current, equipmentId: value }))}>
                <SelectTrigger className="w-full cursor-pointer"><SelectValue placeholder={t("equipmentRequisitions.selectEquipment")} /></SelectTrigger>
                <SelectContent>
                  {equipment.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.name} • {item.brand} • {item.model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("equipmentRequisitions.supplier")}</Label>
              <Select value={maintenanceForm.supplierId} onValueChange={(value) => setMaintenanceForm((current) => ({ ...current, supplierId: value }))}>
                <SelectTrigger className="w-full cursor-pointer"><SelectValue placeholder={t("equipmentRequisitions.selectSupplier")} /></SelectTrigger>
                <SelectContent>
                  {activeSupplierOptions.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{supplierLabel(item)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("equipmentRequisitions.scheduledDate")}</Label>
              <DatePickerInput
                value={parseDateString(maintenanceForm.scheduledDate)}
                onChange={(date) => setMaintenanceForm((current) => ({ ...current, scheduledDate: formatDateString(date) }))}
                placeholder={t("equipmentRequisitions.scheduledDate")}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("equipmentRequisitions.descriptionLabel")}</Label>
              <Textarea value={maintenanceForm.description} onChange={(event) => setMaintenanceForm((current) => ({ ...current, description: event.target.value }))} rows={3} />
            </div>
            <div className="grid gap-2">
              <Label>{t("equipmentRequisitions.notes")}</Label>
              <Textarea value={maintenanceForm.notes} onChange={(event) => setMaintenanceForm((current) => ({ ...current, notes: event.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="cursor-pointer" onClick={closeMaintenanceDialog}>
              {t("common.cancel")}
            </Button>
            <Button type="button" className="cursor-pointer" disabled={isMutating} onClick={() => void saveMaintenance()}>
              {isMutating ? t("common.loading") : t("common.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createFuelOpen || Boolean(editFuel)} onOpenChange={(open) => {
        if (!open) closeFuelDialog();
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editFuel ? t("equipmentRequisitions.editFuel") : t("equipmentRequisitions.addFuel")}</DialogTitle>
            <DialogDescription>{t("equipmentRequisitions.fuelFormDescription")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>{t("equipmentRequisitions.equipment")}</Label>
              <Select value={fuelForm.equipmentId} onValueChange={(value) => setFuelForm((current) => ({ ...current, equipmentId: value }))}>
                <SelectTrigger className="w-full cursor-pointer"><SelectValue placeholder={t("equipmentRequisitions.selectEquipment")} /></SelectTrigger>
                <SelectContent>
                  {equipment.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.name} • {item.brand} • {item.model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("equipmentRequisitions.supplier")}</Label>
              <Select value={fuelForm.supplierId} onValueChange={(value) => setFuelForm((current) => ({ ...current, supplierId: value }))}>
                <SelectTrigger className="w-full cursor-pointer"><SelectValue placeholder={t("equipmentRequisitions.selectSupplier")} /></SelectTrigger>
                <SelectContent>
                  {activeSupplierOptions.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{supplierLabel(item)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("equipmentRequisitions.scheduledDate")}</Label>
              <DatePickerInput
                value={parseDateString(fuelForm.scheduledDate)}
                onChange={(date) => setFuelForm((current) => ({ ...current, scheduledDate: formatDateString(date) }))}
                placeholder={t("equipmentRequisitions.scheduledDate")}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("equipmentRequisitions.fuelType")}</Label>
              <Select value={fuelForm.fuelType || "none"} onValueChange={(value) => setFuelForm((current) => ({ ...current, fuelType: value === "none" ? "" : value as FuelType }))}>
                <SelectTrigger className="w-full cursor-pointer"><SelectValue placeholder={t("equipmentRequisitions.selectFuelType")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("equipmentCosts.noneOption")}</SelectItem>
                  <SelectItem value="diesel">{t("equipmentRequisitions.fuelTypes.diesel")}</SelectItem>
                  <SelectItem value="gasoline">{t("equipmentRequisitions.fuelTypes.gasoline")}</SelectItem>
                  <SelectItem value="ethanol">{t("equipmentRequisitions.fuelTypes.ethanol")}</SelectItem>
                  <SelectItem value="gnv">{t("equipmentRequisitions.fuelTypes.gnv")}</SelectItem>
                  <SelectItem value="other">{t("equipmentRequisitions.fuelTypes.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("equipmentRequisitions.notes")}</Label>
              <Textarea value={fuelForm.notes} onChange={(event) => setFuelForm((current) => ({ ...current, notes: event.target.value }))} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="cursor-pointer" onClick={closeFuelDialog}>
              {t("common.cancel")}
            </Button>
            <Button type="button" className="cursor-pointer" disabled={isMutating} onClick={() => void saveFuel()}>
              {isMutating ? t("common.loading") : t("common.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createPartsOpen || Boolean(editParts)} onOpenChange={(open) => {
        if (!open) closePartsDialog();
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editParts ? t("equipmentRequisitions.editParts") : t("equipmentRequisitions.addParts")}</DialogTitle>
            <DialogDescription>{t("equipmentRequisitions.partsFormDescription")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>{t("equipmentRequisitions.equipment")}</Label>
              <Select value={partsForm.equipmentId} onValueChange={(value) => setPartsForm((current) => ({ ...current, equipmentId: value }))}>
                <SelectTrigger className="w-full cursor-pointer"><SelectValue placeholder={t("equipmentRequisitions.selectEquipment")} /></SelectTrigger>
                <SelectContent>
                  {equipment.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.name} • {item.brand} • {item.model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("equipmentRequisitions.supplier")}</Label>
              <Select value={partsForm.supplierId} onValueChange={(value) => setPartsForm((current) => ({ ...current, supplierId: value }))}>
                <SelectTrigger className="w-full cursor-pointer"><SelectValue placeholder={t("equipmentRequisitions.selectSupplier")} /></SelectTrigger>
                <SelectContent>
                  {activeSupplierOptions.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{supplierLabel(item)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("equipmentRequisitions.scheduledDate")}</Label>
              <DatePickerInput
                value={parseDateString(partsForm.scheduledDate)}
                onChange={(date) => setPartsForm((current) => ({ ...current, scheduledDate: formatDateString(date) }))}
                placeholder={t("equipmentRequisitions.scheduledDate")}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("equipmentRequisitions.descriptionLabel")}</Label>
              <Textarea value={partsForm.description} onChange={(event) => setPartsForm((current) => ({ ...current, description: event.target.value }))} rows={3} />
            </div>
            <div className="grid gap-2">
              <Label>{t("equipmentRequisitions.notes")}</Label>
              <Textarea value={partsForm.notes} onChange={(event) => setPartsForm((current) => ({ ...current, notes: event.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="cursor-pointer" onClick={closePartsDialog}>
              {t("common.cancel")}
            </Button>
            <Button type="button" className="cursor-pointer" disabled={isMutating} onClick={() => void saveParts()}>
              {isMutating ? t("common.loading") : t("common.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deleteMaintenance)}
        onOpenChange={(open) => {
          if (!open) setDeleteMaintenance(null);
        }}
        description={deleteMaintenance ? t("equipmentRequisitions.confirmDelete", { number: deleteMaintenance.number }) : ""}
        onConfirm={async () => {
          if (!deleteMaintenance) return;
          await runMutation(async () => {
            await parseResponse(await fetch(`${getRequisitionBasePath("maintenance")}/${deleteMaintenance.id}`, { method: "DELETE" }));
          }, t("common.requisitionDeleteSuccess"));
          setDeleteMaintenance(null);
        }}
        isLoading={isMutating}
      />

      <ConfirmDeleteDialog
        open={Boolean(deleteFuel)}
        onOpenChange={(open) => {
          if (!open) setDeleteFuel(null);
        }}
        description={deleteFuel ? t("equipmentRequisitions.confirmDelete", { number: deleteFuel.number }) : ""}
        onConfirm={async () => {
          if (!deleteFuel) return;
          await runMutation(async () => {
            await parseResponse(await fetch(`${getRequisitionBasePath("fuel")}/${deleteFuel.id}`, { method: "DELETE" }));
          }, t("common.requisitionDeleteSuccess"));
          setDeleteFuel(null);
        }}
        isLoading={isMutating}
      />

      <ConfirmDeleteDialog
        open={Boolean(deleteParts)}
        onOpenChange={(open) => {
          if (!open) setDeleteParts(null);
        }}
        description={deleteParts ? t("equipmentRequisitions.confirmDelete", { number: deleteParts.number }) : ""}
        onConfirm={async () => {
          if (!deleteParts) return;
          await runMutation(async () => {
            await parseResponse(await fetch(`${getRequisitionBasePath("parts")}/${deleteParts.id}`, { method: "DELETE" }));
          }, t("common.requisitionDeleteSuccess"));
          setDeleteParts(null);
        }}
        isLoading={isMutating}
      />

      <ConfirmDeleteDialog
        open={maintenanceBulkDeleteOpen}
        onOpenChange={setMaintenanceBulkDeleteOpen}
        title={t("equipmentRequisitions.bulkDeleteTitle")}
        description={t("equipmentRequisitions.bulkDeleteDescription", { count: maintenanceSelectedCount })}
        onConfirm={() => handleBulkDelete("maintenance", maintenanceTable.getSelectedRowModel().rows, () => maintenanceTable.resetRowSelection(), () => setMaintenanceBulkDeleteOpen(false))}
        isLoading={isMutating}
        confirmLabel={t("common.deleteSelected")}
      />

      <ConfirmDeleteDialog
        open={fuelBulkDeleteOpen}
        onOpenChange={setFuelBulkDeleteOpen}
        title={t("equipmentRequisitions.bulkDeleteTitle")}
        description={t("equipmentRequisitions.bulkDeleteDescription", { count: fuelSelectedCount })}
        onConfirm={() => handleBulkDelete("fuel", fuelTable.getSelectedRowModel().rows, () => fuelTable.resetRowSelection(), () => setFuelBulkDeleteOpen(false))}
        isLoading={isMutating}
        confirmLabel={t("common.deleteSelected")}
      />

      <ConfirmDeleteDialog
        open={partsBulkDeleteOpen}
        onOpenChange={setPartsBulkDeleteOpen}
        title={t("equipmentRequisitions.bulkDeleteTitle")}
        description={t("equipmentRequisitions.bulkDeleteDescription", { count: partsSelectedCount })}
        onConfirm={() => handleBulkDelete("parts", partsTable.getSelectedRowModel().rows, () => partsTable.resetRowSelection(), () => setPartsBulkDeleteOpen(false))}
        isLoading={isMutating}
        confirmLabel={t("common.deleteSelected")}
      />

      <Dialog open={Boolean(statusDialog)} onOpenChange={(open) => {
        if (!open) setStatusDialog(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{statusDialog?.status === "completed" ? t("equipmentRequisitions.complete") : statusDialog?.status === "cancelled" ? t("equipmentRequisitions.cancel") : t("equipmentRequisitions.issue")}</DialogTitle>
            <DialogDescription>{t("equipmentRequisitions.statusDialogDescription")}</DialogDescription>
          </DialogHeader>
          {statusDialog?.status === "completed" ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>{t("equipmentRequisitions.completedAt")}</Label>
                <DatePickerInput
                  value={parseDateString(completedAt)}
                  onChange={(date) => setCompletedAt(formatDateString(date))}
                  placeholder={t("equipmentRequisitions.completedAt")}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("equipmentRequisitions.completionNotes")}</Label>
                <Textarea value={completionNotes} onChange={(event) => setCompletionNotes(event.target.value)} rows={4} />
              </div>
            </div>
          ) : statusDialog?.status === "cancelled" ? (
            <div className="grid gap-2">
              <Label>{t("equipmentRequisitions.completionNotes")}</Label>
              <Textarea value={completionNotes} onChange={(event) => setCompletionNotes(event.target.value)} rows={4} />
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" className="cursor-pointer" onClick={() => setStatusDialog(null)}>
              {t("common.cancel")}
            </Button>
            <Button type="button" className="cursor-pointer" onClick={() => void handleCompleteOrCancel()} disabled={isMutating}>
              {isMutating ? t("common.loading") : t("common.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
