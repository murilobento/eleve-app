"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { EquipmentOption } from "@/lib/equipment-admin";
import {
  createMaintenanceSchema,
  type CreateMaintenanceInput,
  type ManagedMaintenanceRecord,
  type UpdateMaintenanceInput,
  updateMaintenanceSchema,
} from "@/lib/maintenance-admin";
import { useI18n } from "@/i18n/provider";

type MaintenanceFormDialogProps = {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateMaintenanceInput | UpdateMaintenanceInput) => Promise<void>;
  isSubmitting: boolean;
  record?: ManagedMaintenanceRecord | null;
  equipment: EquipmentOption[];
};

export function MaintenanceFormDialog({
  mode,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  record,
  equipment,
}: MaintenanceFormDialogProps) {
  const { t } = useI18n();
  const isEdit = mode === "edit";

  const form = useForm<CreateMaintenanceInput | UpdateMaintenanceInput>({
    resolver: zodResolver(isEdit ? updateMaintenanceSchema : createMaintenanceSchema),
    defaultValues: {
      equipmentId: "",
      maintenanceType: "preventive",
      status: "planned",
      financialStatus: "pending",
      plannedDate: "",
      performedDate: "",
      description: "",
      supplierName: "",
      documentNumber: "",
      notes: "",
      amountTotal: undefined,
      paymentDueDate: "",
      paidAt: "",
      meterKind: undefined,
      meterValue: undefined,
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset({
      equipmentId: record?.equipmentId ?? equipment[0]?.id ?? "",
      maintenanceType: record?.maintenanceType ?? "preventive",
      status: record?.status ?? "planned",
      financialStatus: record?.financialStatus ?? "pending",
      plannedDate: record?.plannedDate ?? "",
      performedDate: record?.performedDate ?? "",
      description: record?.description ?? "",
      supplierName: record?.supplierName ?? "",
      documentNumber: record?.documentNumber ?? "",
      notes: record?.notes ?? "",
      amountTotal: record?.amountTotal ?? undefined,
      paymentDueDate: record?.paymentDueDate ?? "",
      paidAt: record?.paidAt ?? "",
      meterKind: record?.meterKind ?? undefined,
      meterValue: record?.meterValue ?? undefined,
    });
  }, [equipment, form, open, record]);

  async function handleSubmit(values: CreateMaintenanceInput | UpdateMaintenanceInput) {
    await onSubmit(values);
    form.reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!isEdit ? (
        <DialogTrigger asChild>
          <Button className="cursor-pointer">
            <Plus className="mr-2 size-4" />
            {t("equipmentCosts.addMaintenance")}
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{isEdit ? t("equipmentCosts.editMaintenance") : t("equipmentCosts.createMaintenance")}</DialogTitle>
              <DialogDescription>{t("equipmentCosts.maintenanceFormDescription")}</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="equipmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("equipmentCosts.equipment")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full cursor-pointer">
                          <SelectValue placeholder={t("equipmentCosts.selectEquipment")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {equipment.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} • {item.brand} • {item.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maintenanceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("equipmentCosts.maintenanceType")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full cursor-pointer">
                          <SelectValue placeholder={t("equipmentCosts.selectMaintenanceType")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="preventive">{t("equipmentCosts.maintenanceTypes.preventive")}</SelectItem>
                        <SelectItem value="corrective">{t("equipmentCosts.maintenanceTypes.corrective")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("equipmentCosts.status")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full cursor-pointer">
                          <SelectValue placeholder={t("equipmentCosts.selectStatus")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="planned">{t("equipmentCosts.maintenanceStatuses.planned")}</SelectItem>
                        <SelectItem value="completed">{t("equipmentCosts.maintenanceStatuses.completed")}</SelectItem>
                        <SelectItem value="cancelled">{t("equipmentCosts.maintenanceStatuses.cancelled")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="financialStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("equipmentCosts.financialStatus")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full cursor-pointer">
                          <SelectValue placeholder={t("equipmentCosts.selectFinancialStatus")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">{t("equipmentCosts.financialStatuses.pending")}</SelectItem>
                        <SelectItem value="paid">{t("equipmentCosts.financialStatuses.paid")}</SelectItem>
                        <SelectItem value="cancelled">{t("equipmentCosts.financialStatuses.cancelled")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("equipmentCosts.descriptionLabel")}</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder={t("equipmentCosts.descriptionPlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField
                control={form.control}
                name="plannedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("equipmentCosts.plannedDate")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="performedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("equipmentCosts.performedDate")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentDueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("equipmentCosts.paymentDueDate")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paidAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("equipmentCosts.paidAt")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField
                control={form.control}
                name="amountTotal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("equipmentCosts.amountTotal")}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="meterKind"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("equipmentCosts.meterKind")}</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                      value={field.value ?? "none"}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full cursor-pointer">
                          <SelectValue placeholder={t("equipmentCosts.selectMeterKind")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">{t("equipmentCosts.noneOption")}</SelectItem>
                        <SelectItem value="km">{t("equipmentCosts.meterKinds.km")}</SelectItem>
                        <SelectItem value="hours">{t("equipmentCosts.meterKinds.hours")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="meterValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("equipmentCosts.meterValue")}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="documentNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("equipmentCosts.documentNumber")}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="supplierName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("equipmentCosts.supplierName")}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("equipmentCosts.notes")}</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" className="cursor-pointer" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
                {isSubmitting ? t("common.loading") : isEdit ? t("common.saveChanges") : t("equipmentCosts.createMaintenance")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
