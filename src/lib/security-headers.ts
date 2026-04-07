import { NextResponse } from "next/server";

type CspMode = "off" | "report-only" | "enforce";

function getCspMode(): CspMode {
  const configured = process.env.SECURITY_CSP_MODE?.trim().toLowerCase();

  if (configured === "off" || configured === "report-only" || configured === "enforce") {
    return configured;
  }

  return process.env.NODE_ENV === "production" ? "report-only" : "off";
}

function buildCspValue() {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://viacep.com.br https://brasilapi.com.br",
  ].join("; ");
}

export function withSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  const cspMode = getCspMode();
  if (cspMode === "enforce") {
    response.headers.set("Content-Security-Policy", buildCspValue());
  } else if (cspMode === "report-only") {
    response.headers.set("Content-Security-Policy-Report-Only", buildCspValue());
  }

  return response;
}
