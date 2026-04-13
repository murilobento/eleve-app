import { NextResponse } from "next/server";

import { getCompany, listServiceOrders, requirePermission } from "@/lib/rbac";
import { listServiceAgendaEntriesForDate } from "@/lib/service-agenda";
import { renderServiceAgendaPdf } from "@/lib/service-agenda-pdf";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

function isValidDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function buildPdfFilename(date: string) {
  return `agenda-servicos-${date}.pdf`;
}

const EMPTY_EXPORT_ERROR = "There are no records to export for this date.";

export async function GET(request: Request) {
  try {
    const permission = await requirePermission(request, "service-orders.read");

    if (permission instanceof NextResponse) {
      return permission;
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date || !isValidDateKey(date)) {
      return NextResponse.json({ error: "Invalid date. Use YYYY-MM-DD." }, { status: 400 });
    }

    const [serviceOrders, company] = await Promise.all([
      listServiceOrders(),
      getCompany(),
    ]);

    const entries = listServiceAgendaEntriesForDate(serviceOrders, date);

    if (entries.length === 0) {
      return NextResponse.json({ error: EMPTY_EXPORT_ERROR }, { status: 400 });
    }

    const pdf = await renderServiceAgendaPdf({
      date,
      entries,
      company,
    });

    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${buildPdfFilename(date)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}
