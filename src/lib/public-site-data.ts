import { randomUUID } from "crypto";

import { pool } from "@/lib/auth";
import type {
  CreatePublicEquipmentInput,
  CreatePublicServiceInput,
  CreatePublicTestimonialInput,
  ManagedPublicCompany,
  ManagedPublicEquipment,
  ManagedPublicService,
  ManagedPublicTestimonial,
  PublicSiteContent,
  UpdatePublicCompanyInput,
  UpdatePublicEquipmentInput,
  UpdatePublicServiceInput,
  UpdatePublicTestimonialInput,
} from "@/lib/public-site-admin";

let publicSiteSchemaPromise: Promise<void> | null = null;

type PublicCompanyRow = {
  id: string;
  name: string;
  cnpj: string | null;
  phone: string;
  email: string;
  address: string;
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  legal_name: string | null;
  street_address: string | null;
  address_locality: string | null;
  address_region: string | null;
  postal_code: string | null;
  service_areas: unknown;
  created_at: string;
  updated_at: string;
};

type PublicServiceRow = {
  id: string;
  slug: string | null;
  tag: string;
  title: string;
  description: string | null;
  seo_title: string | null;
  seo_description: string | null;
  page_content: string | null;
  image_alt: string | null;
  image_url: string;
  display_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

type PublicEquipmentRow = {
  id: string;
  slug: string | null;
  name: string;
  model: string;
  capacity: string;
  technical_info: string;
  seo_title: string | null;
  seo_description: string | null;
  page_content: string | null;
  image_alt: string | null;
  manual_url: string | null;
  image_url: string;
  display_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

type PublicTestimonialRow = {
  id: string;
  name: string;
  role: string;
  quote: string;
  image_url: string | null;
  display_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

const DEFAULT_PUBLIC_COMPANY = {
  name: "Eleve Locacoes",
  cnpj: "",
  phone: "(11) 4000-1234",
  email: "contato@eleve.com.br",
  address: "Av. Industrial, 1200 - Bloco A, Sao Paulo - SP",
  facebookUrl: null,
  instagramUrl: null,
  linkedinUrl: null,
};

const DEFAULT_PUBLIC_SERVICES: Array<{
  tag: string;
  title: string;
  description: string | null;
  imageUrl: string;
  displayOrder: number;
}> = [
  {
    tag: "Pesados",
    title: "Locacao de Guindastes",
    description: "Movimentacao de cargas pesadas em ambientes industriais e civis.",
    imageUrl: "https://images.unsplash.com/photo-1541888946425-d81bb19480c5?auto=format&fit=crop&q=80&w=1200",
    displayOrder: 10,
  },
  {
    tag: "Versatil",
    title: "Munck",
    description: "Operacoes de carga e descarga com agilidade em campo.",
    imageUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&q=80&w=1200",
    displayOrder: 20,
  },
  {
    tag: "Logistica",
    title: "Empilhadeiras",
    description: "Apoio logístico para almoxarifado, industria e distribuicao.",
    imageUrl: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=1200",
    displayOrder: 30,
  },
];

const DEFAULT_PUBLIC_EQUIPMENT: Array<{
  name: string;
  model: string;
  capacity: string;
  technicalInfo: string;
  manualUrl: string | null;
  imageUrl: string;
  displayOrder: number;
}> = [
  {
    name: "Guindaste LTM 11200",
    model: "Liebherr",
    capacity: "1200 ton",
    technicalInfo: "Guindaste telescopico para elevacoes de alta capacidade em operacoes industriais e civis.",
    manualUrl: null,
    imageUrl: "https://images.unsplash.com/photo-1541888946425-d81bb19480c5?auto=format&fit=crop&q=80&w=1200",
    displayOrder: 10,
  },
  {
    name: "Empilhadeira Industrial",
    model: "Hyster",
    capacity: "16 ton",
    technicalInfo: "Empilhadeira para movimentacao de cargas paletizadas em ambientes industriais de alta demanda.",
    manualUrl: null,
    imageUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1200",
    displayOrder: 20,
  },
  {
    name: "Caminhao Munck",
    model: "Volvo",
    capacity: "45 ton",
    technicalInfo: "Veiculo com guindaste articulado para carga, descarga e apoio logistico em campo.",
    manualUrl: null,
    imageUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&q=80&w=1200",
    displayOrder: 30,
  },
];

const DEFAULT_PUBLIC_TESTIMONIALS: Array<{
  name: string;
  role: string;
  quote: string;
  imageUrl: string | null;
  displayOrder: number;
}> = [
  {
    name: "Carlos Oliveira",
    role: "Engenheiro de Producao",
    quote: "O atendimento da Eleve e excepcional. Equipamentos impecaveis e operadores muito experientes.",
    imageUrl: null,
    displayOrder: 10,
  },
  {
    name: "Juliana Mendes",
    role: "Gestora de Logistica",
    quote: "Atendimento rapido e execucao no prazo, mesmo em cenarios com alta urgencia.",
    imageUrl: null,
    displayOrder: 20,
  },
  {
    name: "Roberto Silva",
    role: "Diretor de Operacoes",
    quote: "A seguranca e o planejamento tecnico da equipe fizeram diferenca no nosso projeto.",
    imageUrl: null,
    displayOrder: 30,
  },
];

const PUBLIC_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type PublicSiteSlugTable = "public_site_services" | "public_site_equipment_showcase";
type PublicSiteSlugColumn = "title" | "name";

function slugifyPublicValue(value: string) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 140);

  return slug.length > 0 ? slug : "item";
}

function sanitizePublicSlug(value: string | undefined, fallback: string) {
  const candidate = value?.trim() ? value.trim() : fallback;
  const slug = slugifyPublicValue(candidate);
  return PUBLIC_SLUG_PATTERN.test(slug) ? slug : "item";
}

async function getUniquePublicSlug(tableName: PublicSiteSlugTable, baseSlug: string, excludeId?: string) {
  let suffix = 1;
  let candidate = baseSlug;

  while (true) {
    const params = excludeId ? [candidate, excludeId] : [candidate];
    const result = await pool.query<{ id: string }>(
      `
        SELECT id
        FROM ${tableName}
        WHERE slug = $1
        ${excludeId ? "AND id <> $2" : ""}
        LIMIT 1
      `,
      params,
    );

    if (!result.rows[0]) {
      return candidate;
    }

    suffix += 1;
    const suffixText = `-${suffix}`;
    candidate = `${baseSlug.slice(0, 140 - suffixText.length)}${suffixText}`;
  }
}

async function backfillPublicSlugs(tableName: PublicSiteSlugTable, labelColumn: PublicSiteSlugColumn) {
  const result = await pool.query<{ id: string; label: string; slug: string | null }>(
    `
      SELECT id, ${labelColumn} AS label, slug
      FROM ${tableName}
      ORDER BY created_at ASC, id ASC
    `,
  );
  const usedSlugs = new Set<string>();

  for (const row of result.rows) {
    const currentSlug = row.slug?.trim() ?? "";

    if (PUBLIC_SLUG_PATTERN.test(currentSlug) && !usedSlugs.has(currentSlug)) {
      usedSlugs.add(currentSlug);
      continue;
    }

    const baseSlug = slugifyPublicValue(row.label);
    let nextSlug = baseSlug;
    let suffix = 1;

    while (usedSlugs.has(nextSlug)) {
      suffix += 1;
      const suffixText = `-${suffix}`;
      nextSlug = `${baseSlug.slice(0, 140 - suffixText.length)}${suffixText}`;
    }

    usedSlugs.add(nextSlug);
    await pool.query(`UPDATE ${tableName} SET slug = $2 WHERE id = $1`, [row.id, nextSlug]);
  }
}

function normalizeServiceAreas(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function mapPublicCompanyRow(row: PublicCompanyRow): ManagedPublicCompany {
  return {
    id: row.id,
    name: row.name,
    cnpj: row.cnpj ?? "",
    phone: row.phone,
    email: row.email,
    address: row.address,
    facebookUrl: row.facebook_url,
    instagramUrl: row.instagram_url,
    linkedinUrl: row.linkedin_url,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    legalName: row.legal_name,
    streetAddress: row.street_address,
    addressLocality: row.address_locality,
    addressRegion: row.address_region,
    postalCode: row.postal_code,
    serviceAreas: normalizeServiceAreas(row.service_areas),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPublicServiceRow(row: PublicServiceRow): ManagedPublicService {
  return {
    id: row.id,
    slug: row.slug || slugifyPublicValue(row.title),
    tag: row.tag,
    title: row.title,
    description: row.description,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    pageContent: row.page_content,
    imageAlt: row.image_alt,
    imageUrl: row.image_url,
    displayOrder: Number(row.display_order),
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPublicEquipmentRow(row: PublicEquipmentRow): ManagedPublicEquipment {
  return {
    id: row.id,
    slug: row.slug || slugifyPublicValue(row.name),
    name: row.name,
    model: row.model,
    capacity: row.capacity,
    technicalInfo: row.technical_info,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    pageContent: row.page_content,
    imageAlt: row.image_alt,
    manualUrl: row.manual_url,
    imageUrl: row.image_url,
    displayOrder: Number(row.display_order),
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPublicTestimonialRow(row: PublicTestimonialRow): ManagedPublicTestimonial {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    quote: row.quote,
    imageUrl: row.image_url,
    displayOrder: Number(row.display_order),
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function ensurePublicSiteSchema() {
  if (!publicSiteSchemaPromise) {
    publicSiteSchemaPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public_site_company_profile (
          id text PRIMARY KEY,
          singleton_key boolean NOT NULL DEFAULT true UNIQUE,
          name text NOT NULL,
          cnpj text NOT NULL DEFAULT '',
          phone text NOT NULL,
          email text NOT NULL,
          address text NOT NULL,
          facebook_url text,
          instagram_url text,
          linkedin_url text,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );
      `);

      await pool.query(`
        ALTER TABLE public_site_company_profile
        ADD COLUMN IF NOT EXISTS cnpj text NOT NULL DEFAULT '';
      `);

      await pool.query(`
        ALTER TABLE public_site_company_profile
        ADD COLUMN IF NOT EXISTS facebook_url text;
      `);

      await pool.query(`
        ALTER TABLE public_site_company_profile
        ADD COLUMN IF NOT EXISTS instagram_url text;
      `);

      await pool.query(`
        ALTER TABLE public_site_company_profile
        ADD COLUMN IF NOT EXISTS linkedin_url text;
      `);

      await pool.query(`
        ALTER TABLE public_site_company_profile
        ADD COLUMN IF NOT EXISTS seo_title text;
      `);

      await pool.query(`
        ALTER TABLE public_site_company_profile
        ADD COLUMN IF NOT EXISTS seo_description text;
      `);

      await pool.query(`
        ALTER TABLE public_site_company_profile
        ADD COLUMN IF NOT EXISTS legal_name text;
      `);

      await pool.query(`
        ALTER TABLE public_site_company_profile
        ADD COLUMN IF NOT EXISTS street_address text;
      `);

      await pool.query(`
        ALTER TABLE public_site_company_profile
        ADD COLUMN IF NOT EXISTS address_locality text;
      `);

      await pool.query(`
        ALTER TABLE public_site_company_profile
        ADD COLUMN IF NOT EXISTS address_region text;
      `);

      await pool.query(`
        ALTER TABLE public_site_company_profile
        ADD COLUMN IF NOT EXISTS postal_code text;
      `);

      await pool.query(`
        ALTER TABLE public_site_company_profile
        ADD COLUMN IF NOT EXISTS service_areas jsonb NOT NULL DEFAULT '[]'::jsonb;
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS public_site_services (
          id text PRIMARY KEY,
          slug text,
          tag text NOT NULL,
          title text NOT NULL,
          description text,
          seo_title text,
          seo_description text,
          page_content text,
          image_alt text,
          image_url text NOT NULL,
          display_order integer NOT NULL DEFAULT 0,
          is_published boolean NOT NULL DEFAULT true,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );
      `);

      await pool.query(`
        ALTER TABLE public_site_services
        ADD COLUMN IF NOT EXISTS slug text;
      `);

      await pool.query(`
        ALTER TABLE public_site_services
        ADD COLUMN IF NOT EXISTS seo_title text;
      `);

      await pool.query(`
        ALTER TABLE public_site_services
        ADD COLUMN IF NOT EXISTS seo_description text;
      `);

      await pool.query(`
        ALTER TABLE public_site_services
        ADD COLUMN IF NOT EXISTS page_content text;
      `);

      await pool.query(`
        ALTER TABLE public_site_services
        ADD COLUMN IF NOT EXISTS image_alt text;
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS public_site_equipment_showcase (
          id text PRIMARY KEY,
          slug text,
          name text NOT NULL,
          model text NOT NULL,
          capacity text NOT NULL,
          technical_info text NOT NULL DEFAULT '',
          seo_title text,
          seo_description text,
          page_content text,
          image_alt text,
          manual_url text,
          image_url text NOT NULL,
          display_order integer NOT NULL DEFAULT 0,
          is_published boolean NOT NULL DEFAULT true,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );
      `);

      await pool.query(`
        ALTER TABLE public_site_equipment_showcase
        ADD COLUMN IF NOT EXISTS technical_info text NOT NULL DEFAULT '';
      `);

      await pool.query(`
        ALTER TABLE public_site_equipment_showcase
        ADD COLUMN IF NOT EXISTS manual_url text;
      `);

      await pool.query(`
        ALTER TABLE public_site_equipment_showcase
        ADD COLUMN IF NOT EXISTS slug text;
      `);

      await pool.query(`
        ALTER TABLE public_site_equipment_showcase
        ADD COLUMN IF NOT EXISTS seo_title text;
      `);

      await pool.query(`
        ALTER TABLE public_site_equipment_showcase
        ADD COLUMN IF NOT EXISTS seo_description text;
      `);

      await pool.query(`
        ALTER TABLE public_site_equipment_showcase
        ADD COLUMN IF NOT EXISTS page_content text;
      `);

      await pool.query(`
        ALTER TABLE public_site_equipment_showcase
        ADD COLUMN IF NOT EXISTS image_alt text;
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS public_site_testimonials (
          id text PRIMARY KEY,
          name text NOT NULL,
          role text NOT NULL,
          quote text NOT NULL,
          image_url text,
          display_order integer NOT NULL DEFAULT 0,
          is_published boolean NOT NULL DEFAULT true,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );
      `);

      await backfillPublicSlugs("public_site_services", "title");
      await backfillPublicSlugs("public_site_equipment_showcase", "name");

      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS public_site_services_slug_unique
        ON public_site_services (slug)
        WHERE slug IS NOT NULL;
      `);

      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS public_site_equipment_showcase_slug_unique
        ON public_site_equipment_showcase (slug)
        WHERE slug IS NOT NULL;
      `);

      const companyCount = await pool.query<{ total: string }>(
        "SELECT COUNT(*)::text AS total FROM public_site_company_profile",
      );
      if (Number(companyCount.rows[0]?.total ?? "0") === 0) {
        await pool.query(
          `
            INSERT INTO public_site_company_profile (id, singleton_key, name, cnpj, phone, email, address)
            VALUES ($1, true, $2, $3, $4, $5, $6)
          `,
          [
            randomUUID(),
            DEFAULT_PUBLIC_COMPANY.name,
            DEFAULT_PUBLIC_COMPANY.cnpj,
            DEFAULT_PUBLIC_COMPANY.phone,
            DEFAULT_PUBLIC_COMPANY.email,
            DEFAULT_PUBLIC_COMPANY.address,
          ],
        );
      }

      const servicesCount = await pool.query<{ total: string }>(
        "SELECT COUNT(*)::text AS total FROM public_site_services",
      );
      if (Number(servicesCount.rows[0]?.total ?? "0") === 0) {
        for (const service of DEFAULT_PUBLIC_SERVICES) {
          await pool.query(
            `
              INSERT INTO public_site_services (id, tag, title, description, image_url, display_order, is_published)
              VALUES ($1, $2, $3, $4, $5, $6, true)
            `,
            [randomUUID(), service.tag, service.title, service.description, service.imageUrl, service.displayOrder],
          );
        }
      }

      const equipmentCount = await pool.query<{ total: string }>(
        "SELECT COUNT(*)::text AS total FROM public_site_equipment_showcase",
      );
      if (Number(equipmentCount.rows[0]?.total ?? "0") === 0) {
        for (const item of DEFAULT_PUBLIC_EQUIPMENT) {
          await pool.query(
            `
              INSERT INTO public_site_equipment_showcase (id, name, model, capacity, technical_info, manual_url, image_url, display_order, is_published)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
            `,
            [
              randomUUID(),
              item.name,
              item.model,
              item.capacity,
              item.technicalInfo,
              item.manualUrl,
              item.imageUrl,
              item.displayOrder,
            ],
          );
        }
      }

      const testimonialsCount = await pool.query<{ total: string }>(
        "SELECT COUNT(*)::text AS total FROM public_site_testimonials",
      );
      if (Number(testimonialsCount.rows[0]?.total ?? "0") === 0) {
        for (const testimonial of DEFAULT_PUBLIC_TESTIMONIALS) {
          await pool.query(
            `
              INSERT INTO public_site_testimonials (id, name, role, quote, image_url, display_order, is_published)
              VALUES ($1, $2, $3, $4, $5, $6, true)
            `,
            [
              randomUUID(),
              testimonial.name,
              testimonial.role,
              testimonial.quote,
              testimonial.imageUrl,
              testimonial.displayOrder,
            ],
          );
        }
      }

      await backfillPublicSlugs("public_site_services", "title");
      await backfillPublicSlugs("public_site_equipment_showcase", "name");
    })();
  }

  await publicSiteSchemaPromise;
}

export async function getPublicCompany() {
  await ensurePublicSiteSchema();

  const result = await pool.query<PublicCompanyRow>(
    `
      SELECT
        id,
        name,
        cnpj,
        phone,
        email,
        address,
        facebook_url,
        instagram_url,
        linkedin_url,
        seo_title,
        seo_description,
        legal_name,
        street_address,
        address_locality,
        address_region,
        postal_code,
        service_areas,
        created_at,
        updated_at
      FROM public_site_company_profile
      ORDER BY updated_at DESC
      LIMIT 1
    `,
  );

  const row = result.rows[0];
  return row ? mapPublicCompanyRow(row) : null;
}

export async function upsertPublicCompany(input: UpdatePublicCompanyInput) {
  await ensurePublicSiteSchema();
  const current = await getPublicCompany();
  const id = current?.id ?? randomUUID();

  await pool.query(
    `
      INSERT INTO public_site_company_profile (
        id,
        singleton_key,
        name,
        cnpj,
        phone,
        email,
        address,
        facebook_url,
        instagram_url,
        linkedin_url,
        seo_title,
        seo_description,
        legal_name,
        street_address,
        address_locality,
        address_region,
        postal_code,
        service_areas
      )
      VALUES ($1, true, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::jsonb)
      ON CONFLICT (singleton_key) DO UPDATE
      SET name = EXCLUDED.name,
          cnpj = EXCLUDED.cnpj,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          address = EXCLUDED.address,
          facebook_url = EXCLUDED.facebook_url,
          instagram_url = EXCLUDED.instagram_url,
          linkedin_url = EXCLUDED.linkedin_url,
          seo_title = EXCLUDED.seo_title,
          seo_description = EXCLUDED.seo_description,
          legal_name = EXCLUDED.legal_name,
          street_address = EXCLUDED.street_address,
          address_locality = EXCLUDED.address_locality,
          address_region = EXCLUDED.address_region,
          postal_code = EXCLUDED.postal_code,
          service_areas = EXCLUDED.service_areas,
          updated_at = now()
    `,
    [
      id,
      input.name.trim(),
      input.cnpj.trim(),
      input.phone.trim(),
      input.email.trim().toLowerCase(),
      input.address.trim(),
      input.facebookUrl.trim() || null,
      input.instagramUrl.trim() || null,
      input.linkedinUrl.trim() || null,
      input.seoTitle?.trim() || null,
      input.seoDescription?.trim() || null,
      input.legalName?.trim() || null,
      input.streetAddress?.trim() || null,
      input.addressLocality?.trim() || null,
      input.addressRegion?.trim() || null,
      input.postalCode?.trim() || null,
      JSON.stringify(input.serviceAreas ?? []),
    ],
  );

  return id;
}

export async function listPublicServices(onlyPublished = false) {
  await ensurePublicSiteSchema();

  const result = await pool.query<PublicServiceRow>(
    `
      SELECT
        id,
        slug,
        tag,
        title,
        description,
        seo_title,
        seo_description,
        page_content,
        image_alt,
        image_url,
        display_order,
        is_published,
        created_at,
        updated_at
      FROM public_site_services
      ${onlyPublished ? "WHERE is_published = true" : ""}
      ORDER BY display_order ASC, title ASC
    `,
  );

  return result.rows.map(mapPublicServiceRow);
}

export async function getPublicServiceById(id: string) {
  await ensurePublicSiteSchema();
  const result = await pool.query<PublicServiceRow>(
    `
      SELECT
        id,
        slug,
        tag,
        title,
        description,
        seo_title,
        seo_description,
        page_content,
        image_alt,
        image_url,
        display_order,
        is_published,
        created_at,
        updated_at
      FROM public_site_services
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );

  const row = result.rows[0];
  return row ? mapPublicServiceRow(row) : null;
}

export async function getPublicServiceBySlug(slug: string, onlyPublished = true) {
  await ensurePublicSiteSchema();
  const result = await pool.query<PublicServiceRow>(
    `
      SELECT
        id,
        slug,
        tag,
        title,
        description,
        seo_title,
        seo_description,
        page_content,
        image_alt,
        image_url,
        display_order,
        is_published,
        created_at,
        updated_at
      FROM public_site_services
      WHERE slug = $1
      ${onlyPublished ? "AND is_published = true" : ""}
      LIMIT 1
    `,
    [slug],
  );

  const row = result.rows[0];
  return row ? mapPublicServiceRow(row) : null;
}

export async function createPublicService(input: CreatePublicServiceInput) {
  await ensurePublicSiteSchema();
  const id = randomUUID();
  const slug = await getUniquePublicSlug(
    "public_site_services",
    sanitizePublicSlug(input.slug, input.title),
  );

  await pool.query(
    `
      INSERT INTO public_site_services (
        id,
        slug,
        tag,
        title,
        description,
        seo_title,
        seo_description,
        page_content,
        image_alt,
        image_url,
        display_order,
        is_published
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `,
    [
      id,
      slug,
      input.tag.trim(),
      input.title.trim(),
      input.description?.trim() || null,
      input.seoTitle?.trim() || null,
      input.seoDescription?.trim() || null,
      input.pageContent?.trim() || null,
      input.imageAlt?.trim() || null,
      input.imageUrl.trim(),
      input.displayOrder,
      input.isPublished,
    ],
  );

  return id;
}

export async function updatePublicService(id: string, input: UpdatePublicServiceInput) {
  await ensurePublicSiteSchema();
  const current = await getPublicServiceById(id);

  if (!current) {
    throw new Error("Public service not found.");
  }

  const slug = await getUniquePublicSlug(
    "public_site_services",
    input.slug ? sanitizePublicSlug(input.slug, input.title) : current.slug,
    id,
  );

  const result = await pool.query<{ id: string }>(
    `
      UPDATE public_site_services
      SET slug = $2,
          tag = $3,
          title = $4,
          description = $5,
          seo_title = $6,
          seo_description = $7,
          page_content = $8,
          image_alt = $9,
          image_url = $10,
          display_order = $11,
          is_published = $12,
          updated_at = now()
      WHERE id = $1
      RETURNING id
    `,
    [
      id,
      slug,
      input.tag.trim(),
      input.title.trim(),
      input.description?.trim() || null,
      input.seoTitle?.trim() || null,
      input.seoDescription?.trim() || null,
      input.pageContent?.trim() || null,
      input.imageAlt?.trim() || null,
      input.imageUrl.trim(),
      input.displayOrder,
      input.isPublished,
    ],
  );

  if (!result.rows[0]) {
    throw new Error("Public service not found.");
  }
}

export async function deletePublicService(id: string) {
  await ensurePublicSiteSchema();
  await pool.query(`DELETE FROM public_site_services WHERE id = $1`, [id]);
}

export async function listPublicEquipment(onlyPublished = false) {
  await ensurePublicSiteSchema();

  const result = await pool.query<PublicEquipmentRow>(
    `
      SELECT
        id,
        slug,
        name,
        model,
        capacity,
        technical_info,
        seo_title,
        seo_description,
        page_content,
        image_alt,
        manual_url,
        image_url,
        display_order,
        is_published,
        created_at,
        updated_at
      FROM public_site_equipment_showcase
      ${onlyPublished ? "WHERE is_published = true" : ""}
      ORDER BY display_order ASC, name ASC
    `,
  );

  return result.rows.map(mapPublicEquipmentRow);
}

export async function getPublicEquipmentById(id: string) {
  await ensurePublicSiteSchema();

  const result = await pool.query<PublicEquipmentRow>(
    `
      SELECT
        id,
        slug,
        name,
        model,
        capacity,
        technical_info,
        seo_title,
        seo_description,
        page_content,
        image_alt,
        manual_url,
        image_url,
        display_order,
        is_published,
        created_at,
        updated_at
      FROM public_site_equipment_showcase
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );

  const row = result.rows[0];
  return row ? mapPublicEquipmentRow(row) : null;
}

export async function getPublicEquipmentBySlug(slug: string, onlyPublished = true) {
  await ensurePublicSiteSchema();

  const result = await pool.query<PublicEquipmentRow>(
    `
      SELECT
        id,
        slug,
        name,
        model,
        capacity,
        technical_info,
        seo_title,
        seo_description,
        page_content,
        image_alt,
        manual_url,
        image_url,
        display_order,
        is_published,
        created_at,
        updated_at
      FROM public_site_equipment_showcase
      WHERE slug = $1
      ${onlyPublished ? "AND is_published = true" : ""}
      LIMIT 1
    `,
    [slug],
  );

  const row = result.rows[0];
  return row ? mapPublicEquipmentRow(row) : null;
}

export async function createPublicEquipment(input: CreatePublicEquipmentInput) {
  await ensurePublicSiteSchema();
  const id = randomUUID();
  const slug = await getUniquePublicSlug(
    "public_site_equipment_showcase",
    sanitizePublicSlug(input.slug, input.name),
  );

  await pool.query(
    `
      INSERT INTO public_site_equipment_showcase (
        id,
        slug,
        name,
        model,
        capacity,
        technical_info,
        seo_title,
        seo_description,
        page_content,
        image_alt,
        manual_url,
        image_url,
        display_order,
        is_published
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `,
    [
      id,
      slug,
      input.name.trim(),
      input.model.trim(),
      input.capacity.trim(),
      input.technicalInfo.trim(),
      input.seoTitle?.trim() || null,
      input.seoDescription?.trim() || null,
      input.pageContent?.trim() || null,
      input.imageAlt?.trim() || null,
      input.manualUrl?.trim() || null,
      input.imageUrl.trim(),
      input.displayOrder,
      input.isPublished,
    ],
  );

  return id;
}

export async function updatePublicEquipment(id: string, input: UpdatePublicEquipmentInput) {
  await ensurePublicSiteSchema();
  const current = await getPublicEquipmentById(id);

  if (!current) {
    throw new Error("Public equipment not found.");
  }

  const slug = await getUniquePublicSlug(
    "public_site_equipment_showcase",
    input.slug ? sanitizePublicSlug(input.slug, input.name) : current.slug,
    id,
  );

  const result = await pool.query<{ id: string }>(
    `
      UPDATE public_site_equipment_showcase
      SET slug = $2,
          name = $3,
          model = $4,
          capacity = $5,
          technical_info = $6,
          seo_title = $7,
          seo_description = $8,
          page_content = $9,
          image_alt = $10,
          manual_url = $11,
          image_url = $12,
          display_order = $13,
          is_published = $14,
          updated_at = now()
      WHERE id = $1
      RETURNING id
    `,
    [
      id,
      slug,
      input.name.trim(),
      input.model.trim(),
      input.capacity.trim(),
      input.technicalInfo.trim(),
      input.seoTitle?.trim() || null,
      input.seoDescription?.trim() || null,
      input.pageContent?.trim() || null,
      input.imageAlt?.trim() || null,
      input.manualUrl?.trim() || null,
      input.imageUrl.trim(),
      input.displayOrder,
      input.isPublished,
    ],
  );

  if (!result.rows[0]) {
    throw new Error("Public equipment not found.");
  }
}

export async function deletePublicEquipment(id: string) {
  await ensurePublicSiteSchema();
  await pool.query(`DELETE FROM public_site_equipment_showcase WHERE id = $1`, [id]);
}

export async function listPublicTestimonials(onlyPublished = false) {
  await ensurePublicSiteSchema();

  const result = await pool.query<PublicTestimonialRow>(
    `
      SELECT id, name, role, quote, image_url, display_order, is_published, created_at, updated_at
      FROM public_site_testimonials
      ${onlyPublished ? "WHERE is_published = true" : ""}
      ORDER BY display_order ASC, name ASC
    `,
  );

  return result.rows.map(mapPublicTestimonialRow);
}

export async function getPublicTestimonialById(id: string) {
  await ensurePublicSiteSchema();

  const result = await pool.query<PublicTestimonialRow>(
    `
      SELECT id, name, role, quote, image_url, display_order, is_published, created_at, updated_at
      FROM public_site_testimonials
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );

  const row = result.rows[0];
  return row ? mapPublicTestimonialRow(row) : null;
}

export async function createPublicTestimonial(input: CreatePublicTestimonialInput) {
  await ensurePublicSiteSchema();
  const id = randomUUID();

  await pool.query(
    `
      INSERT INTO public_site_testimonials (id, name, role, quote, image_url, display_order, is_published)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      id,
      input.name.trim(),
      input.role.trim(),
      input.quote.trim(),
      input.imageUrl?.trim() || null,
      input.displayOrder,
      input.isPublished,
    ],
  );

  return id;
}

export async function updatePublicTestimonial(id: string, input: UpdatePublicTestimonialInput) {
  await ensurePublicSiteSchema();

  const result = await pool.query<{ id: string }>(
    `
      UPDATE public_site_testimonials
      SET name = $2,
          role = $3,
          quote = $4,
          image_url = $5,
          display_order = $6,
          is_published = $7,
          updated_at = now()
      WHERE id = $1
      RETURNING id
    `,
    [
      id,
      input.name.trim(),
      input.role.trim(),
      input.quote.trim(),
      input.imageUrl?.trim() || null,
      input.displayOrder,
      input.isPublished,
    ],
  );

  if (!result.rows[0]) {
    throw new Error("Public testimonial not found.");
  }
}

export async function deletePublicTestimonial(id: string) {
  await ensurePublicSiteSchema();
  await pool.query(`DELETE FROM public_site_testimonials WHERE id = $1`, [id]);
}

export async function getPublicSiteContent(): Promise<PublicSiteContent> {
  const [company, services, equipment, testimonials] = await Promise.all([
    getPublicCompany(),
    listPublicServices(true),
    listPublicEquipment(true),
    listPublicTestimonials(true),
  ]);

  return {
    company,
    services,
    equipment,
    testimonials,
  };
}
