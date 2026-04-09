"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { SearchableCombobox } from "@/components/searchable-combobox";
import { DatePickerInput, formatDateString, parseDateString } from "@/components/date-picker-input";
import { Badge } from "@/components/ui/badge";
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
  FormDescription,
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
import {
  addDurationToTime,
  calculateBudgetItemInitialValue,
  calculateBudgetItemSuggestedEndTime,
  calculateBudgetSubtotal,
  calculateBudgetTotal,
  createBudgetSchema,
  isLegacyHourlyBaseValue,
  type BudgetServiceItemInput,
  type CreateBudgetInput,
  type ManagedBudget,
  type UpdateBudgetInput,
  updateBudgetSchema,
} from "@/lib/budgets-admin";
import type { ManagedClient, PostalCodeLookupResult } from "@/lib/clients-admin";
import type { EquipmentOption } from "@/lib/equipment-admin";
import type { ManagedOperator } from "@/lib/operators-admin";
import type { ManagedServiceType } from "@/lib/service-types-admin";
import { getSemanticStatusBadgeClass } from "@/lib/status-badge";
import { useFormValidationToast } from "@/hooks/use-form-validation-toast";
import { useI18n, useLocale } from "@/i18n/provider";
import { cn, formatPostalCode } from "@/lib/utils";

type BudgetFormDialogProps = {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateBudgetInput | UpdateBudgetInput) => Promise<void> | void;
  isSubmitting: boolean;
  budget?: ManagedBudget | null;
  clients: ManagedClient[];
  equipment: EquipmentOption[];
  serviceTypes: ManagedServiceType[];
  operators: ManagedOperator[];
};

type ServiceAddressMode = "inherit" | "manual";

type PostalCodeLookupResponse = {
  postalCode: PostalCodeLookupResult;
};

function formatMoney(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed.");
  }

  return payload as T;
}

function getStatusBadgeClass(status: ManagedBudget["status"]) {
  return getSemanticStatusBadgeClass(status, "bg-amber-500/10 text-amber-700 dark:text-amber-400");
}

function createEmptyItem(): BudgetServiceItemInput {
  return {
    serviceTypeId: "",
    equipmentId: "",
    operatorId: "",
    serviceDescription: "",
    serviceDate: "",
    startTime: "",
    endTime: "",
    initialValue: 0,
  };
}

function getBillingUnitLabel(
  billingUnit: ManagedServiceType["billingUnit"],
  t: ReturnType<typeof useI18n>["t"],
) {
  switch (billingUnit) {
    case "hour":
      return t("budgets.billingUnits.hour");
    case "daily":
      return t("budgets.billingUnits.daily");
    case "monthly":
      return t("budgets.billingUnits.monthly");
    case "annual":
      return t("budgets.billingUnits.annual");
    case "km":
      return t("budgets.billingUnits.km");
    case "freight":
      return t("budgets.billingUnits.freight");
    case "mobilization_demobilization":
      return t("budgets.billingUnits.mobilizationDemobilization");
    case "counterweight_transport":
      return t("budgets.billingUnits.counterweightTransport");
    default:
      return billingUnit;
  }
}

