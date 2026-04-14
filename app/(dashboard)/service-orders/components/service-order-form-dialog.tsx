"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { SearchableCombobox } from "@/components/searchable-combobox";
import { DatePickerInput, formatDateString, parseDateString } from "@/components/date-picker-input";
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
import type { ManagedClient, PostalCodeLookupResult } from "@/lib/clients-admin";
import type { EquipmentOption } from "@/lib/equipment-admin";
import type { ManagedOperator } from "@/lib/operators-admin";
import { isDateBeforeToday } from "@/lib/service-date";
import {
  createServiceOrderSchema,
  type CreateServiceOrderInput,
  type ManagedServiceOrder,
  serviceOrderItemSchema,
  type ServiceOrderItemInput,
  type UpdateServiceOrderInput,
  updateServiceOrderSchema,
} from "@/lib/service-orders-admin";
import type { ManagedServiceType } from "@/lib/service-types-admin";
import { useFormValidationToast } from "@/hooks/use-form-validation-toast";
import { formatPostalCode } from "@/lib/utils";
import { useI18n } from "@/i18n/provider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

type PostalCodeLookupResponse = {
  postalCode: PostalCodeLookupResult;
};

type ServiceAddressMode = "inherit" | "manual";
type ItemDraftErrors = Partial<Record<keyof ServiceOrderItemInput, string>>;

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

