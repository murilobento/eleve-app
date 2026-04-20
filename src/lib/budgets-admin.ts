import { z } from "zod";

import { isDateBeforeToday } from "@/lib/service-date";
import type { ManagedServiceType } from "@/lib/service-types-admin";

export const budgetStatusSchema = z.enum(["pending", "approved", "cancelled"]);
export const budgetTransitionStatusSchema = z.enum(["approved", "cancelled", "pending"]);

const statusReasonSchema = z
  .string()
  .trim()
  .min(3, "Reason must be at least 3 characters.")
  .max(1000, "Reason must be at most 1000 characters.")
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const MAX_BUDGET_ITEMS = 50;

const relationIdSchema = (label: string) => z.string().uuid(`Select a valid ${label}.`);

const textFieldSchema = (label: string, max = 120) =>
  z
    .string()
    .trim()
    .min(2, `${label} must be at least 2 characters.`)
    .max(max, `${label} must be at most ${max} characters.`);

const optionalTextFieldSchema = (label: string, max = 2000) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters.`)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

const postalCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ""))
  .refine((value) => value.length === 8, "Enter a valid postal code.");

const serviceDateSchema = z
  .string()
  .trim()
  .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), "Select a valid service date.")
  .refine((value) => !isDateBeforeToday(value), "Service date cannot be earlier than today.");

const timeSchema = z
  .string()
  .trim()
  .refine((value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value), "Enter a valid time.");

const toNumberInput = (value: unknown) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    return value.replace(",", ".");
  }

  return value;
};

const positiveDecimalFieldSchema = (label: string) =>
  z.preprocess(
    toNumberInput,
    z.coerce
      .number({
        invalid_type_error: `${label} must be a number.`,
      })
      .positive(`${label} must be greater than zero.`)
      .max(1000000000, `${label} must be 1000000000 or less.`),
  );

const signedDecimalFieldSchema = (label: string) =>
  z.preprocess(
    toNumberInput,
    z.coerce
      .number({
        invalid_type_error: `${label} must be a number.`,
      })
      .min(-1000000000, `${label} must be -1000000000 or greater.`)
      .max(1000000000, `${label} must be 1000000000 or less.`),
  );

export function roundCurrencyValue(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

type ServiceTypePricingLike = Pick<ManagedServiceType, "billingUnit" | "baseValue" | "minimumHours">;

export function calculateBudgetItemInitialValue(serviceType?: ServiceTypePricingLike | null) {
  if (!serviceType) {
    return 0;
  }

  const baseValue = Number(serviceType.baseValue ?? 0);

  if (serviceType.billingUnit === "hour" && serviceType.minimumHours) {
    return roundCurrencyValue(baseValue * serviceType.minimumHours);
  }

  return roundCurrencyValue(baseValue);
}

export function isLegacyHourlyBaseValue(
  serviceType: ServiceTypePricingLike | null | undefined,
  currentValue: number | null | undefined,
) {
  if (
    !serviceType
    || serviceType.billingUnit !== "hour"
    || !serviceType.minimumHours
    || serviceType.minimumHours <= 1
    || currentValue === null
    || currentValue === undefined
  ) {
    return false;
  }

  return roundCurrencyValue(Number(currentValue)) === roundCurrencyValue(Number(serviceType.baseValue ?? 0));
}

export function addDurationToTime(startTime: string, durationHours?: number | null) {
  if (!startTime || !durationHours) {
    return null;
  }

  const [hours, minutes] = startTime.split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  const totalMinutes = (hours * 60) + minutes + Math.round(durationHours * 60);

  if (totalMinutes >= 24 * 60) {
    return null;
  }

  const nextHours = Math.floor(totalMinutes / 60);
  const nextMinutes = totalMinutes % 60;

  return `${nextHours.toString().padStart(2, "0")}:${nextMinutes.toString().padStart(2, "0")}`;
}

export function calculateBudgetItemSuggestedEndTime(
  serviceType?: Pick<ManagedServiceType, "billingUnit" | "minimumHours"> | null,
  startTime?: string,
) {
  if (!serviceType || serviceType.billingUnit !== "hour" || !serviceType.minimumHours || !startTime) {
    return null;
  }

  return addDurationToTime(startTime, serviceType.minimumHours);
}

export function calculateBudgetSubtotal(items: Array<{ initialValue: number }>) {
  return roundCurrencyValue(
    items.reduce((total, item) => total + Number(item.initialValue || 0), 0),
  );
}

export function calculateBudgetTotal(subtotalValue: number, manualAdjustment = 0) {
  return roundCurrencyValue(subtotalValue + Number(manualAdjustment || 0));
}

export const budgetServiceItemSchema = z.object({
  serviceTypeId: relationIdSchema("service type"),
  equipmentId: relationIdSchema("equipment"),
  operatorId: relationIdSchema("operator"),
  serviceDescription: textFieldSchema("Service description", 2000),
  serviceDate: serviceDateSchema,
  startTime: timeSchema,
  endTime: timeSchema,
  initialValue: positiveDecimalFieldSchema("Initial value"),
}).superRefine((value, ctx) => {
  if (value.endTime <= value.startTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endTime"],
      message: "End time must be later than start time.",
    });
  }
});

const baseBudgetSchema = z.object({
  clientId: relationIdSchema("client"),
  servicePostalCode: postalCodeSchema,
  serviceStreet: textFieldSchema("Street"),
  serviceNumber: z
    .string()
    .trim()
    .min(1, "Number is required.")
    .max(20, "Number must be at most 20 characters."),
  serviceComplement: optionalTextFieldSchema("Complement", 120),
  serviceDistrict: textFieldSchema("District"),
  serviceCity: textFieldSchema("City"),
  serviceState: textFieldSchema("State", 60),
  serviceCountry: z
    .string()
    .trim()
    .max(60, "Country must be at most 60 characters.")
    .transform((value) => value || "Brasil"),
  manualAdjustment: signedDecimalFieldSchema("Manual adjustment").default(0),
  notes: optionalTextFieldSchema("Notes"),
  items: z.array(budgetServiceItemSchema)
    .min(1, "Add at least one service item.")
    .max(MAX_BUDGET_ITEMS, `You can add up to ${MAX_BUDGET_ITEMS} service items.`),
}).superRefine((value, ctx) => {
  const subtotalValue = calculateBudgetSubtotal(value.items);
  const totalValue = calculateBudgetTotal(subtotalValue, value.manualAdjustment);

  if (totalValue <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["manualAdjustment"],
      message: "Budget total must be greater than zero.",
    });
  }
});

export const createBudgetSchema = baseBudgetSchema;
export const updateBudgetSchema = baseBudgetSchema;
export const updateBudgetStatusSchema = z.object({
  status: budgetTransitionStatusSchema,
  reason: statusReasonSchema,
}).superRefine((value, ctx) => {
  if (value.status === "pending" && !value.reason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["reason"],
      message: "Reason is required when reverting to pending.",
    });
  }
});

export type BudgetStatus = z.infer<typeof budgetStatusSchema>;
export type BudgetTransitionStatus = z.infer<typeof budgetTransitionStatusSchema>;
export type BudgetServiceItemInput = z.infer<typeof budgetServiceItemSchema>;
export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
export type UpdateBudgetStatusInput = z.infer<typeof updateBudgetStatusSchema>;

export type ManagedBudgetStatusHistory = {
  id: string;
  budgetId: string | null;
  budgetNumber: string;
  previousStatus: BudgetStatus | null;
  nextStatus: BudgetStatus;
  reason: string | null;
  actorUserId: string | null;
  actorNameSnapshot: string | null;
  actorEmailSnapshot: string | null;
  createdAt: string;
};

export type ManagedBudgetItem = {
  id: string;
  position: number;
  serviceTypeId: string;
  serviceTypeName: string;
  serviceTypeBillingUnit: string;
  equipmentId: string;
  equipmentName: string;
  equipmentBrand: string;
  equipmentModel: string;
  operatorId: string;
  operatorName: string;
  serviceDescription: string;
  serviceDate: string;
  startTime: string;
  endTime: string;
  baseValue: number;
  minimumHours: number | null;
  minimumKm: number | null;
  initialValue: number;
  createdAt: string;
  updatedAt: string;
};

export type ManagedBudget = {
  id: string;
  number: string;
  status: BudgetStatus;
  clientId: string;
  clientName: string;
  servicePostalCode: string;
  serviceStreet: string;
  serviceNumber: string;
  serviceComplement: string | null;
  serviceDistrict: string;
  serviceCity: string;
  serviceState: string;
  serviceCountry: string;
  subtotalValue: number;
  manualAdjustment: number;
  totalValue: number;
  itemCount: number;
  items: ManagedBudgetItem[];
  notes: string | null;
  approvedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};
