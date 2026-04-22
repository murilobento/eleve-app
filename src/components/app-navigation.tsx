"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BriefcaseBusiness,
  Building2,
  Calendar,
  ChevronDown,
  Coins,
  FileText,
  LayoutDashboard,
  ReceiptText,
  Shield,
  Store,
  Truck,
  UserCog,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
      label: t("navigation.mainMenu"),
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
      label: t("navigation.registrations"),
      items: [
        {
          title: t("navigation.clients"),
          url: getAppUrl("/clients", locale),
          icon: BriefcaseBusiness,
          visible: hasPermission("clients.read"),
        },
        {
          title: t("navigation.operators"),
          url: getAppUrl("/operators", locale),
          icon: UserCog,
          visible: hasPermission("operators.read"),
        },
        {
          title: t("navigation.serviceTypes"),
          url: getAppUrl("/service-types", locale),
          icon: Wrench,
          visible: hasPermission("service-types.read"),
        },
        {
          title: t("navigation.equipment"),
          url: getAppUrl("/equipment", locale),
          icon: Truck,
          visible: hasPermission("equipment.read"),
        },
        {
          title: t("navigation.suppliers"),
          url: getAppUrl("/suppliers", locale),
          icon: Store,
          visible: hasPermission("suppliers.read"),
        },
      ],
    },
    {
      label: t("navigation.movements"),
      items: [
        {
          title: t("navigation.calendar"),
          url: getAppUrl("/service-schedule", locale),
          icon: Calendar,
          visible: hasPermission("calendar.read"),
        },
        {
          title: t("navigation.budgets"),
          url: getAppUrl("/budgets", locale),
          icon: FileText,
          visible: hasPermission("budgets.read"),
        },
        {
          title: t("navigation.serviceOrders"),
          url: getAppUrl("/service-orders", locale),
          icon: Wrench,
          visible: hasPermission("service-orders.read"),
        },
        {
          title: t("navigation.equipmentCosts"),
          url: getAppUrl("/equipment-costs", locale),
          icon: Coins,
          visible: hasPermission("equipment-costs.read"),
        },
        {
          title: t("navigation.equipmentRequisitions"),
          url: getAppUrl("/equipment-requisitions", locale),
          icon: ReceiptText,
          visible: hasPermission("equipment-requisitions.read"),
        },
      ],
    },
    {
      label: t("navigation.administrative"),
      items: [
        {
          title: t("navigation.company"),
          url: getAppUrl("/company", locale),
          icon: Building2,
          visible: hasPermission("company.read"),
        },
        {
          title: t("navigation.roles"),
          url: getAppUrl("/roles", locale),
          icon: Shield,
          visible: hasPermission("roles.read"),
        },
        {
          title: t("navigation.users"),
          url: getAppUrl("/users", locale),
          icon: Users,
          visible: hasPermission("users.read"),
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
  const mainGroup = navGroups[0]
  const dashboardItem = mainGroup?.items[0]
  const groupedDropdowns = dashboardItem ? navGroups.slice(1) : navGroups

  return (
    <nav className="hidden border-b bg-card/70 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-card/60 md:block lg:px-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {dashboardItem ? (
          <Link
            href={dashboardItem.url}
            target={dashboardItem.target}
            rel={dashboardItem.target === "_blank" ? "noopener noreferrer" : undefined}
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-md px-3 text-sm transition-colors",
              normalizedPathname === stripLocaleFromPath(dashboardItem.url)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {dashboardItem.icon ? <dashboardItem.icon className="size-4" /> : null}
            <span>{dashboardItem.title}</span>
          </Link>
        ) : null}
        {groupedDropdowns.map((group) => (
          <div key={group.label} className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "h-8 cursor-pointer gap-1.5 px-3 text-sm",
                    group.items.some((item) => normalizedPathname === stripLocaleFromPath(item.url))
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {group.label}
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = normalizedPathname === stripLocaleFromPath(item.url)

                  return (
                    <DropdownMenuItem asChild key={item.url} className={cn("cursor-pointer", isActive && "bg-accent")}>
                      <Link
                        href={item.url}
                        target={item.target}
                        rel={item.target === "_blank" ? "noopener noreferrer" : undefined}
                      >
                        {Icon ? <Icon className="size-4" /> : null}
                        <span>{item.title}</span>
                      </Link>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </nav>
  )
}
