"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Calendar } from "./components/calendar"
import { useI18n } from "@/i18n/provider"
import type { ManagedServiceOrder } from "@/lib/service-orders-admin"

type ServiceOrdersResponse = {
  serviceOrders: ManagedServiceOrder[]
}

function getCalendarEventColor(status: ManagedServiceOrder["status"]) {
  switch (status) {
    case "completed":
      return "bg-emerald-500"
    case "cancelled":
      return "bg-red-500"
    case "in_progress":
      return "bg-blue-500"
    case "scheduled":
      return "bg-amber-500"
    default:
      return "bg-slate-500"
  }
}

export default function CalendarPage() {
  const { t } = useI18n()
  const [serviceOrders, setServiceOrders] = useState<ManagedServiceOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadServiceOrders() {
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
    }

    void loadServiceOrders()
  }, [t])

  const events = useMemo(() => (
    serviceOrders
      .filter((serviceOrder) => serviceOrder.status !== "pending")
      .flatMap((serviceOrder, serviceOrderIndex) =>
      serviceOrder.items.map((item, itemIndex) => ({
        id: serviceOrderIndex * 1000 + itemIndex + 1,
        title: item.serviceDescription || item.serviceTypeName,
        date: new Date(`${item.serviceDate}T${item.plannedStartTime || "00:00"}:00`),
        time: `${item.plannedStartTime} - ${item.plannedEndTime}`,
        duration: `${item.plannedStartTime} - ${item.plannedEndTime}`,
        startTime: item.plannedStartTime,
        endTime: item.plannedEndTime,
        serviceOrderId: serviceOrder.id,
        serviceOrderNumber: serviceOrder.number,
        clientName: serviceOrder.clientName,
        equipmentName: item.equipmentName,
        equipmentTypeName: item.equipmentTypeName,
        operatorName: item.operatorName,
        status: serviceOrder.status,
        address: [
          serviceOrder.serviceStreet,
          serviceOrder.serviceNumber,
          serviceOrder.serviceComplement,
          serviceOrder.serviceDistrict,
          `${serviceOrder.serviceCity} - ${serviceOrder.serviceState}`,
        ].filter(Boolean).join(", "),
        type: "event" as const,
        attendees: item.operatorName ? [item.operatorName] : [],
        location: `${serviceOrder.serviceCity} - ${serviceOrder.serviceState}`,
        color: getCalendarEventColor(serviceOrder.status),
        description: serviceOrder.notes || item.notes || undefined,
      }))
    )
  ), [serviceOrders])

  const eventDates = useMemo(() => {
    const countByDate = new Map<string, number>()

    for (const serviceOrder of serviceOrders) {
      if (serviceOrder.status === "pending") {
        continue
      }

      for (const item of serviceOrder.items) {
        countByDate.set(item.serviceDate, (countByDate.get(item.serviceDate) ?? 0) + 1)
      }
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
          <p className="text-muted-foreground">{t("calendar.description")}</p>
        </div>
      </div>
      <div className="@container/main px-4 lg:px-6 mb-8 flex-1 h-[calc(100vh-12rem)] min-h-[600px]">
        {loading ? (
          <div className="rounded-md border px-6 py-10 text-sm text-muted-foreground">
            {t("common.loadingServiceOrders")}
          </div>
        ) : (
          <Calendar events={events} eventDates={eventDates} />
        )}
      </div>
    </>
  )
}
