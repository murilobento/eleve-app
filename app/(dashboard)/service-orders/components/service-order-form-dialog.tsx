"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFieldArray, useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { SearchableCombobox } from "@/components/searchable-combobox";
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
import type { ManagedBudget } from "@/lib/budgets-admin";
import type { ManagedClient } from "@/lib/clients-admin";
import type { EquipmentOption } from "@/lib/equipment-admin";
import type { ManagedOperator } from "@/lib/operators-admin";
import {
  createServiceOrderSchema,
  type CreateServiceOrderInput,
  type ManagedServiceOrder,
  type ServiceOrderItemInput,
  type UpdateServiceOrderInput,
  updateServiceOrderSchema,
} from "@/lib/service-orders-admin";
import type { ManagedServiceType } from "@/lib/service-types-admin";
import { useI18n } from "@/i18n/provider";

type ServiceOrderFormDialogProps = {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateServiceOrderInput | UpdateServiceOrderInput) => Promise<void> | void;
  isSubmitting: boolean;
  serviceOrder?: ManagedServiceOrder | null;
  clients: ManagedClient[];
  equipment: EquipmentOption[];
  serviceTypes: ManagedServiceType[];
  operators: ManagedOperator[];
  approvedBudgets: ManagedBudget[];
};

function createEmptyItem(): ServiceOrderItemInput {
  return {
    sourceBudgetItemId: undefined,
    serviceTypeId: "",
    equipmentId: "",
    operatorId: "",
    serviceDescription: "",
    serviceDate: "",
    plannedStartTime: "",
    plannedEndTime: "",
    actualStartTime: undefined,
    actualEndTime: undefined,
    quotedValue: undefined,
    notes: "",
  };
}

function collectErrorMessages(errors: unknown): string[] {
  const messages: string[] = [];

  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") {
      return;
    }

    if ("message" in value && typeof value.message === "string" && value.message.trim()) {
      messages.push(value.message.trim());
    }

    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    Object.values(value).forEach(visit);
  };

  visit(errors);

  return Array.from(new Set(messages));
}

