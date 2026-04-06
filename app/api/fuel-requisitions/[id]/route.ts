import { NextResponse } from "next/server";

import { updateFuelRequisitionSchema } from "@/lib/fuel-requisitions-admin";
import {
  deleteFuelRequisition,
  getFuelRequisitionById,
  requirePermission,
  updateFuelRequisition,
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
    const permission = await requirePermission(request, "equipment-requisitions.update");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { id } = await params;
    const payload = updateFuelRequisitionSchema.parse(await request.json());
    await updateFuelRequisition(id, payload);
    const fuelRequisition = await getFuelRequisitionById(id);
    return NextResponse.json({ fuelRequisition });
  } catch (error) {
    return getErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const permission = await requirePermission(request, "equipment-requisitions.delete");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { id } = await params;
    await deleteFuelRequisition(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return getErrorResponse(error);
  }
}
