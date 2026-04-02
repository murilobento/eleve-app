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
import {
  createEquipmentSchema,
  type CreateEquipmentInput,
  type ManagedEquipment,
  type UpdateEquipmentInput,
  updateEquipmentSchema,
} from "@/lib/equipment-admin";
import type { ManagedEquipmentType } from "@/lib/equipment-types-admin";
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
    defaultValues: {
      typeId: "",
      licenseRequired: "B",
      name: "",
      model: "",
      brand: "",
      year: new Date().getFullYear(),
      plate: "",
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset({
      typeId: equipment?.typeId ?? equipmentTypes[0]?.id ?? "",
      licenseRequired: equipment?.licenseRequired ?? "B",
      name: equipment?.name ?? "",
      model: equipment?.model ?? "",
      brand: equipment?.brand ?? "",
      year: equipment?.year ?? new Date().getFullYear(),
      plate: equipment?.plate ?? "",
    });
  }, [equipment, equipmentTypes, form, open]);

  async function handleSubmit(values: CreateEquipmentInput | UpdateEquipmentInput) {
    await onSubmit({
      ...values,
      year: Number(values.year),
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("equipment.editEquipment") : t("equipment.createEquipment")}</DialogTitle>
          <DialogDescription>
            {creationDisabled ? t("equipment.createBlockedNoTypes") : t("equipment.createDescription")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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

            <div className="grid gap-4 sm:grid-cols-3">
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

            <DialogFooter>
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