export function ServiceOrderFormDialog({
  mode,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  serviceOrder,
  clients,
  equipment,
  serviceTypes,
  operators,
  approvedBudgets,
}: ServiceOrderFormDialogProps) {
  const { t } = useI18n();
  const isEdit = mode === "edit";
  const schema = isEdit ? updateServiceOrderSchema : createServiceOrderSchema;
  const lastHydratedBudgetIdRef = useRef<string | null>(null);

  const form = useForm<CreateServiceOrderInput | UpdateServiceOrderInput>({
    resolver: zodResolver(schema),
    shouldFocusError: false,
    defaultValues: {
      originType: "manual",
      sourceBudgetId: undefined,
      clientId: "",
      servicePostalCode: "",
      serviceStreet: "",
      serviceNumber: "",
      serviceComplement: "",
      serviceDistrict: "",
      serviceCity: "",
      serviceState: "",
      serviceCountry: "Brasil",
      notes: "",
      items: [createEmptyItem()],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedOriginType = form.watch("originType");
  const watchedSourceBudgetId = form.watch("sourceBudgetId");

  const clientOptions = useMemo(
    () =>
      clients.map((client) => ({
        value: client.id,
        label: client.tradeName || client.legalName,
        description: client.tradeName && client.tradeName !== client.legalName ? client.legalName : client.document,
        keywords: [client.legalName, client.tradeName ?? "", client.document],
      })),
    [clients],
  );

  const approvedBudgetOptions = useMemo(
    () =>
      approvedBudgets.map((budget) => ({
        value: budget.id,
        label: `${budget.number} • ${budget.clientName}`,
        description: `${budget.itemCount} ${t("serviceOrders.itemsCountSummary", { count: budget.itemCount })}`,
        keywords: [budget.number, budget.clientName, budget.serviceCity],
      })),
    [approvedBudgets, t],
  );

  const approvedBudgetsById = useMemo(
    () => new Map(approvedBudgets.map((budget) => [budget.id, budget])),
    [approvedBudgets],
  );

  const applyBudgetToForm = (budget: ManagedBudget) => {
    form.setValue("clientId", budget.clientId, { shouldDirty: true });
    form.setValue("servicePostalCode", budget.servicePostalCode, { shouldDirty: true });
    form.setValue("serviceStreet", budget.serviceStreet, { shouldDirty: true });
    form.setValue("serviceNumber", budget.serviceNumber, { shouldDirty: true });
    form.setValue("serviceComplement", budget.serviceComplement ?? "", { shouldDirty: true });
    form.setValue("serviceDistrict", budget.serviceDistrict, { shouldDirty: true });
    form.setValue("serviceCity", budget.serviceCity, { shouldDirty: true });
    form.setValue("serviceState", budget.serviceState, { shouldDirty: true });
    form.setValue("serviceCountry", budget.serviceCountry, { shouldDirty: true });
    form.setValue("notes", budget.notes ?? "", { shouldDirty: true });
    replace(
      budget.items.map((item) => ({
        sourceBudgetItemId: item.id,
        serviceTypeId: item.serviceTypeId,
        equipmentId: item.equipmentId,
        operatorId: item.operatorId,
        serviceDescription: item.serviceDescription,
        serviceDate: item.serviceDate,
        plannedStartTime: item.startTime,
        plannedEndTime: item.endTime,
        actualStartTime: undefined,
        actualEndTime: undefined,
        quotedValue: item.initialValue,
        notes: "",
      })),
    );
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    lastHydratedBudgetIdRef.current = null;

    if (serviceOrder) {
      form.reset({
        originType: serviceOrder.originType,
        sourceBudgetId: serviceOrder.sourceBudgetId ?? undefined,
        clientId: serviceOrder.clientId,
        servicePostalCode: serviceOrder.servicePostalCode,
        serviceStreet: serviceOrder.serviceStreet,
        serviceNumber: serviceOrder.serviceNumber,
        serviceComplement: serviceOrder.serviceComplement ?? "",
        serviceDistrict: serviceOrder.serviceDistrict,
        serviceCity: serviceOrder.serviceCity,
        serviceState: serviceOrder.serviceState,
        serviceCountry: serviceOrder.serviceCountry,
        notes: serviceOrder.notes ?? "",
        items: serviceOrder.items.map((item) => ({
          sourceBudgetItemId: item.sourceBudgetItemId ?? undefined,
          serviceTypeId: item.serviceTypeId,
          equipmentId: item.equipmentId,
          operatorId: item.operatorId,
          serviceDescription: item.serviceDescription,
          serviceDate: item.serviceDate,
          plannedStartTime: item.plannedStartTime,
          plannedEndTime: item.plannedEndTime,
          actualStartTime: item.actualStartTime ?? undefined,
          actualEndTime: item.actualEndTime ?? undefined,
          quotedValue: item.quotedValue ?? undefined,
          notes: item.notes ?? "",
        })),
      });
      lastHydratedBudgetIdRef.current = serviceOrder.sourceBudgetId;
      return;
    }

    form.reset({
      originType: "manual",
      sourceBudgetId: undefined,
      clientId: "",
      servicePostalCode: "",
      serviceStreet: "",
      serviceNumber: "",
      serviceComplement: "",
      serviceDistrict: "",
      serviceCity: "",
      serviceState: "",
      serviceCountry: "Brasil",
      notes: "",
      items: [createEmptyItem()],
    });
  }, [form, open, serviceOrder]);

  useEffect(() => {
    if (!open || watchedOriginType !== "budget" || !watchedSourceBudgetId) {
      return;
    }

    if (lastHydratedBudgetIdRef.current === watchedSourceBudgetId) {
      return;
    }

    const budget = approvedBudgetsById.get(watchedSourceBudgetId);

    if (!budget) {
      return;
    }

    applyBudgetToForm(budget);
    lastHydratedBudgetIdRef.current = watchedSourceBudgetId;
  }, [approvedBudgetsById, form, open, replace, watchedOriginType, watchedSourceBudgetId]);

  async function handleSubmit(values: CreateServiceOrderInput | UpdateServiceOrderInput) {
    await onSubmit(values);
    form.reset();
    onOpenChange(false);
  }

  const handleInvalidSubmit = (errors: FieldErrors<CreateServiceOrderInput | UpdateServiceOrderInput>) => {
    const messages = collectErrorMessages(errors);

    toast.error(t("serviceOrders.validationToastTitle"), {
      description: messages[0] ?? t("serviceOrders.validationToastFallback"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!isEdit ? (
        <DialogTrigger asChild>
          <Button className="cursor-pointer">
            <Plus className="mr-2 h-4 w-4" />
            {t("serviceOrders.addServiceOrder")}
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("serviceOrders.editServiceOrder") : t("serviceOrders.createServiceOrder")}</DialogTitle>
          <DialogDescription>{t("serviceOrders.createDescription")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="originType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("serviceOrders.originType")}</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value === "manual") {
                          form.setValue("sourceBudgetId", undefined, { shouldDirty: true });
                          lastHydratedBudgetIdRef.current = null;
                        }
                      }}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="manual">{t("serviceOrders.originManual")}</SelectItem>
                        <SelectItem value="budget">{t("serviceOrders.originBudget")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sourceBudgetId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("serviceOrders.sourceBudget")}</FormLabel>
                    <FormControl>
                      <SearchableCombobox
                        value={field.value}
                        onChange={field.onChange}
                        options={approvedBudgetOptions}
                        placeholder={t("serviceOrders.selectBudget")}
                        searchPlaceholder={t("serviceOrders.searchBudgetPlaceholder")}
                        emptyMessage={t("serviceOrders.noBudgetFound")}
                        disabled={watchedOriginType !== "budget" || isSubmitting}
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
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("serviceOrders.client")}</FormLabel>
                    <FormControl>
                      <SearchableCombobox
                        value={field.value}
                        onChange={field.onChange}
                        options={clientOptions}
                        placeholder={t("serviceOrders.selectClient")}
                        searchPlaceholder={t("serviceOrders.searchClientPlaceholder")}
                        emptyMessage={t("serviceOrders.noClientFound")}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="servicePostalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("serviceOrders.servicePostalCode")}</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="serviceStreet"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>{t("serviceOrders.serviceStreet")}</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="serviceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("serviceOrders.serviceNumber")}</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <FormField
                control={form.control}
                name="serviceComplement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("serviceOrders.serviceComplement")}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="serviceDistrict"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("serviceOrders.serviceDistrict")}</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="serviceCity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("serviceOrders.serviceCity")}</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="serviceState"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("serviceOrders.serviceState")}</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{t("serviceOrders.itemsSectionTitle")}</h3>
                  <p className="text-sm text-muted-foreground">{t("serviceOrders.itemsSectionDescription")}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => append(createEmptyItem())}
                  disabled={isSubmitting}
                >
                  <Plus className="mr-2 size-4" />
                  {t("serviceOrders.addItem")}
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="space-y-4 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{t("serviceOrders.itemTitle", { index: index + 1 })}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="cursor-pointer"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1 || isSubmitting}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name={`items.${index}.serviceTypeId`}
                      render={({ field: itemField }) => (
                        <FormItem>
                          <FormLabel>{t("serviceOrders.serviceType")}</FormLabel>
                          <Select value={itemField.value} onValueChange={itemField.onChange} disabled={isSubmitting}>
                            <FormControl>
                              <SelectTrigger className="cursor-pointer">
                                <SelectValue placeholder={t("serviceOrders.selectServiceType")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {serviceTypes.map((serviceType) => (
                                <SelectItem key={serviceType.id} value={serviceType.id}>
                                  {serviceType.name}
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
                      name={`items.${index}.equipmentId`}
                      render={({ field: itemField }) => (
                        <FormItem>
                          <FormLabel>{t("serviceOrders.equipment")}</FormLabel>
                          <Select value={itemField.value} onValueChange={itemField.onChange} disabled={isSubmitting}>
                            <FormControl>
                              <SelectTrigger className="cursor-pointer">
                                <SelectValue placeholder={t("serviceOrders.selectEquipment")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {equipment.map((equipmentOption) => (
                                <SelectItem key={equipmentOption.id} value={equipmentOption.id}>
                                  {equipmentOption.name} • {equipmentOption.brand} {equipmentOption.model}
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
                      name={`items.${index}.operatorId`}
                      render={({ field: itemField }) => (
                        <FormItem>
                          <FormLabel>{t("serviceOrders.operator")}</FormLabel>
                          <Select value={itemField.value} onValueChange={itemField.onChange} disabled={isSubmitting}>
                            <FormControl>
                              <SelectTrigger className="cursor-pointer">
                                <SelectValue placeholder={t("serviceOrders.selectOperator")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {operators.map((operator) => (
                                <SelectItem key={operator.id} value={operator.id}>
                                  {operator.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name={`items.${index}.serviceDescription`}
                    render={({ field: itemField }) => (
                      <FormItem>
                        <FormLabel>{t("serviceOrders.serviceDescription")}</FormLabel>
                        <FormControl>
                          <Textarea {...itemField} disabled={isSubmitting} rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-4">
                    <FormField
                      control={form.control}
                      name={`items.${index}.serviceDate`}
                      render={({ field: itemField }) => (
                        <FormItem>
                          <FormLabel>{t("serviceOrders.serviceDate")}</FormLabel>
                          <FormControl>
                            <Input {...itemField} type="date" disabled={isSubmitting} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.plannedStartTime`}
                      render={({ field: itemField }) => (
                        <FormItem>
                          <FormLabel>{t("serviceOrders.plannedStartTime")}</FormLabel>
                          <FormControl>
                            <Input {...itemField} type="time" disabled={isSubmitting} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.plannedEndTime`}
                      render={({ field: itemField }) => (
                        <FormItem>
                          <FormLabel>{t("serviceOrders.plannedEndTime")}</FormLabel>
                          <FormControl>
                            <Input {...itemField} type="time" disabled={isSubmitting} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.quotedValue`}
                      render={({ field: itemField }) => (
                        <FormItem>
                          <FormLabel>{t("serviceOrders.quotedValue")}</FormLabel>
                          <FormControl>
                            <Input
                              {...itemField}
                              type="number"
                              step="0.01"
                              value={itemField.value ?? ""}
                              disabled={isSubmitting}
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
                      name={`items.${index}.actualStartTime`}
                      render={({ field: itemField }) => (
                        <FormItem>
                          <FormLabel>{t("serviceOrders.actualStartTime")}</FormLabel>
                          <FormControl>
                            <Input {...itemField} type="time" value={itemField.value ?? ""} disabled={isSubmitting} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.actualEndTime`}
                      render={({ field: itemField }) => (
                        <FormItem>
                          <FormLabel>{t("serviceOrders.actualEndTime")}</FormLabel>
                          <FormControl>
                            <Input {...itemField} type="time" value={itemField.value ?? ""} disabled={isSubmitting} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name={`items.${index}.notes`}
                    render={({ field: itemField }) => (
                      <FormItem>
                        <FormLabel>{t("serviceOrders.itemNotes")}</FormLabel>
                        <FormControl>
                          <Textarea {...itemField} value={itemField.value ?? ""} disabled={isSubmitting} rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("serviceOrders.notes")}</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} disabled={isSubmitting} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" className="cursor-pointer" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
                {isEdit ? t("common.saveChanges") : t("serviceOrders.createServiceOrder")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
