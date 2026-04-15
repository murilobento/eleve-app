import { NextResponse } from "next/server";

import { createManualServiceOrderSchema } from "@/lib/service-orders-admin";
import {
  createServiceOrder,
  getServiceOrderById,
  listBudgets,
  listClients,
  listEquipmentOptions,
  listOperators,
  listServiceOrders,
  listServiceTypes,
  requirePermission,
} from "@/lib/rbac";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  try {
    const permission = await requirePermission(request, "service-orders.read");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const [serviceOrders, clients, equipment, serviceTypes, operators, budgets] = await Promise.all([
      listServiceOrders(),
      listClients(),
      listEquipmentOptions(),
      listServiceTypes(),
      listOperators(),
      listBudgets(),
    ]);

    const approvedBudgets = budgets.filter((budget) => budget.status === "approved");

    return NextResponse.json({ serviceOrders, clients, equipment, serviceTypes, operators, approvedBudgets });
  } catch (error) {
    return getErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const permission = await requirePermission(request, "service-orders.create");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const payload = createManualServiceOrderSchema.parse(await request.json());
    const serviceOrderId = await createServiceOrder(payload, {
      userId: permission.session.user.id,
      name: permission.session.user.name,
      email: permission.session.user.email,
    });
    const serviceOrder = await getServiceOrderById(serviceOrderId);

    return NextResponse.json({ serviceOrder });
  } catch (error) {
    return getErrorResponse(error);
  }
}
