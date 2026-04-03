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

export function formatPostalCode(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8)

  if (digits.length <= 5) {
    return digits
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 13)

  if (digits.length <= 2) {
    return digits.length > 0 ? `(${digits}` : ""
  }

  const areaCode = digits.slice(0, 2)
  const local = digits.slice(2)

  if (local.length <= 4) {
    return `(${areaCode}) ${local}`
  }

  if (local.length <= 8) {
    return `(${areaCode}) ${local.slice(0, 4)}-${local.slice(4)}`
  }

  return `(${areaCode}) ${local.slice(0, 5)}-${local.slice(5, 9)}`
}

export function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14)

  if (digits.length <= 2) {
    return digits
  }

  if (digits.length <= 5) {
    return `${digits.slice(0, 2)}.${digits.slice(2)}`
  }

  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
  }

  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

export function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11)

  if (digits.length <= 3) {
    return digits
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`
  }

  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}
