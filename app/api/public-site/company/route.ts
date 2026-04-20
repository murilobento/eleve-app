import { NextResponse } from "next/server";

import { updatePublicCompanySchema } from "@/lib/public-site-admin";
import { getPublicCompany, upsertPublicCompany } from "@/lib/public-site-data";
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

    const company = await getPublicCompany();
    return NextResponse.json({ company });
  } catch (error) {
    return getErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const permission = await requirePermission(request, "public-site.update");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const payload = updatePublicCompanySchema.parse(await request.json());
    await upsertPublicCompany(payload);
    const company = await getPublicCompany();

    return NextResponse.json({ company });
  } catch (error) {
    return getErrorResponse(error);
  }
}
