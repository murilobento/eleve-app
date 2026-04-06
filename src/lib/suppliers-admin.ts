import { z } from "zod";

export const supplierTypeSchema = z.enum(["fuel_station", "workshop", "other"]);
export const supplierStatusSchema = z.enum(["active", "inactive"]);

const textFieldSchema = z
  .string()
  .trim()
  .min(2, "This field must be at least 2 characters.")
  .max(120, "This field must be at most 120 characters.");

const optionalTextSchema = z
  .string()
  .trim()
  .max(120, "This field must be at most 120 characters.")
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const documentSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ""))
  .refine((value) => value.length > 0, "Enter a valid CPF or CNPJ.");

const postalCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ""))
  .refine((value) => value.length === 8, "Enter a valid postal code.");

const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s+/g, " "))
  .refine((value) => value.replace(/\D/g, "").length >= 10, "Enter a valid phone number.")
  .refine((value) => value.replace(/\D/g, "").length <= 13, "Enter a valid phone number.");

const emailSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value.toLowerCase() : undefined))
  .refine((value) => !value || z.email().safeParse(value).success, "Please enter a valid email address.");

const websiteSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (!value) {
      return undefined;
    }

    return /^https?:\/\//i.test(value) ? value : `https://${value}`;
  })
  .refine((value) => !value || z.url().safeParse(value).success, "Enter a valid website URL.");

const addressNumberSchema = z
  .string()
  .trim()
  .min(1, "Number is required.")
  .max(20, "Number must be at most 20 characters.");

const baseSupplierSchema = z.object({
  supplierType: supplierTypeSchema,
  status: supplierStatusSchema,
  legalName: textFieldSchema,
  tradeName: optionalTextSchema,
  document: documentSchema,
  contactName: optionalTextSchema,
  contactPhone: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value.replace(/\s+/g, " ") : undefined))
    .refine((value) => !value || value.replace(/\D/g, "").length >= 10, "Enter a valid phone number.")
    .refine((value) => !value || value.replace(/\D/g, "").length <= 13, "Enter a valid phone number."),
  email: emailSchema,
  phone: phoneSchema,
  website: websiteSchema,
  postalCode: postalCodeSchema,
  street: textFieldSchema,
  number: addressNumberSchema,
  complement: optionalTextSchema,
  district: textFieldSchema,
  city: textFieldSchema,
  state: z
    .string()
    .trim()
    .min(2, "State must be at least 2 characters.")
    .max(60, "State must be at most 60 characters."),
  country: z
    .string()
    .trim()
    .max(60, "Country must be at most 60 characters.")
    .transform((value) => value || "Brasil"),
});

export const createSupplierSchema = baseSupplierSchema;
export const updateSupplierSchema = baseSupplierSchema;

export type SupplierType = z.infer<typeof supplierTypeSchema>;
export type SupplierStatus = z.infer<typeof supplierStatusSchema>;
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

export type SupplierOption = {
  id: string;
  legalName: string;
  tradeName: string | null;
  supplierType: SupplierType;
  status: SupplierStatus;
};

export type ManagedSupplier = {
  id: string;
  supplierType: SupplierType;
  status: SupplierStatus;
  legalName: string;
  tradeName: string | null;
  document: string;
  contactName: string | null;
  contactPhone: string | null;
  email: string | null;
  phone: string;
  website: string | null;
  postalCode: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
  country: string;
  createdAt: string;
  updatedAt: string;
};

export type PostalCodeLookupResult = {
  postalCode: string;
  street: string;
  district: string;
  city: string;
  state: string;
};

export type CnpjLookupResult = {
  document: string;
  legalName: string;
  tradeName: string;
  email?: string;
  phone: string;
  postalCode: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
};
