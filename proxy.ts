import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  defaultLocale,
  extractLocaleFromPath,
  getLocalizedPath,
  isLocale,
  localeCookieName,
  stripLocaleFromPath,
} from "@/i18n/config";
import { withSecurityHeaders } from "@/lib/security-headers";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const pathLocale = extractLocaleFromPath(pathname);
  const cookieLocale = request.cookies.get(localeCookieName)?.value;
  const preferredLocale = cookieLocale && isLocale(cookieLocale) ? cookieLocale : defaultLocale;
  const strippedPath = stripLocaleFromPath(pathname);
  const sessionCookie = request.cookies.get("better-auth.session_token");
  const isApiRoute = pathname.startsWith("/api");
  const isAuthPage = strippedPath.startsWith("/auth");
  const isLanding = strippedPath === "/landing" || strippedPath === "/";

  if (!isApiRoute && !pathLocale) {
    const url = request.nextUrl.clone();
    url.pathname = getLocalizedPath(strippedPath, preferredLocale);
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  if (isLanding || isAuthPage || isApiRoute) {
    return withSecurityHeaders(NextResponse.next());
  }

  if (!sessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = getLocalizedPath("/auth/sign-in", pathLocale ?? preferredLocale);
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  return withSecurityHeaders(NextResponse.next());
}

export default proxy;

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
