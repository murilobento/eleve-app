import { NextResponse } from "next/server";

import { createFuelSchema } from "@/lib/fuel-admin";
import {
  createFuelRecord,
  getFuelRecordById,
  listEquipmentOptions,
  listFuelRecords,
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

    const [fuelRecords, equipment] = await Promise.all([
      listFuelRecords(),
      listEquipmentOptions(),
    ]);

    return NextResponse.json({ fuelRecords, equipment });
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

    const payload = createFuelSchema.parse(await request.json());
    const recordId = await createFuelRecord(payload);
    const fuelRecord = await getFuelRecordById(recordId);

    return NextResponse.json({ fuelRecord });
  } catch (error) {
    return getErrorResponse(error);
  }
}
