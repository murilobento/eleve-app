import { NextResponse } from "next/server";

import { getServiceOrderById, requirePermission, updateServiceOrder } from "@/lib/rbac";
import { updateServiceOrderSchema } from "@/lib/service-orders-admin";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const permission = await requirePermission(request, "service-orders.update");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { id } = await params;
    const payload = updateServiceOrderSchema.parse(await request.json());
    await updateServiceOrder(id, payload);
    const serviceOrder = await getServiceOrderById(id);

    return NextResponse.json({ serviceOrder });
  } catch (error) {
    return getErrorResponse(error);
  }
}
