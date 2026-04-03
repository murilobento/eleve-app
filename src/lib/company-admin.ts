import { z } from "zod";

const companyTextSchema = z
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

const cnpjSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ""))
  .refine((value) => value.length === 14, "Enter a valid CNPJ.")
  .refine((value) => isValidCnpj(value), "Enter a valid CNPJ.");

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
  .email("Please enter a valid email address.")
  .transform((value) => value.toLowerCase());

const websiteSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (!value) {
      return undefined;
    }

    const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    return normalized;
  })
  .refine((value) => !value || z.url().safeParse(value).success, "Enter a valid website URL.");

const stateSchema = z
  .string()
  .trim()
  .min(2, "State must be at least 2 characters.")
  .max(60, "State must be at most 60 characters.");

const addressTextSchema = z
  .string()
  .trim()
  .min(2, "This field must be at least 2 characters.")
  .max(120, "This field must be at most 120 characters.");

const addressNumberSchema = z
  .string()
  .trim()
  .min(1, "Number is required.")
  .max(20, "Number must be at most 20 characters.");

export const updateCompanySchema = z.object({
  appName: optionalTextSchema,
  legalName: companyTextSchema,
  tradeName: optionalTextSchema,
  cnpj: cnpjSchema,
  email: emailSchema,
  phone: phoneSchema,
  website: websiteSchema,
  postalCode: postalCodeSchema,
  street: addressTextSchema,
  number: addressNumberSchema,
  district: addressTextSchema,
  city: addressTextSchema,
  state: stateSchema,
  country: z
    .string()
    .trim()
    .max(60, "Country must be at most 60 characters.")
    .transform((value) => value || "Brasil"),
});

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

export type ManagedCompany = {
  id: string;
  appName: string | null;
  legalName: string;
  tradeName: string | null;
  cnpj: string;
  email: string;
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
  cnpj: string;
  legalName: string;
  tradeName: string;
  email: string;
  phone: string;
  postalCode: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
};

function isRepeatedDigits(value: string) {
  return /^(\d)\1+$/.test(value);
}

function isValidCnpj(value: string) {
  if (value.length !== 14 || isRepeatedDigits(value)) {
    return false;
  }

  const digits = value.split("").map(Number);

  const calculateDigit = (base: number[]) => {
    let factor = base.length - 7;
    const total = base.reduce((sum, digit) => {
      const next = sum + digit * factor;
      factor = factor === 2 ? 9 : factor - 1;
      return next;
    }, 0);

    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calculateDigit(digits.slice(0, 12));
  const secondDigit = calculateDigit(digits.slice(0, 13));

  return firstDigit === digits[12] && secondDigit === digits[13];
}
