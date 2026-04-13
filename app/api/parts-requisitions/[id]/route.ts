import { NextResponse } from "next/server";

import { updatePartsRequisitionSchema } from "@/lib/parts-requisitions-admin";
import {
  deletePartsRequisition,
  getPartsRequisitionById,
  requirePermission,
  updatePartsRequisition,
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
    const payload = updatePartsRequisitionSchema.parse(await request.json());
    await updatePartsRequisition(id, payload);
    const partsRequisition = await getPartsRequisitionById(id);
    return NextResponse.json({ partsRequisition });
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
    await deletePartsRequisition(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return getErrorResponse(error);
  }
}
