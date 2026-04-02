"use client"

import * as React from "react"

export interface SidebarConfig {
  variant: "sidebar" | "floating" | "inset"
  collapsible: "offcanvas" | "icon" | "none"
  side: "left" | "right"
  navigationMode: "sidebar" | "topbar"
}

export interface SidebarContextValue {
  config: SidebarConfig
  updateConfig: (config: Partial<SidebarConfig>) => void
}

export const SidebarContext = React.createContext<SidebarContextValue | null>(null)

const SIDEBAR_LAYOUT_STORAGE_KEY = "dashboard_layout_preferences"

export function SidebarConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = React.useState<SidebarConfig>({
    variant: "inset",
    collapsible: "offcanvas", 
    side: "left",
    navigationMode: "sidebar",
  })

  React.useEffect(() => {
    const storedValue = window.localStorage.getItem(SIDEBAR_LAYOUT_STORAGE_KEY)

    if (!storedValue) {
      return
    }

    try {
      const parsed = JSON.parse(storedValue) as Partial<SidebarConfig>
      setConfig((prev) => ({ ...prev, ...parsed }))
    } catch {
      window.localStorage.removeItem(SIDEBAR_LAYOUT_STORAGE_KEY)
    }
  }, [])

  const updateConfig = React.useCallback((newConfig: Partial<SidebarConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }))
  }, [])

  React.useEffect(() => {
    window.localStorage.setItem(SIDEBAR_LAYOUT_STORAGE_KEY, JSON.stringify(config))
  }, [config])

  return (
    <SidebarContext.Provider value={{ config, updateConfig }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebarConfig() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebarConfig must be used within a SidebarConfigProvider")
  }
  return context
}
