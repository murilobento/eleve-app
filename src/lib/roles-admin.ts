import { z } from "zod";

import { PERMISSION_CATALOG, type PermissionKey } from "@/lib/rbac-shared";

const permissionKeys = PERMISSION_CATALOG.map((permission) => permission.key) as [PermissionKey, ...PermissionKey[]];

export const permissionKeySchema = z.enum(permissionKeys);

const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters.")
  .max(80, "Name must be at most 80 characters.");

export const createRoleSchema = z.object({
  name: nameSchema,
  permissionKeys: z.array(permissionKeySchema).min(1, "Select at least one permission."),
});

export const updateRoleSchema = createRoleSchema;

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export type ManagedRole = {
  id: string;
  name: string;
  permissionKeys: PermissionKey[];
  permissionsCount: number;
  usersCount: number;
  isSystem: boolean;
};

export function groupPermissionsByResource() {
  return Object.entries(
    PERMISSION_CATALOG.reduce<Record<string, typeof PERMISSION_CATALOG>>((groups, permission) => {
      const current = groups[permission.resource] ?? [];
      current.push(permission);
      groups[permission.resource] = current;
      return groups;
    }, {}),
  ).map(([resource, permissions]) => ({
    resource,
    label: resource.charAt(0).toUpperCase() + resource.slice(1),
    permissions,
  }));
}
