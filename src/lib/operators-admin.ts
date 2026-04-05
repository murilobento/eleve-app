import { z } from "zod";

export const operatorStatusSchema = z.enum(["active", "inactive"]);
export const operatorLicenseSchema = z.enum(["A", "B", "C", "D", "E"]);

const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters.")
  .max(120, "Name must be at most 120 characters.");

const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s+/g, " "))
  .refine((value) => value.replace(/\D/g, "").length >= 10, "Enter a valid phone number.")
  .refine((value) => value.replace(/\D/g, "").length <= 13, "Enter a valid phone number.");

const baseOperatorSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  license: operatorLicenseSchema,
  status: operatorStatusSchema,
});

export const createOperatorSchema = baseOperatorSchema;
export const updateOperatorSchema = baseOperatorSchema;

export type CreateOperatorInput = z.infer<typeof createOperatorSchema>;
export type UpdateOperatorInput = z.infer<typeof updateOperatorSchema>;
export type OperatorLicense = z.infer<typeof operatorLicenseSchema>;
export type OperatorStatus = z.infer<typeof operatorStatusSchema>;

export type ManagedOperator = {
  id: string;
  name: string;
  phone: string;
  license: OperatorLicense;
  status: OperatorStatus;
  createdAt: string;
  updatedAt: string;
};
