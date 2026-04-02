"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BriefcaseBusiness,
  Building2,
  Calendar,
  LayoutDashboard,
  LayoutTemplate,
  Shield,
  Truck,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react"

import { useRbac } from "@/hooks/use-rbac"
import { useI18n, useLocale } from "@/i18n/provider"
import { stripLocaleFromPath } from "@/i18n/config"
import { cn, getAppUrl } from "@/lib/utils"

export type AppNavigationItem = {
  title: string
  url: string
  icon?: LucideIcon
  visible: boolean
  target?: "_blank"
}

export type AppNavigationGroup = {
  label: string
  items: AppNavigationItem[]
}

export function useAppNavigation() {
  const { hasPermission, isLoading } = useRbac()
  const locale = useLocale()
  const { t } = useI18n()

  const navGroups = React.useMemo<AppNavigationGroup[]>(() => [
    {
      label: t("navigation.dashboards"),
      items: [
        {
          title: t("navigation.dashboard"),
          url: getAppUrl("/dashboard", locale),
          icon: LayoutDashboard,
          visible: hasPermission("dashboard.read"),
        },
      ],
    },
    {
      label: t("navigation.apps"),
      items: [
        {
          title: t("navigation.calendar"),
          url: getAppUrl("/calendar", locale),
          icon: Calendar,
          visible: hasPermission("calendar.read"),
        },
        {
          title: t("navigation.company"),
          url: getAppUrl("/company", locale),
          icon: Building2,
          visible: hasPermission("company.read"),
        },
        {
          title: t("navigation.clients"),
          url: getAppUrl("/clients", locale),
          icon: BriefcaseBusiness,
          visible: hasPermission("clients.read"),
        },
        {
          title: t("navigation.equipment"),
          url: getAppUrl("/equipment", locale),
          icon: Truck,
          visible: hasPermission("equipment.read"),
        },
        {
          title: t("navigation.equipmentTypes"),
          url: getAppUrl("/equipment-types", locale),
          icon: Wrench,
          visible: hasPermission("equipment-types.read"),
        },
        {
          title: t("navigation.users"),
          url: getAppUrl("/users", locale),
          icon: Users,
          visible: hasPermission("users.read"),
        },
        {
          title: t("navigation.roles"),
          url: getAppUrl("/roles", locale),
          icon: Shield,
          visible: hasPermission("roles.read"),
        },
      ],
    },
    {
      label: t("navigation.pages"),
      items: [
        {
          title: t("navigation.landing"),
          url: getAppUrl("/landing", locale),
          icon: LayoutTemplate,
          target: "_blank",
          visible: true,
        },
      ],
    },
  ], [hasPermission, locale, t])

  const visibleGroups = React.useMemo(
    () =>
      navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => isLoading || item.visible),
        }))
        .filter((group) => group.items.length > 0),
    [isLoading, navGroups]
  )

  const flatItems = React.useMemo(
    () =>
      visibleGroups.flatMap((group) =>
        group.items.map((item) => ({
          ...item,
          group: group.label,
        }))
      ),
    [visibleGroups]
  )

  return {
    navGroups: visibleGroups,
    flatItems,
  }
}

export function AppTopbar() {
  const pathname = usePathname()
  const normalizedPathname = stripLocaleFromPath(pathname)
  const { navGroups } = useAppNavigation()

  return (
    <nav className="hidden border-b bg-card/70 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-card/60 md:block lg:px-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {navGroups.map((group) => (
          <div key={group.label} className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs font-medium uppercase tracking-[0.08em]">
              {group.label}
            </span>
            <div className="flex flex-wrap items-center gap-1">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = normalizedPathname === stripLocaleFromPath(item.url)

                return (
                  <Link
                    key={item.url}
                    href={item.url}
                    target={item.target}
                    rel={item.target === "_blank" ? "noopener noreferrer" : undefined}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    {Icon ? <Icon className="size-4" /> : null}
                    <span>{item.title}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  )
}
