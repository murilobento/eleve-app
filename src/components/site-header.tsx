"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { CommandSearch, SearchTrigger } from "@/components/command-search"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ModeToggle } from "@/components/mode-toggle"
import { useSidebarConfig } from "@/hooks/use-sidebar-config"
import { useIsMobile } from "@/hooks/use-mobile"
import { useI18n } from "@/i18n/provider"

export function SiteHeader() {
  const [searchOpen, setSearchOpen] = React.useState(false)
  const { config, updateConfig } = useSidebarConfig()
  const isMobile = useIsMobile()
  const { t } = useI18n()
  const showSidebarTrigger = config.navigationMode === "sidebar" || isMobile

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
          <div className="flex-1 max-w-sm">
            <SearchTrigger onClick={() => setSearchOpen(true)} />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-1 rounded-md border p-1 md:flex">
              <Button
                type="button"
                variant={config.navigationMode === "sidebar" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 cursor-pointer px-2"
                onClick={() => updateConfig({ navigationMode: "sidebar" })}
              >
                {t("common.sidebar")}
              </Button>
              <Button
                type="button"
                variant={config.navigationMode === "topbar" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 cursor-pointer px-2"
                onClick={() => updateConfig({ navigationMode: "topbar" })}
              >
                {t("common.topbar")}
              </Button>
            </div>
            <LanguageSwitcher />
            <ModeToggle />
          </div>
        </div>
      </header>
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
