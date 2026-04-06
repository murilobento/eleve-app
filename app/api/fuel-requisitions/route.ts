import { NextResponse } from "next/server";

import { createFuelRequisitionSchema } from "@/lib/fuel-requisitions-admin";
import {
  createFuelRequisition,
  getFuelRequisitionById,
  listEquipmentOptions,
  listFuelRequisitions,
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

    const [fuelRequisitions, equipment, suppliers] = await Promise.all([
      listFuelRequisitions(),
      listEquipmentOptions(),
      listSupplierOptions(true),
    ]);

    return NextResponse.json({ fuelRequisitions, equipment, suppliers });
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

    const payload = createFuelRequisitionSchema.parse(await request.json());
    const requisitionId = await createFuelRequisition({
      ...payload,
      requester: {
        userId: permission.session.user.id,
        name: permission.session.user.name,
        email: permission.session.user.email,
      },
    });
    const fuelRequisition = await getFuelRequisitionById(requisitionId);
    return NextResponse.json({ fuelRequisition });
  } catch (error) {
    return getErrorResponse(error);
  }
}
