import { NextResponse } from "next/server";

import { createPartsRequisitionSchema } from "@/lib/parts-requisitions-admin";
import {
  createPartsRequisition,
  getPartsRequisitionById,
  listEquipmentOptions,
  listPartsRequisitions,
  listSupplierOptions,
  requirePermission,
} from "@/lib/rbac";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  try {
    const permission = await requirePermission(request, "equipment-requisitions.read");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const [partsRequisitions, equipment, suppliers] = await Promise.all([
      listPartsRequisitions(),
      listEquipmentOptions(),
      listSupplierOptions(true),
    ]);

    return NextResponse.json({ partsRequisitions, equipment, suppliers });
  } catch (error) {
    return getErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const permission = await requirePermission(request, "equipment-requisitions.create");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const payload = createPartsRequisitionSchema.parse(await request.json());
    const requisitionId = await createPartsRequisition({
      ...payload,
      requester: {
        userId: permission.session.user.id,
        name: permission.session.user.name,
        email: permission.session.user.email,
      },
    });
    const partsRequisition = await getPartsRequisitionById(requisitionId);
    return NextResponse.json({ partsRequisition });
  } catch (error) {
    return getErrorResponse(error);
  }
}
