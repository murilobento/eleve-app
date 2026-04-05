import { NextResponse } from "next/server";

import { createBudgetSchema } from "@/lib/budgets-admin";
import {
  createBudget,
  getBudgetById,
  listBudgets,
  listClients,
  listEquipmentOptions,
  listOperators,
  listServiceTypes,
  requirePermission,
} from "@/lib/rbac";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  try {
    const permission = await requirePermission(request, "budgets.read");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const [budgets, clients, equipment, serviceTypes, operators] = await Promise.all([
      listBudgets(),
      listClients(),
      listEquipmentOptions(),
      listServiceTypes(),
      listOperators(),
    ]);

    return NextResponse.json({ budgets, clients, equipment, serviceTypes, operators });
  } catch (error) {
    return getErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const permission = await requirePermission(request, "budgets.create");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const payload = createBudgetSchema.parse(await request.json());
    const budgetId = await createBudget(payload);
    const budget = await getBudgetById(budgetId);

    return NextResponse.json({ budget });
  } catch (error) {
    return getErrorResponse(error);
  }
}
