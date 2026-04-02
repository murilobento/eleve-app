import { NextResponse } from "next/server";

import { updateEquipmentTypeSchema } from "@/lib/equipment-types-admin";
import {
  deleteEquipmentType,
  getEquipmentTypeById,
  requirePermission,
  updateEquipmentType,
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
    const permission = await requirePermission(request, "equipment-types.update");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { id } = await params;
    const payload = updateEquipmentTypeSchema.parse(await request.json());
    await updateEquipmentType(id, payload);
    const equipmentType = await getEquipmentTypeById(id);

    return NextResponse.json({ equipmentType });
  } catch (error) {
    return getErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const permission = await requirePermission(request, "equipment-types.delete");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { id } = await params;
    await deleteEquipmentType(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return getErrorResponse(error);
  }
}
