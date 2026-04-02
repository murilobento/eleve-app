import { NextResponse } from "next/server";

import { updateCompanySchema } from "@/lib/company-admin";
import { getCompany, requirePermission, upsertCompany } from "@/lib/rbac";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  try {
    const permission = await requirePermission(request, "company.read");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const company = await getCompany();

    return NextResponse.json({ company });
  } catch (error) {
    return getErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const permission = await requirePermission(request, "company.update");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const payload = updateCompanySchema.parse(await request.json());
    const companyId = await upsertCompany(payload);
    const company = await getCompany();

    if (!company || company.id !== companyId) {
      throw new Error("Failed to save company details.");
    }

    return NextResponse.json({ company });
  } catch (error) {
    return getErrorResponse(error);
  }
}
