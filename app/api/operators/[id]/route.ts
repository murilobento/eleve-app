import { NextResponse } from "next/server";

import { updateOperatorSchema } from "@/lib/operators-admin";
import {
  deleteOperator,
  getOperatorById,
  requirePermission,
  updateOperator,
} from "@/lib/rbac";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const permission = await requirePermission(request, "operators.update");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { id } = await params;
    const payload = updateOperatorSchema.parse(await request.json());
    await updateOperator(id, payload);
    const operator = await getOperatorById(id);

    return NextResponse.json({ operator });
  } catch (error) {
    return getErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const permission = await requirePermission(request, "operators.delete");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { id } = await params;
    await deleteOperator(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return getErrorResponse(error);
  }
}
