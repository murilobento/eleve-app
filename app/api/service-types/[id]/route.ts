import { NextResponse } from "next/server";

import { updateServiceTypeSchema } from "@/lib/service-types-admin";
import {
  deleteServiceType,
  getServiceTypeById,
  requirePermission,
  updateServiceType,
} from "@/lib/rbac";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const permission = await requirePermission(request, "service-types.update");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { id } = await params;
    const payload = updateServiceTypeSchema.parse(await request.json());
    await updateServiceType(id, payload);
    const serviceType = await getServiceTypeById(id);

    return NextResponse.json({ serviceType });
  } catch (error) {
    return getErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const permission = await requirePermission(request, "service-types.delete");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { id } = await params;
    await deleteServiceType(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return getErrorResponse(error);
  }
}
