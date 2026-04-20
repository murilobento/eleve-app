"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { EquipmentOption } from "@/lib/equipment-admin";
import {
  createServiceTypeSchema,
  type CreateServiceTypeInput,
  type ManagedServiceType,
  type UpdateServiceTypeInput,
  updateServiceTypeSchema,
} from "@/lib/service-types-admin";
import { useFormValidationToast } from "@/hooks/use-form-validation-toast";
import { useI18n } from "@/i18n/provider";

type ServiceTypeFormDialogProps = {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateServiceTypeInput | UpdateServiceTypeInput) => Promise<void> | void;
  isSubmitting: boolean;
  serviceType?: ManagedServiceType | null;
  equipment: EquipmentOption[];
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

export function ServiceTypeFormDialog({
  mode,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  serviceType,
  equipment,
}: ServiceTypeFormDialogProps) {
  const { t } = useI18n();
  const isEdit = mode === "edit";
  const schema = isEdit ? updateServiceTypeSchema : createServiceTypeSchema;
  const allEquipmentIds = equipment.map((equipmentItem) => equipmentItem.id);

  const form = useForm<CreateServiceTypeInput | UpdateServiceTypeInput>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      name: "",
      status: "active",
      billingUnit: "hour",
      baseValue: undefined,
      minimumHours: undefined,
      minimumKm: undefined,
      equipmentIds: [],
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
      name: serviceType?.name ?? "",
      status: serviceType?.status ?? "active",
      billingUnit: serviceType?.billingUnit ?? "hour",
      baseValue: serviceType?.baseValue ?? undefined,
      minimumHours: serviceType?.minimumHours ?? undefined,
      minimumKm: serviceType?.minimumKm ?? undefined,
      equipmentIds: serviceType?.equipmentIds ?? [],
    });
  }, [form, open, serviceType]);

  async function handleSubmit(values: CreateServiceTypeInput | UpdateServiceTypeInput) {
    await onSubmit(values);
    form.reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!isEdit ? (
        <DialogTrigger asChild>
          <Button className="cursor-pointer">
            <Plus className="mr-2 h-4 w-4" />
            {t("serviceTypes.addType")}
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-hidden p-0 sm:max-w-2xl">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)}
            className={`flex max-h-[calc(100svh-2rem)] flex-col overflow-hidden [&_[aria-invalid=true]]:border-input [&_[aria-invalid=true]]:ring-0 ${formClassName}`}
          >
            <div className="shrink-0 border-b px-6 py-5">
              <DialogHeader>
              <div className="flex flex-wrap items-center gap-3 pr-8">
                <DialogTitle>{isEdit ? t("serviceTypes.editType") : t("serviceTypes.createType")}</DialogTitle>
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="flex shrink-0 flex-row items-center gap-3 space-y-0 rounded-md border px-3 py-2">
                      <FormLabel className="cursor-pointer text-sm font-medium">
                        {field.value === "active" ? t("serviceTypes.active") : t("serviceTypes.inactive")}
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
              </DialogHeader>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-6 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("serviceTypes.name")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("serviceTypes.namePlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="billingUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("serviceTypes.billingUnit")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue placeholder={t("serviceTypes.selectBillingUnit")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {billingUnits.map((billingUnit) => (
                          <SelectItem key={billingUnit} value={billingUnit}>
                            {t(`serviceTypes.billingUnits.${billingUnit}`)}
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
                name="baseValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("serviceTypes.baseValue")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="0,00"
                        {...field}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="minimumHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("serviceTypes.minimumHours")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        inputMode="decimal"
                        placeholder={t("serviceTypes.optionalMinimum")}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minimumKm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("serviceTypes.minimumKm")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        inputMode="decimal"
                        placeholder={t("serviceTypes.optionalMinimum")}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="equipmentIds"
              render={({ field }) => (
                <FormItem>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <FormLabel>{t("serviceTypes.linkedEquipmentOptional")}</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="cursor-pointer self-start"
                      disabled={equipment.length === 0 || isSubmitting}
                      onClick={() => {
                        const currentIds = new Set(field.value ?? []);
                        const areAllSelected =
                          equipment.length > 0 && allEquipmentIds.every((equipmentId) => currentIds.has(equipmentId));

                        field.onChange(areAllSelected ? [] : allEquipmentIds);
                      }}
                    >
                      {equipment.length > 0 && allEquipmentIds.every((equipmentId) => (field.value ?? []).includes(equipmentId))
                        ? t("serviceTypes.clearEquipmentSelection")
                        : t("serviceTypes.selectAllEquipment")}
                    </Button>
                  </div>
                  <FormControl>
                    <ScrollArea className="h-56 rounded-md border p-4">
                      <div className="space-y-3">
                        {equipment.length > 0 ? (
                          equipment.map((equipmentItem) => {
                            const checked = field.value?.includes(equipmentItem.id) ?? false;

                            return (
                              <label
                                key={equipmentItem.id}
                                className="flex cursor-pointer items-center gap-3 rounded-md border p-3"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(value) => {
                                    const nextValue = new Set(field.value ?? []);

                                    if (value) {
                                      nextValue.add(equipmentItem.id);
                                    } else {
                                      nextValue.delete(equipmentItem.id);
                                    }

                                    field.onChange([...nextValue]);
                                  }}
                                />
                                <div className="min-w-0 text-sm">
                                  <span className="font-medium">{equipmentItem.name}</span>
                                  <span className="text-muted-foreground"> • {equipmentItem.brand} • {equipmentItem.model}</span>
                                </div>
                              </label>
                            );
                          })
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            {t("serviceTypes.noEquipmentAvailable")}
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            </div>

            <DialogFooter className="shrink-0 border-t px-6 py-4">
              <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
                {isSubmitting ? t("common.loading") : isEdit ? t("common.saveChanges") : t("serviceTypes.createType")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
