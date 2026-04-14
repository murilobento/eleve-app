import { NextResponse } from "next/server";

import { renderServiceOrderPdf } from "@/lib/service-order-pdf";
import { getClientById, getCompany, getServiceOrderById, requirePermission } from "@/lib/rbac";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

function buildPdfFilename(number: string) {
  return `${number.toLowerCase().replace(/[^a-z0-9-_]+/g, "-")}.pdf`;
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
    const serviceOrder = await getServiceOrderById(id);

    if (!serviceOrder) {
      return NextResponse.json({ error: "Service order not found." }, { status: 404 });
    }

    const [company, client] = await Promise.all([
      getCompany(),
      getClientById(serviceOrder.clientId),
    ]);

    const pdf = await renderServiceOrderPdf({
      serviceOrder,
      company,
      client,
    });

    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${buildPdfFilename(serviceOrder.number)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}
