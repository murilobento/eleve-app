import { NextResponse } from "next/server";

import { updateMaintenanceRequisitionSchema } from "@/lib/maintenance-requisitions-admin";
import {
  deleteMaintenanceRequisition,
  getMaintenanceRequisitionById,
  requirePermission,
  updateMaintenanceRequisition,
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
    const payload = updateMaintenanceRequisitionSchema.parse(await request.json());
    await updateMaintenanceRequisition(id, payload);
    const maintenanceRequisition = await getMaintenanceRequisitionById(id);
    return NextResponse.json({ maintenanceRequisition });
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
    await deleteMaintenanceRequisition(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return getErrorResponse(error);
  }
}
