import { NextResponse } from "next/server";

import { renderBudgetPdf } from "@/lib/budget-pdf";
import { getBudgetById, getClientById, getCompany, requirePermission } from "@/lib/rbac";

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
    const permission = await requirePermission(request, "budgets.read");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { id } = await params;
    const budget = await getBudgetById(id);

    if (!budget) {
      return NextResponse.json({ error: "Budget not found." }, { status: 404 });
    }

    const [company, client] = await Promise.all([
      getCompany(),
      getClientById(budget.clientId),
    ]);

    const pdf = await renderBudgetPdf({
      budget,
      company,
      client,
    });

    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${buildPdfFilename(budget.number)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}