function normalizePostalCode(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

function normalizeAddressValue(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function isSameAddressAsClient(
  client: ManagedClient | null,
  address: {
    postalCode?: string | null;
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    district?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
  },
) {
  if (!client) {
    return false;
  }

  return normalizePostalCode(address.postalCode) === normalizePostalCode(client.postalCode)
    && normalizeAddressValue(address.street) === normalizeAddressValue(client.street)
    && normalizeAddressValue(address.number) === normalizeAddressValue(client.number)
    && normalizeAddressValue(address.complement) === normalizeAddressValue(client.complement)
    && normalizeAddressValue(address.district) === normalizeAddressValue(client.district)
    && normalizeAddressValue(address.city) === normalizeAddressValue(client.city)
    && normalizeAddressValue(address.state) === normalizeAddressValue(client.state)
    && normalizeAddressValue(address.country ?? "Brasil") === normalizeAddressValue(client.country);
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed.");
  }

  return payload as T;
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
  const lastLookedUpServicePostalCodeRef = useRef<string | null>(null);
  const [pendingAddressClient, setPendingAddressClient] = useState<ManagedClient | null>(null);
  const [pendingRetroactiveSubmit, setPendingRetroactiveSubmit] = useState<CreateServiceOrderInput | UpdateServiceOrderInput | null>(null);
  const [serviceAddressMode, setServiceAddressMode] = useState<ServiceAddressMode>("inherit");
  const [itemDraft, setItemDraft] = useState<ServiceOrderItemInput>(createEmptyItem());
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [itemDraftErrors, setItemDraftErrors] = useState<ItemDraftErrors>({});

  const form = useForm<CreateServiceOrderInput | UpdateServiceOrderInput>({
    resolver: zodResolver(schema),
    shouldFocusError: false,
    mode: "onBlur",
    reValidateMode: "onBlur",
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
      items: [],
    },
  });
  const { formClassName, handleInvalidSubmit } = useFormValidationToast({
    form,
    title: t("serviceOrders.validationToastTitle"),
    fallback: t("serviceOrders.validationToastFallback"),
  });

  const { fields, append, move, remove, replace, update } = useFieldArray({
    control: form.control,
    name: "items",
  });
  const watchedItems = form.watch("items") ?? [];

  const watchedOriginType = form.watch("originType");
  const watchedSourceBudgetId = form.watch("sourceBudgetId");
  const watchedClientId = form.watch("clientId");
  const watchedServicePostalCode = form.watch("servicePostalCode");

  const clientsById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients],
  );
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
  const selectedClient = useMemo(
    () => clientsById.get(watchedClientId ?? "") ?? null,
    [clientsById, watchedClientId],
  );
  const serviceTypesById = useMemo(
    () => new Map(serviceTypes.map((serviceType) => [serviceType.id, serviceType])),
    [serviceTypes],
  );
  const equipmentById = useMemo(
    () => new Map(equipment.map((equipmentOption) => [equipmentOption.id, equipmentOption])),
    [equipment],
  );
  const operatorsById = useMemo(
    () => new Map(operators.map((operator) => [operator.id, operator])),
    [operators],
  );

  const clearItemDraftFieldError = (fieldName: keyof ServiceOrderItemInput) => {
    setItemDraftErrors((current) => {
      if (!current[fieldName]) {
        return current;
      }

      const next = { ...current };
      delete next[fieldName];
      return next;
    });
  };

  const updateItemDraftField = <K extends keyof ServiceOrderItemInput>(
    fieldName: K,
    value: ServiceOrderItemInput[K],
  ) => {
    setItemDraft((current) => ({ ...current, [fieldName]: value }));
    clearItemDraftFieldError(fieldName);
  };

  const resetItemDraft = () => {
    setItemDraft(createEmptyItem());
    setEditingItemIndex(null);
    setItemDraftErrors({});
  };

  const validateItemDraft = () => {
    const parsed = serviceOrderItemSchema.safeParse(itemDraft);

    if (parsed.success) {
      setItemDraftErrors({});
      return parsed.data;
    }

    const nextErrors: ItemDraftErrors = {};

    parsed.error.issues.forEach((issue) => {
      const fieldName = issue.path[0];

      if (typeof fieldName !== "string") {
        return;
      }

      if (nextErrors[fieldName as keyof ServiceOrderItemInput]) {
        return;
      }

      nextErrors[fieldName as keyof ServiceOrderItemInput] = issue.message;
    });

    setItemDraftErrors(nextErrors);
    return null;
  };

  const handleSaveItemDraft = () => {
    const parsedItem = validateItemDraft();

    if (!parsedItem) {
      return;
    }

    if (editingItemIndex === null) {
      append(parsedItem);
    } else {
      update(editingItemIndex, parsedItem);
    }

    resetItemDraft();
  };

  const handleEditItem = (index: number) => {
    const item = form.getValues(`items.${index}`);

    if (!item) {
      return;
    }

    setItemDraft({
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
    });
    setEditingItemIndex(index);
    setItemDraftErrors({});
  };

  const copyAddressFromClient = (client: ManagedClient) => {
    form.setValue("servicePostalCode", formatPostalCode(client.postalCode), { shouldDirty: true, shouldValidate: true });
    form.setValue("serviceStreet", client.street, { shouldDirty: true, shouldValidate: true });
    form.setValue("serviceNumber", client.number, { shouldDirty: true, shouldValidate: true });
    form.setValue("serviceComplement", client.complement ?? "", { shouldDirty: true });
    form.setValue("serviceDistrict", client.district, { shouldDirty: true, shouldValidate: true });
    form.setValue("serviceCity", client.city, { shouldDirty: true, shouldValidate: true });
    form.setValue("serviceState", client.state, { shouldDirty: true, shouldValidate: true });
    form.setValue("serviceCountry", client.country, { shouldDirty: true, shouldValidate: true });
  };

  const clearServiceAddress = () => {
    form.setValue("servicePostalCode", "", { shouldDirty: true, shouldValidate: true });
    form.setValue("serviceStreet", "", { shouldDirty: true, shouldValidate: true });
    form.setValue("serviceNumber", "", { shouldDirty: true, shouldValidate: true });
    form.setValue("serviceComplement", "", { shouldDirty: true });
    form.setValue("serviceDistrict", "", { shouldDirty: true, shouldValidate: true });
    form.setValue("serviceCity", "", { shouldDirty: true, shouldValidate: true });
    form.setValue("serviceState", "", { shouldDirty: true, shouldValidate: true });
    form.setValue("serviceCountry", "Brasil", { shouldDirty: true, shouldValidate: true });
  };

  const handleClientAddressDecision = (shouldUseClientAddress: boolean) => {
    if (!pendingAddressClient) {
      return;
    }

    if (shouldUseClientAddress) {
      copyAddressFromClient(pendingAddressClient);
      setServiceAddressMode("inherit");
      lastLookedUpServicePostalCodeRef.current = normalizePostalCode(pendingAddressClient.postalCode);
    } else {
      clearServiceAddress();
      setServiceAddressMode("manual");
      lastLookedUpServicePostalCodeRef.current = null;
    }

    setPendingAddressClient(null);
  };

  const applyBudgetToForm = (budget: ManagedBudget) => {
    form.setValue("clientId", budget.clientId, { shouldDirty: true });
    form.setValue("servicePostalCode", formatPostalCode(budget.servicePostalCode), { shouldDirty: true });
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
    if (open) {
      return;
    }

    setPendingAddressClient(null);
    setPendingRetroactiveSubmit(null);
    setServiceAddressMode("inherit");
    lastLookedUpServicePostalCodeRef.current = null;
    setItemDraft(createEmptyItem());
    setEditingItemIndex(null);
    setItemDraftErrors({});
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    lastHydratedBudgetIdRef.current = null;

    if (serviceOrder) {
      const selectedServiceOrderClient = clientsById.get(serviceOrder.clientId) ?? null;
      const sameAddressAsClient = isSameAddressAsClient(selectedServiceOrderClient, {
        postalCode: serviceOrder.servicePostalCode,
        street: serviceOrder.serviceStreet,
        number: serviceOrder.serviceNumber,
        complement: serviceOrder.serviceComplement,
        district: serviceOrder.serviceDistrict,
        city: serviceOrder.serviceCity,
        state: serviceOrder.serviceState,
        country: serviceOrder.serviceCountry,
      });

      form.reset({
        originType: serviceOrder.originType,
        sourceBudgetId: serviceOrder.sourceBudgetId ?? undefined,
        clientId: serviceOrder.clientId,
        servicePostalCode: formatPostalCode(serviceOrder.servicePostalCode),
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
      setPendingAddressClient(null);
      setPendingRetroactiveSubmit(null);
      setServiceAddressMode(sameAddressAsClient ? "inherit" : "manual");
      lastLookedUpServicePostalCodeRef.current =
        sameAddressAsClient ? normalizePostalCode(serviceOrder.servicePostalCode) : null;
      lastHydratedBudgetIdRef.current = serviceOrder.sourceBudgetId;
      setItemDraft(createEmptyItem());
      setEditingItemIndex(null);
      setItemDraftErrors({});
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
      items: [],
    });
    setPendingAddressClient(null);
    setPendingRetroactiveSubmit(null);
    setServiceAddressMode("inherit");
    lastLookedUpServicePostalCodeRef.current = null;
    setItemDraft(createEmptyItem());
    setEditingItemIndex(null);
    setItemDraftErrors({});
  }, [clientsById, form, open, serviceOrder]);

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
    setPendingAddressClient(null);
    setServiceAddressMode("inherit");
    lastLookedUpServicePostalCodeRef.current = normalizePostalCode(budget.servicePostalCode);
    lastHydratedBudgetIdRef.current = watchedSourceBudgetId;
    setItemDraft(createEmptyItem());
    setEditingItemIndex(null);
    setItemDraftErrors({});
  }, [approvedBudgetsById, form, open, replace, watchedOriginType, watchedSourceBudgetId]);

  useEffect(() => {
    if (!open || isEdit || watchedOriginType !== "manual" || serviceOrder) {
      return;
    }

    const postalCode = normalizePostalCode(watchedServicePostalCode);

    if (serviceAddressMode !== "manual" || postalCode.length !== 8 || postalCode === lastLookedUpServicePostalCodeRef.current) {
      return;
    }

    let cancelled = false;
    let lookupCompleted = false;
    let timedOut = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 8000);
    const toastId = toast.loading(t("serviceOrders.postalCodeLookupLoading"));

    lastLookedUpServicePostalCodeRef.current = postalCode;
    form.clearErrors("servicePostalCode");

    void (async () => {
      try {
        const payload = await parseResponse<PostalCodeLookupResponse>(
          await fetch(`/api/service-orders/postal-code?postalCode=${postalCode}`, {
            cache: "no-store",
            signal: controller.signal,
          }),
        );

        if (cancelled) {
          return;
        }

        form.setValue("servicePostalCode", formatPostalCode(payload.postalCode.postalCode), {
          shouldDirty: true,
          shouldValidate: true,
        });
        form.setValue("serviceStreet", payload.postalCode.street, { shouldDirty: true, shouldValidate: true });
        form.setValue("serviceDistrict", payload.postalCode.district, { shouldDirty: true, shouldValidate: true });
        form.setValue("serviceCity", payload.postalCode.city, { shouldDirty: true, shouldValidate: true });
        form.setValue("serviceState", payload.postalCode.state, { shouldDirty: true, shouldValidate: true });
        form.setValue("serviceCountry", "Brasil", { shouldDirty: true, shouldValidate: true });
        lookupCompleted = true;
        toast.success(t("serviceOrders.postalCodeLookupSuccess"), { id: toastId });
      } catch (lookupError) {
        if (cancelled) {
          return;
        }

        if (lookupError instanceof Error && lookupError.name === "AbortError" && !timedOut) {
          return;
        }

        lastLookedUpServicePostalCodeRef.current = null;
        const message = timedOut
          ? t("serviceOrders.postalCodeLookupError")
          : lookupError instanceof Error ? lookupError.message : t("serviceOrders.postalCodeLookupError");
        form.setError("servicePostalCode", { message });
        lookupCompleted = true;
        toast.error(message, { id: toastId });
      } finally {
        window.clearTimeout(timeoutId);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller.abort();

      if (!lookupCompleted) {
        toast.dismiss(toastId);
      }
    };
  }, [form, isEdit, open, serviceAddressMode, serviceOrder, t, watchedOriginType, watchedServicePostalCode]);

  async function handleSubmit(values: CreateServiceOrderInput | UpdateServiceOrderInput) {
    const hasRetroactiveDate =
      values.originType === "manual"
      && values.items.some((item) => isDateBeforeToday(item.serviceDate));

    if (hasRetroactiveDate) {
      setPendingRetroactiveSubmit(values);
      return;
    }

    await onSubmit(values);
    form.reset();
    setPendingAddressClient(null);
    setPendingRetroactiveSubmit(null);
    setServiceAddressMode("inherit");
    lastLookedUpServicePostalCodeRef.current = null;
    setItemDraft(createEmptyItem());
    setEditingItemIndex(null);
    setItemDraftErrors({});
    onOpenChange(false);
  }

  async function handleConfirmRetroactiveSubmit() {
    if (!pendingRetroactiveSubmit) {
      return;
    }

    await onSubmit(pendingRetroactiveSubmit);
    form.reset();
    setPendingAddressClient(null);
    setPendingRetroactiveSubmit(null);
    setServiceAddressMode("inherit");
    lastLookedUpServicePostalCodeRef.current = null;
    setItemDraft(createEmptyItem());
    setEditingItemIndex(null);
    setItemDraftErrors({});
    onOpenChange(false);
  }

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
          <form onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)} className={`space-y-6 ${formClassName}`}>
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
                        onChange={(value) => {
                          if (value === field.value) {
                            return;
                          }

                          field.onChange(value);

                          if (!isEdit && watchedOriginType === "manual") {
                            const client = clientsById.get(value);

                            if (client) {
                              setPendingAddressClient(client);
                            }
                          }
                        }}
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
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="00000-000"
                        disabled={isSubmitting}
                        onChange={(event) => {
                          const nextValue = formatPostalCode(event.target.value);
                          const nextPostalCode = normalizePostalCode(nextValue);

                          field.onChange(nextValue);
                          form.clearErrors("servicePostalCode");
                          lastLookedUpServicePostalCodeRef.current = null;

                          if (
                            serviceAddressMode === "inherit"
                            && (!selectedClient || nextPostalCode !== normalizePostalCode(selectedClient.postalCode))
                          ) {
                            setServiceAddressMode("manual");
                          }
                        }}
                      />
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
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <FormLabel>{t("serviceOrders.serviceType")}</FormLabel>
                    <Select
                      value={itemDraft.serviceTypeId}
                      onValueChange={(value) => updateItemDraftField("serviceTypeId", value)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue placeholder={t("serviceOrders.selectServiceType")} />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceTypes.map((serviceType) => (
                          <SelectItem key={serviceType.id} value={serviceType.id}>
                            {serviceType.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {itemDraftErrors.serviceTypeId ? <p className="text-sm text-destructive">{itemDraftErrors.serviceTypeId}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <FormLabel>{t("serviceOrders.equipment")}</FormLabel>
                    <Select
                      value={itemDraft.equipmentId}
                      onValueChange={(value) => updateItemDraftField("equipmentId", value)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue placeholder={t("serviceOrders.selectEquipment")} />
                      </SelectTrigger>
                      <SelectContent>
                        {equipment.map((equipmentOption) => (
                          <SelectItem key={equipmentOption.id} value={equipmentOption.id}>
                            {equipmentOption.name} • {equipmentOption.brand} {equipmentOption.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {itemDraftErrors.equipmentId ? <p className="text-sm text-destructive">{itemDraftErrors.equipmentId}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <FormLabel>{t("serviceOrders.operator")}</FormLabel>
                    <Select
                      value={itemDraft.operatorId}
                      onValueChange={(value) => updateItemDraftField("operatorId", value)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue placeholder={t("serviceOrders.selectOperator")} />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map((operator) => (
                          <SelectItem key={operator.id} value={operator.id}>
                            {operator.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {itemDraftErrors.operatorId ? <p className="text-sm text-destructive">{itemDraftErrors.operatorId}</p> : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <FormLabel>{t("serviceOrders.serviceDescription")}</FormLabel>
                  <Textarea
                    value={itemDraft.serviceDescription}
                    onChange={(event) => updateItemDraftField("serviceDescription", event.target.value)}
                    disabled={isSubmitting}
                    rows={2}
                  />
                  {itemDraftErrors.serviceDescription ? <p className="text-sm text-destructive">{itemDraftErrors.serviceDescription}</p> : null}
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <FormLabel>{t("serviceOrders.serviceDate")}</FormLabel>
                    <DatePickerInput
                      value={parseDateString(itemDraft.serviceDate)}
                      onChange={(date) => updateItemDraftField("serviceDate", formatDateString(date))}
                      placeholder={t("serviceOrders.selectDate")}
                      disabled={isSubmitting}
                    />
                    {itemDraftErrors.serviceDate ? <p className="text-sm text-destructive">{itemDraftErrors.serviceDate}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <FormLabel>{t("serviceOrders.plannedStartTime")}</FormLabel>
                    <Input
                      value={itemDraft.plannedStartTime}
                      onChange={(event) => updateItemDraftField("plannedStartTime", event.target.value)}
                      type="time"
                      max="16:00"
                      disabled={isSubmitting}
                    />
                    {itemDraftErrors.plannedStartTime ? <p className="text-sm text-destructive">{itemDraftErrors.plannedStartTime}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <FormLabel>{t("serviceOrders.plannedEndTime")}</FormLabel>
                    <Input
                      value={itemDraft.plannedEndTime}
                      onChange={(event) => updateItemDraftField("plannedEndTime", event.target.value)}
                      type="time"
                      max="17:00"
                      disabled={isSubmitting}
                    />
                    {itemDraftErrors.plannedEndTime ? <p className="text-sm text-destructive">{itemDraftErrors.plannedEndTime}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <FormLabel>{t("serviceOrders.quotedValue")}</FormLabel>
                    <Input
                      value={itemDraft.quotedValue ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        updateItemDraftField("quotedValue", value ? Number(value) : undefined);
                      }}
                      type="number"
                      step="0.01"
                      disabled={isSubmitting}
                    />
                    {itemDraftErrors.quotedValue ? <p className="text-sm text-destructive">{itemDraftErrors.quotedValue}</p> : null}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <FormLabel>{t("serviceOrders.actualStartTime")}</FormLabel>
                    <Input
                      value={itemDraft.actualStartTime ?? ""}
                      onChange={(event) => updateItemDraftField("actualStartTime", event.target.value || undefined)}
                      type="time"
                      disabled={isSubmitting}
                    />
                    {itemDraftErrors.actualStartTime ? <p className="text-sm text-destructive">{itemDraftErrors.actualStartTime}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <FormLabel>{t("serviceOrders.actualEndTime")}</FormLabel>
                    <Input
                      value={itemDraft.actualEndTime ?? ""}
                      onChange={(event) => updateItemDraftField("actualEndTime", event.target.value || undefined)}
                      type="time"
                      disabled={isSubmitting}
                    />
                    {itemDraftErrors.actualEndTime ? <p className="text-sm text-destructive">{itemDraftErrors.actualEndTime}</p> : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <FormLabel>{t("serviceOrders.itemNotes")}</FormLabel>
                  <Textarea
                    value={itemDraft.notes ?? ""}
                    onChange={(event) => updateItemDraftField("notes", event.target.value)}
                    disabled={isSubmitting}
                    rows={2}
                  />
                  {itemDraftErrors.notes ? <p className="text-sm text-destructive">{itemDraftErrors.notes}</p> : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" className="cursor-pointer" onClick={handleSaveItemDraft} disabled={isSubmitting}>
                    <Plus className="mr-2 size-4" />
                    {editingItemIndex === null ? t("serviceOrders.addItem") : t("common.saveChanges")}
                  </Button>
                  {editingItemIndex !== null ? (
                    <Button type="button" variant="outline" className="cursor-pointer" onClick={resetItemDraft} disabled={isSubmitting}>
                      {t("common.cancel")}
                    </Button>
                  ) : null}
                </div>
              </div>

              {form.formState.errors.items?.message ? (
                <p className="text-sm text-destructive">{form.formState.errors.items.message}</p>
              ) : null}

              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>{t("serviceOrders.serviceType")}</TableHead>
                      <TableHead>{t("serviceOrders.serviceDescription")}</TableHead>
                      <TableHead>{t("serviceOrders.serviceDate")}</TableHead>
                      <TableHead>{t("serviceOrders.plannedStartTime")} / {t("serviceOrders.plannedEndTime")}</TableHead>
                      <TableHead>{t("serviceOrders.equipment")}</TableHead>
                      <TableHead>{t("serviceOrders.operator")}</TableHead>
                      <TableHead>{t("serviceOrders.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.length ? fields.map((field, index) => {
                      const item = watchedItems[index];
                      const serviceTypeName = serviceTypesById.get(item?.serviceTypeId ?? "")?.name ?? "-";
                      const equipmentName = equipmentById.get(item?.equipmentId ?? "")?.name ?? "-";
                      const operatorName = operatorsById.get(item?.operatorId ?? "")?.name ?? "-";

                      return (
                        <TableRow key={field.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{serviceTypeName}</TableCell>
                          <TableCell className="max-w-[280px] truncate normal-case">{item?.serviceDescription || "-"}</TableCell>
                          <TableCell>{item?.serviceDate || "-"}</TableCell>
                          <TableCell>{item?.plannedStartTime || "--:--"} - {item?.plannedEndTime || "--:--"}</TableCell>
                          <TableCell>{equipmentName}</TableCell>
                          <TableCell>{operatorName}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="cursor-pointer"
                                onClick={() => handleEditItem(index)}
                                disabled={isSubmitting}
                              >
                                {t("common.edit")}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="cursor-pointer"
                                onClick={() => {
                                  if (index === 0) {
                                    return;
                                  }

                                  move(index, index - 1);
                                  setEditingItemIndex((current) => {
                                    if (current === null) {
                                      return current;
                                    }
                                    if (current === index) {
                                      return index - 1;
                                    }
                                    if (current === index - 1) {
                                      return index;
                                    }
                                    return current;
                                  });
                                }}
                                disabled={index === 0 || isSubmitting}
                              >
                                <ArrowUp className="size-4" />
                                <span className="sr-only">{t("serviceOrders.moveItemUp")}</span>
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="cursor-pointer"
                                onClick={() => {
                                  if (index === fields.length - 1) {
                                    return;
                                  }

                                  move(index, index + 1);
                                  setEditingItemIndex((current) => {
                                    if (current === null) {
                                      return current;
                                    }
                                    if (current === index) {
                                      return index + 1;
                                    }
                                    if (current === index + 1) {
                                      return index;
                                    }
                                    return current;
                                  });
                                }}
                                disabled={index === fields.length - 1 || isSubmitting}
                              >
                                <ArrowDown className="size-4" />
                                <span className="sr-only">{t("serviceOrders.moveItemDown")}</span>
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="cursor-pointer text-destructive hover:text-destructive"
                                onClick={() => {
                                  const shouldResetDraft = editingItemIndex === index;
                                  remove(index);
                                  if (shouldResetDraft) {
                                    setItemDraft(createEmptyItem());
                                    setEditingItemIndex(null);
                                    setItemDraftErrors({});
                                  } else {
                                    setEditingItemIndex((current) => (
                                      current !== null && current > index ? current - 1 : current
                                    ));
                                  }
                                }}
                                disabled={isSubmitting}
                              >
                                <Trash2 className="size-4" />
                                <span className="sr-only">{t("common.delete")}</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    }) : (
                      <TableRow>
                        <TableCell colSpan={8} className="h-20 text-center normal-case text-muted-foreground">
                          {t("serviceOrders.noItemsAdded")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
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

      <Dialog
        open={Boolean(pendingAddressClient)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setPendingAddressClient(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("serviceOrders.clientAddressConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("serviceOrders.clientAddressConfirmDescription", {
                client: pendingAddressClient?.tradeName || pendingAddressClient?.legalName || "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => handleClientAddressDecision(false)}
            >
              {t("serviceOrders.clientAddressConfirmNo")}
            </Button>
            <Button
              type="button"
              className="cursor-pointer"
              onClick={() => handleClientAddressDecision(true)}
            >
              {t("serviceOrders.clientAddressConfirmYes")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(pendingRetroactiveSubmit)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setPendingRetroactiveSubmit(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("serviceOrders.retroactiveDateConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("serviceOrders.retroactiveDateConfirmDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => setPendingRetroactiveSubmit(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="cursor-pointer"
              onClick={() => void handleConfirmRetroactiveSubmit()}
            >
              {t("serviceOrders.retroactiveDateConfirmAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
