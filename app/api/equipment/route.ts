import { NextResponse } from "next/server";

import { createEquipmentSchema } from "@/lib/equipment-admin";
import {
  createEquipment,
  getEquipmentById,
  listEquipment,
  listEquipmentTypes,
  requirePermission,
} from "@/lib/rbac";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  try {
    const permission = await requirePermission(request, "equipment.read");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const [equipment, equipmentTypes] = await Promise.all([
      listEquipment(),
      listEquipmentTypes(),
    ]);

    return NextResponse.json({ equipment, equipmentTypes });
  } catch (error) {
    return getErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const permission = await requirePermission(request, "equipment.create");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const payload = createEquipmentSchema.parse(await request.json());
    const equipmentId = await createEquipment(payload);
    const equipmentItem = await getEquipmentById(equipmentId);

    return NextResponse.json({ equipment: equipmentItem });
  } catch (error) {
    return getErrorResponse(error);
  }
}
