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
import { Textarea } from "@/components/ui/textarea";
import {
  createEquipmentTypeSchema,
  type CreateEquipmentTypeInput,
  type ManagedEquipmentType,
  type UpdateEquipmentTypeInput,
  updateEquipmentTypeSchema,
} from "@/lib/equipment-types-admin";
import { useFormValidationToast } from "@/hooks/use-form-validation-toast";
import { useI18n } from "@/i18n/provider";

type EquipmentTypeFormDialogProps = {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateEquipmentTypeInput | UpdateEquipmentTypeInput) => Promise<void> | void;
  isSubmitting: boolean;
  equipmentType?: ManagedEquipmentType | null;
};

export function EquipmentTypeFormDialog({
  mode,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  equipmentType,
}: EquipmentTypeFormDialogProps) {
  const { t } = useI18n();
  const isEdit = mode === "edit";
  const schema = isEdit ? updateEquipmentTypeSchema : createEquipmentTypeSchema;

  const form = useForm<CreateEquipmentTypeInput | UpdateEquipmentTypeInput>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      name: "",
      description: "",
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
      name: equipmentType?.name ?? "",
      description: equipmentType?.description ?? "",
    });
  }, [equipmentType, form, open]);

  async function handleSubmit(values: CreateEquipmentTypeInput | UpdateEquipmentTypeInput) {
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
            {t("equipmentTypes.addType")}
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-hidden p-0 sm:max-w-xl">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)}
            className={`flex max-h-[calc(100svh-2rem)] flex-col overflow-hidden [&_[aria-invalid=true]]:border-input [&_[aria-invalid=true]]:ring-0 ${formClassName}`}
          >
            <div className="shrink-0 border-b px-6 py-5">
              <DialogHeader>
                <DialogTitle>{isEdit ? t("equipmentTypes.editType") : t("equipmentTypes.createType")}</DialogTitle>
              </DialogHeader>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-6 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("equipmentTypes.name")}</FormLabel>
                  <FormControl>
                    <Input placeholder="Guindaste" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("equipmentTypes.descriptionLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("equipmentTypes.descriptionPlaceholder")}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            </div>

            <DialogFooter className="shrink-0 border-t px-6 py-4">
              <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
                {isSubmitting ? t("common.loading") : isEdit ? t("common.saveChanges") : t("equipmentTypes.createType")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
