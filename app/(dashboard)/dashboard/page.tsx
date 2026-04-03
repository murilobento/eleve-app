"use client"

import { lazy, Suspense } from "react"

import { useI18n } from "@/i18n/provider"

const SectionCards = lazy(() =>
  import("./components/section-cards").then((module) => ({
    default: module.SectionCards,
  }))
)

const ChartAreaInteractive = lazy(() =>
  import("./components/chart-area-interactive").then((module) => ({
    default: module.ChartAreaInteractive,
  }))
)

const DashboardTableSection = lazy(() =>
  import("./components/dashboard-table-section").then((module) => ({
    default: module.DashboardTableSection,
  }))
)

export default function Page() {
  const { t } = useI18n()

  return (
    <>
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground">{t("dashboard.description")}</p>
        </div>
      </div>
      <div className="@container/main px-4 lg:px-6 space-y-6">
        <Suspense fallback={<div className="h-52 w-full rounded-lg bg-muted/40" />}>
          <SectionCards />
        </Suspense>
        <Suspense fallback={<div className="h-[250px] w-full rounded-lg bg-muted/40" />}>
          <ChartAreaInteractive />
        </Suspense>
      </div>
      <div className="@container/main">
        <Suspense fallback={<div className="h-96 w-full rounded-lg bg-muted/40" />}>
          <DashboardTableSection />
        </Suspense>
      </div>
    </>
  )
}
