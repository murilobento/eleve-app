import { NextResponse } from "next/server";

import { createMaintenanceSchema } from "@/lib/maintenance-admin";
import {
  createMaintenanceRecord,
  getMaintenanceRecordById,
  listEquipmentOptions,
  listMaintenanceRecords,
  requirePermission,
} from "@/lib/rbac";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  try {
    const permission = await requirePermission(request, "equipment-costs.read");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const [maintenanceRecords, equipment] = await Promise.all([
      listMaintenanceRecords(),
      listEquipmentOptions(),
    ]);

    return NextResponse.json({ maintenanceRecords, equipment });
  } catch (error) {
    return getErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const permission = await requirePermission(request, "equipment-costs.create");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const payload = createMaintenanceSchema.parse(await request.json());
    const recordId = await createMaintenanceRecord(payload);
    const maintenanceRecord = await getMaintenanceRecordById(recordId);

    return NextResponse.json({ maintenanceRecord });
  } catch (error) {
    return getErrorResponse(error);
  }
}
