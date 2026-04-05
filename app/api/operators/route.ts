import { NextResponse } from "next/server";

import { createOperatorSchema } from "@/lib/operators-admin";
import {
  createOperator,
  getOperatorById,
  listOperators,
  requirePermission,
} from "@/lib/rbac";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  try {
    const permission = await requirePermission(request, "operators.read");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const operators = await listOperators();

    return NextResponse.json({ operators });
  } catch (error) {
    return getErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const permission = await requirePermission(request, "operators.create");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const payload = createOperatorSchema.parse(await request.json());
    const operatorId = await createOperator(payload);
    const operator = await getOperatorById(operatorId);

    return NextResponse.json({ operator });
  } catch (error) {
    return getErrorResponse(error);
  }
}
