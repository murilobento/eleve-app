import { NextResponse } from "next/server";

import { getServiceOrderById, requirePermission, updateServiceOrderStatus } from "@/lib/rbac";
import { updateServiceOrderStatusSchema } from "@/lib/service-orders-admin";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const permission = await requirePermission(request, "service-orders.update");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { id } = await params;
    const payload = updateServiceOrderStatusSchema.parse(await request.json());
    await updateServiceOrderStatus(id, payload.status, payload.reason, {
      userId: permission.session.user.id,
      name: permission.session.user.name,
      email: permission.session.user.email,
    });
    const serviceOrder = await getServiceOrderById(id);

    return NextResponse.json({ serviceOrder });
  } catch (error) {
    return getErrorResponse(error);
  }
}
