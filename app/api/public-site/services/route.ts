import { NextResponse } from "next/server";

import { createPublicServiceSchema } from "@/lib/public-site-admin";
import {
  createPublicService,
  getPublicServiceById,
  listPublicServices,
} from "@/lib/public-site-data";
import { requirePermission } from "@/lib/rbac";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  try {
    const permission = await requirePermission(request, "public-site.read");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const services = await listPublicServices(false);
    return NextResponse.json({ services });
  } catch (error) {
    return getErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const permission = await requirePermission(request, "public-site.create");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const payload = createPublicServiceSchema.parse(await request.json());
    const serviceId = await createPublicService(payload);
    const service = await getPublicServiceById(serviceId);
    return NextResponse.json({ service });
  } catch (error) {
    return getErrorResponse(error);
  }
}
