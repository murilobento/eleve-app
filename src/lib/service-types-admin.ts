import { z } from "zod";

export const serviceTypeStatusSchema = z.enum(["active", "inactive"]);
export const serviceBillingUnitSchema = z.enum([
  "hour",
  "daily",
  "monthly",
  "annual",
  "km",
  "freight",
  "mobilization_demobilization",
  "counterweight_transport",
]);

const textFieldSchema = z
  .string()
  .trim()
  .min(2, "This field must be at least 2 characters.")
  .max(80, "This field must be at most 80 characters.");

const descriptionSchema = z
  .string()
  .trim()
  .max(160, "Description must be at most 160 characters.")
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const decimalFieldSchema = (label: string) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined;
      }

      if (typeof value === "string") {
        return value.replace(",", ".");
      }

      return value;
    },
    z.coerce
      .number({
        invalid_type_error: `${label} must be a number.`,
      })
      .positive(`${label} must be greater than zero.`)
      .max(1000000000, `${label} must be 1000000000 or less.`),
  );

const optionalDecimalFieldSchema = (label: string) => decimalFieldSchema(label).optional();

export const createServiceTypeSchema = z.object({
  name: textFieldSchema,
  description: descriptionSchema,
  status: serviceTypeStatusSchema,
  billingUnit: serviceBillingUnitSchema,
  baseValue: decimalFieldSchema("Base value"),
  minimumHours: optionalDecimalFieldSchema("Minimum hours"),
  minimumKm: optionalDecimalFieldSchema("Minimum km"),
  equipmentIds: z.array(z.string().uuid("Select a valid equipment item.")).max(100).default([]),
});

export const updateServiceTypeSchema = createServiceTypeSchema;

export type ServiceTypeStatus = z.infer<typeof serviceTypeStatusSchema>;
export type ServiceBillingUnit = z.infer<typeof serviceBillingUnitSchema>;
export type CreateServiceTypeInput = z.infer<typeof createServiceTypeSchema>;
export type UpdateServiceTypeInput = z.infer<typeof updateServiceTypeSchema>;

export type ManagedServiceTypeEquipment = {
  id: string;
  name: string;
  brand: string;
  model: string;
};

export type ManagedServiceType = {
  id: string;
  name: string;
  description?: string | null;
  status: ServiceTypeStatus;
  billingUnit: ServiceBillingUnit;
  baseValue: number;
  minimumHours: number | null;
  minimumKm: number | null;
  equipmentIds: string[];
  equipment: ManagedServiceTypeEquipment[];
  equipmentCount: number;
  createdAt: string;
  updatedAt: string;
};
