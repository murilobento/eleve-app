"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Calendar,
  LayoutTemplate,
  Building2,
  BriefcaseBusiness,
  Users,
  Shield,
  Truck,
  Wrench,
} from "lucide-react"
import Link from "next/link"
import { Logo } from "@/components/logo"
import { getAppUrl } from "@/lib/utils"
import { useI18n, useLocale } from "@/i18n/provider"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { useRbac } from "@/hooks/use-rbac"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { hasPermission, isLoading } = useRbac()
  const locale = useLocale()
  const { t } = useI18n()

  const data = {
    navGroups: [
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
            target: "_blank",
            icon: LayoutTemplate,
            visible: true,
          },
        ],
      },
    ],
  }

  const navGroups = data.navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => isLoading || item.visible),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={getAppUrl("/dashboard", locale)}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Logo size={24} className="text-current" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">ShadcnStore</span>
                  <span className="truncate text-xs">{t("navigation.adminDashboard")}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <NavMain key={group.label} label={group.label} items={group.items} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
