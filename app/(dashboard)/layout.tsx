"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { AppTopbar } from "@/components/app-navigation"
import { SiteHeader } from "@/components/site-header"
import { CompanyDisplayNameProvider } from "@/hooks/use-company-display-name"
import { useSidebarConfig } from "@/hooks/use-sidebar-config"
import { SidebarConfigProvider } from "@/contexts/sidebar-context"
import {
  SidebarInset,
  SidebarProvider as UISidebarProvider,
} from "@/components/ui/sidebar"
import { signIn, signOut, useSession } from "@/lib/auth-client"
import { useRbac } from "@/hooks/use-rbac"
import { usePathname, useRouter } from "next/navigation"
import { getAppUrl } from "@/lib/utils"
import { stripLocaleFromPath } from "@/i18n/config"
import { useI18n, useLocale } from "@/i18n/provider"
import { useIsMobile } from "@/hooks/use-mobile"
import { IdleLockScreen } from "@/components/security/idle-lock-screen"
import {
  FAILED_ATTEMPTS_STORAGE_KEY,
  IDLE_TIMEOUT_MS,
  LAST_ACTIVITY_STORAGE_KEY,
  LOCK_STORAGE_KEY,
  MANUAL_LOCK_EVENT,
} from "@/lib/lockscreen"

