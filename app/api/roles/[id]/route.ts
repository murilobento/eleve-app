import { NextResponse } from "next/server";

import { updateRoleSchema } from "@/lib/roles-admin";
import {
  deleteRole,
  listRolesWithDetails,
  requirePermission,
  updateRole,
} from "@/lib/rbac";

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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const permission = await requirePermission(request, "roles.update");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { id } = await params;
    const payload = updateRoleSchema.parse(await request.json());
    await updateRole(id, payload);
    const roles = await listRolesWithDetails();
    const role = roles.find((item) => item.id === id);

    return NextResponse.json({ role: role ? serializeRole(role) : null });
  } catch (error) {
    return getErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const permission = await requirePermission(request, "roles.delete");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { id } = await params;
    await deleteRole(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return getErrorResponse(error);
  }
}
