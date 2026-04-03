"use client"

import * as React from "react"
import Link from "next/link"
import { Logo } from "@/components/logo"
import { useI18n, useLocale } from "@/i18n/provider"
import { getAppUrl } from "@/lib/utils"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { useAppNavigation } from "@/components/app-navigation"
import { useCompanyDisplayName } from "@/hooks/use-company-display-name"
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
  const locale = useLocale()
  const { t } = useI18n()
  const { navGroups } = useAppNavigation()
  const { displayName, isLoading } = useCompanyDisplayName()
  const companyName = displayName ?? (isLoading ? t("common.loadingCompany") : t("navigation.company"))

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
                  <span className="truncate font-medium">{companyName}</span>
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
