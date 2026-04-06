import { NextResponse } from "next/server";

import { createSupplierSchema } from "@/lib/suppliers-admin";
import {
  createSupplier,
  getSupplierById,
  listSuppliers,
  requirePermission,
} from "@/lib/rbac";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  try {
    const permission = await requirePermission(request, "suppliers.read");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const suppliers = await listSuppliers();
    return NextResponse.json({ suppliers });
  } catch (error) {
    return getErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const permission = await requirePermission(request, "suppliers.create");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const payload = createSupplierSchema.parse(await request.json());
    const supplierId = await createSupplier(payload);
    const supplier = await getSupplierById(supplierId);
    return NextResponse.json({ supplier });
  } catch (error) {
    return getErrorResponse(error);
  }
}
