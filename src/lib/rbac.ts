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

  const roles = await getUserRoleAssignments(session.user.id, session.user.role);
  const permissions = await getUserPermissionKeys(session.user.id, session.user.role);

  return {
    session,
    roles,
    permissions,
  };
}

export async function requirePermission(request: Request, permission: PermissionKey) {
  const state = await getCurrentSessionState(request);

  if (!state) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!state.permissions.includes(permission)) {
    return NextResponse.json({ error: "You do not have permission to perform this action." }, { status: 403 });
  }

  return state;
}
