import { NextResponse } from "next/server";

import { createEquipmentTypeSchema } from "@/lib/equipment-types-admin";
import {
  createEquipmentType,
  getEquipmentTypeById,
  listEquipmentTypes,
  requirePermission,
} from "@/lib/rbac";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  try {
    const permission = await requirePermission(request, "equipment-types.read");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const equipmentTypes = await listEquipmentTypes();

    return NextResponse.json({ equipmentTypes });
  } catch (error) {
    return getErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const permission = await requirePermission(request, "equipment-types.create");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const payload = createEquipmentTypeSchema.parse(await request.json());
    const equipmentTypeId = await createEquipmentType(payload);
    const equipmentType = await getEquipmentTypeById(equipmentTypeId);

    return NextResponse.json({ equipmentType });
  } catch (error) {
    return getErrorResponse(error);
  }
}
