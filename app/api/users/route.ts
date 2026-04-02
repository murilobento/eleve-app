import { NextResponse } from "next/server";
import { APIError } from "better-auth";

import { auth } from "@/lib/auth";
import {
  assignRolesToUser,
  getUserAccessStateBatch,
  getUserRoleAssignments,
  getUserRoleAssignmentsBatch,
  getRoleById,
  listAssignableRoles,
  requirePermission,
  setUserAccessState,
} from "@/lib/rbac";
import {
  createManagedUserSchema,
  mapAuthUserToManagedUser,
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

export async function GET(request: Request) {
  try {
    const state = await requirePermission(request, "users.read");

    if (state instanceof NextResponse) {
      return state;
    }

    const result = await auth.api.listUsers({
      headers: request.headers,
      query: {
        limit: 500,
        offset: 0,
        sortBy: "createdAt",
        sortDirection: "desc",
      },
    });

    const userRolesById = await getUserRoleAssignmentsBatch(
      result.users.map((user) => ({ id: user.id, legacyRole: user.role })),
    );
    const userAccessById = await getUserAccessStateBatch(result.users.map((user) => user.id));
    const users = result.users.map((user) =>
      mapAuthUserToManagedUser(
        user,
        userRolesById.get(user.id) ?? [],
        userAccessById.get(user.id) ?? null,
      ),
    );
    const roles = await listAssignableRoles();

    return NextResponse.json({
      users,
      roles,
      total: result.total,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const state = await requirePermission(request, "users.create");

    if (state instanceof NextResponse) {
      return state;
    }

    const assignPermission = await requirePermission(request, "roles.assign");

    if (assignPermission instanceof NextResponse) {
      return assignPermission;
    }

    const payload = createManagedUserSchema.parse(await request.json());
    const roleSlugs = await Promise.all(
      payload.roleIds.map(async (roleId) => (await getRoleById(roleId))?.slug),
    );
    const compatibilityRole = roleSlugs.includes("admin") ? "admin" : "user";

    const result = await auth.api.createUser({
      headers: request.headers,
      body: {
        email: payload.email,
        password: payload.password,
        name: payload.name,
        role: compatibilityRole,
      },
    });

    await assignRolesToUser(result.user.id, payload.roleIds);
    await setUserAccessState(result.user.id, payload.status === "active");
    const userRoles = await getUserRoleAssignments(result.user.id, result.user.role);

    return NextResponse.json({
      user: mapAuthUserToManagedUser(result.user, userRoles, {
        isActive: payload.status === "active",
        reason: payload.status === "active" ? null : "Marked as inactive by administrator",
      }),
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}
