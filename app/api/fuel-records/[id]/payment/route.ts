import { NextResponse } from "next/server";

import { updateFuelPaymentSchema } from "@/lib/fuel-admin";
import {
  getFuelRecordById,
  requirePermission,
  updateFuelRecordPayment,
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
    const permission = await requirePermission(request, "equipment-costs.update");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { id } = await params;
    const payload = updateFuelPaymentSchema.parse(await request.json());
    await updateFuelRecordPayment(id, payload);
    const fuelRecord = await getFuelRecordById(id);

    return NextResponse.json({ fuelRecord });
  } catch (error) {
    return getErrorResponse(error);
  }
}