const routePermissions = [
  { path: "/dashboard", permission: "dashboard.read" },
  { path: "/calendar", permission: "calendar.read" },
  { path: "/budgets", permission: "budgets.read" },
  { path: "/service-orders", permission: "service-orders.read" },
  { path: "/company", permission: "company.read" },
  { path: "/clients", permission: "clients.read" },
  { path: "/operators", permission: "operators.read" },
  { path: "/equipment-types", permission: "equipment-types.read" },
  { path: "/service-types", permission: "service-types.read" },
  { path: "/equipment", permission: "equipment.read" },
  { path: "/users", permission: "users.read" },
  { path: "/roles", permission: "roles.read" },
] as const

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { config } = useSidebarConfig()
  const isMobile = useIsMobile()
  const { data: session, isPending } = useSession()
  const { hasPermission, isLoading: isLoadingRbac, hasResolved, error: rbacError } = useRbac(Boolean(session))
  const pathname = usePathname()
  const locale = useLocale()
  const { t } = useI18n()
  const router = useRouter()
  const normalizedPathname = stripLocaleFromPath(pathname)
  const lockTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPersistedActivityRef = React.useRef(0)
  const [isLocked, setIsLocked] = React.useState(false)
  const [isUnlocking, setIsUnlocking] = React.useState(false)
  const [failedAttempts, setFailedAttempts] = React.useState(0)

  const updateBodyScrollLock = React.useCallback((locked: boolean) => {
    document.body.style.overflow = locked ? "hidden" : ""
  }, [])

  const clearLockTimer = React.useCallback(() => {
    if (!lockTimerRef.current) {
      return
    }
    clearTimeout(lockTimerRef.current)
    lockTimerRef.current = null
  }, [])

  const lockSession = React.useCallback(() => {
    setIsLocked(true)
    updateBodyScrollLock(true)
    window.localStorage.setItem(LOCK_STORAGE_KEY, String(Date.now()))
  }, [updateBodyScrollLock])

  const scheduleLockFromActivity = React.useCallback((lastActivityAt: number) => {
    clearLockTimer()
    const elapsed = Date.now() - lastActivityAt

    if (elapsed >= IDLE_TIMEOUT_MS) {
      lockSession()
      return
    }

    lockTimerRef.current = setTimeout(() => {
      lockSession()
    }, IDLE_TIMEOUT_MS - elapsed)
  }, [clearLockTimer, lockSession])

  const persistActivity = React.useCallback((force = false) => {
    if (isLocked) {
      return
    }

    const now = Date.now()
    if (!force && now - lastPersistedActivityRef.current < 1000) {
      return
    }

    lastPersistedActivityRef.current = now
    window.localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, String(now))
    scheduleLockFromActivity(now)
  }, [isLocked, scheduleLockFromActivity])

  const clearLockState = React.useCallback(() => {
    setIsLocked(false)
    setFailedAttempts(0)
    updateBodyScrollLock(false)
    window.localStorage.removeItem(LOCK_STORAGE_KEY)
    window.localStorage.setItem(FAILED_ATTEMPTS_STORAGE_KEY, "0")
    persistActivity(true)
  }, [persistActivity, updateBodyScrollLock])

  const forceSignOutToLogin = React.useCallback(() => {
    setIsLocked(false)
    setFailedAttempts(0)
    clearLockTimer()
    updateBodyScrollLock(false)
    window.localStorage.removeItem(LOCK_STORAGE_KEY)
    window.localStorage.setItem(FAILED_ATTEMPTS_STORAGE_KEY, "0")

    void signOut().finally(() => {
      router.replace(getAppUrl("/auth/sign-in", locale))
    })
  }, [clearLockTimer, locale, router, updateBodyScrollLock])

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

  React.useEffect(() => {
    if (isPending || !session) {
      return
    }

    const storedLockAt = window.localStorage.getItem(LOCK_STORAGE_KEY)
    const storedFailedAttempts = Number(window.localStorage.getItem(FAILED_ATTEMPTS_STORAGE_KEY) ?? "0")
    const storedLastActivity = Number(window.localStorage.getItem(LAST_ACTIVITY_STORAGE_KEY) ?? "0")

    setIsLocked(Boolean(storedLockAt))
    setFailedAttempts(Number.isNaN(storedFailedAttempts) ? 0 : storedFailedAttempts)

    if (!storedLockAt) {
      const lastActivityAt = Number.isNaN(storedLastActivity) || storedLastActivity <= 0 ? Date.now() : storedLastActivity
      window.localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, String(lastActivityAt))
      scheduleLockFromActivity(lastActivityAt)
    } else {
      updateBodyScrollLock(true)
      clearLockTimer()
    }

    const activityEvents: Array<keyof WindowEventMap> = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "focus"]
    const handleActivity = () => persistActivity(false)
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && !isLocked) {
        const lastActivityRaw = Number(window.localStorage.getItem(LAST_ACTIVITY_STORAGE_KEY) ?? "0")
        const lastActivityAt = Number.isNaN(lastActivityRaw) || lastActivityRaw <= 0 ? Date.now() : lastActivityRaw

        if (Date.now() - lastActivityAt >= IDLE_TIMEOUT_MS) {
          lockSession()
          return
        }

        persistActivity(true)
      }
    }
    const handleStorage = (event: StorageEvent) => {
      if (event.key === LOCK_STORAGE_KEY) {
        const locked = Boolean(event.newValue)
        setIsLocked(locked)
        updateBodyScrollLock(locked)
        if (locked) {
          clearLockTimer()
        } else {
          persistActivity(true)
        }
      }

      if (event.key === FAILED_ATTEMPTS_STORAGE_KEY) {
        const parsed = Number(event.newValue ?? "0")
        setFailedAttempts(Number.isNaN(parsed) ? 0 : parsed)
      }

      if (event.key === LAST_ACTIVITY_STORAGE_KEY && !window.localStorage.getItem(LOCK_STORAGE_KEY)) {
        const parsed = Number(event.newValue ?? "0")
        if (!Number.isNaN(parsed) && parsed > 0) {
          scheduleLockFromActivity(parsed)
        }
      }
    }
    const handleManualLock = () => {
      lockSession()
    }

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true })
    })
    document.addEventListener("visibilitychange", handleVisibility)
    window.addEventListener("storage", handleStorage)
    window.addEventListener(MANUAL_LOCK_EVENT, handleManualLock)

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity)
      })
      document.removeEventListener("visibilitychange", handleVisibility)
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener(MANUAL_LOCK_EVENT, handleManualLock)
      clearLockTimer()
      updateBodyScrollLock(false)
    }
  }, [clearLockTimer, isLocked, isPending, lockSession, persistActivity, scheduleLockFromActivity, session, updateBodyScrollLock])

  const handleUnlock = React.useCallback(async (password: string) => {
    if (!session?.user?.email) {
      throw new Error(t("auth.failedSignIn"))
    }

    setIsUnlocking(true)
    try {
      const result = await signIn.email({
        email: session.user.email,
        password,
      })

      if (result.error) {
        const nextFailedAttempts = failedAttempts + 1
        setFailedAttempts(nextFailedAttempts)
        window.localStorage.setItem(FAILED_ATTEMPTS_STORAGE_KEY, String(nextFailedAttempts))

        if (nextFailedAttempts >= 3) {
          forceSignOutToLogin()
          throw new Error(t("auth.lockScreen.sessionExpired"))
        }

        throw new Error(t("auth.lockScreen.invalidPassword"))
      }

      clearLockState()
    } finally {
      setIsUnlocking(false)
    }
  }, [clearLockState, failedAttempts, forceSignOutToLogin, session?.user?.email, t])

  if (isPending || (session && (!hasResolved || isLoadingRbac) && normalizedPathname !== "/unauthorized")) {
    return <div className="min-h-screen flex items-center justify-center">{t("common.loading")}</div>
  }

  if (!session) {
    return <div className="min-h-screen flex items-center justify-center">{t("common.loading")}</div>
  }

  const showSidebar = config.navigationMode === "sidebar" || isMobile
  const showTopbar = config.navigationMode === "topbar" && !isMobile

  return (
    <CompanyDisplayNameProvider>
      <IdleLockScreen
        open={isLocked}
        userEmail={session.user.email}
        isSubmitting={isUnlocking}
        failedAttempts={failedAttempts}
        onUnlock={handleUnlock}
        onSignOut={forceSignOutToLogin}
      />
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
            {showSidebar ? (
              <AppSidebar
                variant={config.variant}
                collapsible={config.collapsible}
                side={config.side}
              />
            ) : null}
            <SidebarInset>
              <SiteHeader />
              {showTopbar ? <AppTopbar /> : null}
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
              {showTopbar ? <AppTopbar /> : null}
              <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                  <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                    {children}
                  </div>
                </div>
              </div>
            </SidebarInset>
            {showSidebar ? (
              <AppSidebar
                variant={config.variant}
                collapsible={config.collapsible}
                side={config.side}
              />
            ) : null}
          </>
        )}
      </UISidebarProvider>
    </CompanyDisplayNameProvider>
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
