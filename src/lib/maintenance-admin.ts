import { z } from "zod";

export const maintenanceTypeSchema = z.enum(["preventive", "corrective"]);
export const maintenanceStatusSchema = z.enum(["planned", "completed", "cancelled"]);
export const maintenanceFinancialStatusSchema = z.enum(["pending", "paid", "cancelled"]);
export const maintenanceMeterKindSchema = z.enum(["km", "hours"]);

const textFieldSchema = (label: string, max = 2000) =>
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

const dateSchema = (label: string) =>
  z
    .string()
    .trim()
    .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), `${label} must be a valid date.`);

const optionalDateSchema = (label: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined))
    .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), `${label} must be a valid date.`);

const decimalInput = (value: unknown) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    return value.replace(",", ".");
  }

  return value;
};

const optionalPositiveDecimalFieldSchema = (label: string) =>
  z.preprocess(
    decimalInput,
    z.coerce
      .number({
        invalid_type_error: `${label} must be a number.`,
      })
      .positive(`${label} must be greater than zero.`)
      .max(1000000000, `${label} must be 1000000000 or less.`)
      .optional(),
  );

const relationIdSchema = (label: string) => z.string().uuid(`Select a valid ${label}.`);

export const createMaintenanceSchema = z.object({
  equipmentId: relationIdSchema("equipment"),
  maintenanceType: maintenanceTypeSchema,
  status: maintenanceStatusSchema,
  financialStatus: maintenanceFinancialStatusSchema,
  plannedDate: dateSchema("Planned date"),
  performedDate: optionalDateSchema("Performed date"),
  description: textFieldSchema("Description"),
  supplierName: optionalTextFieldSchema("Supplier name", 120),
  documentNumber: optionalTextFieldSchema("Document number", 80),
  notes: optionalTextFieldSchema("Notes"),
  amountTotal: optionalPositiveDecimalFieldSchema("Total amount"),
  paymentDueDate: optionalDateSchema("Payment due date"),
  paidAt: optionalDateSchema("Paid at"),
  meterKind: maintenanceMeterKindSchema.optional(),
  meterValue: optionalPositiveDecimalFieldSchema("Meter value"),
}).superRefine((value, ctx) => {
  if (value.status === "completed" && !value.performedDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["performedDate"],
      message: "Performed date is required when maintenance is completed.",
    });
  }

  if (value.status === "completed" && value.amountTotal === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["amountTotal"],
      message: "Total amount is required when maintenance is completed.",
    });
  }

  if (value.financialStatus === "paid" && !value.paidAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["paidAt"],
      message: "Paid at is required when financial status is paid.",
    });
  }

  if (value.status === "cancelled" && value.financialStatus !== "cancelled") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["financialStatus"],
      message: "Cancelled maintenance must also have cancelled financial status.",
    });
  }

  if (value.meterValue !== undefined && !value.meterKind) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["meterKind"],
      message: "Select a meter type when meter value is informed.",
    });
  }
});

export const updateMaintenanceSchema = createMaintenanceSchema;

export const updateMaintenanceStatusSchema = z.object({
  status: maintenanceStatusSchema,
  performedDate: optionalDateSchema("Performed date"),
  amountTotal: optionalPositiveDecimalFieldSchema("Total amount"),
});

export const updateMaintenancePaymentSchema = z.object({
  financialStatus: maintenanceFinancialStatusSchema,
  paymentDueDate: optionalDateSchema("Payment due date"),
  paidAt: optionalDateSchema("Paid at"),
}).superRefine((value, ctx) => {
  if (value.financialStatus === "paid" && !value.paidAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["paidAt"],
      message: "Paid at is required when financial status is paid.",
    });
  }
});

export type MaintenanceType = z.infer<typeof maintenanceTypeSchema>;
export type MaintenanceStatus = z.infer<typeof maintenanceStatusSchema>;
export type MaintenanceFinancialStatus = z.infer<typeof maintenanceFinancialStatusSchema>;
export type MaintenanceMeterKind = z.infer<typeof maintenanceMeterKindSchema>;
export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;
export type UpdateMaintenanceInput = z.infer<typeof updateMaintenanceSchema>;
export type UpdateMaintenanceStatusInput = z.infer<typeof updateMaintenanceStatusSchema>;
export type UpdateMaintenancePaymentInput = z.infer<typeof updateMaintenancePaymentSchema>;

export type ManagedMaintenanceRecord = {
  id: string;
  equipmentId: string;
  equipmentName: string;
  equipmentBrand: string;
  equipmentModel: string;
  maintenanceType: MaintenanceType;
  status: MaintenanceStatus;
  financialStatus: MaintenanceFinancialStatus;
  plannedDate: string;
  performedDate: string | null;
  description: string;
  supplierName: string | null;
  documentNumber: string | null;
  notes: string | null;
  amountTotal: number | null;
  paymentDueDate: string | null;
  paidAt: string | null;
  meterKind: MaintenanceMeterKind | null;
  meterValue: number | null;
  createdAt: string;
  updatedAt: string;
};
