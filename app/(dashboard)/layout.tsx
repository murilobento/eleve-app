"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { useSidebarConfig } from "@/hooks/use-sidebar-config"
import { SidebarConfigProvider } from "@/contexts/sidebar-context"
import {
  SidebarInset,
  SidebarProvider as UISidebarProvider,
} from "@/components/ui/sidebar"
import { signOut, useSession } from "@/lib/auth-client"
import { useRbac } from "@/hooks/use-rbac"
import { usePathname, useRouter } from "next/navigation"
import { getAppUrl } from "@/lib/utils"
import { stripLocaleFromPath } from "@/i18n/config"
import { useI18n, useLocale } from "@/i18n/provider"

const routePermissions = [
  { path: "/dashboard", permission: "dashboard.read" },
  { path: "/calendar", permission: "calendar.read" },
  { path: "/company", permission: "company.read" },
  { path: "/clients", permission: "clients.read" },
  { path: "/equipment-types", permission: "equipment-types.read" },
  { path: "/equipment", permission: "equipment.read" },
  { path: "/users", permission: "users.read" },
  { path: "/roles", permission: "roles.read" },
] as const

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { config } = useSidebarConfig()
  const { data: session, isPending } = useSession()
  const { hasPermission, isLoading: isLoadingRbac, hasResolved, error: rbacError } = useRbac(Boolean(session))
  const pathname = usePathname()
  const locale = useLocale()
  const { t } = useI18n()
  const router = useRouter()
  const normalizedPathname = stripLocaleFromPath(pathname)

  React.useEffect(() => {
    if (!isPending && !session) {
      router.replace(getAppUrl("/auth/sign-in", locale))
    }
  }, [session, isPending, locale, router])

  React.useEffect(() => {
    if (!session || !rbacError || !/inactive|ban/i.test(rbacError)) {
      return
    }

    void signOut().finally(() => {
      router.replace(getAppUrl("/auth/sign-in", locale))
    })
  }, [locale, rbacError, router, session])

  React.useEffect(() => {
    if (!session || isLoadingRbac || !hasResolved || normalizedPathname === "/unauthorized") {
      return
    }

    const match = routePermissions.find((item) => normalizedPathname.startsWith(item.path))

    if (match && !hasPermission(match.permission)) {
      router.push(getAppUrl("/unauthorized", locale))
    }
  }, [hasPermission, hasResolved, isLoadingRbac, locale, normalizedPathname, router, session])

  if (isPending || (session && (!hasResolved || isLoadingRbac) && normalizedPathname !== "/unauthorized")) {
    return <div className="min-h-screen flex items-center justify-center">{t("common.loading")}</div>
  }

  if (!session) {
    return <div className="min-h-screen flex items-center justify-center">{t("common.loading")}</div>
  }

  return (
    <UISidebarProvider
      style={
        {
          "--sidebar-width": "16rem",
          "--sidebar-width-icon": "3rem", 
          "--header-height": "calc(var(--spacing) * 14)",
        } as React.CSSProperties
      }
      className={config.collapsible === "none" ? "sidebar-none-mode" : ""}
    >
      {config.side === "left" ? (
        <>
          <AppSidebar 
            variant={config.variant} 
            collapsible={config.collapsible} 
            side={config.side} 
          />
          <SidebarInset>
            <SiteHeader />
            <div className="flex flex-1 flex-col">
              <div className="@container/main flex flex-1 flex-col gap-2">
                <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                  {children}
                </div>
              </div>
            </div>
          </SidebarInset>
        </>
      ) : (
        <>
          <SidebarInset>
            <SiteHeader />
            <div className="flex flex-1 flex-col">
              <div className="@container/main flex flex-1 flex-col gap-2">
                <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                  {children}
                </div>
              </div>
            </div>
          </SidebarInset>
          <AppSidebar 
            variant={config.variant} 
            collapsible={config.collapsible} 
            side={config.side} 
          />
        </>
      )}
    </UISidebarProvider>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarConfigProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SidebarConfigProvider>
  )
}
