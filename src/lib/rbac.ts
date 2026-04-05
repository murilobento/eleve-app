import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { auth, pool } from "@/lib/auth";
import {
  calculateBudgetSubtotal,
  calculateBudgetTotal,
  type BudgetServiceItemInput,
  type BudgetTransitionStatus,
  type ManagedBudget,
  type ManagedBudgetItem,
} from "@/lib/budgets-admin";
import {
  PERMISSION_CATALOG,
  type PermissionKey,
  type RoleRecord,
  type UserRoleSummary,
} from "@/lib/rbac-shared";
import type { EquipmentOption } from "@/lib/equipment-admin";
import type { ManagedServiceType } from "@/lib/service-types-admin";

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
  status: "active" | "inactive";
  license_required: "A" | "B" | "C" | "D" | "E";
  name: string;
  model: string;
  brand: string;
  year: number;
  plate: string | null;
  lifting_capacity_tons: number | null;
  created_at: string;
  updated_at: string;
};

type ServiceTypeRow = {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "inactive";
  billing_unit:
    | "hour"
    | "daily"
    | "monthly"
    | "annual"
    | "km"
    | "freight"
    | "mobilization_demobilization"
    | "counterweight_transport";
  base_value: string | number;
  minimum_hours: string | number | null;
  minimum_km: string | number | null;
  created_at: string;
  updated_at: string;
  equipment_ids?: string[] | null;
  equipment_json?: string | null;
  equipment_count?: string | number;
};

