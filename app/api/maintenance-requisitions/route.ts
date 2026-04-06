import { NextResponse } from "next/server";

import { createMaintenanceRequisitionSchema } from "@/lib/maintenance-requisitions-admin";
import {
  createMaintenanceRequisition,
  getMaintenanceRequisitionById,
  listEquipmentOptions,
  listMaintenanceRequisitions,
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

    const [maintenanceRequisitions, equipment, suppliers] = await Promise.all([
      listMaintenanceRequisitions(),
      listEquipmentOptions(),
      listSupplierOptions(true),
    ]);

    return NextResponse.json({ maintenanceRequisitions, equipment, suppliers });
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

    const payload = createMaintenanceRequisitionSchema.parse(await request.json());
    const requisitionId = await createMaintenanceRequisition({
      ...payload,
      requester: {
        userId: permission.session.user.id,
        name: permission.session.user.name,
        email: permission.session.user.email,
      },
    });
    const maintenanceRequisition = await getMaintenanceRequisitionById(requisitionId);
    return NextResponse.json({ maintenanceRequisition });
  } catch (error) {
    return getErrorResponse(error);
  }
}
