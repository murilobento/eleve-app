import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { Pool } from "@neondatabase/serverless";

const port = process.env.PORT || "3000";
const localOrigin = `http://localhost:${port}`;
const configuredAuthUrl = process.env.BETTER_AUTH_URL;
const isLocalConfiguredUrl =
  configuredAuthUrl?.startsWith("http://localhost:") ||
  configuredAuthUrl?.startsWith("https://localhost:");
const appOrigin =
  process.env.NODE_ENV === "development" && isLocalConfiguredUrl
    ? localOrigin
    : configuredAuthUrl || process.env.NEXT_PUBLIC_APP_URL || localOrigin;

// Use an actual connection string or a fallback for dev if missing
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres",
});

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET || "minha-chave-secreta-muito-segura-e-longa-para-dev",
  baseURL: appOrigin,
  trustedOrigins: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
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
