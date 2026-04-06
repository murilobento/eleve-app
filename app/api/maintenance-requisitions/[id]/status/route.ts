import { NextResponse } from "next/server";

import { updateMaintenanceRequisitionStatusSchema } from "@/lib/maintenance-requisitions-admin";
import {
  getMaintenanceRequisitionById,
  requirePermission,
  updateMaintenanceRequisitionStatus,
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
    const payload = updateMaintenanceRequisitionStatusSchema.parse(await request.json());
    await updateMaintenanceRequisitionStatus(id, payload);
    const maintenanceRequisition = await getMaintenanceRequisitionById(id);
    return NextResponse.json({ maintenanceRequisition });
  } catch (error) {
    return getErrorResponse(error);
  }
}
