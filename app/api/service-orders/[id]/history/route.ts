import { NextResponse } from "next/server";

import { listServiceOrderStatusHistory, requirePermission } from "@/lib/rbac";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const permission = await requirePermission(request, "service-orders.read");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { id } = await params;
    const history = await listServiceOrderStatusHistory(id);

    return NextResponse.json({ history });
  } catch (error) {
    return getErrorResponse(error);
  }
}
