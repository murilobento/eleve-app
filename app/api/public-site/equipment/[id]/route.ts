import { NextResponse } from "next/server";

import { updatePublicEquipmentSchema } from "@/lib/public-site-admin";
import {
  deletePublicEquipment,
  getPublicEquipmentById,
  updatePublicEquipment,
} from "@/lib/public-site-data";
import { requirePermission } from "@/lib/rbac";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const permission = await requirePermission(request, "public-site.update");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { id } = await params;
    const payload = updatePublicEquipmentSchema.parse(await request.json());
    await updatePublicEquipment(id, payload);
    const equipment = await getPublicEquipmentById(id);
    return NextResponse.json({ equipment });
  } catch (error) {
    return getErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const permission = await requirePermission(request, "public-site.delete");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { id } = await params;
    await deletePublicEquipment(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return getErrorResponse(error);
  }
}
