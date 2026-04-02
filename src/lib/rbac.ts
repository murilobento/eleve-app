import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { auth, pool } from "@/lib/auth";
import {
  PERMISSION_CATALOG,
  type PermissionKey,
  type RoleRecord,
  type UserRoleSummary,
} from "@/lib/rbac-shared";

export type RoleWithDetails = RoleRecord & {
  permissions: PermissionKey[];
  permissionsCount: number;
  usersCount: number;
};

type SessionUser = {
  id: string;
  role?: string | null;
};

type SessionResult = Awaited<ReturnType<typeof auth.api.getSession>>;

type RoleRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_system: boolean;
};

type PermissionRow = {
  key: PermissionKey;
};

type EquipmentTypeRow = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

type EquipmentRow = {
  id: string;
  type_id: string;
  type_name: string;
  license_required: "A" | "B" | "C" | "D" | "E";
  name: string;
  model: string;
  brand: string;
  year: number;
  plate: string | null;
  created_at: string;
  updated_at: string;
};

type CompanyRow = {
  id: string;
  legal_name: string;
  trade_name: string | null;
  cnpj: string;
  email: string;
  phone: string;
  website: string | null;
  postal_code: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
  country: string;
  created_at: string;
  updated_at: string;
};

type ClientRow = {
  id: string;
  person_type: "PF" | "PJ";
  legal_name: string;
  trade_name: string | null;
  document: string;
  contact_name: string | null;
  contact_phone: string | null;
  email: string | null;
  phone: string;
  website: string | null;
  postal_code: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
  country: string;
  created_at: string;
  updated_at: string;
};

type UserAccessRow = {
  user_id: string;
  is_active: boolean;
  reason: string | null;
};

type UserAccessState = {
  isActive: boolean;
  reason: string | null;
};

const SYSTEM_ROLE_SLUGS = {
  admin: "admin",
  user: "user",
} as const;

let rbacBaseBootstrapPromise: Promise<void> | null = null;
let rbacBaseBootstrapped = false;

