import { getClientIp, getRequestOrigin, getRequestPath } from "@/lib/request-security";

type SecurityEventLevel = "info" | "warn";

type SecurityEvent = {
  event: string;
  level?: SecurityEventLevel;
  userId?: string | null;
  ip?: string | null;
  path?: string;
  origin?: string | null;
  details?: Record<string, unknown>;
  timestamp?: string;
};

type RequestSecurityEvent = Omit<SecurityEvent, "ip" | "path" | "origin">;

function compactDetails(details?: Record<string, unknown>) {
  if (!details) {
    return undefined;
  }

  const entries = Object.entries(details).filter(([, value]) => value !== undefined);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export function logSecurityEvent(event: SecurityEvent) {
  const payload = {
    timestamp: event.timestamp ?? new Date().toISOString(),
    category: "security",
    level: event.level ?? "info",
    event: event.event,
    userId: event.userId ?? undefined,
    ip: event.ip ?? undefined,
    path: event.path ?? undefined,
    origin: event.origin ?? undefined,
    details: compactDetails(event.details),
  };

  const logger = payload.level === "warn" ? console.warn : console.info;
  logger(JSON.stringify(payload));
}

export function logRequestSecurityEvent(
  event: string,
  request: Request,
  payload: RequestSecurityEvent = {},
) {
  logSecurityEvent({
    ...payload,
    event,
    ip: getClientIp(request),
    path: getRequestPath(request),
    origin: getRequestOrigin(request),
  });
}
