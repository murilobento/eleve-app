import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { getLocalizedPath, type AppLocale } from "@/i18n/config"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the correct URL for public assets
 * Handles both development and production asset paths
 */
export function assetUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return cleanPath
}

/**
 * Get the correct URL path with basename prefix for internal navigation
 * @param path - The internal path (e.g., "/dashboard", "/auth/sign-in")
 * @returns The full path with basename prefix
 */
export function getAppUrl(path: string, locale?: AppLocale): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return locale ? getLocalizedPath(cleanPath, locale) : cleanPath
}
