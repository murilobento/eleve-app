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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  createOperatorSchema,
  type CreateOperatorInput,
  type ManagedOperator,
  type UpdateOperatorInput,
  updateOperatorSchema,
} from "@/lib/operators-admin";
import { useFormValidationToast } from "@/hooks/use-form-validation-toast";
import { useI18n } from "@/i18n/provider";
import { formatPhone } from "@/lib/utils";

type OperatorFormDialogProps = {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateOperatorInput | UpdateOperatorInput) => Promise<void> | void;
  isSubmitting: boolean;
  operator?: ManagedOperator | null;
};

export function OperatorFormDialog({
  mode,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  operator,
}: OperatorFormDialogProps) {
  const { t } = useI18n();
  const isEdit = mode === "edit";
  const schema = isEdit ? updateOperatorSchema : createOperatorSchema;

  const form = useForm<CreateOperatorInput | UpdateOperatorInput>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      name: "",
      phone: "",
      license: "B",
      status: "active",
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
      name: operator?.name ?? "",
      phone: operator?.phone ? formatPhone(operator.phone) : "",
      license: operator?.license ?? "B",
      status: operator?.status ?? "active",
    });
  }, [form, open, operator]);

  async function handleSubmit(values: CreateOperatorInput | UpdateOperatorInput) {
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
            {t("operators.addOperator")}
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
              <DialogHeader className="gap-3">
              <div className="flex flex-wrap items-center gap-3 pr-8">
                <DialogTitle>{isEdit ? t("operators.editOperator") : t("operators.createOperator")}</DialogTitle>
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="flex shrink-0 flex-row items-center gap-3 space-y-0 rounded-md border px-3 py-2">
                      <FormLabel className="cursor-pointer text-sm font-medium">
                        {field.value === "active" ? t("operators.active") : t("operators.inactive")}
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
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("operators.name")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("operators.fullName")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-3 md:grid-cols-2">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("operators.phone")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(11) 99999-9999"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(event) => field.onChange(formatPhone(event.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="license"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("operators.license")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full cursor-pointer">
                          <SelectValue placeholder={t("operators.selectLicense")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                        <SelectItem value="D">D</SelectItem>
                        <SelectItem value="E">E</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            </div>

            <DialogFooter className="shrink-0 border-t px-6 py-4">
              <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
                {isSubmitting ? t("common.loading") : isEdit ? t("common.saveChanges") : t("operators.createOperator")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
