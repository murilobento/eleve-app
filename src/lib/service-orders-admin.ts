import { z } from "zod";

import { isDateBeforeToday } from "@/lib/service-date";

export const serviceOrderOriginSchema = z.enum(["manual", "budget"]);
export const serviceOrderStatusSchema = z.enum([
  "pending",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]);
export const serviceOrderTransitionStatusSchema = z.enum([
  "pending",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]);

const statusReasonSchema = z
  .string()
  .trim()
  .min(3, "Reason must be at least 3 characters.")
  .max(1000, "Reason must be at most 1000 characters.")
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const MAX_SERVICE_ORDER_ITEMS = 50;

const relationIdSchema = (label: string) => z.string().uuid(`Select a valid ${label}.`);

const optionalRelationIdSchema = (label: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined))
    .refine((value) => !value || z.uuid().safeParse(value).success, `Select a valid ${label}.`);

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
  .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), "Select a valid service date.");

const optionalTimeSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))
  .refine((value) => !value || /^([01]\d|2[0-3]):[0-5]\d$/.test(value), "Enter a valid time.");

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

const optionalDecimalFieldSchema = (label: string) =>
  z.preprocess(
    toNumberInput,
    z.coerce
      .number({
        invalid_type_error: `${label} must be a number.`,
      })
      .min(0, `${label} must be zero or greater.`)
      .max(1000000000, `${label} must be 1000000000 or less.`)
      .optional(),
  );

const serviceOrderItemSchema = z.object({
  sourceBudgetItemId: optionalRelationIdSchema("budget item"),
  serviceTypeId: relationIdSchema("service type"),
  equipmentId: relationIdSchema("equipment"),
  operatorId: relationIdSchema("operator"),
  serviceDescription: textFieldSchema("Service description", 2000),
  serviceDate: serviceDateSchema,
  plannedStartTime: timeSchema,
  plannedEndTime: timeSchema,
  actualStartTime: optionalTimeSchema,
  actualEndTime: optionalTimeSchema,
  quotedValue: optionalDecimalFieldSchema("Quoted value"),
  notes: optionalTextFieldSchema("Notes"),
}).superRefine((value, ctx) => {
  if (value.plannedEndTime <= value.plannedStartTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["plannedEndTime"],
      message: "Planned end time must be later than planned start time.",
    });
  }

  if (value.actualStartTime && value.actualEndTime && value.actualEndTime <= value.actualStartTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["actualEndTime"],
      message: "Actual end time must be later than actual start time.",
    });
  }
});

const baseServiceOrderSchema = z.object({
  originType: serviceOrderOriginSchema,
  sourceBudgetId: optionalRelationIdSchema("budget"),
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
  notes: optionalTextFieldSchema("Notes"),
  items: z.array(serviceOrderItemSchema)
    .min(1, "Add at least one service item.")
    .max(MAX_SERVICE_ORDER_ITEMS, `You can add up to ${MAX_SERVICE_ORDER_ITEMS} service items.`),
}).superRefine((value, ctx) => {
  if (value.originType === "budget" && !value.sourceBudgetId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["sourceBudgetId"],
      message: "Select an approved budget.",
    });
  }

  if (value.originType === "manual" && value.sourceBudgetId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["sourceBudgetId"],
      message: "Manual service orders cannot be linked to a budget.",
    });
  }

  if (value.originType === "budget") {
    value.items.forEach((item, index) => {
      if (isDateBeforeToday(item.serviceDate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "serviceDate"],
          message: "Service date cannot be earlier than today for service orders generated from budgets.",
        });
      }
    });
  }
});

export const createServiceOrderSchema = baseServiceOrderSchema;
export const updateServiceOrderSchema = baseServiceOrderSchema;
export const updateServiceOrderStatusSchema = z.object({
  status: serviceOrderTransitionStatusSchema,
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

export type ServiceOrderOrigin = z.infer<typeof serviceOrderOriginSchema>;
export type ServiceOrderStatus = z.infer<typeof serviceOrderStatusSchema>;
export type ServiceOrderTransitionStatus = z.infer<typeof serviceOrderTransitionStatusSchema>;
export type ServiceOrderItemInput = z.infer<typeof serviceOrderItemSchema>;
export type CreateServiceOrderInput = z.infer<typeof createServiceOrderSchema>;
export type UpdateServiceOrderInput = z.infer<typeof updateServiceOrderSchema>;
export type UpdateServiceOrderStatusInput = z.infer<typeof updateServiceOrderStatusSchema>;

export type ManagedServiceOrderStatusHistory = {
  id: string;
  serviceOrderId: string | null;
  serviceOrderNumber: string;
  previousStatus: ServiceOrderStatus | null;
  nextStatus: ServiceOrderStatus;
  reason: string | null;
  actorUserId: string | null;
  actorNameSnapshot: string | null;
  actorEmailSnapshot: string | null;
  createdAt: string;
};

export type ManagedServiceOrderItem = {
  id: string;
  position: number;
  sourceBudgetItemId: string | null;
  serviceTypeId: string;
  serviceTypeName: string;
  serviceTypeBillingUnit: string;
  equipmentId: string;
  equipmentName: string;
  equipmentTypeName: string;
  equipmentBrand: string;
  equipmentModel: string;
  operatorId: string;
  operatorName: string;
  serviceDescription: string;
  serviceDate: string;
  plannedStartTime: string;
  plannedEndTime: string;
  actualStartTime: string | null;
  actualEndTime: string | null;
  quotedValue: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ManagedServiceOrder = {
  id: string;
  number: string;
  originType: ServiceOrderOrigin;
  sourceBudgetId: string | null;
  sourceBudgetNumber: string | null;
  status: ServiceOrderStatus;
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
  notes: string | null;
  itemCount: number;
  items: ManagedServiceOrderItem[];
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};
