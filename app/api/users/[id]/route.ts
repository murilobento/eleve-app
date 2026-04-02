import { NextResponse } from "next/server";
import { APIError } from "better-auth";

import { auth } from "@/lib/auth";
import {
  assignRolesToUser,
  deleteUserRoleAssignments,
  getRoleById,
  getUserRoleAssignments,
  requirePermission,
  setUserAccessState,
} from "@/lib/rbac";
import {
  mapAuthUserToManagedUser,
  updateManagedUserSchema,
} from "@/lib/users-admin";

type RouteError = Error & {
  status?: number;
  statusCode?: number;
  body?: {
    message?: string;
  };
};

function getErrorResponse(error: unknown) {
  const routeError = error as RouteError;
  const status =
    routeError?.statusCode ||
    routeError?.status ||
    (error instanceof APIError ? 400 : 500);
  const message =
    routeError?.body?.message ||
    routeError?.message ||
    "Unexpected error while processing the request.";

  return NextResponse.json({ error: message }, { status });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const permission = await requirePermission(request, "users.update");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const assignPermission = await requirePermission(request, "roles.assign");

    if (assignPermission instanceof NextResponse) {
      return assignPermission;
    }

    const { id } = await params;
    const payload = updateManagedUserSchema.parse(await request.json());
    const roleSlugs = await Promise.all(payload.roleIds.map(async (roleId) => (await getRoleById(roleId))?.slug));
    const compatibilityRole = roleSlugs.includes("admin") ? "admin" : "user";

    const result = await auth.api.adminUpdateUser({
      headers: request.headers,
      body: {
        userId: id,
        data: {
          name: payload.name,
          email: payload.email,
          role: compatibilityRole,
        },
      },
    });

    if (payload.password) {
      await auth.api.setUserPassword({
        headers: request.headers,
        body: {
          userId: id,
          newPassword: payload.password,
        },
      });
    }

    await assignRolesToUser(id, payload.roleIds);
    await setUserAccessState(id, payload.status === "active");
    const userRoles = await getUserRoleAssignments(id, compatibilityRole);

    return NextResponse.json({
      user: mapAuthUserToManagedUser(result.user ?? result, userRoles, {
        isActive: payload.status === "active",
        reason: payload.status === "active" ? null : "Marked as inactive by administrator",
      }),
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const permission = await requirePermission(request, "users.delete");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { id } = await params;
    await deleteUserRoleAssignments(id);

    await auth.api.removeUser({
      headers: request.headers,
      body: {
        userId: id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return getErrorResponse(error);
  }
}
