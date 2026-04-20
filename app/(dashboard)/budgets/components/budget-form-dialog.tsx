"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
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
  calculateBudgetItemInitialValue,
  calculateBudgetItemSuggestedEndTime,
  calculateBudgetSubtotal,
  calculateBudgetTotal,
  createBudgetSchema,
  isLegacyHourlyBaseValue,
  budgetServiceItemSchema,
  type BudgetServiceItemInput,
  type CreateBudgetInput,
  type ManagedBudget,
  type UpdateBudgetInput,
  updateBudgetSchema,
} from "@/lib/budgets-admin";
import type { ManagedClient, PostalCodeLookupResult } from "@/lib/clients-admin";
import type { EquipmentOption } from "@/lib/equipment-admin";
import type { ManagedOperator } from "@/lib/operators-admin";
import { getTodayDateKey } from "@/lib/service-date";
import type { ManagedServiceType } from "@/lib/service-types-admin";
import { getSemanticStatusBadgeClass } from "@/lib/status-badge";
import { useFormValidationToast } from "@/hooks/use-form-validation-toast";
import { useI18n, useLocale } from "@/i18n/provider";
import { cn, formatPostalCode } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
type ItemDraftErrors = Partial<Record<keyof BudgetServiceItemInput, string>>;

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

  const baseValue = formatMoney(serviceType.baseValue ?? 0, locale);

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
  const [itemDraft, setItemDraft] = useState<BudgetServiceItemInput>(createEmptyItem());
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [itemDraftErrors, setItemDraftErrors] = useState<ItemDraftErrors>({});
  const [isDraftValueManual, setIsDraftValueManual] = useState(false);
  const [isDraftEndTimeManual, setIsDraftEndTimeManual] = useState(false);
  const [pendingAddressClient, setPendingAddressClient] = useState<ManagedClient | null>(null);
  const [isServiceAddressDialogOpen, setIsServiceAddressDialogOpen] = useState(false);
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
      items: [],
    },
  });
  const { formClassName, handleInvalidSubmit } = useFormValidationToast({
    form,
    title: t("budgets.validationToastTitle"),
    fallback: t("budgets.validationToastFallback"),
  });

  const { fields, append, move, remove, update } = useFieldArray({
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
  const watchedServiceStreet = useWatch({
    control: form.control,
    name: "serviceStreet",
  });
  const watchedServiceNumber = useWatch({
    control: form.control,
    name: "serviceNumber",
  });
  const watchedServiceComplement = useWatch({
    control: form.control,
    name: "serviceComplement",
  });
  const watchedServiceDistrict = useWatch({
    control: form.control,
    name: "serviceDistrict",
  });
  const watchedServiceCity = useWatch({
    control: form.control,
    name: "serviceCity",
  });
  const watchedServiceState = useWatch({
    control: form.control,
    name: "serviceState",
  });
  const watchedServiceCountry = useWatch({
    control: form.control,
    name: "serviceCountry",
  });
  const watchedClientId = useWatch({
    control: form.control,
    name: "clientId",
  });

  const serviceTypesById = useMemo(
    () => new Map(serviceTypes.map((item) => [item.id, item])),
    [serviceTypes],
  );
  const minServiceDate = useMemo(() => parseDateString(getTodayDateKey()), []);

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
  const equipmentById = useMemo(
    () => new Map(equipment.map((equipmentItem) => [equipmentItem.id, equipmentItem])),
    [equipment],
  );
  const operatorsById = useMemo(
    () => new Map(operators.map((operator) => [operator.id, operator])),
    [operators],
  );
  const selectedDraftServiceType = useMemo(
    () => serviceTypesById.get(itemDraft.serviceTypeId) ?? null,
    [itemDraft.serviceTypeId, serviceTypesById],
  );
  const draftEquipmentOptions = useMemo(
    () => (
      selectedDraftServiceType?.equipmentIds.length
        ? equipment.filter((equipmentItem) => selectedDraftServiceType.equipmentIds.includes(equipmentItem.id))
        : equipment
    ),
    [equipment, selectedDraftServiceType],
  );

  const clearItemDraftFieldError = (fieldName: keyof BudgetServiceItemInput) => {
    setItemDraftErrors((current) => {
      if (!current[fieldName]) {
        return current;
      }

      const next = { ...current };
      delete next[fieldName];
      return next;
    });
  };

  const updateItemDraftField = <K extends keyof BudgetServiceItemInput>(
    fieldName: K,
    value: BudgetServiceItemInput[K],
  ) => {
    setItemDraft((current) => ({ ...current, [fieldName]: value }));
    clearItemDraftFieldError(fieldName);
  };

  const resetItemDraft = () => {
    setItemDraft(createEmptyItem());
    setEditingItemIndex(null);
    setItemDraftErrors({});
    setIsDraftValueManual(false);
    setIsDraftEndTimeManual(false);
  };

  const validateItemDraft = () => {
    const parsed = budgetServiceItemSchema.safeParse(itemDraft);

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

      if (nextErrors[fieldName as keyof BudgetServiceItemInput]) {
        return;
      }

      nextErrors[fieldName as keyof BudgetServiceItemInput] = issue.message;
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

    const serviceType = serviceTypesById.get(item.serviceTypeId) ?? null;
    const suggestedValue = calculateBudgetItemInitialValue(serviceType);
    const suggestedEndTime = calculateBudgetItemSuggestedEndTime(serviceType, item.startTime);

    setItemDraft({
      serviceTypeId: item.serviceTypeId,
      equipmentId: item.equipmentId,
      operatorId: item.operatorId,
      serviceDescription: item.serviceDescription,
      serviceDate: item.serviceDate,
      startTime: item.startTime,
      endTime: item.endTime,
      initialValue: Number(item.initialValue || 0),
    });
    setEditingItemIndex(index);
    setItemDraftErrors({});
    setIsDraftValueManual(Boolean(serviceType && Number(item.initialValue) !== suggestedValue));
    setIsDraftEndTimeManual(Boolean(item.endTime && suggestedEndTime && item.endTime !== suggestedEndTime));
  };

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
    form.clearErrors([
      "servicePostalCode",
      "serviceStreet",
      "serviceNumber",
      "serviceDistrict",
      "serviceCity",
      "serviceState",
      "serviceCountry",
    ]);
    form.setValue("servicePostalCode", "", {
      shouldDirty: true,
      shouldValidate: false,
    });
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
    errors: FieldErrors<CreateBudgetInput | UpdateBudgetInput>,
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
    setIsServiceAddressDialogOpen(false);
    lastLookedUpServicePostalCodeRef.current = null;
    setItemDraft(createEmptyItem());
    setEditingItemIndex(null);
    setItemDraftErrors({});
    setIsDraftValueManual(false);
    setIsDraftEndTimeManual(false);
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
      : [];

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
    setIsServiceAddressDialogOpen(false);
    lastLookedUpServicePostalCodeRef.current =
      initialAddressMode === "manual" ? normalizePostalCode(budget?.servicePostalCode) || null : null;

    setItemDraft(createEmptyItem());
    setEditingItemIndex(null);
    setItemDraftErrors({});
    setIsDraftValueManual(false);
    setIsDraftEndTimeManual(false);
  }, [budget, clientsById, form, open, serviceTypesById]);

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

  useEffect(() => {
    const serviceType = serviceTypesById.get(itemDraft.serviceTypeId) ?? null;

    if (!serviceType) {
      return;
    }

    if (!isDraftValueManual) {
      const suggestedValue = calculateBudgetItemInitialValue(serviceType);

      if (suggestedValue > 0 && Number(itemDraft.initialValue || 0) !== suggestedValue) {
        setItemDraft((current) => ({ ...current, initialValue: suggestedValue }));
      }
    }

    if (!isDraftEndTimeManual) {
      const suggestedEndTime = calculateBudgetItemSuggestedEndTime(serviceType, itemDraft.startTime);

      if (suggestedEndTime && itemDraft.endTime !== suggestedEndTime) {
        setItemDraft((current) => ({ ...current, endTime: suggestedEndTime }));
      }
    }

    if (
      serviceType.equipmentIds.length
      && itemDraft.equipmentId
      && !serviceType.equipmentIds.includes(itemDraft.equipmentId)
    ) {
      setItemDraft((current) => ({ ...current, equipmentId: "" }));
    }
  }, [
    isDraftEndTimeManual,
    isDraftValueManual,
    itemDraft.equipmentId,
    itemDraft.endTime,
    itemDraft.initialValue,
    itemDraft.serviceTypeId,
    itemDraft.startTime,
    serviceTypesById,
  ]);

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
      items: [],
    });
    setItemDraft(createEmptyItem());
    setEditingItemIndex(null);
    setItemDraftErrors({});
    setIsDraftValueManual(false);
    setIsDraftEndTimeManual(false);
    setPendingAddressClient(null);
    setServiceAddressMode("inherit");
    setIsServiceAddressDialogOpen(false);
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
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-hidden p-0 sm:max-w-6xl">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmitWithAddress)}
            className={`flex max-h-[calc(100svh-2rem)] flex-col overflow-hidden [&_[aria-invalid=true]]:border-input [&_[aria-invalid=true]]:ring-0 ${formClassName}`}
          >
            <div className="shrink-0 border-b px-6 py-5">
              <DialogHeader className="gap-3">
                <div className="flex flex-wrap items-center gap-3 pr-10">
                  <DialogTitle>{isEdit ? t("budgets.editBudget") : t("budgets.createBudget")}</DialogTitle>
                  <Badge variant="secondary" className={getStatusBadgeClass(budget?.status ?? "pending")}>
                    {t(`budgets.statusOptions.${budget?.status ?? "pending"}`)}
                  </Badge>
                </div>
              </DialogHeader>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
              {pendingAddressClient ? (
                <section className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">{t("budgets.clientAddressConfirmTitle")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("budgets.clientAddressConfirmDescription", {
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
                      {t("budgets.clientAddressConfirmNo")}
                    </Button>
                    <Button
                      type="button"
                      className="cursor-pointer"
                      onClick={() => handleClientAddressDecision(true)}
                    >
                      {t("budgets.clientAddressConfirmYes")}
                    </Button>
                  </div>
                </section>
              ) : null}

              {isServiceAddressDialogOpen ? (
                <section className="space-y-4 rounded-xl border bg-card p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold">{t("budgets.serviceAddressModalTitle")}</h3>
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

                  <div className="grid gap-3 md:grid-cols-[minmax(180px,1fr)_96px_minmax(120px,1fr)]">
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

                    <FormField
                      control={form.control}
                      name="serviceCountry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("budgets.serviceCountry")}</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ""} />
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
                      {t("budgets.saveServiceAddress")}
                    </Button>
                  </div>
                </section>
              ) : null}

              <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
                <section className="space-y-4 rounded-xl border bg-card p-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">{t("budgets.planningSectionTitle")}</h3>
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
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        {serviceAddressMode === "inherit"
                          ? t("budgets.addressSummaryInherited")
                          : t("budgets.addressSummaryManual")}
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
                        }) || t("budgets.addressSummaryEmpty")}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="cursor-pointer"
                      onClick={openManualAddressDialog}
                    >
                      {watchedServiceStreet ? t("budgets.editServiceAddress") : t("budgets.defineServiceAddress")}
                    </Button>
                  </div>
                </section>
              </div>

              <section className="space-y-4 rounded-xl border bg-card p-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">{t("budgets.itemsSectionTitle")}</h3>
                </div>

                <div className="space-y-4 rounded-xl border bg-muted/10 p-4">
                  <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2">
                      <FormLabel>{t("budgets.serviceType")}</FormLabel>
                      <Select
                        value={itemDraft.serviceTypeId}
                        onValueChange={(value) => {
                          updateItemDraftField("serviceTypeId", value);
                          setIsDraftValueManual(false);
                          setIsDraftEndTimeManual(false);
                        }}
                      >
                        <SelectTrigger className="w-full cursor-pointer">
                          <SelectValue placeholder={t("budgets.selectServiceType")} />
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
                      {selectedDraftServiceType ? (
                        <p className="text-xs text-muted-foreground">{buildServiceTypeCaption(selectedDraftServiceType, locale, t)}</p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <FormLabel>{t("budgets.equipment")}</FormLabel>
                      <Select
                        value={itemDraft.equipmentId}
                        onValueChange={(value) => updateItemDraftField("equipmentId", value)}
                      >
                        <SelectTrigger className="w-full cursor-pointer">
                          <SelectValue placeholder={t("budgets.selectEquipment")} />
                        </SelectTrigger>
                        <SelectContent>
                          {draftEquipmentOptions.map((equipmentItem) => (
                            <SelectItem key={equipmentItem.id} value={equipmentItem.id}>
                              {equipmentItem.name} • {equipmentItem.brand} • {equipmentItem.model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {itemDraftErrors.equipmentId ? <p className="text-sm text-destructive">{itemDraftErrors.equipmentId}</p> : null}
                    </div>

                    <div className="space-y-2">
                      <FormLabel>{t("budgets.operator")}</FormLabel>
                      <Select
                        value={itemDraft.operatorId}
                        onValueChange={(value) => updateItemDraftField("operatorId", value)}
                      >
                        <SelectTrigger className="w-full cursor-pointer">
                          <SelectValue placeholder={t("budgets.selectOperator")} />
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

                    <div className="space-y-2">
                      <FormLabel>{t("budgets.serviceDate")}</FormLabel>
                      <DatePickerInput
                        value={parseDateString(itemDraft.serviceDate)}
                        onChange={(date) => updateItemDraftField("serviceDate", formatDateString(date))}
                        placeholder={t("budgets.selectDate")}
                        disabledDays={minServiceDate ? { before: minServiceDate } : undefined}
                      />
                      {itemDraftErrors.serviceDate ? <p className="text-sm text-destructive">{itemDraftErrors.serviceDate}</p> : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <FormLabel>{t("budgets.serviceDescription")}</FormLabel>
                    <Input
                      value={itemDraft.serviceDescription}
                      onChange={(event) => updateItemDraftField("serviceDescription", event.target.value)}
                      placeholder={t("budgets.serviceDescriptionPlaceholder")}
                    />
                    {itemDraftErrors.serviceDescription ? <p className="text-sm text-destructive">{itemDraftErrors.serviceDescription}</p> : null}
                  </div>

                  <div className="grid gap-3 lg:grid-cols-3">
                    <div className="space-y-2">
                      <FormLabel>{t("budgets.startTime")}</FormLabel>
                      <Input
                        type="time"
                        value={itemDraft.startTime}
                        onChange={(event) => {
                          updateItemDraftField("startTime", event.target.value);
                          setIsDraftEndTimeManual(false);
                        }}
                      />
                      {itemDraftErrors.startTime ? <p className="text-sm text-destructive">{itemDraftErrors.startTime}</p> : null}
                    </div>

                    <div className="space-y-2">
                      <FormLabel>{t("budgets.endTime")}</FormLabel>
                      <Input
                        type="time"
                        value={itemDraft.endTime}
                        onChange={(event) => {
                          updateItemDraftField("endTime", event.target.value);
                          setIsDraftEndTimeManual(true);
                        }}
                      />
                      {itemDraftErrors.endTime ? <p className="text-sm text-destructive">{itemDraftErrors.endTime}</p> : null}
                    </div>

                    <div className="space-y-2">
                      <FormLabel>{t("budgets.initialValue")}</FormLabel>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={itemDraft.initialValue === 0 ? "" : itemDraft.initialValue}
                        onChange={(event) => {
                          const value = event.target.value;
                          updateItemDraftField("initialValue", value ? Number(value) : 0);
                          setIsDraftValueManual(Boolean(value));
                        }}
                      />
                      {itemDraftErrors.initialValue ? <p className="text-sm text-destructive">{itemDraftErrors.initialValue}</p> : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" className="cursor-pointer" onClick={handleSaveItemDraft} disabled={isSubmitting}>
                      <Plus className="mr-2 size-4" />
                      {editingItemIndex === null ? t("budgets.addServiceItem") : t("common.saveChanges")}
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

                <div className="rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>{t("budgets.serviceType")}</TableHead>
                        <TableHead>{t("budgets.serviceDescription")}</TableHead>
                        <TableHead>{t("budgets.serviceDate")}</TableHead>
                        <TableHead>{t("budgets.startTime")} / {t("budgets.endTime")}</TableHead>
                        <TableHead>{t("budgets.equipment")}</TableHead>
                        <TableHead>{t("budgets.operator")}</TableHead>
                        <TableHead>{t("budgets.initialValue")}</TableHead>
                        <TableHead>{t("budgets.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.length ? fields.map((field, index) => {
                        const item = watchedItems[index];
                        const serviceType = serviceTypesById.get(item?.serviceTypeId ?? "") ?? null;
                        const equipmentItem = equipmentById.get(item?.equipmentId ?? "");
                        const operator = operatorsById.get(item?.operatorId ?? "");

                        return (
                          <TableRow key={field.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{serviceType?.name ?? "-"}</TableCell>
                            <TableCell className="max-w-[280px] truncate normal-case">{item?.serviceDescription || "-"}</TableCell>
                            <TableCell>{item?.serviceDate || "-"}</TableCell>
                            <TableCell>{item?.startTime || "--:--"} - {item?.endTime || "--:--"}</TableCell>
                            <TableCell>{equipmentItem?.name ?? "-"}</TableCell>
                            <TableCell>{operator?.name ?? "-"}</TableCell>
                            <TableCell>{formatMoney(Number(item?.initialValue || 0), locale)}</TableCell>
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
                                  <span className="sr-only">{t("budgets.moveServiceDown")}</span>
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
                                      setIsDraftValueManual(false);
                                      setIsDraftEndTimeManual(false);
                                    } else {
                                      setEditingItemIndex((current) => (
                                        current !== null && current > index ? current - 1 : current
                                      ));
                                    }
                                  }}
                                  disabled={isSubmitting}
                                >
                                  <Trash2 className="size-4" />
                                  <span className="sr-only">{t("budgets.removeServiceItem")}</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      }) : (
                        <TableRow>
                          <TableCell colSpan={9} className="h-20 text-center normal-case text-muted-foreground">
                            {t("budgets.noItemsAdded")}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </section>

              <div className="grid gap-4 xl:grid-cols-[minmax(340px,0.95fr)_minmax(0,1.05fr)]">
                <section className="space-y-3 rounded-xl border bg-card p-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">{t("budgets.totalsSectionTitle")}</h3>
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

    </Dialog>
  );
}
