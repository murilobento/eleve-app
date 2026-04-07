import { NextResponse } from "next/server";

import { logRequestSecurityEvent } from "@/lib/security-events";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter: number;
};

type EnforceRateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  request: Request;
  userId?: string | null;
  event?: string;
  message?: string;
  code?: string;
  details?: Record<string, unknown>;
};

const store = new Map<string, RateLimitEntry>();
let lastSweepAt = 0;

function sweepExpiredEntries(now: number) {
  if (now - lastSweepAt < 60_000) {
    return;
  }

  lastSweepAt = now;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function consumeRateLimit(key: string, limit: number, windowMs: number): RateLimitDecision {
  const now = Date.now();
  sweepExpiredEntries(now);

  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });

    return {
      allowed: true,
      limit,
      remaining: Math.max(limit - 1, 0),
      resetAt,
      retryAfter: Math.ceil(windowMs / 1000),
    };
  }

  current.count += 1;
  const remaining = Math.max(limit - current.count, 0);
  const retryAfter = Math.max(Math.ceil((current.resetAt - now) / 1000), 1);

  return {
    allowed: current.count <= limit,
    limit,
    remaining,
    resetAt: current.resetAt,
    retryAfter,
  };
}

export function buildRateLimitHeaders(decision: RateLimitDecision) {
  return {
    "Retry-After": String(decision.retryAfter),
    "X-RateLimit-Limit": String(decision.limit),
    "X-RateLimit-Remaining": String(decision.remaining),
    "X-RateLimit-Reset": new Date(decision.resetAt).toISOString(),
  };
}

export function createRateLimitExceededResponse(
  decision: RateLimitDecision,
  message = "Too many requests. Try again later.",
  code = "RATE_LIMITED",
) {
  return NextResponse.json(
    { error: message, code },
    {
      status: 429,
      headers: buildRateLimitHeaders(decision),
    },
  );
}

export function enforceRateLimit({
  key,
  limit,
  windowMs,
  request,
  userId,
  event = "security.rate_limit_exceeded",
  message,
  code,
  details,
}: EnforceRateLimitOptions) {
  const decision = consumeRateLimit(key, limit, windowMs);

  if (decision.allowed) {
    return null;
  }

  logRequestSecurityEvent(event, request, {
    level: "warn",
    userId,
    details: {
      ...details,
      limit,
      windowMs,
      retryAfter: decision.retryAfter,
    },
  });

  return createRateLimitExceededResponse(decision, message, code);
}
