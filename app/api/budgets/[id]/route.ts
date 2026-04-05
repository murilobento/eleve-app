import { NextResponse } from "next/server";

import { getBudgetById, requirePermission, updateBudget } from "@/lib/rbac";
import { updateBudgetSchema } from "@/lib/budgets-admin";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const permission = await requirePermission(request, "budgets.update");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { id } = await params;
    const payload = updateBudgetSchema.parse(await request.json());
    await updateBudget(id, payload);
    const budget = await getBudgetById(id);

    return NextResponse.json({ budget });
  } catch (error) {
    return getErrorResponse(error);
  }
}
