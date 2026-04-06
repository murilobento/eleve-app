import { NextResponse } from "next/server";

import { updateMaintenanceStatusSchema } from "@/lib/maintenance-admin";
import {
  getMaintenanceRecordById,
  requirePermission,
  updateMaintenanceRecordStatus,
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
    const permission = await requirePermission(request, "equipment-costs.update");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { id } = await params;
    const payload = updateMaintenanceStatusSchema.parse(await request.json());
    await updateMaintenanceRecordStatus(id, payload);
    const maintenanceRecord = await getMaintenanceRecordById(id);

    return NextResponse.json({ maintenanceRecord });
  } catch (error) {
    return getErrorResponse(error);
  }
}
