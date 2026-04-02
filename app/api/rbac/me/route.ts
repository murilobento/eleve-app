import { NextResponse } from "next/server";

import { getCurrentSessionState } from "@/lib/rbac";

export async function GET(request: Request) {
  const state = await getCurrentSessionState(request);

  if (!state) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!state.accessState.isActive) {
    return NextResponse.json(
      { error: state.accessState.reason || "Your account is inactive." },
      { status: 403 },
    );
  }

  return NextResponse.json({
    roles: state.roles,
    permissions: state.permissions,
  });
}
