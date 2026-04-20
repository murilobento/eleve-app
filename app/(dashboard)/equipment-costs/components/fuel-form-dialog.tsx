"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";

import { DatePickerInput, formatDateString, parseDateString } from "@/components/date-picker-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
  createFuelSchema,
  type CreateFuelInput,
  type ManagedFuelRecord,
  type UpdateFuelInput,
  updateFuelSchema,
} from "@/lib/fuel-admin";
import { useFormValidationToast } from "@/hooks/use-form-validation-toast";
import { useI18n } from "@/i18n/provider";

type FuelFormDialogProps = {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateFuelInput | UpdateFuelInput) => Promise<void>;
  isSubmitting: boolean;
  record?: ManagedFuelRecord | null;
  equipment: EquipmentOption[];
};

export function FuelFormDialog({
  mode,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  record,
  equipment,
}: FuelFormDialogProps) {
  const { t } = useI18n();
  const isEdit = mode === "edit";

  const form = useForm<CreateFuelInput | UpdateFuelInput>({
    resolver: zodResolver(isEdit ? updateFuelSchema : createFuelSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      equipmentId: undefined,
      fuelDate: "",
      financialStatus: "pending",
      fuelType: undefined,
      totalAmount: undefined,
      liters: undefined,
      meterKind: undefined,
      meterReading: undefined,
      supplierName: "",
      documentNumber: "",
      notes: "",
      paymentDueDate: "",
      paidAt: "",
    },
  });
  const { formClassName, handleInvalidSubmit } = useFormValidationToast({
    form,
    title: t("common.validationToastTitle"),
    fallback: t("common.validationToastFallback"),
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset({
      equipmentId: record?.equipmentId ?? undefined,
      fuelDate: record?.fuelDate ?? "",
      financialStatus: record?.financialStatus ?? "pending",
      fuelType: record?.fuelType ?? undefined,
      totalAmount: record?.totalAmount ?? undefined,
      liters: record?.liters ?? undefined,
      meterKind: record?.meterKind ?? undefined,
      meterReading: record?.meterReading ?? undefined,
      supplierName: record?.supplierName ?? "",
      documentNumber: record?.documentNumber ?? "",
      notes: record?.notes ?? "",
      paymentDueDate: record?.paymentDueDate ?? "",
      paidAt: record?.paidAt ?? "",
    });
  }, [form, open, record]);

  async function handleSubmit(values: CreateFuelInput | UpdateFuelInput) {
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
            {t("equipmentCosts.addFuel")}
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-hidden p-0 sm:max-w-3xl">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)}
            className={`flex max-h-[calc(100svh-2rem)] flex-col overflow-hidden [&_[aria-invalid=true]]:border-input [&_[aria-invalid=true]]:ring-0 ${formClassName}`}
          >
            <div className="shrink-0 border-b px-6 py-5">
              <DialogHeader>
                <DialogTitle>{isEdit ? t("equipmentCosts.editFuel") : t("equipmentCosts.createFuel")}</DialogTitle>
              </DialogHeader>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-6 py-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField
                control={form.control}
                name="fuelDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("equipmentCosts.fuelDate")}</FormLabel>
                    <FormControl>
                      <DatePickerInput
                        value={parseDateString(field.value)}
                        onChange={(date) => field.onChange(formatDateString(date))}
                        placeholder={t("equipmentCosts.fuelDate")}
                      />
                    </FormControl>
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
              <FormField
                control={form.control}
                name="paymentDueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("equipmentCosts.paymentDueDate")}</FormLabel>
                    <FormControl>
                      <DatePickerInput
                        value={parseDateString(field.value)}
                        onChange={(date) => field.onChange(formatDateString(date))}
                        placeholder={t("equipmentCosts.paymentDueDate")}
                      />
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
                      <DatePickerInput
                        value={parseDateString(field.value)}
                        onChange={(date) => field.onChange(formatDateString(date))}
                        placeholder={t("equipmentCosts.paidAt")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="equipmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("equipmentCosts.equipmentOptional")}</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                      value={field.value ?? "none"}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full cursor-pointer">
                          <SelectValue placeholder={t("equipmentCosts.selectEquipmentOptional")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">{t("equipmentCosts.noEquipmentLink")}</SelectItem>
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
                name="fuelType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("equipmentCosts.fuelType")}</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                      value={field.value ?? "none"}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full cursor-pointer">
                          <SelectValue placeholder={t("equipmentCosts.selectFuelType")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">{t("equipmentCosts.noneOption")}</SelectItem>
                        <SelectItem value="diesel">{t("equipmentCosts.fuelTypes.diesel")}</SelectItem>
                        <SelectItem value="gasoline">{t("equipmentCosts.fuelTypes.gasoline")}</SelectItem>
                        <SelectItem value="ethanol">{t("equipmentCosts.fuelTypes.ethanol")}</SelectItem>
                        <SelectItem value="gnv">{t("equipmentCosts.fuelTypes.gnv")}</SelectItem>
                        <SelectItem value="other">{t("equipmentCosts.fuelTypes.other")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("equipmentCosts.totalAmount")}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="liters"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("equipmentCosts.liters")}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" min="0" {...field} value={field.value ?? ""} />
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
                name="meterReading"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("equipmentCosts.meterReading")}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} value={field.value ?? ""} />
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

            <DialogFooter className="shrink-0 border-t px-6 py-4">
              <Button type="button" variant="outline" className="cursor-pointer" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
                {isSubmitting ? t("common.loading") : isEdit ? t("common.saveChanges") : t("equipmentCosts.createFuel")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
