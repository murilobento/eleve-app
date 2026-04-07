import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { Pool } from "@neondatabase/serverless";

import { CLIENT_IP_HEADERS } from "@/lib/request-security";

const port = process.env.PORT || "3000";
const localOrigin = `http://localhost:${port}`;
const isProduction = process.env.NODE_ENV === "production";
const defaultLocalOrigins = ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", localOrigin];

function normalizeAbsoluteUrl(value: string, envName: string) {
  try {
    const url = new URL(value);
    const pathname = url.pathname.replace(/\/+$/, "");
    return `${url.origin}${pathname}`;
  } catch {
    throw new Error(`${envName} must be a valid absolute URL.`);
  }
}

function normalizeOrigin(value: string, envName: string) {
  try {
    return new URL(value).origin;
  } catch {
    throw new Error(`${envName} must contain valid absolute URLs.`);
  }
}

function parseConfiguredOrigins() {
  const configured = process.env.BETTER_AUTH_TRUSTED_ORIGINS;

  if (!configured) {
    return [];
  }

  return configured
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map((value) => normalizeOrigin(value, "BETTER_AUTH_TRUSTED_ORIGINS"));
}

function resolveAppOrigin() {
  const configuredAuthUrl = process.env.BETTER_AUTH_URL?.trim();
  const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredAuthUrl) {
    return normalizeAbsoluteUrl(configuredAuthUrl, "BETTER_AUTH_URL");
  }

  if (publicAppUrl) {
    return normalizeAbsoluteUrl(publicAppUrl, "NEXT_PUBLIC_APP_URL");
  }

  if (isProduction) {
    throw new Error("BETTER_AUTH_URL or NEXT_PUBLIC_APP_URL must be configured in production.");
  }

  return localOrigin;
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (databaseUrl) {
    return databaseUrl;
  }

  if (isProduction) {
    throw new Error("DATABASE_URL environment variable is required in production.");
  }

  return "postgres://postgres:postgres@localhost:5432/postgres";
}

function getAuthSecret() {
  const secret = process.env.BETTER_AUTH_SECRET?.trim();

  if (secret) {
    return secret;
  }

  if (isProduction) {
    throw new Error("BETTER_AUTH_SECRET environment variable is required in production.");
  }

  return "dev-only-fallback-secret-not-for-production";
}

function getTrustedOrigins(appOrigin: string) {
  const baseOrigins = isProduction ? [normalizeOrigin(appOrigin, "BETTER_AUTH_URL")] : defaultLocalOrigins;
  return [...new Set([...baseOrigins, normalizeOrigin(appOrigin, "BETTER_AUTH_URL"), ...parseConfiguredOrigins()])];
}

const appOrigin = resolveAppOrigin();

export const pool = new Pool({
  connectionString: getDatabaseUrl(),
});

export const auth = betterAuth({
  database: pool,
  secret: getAuthSecret(),
  baseURL: appOrigin,
  trustedOrigins: getTrustedOrigins(appOrigin),
  rateLimit: {
    enabled: isProduction,
    storage: "memory",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": {
        window: 60,
        max: 5,
      },
    },
  },
  advanced: {
    ipAddress: {
      ipAddressHeaders: [...CLIENT_IP_HEADERS],
      ipv6Subnet: 64,
    },
  },
  databaseHooks: {
    user: {
      create: {
        async before(user, context) {
          if (!context) {
            return;
          }

          const totalUsers = await context.context.internalAdapter.countTotalUsers();
          const isFirstUser = totalUsers === 0;

          return {
            data: {
              ...user,
              role: isFirstUser ? "admin" : typeof user.role === "string" ? user.role : "user",
            },
          };
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
  ],
});
