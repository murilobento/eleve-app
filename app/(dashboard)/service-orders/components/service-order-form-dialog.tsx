"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
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

function buildAddressSummary(address: {
  postalCode?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}) {
  return [
    [address.street, address.number].filter(Boolean).join(", "),
    address.complement,
    address.district,
    address.city && address.state ? `${address.city} - ${address.state}` : address.city || address.state,
    address.postalCode,
    address.country,
  ].filter(Boolean).join(" • ");
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
}: ServiceOrderFormDialogProps) {
  const { t } = useI18n();
  const isEdit = mode === "edit";
  const schema = isEdit ? updateServiceOrderSchema : createServiceOrderSchema;
  const lastLookedUpServicePostalCodeRef = useRef<string | null>(null);
  const [pendingAddressClient, setPendingAddressClient] = useState<ManagedClient | null>(null);
  const [pendingRetroactiveSubmit, setPendingRetroactiveSubmit] = useState<CreateServiceOrderInput | UpdateServiceOrderInput | null>(null);
  const [serviceAddressMode, setServiceAddressMode] = useState<ServiceAddressMode>("inherit");
  const [isServiceAddressDialogOpen, setIsServiceAddressDialogOpen] = useState(false);
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

  const watchedClientId = form.watch("clientId");
  const watchedServicePostalCode = form.watch("servicePostalCode");
  const watchedServiceStreet = form.watch("serviceStreet");
  const watchedServiceNumber = form.watch("serviceNumber");
  const watchedServiceComplement = form.watch("serviceComplement");
  const watchedServiceDistrict = form.watch("serviceDistrict");
  const watchedServiceCity = form.watch("serviceCity");
  const watchedServiceState = form.watch("serviceState");
  const watchedServiceCountry = form.watch("serviceCountry");

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
    form.clearErrors([
      "servicePostalCode",
      "serviceStreet",
      "serviceNumber",
      "serviceDistrict",
      "serviceCity",
      "serviceState",
      "serviceCountry",
    ]);
    form.setValue("servicePostalCode", "", { shouldDirty: true, shouldValidate: false });
    form.setValue("serviceStreet", "", { shouldDirty: true, shouldValidate: false });
    form.setValue("serviceNumber", "", { shouldDirty: true, shouldValidate: false });
    form.setValue("serviceComplement", "", { shouldDirty: true });
    form.setValue("serviceDistrict", "", { shouldDirty: true, shouldValidate: false });
    form.setValue("serviceCity", "", { shouldDirty: true, shouldValidate: false });
    form.setValue("serviceState", "", { shouldDirty: true, shouldValidate: false });
    form.setValue("serviceCountry", "Brasil", { shouldDirty: true, shouldValidate: false });
  };

  const openManualAddressDialog = () => {
    setServiceAddressMode("manual");
    setIsServiceAddressDialogOpen(true);
  };

  const handleSaveServiceAddress = async () => {
    const isValid = await form.trigger([
      "servicePostalCode",
      "serviceStreet",
      "serviceNumber",
      "serviceDistrict",
      "serviceCity",
      "serviceState",
      "serviceCountry",
    ]);

    if (!isValid) {
      return;
    }

    setServiceAddressMode("manual");
    setIsServiceAddressDialogOpen(false);
  };

  const handleInvalidSubmitWithAddress = (
    errors: FieldErrors<CreateServiceOrderInput | UpdateServiceOrderInput>,
  ) => {
    if (
      errors.servicePostalCode
      || errors.serviceStreet
      || errors.serviceNumber
      || errors.serviceDistrict
      || errors.serviceCity
      || errors.serviceState
      || errors.serviceCountry
    ) {
      setIsServiceAddressDialogOpen(true);
    }

    handleInvalidSubmit(errors);
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
      if (serviceAddressMode !== "manual") {
        clearServiceAddress();
        lastLookedUpServicePostalCodeRef.current = null;
      }

      openManualAddressDialog();
    }

    setPendingAddressClient(null);
  };

  useEffect(() => {
    if (open) {
      return;
    }

    setPendingAddressClient(null);
    setPendingRetroactiveSubmit(null);
    setServiceAddressMode("inherit");
    setIsServiceAddressDialogOpen(false);
    lastLookedUpServicePostalCodeRef.current = null;
    setItemDraft(createEmptyItem());
    setEditingItemIndex(null);
    setItemDraftErrors({});
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

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
      setIsServiceAddressDialogOpen(false);
      lastLookedUpServicePostalCodeRef.current =
        sameAddressAsClient ? normalizePostalCode(serviceOrder.servicePostalCode) : null;
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
    setIsServiceAddressDialogOpen(false);
    lastLookedUpServicePostalCodeRef.current = null;
    setItemDraft(createEmptyItem());
    setEditingItemIndex(null);
    setItemDraftErrors({});
  }, [clientsById, form, open, serviceOrder]);

  useEffect(() => {
    if (!open || isEdit || serviceOrder) {
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
  }, [form, isEdit, open, serviceAddressMode, serviceOrder, t, watchedServicePostalCode]);

  async function handleSubmit(values: CreateServiceOrderInput | UpdateServiceOrderInput) {
    const hasRetroactiveDate = values.items.some((item) => isDateBeforeToday(item.serviceDate));

    if (hasRetroactiveDate) {
      setPendingRetroactiveSubmit(values);
      return;
    }

    await onSubmit(values);
    form.reset();
    setPendingAddressClient(null);
    setPendingRetroactiveSubmit(null);
    setServiceAddressMode("inherit");
    setIsServiceAddressDialogOpen(false);
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
    setIsServiceAddressDialogOpen(false);
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
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-hidden p-0 sm:max-w-6xl">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmitWithAddress)}
            className={`flex max-h-[calc(100svh-2rem)] flex-col overflow-hidden [&_[aria-invalid=true]]:border-input [&_[aria-invalid=true]]:ring-0 ${formClassName}`}
          >
            <div className="shrink-0 border-b px-6 py-5">
              <DialogHeader className="gap-3">
                <DialogTitle>{isEdit ? t("serviceOrders.editServiceOrder") : t("serviceOrders.createServiceOrder")}</DialogTitle>
              </DialogHeader>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-6 py-4">
            {pendingAddressClient ? (
              <section className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">{t("serviceOrders.clientAddressConfirmTitle")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("serviceOrders.clientAddressConfirmDescription", {
                      client: pendingAddressClient.tradeName || pendingAddressClient.legalName || "",
                    })}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
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
                </div>
              </section>
            ) : null}

            {isServiceAddressDialogOpen ? (
              <section className="space-y-4 rounded-xl border bg-card p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">{t("serviceOrders.serviceAddressModalTitle")}</h3>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="cursor-pointer self-start"
                    onClick={() => setIsServiceAddressDialogOpen(false)}
                  >
                    {t("common.close")}
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
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
                              field.onChange(nextValue);
                              form.clearErrors("servicePostalCode");
                              lastLookedUpServicePostalCodeRef.current = null;
                              setServiceAddressMode("manual");
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                </div>

                <div className="grid gap-4 md:grid-cols-4">
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
                  <div />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
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
                  <FormField
                    control={form.control}
                    name="serviceCountry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("serviceOrders.serviceCountry")}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => setIsServiceAddressDialogOpen(false)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button type="button" className="cursor-pointer" onClick={() => void handleSaveServiceAddress()}>
                    {t("serviceOrders.saveServiceAddress")}
                  </Button>
                </div>
              </section>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
              <section className="space-y-4 rounded-xl border bg-card p-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">{t("serviceOrders.client")}</h3>
                </div>

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

                            if (!isEdit) {
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
              </section>

              <section className="space-y-4 rounded-xl border bg-card p-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">{t("serviceOrders.detailsLocation")}</h3>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      {serviceAddressMode === "inherit"
                        ? t("serviceOrders.addressSummaryInherited")
                        : t("serviceOrders.addressSummaryManual")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {buildAddressSummary({
                        postalCode: watchedServicePostalCode,
                        street: watchedServiceStreet,
                        number: watchedServiceNumber,
                        complement: watchedServiceComplement,
                        district: watchedServiceDistrict,
                        city: watchedServiceCity,
                        state: watchedServiceState,
                        country: watchedServiceCountry,
                      }) || t("serviceOrders.addressSummaryEmpty")}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={openManualAddressDialog}
                  >
                    {watchedServiceStreet ? t("serviceOrders.editServiceAddress") : t("serviceOrders.defineServiceAddress")}
                  </Button>
                </div>
              </section>
            </div>

            <section className="space-y-4 rounded-xl border bg-card p-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">{t("serviceOrders.itemsSectionTitle")}</h3>
              </div>

              <div className="space-y-4 rounded-xl border bg-muted/10 p-4">
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

              <div className="overflow-x-auto rounded-lg border">
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
            </section>

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
            </div>

            <DialogFooter className="shrink-0 border-t px-6 py-4">
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
