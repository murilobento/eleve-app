import { NextResponse } from "next/server";

import { createRoleSchema } from "@/lib/roles-admin";
import {
  createRole,
  listRolesWithDetails,
  requirePermission,
} from "@/lib/rbac";
import { logRequestSecurityEvent } from "@/lib/security-events";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

function serializeRole(role: Awaited<ReturnType<typeof listRolesWithDetails>>[number]) {
  return {
    id: role.id,
    name: role.name,
    permissionKeys: role.permissions,
    permissionsCount: role.permissionsCount,
    usersCount: role.usersCount,
    isSystem: role.isSystem,
  };
}

export async function GET(request: Request) {
  try {
    const permission = await requirePermission(request, "roles.read");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const roles = await listRolesWithDetails();

    return NextResponse.json({ roles: roles.map(serializeRole) });
  } catch (error) {
    return getErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const permission = await requirePermission(request, "roles.create");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const payload = createRoleSchema.parse(await request.json());
    const roleId = await createRole(payload);
    const roles = await listRolesWithDetails();
    const role = roles.find((item) => item.id === roleId);

    logRequestSecurityEvent("roles.created", request, {
      userId: permission.session.user.id,
      details: {
        roleId,
        permissionKeysCount: payload.permissionKeys.length,
      },
    });

    return NextResponse.json({ role: role ? serializeRole(role) : null });
  } catch (error) {
    return getErrorResponse(error);
  }
}
