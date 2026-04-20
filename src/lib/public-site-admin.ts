import { z } from "zod";

const shortTextSchema = z
  .string()
  .trim()
  .min(2, "This field must be at least 2 characters.")
  .max(120, "This field must be at most 120 characters.");

const longTextSchema = z
  .string()
  .trim()
  .min(2, "This field must be at least 2 characters.")
  .max(2000, "This field must be at most 2000 characters.");

const optionalLongTextSchema = z
  .string()
  .trim()
  .max(2000, "This field must be at most 2000 characters.")
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const imageUrlSchema = z
  .string()
  .trim()
  .url("Provide a valid image URL.")
  .max(1000, "Image URL must be at most 1000 characters.");

const optionalImageUrlSchema = z
  .string()
  .trim()
  .url("Provide a valid image URL.")
  .max(1000, "Image URL must be at most 1000 characters.")
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalManualUrlSchema = z
  .string()
  .trim()
  .url("Provide a valid manual URL.")
  .max(1000, "Manual URL must be at most 1000 characters.")
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const displayOrderSchema = z.coerce
  .number({ invalid_type_error: "Display order must be a number." })
  .int("Display order must be an integer.")
  .min(0, "Display order must be 0 or greater.")
  .max(9999, "Display order must be 9999 or less.");

export const updatePublicCompanySchema = z.object({
  name: shortTextSchema,
  phone: shortTextSchema.max(40, "Phone must be at most 40 characters."),
  email: z.string().trim().email("Please enter a valid email address.").max(120),
  address: longTextSchema.max(300, "Address must be at most 300 characters."),
});

export const createPublicServiceSchema = z.object({
  tag: shortTextSchema.max(40, "Tag must be at most 40 characters."),
  title: shortTextSchema,
  description: optionalLongTextSchema,
  imageUrl: imageUrlSchema,
  displayOrder: displayOrderSchema.default(0),
  isPublished: z.boolean().default(true),
});

export const updatePublicServiceSchema = createPublicServiceSchema;

export const createPublicEquipmentSchema = z.object({
  name: shortTextSchema,
  model: shortTextSchema.max(80, "Model must be at most 80 characters."),
  capacity: shortTextSchema.max(40, "Capacity must be at most 40 characters."),
  technicalInfo: longTextSchema.max(2000, "Technical information must be at most 2000 characters."),
  manualUrl: optionalManualUrlSchema,
  imageUrl: imageUrlSchema,
  displayOrder: displayOrderSchema.default(0),
  isPublished: z.boolean().default(true),
});

export const updatePublicEquipmentSchema = createPublicEquipmentSchema;

export const createPublicTestimonialSchema = z.object({
  name: shortTextSchema.max(80, "Name must be at most 80 characters."),
  role: shortTextSchema.max(120, "Role must be at most 120 characters."),
  quote: longTextSchema.max(700, "Quote must be at most 700 characters."),
  imageUrl: optionalImageUrlSchema,
  displayOrder: displayOrderSchema.default(0),
  isPublished: z.boolean().default(true),
});

export const updatePublicTestimonialSchema = createPublicTestimonialSchema;

export type UpdatePublicCompanyInput = z.infer<typeof updatePublicCompanySchema>;
export type CreatePublicServiceInput = z.infer<typeof createPublicServiceSchema>;
export type UpdatePublicServiceInput = z.infer<typeof updatePublicServiceSchema>;
export type CreatePublicEquipmentInput = z.infer<typeof createPublicEquipmentSchema>;
export type UpdatePublicEquipmentInput = z.infer<typeof updatePublicEquipmentSchema>;
export type CreatePublicTestimonialInput = z.infer<typeof createPublicTestimonialSchema>;
export type UpdatePublicTestimonialInput = z.infer<typeof updatePublicTestimonialSchema>;

export type ManagedPublicCompany = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
  updatedAt: string;
};

export type ManagedPublicService = {
  id: string;
  tag: string;
  title: string;
  description: string | null;
  imageUrl: string;
  displayOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ManagedPublicEquipment = {
  id: string;
  name: string;
  model: string;
  capacity: string;
  technicalInfo: string;
  manualUrl: string | null;
  imageUrl: string;
  displayOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ManagedPublicTestimonial = {
  id: string;
  name: string;
  role: string;
  quote: string;
  imageUrl: string | null;
  displayOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PublicSiteContent = {
  company: ManagedPublicCompany | null;
  services: ManagedPublicService[];
  equipment: ManagedPublicEquipment[];
  testimonials: ManagedPublicTestimonial[];
};
