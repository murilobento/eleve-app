"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Calendar } from "./components/calendar"
import { useI18n } from "@/i18n/provider"
import type { ManagedServiceOrder } from "@/lib/service-orders-admin"
import { getServiceAgendaStatusBadgeClass, listServiceAgendaEntries } from "@/lib/service-agenda"

type ServiceOrdersResponse = {
  serviceOrders: ManagedServiceOrder[]
}

export default function CalendarPage() {
  const { t } = useI18n()
  const [serviceOrders, setServiceOrders] = useState<ManagedServiceOrder[]>([])
  const [loading, setLoading] = useState(true)

  const loadServiceOrders = useCallback(async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/service-orders", { cache: "no-store" })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || t("serviceOrders.loadError"))
      }

      setServiceOrders((payload as ServiceOrdersResponse).serviceOrders ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("serviceOrders.loadError"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadServiceOrders()
  }, [loadServiceOrders])

  const events = useMemo(() => (
    listServiceAgendaEntries(serviceOrders).map((entry, index) => ({
      id: index + 1,
      title: entry.serviceDescription || entry.serviceTypeName,
      date: new Date(`${entry.serviceDate}T${entry.plannedStartTime || "00:00"}:00`),
      time: `${entry.plannedStartTime} - ${entry.plannedEndTime}`,
      duration: `${entry.plannedStartTime} - ${entry.plannedEndTime}`,
      startTime: entry.plannedStartTime,
      endTime: entry.plannedEndTime,
      serviceOrderId: entry.serviceOrderId,
      serviceOrderNumber: entry.serviceOrderNumber,
      clientName: entry.clientName,
      equipmentName: entry.equipmentName,
      equipmentTypeName: entry.equipmentTypeName,
      operatorName: entry.operatorName,
      serviceTypeName: entry.serviceTypeName,
      status: entry.status,
      address: entry.address,
      type: "event" as const,
      attendees: entry.operatorName ? [entry.operatorName] : [],
      location: entry.location,
      color: getServiceAgendaStatusBadgeClass(entry.status),
      description: entry.notes || undefined,
    }))
  ), [serviceOrders])

  const eventDates = useMemo(() => {
    const countByDate = new Map<string, number>()

    for (const entry of listServiceAgendaEntries(serviceOrders)) {
      countByDate.set(entry.serviceDate, (countByDate.get(entry.serviceDate) ?? 0) + 1)
    }

    return Array.from(countByDate.entries()).map(([date, count]) => ({
      date: new Date(`${date}T12:00:00`),
      count,
    }))
  }, [serviceOrders])

  return (
    <>
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{t("calendar.title")}</h1>
        </div>
      </div>
      <div className="@container/main px-4 lg:px-6 mb-8 flex-1 h-[calc(100vh-12rem)] min-h-[600px]">
        {loading ? (
          <div className="rounded-md border px-6 py-10 text-sm text-muted-foreground">
            {t("common.loadingServiceOrders")}
          </div>
        ) : (
          <Calendar
            events={events}
            eventDates={eventDates}
            serviceOrders={serviceOrders}
            onServiceOrdersChange={loadServiceOrders}
          />
        )}
      </div>
    </>
  )
}
