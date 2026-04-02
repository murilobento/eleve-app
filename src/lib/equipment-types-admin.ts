import { z } from "zod";

const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters.")
  .max(80, "Name must be at most 80 characters.");

const descriptionSchema = z
  .string()
  .trim()
  .max(160, "Description must be at most 160 characters.")
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

export const createEquipmentTypeSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
});

export const updateEquipmentTypeSchema = createEquipmentTypeSchema;

export type CreateEquipmentTypeInput = z.infer<typeof createEquipmentTypeSchema>;
export type UpdateEquipmentTypeInput = z.infer<typeof updateEquipmentTypeSchema>;

export type ManagedEquipmentType = {
  id: string;
  name: string;
  description?: string | null;
  equipmentCount: number;
};
