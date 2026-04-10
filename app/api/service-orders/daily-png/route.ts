import { NextResponse } from "next/server";

import { getCompany, listServiceOrders, requirePermission } from "@/lib/rbac";
import { listServiceAgendaEntriesForDate } from "@/lib/service-agenda";
import { renderServiceAgendaPng } from "@/lib/service-agenda-png";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

function isValidDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function buildFilename(date: string) {
  return `agenda-servicos-${date}.png`;
}

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

    const png = await renderServiceAgendaPng({
      date,
      entries: listServiceAgendaEntriesForDate(serviceOrders, date),
      company,
    });

    return new NextResponse(png, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="${buildFilename(date)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}
