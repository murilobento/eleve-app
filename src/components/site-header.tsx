"use client"

import * as React from "react"
import { Expand, Lock, Minimize, PanelLeft, PanelTop } from "lucide-react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { CommandSearch, SearchTrigger } from "@/components/command-search"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ModeToggle } from "@/components/mode-toggle"
import { useCompanyDisplayName } from "@/hooks/use-company-display-name"
import { useSidebarConfig } from "@/hooks/use-sidebar-config"
import { useIsMobile } from "@/hooks/use-mobile"
import { stripLocaleFromPath } from "@/i18n/config"
import { useI18n } from "@/i18n/provider"
import { triggerManualLock } from "@/lib/lockscreen"

export function SiteHeader() {
  const [searchOpen, setSearchOpen] = React.useState(false)
  const { config, updateConfig } = useSidebarConfig()
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const { t } = useI18n()
  const { displayName, isLoading } = useCompanyDisplayName()
  const showSidebarTrigger = config.navigationMode === "sidebar" || isMobile
  const companyName = displayName ?? (isLoading ? t("common.loadingCompany") : t("navigation.company"))
  const showTopbarCompanyName = config.navigationMode === "topbar" && !isMobile
  const normalizedPathname = stripLocaleFromPath(pathname)
  const nextNavigationMode = config.navigationMode === "sidebar" ? "topbar" : "sidebar"
  const [isFullscreen, setIsFullscreen] = React.useState(false)

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  React.useEffect(() => {
    const pageTitleMap: Record<string, string> = {
      "/dashboard": t("navigation.dashboard"),
      "/service-schedule": t("navigation.calendar"),
      "/calendar": t("navigation.calendar"),
      "/budgets": t("navigation.budgets"),
      "/service-orders": t("navigation.serviceOrders"),
      "/equipment-costs": t("navigation.equipmentCosts"),
      "/equipment-requisitions": t("navigation.equipmentRequisitions"),
      "/company": t("navigation.company"),
      "/clients": t("navigation.clients"),
      "/suppliers": t("navigation.suppliers"),
      "/operators": t("navigation.operators"),
      "/equipment-types": t("navigation.equipmentTypes"),
      "/service-types": t("navigation.serviceTypes"),
      "/equipment": t("navigation.equipment"),
      "/roles": t("navigation.roles"),
      "/users": t("navigation.users"),
      "/unauthorized": t("navigation.unauthorized"),
    }

    const pageTitle =
      Object.entries(pageTitleMap).find(([route]) => normalizedPathname.startsWith(route))?.[1] ??
      t("navigation.dashboard")

    document.title = `${companyName} | ${pageTitle}`
  }, [companyName, normalizedPathname, t])

  React.useEffect(() => {
    const updateFullscreen = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }

    document.addEventListener("fullscreenchange", updateFullscreen)
    updateFullscreen()

    return () => {
      document.removeEventListener("fullscreenchange", updateFullscreen)
    }
  }, [])

  const handleToggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      // Ignore browser/permission errors.
    }
  }

  return (
    <>
      <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
        <div className="flex w-full items-center gap-1 px-4 py-3 lg:gap-2 lg:px-6">
          {showSidebarTrigger ? (
            <>
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mx-2 data-[orientation=vertical]:h-4"
              />
            </>
          ) : null}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {showTopbarCompanyName ? (
              <div className="hidden max-w-56 items-center gap-2 md:flex">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Logo size={18} className="text-current" />
                </div>
                <span className="truncate text-sm font-medium text-foreground">
                  {companyName}
                </span>
              </div>
            ) : null}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-full max-w-sm">
              <SearchTrigger onClick={() => setSearchOpen(true)} />
            </div>
            <div className="hidden md:flex">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="cursor-pointer"
                onClick={() => updateConfig({ navigationMode: nextNavigationMode })}
                aria-label={config.navigationMode === "sidebar" ? t("common.sidebar") : t("common.topbar")}
                title={config.navigationMode === "sidebar" ? t("common.sidebar") : t("common.topbar")}
              >
                {config.navigationMode === "sidebar" ? (
                  <PanelLeft className="size-4" />
                ) : (
                  <PanelTop className="size-4" />
                )}
                <span className="sr-only">
                  {config.navigationMode === "sidebar" ? t("common.sidebar") : t("common.topbar")}
                </span>
              </Button>
            </div>
            <LanguageSwitcher />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="cursor-pointer"
              onClick={triggerManualLock}
              aria-label={t("common.lockScreen")}
              title={t("common.lockScreen")}
            >
              <Lock className="size-4" />
              <span className="sr-only">{t("common.lockScreen")}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="cursor-pointer"
              onClick={handleToggleFullscreen}
              aria-label={isFullscreen ? t("common.exitFullscreen") : t("common.fullscreen")}
              title={isFullscreen ? t("common.exitFullscreen") : t("common.fullscreen")}
            >
              {isFullscreen ? <Minimize className="size-4" /> : <Expand className="size-4" />}
              <span className="sr-only">{isFullscreen ? t("common.exitFullscreen") : t("common.fullscreen")}</span>
            </Button>
            <ModeToggle />
          </div>
        </div>
      </header>
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
