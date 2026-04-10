"use client";

import type { PermissionKey, PermissionResource } from "@/lib/rbac-shared";

import { useRbac } from "./use-rbac";

function getPermissionKey(resource: PermissionResource, action: "read" | "create" | "update" | "delete") {
  return `${resource}.${action}` as PermissionKey;
}

export function useResourcePermissions(resource: PermissionResource, enabled = true) {
  const rbac = useRbac(enabled);

  return {
    ...rbac,
    canRead: rbac.hasPermission(getPermissionKey(resource, "read")),
    canCreate: rbac.hasPermission(getPermissionKey(resource, "create")),
    canUpdate: rbac.hasPermission(getPermissionKey(resource, "update")),
    canDelete: rbac.hasPermission(getPermissionKey(resource, "delete")),
  };
}
