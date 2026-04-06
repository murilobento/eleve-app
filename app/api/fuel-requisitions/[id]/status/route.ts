import { NextResponse } from "next/server";

import { updateFuelRequisitionStatusSchema } from "@/lib/fuel-requisitions-admin";
import {
  getFuelRequisitionById,
  requirePermission,
  updateFuelRequisitionStatus,
} from "@/lib/rbac";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const permission = await requirePermission(request, "equipment-requisitions.update");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { id } = await params;
    const payload = updateFuelRequisitionStatusSchema.parse(await request.json());
    await updateFuelRequisitionStatus(id, payload);
    const fuelRequisition = await getFuelRequisitionById(id);
    return NextResponse.json({ fuelRequisition });
  } catch (error) {
    return getErrorResponse(error);
  }
}
