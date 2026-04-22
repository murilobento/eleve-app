import { z } from "zod";

export const fuelFinancialStatusSchema = z.enum(["pending", "paid", "cancelled"]);
export const fuelTypeSchema = z.enum(["diesel", "gasoline", "ethanol", "gnv", "other"]);
export const fuelMeterKindSchema = z.enum(["km", "hours"]);

const optionalTextFieldSchema = (label: string, max = 2000) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters.`)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));



const optionalRelationIdSchema = (label: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined))
    .refine((value) => !value || z.uuid().safeParse(value).success, `Select a valid ${label}.`);

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

const positiveDecimalFieldSchema = (label: string) =>
  z.preprocess(
    decimalInput,
    z.coerce
      .number({
        invalid_type_error: `${label} must be a number.`,
      })
      .positive(`${label} must be greater than zero.`)
      .max(1000000000, `${label} must be 1000000000 or less.`),
  );

const optionalPositiveDecimalFieldSchema = (label: string) => positiveDecimalFieldSchema(label).optional();

export const createFuelSchema = z.object({
  equipmentId: optionalRelationIdSchema("equipment"),
  fuelDate: dateSchema("Fuel date"),
  financialStatus: fuelFinancialStatusSchema,
  fuelType: fuelTypeSchema.optional(),
  totalAmount: positiveDecimalFieldSchema("Total amount"),
  liters: optionalPositiveDecimalFieldSchema("Liters"),
  meterKind: fuelMeterKindSchema.optional(),
  meterReading: optionalPositiveDecimalFieldSchema("Meter reading"),
  supplierName: optionalTextFieldSchema("Supplier name", 120),
  documentNumber: optionalTextFieldSchema("Document number", 80),
  notes: optionalTextFieldSchema("Notes"),
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

  if (value.meterReading !== undefined && !value.equipmentId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["equipmentId"],
      message: "Equipment is required when meter reading is informed.",
    });
  }

  if (value.meterReading !== undefined && !value.meterKind) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["meterKind"],
      message: "Select a meter type when meter reading is informed.",
    });
  }

  if (value.liters !== undefined && !value.equipmentId && value.meterReading !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["equipmentId"],
      message: "Equipment is required to calculate fuel averages.",
    });
  }
});

export const updateFuelSchema = createFuelSchema;

export const updateFuelPaymentSchema = z.object({
  financialStatus: fuelFinancialStatusSchema,
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

export type FuelFinancialStatus = z.infer<typeof fuelFinancialStatusSchema>;
export type FuelType = z.infer<typeof fuelTypeSchema>;
export type FuelMeterKind = z.infer<typeof fuelMeterKindSchema>;
export type CreateFuelInput = z.infer<typeof createFuelSchema>;
export type UpdateFuelInput = z.infer<typeof updateFuelSchema>;
export type UpdateFuelPaymentInput = z.infer<typeof updateFuelPaymentSchema>;

export type ManagedFuelRecord = {
  id: string;
  equipmentId: string | null;
  equipmentName: string | null;
  equipmentBrand: string | null;
  equipmentModel: string | null;
  fuelDate: string;
  financialStatus: FuelFinancialStatus;
  fuelType: FuelType | null;
  totalAmount: number;
  liters: number | null;
  meterKind: FuelMeterKind | null;
  meterReading: number | null;
  averageLabel: string | null;
  averageValue: number | null;
  supplierName: string | null;
  documentNumber: string | null;
  notes: string | null;
  paymentDueDate: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};
