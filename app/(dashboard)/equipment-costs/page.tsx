"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, CircleDollarSign, EllipsisVertical, Pencil, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { FuelFormDialog } from "./components/fuel-form-dialog";
import { MaintenanceFormDialog } from "./components/maintenance-form-dialog";
import {
  AdminFiltersDialog,
  AdminFiltersSection,
  AdminListTableCard,
  AdminListToolbar,
} from "@/components/admin-list-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useRbac } from "@/hooks/use-rbac";
import { useI18n, useLocale } from "@/i18n/provider";
import type { EquipmentOption, ManagedEquipment } from "@/lib/equipment-admin";
import type {
  CreateFuelInput,
  ManagedFuelRecord,
  UpdateFuelInput,
} from "@/lib/fuel-admin";
import type {
  CreateMaintenanceInput,
  ManagedMaintenanceRecord,
  UpdateMaintenanceInput,
} from "@/lib/maintenance-admin";
import { getSemanticStatusBadgeClass } from "@/lib/status-badge";

type EquipmentResponse = {
  equipment: ManagedEquipment[];
};

type MaintenanceResponse = {
  maintenanceRecords: ManagedMaintenanceRecord[];
  equipment: EquipmentOption[];
};

type FuelResponse = {
  fuelRecords: ManagedFuelRecord[];
  equipment: EquipmentOption[];
};

type MaintenanceStatusAction =
  | {
    record: ManagedMaintenanceRecord;
    status: "completed" | "cancelled";
  }
  | null;

type PaymentDialogState =
  | {
    kind: "maintenance" | "fuel";
    recordId: string;
    financialStatus: "pending" | "paid" | "cancelled";
    paymentDueDate?: string | null;
    paidAt?: string | null;
    title: string;
    description: string;
  }
  | null;

type DeleteState =
  | { kind: "maintenance"; record: ManagedMaintenanceRecord }
  | { kind: "fuel"; record: ManagedFuelRecord }
  | null;

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function isBeforeToday(value: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parseDateOnly(value).getTime() < today.getTime();
}

function isDateInRange(value: string, from?: string, to?: string) {
  if (!from && !to) {
    return true;
  }

  const time = parseDateOnly(value).getTime();
  const fromTime = from ? parseDateOnly(from).getTime() : Number.NEGATIVE_INFINITY;
  const toTime = to ? parseDateOnly(to).getTime() : Number.POSITIVE_INFINITY;

  return time >= fromTime && time <= toTime;
}

function formatMoney(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(parseDateOnly(value));
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed.");
  }

  return payload as T;
}

function OverviewCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function ActionDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  onConfirm,
  isLoading,
  confirmVariant = "default",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children?: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
  confirmVariant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);

  async function handleConfirm() {
    setConfirming(true);

    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      return;
    } finally {
      setConfirming(false);
    }
  }

  const disabled = isLoading || confirming;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button type="button" variant="outline" className="cursor-pointer" onClick={() => onOpenChange(false)} disabled={disabled}>
            {t("common.cancel")}
          </Button>
          <Button type="button" variant={confirmVariant} className="cursor-pointer" onClick={() => void handleConfirm()} disabled={disabled}>
            {disabled ? t("common.loading") : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function EquipmentCostsPage() {
  const { t } = useI18n();
  const locale = useLocale();
  const { hasPermission } = useRbac();
  const [equipment, setEquipment] = useState<EquipmentOption[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<ManagedMaintenanceRecord[]>([]);
  const [fuelRecords, setFuelRecords] = useState<ManagedFuelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const [maintenanceSearch, setMaintenanceSearch] = useState("");
  const [maintenanceFrom, setMaintenanceFrom] = useState("");
  const [maintenanceTo, setMaintenanceTo] = useState("");
  const [maintenanceEquipment, setMaintenanceEquipment] = useState("all");
  const [maintenanceType, setMaintenanceType] = useState("all");
  const [maintenanceStatus, setMaintenanceStatus] = useState("all");
  const [maintenanceFinancialStatus, setMaintenanceFinancialStatus] = useState("all");
  const [maintenanceOverdue, setMaintenanceOverdue] = useState("all");

  const [fuelSearch, setFuelSearch] = useState("");
  const [fuelFrom, setFuelFrom] = useState("");
  const [fuelTo, setFuelTo] = useState("");
  const [fuelEquipment, setFuelEquipment] = useState("all");
  const [fuelType, setFuelType] = useState("all");
  const [fuelFinancialStatus, setFuelFinancialStatus] = useState("all");

  const [overviewFrom, setOverviewFrom] = useState("");
  const [overviewTo, setOverviewTo] = useState("");
  const [overviewFiltersOpen, setOverviewFiltersOpen] = useState(false);
  const [draftOverviewFrom, setDraftOverviewFrom] = useState("");
  const [draftOverviewTo, setDraftOverviewTo] = useState("");

  const [maintenanceFiltersOpen, setMaintenanceFiltersOpen] = useState(false);
  const [draftMaintenanceFrom, setDraftMaintenanceFrom] = useState("");
  const [draftMaintenanceTo, setDraftMaintenanceTo] = useState("");
  const [draftMaintenanceEquipment, setDraftMaintenanceEquipment] = useState("all");
  const [draftMaintenanceType, setDraftMaintenanceType] = useState("all");
  const [draftMaintenanceStatus, setDraftMaintenanceStatus] = useState("all");
  const [draftMaintenanceFinancialStatus, setDraftMaintenanceFinancialStatus] = useState("all");
  const [draftMaintenanceOverdue, setDraftMaintenanceOverdue] = useState("all");

  const [fuelFiltersOpen, setFuelFiltersOpen] = useState(false);
  const [draftFuelFrom, setDraftFuelFrom] = useState("");
  const [draftFuelTo, setDraftFuelTo] = useState("");
  const [draftFuelEquipment, setDraftFuelEquipment] = useState("all");
  const [draftFuelType, setDraftFuelType] = useState("all");
  const [draftFuelFinancialStatus, setDraftFuelFinancialStatus] = useState("all");

  const [createMaintenanceOpen, setCreateMaintenanceOpen] = useState(false);
  const [editMaintenance, setEditMaintenance] = useState<ManagedMaintenanceRecord | null>(null);
  const [createFuelOpen, setCreateFuelOpen] = useState(false);
  const [editFuel, setEditFuel] = useState<ManagedFuelRecord | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState>(null);
  const [maintenanceStatusAction, setMaintenanceStatusAction] = useState<MaintenanceStatusAction>(null);
  const [paymentDialog, setPaymentDialog] = useState<PaymentDialogState>(null);
  const [statusPerformedDate, setStatusPerformedDate] = useState("");
  const [statusAmountTotal, setStatusAmountTotal] = useState("");
  const [paymentDueDate, setPaymentDueDate] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid" | "cancelled">("pending");

  const canCreate = hasPermission("equipment-costs.create");
  const canUpdate = hasPermission("equipment-costs.update");
  const canDelete = hasPermission("equipment-costs.delete");

  const activeEquipment = useMemo(
    () => equipment.slice().sort((a, b) => a.name.localeCompare(b.name, locale)),
    [equipment, locale],
  );

  async function loadData() {
    setLoading(true);

    try {
      const [equipmentPayload, maintenancePayload, fuelPayload] = await Promise.all([
        parseResponse<EquipmentResponse>(await fetch("/api/equipment", { cache: "no-store" })),
        parseResponse<MaintenanceResponse>(await fetch("/api/maintenance-records", { cache: "no-store" })),
        parseResponse<FuelResponse>(await fetch("/api/fuel-records", { cache: "no-store" })),
      ]);

      setEquipment(
        equipmentPayload.equipment
          .filter((item) => item.status === "active")
          .map((item) => ({
            id: item.id,
            name: item.name,
            brand: item.brand,
            model: item.model,
          })),
      );
      setMaintenanceRecords(maintenancePayload.maintenanceRecords);
      setFuelRecords(fuelPayload.fuelRecords);
    } catch (error) {
      toast.error(getErrorMessage(error, t("equipmentCosts.loadError")));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function runMutation(
    operation: () => Promise<void>,
    successMessage: string,
    fallbackErrorMessage: string,
  ) {
    setIsMutating(true);

    try {
      await operation();
      await loadData();
      toast.success(successMessage);
    } catch (error) {
      toast.error(getErrorMessage(error, fallbackErrorMessage));
      throw error;
    } finally {
      setIsMutating(false);
    }
  }

  const visibleMaintenance = useMemo(() => maintenanceRecords.filter((record) => {
    const search = maintenanceSearch.trim().toLowerCase();

    if (
      search
      && ![
        record.equipmentName,
        record.equipmentBrand,
        record.equipmentModel,
        record.description,
        record.supplierName ?? "",
        record.documentNumber ?? "",
      ].some((value) => value.toLowerCase().includes(search))
    ) {
      return false;
    }

    if (!isDateInRange(record.plannedDate, maintenanceFrom, maintenanceTo)) {
      return false;
    }

    if (maintenanceEquipment !== "all" && record.equipmentId !== maintenanceEquipment) {
      return false;
    }

    if (maintenanceType !== "all" && record.maintenanceType !== maintenanceType) {
      return false;
    }

    if (maintenanceStatus !== "all" && record.status !== maintenanceStatus) {
      return false;
    }

    if (maintenanceFinancialStatus !== "all" && record.financialStatus !== maintenanceFinancialStatus) {
      return false;
    }

    if (maintenanceOverdue === "yes" && !(record.status === "planned" && isBeforeToday(record.plannedDate))) {
      return false;
    }

    return true;
  }), [
    maintenanceEquipment,
    maintenanceFinancialStatus,
    maintenanceFrom,
    maintenanceOverdue,
    maintenanceRecords,
    maintenanceSearch,
    maintenanceStatus,
    maintenanceTo,
    maintenanceType,
  ]);

  const visibleFuel = useMemo(() => fuelRecords.filter((record) => {
    const search = fuelSearch.trim().toLowerCase();

    if (
      search
      && ![
        record.equipmentName ?? "",
        record.equipmentBrand ?? "",
        record.equipmentModel ?? "",
        record.supplierName ?? "",
        record.documentNumber ?? "",
        record.notes ?? "",
      ].some((value) => value.toLowerCase().includes(search))
    ) {
      return false;
    }

    if (!isDateInRange(record.fuelDate, fuelFrom, fuelTo)) {
      return false;
    }

    if (fuelEquipment === "linked" && !record.equipmentId) {
      return false;
    }

    if (fuelEquipment === "no-equipment" && record.equipmentId) {
      return false;
    }

    if (fuelEquipment !== "all" && fuelEquipment !== "linked" && fuelEquipment !== "no-equipment" && record.equipmentId !== fuelEquipment) {
      return false;
    }

    if (fuelType !== "all" && record.fuelType !== fuelType) {
      return false;
    }

    if (fuelFinancialStatus !== "all" && record.financialStatus !== fuelFinancialStatus) {
      return false;
    }

    return true;
  }), [fuelEquipment, fuelFinancialStatus, fuelFrom, fuelRecords, fuelSearch, fuelTo, fuelType]);

  const overviewMaintenance = useMemo(
    () => maintenanceRecords.filter((record) => isDateInRange(record.plannedDate, overviewFrom, overviewTo)),
    [maintenanceRecords, overviewFrom, overviewTo],
  );
  const overviewFuel = useMemo(
    () => fuelRecords.filter((record) => isDateInRange(record.fuelDate, overviewFrom, overviewTo)),
    [fuelRecords, overviewFrom, overviewTo],
  );

  const maintenanceTotal = overviewMaintenance.reduce((total, record) => (
    record.status === "cancelled" ? total : total + Number(record.amountTotal ?? 0)
  ), 0);
  const fuelTotal = overviewFuel.reduce((total, record) => (
    record.financialStatus === "cancelled" ? total : total + Number(record.totalAmount)
  ), 0);
  const pendingPaymentTotal = [
    ...overviewMaintenance
      .filter((record) => record.financialStatus === "pending" && record.status !== "cancelled")
      .map((record) => Number(record.amountTotal ?? 0)),
    ...overviewFuel
      .filter((record) => record.financialStatus === "pending")
      .map((record) => Number(record.totalAmount)),
  ].reduce((sum, value) => sum + value, 0);
  const overduePreventiveCount = overviewMaintenance.filter(
    (record) => record.maintenanceType === "preventive" && record.status === "planned" && isBeforeToday(record.plannedDate),
  ).length;

  async function handleCreateMaintenance(values: CreateMaintenanceInput) {
    await runMutation(async () => {
      await parseResponse(
        await fetch("/api/maintenance-records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        }),
      );
    }, t("common.maintenanceCreateSuccess"), t("equipmentCosts.updateError"));
  }

  async function handleUpdateMaintenance(id: string, values: UpdateMaintenanceInput) {
    await runMutation(async () => {
      await parseResponse(
        await fetch(`/api/maintenance-records/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        }),
      );
    }, t("common.maintenanceUpdateSuccess"), t("equipmentCosts.updateError"));
  }

  async function handleCreateFuel(values: CreateFuelInput) {
    await runMutation(async () => {
      await parseResponse(
        await fetch("/api/fuel-records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        }),
      );
    }, t("common.fuelCreateSuccess"), t("equipmentCosts.updateError"));
  }

  async function handleUpdateFuel(id: string, values: UpdateFuelInput) {
    await runMutation(async () => {
      await parseResponse(
        await fetch(`/api/fuel-records/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        }),
      );
    }, t("common.fuelUpdateSuccess"), t("equipmentCosts.updateError"));
  }

  useEffect(() => {
    if (!maintenanceStatusAction) {
      setStatusPerformedDate("");
      setStatusAmountTotal("");
      return;
    }

    setStatusPerformedDate(maintenanceStatusAction.record.performedDate ?? "");
    setStatusAmountTotal(
      maintenanceStatusAction.record.amountTotal != null ? String(maintenanceStatusAction.record.amountTotal) : "",
    );
  }, [maintenanceStatusAction]);

  useEffect(() => {
    if (!paymentDialog) {
      setPaymentStatus("pending");
      setPaymentDueDate("");
      setPaidAt("");
      return;
    }

    setPaymentStatus(paymentDialog.financialStatus);
    setPaymentDueDate(paymentDialog.paymentDueDate ?? "");
    setPaidAt(paymentDialog.paidAt ?? "");
  }, [paymentDialog]);

  const overviewActiveFilterCount = [overviewFrom, overviewTo].filter(Boolean).length;
  const maintenanceActiveFilterCount = [
    maintenanceFrom,
    maintenanceTo,
    maintenanceEquipment !== "all",
    maintenanceType !== "all",
    maintenanceStatus !== "all",
    maintenanceFinancialStatus !== "all",
    maintenanceOverdue !== "all",
  ].filter(Boolean).length;
  const fuelActiveFilterCount = [
    fuelFrom,
    fuelTo,
    fuelEquipment !== "all",
    fuelType !== "all",
    fuelFinancialStatus !== "all",
  ].filter(Boolean).length;

  const handleOpenOverviewFilters = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraftOverviewFrom(overviewFrom);
      setDraftOverviewTo(overviewTo);
    }

    setOverviewFiltersOpen(nextOpen);
  };

  const handleApplyOverviewFilters = () => {
    setOverviewFrom(draftOverviewFrom);
    setOverviewTo(draftOverviewTo);
    setOverviewFiltersOpen(false);
  };

  const handleClearOverviewFilters = () => {
    setOverviewFrom("");
    setOverviewTo("");
    setDraftOverviewFrom("");
    setDraftOverviewTo("");
    setOverviewFiltersOpen(false);
  };

  const handleOpenMaintenanceFilters = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraftMaintenanceFrom(maintenanceFrom);
      setDraftMaintenanceTo(maintenanceTo);
      setDraftMaintenanceEquipment(maintenanceEquipment);
      setDraftMaintenanceType(maintenanceType);
      setDraftMaintenanceStatus(maintenanceStatus);
      setDraftMaintenanceFinancialStatus(maintenanceFinancialStatus);
      setDraftMaintenanceOverdue(maintenanceOverdue);
    }

    setMaintenanceFiltersOpen(nextOpen);
  };

  const handleApplyMaintenanceFilters = () => {
    setMaintenanceFrom(draftMaintenanceFrom);
    setMaintenanceTo(draftMaintenanceTo);
    setMaintenanceEquipment(draftMaintenanceEquipment);
    setMaintenanceType(draftMaintenanceType);
    setMaintenanceStatus(draftMaintenanceStatus);
    setMaintenanceFinancialStatus(draftMaintenanceFinancialStatus);
    setMaintenanceOverdue(draftMaintenanceOverdue);
    setMaintenanceFiltersOpen(false);
  };

  const handleClearMaintenanceFilters = () => {
    setMaintenanceFrom("");
    setMaintenanceTo("");
    setMaintenanceEquipment("all");
    setMaintenanceType("all");
    setMaintenanceStatus("all");
    setMaintenanceFinancialStatus("all");
    setMaintenanceOverdue("all");
    setDraftMaintenanceFrom("");
    setDraftMaintenanceTo("");
    setDraftMaintenanceEquipment("all");
    setDraftMaintenanceType("all");
    setDraftMaintenanceStatus("all");
    setDraftMaintenanceFinancialStatus("all");
    setDraftMaintenanceOverdue("all");
    setMaintenanceFiltersOpen(false);
  };

  const handleOpenFuelFilters = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraftFuelFrom(fuelFrom);
      setDraftFuelTo(fuelTo);
      setDraftFuelEquipment(fuelEquipment);
      setDraftFuelType(fuelType);
      setDraftFuelFinancialStatus(fuelFinancialStatus);
    }

    setFuelFiltersOpen(nextOpen);
  };

  const handleApplyFuelFilters = () => {
    setFuelFrom(draftFuelFrom);
    setFuelTo(draftFuelTo);
    setFuelEquipment(draftFuelEquipment);
    setFuelType(draftFuelType);
    setFuelFinancialStatus(draftFuelFinancialStatus);
    setFuelFiltersOpen(false);
  };

  const handleClearFuelFilters = () => {
    setFuelFrom("");
    setFuelTo("");
    setFuelEquipment("all");
    setFuelType("all");
    setFuelFinancialStatus("all");
    setDraftFuelFrom("");
    setDraftFuelTo("");
    setDraftFuelEquipment("all");
    setDraftFuelType("all");
    setDraftFuelFinancialStatus("all");
    setFuelFiltersOpen(false);
  };

  return (
    <>
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{t("equipmentCosts.title")}</h1>
        </div>
      </div>

      <div className="@container/main mt-2 space-y-4 px-4 lg:mt-4 lg:px-6">
        {loading ? (
          <div className="rounded-md border px-6 py-10 text-sm text-muted-foreground">
            {t("equipmentCosts.loading")}
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">{t("equipmentCosts.tabs.overview")}</TabsTrigger>
              <TabsTrigger value="maintenance">{t("equipmentCosts.tabs.maintenance")}</TabsTrigger>
              <TabsTrigger value="fuel">{t("equipmentCosts.tabs.fuel")}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <AdminListToolbar>
                <AdminFiltersDialog
                  open={overviewFiltersOpen}
                  onOpenChange={handleOpenOverviewFilters}
                  title={t("common.filters")}
                  description={t("common.activeFilters", { count: overviewActiveFilterCount })}
                  activeCount={overviewActiveFilterCount}
                  triggerLabel={t("common.filters")}
                  clearLabel={t("common.clearFilters")}
                  cancelLabel={t("common.cancel")}
                  applyLabel={t("common.apply")}
                  onClear={handleClearOverviewFilters}
                  onApply={handleApplyOverviewFilters}
                >
                  <AdminFiltersSection title={t("common.filters")}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="grid min-w-0 gap-2">
                        <Label htmlFor="overview-from">{t("equipmentCosts.periodFrom")}</Label>
                        <DatePickerInput
                          id="overview-from"
                          value={parseDateString(draftOverviewFrom)}
                          onChange={(date) => setDraftOverviewFrom(formatDateString(date))}
                          placeholder={t("equipmentCosts.periodFrom")}
                        />
                      </div>
                      <div className="grid min-w-0 gap-2">
                        <Label htmlFor="overview-to">{t("equipmentCosts.periodTo")}</Label>
                        <DatePickerInput
                          id="overview-to"
                          value={parseDateString(draftOverviewTo)}
                          onChange={(date) => setDraftOverviewTo(formatDateString(date))}
                          placeholder={t("equipmentCosts.periodTo")}
                        />
                      </div>
                    </div>
                  </AdminFiltersSection>
                </AdminFiltersDialog>
              </AdminListToolbar>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <OverviewCard title={t("equipmentCosts.cards.maintenanceCost")} value={formatMoney(maintenanceTotal, locale)} />
                <OverviewCard title={t("equipmentCosts.cards.fuelCost")} value={formatMoney(fuelTotal, locale)} />
                <OverviewCard title={t("equipmentCosts.cards.pendingPayments")} value={formatMoney(pendingPaymentTotal, locale)} />
                <OverviewCard title={t("equipmentCosts.cards.overduePreventive")} value={String(overduePreventiveCount)} />
              </div>
            </TabsContent>

            <TabsContent value="maintenance" className="space-y-4">
              <AdminListToolbar>
                <div className="grid min-w-[220px] flex-1 gap-2">
                  <Label htmlFor="maintenance-search">{t("equipmentCosts.searchMaintenance")}</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="maintenance-search"
                      className="pl-9"
                      value={maintenanceSearch}
                      onChange={(event) => setMaintenanceSearch(event.target.value)}
                      placeholder={t("equipmentCosts.searchMaintenancePlaceholder")}
                    />
                  </div>
                </div>
                <AdminFiltersDialog
                  open={maintenanceFiltersOpen}
                  onOpenChange={handleOpenMaintenanceFilters}
                  title={t("common.filters")}
                  description={t("common.activeFilters", { count: maintenanceActiveFilterCount })}
                  activeCount={maintenanceActiveFilterCount}
                  triggerLabel={t("common.filters")}
                  clearLabel={t("common.clearFilters")}
                  cancelLabel={t("common.cancel")}
                  applyLabel={t("common.apply")}
                  onClear={handleClearMaintenanceFilters}
                  onApply={handleApplyMaintenanceFilters}
                >
                  <AdminFiltersSection title={t("common.filters")}>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <div className="grid gap-2">
                        <Label htmlFor="maintenance-from">{t("equipmentCosts.periodFrom")}</Label>
                        <DatePickerInput
                          id="maintenance-from"
                          value={parseDateString(draftMaintenanceFrom)}
                          onChange={(date) => setDraftMaintenanceFrom(formatDateString(date))}
                          placeholder={t("equipmentCosts.periodFrom")}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="maintenance-to">{t("equipmentCosts.periodTo")}</Label>
                        <DatePickerInput
                          id="maintenance-to"
                          value={parseDateString(draftMaintenanceTo)}
                          onChange={(date) => setDraftMaintenanceTo(formatDateString(date))}
                          placeholder={t("equipmentCosts.periodTo")}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>{t("equipmentCosts.equipment")}</Label>
                        <Select value={draftMaintenanceEquipment} onValueChange={setDraftMaintenanceEquipment}>
                          <SelectTrigger className="min-w-[180px] cursor-pointer"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("equipmentCosts.allEquipment")}</SelectItem>
                            {activeEquipment.map((item) => (
                              <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>{t("equipmentCosts.maintenanceType")}</Label>
                        <Select value={draftMaintenanceType} onValueChange={setDraftMaintenanceType}>
                          <SelectTrigger className="min-w-[180px] cursor-pointer"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("equipmentCosts.allTypes")}</SelectItem>
                            <SelectItem value="preventive">{t("equipmentCosts.maintenanceTypes.preventive")}</SelectItem>
                            <SelectItem value="corrective">{t("equipmentCosts.maintenanceTypes.corrective")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>{t("equipmentCosts.status")}</Label>
                        <Select value={draftMaintenanceStatus} onValueChange={setDraftMaintenanceStatus}>
                          <SelectTrigger className="min-w-[180px] cursor-pointer"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("equipmentCosts.allStatuses")}</SelectItem>
                            <SelectItem value="planned">{t("equipmentCosts.maintenanceStatuses.planned")}</SelectItem>
                            <SelectItem value="completed">{t("equipmentCosts.maintenanceStatuses.completed")}</SelectItem>
                            <SelectItem value="cancelled">{t("equipmentCosts.maintenanceStatuses.cancelled")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>{t("equipmentCosts.financialStatus")}</Label>
                        <Select value={draftMaintenanceFinancialStatus} onValueChange={setDraftMaintenanceFinancialStatus}>
                          <SelectTrigger className="min-w-[180px] cursor-pointer"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("equipmentCosts.allFinancialStatuses")}</SelectItem>
                            <SelectItem value="pending">{t("equipmentCosts.financialStatuses.pending")}</SelectItem>
                            <SelectItem value="paid">{t("equipmentCosts.financialStatuses.paid")}</SelectItem>
                            <SelectItem value="cancelled">{t("equipmentCosts.financialStatuses.cancelled")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>{t("equipmentCosts.overdueOnly")}</Label>
                        <Select value={draftMaintenanceOverdue} onValueChange={setDraftMaintenanceOverdue}>
                          <SelectTrigger className="min-w-[180px] cursor-pointer"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("equipmentCosts.allRecords")}</SelectItem>
                            <SelectItem value="yes">{t("equipmentCosts.onlyOverdue")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </AdminFiltersSection>
                </AdminFiltersDialog>
                {canCreate ? (
                  <MaintenanceFormDialog
                    mode="create"
                    open={createMaintenanceOpen}
                    onOpenChange={setCreateMaintenanceOpen}
                    onSubmit={handleCreateMaintenance}
                    isSubmitting={isMutating}
                    equipment={activeEquipment}
                  />
                ) : null}
              </AdminListToolbar>

              <AdminListTableCard>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("equipmentCosts.equipment")}</TableHead>
                      <TableHead>{t("equipmentCosts.descriptionLabel")}</TableHead>
                      <TableHead>{t("equipmentCosts.maintenanceType")}</TableHead>
                      <TableHead>{t("equipmentCosts.plannedDate")}</TableHead>
                      <TableHead>{t("equipmentCosts.amountTotal")}</TableHead>
                      <TableHead>{t("equipmentCosts.status")}</TableHead>
                      <TableHead>{t("equipmentCosts.financialStatus")}</TableHead>
                      <TableHead>{t("equipmentCosts.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleMaintenance.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                          {t("equipmentCosts.noMaintenance")}
                        </TableCell>
                      </TableRow>
                    ) : visibleMaintenance.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="font-medium">{record.equipmentName}</div>
                          <div className="text-xs text-muted-foreground">{record.equipmentBrand} • {record.equipmentModel}</div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[320px] truncate">{record.description}</div>
                          {record.supplierName ? <div className="text-xs text-muted-foreground">{record.supplierName}</div> : null}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{t(`equipmentCosts.maintenanceTypes.${record.maintenanceType}`)}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>{formatDate(record.plannedDate, locale)}</div>
                          {record.status === "planned" && isBeforeToday(record.plannedDate) ? (
                            <div className="text-xs text-amber-600">{t("equipmentCosts.overdueBadge")}</div>
                          ) : null}
                        </TableCell>
                        <TableCell>{record.amountTotal != null ? formatMoney(record.amountTotal, locale) : "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={getSemanticStatusBadgeClass(record.status)}>
                            {t(`equipmentCosts.maintenanceStatuses.${record.status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={record.financialStatus === "paid" ? "default" : "secondary"}
                            className={getSemanticStatusBadgeClass(record.financialStatus)}
                          >
                            {t(`equipmentCosts.financialStatuses.${record.financialStatus}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" disabled={isMutating}>
                                <EllipsisVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canUpdate ? (
                                <DropdownMenuItem className="cursor-pointer" onClick={() => setEditMaintenance(record)}>
                                  <Pencil className="mr-2 size-4" />
                                  {t("common.saveChanges")}
                                </DropdownMenuItem>
                              ) : null}
                              {canUpdate && record.status === "planned" ? (
                                <DropdownMenuItem className="cursor-pointer" onClick={() => setMaintenanceStatusAction({ record, status: "completed" })}>
                                  <Check className="mr-2 size-4" />
                                  {t("equipmentCosts.completeMaintenance")}
                                </DropdownMenuItem>
                              ) : null}
                              {canUpdate && record.status !== "cancelled" ? (
                                <DropdownMenuItem className="cursor-pointer" onClick={() => setMaintenanceStatusAction({ record, status: "cancelled" })}>
                                  <X className="mr-2 size-4" />
                                  {t("equipmentCosts.cancelMaintenance")}
                                </DropdownMenuItem>
                              ) : null}
                              {canUpdate && record.status !== "cancelled" ? (
                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  onClick={() => setPaymentDialog({
                                    kind: "maintenance",
                                    recordId: record.id,
                                    financialStatus: record.financialStatus,
                                    paymentDueDate: record.paymentDueDate,
                                    paidAt: record.paidAt,
                                    title: t("equipmentCosts.updateMaintenancePaymentTitle"),
                                    description: t("equipmentCosts.updateMaintenancePaymentDescription"),
                                  })}
                                >
                                  <CircleDollarSign className="mr-2 size-4" />
                                  {t("equipmentCosts.updatePayment")}
                                </DropdownMenuItem>
                              ) : null}
                              {canDelete ? (
                                <DropdownMenuItem className="cursor-pointer text-destructive" onClick={() => setDeleteState({ kind: "maintenance", record })}>
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
                  <Label htmlFor="fuel-search">{t("equipmentCosts.searchFuel")}</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="fuel-search"
                      className="pl-9"
                      value={fuelSearch}
                      onChange={(event) => setFuelSearch(event.target.value)}
                      placeholder={t("equipmentCosts.searchFuelPlaceholder")}
                    />
                  </div>
                </div>
                <AdminFiltersDialog
                  open={fuelFiltersOpen}
                  onOpenChange={handleOpenFuelFilters}
                  title={t("common.filters")}
                  description={t("common.activeFilters", { count: fuelActiveFilterCount })}
                  activeCount={fuelActiveFilterCount}
                  triggerLabel={t("common.filters")}
                  clearLabel={t("common.clearFilters")}
                  cancelLabel={t("common.cancel")}
                  applyLabel={t("common.apply")}
                  onClear={handleClearFuelFilters}
                  onApply={handleApplyFuelFilters}
                >
                  <AdminFiltersSection title={t("common.filters")}>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <div className="grid gap-2">
                        <Label htmlFor="fuel-from">{t("equipmentCosts.periodFrom")}</Label>
                        <DatePickerInput
                          id="fuel-from"
                          value={parseDateString(draftFuelFrom)}
                          onChange={(date) => setDraftFuelFrom(formatDateString(date))}
                          placeholder={t("equipmentCosts.periodFrom")}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="fuel-to">{t("equipmentCosts.periodTo")}</Label>
                        <DatePickerInput
                          id="fuel-to"
                          value={parseDateString(draftFuelTo)}
                          onChange={(date) => setDraftFuelTo(formatDateString(date))}
                          placeholder={t("equipmentCosts.periodTo")}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>{t("equipmentCosts.equipment")}</Label>
                        <Select value={draftFuelEquipment} onValueChange={setDraftFuelEquipment}>
                          <SelectTrigger className="min-w-[180px] cursor-pointer"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("equipmentCosts.allFuelLinks")}</SelectItem>
                            <SelectItem value="linked">{t("equipmentCosts.onlyLinkedEquipment")}</SelectItem>
                            <SelectItem value="no-equipment">{t("equipmentCosts.noEquipmentLink")}</SelectItem>
                            {activeEquipment.map((item) => (
                              <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>{t("equipmentCosts.fuelType")}</Label>
                        <Select value={draftFuelType} onValueChange={setDraftFuelType}>
                          <SelectTrigger className="min-w-[180px] cursor-pointer"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("equipmentCosts.allFuelTypes")}</SelectItem>
                            <SelectItem value="diesel">{t("equipmentCosts.fuelTypes.diesel")}</SelectItem>
                            <SelectItem value="gasoline">{t("equipmentCosts.fuelTypes.gasoline")}</SelectItem>
                            <SelectItem value="ethanol">{t("equipmentCosts.fuelTypes.ethanol")}</SelectItem>
                            <SelectItem value="gnv">{t("equipmentCosts.fuelTypes.gnv")}</SelectItem>
                            <SelectItem value="other">{t("equipmentCosts.fuelTypes.other")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>{t("equipmentCosts.financialStatus")}</Label>
                        <Select value={draftFuelFinancialStatus} onValueChange={setDraftFuelFinancialStatus}>
                          <SelectTrigger className="min-w-[180px] cursor-pointer"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("equipmentCosts.allFinancialStatuses")}</SelectItem>
                            <SelectItem value="pending">{t("equipmentCosts.financialStatuses.pending")}</SelectItem>
                            <SelectItem value="paid">{t("equipmentCosts.financialStatuses.paid")}</SelectItem>
                            <SelectItem value="cancelled">{t("equipmentCosts.financialStatuses.cancelled")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </AdminFiltersSection>
                </AdminFiltersDialog>
                {canCreate ? (
                  <FuelFormDialog
                    mode="create"
                    open={createFuelOpen}
                    onOpenChange={setCreateFuelOpen}
                    onSubmit={handleCreateFuel}
                    isSubmitting={isMutating}
                    equipment={activeEquipment}
                  />
                ) : null}
              </AdminListToolbar>

              <AdminListTableCard>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("equipmentCosts.fuelDate")}</TableHead>
                      <TableHead>{t("equipmentCosts.equipment")}</TableHead>
                      <TableHead>{t("equipmentCosts.fuelType")}</TableHead>
                      <TableHead>{t("equipmentCosts.totalAmount")}</TableHead>
                      <TableHead>{t("equipmentCosts.average")}</TableHead>
                      <TableHead>{t("equipmentCosts.financialStatus")}</TableHead>
                      <TableHead>{t("equipmentCosts.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleFuel.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                          {t("equipmentCosts.noFuel")}
                        </TableCell>
                      </TableRow>
                    ) : visibleFuel.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatDate(record.fuelDate, locale)}</TableCell>
                        <TableCell>
                          {record.equipmentName ? (
                            <>
                              <div className="font-medium">{record.equipmentName}</div>
                              <div className="text-xs text-muted-foreground">{record.equipmentBrand} • {record.equipmentModel}</div>
                            </>
                          ) : (
                            <span className="text-muted-foreground">{t("equipmentCosts.noEquipmentLink")}</span>
                          )}
                        </TableCell>
                        <TableCell>{record.fuelType ? t(`equipmentCosts.fuelTypes.${record.fuelType}`) : "—"}</TableCell>
                        <TableCell>{formatMoney(record.totalAmount, locale)}</TableCell>
                        <TableCell>
                          {record.averageValue != null && record.averageLabel ? `${record.averageValue.toFixed(2)} ${record.averageLabel}` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={record.financialStatus === "paid" ? "default" : "secondary"}
                            className={getSemanticStatusBadgeClass(record.financialStatus)}
                          >
                            {t(`equipmentCosts.financialStatuses.${record.financialStatus}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" disabled={isMutating}>
                                <EllipsisVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canUpdate ? (
                                <DropdownMenuItem className="cursor-pointer" onClick={() => setEditFuel(record)}>
                                  <Pencil className="mr-2 size-4" />
                                  {t("common.saveChanges")}
                                </DropdownMenuItem>
                              ) : null}
                              {canUpdate ? (
                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  onClick={() => setPaymentDialog({
                                    kind: "fuel",
                                    recordId: record.id,
                                    financialStatus: record.financialStatus,
                                    paymentDueDate: record.paymentDueDate,
                                    paidAt: record.paidAt,
                                    title: t("equipmentCosts.updateFuelPaymentTitle"),
                                    description: t("equipmentCosts.updateFuelPaymentDescription"),
                                  })}
                                >
                                  <CircleDollarSign className="mr-2 size-4" />
                                  {t("equipmentCosts.updatePayment")}
                                </DropdownMenuItem>
                              ) : null}
                              {canDelete ? (
                                <DropdownMenuItem className="cursor-pointer text-destructive" onClick={() => setDeleteState({ kind: "fuel", record })}>
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

      {editMaintenance ? (
        <MaintenanceFormDialog
          mode="edit"
          open={Boolean(editMaintenance)}
          onOpenChange={(open) => {
            if (!open) {
              setEditMaintenance(null);
            }
          }}
          onSubmit={(values) => handleUpdateMaintenance(editMaintenance.id, values)}
          isSubmitting={isMutating}
          record={editMaintenance}
          equipment={activeEquipment}
        />
      ) : null}

      {editFuel ? (
        <FuelFormDialog
          mode="edit"
          open={Boolean(editFuel)}
          onOpenChange={(open) => {
            if (!open) {
              setEditFuel(null);
            }
          }}
          onSubmit={(values) => handleUpdateFuel(editFuel.id, values)}
          isSubmitting={isMutating}
          record={editFuel}
          equipment={activeEquipment}
        />
      ) : null}

      <ConfirmDeleteDialog
        open={Boolean(deleteState)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteState(null);
          }
        }}
        description={
          deleteState?.kind === "maintenance"
            ? t("equipmentCosts.confirmDeleteMaintenance", { name: deleteState.record.equipmentName })
            : deleteState?.kind === "fuel"
              ? t("equipmentCosts.confirmDeleteFuel")
              : ""
        }
        onConfirm={async () => {
          if (!deleteState) {
            return;
          }

          if (deleteState.kind === "maintenance") {
            await runMutation(async () => {
              await parseResponse(await fetch(`/api/maintenance-records/${deleteState.record.id}`, { method: "DELETE" }));
            }, t("common.maintenanceDeleteSuccess"), t("equipmentCosts.updateError"));
          } else {
            await runMutation(async () => {
              await parseResponse(await fetch(`/api/fuel-records/${deleteState.record.id}`, { method: "DELETE" }));
            }, t("common.fuelDeleteSuccess"), t("equipmentCosts.updateError"));
          }
        }}
        isLoading={isMutating}
      />

      <ActionDialog
        open={Boolean(maintenanceStatusAction)}
        onOpenChange={(open) => {
          if (!open) {
            setMaintenanceStatusAction(null);
          }
        }}
        title={
          maintenanceStatusAction?.status === "completed"
            ? t("equipmentCosts.completeMaintenanceTitle")
            : t("equipmentCosts.cancelMaintenanceTitle")
        }
        description={
          maintenanceStatusAction?.status === "completed"
            ? t("equipmentCosts.completeMaintenanceDescription")
            : t("equipmentCosts.cancelMaintenanceDescription")
        }
        confirmLabel={
          maintenanceStatusAction?.status === "completed"
            ? t("equipmentCosts.completeMaintenance")
            : t("equipmentCosts.cancelMaintenance")
        }
        confirmVariant={maintenanceStatusAction?.status === "cancelled" ? "destructive" : "default"}
        onConfirm={async () => {
          if (!maintenanceStatusAction) {
            return;
          }

          await runMutation(async () => {
            await parseResponse(
              await fetch(`/api/maintenance-records/${maintenanceStatusAction.record.id}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  status: maintenanceStatusAction.status,
                  performedDate: maintenanceStatusAction.status === "completed" ? statusPerformedDate : undefined,
                  amountTotal: maintenanceStatusAction.status === "completed" && statusAmountTotal
                    ? Number(statusAmountTotal)
                    : undefined,
                }),
              }),
            );
          }, t("common.maintenanceStatusSuccess"), t("equipmentCosts.updateError"));
        }}
        isLoading={isMutating}
      >
        {maintenanceStatusAction?.status === "completed" ? (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="status-performed-date">{t("equipmentCosts.performedDate")}</Label>
              <DatePickerInput
                id="status-performed-date"
                value={parseDateString(statusPerformedDate)}
                onChange={(date) => setStatusPerformedDate(formatDateString(date))}
                placeholder={t("equipmentCosts.performedDate")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status-amount-total">{t("equipmentCosts.amountTotal")}</Label>
              <Input
                id="status-amount-total"
                type="number"
                step="0.01"
                min="0"
                value={statusAmountTotal}
                onChange={(event) => setStatusAmountTotal(event.target.value)}
              />
            </div>
          </div>
        ) : null}
      </ActionDialog>

      <ActionDialog
        open={Boolean(paymentDialog)}
        onOpenChange={(open) => {
          if (!open) {
            setPaymentDialog(null);
          }
        }}
        title={paymentDialog?.title ?? ""}
        description={paymentDialog?.description ?? ""}
        confirmLabel={t("equipmentCosts.updatePayment")}
        onConfirm={async () => {
          if (!paymentDialog) {
            return;
          }

          if (paymentDialog.kind === "maintenance") {
            await runMutation(async () => {
              await parseResponse(
                await fetch(`/api/maintenance-records/${paymentDialog.recordId}/payment`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    financialStatus: paymentStatus,
                    paymentDueDate: paymentDueDate || undefined,
                    paidAt: paymentStatus === "paid" ? paidAt || undefined : undefined,
                  }),
                }),
              );
            }, t("common.maintenancePaymentSuccess"), t("equipmentCosts.updateError"));
          } else {
            await runMutation(async () => {
              await parseResponse(
                await fetch(`/api/fuel-records/${paymentDialog.recordId}/payment`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    financialStatus: paymentStatus,
                    paymentDueDate: paymentDueDate || undefined,
                    paidAt: paymentStatus === "paid" ? paidAt || undefined : undefined,
                  }),
                }),
              );
            }, t("common.fuelPaymentSuccess"), t("equipmentCosts.updateError"));
          }
        }}
        isLoading={isMutating}
      >
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>{t("equipmentCosts.financialStatus")}</Label>
            <Select value={paymentStatus} onValueChange={(value: "pending" | "paid" | "cancelled") => setPaymentStatus(value)}>
              <SelectTrigger className="w-full cursor-pointer"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">{t("equipmentCosts.financialStatuses.pending")}</SelectItem>
                <SelectItem value="paid">{t("equipmentCosts.financialStatuses.paid")}</SelectItem>
                <SelectItem value="cancelled">{t("equipmentCosts.financialStatuses.cancelled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="payment-due-date">{t("equipmentCosts.paymentDueDate")}</Label>
            <DatePickerInput
              id="payment-due-date"
              value={parseDateString(paymentDueDate)}
              onChange={(date) => setPaymentDueDate(formatDateString(date))}
              placeholder={t("equipmentCosts.paymentDueDate")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="payment-paid-at">{t("equipmentCosts.paidAt")}</Label>
            <DatePickerInput
              id="payment-paid-at"
              value={parseDateString(paidAt)}
              onChange={(date) => setPaidAt(formatDateString(date))}
              placeholder={t("equipmentCosts.paidAt")}
            />
          </div>
        </div>
      </ActionDialog>
    </>
  );
}