function normalizeLegacyRole(role?: string | null) {
  return role
    ?.split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean) ?? [];
}

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_access_status (
      user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
      is_active boolean NOT NULL DEFAULT true,
      reason text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id text PRIMARY KEY,
      name text NOT NULL,
      slug text NOT NULL UNIQUE,
      description text,
      is_system boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS permissions (
      id text PRIMARY KEY,
      resource text NOT NULL,
      action text NOT NULL,
      key text NOT NULL UNIQUE,
      description text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id text NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      permission_id text NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (role_id, permission_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      role_id text NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, role_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS equipment_types (
      id text PRIMARY KEY,
      name text NOT NULL,
      description text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS equipment_types_name_lower_idx
    ON equipment_types ((lower(name)));
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS equipment (
      id text PRIMARY KEY,
      type_id text NOT NULL REFERENCES equipment_types(id) ON DELETE RESTRICT,
      license_required text NOT NULL,
      name text NOT NULL,
      model text NOT NULL,
      brand text NOT NULL,
      year integer NOT NULL,
      plate text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS company (
      id text PRIMARY KEY,
      singleton_key boolean NOT NULL DEFAULT true UNIQUE,
      legal_name text NOT NULL,
      trade_name text,
      cnpj text NOT NULL,
      email text NOT NULL,
      phone text NOT NULL,
      website text,
      postal_code text NOT NULL,
      street text NOT NULL,
      number text NOT NULL,
      complement text,
      district text NOT NULL,
      city text NOT NULL,
      state text NOT NULL,
      country text NOT NULL DEFAULT 'Brasil',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS company_cnpj_idx
    ON company (cnpj);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id text PRIMARY KEY,
      person_type text NOT NULL,
      legal_name text NOT NULL,
      trade_name text,
      document text NOT NULL,
      contact_name text,
      contact_phone text,
      email text,
      phone text NOT NULL,
      website text,
      postal_code text NOT NULL,
      street text NOT NULL,
      number text NOT NULL,
      complement text,
      district text NOT NULL,
      city text NOT NULL,
      state text NOT NULL,
      country text NOT NULL DEFAULT 'Brasil',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS clients_document_idx
    ON clients (document);
  `);

  await pool.query(`
    ALTER TABLE clients
    ALTER COLUMN email DROP NOT NULL;
  `);

  await pool.query(`
    ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS contact_name text;
  `);

  await pool.query(`
    ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS contact_phone text;
  `);
}

function normalizeUserAccessState(row?: Partial<UserAccessRow> | null): UserAccessState {
  return {
    isActive: row?.is_active ?? true,
    reason: row?.reason ?? null,
  };
}

async function seedPermissions() {
  for (const permission of PERMISSION_CATALOG) {
    await pool.query(
      `
        INSERT INTO permissions (id, resource, action, key, description)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (key) DO UPDATE
        SET resource = EXCLUDED.resource,
            action = EXCLUDED.action,
            description = EXCLUDED.description
      `,
      [randomUUID(), permission.resource, permission.action, permission.key, permission.description],
    );
  }
}

async function ensureRole({
  name,
  slug,
  description,
  isSystem,
}: {
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
}) {
  const existing = await pool.query<RoleRow>(
    `SELECT id, name, slug, description, is_system FROM roles WHERE slug = $1 LIMIT 1`,
    [slug],
  );

  if (existing.rows[0]) {
    const row = existing.rows[0];
    await pool.query(
      `
        UPDATE roles
        SET name = $2,
            description = $3,
            is_system = $4,
            updated_at = now()
        WHERE id = $1
      `,
      [row.id, name, description, isSystem],
    );
    return row.id;
  }

  const id = randomUUID();
  await pool.query(
    `
      INSERT INTO roles (id, name, slug, description, is_system)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [id, name, slug, description, isSystem],
  );
  return id;
}

async function getPermissionIds(keys: readonly PermissionKey[]) {
  const rows = await pool.query<{ id: string; key: PermissionKey }>(
    `SELECT id, key FROM permissions WHERE key = ANY($1::text[])`,
    [keys],
  );

  const idsByKey = new Map(rows.rows.map((row) => [row.key, row.id]));
  return keys.map((key) => {
    const id = idsByKey.get(key);

    if (!id) {
      throw new Error(`Missing permission seed for ${key}`);
    }

    return id;
  });
}

async function syncRolePermissions(roleId: string, permissionKeys: readonly PermissionKey[]) {
  const permissionIds = await getPermissionIds(permissionKeys);

  await pool.query(`DELETE FROM role_permissions WHERE role_id = $1`, [roleId]);

  for (const permissionId of permissionIds) {
    await pool.query(
      `
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES ($1, $2)
        ON CONFLICT (role_id, permission_id) DO NOTHING
      `,
      [roleId, permissionId],
    );
  }
}

async function seedSystemRoles() {
  const adminRoleId = await ensureRole({
    name: "Admin",
    slug: SYSTEM_ROLE_SLUGS.admin,
    description: "Full system access.",
    isSystem: true,
  });

  const userRoleId = await ensureRole({
    name: "User",
    slug: SYSTEM_ROLE_SLUGS.user,
    description: "Default signed-in access.",
    isSystem: false,
  });

  await syncRolePermissions(adminRoleId, PERMISSION_CATALOG.map((permission) => permission.key));
  await syncRolePermissions(userRoleId, ["dashboard.read", "calendar.read"]);
}

async function assignRoleToUser(userId: string, roleSlug: string) {
  const role = await getRoleBySlug(roleSlug);

  if (!role) {
    throw new Error(`Role ${roleSlug} was not found.`);
  }

  await pool.query(
    `
      INSERT INTO user_roles (user_id, role_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, role_id) DO NOTHING
    `,
    [userId, role.id],
  );
}

async function listDirectUserRoleSlugs(userId: string) {
  const result = await pool.query<{ slug: string }>(
    `
      SELECT r.slug
      FROM user_roles ur
      INNER JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = $1
    `,
    [userId],
  );

  return result.rows.map((row) => row.slug);
}

async function ensureBootstrapUser(user?: SessionUser | null) {
  if (!user) {
    return;
  }

  const totalUsersResult = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM "user"`);
  const totalUsers = Number(totalUsersResult.rows[0]?.count ?? "0");

  if (totalUsers !== 1) {
    return;
  }

  const firstUserResult = await pool.query<{ id: string }>(
    `SELECT id FROM "user" ORDER BY "createdAt" ASC LIMIT 1`,
  );

  if (firstUserResult.rows[0]?.id !== user.id) {
    return;
  }

  await assignRoleToUser(user.id, SYSTEM_ROLE_SLUGS.admin);
  await ensureLegacyRoleSync(user.id);
}

async function ensureLegacyRoleSync(userId: string) {
  const roleSlugs = await getUserRoleSlugs(userId);
  const nextRole = roleSlugs.includes(SYSTEM_ROLE_SLUGS.admin) ? "admin" : "user";
  await pool.query(`UPDATE "user" SET role = $1 WHERE id = $2`, [nextRole, userId]);
}

export async function bootstrapRbac(user?: SessionUser | null) {
  if (!rbacBaseBootstrapped) {
    if (!rbacBaseBootstrapPromise) {
      rbacBaseBootstrapPromise = (async () => {
        await ensureSchema();
        await seedPermissions();
        await seedSystemRoles();
        rbacBaseBootstrapped = true;
      })().catch((error) => {
        rbacBaseBootstrapPromise = null;
        rbacBaseBootstrapped = false;
        throw error;
      });
    }

    await rbacBaseBootstrapPromise;
  }

  await ensureBootstrapUser(user);
}

export async function getRoleBySlug(slug: string) {
  await bootstrapRbac();
  const result = await pool.query<RoleRow>(
    `SELECT id, name, slug, description, is_system FROM roles WHERE slug = $1 LIMIT 1`,
    [slug],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return mapRoleRow(row);
}

function mapRoleRow(row: RoleRow): RoleRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    isSystem: row.is_system,
  };
}

function mapEquipmentTypeRow(
  row: EquipmentTypeRow & { equipment_count?: string | number },
) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    equipmentCount: Number(row.equipment_count ?? 0),
  };
}

function mapEquipmentRow(row: EquipmentRow) {
  return {
    id: row.id,
    typeId: row.type_id,
    typeName: row.type_name,
    licenseRequired: row.license_required,
    name: row.name,
    model: row.model,
    brand: row.brand,
    year: row.year,
    plate: row.plate,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCompanyRow(row: CompanyRow) {
  return {
    id: row.id,
    legalName: row.legal_name,
    tradeName: row.trade_name,
    cnpj: row.cnpj,
  email: row.email,
    phone: row.phone,
    website: row.website,
    postalCode: row.postal_code,
    street: row.street,
    number: row.number,
    complement: row.complement,
    district: row.district,
    city: row.city,
    state: row.state,
    country: row.country,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapClientRow(row: ClientRow) {
  return {
    id: row.id,
    personType: row.person_type,
    legalName: row.legal_name,
    tradeName: row.trade_name,
    document: row.document,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    email: row.email,
    phone: row.phone,
    website: row.website,
    postalCode: row.postal_code,
    street: row.street,
    number: row.number,
    complement: row.complement,
    district: row.district,
    city: row.city,
    state: row.state,
    country: row.country,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listAssignableRoles() {
  await bootstrapRbac();
  const result = await pool.query<RoleRow>(
    `
      SELECT id, name, slug, description, is_system
      FROM roles
      ORDER BY is_system DESC, name ASC
    `,
  );

  return result.rows.map(mapRoleRow);
}

export async function getCompany() {
  await bootstrapRbac();
  const result = await pool.query<CompanyRow>(
    `
      SELECT
        id,
        legal_name,
        trade_name,
        cnpj,
        email,
        phone,
        website,
        postal_code,
        street,
        number,
        complement,
        district,
        city,
        state,
        country,
        created_at,
        updated_at
      FROM company
      WHERE singleton_key = true
      LIMIT 1
    `,
  );

  const row = result.rows[0];
  return row ? mapCompanyRow(row) : null;
}

export async function upsertCompany(input: {
  legalName: string;
  tradeName?: string;
  cnpj: string;
  email: string;
  phone: string;
  website?: string;
  postalCode: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
  country: string;
}) {
  await bootstrapRbac();
  const existing = await getCompany();

  if (existing) {
    await pool.query(
      `
        UPDATE company
        SET legal_name = $2,
            trade_name = $3,
            cnpj = $4,
            email = $5,
            phone = $6,
            website = $7,
            postal_code = $8,
            street = $9,
            number = $10,
            complement = $11,
            district = $12,
            city = $13,
            state = $14,
            country = $15,
            updated_at = now()
        WHERE id = $1
      `,
      [
        existing.id,
        input.legalName.trim(),
        input.tradeName?.trim() || null,
        input.cnpj,
        input.email.trim().toLowerCase(),
        input.phone.trim(),
        input.website?.trim() || null,
        input.postalCode,
        input.street.trim(),
        input.number.trim(),
        input.complement?.trim() || null,
        input.district.trim(),
        input.city.trim(),
        input.state.trim(),
        input.country.trim() || "Brasil",
      ],
    );

    return existing.id;
  }

  const id = randomUUID();
  await pool.query(
    `
      INSERT INTO company (
        id,
        singleton_key,
        legal_name,
        trade_name,
        cnpj,
        email,
        phone,
        website,
        postal_code,
        street,
        number,
        complement,
        district,
        city,
        state,
        country
      )
      VALUES ($1, true, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `,
    [
      id,
      input.legalName.trim(),
      input.tradeName?.trim() || null,
      input.cnpj,
      input.email.trim().toLowerCase(),
      input.phone.trim(),
      input.website?.trim() || null,
      input.postalCode,
      input.street.trim(),
      input.number.trim(),
      input.complement?.trim() || null,
      input.district.trim(),
      input.city.trim(),
      input.state.trim(),
      input.country.trim() || "Brasil",
    ],
  );

  return id;
}

export async function listClients() {
  await bootstrapRbac();
  const result = await pool.query<ClientRow>(
    `
      SELECT
        id,
        person_type,
        legal_name,
        trade_name,
        document,
        contact_name,
        contact_phone,
        email,
        phone,
        website,
        postal_code,
        street,
        number,
        complement,
        district,
        city,
        state,
        country,
        created_at,
        updated_at
      FROM clients
      ORDER BY updated_at DESC, legal_name ASC
    `,
  );

  return result.rows.map(mapClientRow);
}

export async function getClientById(clientId: string) {
  await bootstrapRbac();
  const result = await pool.query<ClientRow>(
    `
      SELECT
        id,
        person_type,
        legal_name,
        trade_name,
        document,
        contact_name,
        contact_phone,
        email,
        phone,
        website,
        postal_code,
        street,
        number,
        complement,
        district,
        city,
        state,
        country,
        created_at,
        updated_at
      FROM clients
      WHERE id = $1
      LIMIT 1
    `,
    [clientId],
  );

  const row = result.rows[0];
  return row ? mapClientRow(row) : null;
}

export async function createClient(input: {
  personType: "PF" | "PJ";
  legalName: string;
  tradeName?: string;
  document: string;
  contactName?: string;
  contactPhone?: string;
  email?: string;
  phone: string;
  website?: string;
  postalCode: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
  country: string;
}) {
  await bootstrapRbac();
  const duplicate = await pool.query<{ id: string }>(
    `SELECT id FROM clients WHERE document = $1 LIMIT 1`,
    [input.document],
  );

  if (duplicate.rows[0]) {
    throw new Error("A client with this document already exists.");
  }

  const id = randomUUID();
  await pool.query(
    `
      INSERT INTO clients (
        id,
        person_type,
        legal_name,
        trade_name,
        document,
        contact_name,
        contact_phone,
        email,
        phone,
        website,
        postal_code,
        street,
        number,
        complement,
        district,
        city,
        state,
        country
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    `,
    [
      id,
      input.personType,
      input.legalName.trim(),
      input.tradeName?.trim() || null,
      input.document,
      input.contactName?.trim() || null,
      input.contactPhone?.trim() || null,
      input.email?.trim().toLowerCase() || null,
      input.phone.trim(),
      input.website?.trim() || null,
      input.postalCode,
      input.street.trim(),
      input.number.trim(),
      input.complement?.trim() || null,
      input.district.trim(),
      input.city.trim(),
      input.state.trim(),
      input.country.trim() || "Brasil",
    ],
  );

  return id;
}

export async function updateClient(
  clientId: string,
  input: {
    personType: "PF" | "PJ";
    legalName: string;
    tradeName?: string;
    document: string;
    contactName?: string;
    contactPhone?: string;
    email?: string;
    phone: string;
    website?: string;
    postalCode: string;
    street: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state: string;
    country: string;
  },
) {
  await bootstrapRbac();
  const current = await getClientById(clientId);

  if (!current) {
    throw new Error("Client not found.");
  }

  const duplicate = await pool.query<{ id: string }>(
    `SELECT id FROM clients WHERE document = $1 AND id <> $2 LIMIT 1`,
    [input.document, clientId],
  );

  if (duplicate.rows[0]) {
    throw new Error("A client with this document already exists.");
  }

  await pool.query(
    `
      UPDATE clients
      SET person_type = $2,
          legal_name = $3,
          trade_name = $4,
          document = $5,
          contact_name = $6,
          contact_phone = $7,
          email = $8,
          phone = $9,
          website = $10,
          postal_code = $11,
          street = $12,
          number = $13,
          complement = $14,
          district = $15,
          city = $16,
          state = $17,
          country = $18,
          updated_at = now()
      WHERE id = $1
    `,
    [
      clientId,
      input.personType,
      input.legalName.trim(),
      input.tradeName?.trim() || null,
      input.document,
      input.contactName?.trim() || null,
      input.contactPhone?.trim() || null,
      input.email?.trim().toLowerCase() || null,
      input.phone.trim(),
      input.website?.trim() || null,
      input.postalCode,
      input.street.trim(),
      input.number.trim(),
      input.complement?.trim() || null,
      input.district.trim(),
      input.city.trim(),
      input.state.trim(),
      input.country.trim() || "Brasil",
    ],
  );
}

export async function deleteClient(clientId: string) {
  await bootstrapRbac();
  const current = await getClientById(clientId);

  if (!current) {
    throw new Error("Client not found.");
  }

  await pool.query(`DELETE FROM clients WHERE id = $1`, [clientId]);
}

export async function listEquipmentTypes() {
  await bootstrapRbac();
  const result = await pool.query<EquipmentTypeRow & { equipment_count: string }>(
    `
      SELECT et.id, et.name, et.description, et.created_at, et.updated_at, COUNT(e.id)::text AS equipment_count
      FROM equipment_types et
      LEFT JOIN equipment e ON e.type_id = et.id
      GROUP BY et.id, et.name, et.description, et.created_at, et.updated_at
      ORDER BY et.name ASC
    `,
  );

  return result.rows.map(mapEquipmentTypeRow);
}

export async function getEquipmentTypeById(typeId: string) {
  await bootstrapRbac();
  const result = await pool.query<EquipmentTypeRow>(
    `
      SELECT id, name, description, created_at, updated_at
      FROM equipment_types
      WHERE id = $1
      LIMIT 1
    `,
    [typeId],
  );

  const row = result.rows[0];
  return row ? mapEquipmentTypeRow(row) : null;
}

export async function createEquipmentType(input: {
  name: string;
  description?: string;
}) {
  await bootstrapRbac();
  const duplicate = await pool.query<{ id: string }>(
    `SELECT id FROM equipment_types WHERE lower(name) = lower($1) LIMIT 1`,
    [input.name],
  );

  if (duplicate.rows[0]) {
    throw new Error("An equipment type with this name already exists.");
  }

  const id = randomUUID();
  await pool.query(
    `
      INSERT INTO equipment_types (id, name, description)
      VALUES ($1, $2, $3)
    `,
    [id, input.name.trim(), input.description?.trim() || null],
  );

  return id;
}

export async function updateEquipmentType(
  typeId: string,
  input: {
    name: string;
    description?: string;
  },
) {
  await bootstrapRbac();
  const current = await getEquipmentTypeById(typeId);

  if (!current) {
    throw new Error("Equipment type not found.");
  }

  const duplicate = await pool.query<{ id: string }>(
    `SELECT id FROM equipment_types WHERE lower(name) = lower($1) AND id <> $2 LIMIT 1`,
    [input.name, typeId],
  );

  if (duplicate.rows[0]) {
    throw new Error("An equipment type with this name already exists.");
  }

  await pool.query(
    `
      UPDATE equipment_types
      SET name = $2,
          description = $3,
          updated_at = now()
      WHERE id = $1
    `,
    [typeId, input.name.trim(), input.description?.trim() || null],
  );
}

export async function deleteEquipmentType(typeId: string) {
  await bootstrapRbac();
  const current = await getEquipmentTypeById(typeId);

  if (!current) {
    throw new Error("Equipment type not found.");
  }

  const inUse = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM equipment WHERE type_id = $1`,
    [typeId],
  );

  if (Number(inUse.rows[0]?.total ?? "0") > 0) {
    throw new Error("Remove equipment linked to this type before deleting it.");
  }

  await pool.query(`DELETE FROM equipment_types WHERE id = $1`, [typeId]);
}

export async function listEquipment() {
  await bootstrapRbac();
  const result = await pool.query<EquipmentRow>(
    `
      SELECT
        e.id,
        e.type_id,
        et.name AS type_name,
        e.license_required,
        e.name,
        e.model,
        e.brand,
        e.year,
        e.plate,
        e.created_at,
        e.updated_at
      FROM equipment e
      INNER JOIN equipment_types et ON et.id = e.type_id
      ORDER BY e.updated_at DESC, e.name ASC
    `,
  );

  return result.rows.map(mapEquipmentRow);
}

export async function getEquipmentById(equipmentId: string) {
  await bootstrapRbac();
  const result = await pool.query<EquipmentRow>(
    `
      SELECT
        e.id,
        e.type_id,
        et.name AS type_name,
        e.license_required,
        e.name,
        e.model,
        e.brand,
        e.year,
        e.plate,
        e.created_at,
        e.updated_at
      FROM equipment e
      INNER JOIN equipment_types et ON et.id = e.type_id
      WHERE e.id = $1
      LIMIT 1
    `,
    [equipmentId],
  );

  const row = result.rows[0];
  return row ? mapEquipmentRow(row) : null;
}

export async function createEquipment(input: {
  typeId: string;
  licenseRequired: "A" | "B" | "C" | "D" | "E";
  name: string;
  model: string;
  brand: string;
  year: number;
  plate?: string;
}) {
  await bootstrapRbac();
  const type = await getEquipmentTypeById(input.typeId);

  if (!type) {
    throw new Error("Equipment type not found.");
  }

  const id = randomUUID();
  await pool.query(
    `
      INSERT INTO equipment (id, type_id, license_required, name, model, brand, year, plate)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      id,
      input.typeId,
      input.licenseRequired,
      input.name.trim(),
      input.model.trim(),
      input.brand.trim(),
      input.year,
      input.plate?.trim() || null,
    ],
  );

  return id;
}

export async function updateEquipment(
  equipmentId: string,
  input: {
    typeId: string;
    licenseRequired: "A" | "B" | "C" | "D" | "E";
    name: string;
    model: string;
    brand: string;
    year: number;
    plate?: string;
  },
) {
  await bootstrapRbac();
  const current = await getEquipmentById(equipmentId);

  if (!current) {
    throw new Error("Equipment not found.");
  }

  const type = await getEquipmentTypeById(input.typeId);

  if (!type) {
    throw new Error("Equipment type not found.");
  }

  await pool.query(
    `
      UPDATE equipment
      SET type_id = $2,
          license_required = $3,
          name = $4,
          model = $5,
          brand = $6,
          year = $7,
          plate = $8,
          updated_at = now()
      WHERE id = $1
    `,
    [
      equipmentId,
      input.typeId,
      input.licenseRequired,
      input.name.trim(),
      input.model.trim(),
      input.brand.trim(),
      input.year,
      input.plate?.trim() || null,
    ],
  );
}

export async function deleteEquipment(equipmentId: string) {
  await bootstrapRbac();
  const current = await getEquipmentById(equipmentId);

  if (!current) {
    throw new Error("Equipment not found.");
  }

  await pool.query(`DELETE FROM equipment WHERE id = $1`, [equipmentId]);
}

export async function listRolesWithDetails(): Promise<RoleWithDetails[]> {
  await bootstrapRbac();
  const rolesResult = await pool.query<RoleRow>(
    `
      SELECT id, name, slug, description, is_system
      FROM roles
      ORDER BY is_system DESC, name ASC
    `,
  );

  const permissionResult = await pool.query<{ role_id: string; key: PermissionKey }>(
    `
      SELECT rp.role_id, p.key
      FROM role_permissions rp
      INNER JOIN permissions p ON p.id = rp.permission_id
    `,
  );

  const userCountResult = await pool.query<{ role_id: string; total: string }>(
    `
      SELECT role_id, COUNT(*)::text AS total
      FROM user_roles
      GROUP BY role_id
    `,
  );

  const permissionsByRole = new Map<string, PermissionKey[]>();
  for (const row of permissionResult.rows) {
    const current = permissionsByRole.get(row.role_id) ?? [];
    current.push(row.key);
    permissionsByRole.set(row.role_id, current);
  }

  const usersCountByRole = new Map(userCountResult.rows.map((row) => [row.role_id, Number(row.total)]));

  return rolesResult.rows.map((row) => {
    const role = mapRoleRow(row);
    const permissions = [...(permissionsByRole.get(role.id) ?? [])].sort();

    return {
      ...role,
      permissions,
      permissionsCount: permissions.length,
      usersCount: usersCountByRole.get(role.id) ?? 0,
    };
  });
}

export async function createRole(input: {
  name: string;
  slug: string;
  description?: string;
  permissionKeys: PermissionKey[];
}) {
  await bootstrapRbac();
  const existing = await getRoleBySlug(input.slug);

  if (existing) {
    throw new Error("A role with this slug already exists.");
  }

  const id = randomUUID();
  await pool.query(
    `
      INSERT INTO roles (id, name, slug, description, is_system)
      VALUES ($1, $2, $3, $4, false)
    `,
    [id, input.name, input.slug, input.description?.trim() || null],
  );

  await syncRolePermissions(id, input.permissionKeys);

  return id;
}

export async function updateRole(
  roleId: string,
  input: {
    name: string;
    slug: string;
    description?: string;
    permissionKeys: PermissionKey[];
  },
) {
  await bootstrapRbac();
  const current = await getRoleById(roleId);

  if (!current) {
    throw new Error("Role not found.");
  }

  if (current.isSystem) {
    throw new Error("System roles cannot be edited.");
  }

  const conflicting = await pool.query<RoleRow>(
    `SELECT id, name, slug, description, is_system FROM roles WHERE slug = $1 AND id <> $2 LIMIT 1`,
    [input.slug, roleId],
  );

  if (conflicting.rows[0]) {
    throw new Error("A role with this slug already exists.");
  }

  await pool.query(
    `
      UPDATE roles
      SET name = $2,
          slug = $3,
          description = $4,
          updated_at = now()
      WHERE id = $1
    `,
    [roleId, input.name, input.slug, input.description?.trim() || null],
  );

  await syncRolePermissions(roleId, input.permissionKeys);
}

export async function deleteRole(roleId: string) {
  await bootstrapRbac();
  const current = await getRoleById(roleId);

  if (!current) {
    throw new Error("Role not found.");
  }

  if (current.isSystem) {
    throw new Error("System roles cannot be deleted.");
  }

  const assignedUsers = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM user_roles WHERE role_id = $1`,
    [roleId],
  );

  if (Number(assignedUsers.rows[0]?.total ?? "0") > 0) {
    throw new Error("Remove this role from users before deleting it.");
  }

  await pool.query(`DELETE FROM roles WHERE id = $1`, [roleId]);
}

export async function getRoleById(roleId: string) {
  await bootstrapRbac();
  const result = await pool.query<RoleRow>(
    `SELECT id, name, slug, description, is_system FROM roles WHERE id = $1 LIMIT 1`,
    [roleId],
  );

  const row = result.rows[0];
  return row ? mapRoleRow(row) : null;
}

export async function getUserRoleAssignments(userId: string, legacyRole?: string | null): Promise<UserRoleSummary[]> {
  await bootstrapRbac();
  const result = await pool.query<RoleRow>(
    `
      SELECT r.id, r.name, r.slug, r.description, r.is_system
      FROM user_roles ur
      INNER JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = $1
      ORDER BY r.is_system DESC, r.name ASC
    `,
    [userId],
  );

  if (result.rows.length > 0) {
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      isSystem: row.is_system,
    }));
  }

  const fallbackRole = normalizeLegacyRole(legacyRole).includes(SYSTEM_ROLE_SLUGS.admin)
    ? SYSTEM_ROLE_SLUGS.admin
    : SYSTEM_ROLE_SLUGS.user;

  await assignRoleToUser(userId, fallbackRole);
  await ensureLegacyRoleSync(userId);
  return getUserRoleAssignments(userId);
}

export async function getUserAccessState(userId: string): Promise<UserAccessState | null> {
  await bootstrapRbac();
  const result = await pool.query<UserAccessRow>(
    `
      SELECT uas.user_id, uas.is_active, uas.reason
      FROM "user" u
      LEFT JOIN user_access_status uas ON uas.user_id = u.id
      WHERE u.id = $1
      LIMIT 1
    `,
    [userId],
  );

  const row = result.rows[0];
  return row ? normalizeUserAccessState(row) : null;
}

export async function getUserAccessStateByEmail(email: string): Promise<UserAccessState | null> {
  await bootstrapRbac();
  const result = await pool.query<UserAccessRow>(
    `
      SELECT uas.user_id, uas.is_active, uas.reason
      FROM "user" u
      LEFT JOIN user_access_status uas ON uas.user_id = u.id
      WHERE lower(u.email) = lower($1)
      LIMIT 1
    `,
    [email.trim()],
  );

  const row = result.rows[0];
  return row ? normalizeUserAccessState(row) : null;
}

export async function getUserAccessStateBatch(userIds: string[]): Promise<Map<string, UserAccessState>> {
  await bootstrapRbac();

  if (userIds.length === 0) {
    return new Map();
  }

  const uniqueUserIds = [...new Set(userIds)];
  const result = await pool.query<UserAccessRow>(
    `
      SELECT user_id, is_active, reason
      FROM user_access_status
      WHERE user_id = ANY($1::text[])
    `,
    [uniqueUserIds],
  );

  return new Map(result.rows.map((row) => [row.user_id, normalizeUserAccessState(row)]));
}

export async function setUserAccessState(userId: string, isActive: boolean, reason?: string | null) {
  await bootstrapRbac();
  await pool.query(
    `
      INSERT INTO user_access_status (user_id, is_active, reason)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id) DO UPDATE
      SET is_active = EXCLUDED.is_active,
          reason = EXCLUDED.reason,
          updated_at = now()
    `,
    [userId, isActive, isActive ? null : reason?.trim() || "Marked as inactive by administrator"],
  );
}

export async function getUserRoleAssignmentsBatch(
  users: Array<{ id: string; legacyRole?: string | null }>,
): Promise<Map<string, UserRoleSummary[]>> {
  await bootstrapRbac();

  if (users.length === 0) {
    return new Map();
  }

  const userIds = [...new Set(users.map((user) => user.id))];
  const result = await pool.query<RoleRow & { user_id: string }>(
    `
      SELECT ur.user_id, r.id, r.name, r.slug, r.description, r.is_system
      FROM user_roles ur
      INNER JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ANY($1::text[])
      ORDER BY r.is_system DESC, r.name ASC
    `,
    [userIds],
  );

  const rolesByUser = new Map<string, UserRoleSummary[]>();

  for (const row of result.rows) {
    const current = rolesByUser.get(row.user_id) ?? [];
    current.push({
      id: row.id,
      name: row.name,
      slug: row.slug,
      isSystem: row.is_system,
    });
    rolesByUser.set(row.user_id, current);
  }

  const fallbackRolesResult = await pool.query<RoleRow>(
    `SELECT id, name, slug, description, is_system FROM roles WHERE slug = ANY($1::text[])`,
    [[SYSTEM_ROLE_SLUGS.admin, SYSTEM_ROLE_SLUGS.user]],
  );

  const fallbackBySlug = new Map(fallbackRolesResult.rows.map((row) => [row.slug, row]));

  for (const user of users) {
    if (rolesByUser.has(user.id)) {
      continue;
    }

    const fallbackSlug = normalizeLegacyRole(user.legacyRole).includes(SYSTEM_ROLE_SLUGS.admin)
      ? SYSTEM_ROLE_SLUGS.admin
      : SYSTEM_ROLE_SLUGS.user;
    const fallbackRole = fallbackBySlug.get(fallbackSlug);

    if (!fallbackRole) {
      rolesByUser.set(user.id, []);
      continue;
    }

    rolesByUser.set(user.id, [{
      id: fallbackRole.id,
      name: fallbackRole.name,
      slug: fallbackRole.slug,
      isSystem: fallbackRole.is_system,
    }]);
  }

  return rolesByUser;
}

export async function getUserRoleSlugs(userId: string, legacyRole?: string | null) {
  const roles = await getUserRoleAssignments(userId, legacyRole);
  return roles.map((role) => role.slug);
}

export async function getUserPermissionKeys(userId: string, legacyRole?: string | null): Promise<PermissionKey[]> {
  const roles = await getUserRoleAssignments(userId, legacyRole);

  if (roles.some((role) => role.slug === SYSTEM_ROLE_SLUGS.admin)) {
    return PERMISSION_CATALOG.map((permission) => permission.key);
  }

  const result = await pool.query<PermissionRow>(
    `
      SELECT DISTINCT p.key
      FROM user_roles ur
      INNER JOIN role_permissions rp ON rp.role_id = ur.role_id
      INNER JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = $1
      ORDER BY p.key ASC
    `,
    [userId],
  );

  return result.rows.map((row) => row.key);
}

async function countAdminUsers() {
  const adminRole = await getRoleBySlug(SYSTEM_ROLE_SLUGS.admin);

  if (!adminRole) {
    return 0;
  }

  const result = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM user_roles WHERE role_id = $1`,
    [adminRole.id],
  );

  return Number(result.rows[0]?.total ?? "0");
}

export async function assignRolesToUser(userId: string, roleIdsOrSlugs: string[]) {
  await bootstrapRbac();
  const selectedRoles = roleIdsOrSlugs.length > 0 ? [...new Set(roleIdsOrSlugs)] : [SYSTEM_ROLE_SLUGS.user];

  const resolvedRoles: RoleRecord[] = [];
  for (const value of selectedRoles) {
    const byId = await getRoleById(value);
    const role = byId ?? await getRoleBySlug(value);

    if (!role) {
      throw new Error("One or more selected roles do not exist.");
    }

    resolvedRoles.push(role);
  }

  const currentRoleSlugs = await listDirectUserRoleSlugs(userId);
  const nextRoleSlugs = resolvedRoles.map((role) => role.slug);
  const isRemovingAdmin = currentRoleSlugs.includes(SYSTEM_ROLE_SLUGS.admin) && !nextRoleSlugs.includes(SYSTEM_ROLE_SLUGS.admin);

  if (isRemovingAdmin && await countAdminUsers() <= 1) {
    throw new Error("At least one admin user must remain assigned to the admin role.");
  }

  await pool.query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);

  for (const role of resolvedRoles) {
    await pool.query(
      `
        INSERT INTO user_roles (user_id, role_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, role_id) DO NOTHING
      `,
      [userId, role.id],
    );
  }

  await ensureLegacyRoleSync(userId);
}

export async function deleteUserRoleAssignments(userId: string) {
  await bootstrapRbac();
  const currentRoleSlugs = await listDirectUserRoleSlugs(userId);

  if (currentRoleSlugs.includes(SYSTEM_ROLE_SLUGS.admin) && await countAdminUsers() <= 1) {
    throw new Error("You cannot remove the last admin user.");
  }

  await pool.query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);
}

export async function getCurrentSessionState(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return null;
  }

  await bootstrapRbac({
    id: session.user.id,
    role: session.user.role,
  });

  const accessState = await getUserAccessState(session.user.id);
  const isBanned = Boolean(session.user.banned);

  if (isBanned || accessState?.isActive === false) {
    return {
      session,
      roles: [],
      permissions: [],
      accessState: {
        isActive: false,
        reason: isBanned
          ? session.user.banReason || "Your account is banned."
          : accessState?.reason || "Your account is inactive.",
      },
    };
  }

  const roles = await getUserRoleAssignments(session.user.id, session.user.role);
  const permissions = await getUserPermissionKeys(session.user.id, session.user.role);

  return {
    session,
    roles,
    permissions,
    accessState: {
      isActive: true,
      reason: null,
    },
  };
}

export async function requirePermission(request: Request, permission: PermissionKey) {
  const state = await getCurrentSessionState(request);

  if (!state) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!state.accessState.isActive) {
    return NextResponse.json(
      { error: state.accessState.reason || "Your account is inactive." },
      { status: 403 },
    );
  }

  if (!state.permissions.includes(permission)) {
    return NextResponse.json({ error: "You do not have permission to perform this action." }, { status: 403 });
  }

  return state;
}