type CompanyRow = {
  id: string;
  app_name: string | null;
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
  status: "active" | "inactive";
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

type OperatorRow = {
  id: string;
  name: string;
  phone: string;
  license: "A" | "B" | "C" | "D" | "E";
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

type BudgetRow = {
  id: string;
  number: string;
  status: "pending" | "approved" | "cancelled";
  client_id: string;
  client_name: string;
  service_postal_code: string;
  service_street: string;
  service_number: string;
  service_complement: string | null;
  service_district: string;
  service_city: string;
  service_state: string;
  service_country: string;
  subtotal_value: string | number;
  manual_adjustment: string | number;
  total_value: string | number;
  item_count: string | number;
  items_json: string;
  notes: string | null;
  approved_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

type BudgetItemRow = {
  id: string;
  position: number;
  service_type_id: string;
  service_type_name: string;
  service_type_billing_unit: string;
  equipment_id: string;
  equipment_name: string;
  equipment_brand: string;
  equipment_model: string;
  operator_id: string;
  operator_name: string;
  service_description: string;
  service_date: string;
  start_time: string;
  end_time: string;
  base_value: string | number;
  minimum_hours: string | number | null;
  minimum_km: string | number | null;
  initial_value: string | number;
  created_at: string;
  updated_at: string;
};

type BudgetServiceTypeSnapshotRow = {
  id: string;
  billing_unit: ServiceTypeRow["billing_unit"];
  base_value: string | number;
  minimum_hours: string | number | null;
  minimum_km: string | number | null;
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
      status text NOT NULL DEFAULT 'active',
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
      app_name text,
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
    ALTER TABLE company
    ADD COLUMN IF NOT EXISTS app_name text;
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS company_cnpj_idx
    ON company (cnpj);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id text PRIMARY KEY,
      person_type text NOT NULL,
      status text NOT NULL DEFAULT 'active',
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
    ALTER TABLE equipment
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
  `);

  await pool.query(`
    ALTER TABLE equipment
    ADD COLUMN IF NOT EXISTS lifting_capacity_tons double precision;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS service_types (
      id text PRIMARY KEY,
      name text NOT NULL,
      description text,
      status text NOT NULL DEFAULT 'active',
      billing_unit text NOT NULL,
      base_value numeric(12, 2) NOT NULL,
      minimum_hours numeric(12, 2),
      minimum_km numeric(12, 2),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS service_types_name_lower_idx
    ON service_types ((lower(name)));
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS service_type_equipment (
      service_type_id text NOT NULL REFERENCES service_types(id) ON DELETE CASCADE,
      equipment_id text NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (service_type_id, equipment_id)
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS service_type_equipment_equipment_idx
    ON service_type_equipment (equipment_id);
  `);

  await pool.query(`
    ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS operators (
      id text PRIMARY KEY,
      name text NOT NULL,
      phone text NOT NULL,
      license text NOT NULL,
      status text NOT NULL DEFAULT 'active',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    ALTER TABLE operators
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS budgets (
      id text PRIMARY KEY,
      number text NOT NULL,
      status text NOT NULL DEFAULT 'pending',
      client_id text NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
      equipment_id text NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
      service_type_id text NOT NULL REFERENCES service_types(id) ON DELETE RESTRICT,
      operator_id text NOT NULL REFERENCES operators(id) ON DELETE RESTRICT,
      service_description text NOT NULL,
      service_date date NOT NULL,
      start_time time NOT NULL,
      end_time time NOT NULL,
      service_postal_code text NOT NULL,
      service_street text NOT NULL,
      service_number text NOT NULL,
      service_complement text,
      service_district text NOT NULL,
      service_city text NOT NULL,
      service_state text NOT NULL,
      service_country text NOT NULL DEFAULT 'Brasil',
      initial_value numeric(12, 2) NOT NULL,
      notes text,
      approved_at timestamptz,
      cancelled_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    ALTER TABLE budgets
    ADD COLUMN IF NOT EXISTS manual_adjustment numeric(12, 2) NOT NULL DEFAULT 0;
  `);

  await pool.query(`
    ALTER TABLE budgets
    ADD COLUMN IF NOT EXISTS subtotal_value numeric(12, 2);
  `);

  await pool.query(`
    ALTER TABLE budgets
    ADD COLUMN IF NOT EXISTS total_value numeric(12, 2);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS budget_items (
      id text PRIMARY KEY,
      budget_id text NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
      position integer NOT NULL DEFAULT 0,
      service_type_id text NOT NULL REFERENCES service_types(id) ON DELETE RESTRICT,
      equipment_id text NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
      operator_id text NOT NULL REFERENCES operators(id) ON DELETE RESTRICT,
      service_description text NOT NULL,
      service_date date NOT NULL,
      start_time time NOT NULL,
      end_time time NOT NULL,
      billing_unit text NOT NULL,
      base_value numeric(12, 2) NOT NULL,
      minimum_hours numeric(12, 2),
      minimum_km numeric(12, 2),
      initial_value numeric(12, 2) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS budget_items_budget_position_idx
    ON budget_items (budget_id, position);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS budget_items_budget_id_idx
    ON budget_items (budget_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS budget_items_service_type_id_idx
    ON budget_items (service_type_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS budget_items_equipment_id_idx
    ON budget_items (equipment_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS budget_items_operator_id_idx
    ON budget_items (operator_id);
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS budgets_number_idx
    ON budgets (number);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS budgets_status_idx
    ON budgets (status);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS budgets_client_id_idx
    ON budgets (client_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS budgets_equipment_id_idx
    ON budgets (equipment_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS budgets_service_type_id_idx
    ON budgets (service_type_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS budgets_operator_id_idx
    ON budgets (operator_id);
  `);

  const legacyBudgetItems = await pool.query<{
    budget_id: string;
    service_type_id: string;
    equipment_id: string;
    operator_id: string;
    service_description: string;
    service_date: string;
    start_time: string;
    end_time: string;
    initial_value: string | number;
    created_at: string;
    updated_at: string;
    billing_unit: ServiceTypeRow["billing_unit"];
    base_value: string | number;
    minimum_hours: string | number | null;
    minimum_km: string | number | null;
  }>(
    `
      SELECT
        b.id AS budget_id,
        b.service_type_id,
        b.equipment_id,
        b.operator_id,
        b.service_description,
        b.service_date::text,
        b.start_time::text,
        b.end_time::text,
        b.initial_value::text,
        b.created_at,
        b.updated_at,
        st.billing_unit,
        st.base_value::text,
        st.minimum_hours::text,
        st.minimum_km::text
      FROM budgets b
      INNER JOIN service_types st ON st.id = b.service_type_id
      LEFT JOIN budget_items bi ON bi.budget_id = b.id
      WHERE bi.id IS NULL
    `,
  );

  if (legacyBudgetItems.rows.length > 0) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      for (const row of legacyBudgetItems.rows) {
        await client.query(
          `
            INSERT INTO budget_items (
              id,
              budget_id,
              position,
              service_type_id,
              equipment_id,
              operator_id,
              service_description,
              service_date,
              start_time,
              end_time,
              billing_unit,
              base_value,
              minimum_hours,
              minimum_km,
              initial_value,
              created_at,
              updated_at
            )
            VALUES ($1, $2, 0, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          `,
          [
            randomUUID(),
            row.budget_id,
            row.service_type_id,
            row.equipment_id,
            row.operator_id,
            row.service_description,
            row.service_date,
            row.start_time,
            row.end_time,
            row.billing_unit,
            row.base_value,
            row.minimum_hours,
            row.minimum_km,
            row.initial_value,
            row.created_at,
            row.updated_at,
          ],
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  await pool.query(`
    UPDATE budget_items
    SET initial_value = ROUND((base_value * minimum_hours)::numeric, 2),
        updated_at = now()
    WHERE billing_unit = 'hour'
      AND minimum_hours IS NOT NULL
      AND minimum_hours > 1
      AND initial_value = base_value;
  `);

  await pool.query(`
    UPDATE budgets b
    SET initial_value = bi.initial_value,
        updated_at = now()
    FROM budget_items bi
    WHERE bi.budget_id = b.id
      AND bi.position = 0
      AND b.initial_value IS DISTINCT FROM bi.initial_value;
  `);

  await pool.query(`
    UPDATE budgets b
    SET subtotal_value = COALESCE(items.subtotal_value, b.initial_value),
        total_value = COALESCE(items.subtotal_value, b.initial_value) + COALESCE(b.manual_adjustment, 0)
    FROM (
      SELECT budget_id, SUM(initial_value)::numeric(12, 2) AS subtotal_value
      FROM budget_items
      GROUP BY budget_id
    ) items
    WHERE b.id = items.budget_id
      AND (
        b.subtotal_value IS DISTINCT FROM items.subtotal_value
        OR b.total_value IS DISTINCT FROM (items.subtotal_value + COALESCE(b.manual_adjustment, 0))
      );
  `);

  await pool.query(`
    UPDATE budgets
    SET subtotal_value = COALESCE(subtotal_value, initial_value),
        total_value = COALESCE(total_value, COALESCE(subtotal_value, initial_value) + COALESCE(manual_adjustment, 0))
    WHERE subtotal_value IS NULL OR total_value IS NULL;
  `);
}

function normalizeUserAccessState(row?: Partial<UserAccessRow> | null): UserAccessState {
  return {
    isActive: row?.is_active ?? true,
    reason: row?.reason ?? null,
  };
}

function normalizeRoleName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function slugifyRoleName(name: string) {
  const base = normalizeRoleName(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || "role";
}

async function findConflictingRoleByName(name: string, excludeRoleId?: string) {
  const params = excludeRoleId ? [name, excludeRoleId] : [name];
  const query = excludeRoleId
    ? `SELECT id FROM roles WHERE lower(name) = lower($1) AND id <> $2 LIMIT 1`
    : `SELECT id FROM roles WHERE lower(name) = lower($1) LIMIT 1`;
  const result = await pool.query<{ id: string }>(query, params);
  return result.rows[0]?.id ?? null;
}

async function generateUniqueRoleSlug(name: string, excludeRoleId?: string) {
  const baseSlug = slugifyRoleName(name);
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const params = excludeRoleId ? [candidate, excludeRoleId] : [candidate];
    const query = excludeRoleId
      ? `SELECT id FROM roles WHERE slug = $1 AND id <> $2 LIMIT 1`
      : `SELECT id FROM roles WHERE slug = $1 LIMIT 1`;
    const result = await pool.query<{ id: string }>(query, params);

    if (!result.rows[0]) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
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
    status: row.status,
    licenseRequired: row.license_required,
    name: row.name,
    model: row.model,
    brand: row.brand,
    year: row.year,
    plate: row.plate,
    liftingCapacityTons: row.lifting_capacity_tons,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapServiceTypeRow(row: ServiceTypeRow): ManagedServiceType {
  const equipment = row.equipment_json ? JSON.parse(row.equipment_json) as ManagedServiceType["equipment"] : [];

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    billingUnit: row.billing_unit,
    baseValue: Number(row.base_value),
    minimumHours: row.minimum_hours == null ? null : Number(row.minimum_hours),
    minimumKm: row.minimum_km == null ? null : Number(row.minimum_km),
    equipmentIds: row.equipment_ids ?? equipment.map((item) => item.id),
    equipment,
    equipmentCount: Number(row.equipment_count ?? equipment.length),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCompanyRow(row: CompanyRow) {
  return {
    id: row.id,
    appName: row.app_name,
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
    status: row.status,
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

function mapOperatorRow(row: OperatorRow) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    license: row.license,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBudgetItemRow(row: BudgetItemRow): ManagedBudgetItem {
  return {
    id: row.id,
    position: Number(row.position),
    serviceTypeId: row.service_type_id,
    serviceTypeName: row.service_type_name,
    serviceTypeBillingUnit: row.service_type_billing_unit,
    equipmentId: row.equipment_id,
    equipmentName: row.equipment_name,
    equipmentBrand: row.equipment_brand,
    equipmentModel: row.equipment_model,
    operatorId: row.operator_id,
    operatorName: row.operator_name,
    serviceDescription: row.service_description,
    serviceDate: row.service_date.slice(0, 10),
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    baseValue: Number(row.base_value),
    minimumHours: row.minimum_hours === null ? null : Number(row.minimum_hours),
    minimumKm: row.minimum_km === null ? null : Number(row.minimum_km),
    initialValue: Number(row.initial_value),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBudgetRow(row: BudgetRow): ManagedBudget {
  const items = JSON.parse(row.items_json || "[]") as BudgetItemRow[];

  return {
    id: row.id,
    number: row.number,
    status: row.status,
    clientId: row.client_id,
    clientName: row.client_name,
    servicePostalCode: row.service_postal_code,
    serviceStreet: row.service_street,
    serviceNumber: row.service_number,
    serviceComplement: row.service_complement,
    serviceDistrict: row.service_district,
    serviceCity: row.service_city,
    serviceState: row.service_state,
    serviceCountry: row.service_country,
    subtotalValue: Number(row.subtotal_value),
    manualAdjustment: Number(row.manual_adjustment),
    totalValue: Number(row.total_value),
    itemCount: Number(row.item_count),
    items: items.map(mapBudgetItemRow),
    notes: row.notes,
    approvedAt: row.approved_at,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function formatBudgetNumber(sequence: number) {
  return `ORC-${sequence.toString().padStart(6, "0")}`;
}

async function assertBudgetRelationsExist(input: {
  clientId: string;
  items: BudgetServiceItemInput[];
}) {
  const serviceTypeIds = [...new Set(input.items.map((item) => item.serviceTypeId))];
  const equipmentIds = [...new Set(input.items.map((item) => item.equipmentId))];
  const operatorIds = [...new Set(input.items.map((item) => item.operatorId))];

  const [clientResult, equipmentResult, serviceTypeResult, operatorResult] = await Promise.all([
    pool.query<{ id: string }>(`SELECT id FROM clients WHERE id = $1 LIMIT 1`, [input.clientId]),
    pool.query<{ id: string }>(`SELECT id FROM equipment WHERE id = ANY($1::text[])`, [equipmentIds]),
    pool.query<BudgetServiceTypeSnapshotRow>(
      `
        SELECT id, billing_unit, base_value::text, minimum_hours::text, minimum_km::text
        FROM service_types
        WHERE id = ANY($1::text[])
      `,
      [serviceTypeIds],
    ),
    pool.query<{ id: string }>(`SELECT id FROM operators WHERE id = ANY($1::text[])`, [operatorIds]),
  ]);

  if (!clientResult.rows[0]) {
    throw new Error("Client not found.");
  }

  if (equipmentResult.rows.length !== equipmentIds.length) {
    throw new Error("One or more equipment items were not found.");
  }

  if (serviceTypeResult.rows.length !== serviceTypeIds.length) {
    throw new Error("One or more service types were not found.");
  }

  if (operatorResult.rows.length !== operatorIds.length) {
    throw new Error("One or more operators were not found.");
  }

  return new Map(serviceTypeResult.rows.map((row) => [row.id, row]));
}

function getPrimaryBudgetItem(items: BudgetServiceItemInput[]) {
  const primaryItem = items[0];

  if (!primaryItem) {
    throw new Error("Add at least one service item.");
  }

  return primaryItem;
}

function normalizeBudgetItemValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

async function replaceBudgetItems(
  client: { query: (queryText: string, values?: unknown[]) => Promise<unknown> },
  budgetId: string,
  items: BudgetServiceItemInput[],
  serviceTypeMap: Map<string, BudgetServiceTypeSnapshotRow>,
) {
  await client.query(`DELETE FROM budget_items WHERE budget_id = $1`, [budgetId]);

  for (const [index, item] of items.entries()) {
    const serviceType = serviceTypeMap.get(item.serviceTypeId);

    if (!serviceType) {
      throw new Error("Service type not found.");
    }

    await client.query(
      `
        INSERT INTO budget_items (
          id,
          budget_id,
          position,
          service_type_id,
          equipment_id,
          operator_id,
          service_description,
          service_date,
          start_time,
          end_time,
          billing_unit,
          base_value,
          minimum_hours,
          minimum_km,
          initial_value
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `,
      [
        randomUUID(),
        budgetId,
        index,
        item.serviceTypeId,
        item.equipmentId,
        item.operatorId,
        item.serviceDescription.trim(),
        item.serviceDate,
        item.startTime,
        item.endTime,
        serviceType.billing_unit,
        Number(serviceType.base_value),
        normalizeBudgetItemValue(serviceType.minimum_hours),
        normalizeBudgetItemValue(serviceType.minimum_km),
        item.initialValue,
      ],
    );
  }
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
        app_name,
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
  appName?: string;
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
        SET app_name = $2,
            legal_name = $3,
            trade_name = $4,
            cnpj = $5,
            email = $6,
            phone = $7,
            website = $8,
            postal_code = $9,
            street = $10,
            number = $11,
            complement = $12,
            district = $13,
            city = $14,
            state = $15,
            country = $16,
            updated_at = now()
        WHERE id = $1
      `,
      [
        existing.id,
        input.appName?.trim() || null,
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
        app_name,
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
      VALUES ($1, true, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `,
    [
      id,
      input.appName?.trim() || null,
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
        status,
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
        status,
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
  status: "active" | "inactive";
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
        status,
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
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    `,
    [
      id,
      input.personType,
      input.status,
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
    status: "active" | "inactive";
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
          status = $3,
          legal_name = $4,
          trade_name = $5,
          document = $6,
          contact_name = $7,
          contact_phone = $8,
          email = $9,
          phone = $10,
          website = $11,
          postal_code = $12,
          street = $13,
          number = $14,
          complement = $15,
          district = $16,
          city = $17,
          state = $18,
          country = $19,
          updated_at = now()
      WHERE id = $1
    `,
    [
      clientId,
      input.personType,
      input.status,
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

  const budgetsCount = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM budgets WHERE client_id = $1`,
    [clientId],
  );

  if (Number(budgetsCount.rows[0]?.total ?? "0") > 0) {
    throw new Error("Remove budgets linked to this client before deleting it.");
  }

  await pool.query(`DELETE FROM clients WHERE id = $1`, [clientId]);
}

export async function listOperators() {
  await bootstrapRbac();
  const result = await pool.query<OperatorRow>(
    `
      SELECT
        id,
        name,
        phone,
        license,
        status,
        created_at,
        updated_at
      FROM operators
      ORDER BY updated_at DESC, name ASC
    `,
  );

  return result.rows.map(mapOperatorRow);
}

export async function getOperatorById(operatorId: string) {
  await bootstrapRbac();
  const result = await pool.query<OperatorRow>(
    `
      SELECT
        id,
        name,
        phone,
        license,
        status,
        created_at,
        updated_at
      FROM operators
      WHERE id = $1
      LIMIT 1
    `,
    [operatorId],
  );

  const row = result.rows[0];
  return row ? mapOperatorRow(row) : null;
}

export async function createOperator(input: {
  name: string;
  phone: string;
  license: "A" | "B" | "C" | "D" | "E";
  status: "active" | "inactive";
}) {
  await bootstrapRbac();
  const id = randomUUID();

  await pool.query(
    `
      INSERT INTO operators (
        id,
        name,
        phone,
        license,
        status
      )
      VALUES ($1, $2, $3, $4, $5)
    `,
    [
      id,
      input.name.trim(),
      input.phone.trim(),
      input.license,
      input.status,
    ],
  );

  return id;
}

export async function updateOperator(
  operatorId: string,
  input: {
    name: string;
    phone: string;
    license: "A" | "B" | "C" | "D" | "E";
    status: "active" | "inactive";
  },
) {
  await bootstrapRbac();
  const current = await getOperatorById(operatorId);

  if (!current) {
    throw new Error("Operator not found.");
  }

  await pool.query(
    `
      UPDATE operators
      SET name = $2,
          phone = $3,
          license = $4,
          status = $5,
          updated_at = now()
      WHERE id = $1
    `,
    [
      operatorId,
      input.name.trim(),
      input.phone.trim(),
      input.license,
      input.status,
    ],
  );
}

export async function deleteOperator(operatorId: string) {
  await bootstrapRbac();
  const current = await getOperatorById(operatorId);

  if (!current) {
    throw new Error("Operator not found.");
  }

  const budgetsCount = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM budget_items WHERE operator_id = $1`,
    [operatorId],
  );

  if (Number(budgetsCount.rows[0]?.total ?? "0") > 0) {
    throw new Error("Remove budgets linked to this operator before deleting it.");
  }

  await pool.query(`DELETE FROM operators WHERE id = $1`, [operatorId]);
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
        e.status,
        e.license_required,
        e.name,
        e.model,
        e.brand,
        e.year,
        e.plate,
        e.lifting_capacity_tons,
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
        e.status,
        e.license_required,
        e.name,
        e.model,
        e.brand,
        e.year,
        e.plate,
        e.lifting_capacity_tons,
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
  status: "active" | "inactive";
  licenseRequired: "A" | "B" | "C" | "D" | "E";
  name: string;
  model: string;
  brand: string;
  year: number;
  plate?: string;
  liftingCapacityTons?: number;
}) {
  await bootstrapRbac();
  const type = await getEquipmentTypeById(input.typeId);

  if (!type) {
    throw new Error("Equipment type not found.");
  }

  const id = randomUUID();
  await pool.query(
    `
      INSERT INTO equipment (id, type_id, status, license_required, name, model, brand, year, plate, lifting_capacity_tons)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
    [
      id,
      input.typeId,
      input.status,
      input.licenseRequired,
      input.name.trim(),
      input.model.trim(),
      input.brand.trim(),
      input.year,
      input.plate?.trim() || null,
      input.liftingCapacityTons ?? null,
    ],
  );

  return id;
}

export async function updateEquipment(
  equipmentId: string,
  input: {
    typeId: string;
    status: "active" | "inactive";
    licenseRequired: "A" | "B" | "C" | "D" | "E";
    name: string;
    model: string;
    brand: string;
    year: number;
    plate?: string;
    liftingCapacityTons?: number;
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
          status = $3,
          license_required = $4,
          name = $5,
          model = $6,
          brand = $7,
          year = $8,
          plate = $9,
          lifting_capacity_tons = $10,
          updated_at = now()
      WHERE id = $1
    `,
    [
      equipmentId,
      input.typeId,
      input.status,
      input.licenseRequired,
      input.name.trim(),
      input.model.trim(),
      input.brand.trim(),
      input.year,
      input.plate?.trim() || null,
      input.liftingCapacityTons ?? null,
    ],
  );
}

export async function deleteEquipment(equipmentId: string) {
  await bootstrapRbac();
  const current = await getEquipmentById(equipmentId);

  if (!current) {
    throw new Error("Equipment not found.");
  }

  const budgetsCount = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM budget_items WHERE equipment_id = $1`,
    [equipmentId],
  );

  if (Number(budgetsCount.rows[0]?.total ?? "0") > 0) {
    throw new Error("Remove budgets linked to this equipment before deleting it.");
  }

  await pool.query(`DELETE FROM equipment WHERE id = $1`, [equipmentId]);
}

export async function listEquipmentOptions(): Promise<EquipmentOption[]> {
  await bootstrapRbac();
  const result = await pool.query<Pick<EquipmentRow, "id" | "name" | "brand" | "model">>(
    `
      SELECT id, name, brand, model
      FROM equipment
      ORDER BY name ASC, brand ASC, model ASC
    `,
  );

  return result.rows;
}

export async function listServiceTypes() {
  await bootstrapRbac();
  const result = await pool.query<ServiceTypeRow>(
    `
      SELECT
        st.id,
        st.name,
        st.description,
        st.status,
        st.billing_unit,
        st.base_value::text,
        st.minimum_hours::text,
        st.minimum_km::text,
        st.created_at,
        st.updated_at,
        COALESCE(array_agg(ste.equipment_id ORDER BY e.name, e.brand, e.model) FILTER (WHERE ste.equipment_id IS NOT NULL), '{}') AS equipment_ids,
        COALESCE(
          json_agg(
            json_build_object(
              'id', e.id,
              'name', e.name,
              'brand', e.brand,
              'model', e.model
            )
            ORDER BY e.name, e.brand, e.model
          ) FILTER (WHERE e.id IS NOT NULL),
          '[]'::json
        )::text AS equipment_json,
        COUNT(ste.equipment_id)::text AS equipment_count
      FROM service_types st
      LEFT JOIN service_type_equipment ste ON ste.service_type_id = st.id
      LEFT JOIN equipment e ON e.id = ste.equipment_id
      GROUP BY st.id, st.name, st.description, st.status, st.billing_unit, st.base_value, st.minimum_hours, st.minimum_km, st.created_at, st.updated_at
      ORDER BY st.updated_at DESC, st.name ASC
    `,
  );

  return result.rows.map(mapServiceTypeRow);
}

export async function getServiceTypeById(serviceTypeId: string) {
  await bootstrapRbac();
  const result = await pool.query<ServiceTypeRow>(
    `
      SELECT
        st.id,
        st.name,
        st.description,
        st.status,
        st.billing_unit,
        st.base_value::text,
        st.minimum_hours::text,
        st.minimum_km::text,
        st.created_at,
        st.updated_at,
        COALESCE(array_agg(ste.equipment_id ORDER BY e.name, e.brand, e.model) FILTER (WHERE ste.equipment_id IS NOT NULL), '{}') AS equipment_ids,
        COALESCE(
          json_agg(
            json_build_object(
              'id', e.id,
              'name', e.name,
              'brand', e.brand,
              'model', e.model
            )
            ORDER BY e.name, e.brand, e.model
          ) FILTER (WHERE e.id IS NOT NULL),
          '[]'::json
        )::text AS equipment_json,
        COUNT(ste.equipment_id)::text AS equipment_count
      FROM service_types st
      LEFT JOIN service_type_equipment ste ON ste.service_type_id = st.id
      LEFT JOIN equipment e ON e.id = ste.equipment_id
      WHERE st.id = $1
      GROUP BY st.id, st.name, st.description, st.status, st.billing_unit, st.base_value, st.minimum_hours, st.minimum_km, st.created_at, st.updated_at
      LIMIT 1
    `,
    [serviceTypeId],
  );

  const row = result.rows[0];
  return row ? mapServiceTypeRow(row) : null;
}

async function assertEquipmentIdsExist(equipmentIds: string[]) {
  if (equipmentIds.length === 0) {
    return;
  }

  const result = await pool.query<{ id: string }>(
    `SELECT id FROM equipment WHERE id = ANY($1::text[])`,
    [equipmentIds],
  );

  if (result.rows.length !== new Set(equipmentIds).size) {
    throw new Error("One or more linked equipment items were not found.");
  }
}

export async function createServiceType(input: {
  name: string;
  description?: string;
  status: "active" | "inactive";
  billingUnit:
    | "hour"
    | "daily"
    | "monthly"
    | "annual"
    | "km"
    | "freight"
    | "mobilization_demobilization"
    | "counterweight_transport";
  baseValue: number;
  minimumHours?: number;
  minimumKm?: number;
  equipmentIds: string[];
}) {
  await bootstrapRbac();
  const duplicate = await pool.query<{ id: string }>(
    `SELECT id FROM service_types WHERE lower(name) = lower($1) LIMIT 1`,
    [input.name],
  );

  if (duplicate.rows[0]) {
    throw new Error("A service type with this name already exists.");
  }

  const equipmentIds = [...new Set(input.equipmentIds)];
  await assertEquipmentIdsExist(equipmentIds);

  const id = randomUUID();
  await pool.query(
    `
      INSERT INTO service_types (id, name, description, status, billing_unit, base_value, minimum_hours, minimum_km)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      id,
      input.name.trim(),
      input.description?.trim() || null,
      input.status,
      input.billingUnit,
      input.baseValue,
      input.minimumHours ?? null,
      input.minimumKm ?? null,
    ],
  );

  for (const equipmentId of equipmentIds) {
    await pool.query(
      `
        INSERT INTO service_type_equipment (service_type_id, equipment_id)
        VALUES ($1, $2)
      `,
      [id, equipmentId],
    );
  }

  return id;
}

export async function updateServiceType(
  serviceTypeId: string,
  input: {
    name: string;
    description?: string;
    status: "active" | "inactive";
    billingUnit:
      | "hour"
      | "daily"
      | "monthly"
      | "annual"
      | "km"
      | "freight"
      | "mobilization_demobilization"
      | "counterweight_transport";
    baseValue: number;
    minimumHours?: number;
    minimumKm?: number;
    equipmentIds: string[];
  },
) {
  await bootstrapRbac();
  const current = await getServiceTypeById(serviceTypeId);

  if (!current) {
    throw new Error("Service type not found.");
  }

  const duplicate = await pool.query<{ id: string }>(
    `SELECT id FROM service_types WHERE lower(name) = lower($1) AND id <> $2 LIMIT 1`,
    [input.name, serviceTypeId],
  );

  if (duplicate.rows[0]) {
    throw new Error("A service type with this name already exists.");
  }

  const equipmentIds = [...new Set(input.equipmentIds)];
  await assertEquipmentIdsExist(equipmentIds);

  await pool.query(
    `
      UPDATE service_types
      SET name = $2,
          description = $3,
          status = $4,
          billing_unit = $5,
          base_value = $6,
          minimum_hours = $7,
          minimum_km = $8,
          updated_at = now()
      WHERE id = $1
    `,
    [
      serviceTypeId,
      input.name.trim(),
      input.description?.trim() || null,
      input.status,
      input.billingUnit,
      input.baseValue,
      input.minimumHours ?? null,
      input.minimumKm ?? null,
    ],
  );

  await pool.query(`DELETE FROM service_type_equipment WHERE service_type_id = $1`, [serviceTypeId]);

  for (const equipmentId of equipmentIds) {
    await pool.query(
      `
        INSERT INTO service_type_equipment (service_type_id, equipment_id)
        VALUES ($1, $2)
      `,
      [serviceTypeId, equipmentId],
    );
  }
}

export async function deleteServiceType(serviceTypeId: string) {
  await bootstrapRbac();
  const current = await getServiceTypeById(serviceTypeId);

  if (!current) {
    throw new Error("Service type not found.");
  }

  const budgetsCount = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM budget_items WHERE service_type_id = $1`,
    [serviceTypeId],
  );

  if (Number(budgetsCount.rows[0]?.total ?? "0") > 0) {
    throw new Error("Remove budgets linked to this service type before deleting it.");
  }

  const linked = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM service_type_equipment WHERE service_type_id = $1`,
    [serviceTypeId],
  );

  if (Number(linked.rows[0]?.total ?? "0") > 0) {
    throw new Error("Remove linked equipment before deleting this service type.");
  }

  await pool.query(`DELETE FROM service_types WHERE id = $1`, [serviceTypeId]);
}

export async function listBudgets(): Promise<ManagedBudget[]> {
  await bootstrapRbac();
  const result = await pool.query<BudgetRow>(
    `
      SELECT
        b.id,
        b.number,
        b.status,
        b.client_id,
        COALESCE(NULLIF(c.trade_name, ''), c.legal_name) AS client_name,
        b.service_postal_code,
        b.service_street,
        b.service_number,
        b.service_complement,
        b.service_district,
        b.service_city,
        b.service_state,
        b.service_country,
        b.subtotal_value::text,
        b.manual_adjustment::text,
        b.total_value::text,
        COUNT(bi.id)::text AS item_count,
        COALESCE(
          json_agg(
            json_build_object(
              'id', bi.id,
              'position', bi.position,
              'service_type_id', bi.service_type_id,
              'service_type_name', st.name,
              'service_type_billing_unit', bi.billing_unit,
              'equipment_id', bi.equipment_id,
              'equipment_name', e.name,
              'equipment_brand', e.brand,
              'equipment_model', e.model,
              'operator_id', bi.operator_id,
              'operator_name', o.name,
              'service_description', bi.service_description,
              'service_date', bi.service_date::text,
              'start_time', bi.start_time::text,
              'end_time', bi.end_time::text,
              'base_value', bi.base_value::text,
              'minimum_hours', bi.minimum_hours::text,
              'minimum_km', bi.minimum_km::text,
              'initial_value', bi.initial_value::text,
              'created_at', bi.created_at,
              'updated_at', bi.updated_at
            )
            ORDER BY bi.position
          ) FILTER (WHERE bi.id IS NOT NULL),
          '[]'::json
        )::text AS items_json,
        b.notes,
        b.approved_at,
        b.cancelled_at,
        b.created_at,
        b.updated_at
      FROM budgets b
      INNER JOIN clients c ON c.id = b.client_id
      LEFT JOIN budget_items bi ON bi.budget_id = b.id
      LEFT JOIN equipment e ON e.id = bi.equipment_id
      LEFT JOIN service_types st ON st.id = bi.service_type_id
      LEFT JOIN operators o ON o.id = bi.operator_id
      GROUP BY
        b.id,
        b.number,
        b.status,
        b.client_id,
        c.trade_name,
        c.legal_name,
        b.service_postal_code,
        b.service_street,
        b.service_number,
        b.service_complement,
        b.service_district,
        b.service_city,
        b.service_state,
        b.service_country,
        b.subtotal_value,
        b.manual_adjustment,
        b.total_value,
        b.notes,
        b.approved_at,
        b.cancelled_at,
        b.created_at,
        b.updated_at
      ORDER BY b.updated_at DESC, b.number DESC
    `,
  );

  return result.rows.map(mapBudgetRow);
}

export async function getBudgetById(budgetId: string): Promise<ManagedBudget | null> {
  await bootstrapRbac();
  const result = await pool.query<BudgetRow>(
    `
      SELECT
        b.id,
        b.number,
        b.status,
        b.client_id,
        COALESCE(NULLIF(c.trade_name, ''), c.legal_name) AS client_name,
        b.service_postal_code,
        b.service_street,
        b.service_number,
        b.service_complement,
        b.service_district,
        b.service_city,
        b.service_state,
        b.service_country,
        b.subtotal_value::text,
        b.manual_adjustment::text,
        b.total_value::text,
        COUNT(bi.id)::text AS item_count,
        COALESCE(
          json_agg(
            json_build_object(
              'id', bi.id,
              'position', bi.position,
              'service_type_id', bi.service_type_id,
              'service_type_name', st.name,
              'service_type_billing_unit', bi.billing_unit,
              'equipment_id', bi.equipment_id,
              'equipment_name', e.name,
              'equipment_brand', e.brand,
              'equipment_model', e.model,
              'operator_id', bi.operator_id,
              'operator_name', o.name,
              'service_description', bi.service_description,
              'service_date', bi.service_date::text,
              'start_time', bi.start_time::text,
              'end_time', bi.end_time::text,
              'base_value', bi.base_value::text,
              'minimum_hours', bi.minimum_hours::text,
              'minimum_km', bi.minimum_km::text,
              'initial_value', bi.initial_value::text,
              'created_at', bi.created_at,
              'updated_at', bi.updated_at
            )
            ORDER BY bi.position
          ) FILTER (WHERE bi.id IS NOT NULL),
          '[]'::json
        )::text AS items_json,
        b.notes,
        b.approved_at,
        b.cancelled_at,
        b.created_at,
        b.updated_at
      FROM budgets b
      INNER JOIN clients c ON c.id = b.client_id
      LEFT JOIN budget_items bi ON bi.budget_id = b.id
      LEFT JOIN equipment e ON e.id = bi.equipment_id
      LEFT JOIN service_types st ON st.id = bi.service_type_id
      LEFT JOIN operators o ON o.id = bi.operator_id
      WHERE b.id = $1
      GROUP BY
        b.id,
        b.number,
        b.status,
        b.client_id,
        c.trade_name,
        c.legal_name,
        b.service_postal_code,
        b.service_street,
        b.service_number,
        b.service_complement,
        b.service_district,
        b.service_city,
        b.service_state,
        b.service_country,
        b.subtotal_value,
        b.manual_adjustment,
        b.total_value,
        b.notes,
        b.approved_at,
        b.cancelled_at,
        b.created_at,
        b.updated_at
    `,
    [budgetId],
  );

  const row = result.rows[0];
  return row ? mapBudgetRow(row) : null;
}

export async function createBudget(input: {
  clientId: string;
  servicePostalCode: string;
  serviceStreet: string;
  serviceNumber: string;
  serviceComplement?: string;
  serviceDistrict: string;
  serviceCity: string;
  serviceState: string;
  serviceCountry: string;
  manualAdjustment: number;
  notes?: string;
  items: BudgetServiceItemInput[];
}) {
  await bootstrapRbac();
  const serviceTypeMap = await assertBudgetRelationsExist(input);

  const id = randomUUID();
  const primaryItem = getPrimaryBudgetItem(input.items);
  const subtotalValue = calculateBudgetSubtotal(input.items);
  const totalValue = calculateBudgetTotal(subtotalValue, input.manualAdjustment);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("LOCK TABLE budgets IN EXCLUSIVE MODE");

    const sequenceResult = await client.query<{ max_sequence: string }>(
      `
        SELECT COALESCE(MAX(CAST(SUBSTRING(number FROM 5) AS integer)), 0)::text AS max_sequence
        FROM budgets
      `,
    );

    const nextSequence = Number(sequenceResult.rows[0]?.max_sequence ?? "0") + 1;
    const number = formatBudgetNumber(nextSequence);

    await client.query(
      `
        INSERT INTO budgets (
          id,
          number,
          status,
          client_id,
          equipment_id,
          service_type_id,
          operator_id,
          service_description,
          service_date,
          start_time,
          end_time,
          service_postal_code,
          service_street,
          service_number,
          service_complement,
          service_district,
          service_city,
          service_state,
          service_country,
          initial_value,
          manual_adjustment,
          subtotal_value,
          total_value,
          notes
        )
        VALUES (
          $1, $2, 'pending', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
        )
      `,
      [
        id,
        number,
        input.clientId,
        primaryItem.equipmentId,
        primaryItem.serviceTypeId,
        primaryItem.operatorId,
        primaryItem.serviceDescription.trim(),
        primaryItem.serviceDate,
        primaryItem.startTime,
        primaryItem.endTime,
        input.servicePostalCode,
        input.serviceStreet.trim(),
        input.serviceNumber.trim(),
        input.serviceComplement?.trim() || null,
        input.serviceDistrict.trim(),
        input.serviceCity.trim(),
        input.serviceState.trim(),
        input.serviceCountry.trim() || "Brasil",
        primaryItem.initialValue,
        input.manualAdjustment ?? 0,
        subtotalValue,
        totalValue,
        input.notes?.trim() || null,
      ],
    );

    await replaceBudgetItems(client, id, input.items, serviceTypeMap);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return id;
}

export async function updateBudget(
  budgetId: string,
  input: {
    clientId: string;
    servicePostalCode: string;
    serviceStreet: string;
    serviceNumber: string;
    serviceComplement?: string;
    serviceDistrict: string;
    serviceCity: string;
    serviceState: string;
    serviceCountry: string;
    manualAdjustment: number;
    notes?: string;
    items: BudgetServiceItemInput[];
  },
) {
  await bootstrapRbac();
  const current = await getBudgetById(budgetId);

  if (!current) {
    throw new Error("Budget not found.");
  }

  if (current.status !== "pending") {
    throw new Error("Only pending budgets can be edited.");
  }

  const serviceTypeMap = await assertBudgetRelationsExist(input);
  const primaryItem = getPrimaryBudgetItem(input.items);
  const subtotalValue = calculateBudgetSubtotal(input.items);
  const totalValue = calculateBudgetTotal(subtotalValue, input.manualAdjustment);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `
        UPDATE budgets
        SET client_id = $2,
            equipment_id = $3,
            service_type_id = $4,
            operator_id = $5,
            service_description = $6,
            service_date = $7,
            start_time = $8,
            end_time = $9,
            service_postal_code = $10,
            service_street = $11,
            service_number = $12,
            service_complement = $13,
            service_district = $14,
            service_city = $15,
            service_state = $16,
            service_country = $17,
            initial_value = $18,
            manual_adjustment = $19,
            subtotal_value = $20,
            total_value = $21,
            notes = $22,
            updated_at = now()
        WHERE id = $1
      `,
      [
        budgetId,
        input.clientId,
        primaryItem.equipmentId,
        primaryItem.serviceTypeId,
        primaryItem.operatorId,
        primaryItem.serviceDescription.trim(),
        primaryItem.serviceDate,
        primaryItem.startTime,
        primaryItem.endTime,
        input.servicePostalCode,
        input.serviceStreet.trim(),
        input.serviceNumber.trim(),
        input.serviceComplement?.trim() || null,
        input.serviceDistrict.trim(),
        input.serviceCity.trim(),
        input.serviceState.trim(),
        input.serviceCountry.trim() || "Brasil",
        primaryItem.initialValue,
        input.manualAdjustment ?? 0,
        subtotalValue,
        totalValue,
        input.notes?.trim() || null,
      ],
    );
    await replaceBudgetItems(client, budgetId, input.items, serviceTypeMap);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateBudgetStatus(
  budgetId: string,
  status: BudgetTransitionStatus,
) {
  await bootstrapRbac();
  const current = await getBudgetById(budgetId);

  if (!current) {
    throw new Error("Budget not found.");
  }

  const isPendingTransition = current.status === "pending" && (status === "approved" || status === "cancelled");
  const isCancelledRevert = current.status === "cancelled" && status === "pending";

  if (!isPendingTransition && !isCancelledRevert) {
    throw new Error("This budget status transition is not allowed.");
  }

  await pool.query(
    `
      UPDATE budgets
      SET status = $2,
          approved_at = CASE
            WHEN $2 = 'approved' THEN now()
            WHEN $2 = 'pending' THEN null
            ELSE approved_at
          END,
          cancelled_at = CASE
            WHEN $2 = 'cancelled' THEN now()
            WHEN $2 = 'pending' THEN null
            ELSE cancelled_at
          END,
          updated_at = now()
      WHERE id = $1
    `,
    [budgetId, status],
  );
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
  permissionKeys: PermissionKey[];
}) {
  await bootstrapRbac();
  const name = normalizeRoleName(input.name);
  const existingRoleId = await findConflictingRoleByName(name);
  if (existingRoleId) {
    throw new Error("A role with this name already exists.");
  }
  const slug = await generateUniqueRoleSlug(name);

  const id = randomUUID();
  await pool.query(
    `
      INSERT INTO roles (id, name, slug, description, is_system)
      VALUES ($1, $2, $3, $4, false)
    `,
    [id, name, slug, null],
  );

  await syncRolePermissions(id, input.permissionKeys);

  return id;
}

export async function updateRole(
  roleId: string,
  input: {
    name: string;
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
  const name = normalizeRoleName(input.name);
  const existingRoleId = await findConflictingRoleByName(name, roleId);
  if (existingRoleId) {
    throw new Error("A role with this name already exists.");
  }
  const slug = await generateUniqueRoleSlug(name, roleId);

  await pool.query(
    `
      UPDATE roles
      SET name = $2,
          slug = $3,
          description = $4,
          updated_at = now()
      WHERE id = $1
    `,
    [roleId, name, slug, null],
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
