import { NextResponse } from "next/server";

import { getPublicSiteContent } from "@/lib/public-site-data";

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error while processing the request.";
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET() {
  try {
    const content = await getPublicSiteContent();
    return NextResponse.json(content);
  } catch (error) {
    return getErrorResponse(error);
  }
}
