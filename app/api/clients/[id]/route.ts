import { NextResponse } from "next/server";

import { updateClientSchema } from "@/lib/clients-admin";
import {
  deleteClient,
  getClientById,
  requirePermission,
  updateClient,
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
    const permission = await requirePermission(request, "clients.update");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { id } = await params;
    const payload = updateClientSchema.parse(await request.json());
    await updateClient(id, payload);
    const client = await getClientById(id);

    return NextResponse.json({ client });
  } catch (error) {
    return getErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const permission = await requirePermission(request, "clients.delete");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { id } = await params;
    await deleteClient(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return getErrorResponse(error);
  }
}
