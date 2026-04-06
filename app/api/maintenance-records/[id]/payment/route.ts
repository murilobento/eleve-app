import { NextResponse } from "next/server";

import { updateMaintenancePaymentSchema } from "@/lib/maintenance-admin";
import {
  getMaintenanceRecordById,
  requirePermission,
  updateMaintenanceRecordPayment,
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
    const payload = updateMaintenancePaymentSchema.parse(await request.json());
    await updateMaintenanceRecordPayment(id, payload);
    const maintenanceRecord = await getMaintenanceRecordById(id);

    return NextResponse.json({ maintenanceRecord });
  } catch (error) {
    return getErrorResponse(error);
  }
}
