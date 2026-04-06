"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, EllipsisVertical, FileDown, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import {
  AdminListTableCard,
  AdminListToolbar,
} from "@/components/admin-list-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useRbac } from "@/hooks/use-rbac";
import { useI18n, useLocale } from "@/i18n/provider";
import type { EquipmentOption } from "@/lib/equipment-admin";
import type { ManagedFuelRequisition } from "@/lib/fuel-requisitions-admin";
import type { ManagedMaintenanceRequisition } from "@/lib/maintenance-requisitions-admin";
import type { SupplierOption } from "@/lib/suppliers-admin";

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

function statusBadgeVariant(status: string): React.ComponentProps<typeof Badge>["variant"] {
  if (status === "cancelled") {
    return "destructive";
  }

  if (status === "completed") {
    return "default";
  }

  return "secondary";
}

export default function EquipmentRequisitionsPage() {
  const { t } = useI18n();
  const locale = useLocale();
  const { hasPermission } = useRbac();

  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [tab, setTab] = useState("maintenance");

  const [equipment, setEquipment] = useState<EquipmentOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [maintenanceRequisitions, setMaintenanceRequisitions] = useState<ManagedMaintenanceRequisition[]>([]);
  const [fuelRequisitions, setFuelRequisitions] = useState<ManagedFuelRequisition[]>([]);

  const [maintenanceSearch, setMaintenanceSearch] = useState("");
  const [fuelSearch, setFuelSearch] = useState("");

  const [createMaintenanceOpen, setCreateMaintenanceOpen] = useState(false);
  const [editMaintenance, setEditMaintenance] = useState<ManagedMaintenanceRequisition | null>(null);
  const [maintenanceForm, setMaintenanceForm] = useState<MaintenanceFormState>(emptyMaintenanceForm());

  const [createFuelOpen, setCreateFuelOpen] = useState(false);
  const [editFuel, setEditFuel] = useState<ManagedFuelRequisition | null>(null);
  const [fuelForm, setFuelForm] = useState<FuelFormState>(emptyFuelForm());

  const [deleteMaintenance, setDeleteMaintenance] = useState<ManagedMaintenanceRequisition | null>(null);
  const [deleteFuel, setDeleteFuel] = useState<ManagedFuelRequisition | null>(null);

  const [statusDialog, setStatusDialog] = useState<{
    kind: "maintenance" | "fuel";
    id: string;
    status: "issued" | "completed" | "cancelled";
  } | null>(null);
  const [completedAt, setCompletedAt] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");

  const canCreate = hasPermission("equipment-requisitions.create");
  const canUpdate = hasPermission("equipment-requisitions.update");
  const canDelete = hasPermission("equipment-requisitions.delete");

  const supplierLabel = (supplier: SupplierOption) => supplier.tradeName || supplier.legalName;

  const supplierById = useMemo(
    () => new Map(suppliers.map((item) => [item.id, item])),
    [suppliers],
  );

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
      [
        item.number,
        item.equipmentName,
        item.supplierName,
        item.description,
        item.notes ?? "",
      ].some((value) => value.toLowerCase().includes(term)),
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
        item.notes,
      ].some((value) => value.toLowerCase().includes(term)),
    );
  }, [fuelRequisitions, fuelSearch]);

  async function loadData() {
    setLoading(true);

    try {
      const [maintenancePayload, fuelPayload] = await Promise.all([
        parseResponse<MaintenanceResponse>(await fetch("/api/maintenance-requisitions", { cache: "no-store" })),
        parseResponse<FuelResponse>(await fetch("/api/fuel-requisitions", { cache: "no-store" })),
      ]);

      setMaintenanceRequisitions(maintenancePayload.maintenanceRequisitions);
      setFuelRequisitions(fuelPayload.fuelRequisitions);
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
      notes: editFuel.notes,
    });
  }, [editFuel]);

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

  async function handleOpenPdf(kind: "maintenance" | "fuel", id: string) {
    const path = kind === "maintenance"
      ? `/api/maintenance-requisitions/${id}/pdf`
      : `/api/fuel-requisitions/${id}/pdf`;

    window.open(path, "_blank", "noopener,noreferrer");
  }

  async function handleIssue(kind: "maintenance" | "fuel", id: string) {
    const path = kind === "maintenance"
      ? `/api/maintenance-requisitions/${id}/status`
      : `/api/fuel-requisitions/${id}/status`;

    await runMutation(async () => {
      await parseResponse(
        await fetch(path, {
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

    const path = statusDialog.kind === "maintenance"
      ? `/api/maintenance-requisitions/${statusDialog.id}/status`
      : `/api/fuel-requisitions/${statusDialog.id}/status`;

    await runMutation(async () => {
      await parseResponse(
        await fetch(path, {
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
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="maintenance">{t("equipmentRequisitions.tabs.maintenance")}</TabsTrigger>
              <TabsTrigger value="fuel">{t("equipmentRequisitions.tabs.fuel")}</TabsTrigger>
            </TabsList>

            <TabsContent value="maintenance" className="space-y-4">
              <AdminListToolbar>
                <div className="grid min-w-[220px] flex-1 gap-2">
                  <Label htmlFor="maintenance-search">{t("equipmentRequisitions.search")}</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="maintenance-search"
                      className="pl-9"
                      value={maintenanceSearch}
                      onChange={(event) => setMaintenanceSearch(event.target.value)}
                      placeholder={t("equipmentRequisitions.searchPlaceholder")}
                    />
                  </div>
                </div>
                {canCreate ? (
                  <Button className="cursor-pointer" onClick={() => setCreateMaintenanceOpen(true)}>
                    <Plus className="mr-2 size-4" />
                    {t("equipmentRequisitions.addMaintenance")}
                  </Button>
                ) : null}
              </AdminListToolbar>

              <AdminListTableCard>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("equipmentRequisitions.number")}</TableHead>
                      <TableHead>{t("equipmentRequisitions.scheduledDate")}</TableHead>
                      <TableHead>{t("equipmentRequisitions.equipment")}</TableHead>
                      <TableHead>{t("equipmentRequisitions.supplier")}</TableHead>
                      <TableHead>{t("equipmentRequisitions.status")}</TableHead>
                      <TableHead>{t("equipmentRequisitions.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenanceVisible.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          {t("equipmentRequisitions.noMaintenance")}
                        </TableCell>
                      </TableRow>
                    ) : maintenanceVisible.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.number}</div>
                          <div className="text-xs text-muted-foreground">R{item.revisionNumber}</div>
                        </TableCell>
                        <TableCell>{formatDate(item.scheduledDate, locale)}</TableCell>
                        <TableCell>{item.equipmentName}</TableCell>
                        <TableCell>{item.supplierName}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(item.status)}>
                            {t(`equipmentRequisitions.statuses.${item.status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                                <EllipsisVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canUpdate ? (
                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  onClick={() => setEditMaintenance(item)}
                                  disabled={item.status === "completed" || item.status === "cancelled"}
                                >
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </AdminListTableCard>
            </TabsContent>

            <TabsContent value="fuel" className="space-y-4">
              <AdminListToolbar>
                <div className="grid min-w-[220px] flex-1 gap-2">
                  <Label htmlFor="fuel-search">{t("equipmentRequisitions.search")}</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="fuel-search"
                      className="pl-9"
                      value={fuelSearch}
                      onChange={(event) => setFuelSearch(event.target.value)}
                      placeholder={t("equipmentRequisitions.searchPlaceholder")}
                    />
                  </div>
                </div>
                {canCreate ? (
                  <Button className="cursor-pointer" onClick={() => setCreateFuelOpen(true)}>
                    <Plus className="mr-2 size-4" />
                    {t("equipmentRequisitions.addFuel")}
                  </Button>
                ) : null}
              </AdminListToolbar>

              <AdminListTableCard>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("equipmentRequisitions.number")}</TableHead>
                      <TableHead>{t("equipmentRequisitions.scheduledDate")}</TableHead>
                      <TableHead>{t("equipmentRequisitions.equipment")}</TableHead>
                      <TableHead>{t("equipmentRequisitions.supplier")}</TableHead>
                      <TableHead>{t("equipmentRequisitions.status")}</TableHead>
                      <TableHead>{t("equipmentRequisitions.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fuelVisible.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          {t("equipmentRequisitions.noFuel")}
                        </TableCell>
                      </TableRow>
                    ) : fuelVisible.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.number}</div>
                          <div className="text-xs text-muted-foreground">R{item.revisionNumber}</div>
                        </TableCell>
                        <TableCell>{formatDate(item.scheduledDate, locale)}</TableCell>
                        <TableCell>{item.equipmentName}</TableCell>
                        <TableCell>{item.supplierName}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(item.status)}>
                            {t(`equipmentRequisitions.statuses.${item.status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                                <EllipsisVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canUpdate ? (
                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  onClick={() => setEditFuel(item)}
                                  disabled={item.status === "completed" || item.status === "cancelled"}
                                >
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </AdminListTableCard>
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Dialog open={createMaintenanceOpen || Boolean(editMaintenance)} onOpenChange={(open) => {
        if (!open) {
          setCreateMaintenanceOpen(false);
          setEditMaintenance(null);
          setMaintenanceForm(emptyMaintenanceForm());
        }
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
              <Input type="date" value={maintenanceForm.scheduledDate} onChange={(event) => setMaintenanceForm((current) => ({ ...current, scheduledDate: event.target.value }))} />
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
            <Button type="button" variant="outline" className="cursor-pointer" onClick={() => {
              setCreateMaintenanceOpen(false);
              setEditMaintenance(null);
            }}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="cursor-pointer"
              disabled={isMutating}
              onClick={async () => {
                const path = editMaintenance
                  ? `/api/maintenance-requisitions/${editMaintenance.id}`
                  : "/api/maintenance-requisitions";
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

                setCreateMaintenanceOpen(false);
                setEditMaintenance(null);
                setMaintenanceForm(emptyMaintenanceForm());
              }}
            >
              {isMutating ? t("common.loading") : t("common.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createFuelOpen || Boolean(editFuel)} onOpenChange={(open) => {
        if (!open) {
          setCreateFuelOpen(false);
          setEditFuel(null);
          setFuelForm(emptyFuelForm());
        }
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
              <Input type="date" value={fuelForm.scheduledDate} onChange={(event) => setFuelForm((current) => ({ ...current, scheduledDate: event.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>{t("equipmentRequisitions.notes")}</Label>
              <Textarea value={fuelForm.notes} onChange={(event) => setFuelForm((current) => ({ ...current, notes: event.target.value }))} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="cursor-pointer" onClick={() => {
              setCreateFuelOpen(false);
              setEditFuel(null);
            }}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="cursor-pointer"
              disabled={isMutating}
              onClick={async () => {
                const path = editFuel
                  ? `/api/fuel-requisitions/${editFuel.id}`
                  : "/api/fuel-requisitions";
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

                setCreateFuelOpen(false);
                setEditFuel(null);
                setFuelForm(emptyFuelForm());
              }}
            >
              {isMutating ? t("common.loading") : t("common.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deleteMaintenance)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteMaintenance(null);
          }
        }}
        description={deleteMaintenance ? t("equipmentRequisitions.confirmDelete", { number: deleteMaintenance.number }) : ""}
        onConfirm={async () => {
          if (!deleteMaintenance) {
            return;
          }

          await runMutation(async () => {
            await parseResponse(await fetch(`/api/maintenance-requisitions/${deleteMaintenance.id}`, { method: "DELETE" }));
          }, t("common.requisitionDeleteSuccess"));
          setDeleteMaintenance(null);
        }}
        isLoading={isMutating}
      />

      <ConfirmDeleteDialog
        open={Boolean(deleteFuel)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteFuel(null);
          }
        }}
        description={deleteFuel ? t("equipmentRequisitions.confirmDelete", { number: deleteFuel.number }) : ""}
        onConfirm={async () => {
          if (!deleteFuel) {
            return;
          }

          await runMutation(async () => {
            await parseResponse(await fetch(`/api/fuel-requisitions/${deleteFuel.id}`, { method: "DELETE" }));
          }, t("common.requisitionDeleteSuccess"));
          setDeleteFuel(null);
        }}
        isLoading={isMutating}
      />

      <Dialog open={Boolean(statusDialog)} onOpenChange={(open) => {
        if (!open) {
          setStatusDialog(null);
        }
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
                <Input type="date" value={completedAt} onChange={(event) => setCompletedAt(event.target.value)} />
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
