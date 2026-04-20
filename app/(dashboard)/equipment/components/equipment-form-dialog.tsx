"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createEquipmentSchema,
  type CreateEquipmentInput,
  type ManagedEquipment,
  type UpdateEquipmentInput,
  updateEquipmentSchema,
} from "@/lib/equipment-admin";
import type { ManagedEquipmentType } from "@/lib/equipment-types-admin";
import { useFormValidationToast } from "@/hooks/use-form-validation-toast";
import { useI18n } from "@/i18n/provider";

type EquipmentFormDialogProps = {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateEquipmentInput | UpdateEquipmentInput) => Promise<void> | void;
  isSubmitting: boolean;
  equipment?: ManagedEquipment | null;
  equipmentTypes: ManagedEquipmentType[];
  canCreate: boolean;
};

const licenseOptions = ["A", "B", "C", "D", "E"] as const;

export function EquipmentFormDialog({
  mode,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  equipment,
  equipmentTypes,
  canCreate,
}: EquipmentFormDialogProps) {
  const { t } = useI18n();
  const isEdit = mode === "edit";
  const schema = isEdit ? updateEquipmentSchema : createEquipmentSchema;

  const form = useForm<CreateEquipmentInput | UpdateEquipmentInput>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      typeId: "",
      status: "active",
      licenseRequired: "B",
      name: "",
      model: "",
      brand: "",
      year: new Date().getFullYear(),
      plate: "",
      liftingCapacityTons: undefined,
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
      typeId: equipment?.typeId ?? equipmentTypes[0]?.id ?? "",
      status: equipment?.status ?? "active",
      licenseRequired: equipment?.licenseRequired ?? "B",
      name: equipment?.name ?? "",
      model: equipment?.model ?? "",
      brand: equipment?.brand ?? "",
      year: equipment?.year ?? new Date().getFullYear(),
      plate: equipment?.plate ?? "",
      liftingCapacityTons: equipment?.liftingCapacityTons ?? undefined,
    });
  }, [equipment, equipmentTypes, form, open]);

  async function handleSubmit(values: CreateEquipmentInput | UpdateEquipmentInput) {
    const liftingCapacityTons =
      values.liftingCapacityTons === undefined
        ? undefined
        : Number(values.liftingCapacityTons);

    await onSubmit({
      ...values,
      year: Number(values.year),
      liftingCapacityTons,
    });
    form.reset();
    onOpenChange(false);
  }

  const creationDisabled = !canCreate && !isEdit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!isEdit ? (
        <DialogTrigger asChild>
          <Button className="cursor-pointer" disabled={creationDisabled}>
            <Plus className="mr-2 h-4 w-4" />
            {t("equipment.addEquipment")}
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
                <DialogTitle>{isEdit ? t("equipment.editEquipment") : t("equipment.createEquipment")}</DialogTitle>
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="flex shrink-0 flex-row items-center gap-3 space-y-0 rounded-md border px-3 py-2">
                      <FormLabel className="cursor-pointer text-sm font-medium">
                        {field.value === "active" ? t("equipment.active") : t("equipment.inactive")}
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
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="typeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("equipment.type")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={creationDisabled}>
                      <FormControl>
                        <SelectTrigger className="w-full cursor-pointer">
                          <SelectValue placeholder={t("equipment.selectType")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {equipmentTypes.map((equipmentType) => (
                          <SelectItem key={equipmentType.id} value={equipmentType.id}>
                            {equipmentType.name}
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
                name="licenseRequired"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("equipment.licenseRequired")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={creationDisabled}>
                      <FormControl>
                        <SelectTrigger className="w-full cursor-pointer">
                          <SelectValue placeholder={t("equipment.selectLicense")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {licenseOptions.map((license) => (
                          <SelectItem key={license} value={license}>
                            {license}
                          </SelectItem>
                        ))}
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("equipment.name")}</FormLabel>
                    <FormControl>
                      <Input placeholder="Patio Norte 01" {...field} disabled={creationDisabled} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("equipment.brand")}</FormLabel>
                    <FormControl>
                      <Input placeholder="Volvo" {...field} disabled={creationDisabled} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("equipment.model")}</FormLabel>
                    <FormControl>
                      <Input placeholder="VM 270" {...field} disabled={creationDisabled} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("equipment.year")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="2024"
                        {...field}
                        value={field.value ?? ""}
                        disabled={creationDisabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="liftingCapacityTons"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("equipment.liftingCapacityTons")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        placeholder="8.5"
                        {...field}
                        value={field.value ?? ""}
                        disabled={creationDisabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="plate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("equipment.plate")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("equipment.optionalPlate")}
                        {...field}
                        value={field.value ?? ""}
                        disabled={creationDisabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            </div>

            <DialogFooter className="shrink-0 border-t px-6 py-4">
              <Button type="submit" className="cursor-pointer" disabled={isSubmitting || creationDisabled}>
                {isSubmitting ? t("common.loading") : isEdit ? t("common.saveChanges") : t("equipment.createEquipment")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
