import { z } from "zod";

export const equipmentLicenseSchema = z.enum(["A", "B", "C", "D", "E"]);

const currentYear = new Date().getFullYear();

const textFieldSchema = z
  .string()
  .trim()
  .min(2, "This field must be at least 2 characters.")
  .max(80, "This field must be at most 80 characters.");

const yearSchema = z.coerce
  .number({
    invalid_type_error: "Year must be a number.",
  })
  .int("Year must be an integer.")
  .min(1950, "Year must be 1950 or later.")
  .max(currentYear + 1, `Year must be ${currentYear + 1} or earlier.`);

const plateSchema = z
  .string()
  .trim()
  .max(16, "Plate must be at most 16 characters.")
  .optional()
  .transform((value) => {
    if (!value) {
      return undefined;
    }

    const normalized = value.replace(/\s+/g, "").toUpperCase();
    return normalized.length > 0 ? normalized : undefined;
  });

export const createEquipmentSchema = z.object({
  typeId: z.string().uuid("Select a valid equipment type."),
  licenseRequired: equipmentLicenseSchema,
  name: textFieldSchema,
  model: textFieldSchema,
  brand: textFieldSchema,
  year: yearSchema,
  plate: plateSchema,
});

export const updateEquipmentSchema = createEquipmentSchema;

export type EquipmentLicense = z.infer<typeof equipmentLicenseSchema>;
export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;

export type ManagedEquipment = {
  id: string;
  typeId: string;
  typeName: string;
  licenseRequired: EquipmentLicense;
  name: string;
  model: string;
  brand: string;
  year: number;
  plate: string | null;
  createdAt: string;
  updatedAt: string;
};