function buildServiceTypeCaption(
  serviceType: ManagedServiceType | null,
  locale: string,
  t: ReturnType<typeof useI18n>["t"],
) {
  if (!serviceType) {
    return "";
  }

  const baseValue = formatMoney(serviceType.baseValue, locale);

  if (serviceType.billingUnit === "hour" && serviceType.minimumHours) {
    return t("budgets.serviceTypeHourlyCaption", {
      value: baseValue,
      hours: serviceType.minimumHours.toLocaleString(locale),
    });
  }

  return t("budgets.serviceTypeBaseCaption", {
    value: baseValue,
    unit: getBillingUnitLabel(serviceType.billingUnit, t),
  });
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

export function BudgetFormDialog({
  mode,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  budget,
  clients,
  equipment,
  serviceTypes,
  operators,
}: BudgetFormDialogProps) {
  const { t } = useI18n();
  const locale = useLocale();
  const isEdit = mode === "edit";
  const schema = isEdit ? updateBudgetSchema : createBudgetSchema;
  const [manualValueOverrides, setManualValueOverrides] = useState<boolean[]>([false]);
  const [manualEndTimeOverrides, setManualEndTimeOverrides] = useState<boolean[]>([false]);
  const [pendingAddressClient, setPendingAddressClient] = useState<ManagedClient | null>(null);
  const [serviceAddressMode, setServiceAddressMode] = useState<ServiceAddressMode>("inherit");
  const lastLookedUpServicePostalCodeRef = useRef<string | null>(null);

  const form = useForm<CreateBudgetInput | UpdateBudgetInput>({
    resolver: zodResolver(schema),
    shouldFocusError: false,
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      clientId: "",
      servicePostalCode: "",
      serviceStreet: "",
      serviceNumber: "",
      serviceComplement: "",
      serviceDistrict: "",
      serviceCity: "",
      serviceState: "",
      serviceCountry: "Brasil",
      manualAdjustment: 0,
      notes: "",
      items: [createEmptyItem()],
    },
  });
  const { formClassName, handleInvalidSubmit } = useFormValidationToast({
    form,
    title: t("budgets.validationToastTitle"),
    fallback: t("budgets.validationToastFallback"),
  });

  const { fields, append, move, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = useWatch({
    control: form.control,
    name: "items",
  }) ?? [];
  const watchedManualAdjustment = useWatch({
    control: form.control,
    name: "manualAdjustment",
  });
  const watchedServicePostalCode = useWatch({
    control: form.control,
    name: "servicePostalCode",
  });
  const watchedClientId = useWatch({
    control: form.control,
    name: "clientId",
  });

  const serviceTypesById = useMemo(
    () => new Map(serviceTypes.map((item) => [item.id, item])),
    [serviceTypes],
  );

  const clientsById = useMemo(
    () => new Map(clients.map((item) => [item.id, item])),
    [clients],
  );
  const clientOptions = useMemo(
    () =>
      clients.map((client) => {
        const displayName = client.tradeName || client.legalName;
        const alternateName =
          client.tradeName && client.tradeName !== client.legalName
            ? client.legalName
            : null;

        return {
          value: client.id,
          label: displayName,
          description: alternateName ?? undefined,
          keywords: [client.tradeName ?? "", client.legalName].filter(Boolean),
        };
      }),
    [clients],
  );
  const selectedClient = useMemo(
    () => clientsById.get(watchedClientId ?? "") ?? null,
    [clientsById, watchedClientId],
  );

  const subtotalValue = useMemo(
    () =>
      calculateBudgetSubtotal(
        watchedItems.map((item) => ({
          initialValue: Number(item?.initialValue || 0),
        })),
      ),
    [watchedItems],
  );

  const totalValue = useMemo(
    () => calculateBudgetTotal(subtotalValue, Number(watchedManualAdjustment || 0)),
    [subtotalValue, watchedManualAdjustment],
  );

  const copyAddressFromClient = (client: ManagedClient) => {
    form.setValue("servicePostalCode", formatPostalCode(client.postalCode), {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("serviceStreet", client.street, { shouldDirty: true, shouldValidate: true });
    form.setValue("serviceNumber", client.number, { shouldDirty: true, shouldValidate: true });
    form.setValue("serviceComplement", client.complement ?? "", { shouldDirty: true });
    form.setValue("serviceDistrict", client.district, { shouldDirty: true, shouldValidate: true });
    form.setValue("serviceCity", client.city, { shouldDirty: true, shouldValidate: true });
    form.setValue("serviceState", client.state, { shouldDirty: true, shouldValidate: true });
    form.setValue("serviceCountry", client.country, { shouldDirty: true, shouldValidate: true });
  };

  const clearServiceAddress = () => {
    form.setValue("servicePostalCode", "", {
      shouldDirty: true,
      shouldValidate: true,
    });
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

  const setManualValueOverride = (index: number, value: boolean) => {
    setManualValueOverrides((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  };

  const setManualEndTimeOverride = (index: number, value: boolean) => {
    setManualEndTimeOverrides((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  };

  useEffect(() => {
    if (open) {
      return;
    }

    setPendingAddressClient(null);
    lastLookedUpServicePostalCodeRef.current = null;
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextItems = budget?.items?.length
      ? budget.items
        .slice()
        .sort((left, right) => left.position - right.position)
        .map((item) => {
          const serviceType = serviceTypesById.get(item.serviceTypeId) ?? null;
          const normalizedInitialValue = isLegacyHourlyBaseValue(serviceType, item.initialValue)
            ? calculateBudgetItemInitialValue(serviceType)
            : item.initialValue;

          return {
            serviceTypeId: item.serviceTypeId,
            equipmentId: item.equipmentId,
            operatorId: item.operatorId,
            serviceDescription: item.serviceDescription,
            serviceDate: item.serviceDate,
            startTime: item.startTime,
            endTime: item.endTime,
            initialValue: normalizedInitialValue,
          };
        })
      : [createEmptyItem()];

    form.reset({
      clientId: budget?.clientId ?? "",
      servicePostalCode: formatPostalCode(budget?.servicePostalCode ?? ""),
      serviceStreet: budget?.serviceStreet ?? "",
      serviceNumber: budget?.serviceNumber ?? "",
      serviceComplement: budget?.serviceComplement ?? "",
      serviceDistrict: budget?.serviceDistrict ?? "",
      serviceCity: budget?.serviceCity ?? "",
      serviceState: budget?.serviceState ?? "",
      serviceCountry: budget?.serviceCountry ?? "Brasil",
      manualAdjustment: budget?.manualAdjustment ?? 0,
      notes: budget?.notes ?? "",
      items: nextItems,
    });

    const selectedBudgetClient = budget?.clientId ? clientsById.get(budget.clientId) ?? null : null;
    const sameAddressAsClient = isSameAddressAsClient(selectedBudgetClient, {
      postalCode: budget?.servicePostalCode,
      street: budget?.serviceStreet,
      number: budget?.serviceNumber,
      complement: budget?.serviceComplement,
      district: budget?.serviceDistrict,
      city: budget?.serviceCity,
      state: budget?.serviceState,
      country: budget?.serviceCountry,
    });
    const initialAddressMode: ServiceAddressMode = budget
      ? sameAddressAsClient ? "inherit" : "manual"
      : "inherit";

    setServiceAddressMode(initialAddressMode);
    setPendingAddressClient(null);
    lastLookedUpServicePostalCodeRef.current =
      initialAddressMode === "manual" ? normalizePostalCode(budget?.servicePostalCode) || null : null;

    setManualValueOverrides(
      nextItems.map((item) => {
        const serviceType = serviceTypesById.get(item.serviceTypeId) ?? null;
        const suggestedValue = calculateBudgetItemInitialValue(serviceType);
        return serviceType ? Number(item.initialValue) !== suggestedValue : false;
      }),
    );

    setManualEndTimeOverrides(
      nextItems.map((item) => {
        const serviceType = serviceTypesById.get(item.serviceTypeId) ?? null;
        const suggestedEndTime = calculateBudgetItemSuggestedEndTime(serviceType, item.startTime);
        return Boolean(item.endTime && suggestedEndTime && item.endTime !== suggestedEndTime);
      }),
    );
  }, [budget, clientsById, form, open, serviceTypesById]);

  useEffect(() => {
    if (manualValueOverrides.length === fields.length && manualEndTimeOverrides.length === fields.length) {
      return;
    }

    setManualValueOverrides((current) => Array.from({ length: fields.length }, (_, index) => current[index] ?? false));
    setManualEndTimeOverrides((current) => Array.from({ length: fields.length }, (_, index) => current[index] ?? false));
  }, [fields.length, manualEndTimeOverrides.length, manualValueOverrides.length]);

  useEffect(() => {
    if (!open) {
      return;
    }

    watchedItems.forEach((item, index) => {
      const serviceType = serviceTypesById.get(item?.serviceTypeId ?? "") ?? null;
      const valuePath = `items.${index}.initialValue` as const;
      const endTimePath = `items.${index}.endTime` as const;

      if (serviceType && !manualValueOverrides[index]) {
        const suggestedValue = calculateBudgetItemInitialValue(serviceType);

        if (suggestedValue > 0 && Number(item?.initialValue || 0) !== suggestedValue) {
          form.setValue(valuePath, suggestedValue, {
            shouldDirty: false,
            shouldValidate: true,
          });
        }
      }

      if (!serviceType || serviceType.billingUnit !== "hour" || !serviceType.minimumHours || !item?.startTime) {
        form.clearErrors(endTimePath);
        return;
      }

      const suggestedEndTime = addDurationToTime(item.startTime, serviceType.minimumHours);

      if (!suggestedEndTime) {
        form.setError(endTimePath, {
          type: "manual",
          message: t("budgets.endTimeOverflow"),
        });
        return;
      }

      form.clearErrors(endTimePath);

      if (!manualEndTimeOverrides[index] && item.endTime !== suggestedEndTime) {
        form.setValue(endTimePath, suggestedEndTime, {
          shouldDirty: false,
          shouldValidate: true,
        });
      }
    });
  }, [form, manualEndTimeOverrides, manualValueOverrides, open, serviceTypesById, t, watchedItems]);

  useEffect(() => {
    if (!open || serviceAddressMode !== "manual") {
      return;
    }

    const postalCode = normalizePostalCode(watchedServicePostalCode);

    if (postalCode.length !== 8 || postalCode === lastLookedUpServicePostalCodeRef.current) {
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
    const toastId = toast.loading(t("budgets.postalCodeLookupLoading"));

    lastLookedUpServicePostalCodeRef.current = postalCode;
    form.clearErrors("servicePostalCode");

    void (async () => {
      try {
        const payload = await parseResponse<PostalCodeLookupResponse>(
          await fetch(`/api/budgets/postal-code?postalCode=${postalCode}`, {
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
        toast.success(t("budgets.postalCodeLookupSuccess"), { id: toastId });
      } catch (lookupError) {
        if (cancelled) {
          return;
        }

        if (lookupError instanceof Error && lookupError.name === "AbortError" && !timedOut) {
          return;
        }

        lastLookedUpServicePostalCodeRef.current = null;
        const message = timedOut
          ? t("budgets.postalCodeLookupError")
          : lookupError instanceof Error ? lookupError.message : t("budgets.postalCodeLookupError");
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
  }, [form, open, serviceAddressMode, t, watchedServicePostalCode]);

  async function handleSubmit(values: CreateBudgetInput | UpdateBudgetInput) {
    await onSubmit(values);
    form.reset({
      clientId: "",
      servicePostalCode: "",
      serviceStreet: "",
      serviceNumber: "",
      serviceComplement: "",
      serviceDistrict: "",
      serviceCity: "",
      serviceState: "",
      serviceCountry: "Brasil",
      manualAdjustment: 0,
      notes: "",
      items: [createEmptyItem()],
    });
    setManualValueOverrides([false]);
    setManualEndTimeOverrides([false]);
    setPendingAddressClient(null);
    setServiceAddressMode("inherit");
    lastLookedUpServicePostalCodeRef.current = null;
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!isEdit ? (
        <DialogTrigger asChild>
          <Button className="cursor-pointer">
            <Plus className="mr-2 h-4 w-4" />
            {t("budgets.addBudget")}
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-hidden p-0 sm:max-w-6xl">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)}
            className={`flex max-h-[calc(100vh-2rem)] flex-col [&_[aria-invalid=true]]:border-input [&_[aria-invalid=true]]:ring-0 ${formClassName}`}
          >
            <div className="shrink-0 border-b px-6 py-5">
              <DialogHeader className="gap-3">
                <div className="flex flex-wrap items-center gap-3 pr-10">
                  <DialogTitle>{isEdit ? t("budgets.editBudget") : t("budgets.createBudget")}</DialogTitle>
                  <Badge variant="secondary" className={getStatusBadgeClass(budget?.status ?? "pending")}>
                    {t(`budgets.statusOptions.${budget?.status ?? "pending"}`)}
                  </Badge>
                </div>
                <DialogDescription>{t("budgets.createDescription")}</DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
                <section className="space-y-4 rounded-xl border bg-card p-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">{t("budgets.planningSectionTitle")}</h3>
                    <p className="text-sm text-muted-foreground">{t("budgets.planningSectionDescription")}</p>
                  </div>

                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("budgets.client")}</FormLabel>
                        <FormControl>
                          <SearchableCombobox
                            value={field.value}
                            onChange={(value) => {
                              if (value === field.value) {
                                return;
                              }

                              field.onChange(value);
                              const client = clientsById.get(value);

                              if (client) {
                                setPendingAddressClient(client);
                              }
                            }}
                            options={clientOptions}
                            placeholder={t("budgets.selectClient")}
                            searchPlaceholder={t("budgets.searchClientPlaceholder")}
                            emptyMessage={t("budgets.noClientFound")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </section>

                <section className="space-y-4 rounded-xl border bg-card p-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">{t("budgets.locationSectionTitle")}</h3>
                    <p className="text-sm text-muted-foreground">{t("budgets.locationSectionDescription")}</p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_120px]">
                    <FormField
                      control={form.control}
                      name="servicePostalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("budgets.servicePostalCode")}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="00000-000"
                              {...field}
                              value={field.value ?? ""}
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

                    <FormField
                      control={form.control}
                      name="serviceStreet"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("budgets.serviceStreet")}</FormLabel>
                          <FormControl>
                            <Input placeholder={t("budgets.serviceStreetPlaceholder")} {...field} />
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
                          <FormLabel>{t("budgets.serviceNumber")}</FormLabel>
                          <FormControl>
                            <Input placeholder="123" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <FormField
                      control={form.control}
                      name="serviceComplement"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t("budgets.serviceComplement")}{" "}
                            <span className="text-muted-foreground">({t("budgets.optionalField")})</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              placeholder={t("budgets.optionalField")}
                            />
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
                          <FormLabel>{t("budgets.serviceDistrict")}</FormLabel>
                          <FormControl>
                            <Input placeholder={t("budgets.serviceDistrictPlaceholder")} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-[minmax(180px,1fr)_96px]">
                    <FormField
                      control={form.control}
                      name="serviceCity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("budgets.serviceCity")}</FormLabel>
                          <FormControl>
                            <Input placeholder={t("budgets.serviceCityPlaceholder")} {...field} />
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
                          <FormLabel>{t("budgets.serviceState")}</FormLabel>
                          <FormControl>
                            <Input placeholder="SP" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </section>
              </div>

              <section className="space-y-4 rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">{t("budgets.itemsSectionTitle")}</h3>
                    <p className="text-sm text-muted-foreground">{t("budgets.itemsSectionDescription")}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => {
                      append(createEmptyItem());
                      setManualValueOverrides((current) => [...current, false]);
                      setManualEndTimeOverrides((current) => [...current, false]);
                    }}
                  >
                    <Plus className="mr-2 size-4" />
                    {t("budgets.addServiceItem")}
                  </Button>
                </div>

                <div className="space-y-4">
                  {fields.map((field, index) => {
                    const item = watchedItems[index];
                    const selectedServiceType = serviceTypesById.get(item?.serviceTypeId ?? "") ?? null;
                    const equipmentOptions =
                      selectedServiceType?.equipmentIds.length
                        ? equipment.filter((equipmentItem) => selectedServiceType.equipmentIds.includes(equipmentItem.id))
                        : equipment;
                    const serviceTypeCaption = buildServiceTypeCaption(selectedServiceType, locale, t);

                    return (
                      <div key={field.id} className="rounded-xl border bg-muted/10 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-semibold">
                                {t("budgets.serviceItemTitle", { index: index + 1 })}
                              </h4>
                              {selectedServiceType ? (
                                <Badge variant="outline" className="rounded-full px-2 py-0.5 text-xs">
                                  {selectedServiceType.name}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {serviceTypeCaption || t("budgets.serviceItemPlaceholderCaption")}
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
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
                                setManualValueOverrides((current) => {
                                  const next = [...current];
                                  [next[index - 1], next[index]] = [next[index], next[index - 1]];
                                  return next;
                                });
                                setManualEndTimeOverrides((current) => {
                                  const next = [...current];
                                  [next[index - 1], next[index]] = [next[index], next[index - 1]];
                                  return next;
                                });
                              }}
                              disabled={index === 0 || isSubmitting}
                            >
                              <ArrowUp className="size-4" />
                              <span className="sr-only">{t("budgets.moveServiceUp")}</span>
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
                                setManualValueOverrides((current) => {
                                  const next = [...current];
                                  [next[index], next[index + 1]] = [next[index + 1], next[index]];
                                  return next;
                                });
                                setManualEndTimeOverrides((current) => {
                                  const next = [...current];
                                  [next[index], next[index + 1]] = [next[index + 1], next[index]];
                                  return next;
                                });
                              }}
                              disabled={index === fields.length - 1 || isSubmitting}
                            >
                              <ArrowDown className="size-4" />
                              <span className="sr-only">{t("budgets.moveServiceDown")}</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="cursor-pointer text-destructive hover:text-destructive"
                              onClick={() => {
                                if (fields.length === 1) {
                                  return;
                                }

                                remove(index);
                                setManualValueOverrides((current) => current.filter((_, currentIndex) => currentIndex !== index));
                                setManualEndTimeOverrides((current) => current.filter((_, currentIndex) => currentIndex !== index));
                              }}
                              disabled={fields.length === 1 || isSubmitting}
                            >
                              <Trash2 className="size-4" />
                              <span className="sr-only">{t("budgets.removeServiceItem")}</span>
                            </Button>
                          </div>
                        </div>

                        <div className="mt-4 space-y-4">
                          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
                            <FormField
                              control={form.control}
                              name={`items.${index}.serviceTypeId`}
                              render={({ field: itemField }) => (
                                <FormItem>
                                  <FormLabel>{t("budgets.serviceType")}</FormLabel>
                                  <Select
                                    onValueChange={(value) => {
                                      itemField.onChange(value);
                                      const serviceType = serviceTypesById.get(value) ?? null;
                                      const equipmentPath = `items.${index}.equipmentId` as const;
                                      const initialValuePath = `items.${index}.initialValue` as const;
                                      const endTimePath = `items.${index}.endTime` as const;
                                      const currentEquipmentId = form.getValues(equipmentPath);

                                      setManualValueOverride(index, false);
                                      setManualEndTimeOverride(index, false);

                                      if (
                                        serviceType?.equipmentIds.length &&
                                        currentEquipmentId &&
                                        !serviceType.equipmentIds.includes(currentEquipmentId)
                                      ) {
                                        form.setValue(equipmentPath, "", { shouldDirty: true, shouldValidate: true });
                                      }

                                      if (serviceType) {
                                        form.setValue(initialValuePath, calculateBudgetItemInitialValue(serviceType), {
                                          shouldDirty: true,
                                          shouldValidate: true,
                                        });

                                        const currentStartTime = form.getValues(`items.${index}.startTime` as const);
                                        const suggestedEndTime = calculateBudgetItemSuggestedEndTime(serviceType, currentStartTime);

                                        if (suggestedEndTime) {
                                          form.setValue(endTimePath, suggestedEndTime, {
                                            shouldDirty: false,
                                            shouldValidate: true,
                                          });
                                        }
                                      }
                                    }}
                                    value={itemField.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="w-full cursor-pointer">
                                        <SelectValue placeholder={t("budgets.selectServiceType")} />
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
                                  <FormLabel>{t("budgets.equipment")}</FormLabel>
                                  <Select onValueChange={itemField.onChange} value={itemField.value}>
                                    <FormControl>
                                      <SelectTrigger className="w-full cursor-pointer">
                                        <SelectValue placeholder={t("budgets.selectEquipment")} />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {equipmentOptions.map((equipmentItem) => (
                                        <SelectItem key={equipmentItem.id} value={equipmentItem.id}>
                                          {equipmentItem.name} • {equipmentItem.brand} • {equipmentItem.model}
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
                                  <FormLabel>{t("budgets.operator")}</FormLabel>
                                  <Select onValueChange={itemField.onChange} value={itemField.value}>
                                    <FormControl>
                                      <SelectTrigger className="w-full cursor-pointer">
                                        <SelectValue placeholder={t("budgets.selectOperator")} />
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

                            <FormField
                              control={form.control}
                              name={`items.${index}.serviceDate`}
                              render={({ field: itemField }) => (
                                <FormItem>
                                  <FormLabel>{t("budgets.serviceDate")}</FormLabel>
                                  <FormControl>
                                    <DatePickerInput
                                      value={parseDateString(itemField.value)}
                                      onChange={(date) => itemField.onChange(formatDateString(date))}
                                      placeholder={t("budgets.selectDate")}
                                    />
                                  </FormControl>
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
                                <FormLabel>{t("budgets.serviceDescription")}</FormLabel>
                                <FormControl>
                                  <Input
                                    {...itemField}
                                    value={itemField.value ?? ""}
                                    placeholder={t("budgets.serviceDescriptionPlaceholder")}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid gap-3 lg:grid-cols-3">
                            <FormField
                              control={form.control}
                              name={`items.${index}.startTime`}
                              render={({ field: itemField }) => (
                                <FormItem>
                                  <FormLabel>{t("budgets.startTime")}</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="time"
                                      {...itemField}
                                      onChange={(event) => {
                                        itemField.onChange(event);
                                        setManualEndTimeOverride(index, false);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`items.${index}.endTime`}
                              render={({ field: itemField }) => (
                                <FormItem>
                                  <FormLabel>{t("budgets.endTime")}</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="time"
                                      {...itemField}
                                      onChange={(event) => {
                                        itemField.onChange(event);
                                        setManualEndTimeOverride(index, true);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`items.${index}.initialValue`}
                              render={({ field: itemField }) => (
                                <FormItem>
                                  <FormLabel>{t("budgets.initialValue")}</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      inputMode="decimal"
                                      placeholder="0,00"
                                      {...itemField}
                                      value={itemField.value === 0 ? "" : itemField.value ?? ""}
                                      onChange={(event) => {
                                        itemField.onChange(event);
                                        setManualValueOverride(index, true);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <div className="grid gap-4 xl:grid-cols-[minmax(340px,0.95fr)_minmax(0,1.05fr)]">
                <section className="space-y-3 rounded-xl border bg-card p-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">{t("budgets.totalsSectionTitle")}</h3>
                    <p className="text-xs text-muted-foreground">{t("budgets.totalsSectionDescription")}</p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px_minmax(0,1fr)]">
                    <div className="rounded-lg border bg-muted/10 p-3">
                      <div className="text-xs font-medium text-muted-foreground">{t("budgets.subtotalValue")}</div>
                      <div className="mt-1 text-lg font-semibold">{formatMoney(subtotalValue, locale)}</div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("budgets.itemsCountSummary", { count: fields.length })}
                      </p>
                    </div>

                    <FormField
                      control={form.control}
                      name="manualAdjustment"
                      render={({ field }) => (
                        <FormItem className="rounded-lg border bg-background p-3">
                          <FormLabel>{t("budgets.manualAdjustment")}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              inputMode="decimal"
                              placeholder="0,00"
                              {...field}
                              value={field.value ?? 0}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">{t("budgets.manualAdjustmentDescription")}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div
                      className={cn(
                        "rounded-lg border p-3",
                        totalValue > 0 ? "border-primary/20 bg-primary/5" : "border-destructive/20 bg-destructive/5",
                      )}
                    >
                      <div className="text-xs font-medium text-muted-foreground">{t("budgets.totalValue")}</div>
                      <div className="mt-1 text-lg font-semibold">{formatMoney(totalValue, locale)}</div>
                    </div>
                  </div>
                </section>

                <section className="space-y-3 rounded-xl border bg-card p-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">{t("budgets.notesSectionTitle")}</h3>
                    <p className="text-xs text-muted-foreground">{t("budgets.notesSectionDescription")}</p>
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={field.value ?? ""}
                            placeholder={t("budgets.notesPlaceholder")}
                            className="min-h-[88px] resize-y"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </section>
              </div>
            </div>

            <DialogFooter className="shrink-0 border-t bg-background px-6 py-4">
              <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
                {isSubmitting ? t("common.loading") : isEdit ? t("common.saveChanges") : t("budgets.createBudget")}
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
            <DialogTitle>{t("budgets.clientAddressConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("budgets.clientAddressConfirmDescription", {
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
              {t("budgets.clientAddressConfirmNo")}
            </Button>
            <Button
              type="button"
              className="cursor-pointer"
              onClick={() => handleClientAddressDecision(true)}
            >
              {t("budgets.clientAddressConfirmYes")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
