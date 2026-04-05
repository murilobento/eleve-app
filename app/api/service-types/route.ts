import { NextResponse } from "next/server";

import { createServiceTypeSchema } from "@/lib/service-types-admin";
import {
  createServiceType,
  getServiceTypeById,
  listEquipmentOptions,
  listServiceTypes,
  requirePermission,
} from "@/lib/rbac";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  try {
    const permission = await requirePermission(request, "service-types.read");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const [serviceTypes, equipment] = await Promise.all([
      listServiceTypes(),
      listEquipmentOptions(),
    ]);

    return NextResponse.json({ serviceTypes, equipment });
  } catch (error) {
    return getErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const permission = await requirePermission(request, "service-types.create");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const payload = createServiceTypeSchema.parse(await request.json());
    const serviceTypeId = await createServiceType(payload);
    const serviceType = await getServiceTypeById(serviceTypeId);

    return NextResponse.json({ serviceType });
  } catch (error) {
    return getErrorResponse(error);
  }
}
