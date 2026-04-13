import { NextResponse } from "next/server";

import { updatePartsRequisitionStatusSchema } from "@/lib/parts-requisitions-admin";
import {
  getPartsRequisitionById,
  requirePermission,
  updatePartsRequisitionStatus,
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
    const permission = await requirePermission(request, "equipment-requisitions.update");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { id } = await params;
    const payload = updatePartsRequisitionStatusSchema.parse(await request.json());
    await updatePartsRequisitionStatus(id, payload);
    const partsRequisition = await getPartsRequisitionById(id);
    return NextResponse.json({ partsRequisition });
  } catch (error) {
    return getErrorResponse(error);
  }
}
