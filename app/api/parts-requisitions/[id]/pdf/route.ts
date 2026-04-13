import { NextResponse } from "next/server";

import { renderPartsRequisitionPdf } from "@/lib/equipment-requisition-pdf";
import {
  getCompany,
  getPartsRequisitionById,
  getSupplierById,
  requirePermission,
} from "@/lib/rbac";

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
    const permission = await requirePermission(request, "equipment-requisitions.read");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { id } = await params;
    const requisition = await getPartsRequisitionById(id);

    if (!requisition) {
      return NextResponse.json({ error: "Parts requisition not found." }, { status: 404 });
    }

    if (requisition.status === "draft") {
      return NextResponse.json({ error: "Only issued requisitions can generate PDF." }, { status: 400 });
    }

    const [company, supplier] = await Promise.all([
      getCompany(),
      getSupplierById(requisition.supplierId),
    ]);

    const pdf = await renderPartsRequisitionPdf({
      requisition,
      company,
      supplier,
    });

    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${buildPdfFilename(requisition.number)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}
