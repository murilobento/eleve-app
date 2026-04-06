import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";
import { getUserAccessStateByEmail } from "@/lib/rbac";

const handler = toNextJsHandler(auth);

export const GET = handler.GET;

export async function POST(request: Request) {
  const pathname = new URL(request.url).pathname;

  if (pathname.includes("/sign-up")) {
    return NextResponse.json(
      {
        error: "Public sign up is disabled. Ask an administrator to create your account.",
        code: "SIGN_UP_DISABLED",
      },
      { status: 403 },
    );
  }

  if (pathname.endsWith("/sign-in/email")) {
    const body = await request.clone().json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email : null;

    if (email) {
      const accessState = await getUserAccessStateByEmail(email);

      if (accessState?.isActive === false) {
        return NextResponse.json(
          {
            error: accessState.reason || "Your account is inactive.",
            code: "USER_INACTIVE",
          },
          { status: 403 },
        );
      }
    }
  }

  return handler.POST(request);
}
