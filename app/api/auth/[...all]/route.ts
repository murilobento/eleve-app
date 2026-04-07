import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";
import { getUserAccessStateByEmail } from "@/lib/rbac";
import { logRequestSecurityEvent } from "@/lib/security-events";

const handler = toNextJsHandler(auth);

export const GET = handler.GET;

export async function POST(request: Request) {
  const pathname = new URL(request.url).pathname;
  const isEmailSignIn = pathname.endsWith("/sign-in/email");
  const body = isEmailSignIn ? await request.clone().json().catch(() => null) : null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : null;

  if (pathname.includes("/sign-up")) {
    logRequestSecurityEvent("auth.public_signup_blocked", request, {
      level: "warn",
      details: {
        path: pathname,
      },
    });
    return NextResponse.json(
      {
        error: "Public sign up is disabled. Ask an administrator to create your account.",
        code: "SIGN_UP_DISABLED",
      },
      { status: 403 },
    );
  }

  if (isEmailSignIn) {
    if (email) {
      const accessState = await getUserAccessStateByEmail(email);

      if (accessState?.isActive === false) {
        logRequestSecurityEvent("auth.login.blocked_inactive", request, {
          level: "warn",
          details: {
            reason: accessState.reason ?? "Your account is inactive.",
          },
        });
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

  const response = await handler.POST(request);

  if (isEmailSignIn) {
    if (response.status === 429) {
      logRequestSecurityEvent("auth.login.rate_limited", request, {
        level: "warn",
        details: {
          status: response.status,
        },
      });
    } else if (response.ok) {
      logRequestSecurityEvent("auth.login.succeeded", request, {
        details: {
          status: response.status,
          usedEmailHint: Boolean(email),
        },
      });
    } else {
      logRequestSecurityEvent("auth.login.failed", request, {
        level: "warn",
        details: {
          status: response.status,
          usedEmailHint: Boolean(email),
        },
      });
    }
  }

  return response;
}
