import { NextResponse } from "next/server";

import { updateMaintenanceSchema } from "@/lib/maintenance-admin";
import {
  deleteMaintenanceRecord,
  getMaintenanceRecordById,
  requirePermission,
  updateMaintenanceRecord,
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
    const permission = await requirePermission(request, "equipment-costs.update");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { id } = await params;
    const payload = updateMaintenanceSchema.parse(await request.json());
    await updateMaintenanceRecord(id, payload);
    const maintenanceRecord = await getMaintenanceRecordById(id);

    return NextResponse.json({ maintenanceRecord });
  } catch (error) {
    return getErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const permission = await requirePermission(request, "equipment-costs.delete");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { id } = await params;
    await deleteMaintenanceRecord(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return getErrorResponse(error);
  }
}
