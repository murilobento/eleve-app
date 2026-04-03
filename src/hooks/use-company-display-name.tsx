"use client"

import * as React from "react"

import type { ManagedCompany } from "@/lib/company-admin"

type CompanyResponse = {
  company: ManagedCompany | null
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "Unexpected error while processing the request."

    throw new Error(message)
  }

  return payload as T
}

function getCompanyDisplayName(company: ManagedCompany | null) {
  if (!company) {
    return null
  }

  return company.appName?.trim() || company.tradeName?.trim() || company.legalName.trim() || null
}

type CompanyDisplayNameContextValue = {
  company: ManagedCompany | null
  isLoading: boolean
  displayName: string | null
}

const CompanyDisplayNameContext = React.createContext<CompanyDisplayNameContextValue | null>(null)

export function CompanyDisplayNameProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompany] = React.useState<ManagedCompany | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const controller = new AbortController()

    async function loadCompany() {
      try {
        const payload = await parseResponse<CompanyResponse>(
          await fetch("/api/company", {
            credentials: "include",
            signal: controller.signal,
          })
        )

        setCompany(payload.company)
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return
        }

        setCompany(null)
      } finally {
        setIsLoading(false)
      }
    }

    void loadCompany()

    return () => controller.abort()
  }, [])

  const value = React.useMemo(
    () => ({
      company,
      isLoading,
      displayName: getCompanyDisplayName(company),
    }),
    [company, isLoading]
  )

  return (
    <CompanyDisplayNameContext.Provider value={value}>
      {children}
    </CompanyDisplayNameContext.Provider>
  )
}

export function useCompanyDisplayName() {
  const context = React.useContext(CompanyDisplayNameContext)

  if (context) {
    return context
  }

  return {
    company: null,
    isLoading: true,
    displayName: null,
  }
}
