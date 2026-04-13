import { z } from "zod";

import { requisitionStatusSchema } from "@/lib/maintenance-requisitions-admin";
import type { SupplierType } from "@/lib/suppliers-admin";

const relationIdSchema = (label: string) => z.string().uuid(`Select a valid ${label}.`);

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

export const createPartsRequisitionSchema = z.object({
  equipmentId: relationIdSchema("equipment"),
  supplierId: relationIdSchema("supplier"),
  scheduledDate: dateSchema("Scheduled date"),
  description: textFieldSchema("Description"),
  notes: optionalTextFieldSchema("Notes"),
});

export const updatePartsRequisitionSchema = createPartsRequisitionSchema;

export const updatePartsRequisitionStatusSchema = z.object({
  status: requisitionStatusSchema,
  completedAt: optionalDateSchema("Completed at"),
  completionNotes: optionalTextFieldSchema("Completion notes"),
}).superRefine((value, ctx) => {
  if (value.status === "completed" && !value.completedAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["completedAt"],
      message: "Completed at is required when status is completed.",
    });
  }

  if (value.status === "completed" && !value.completionNotes) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["completionNotes"],
      message: "Completion notes are required when status is completed.",
    });
  }
});

export type CreatePartsRequisitionInput = z.infer<typeof createPartsRequisitionSchema>;
export type UpdatePartsRequisitionInput = z.infer<typeof updatePartsRequisitionSchema>;
export type UpdatePartsRequisitionStatusInput = z.infer<typeof updatePartsRequisitionStatusSchema>;

export type ManagedPartsRequisition = {
  id: string;
  number: string;
  revisionNumber: number;
  equipmentId: string;
  equipmentName: string;
  equipmentBrand: string;
  equipmentModel: string;
  supplierId: string;
  supplierName: string;
  supplierTypes: SupplierType[];
  requesterUserId: string | null;
  requesterNameSnapshot: string | null;
  requesterEmailSnapshot: string | null;
  status: z.infer<typeof requisitionStatusSchema>;
  scheduledDate: string;
  description: string;
  notes: string | null;
  completionNotes: string | null;
  issuedAt: string | null;
  lastIssuedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};
