import { z } from "zod";

const personTypeSchema = z.enum(["PF", "PJ"]);

const clientTextSchema = z
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
  .transform((value) => {
    if (!value) {
      return undefined;
    }

    return value.toLowerCase();
  })
  .refine((value) => !value || z.email().safeParse(value).success, "Please enter a valid email address.");

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

const baseClientSchema = z.object({
  personType: personTypeSchema,
  legalName: clientTextSchema,
  tradeName: optionalTextSchema,
  document: documentSchema,
  contactName: optionalTextSchema,
  contactPhone: z
    .string()
    .trim()
    .optional()
    .transform((value) => {
      if (!value) {
        return undefined;
      }

      return value.replace(/\s+/g, " ");
    })
    .refine((value) => !value || value.replace(/\D/g, "").length >= 10, "Enter a valid phone number.")
    .refine((value) => !value || value.replace(/\D/g, "").length <= 13, "Enter a valid phone number."),
  email: emailSchema,
  phone: phoneSchema,
  website: websiteSchema,
  postalCode: postalCodeSchema,
  street: addressTextSchema,
  number: addressNumberSchema,
  complement: optionalTextSchema,
  district: addressTextSchema,
  city: addressTextSchema,
  state: stateSchema,
  country: z
    .string()
    .trim()
    .max(60, "Country must be at most 60 characters.")
    .transform((value) => value || "Brasil"),
}).superRefine((value, ctx) => {
  if (value.personType === "PF" && !isValidCpf(value.document)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["document"],
      message: "Enter a valid CPF.",
    });
  }

  if (value.personType === "PJ" && !isValidCnpj(value.document)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["document"],
      message: "Enter a valid CNPJ.",
    });
  }
});

export const createClientSchema = baseClientSchema;
export const updateClientSchema = baseClientSchema;

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;

export type ManagedClient = {
  id: string;
  personType: "PF" | "PJ";
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

function isRepeatedDigits(value: string) {
  return /^(\d)\1+$/.test(value);
}

function isValidCpf(value: string) {
  if (value.length !== 11 || isRepeatedDigits(value)) {
    return false;
  }

  const digits = value.split("").map(Number);

  const calculateDigit = (base: number[], factor: number) => {
    const total = base.reduce((sum, digit) => {
      const next = sum + digit * factor;
      factor -= 1;
      return next;
    }, 0);

    const remainder = (total * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  const firstDigit = calculateDigit(digits.slice(0, 9), 10);
  const secondDigit = calculateDigit(digits.slice(0, 10), 11);

  return firstDigit === digits[9] && secondDigit === digits[10];
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
