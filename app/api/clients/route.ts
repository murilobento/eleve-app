import { NextResponse } from "next/server";

import { createClientSchema } from "@/lib/clients-admin";
import {
  createClient,
  getClientById,
  listClients,
  requirePermission,
} from "@/lib/rbac";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  try {
    const permission = await requirePermission(request, "clients.read");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const clients = await listClients();

    return NextResponse.json({ clients });
  } catch (error) {
    return getErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const permission = await requirePermission(request, "clients.create");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const payload = createClientSchema.parse(await request.json());
    const clientId = await createClient(payload);
    const client = await getClientById(clientId);

    return NextResponse.json({ client });
  } catch (error) {
    return getErrorResponse(error);
  }
}
