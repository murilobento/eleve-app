"use client"

import { ChevronDown, Plus } from "lucide-react"
import { useState } from "react"

import { DatePicker } from "./date-picker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/provider"
import type { ManagedServiceOrder } from "@/lib/service-orders-admin"

interface CalendarSidebarProps {
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
  onNewCalendar?: () => void
  onNewEvent?: () => void
  unscheduledServiceOrders?: ManagedServiceOrder[]
  onOpenServiceOrder?: (serviceOrderId: string) => void
  events?: Array<{ date: Date; count: number }>
  className?: string
}

export function CalendarSidebar({ 
  selectedDate,
  onDateSelect,
  onNewCalendar,
  onNewEvent,
  unscheduledServiceOrders = [],
  onOpenServiceOrder,
  events = [],
  className 
}: CalendarSidebarProps) {
  const { t } = useI18n()
  const [showUnscheduled, setShowUnscheduled] = useState(true)

  return (
    <div className={`flex flex-col h-full bg-background rounded-lg ${className}`}>
      {/* Add New Event Button */}
      {onNewEvent || onOpenServiceOrder ? (
        <div className="p-6 border-b">
          <div className="space-y-3">
            {onNewEvent ? (
              <Button
                className="w-full cursor-pointer"
                onClick={onNewEvent}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t("calendar.addNewEvent")}
              </Button>
            ) : null}

            {onOpenServiceOrder ? (
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full cursor-pointer justify-between"
                  onClick={() => setShowUnscheduled((current) => !current)}
                >
                  <span>{t("calendar.unscheduledButton")}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{unscheduledServiceOrders.length}</Badge>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showUnscheduled ? "rotate-180" : ""}`} />
                  </div>
                </Button>

                {showUnscheduled ? (
                  unscheduledServiceOrders.length > 0 ? (
                    <div className="space-y-2">
                      {unscheduledServiceOrders.map((serviceOrder) => (
                        <button
                          key={serviceOrder.id}
                          type="button"
                          className="w-full rounded-lg border px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
                          onClick={() => onOpenServiceOrder(serviceOrder.id)}
                        >
                          <div className="text-sm font-medium">{serviceOrder.number}</div>
                          <div className="text-xs text-muted-foreground">{serviceOrder.clientName}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {serviceOrder.items[0]?.serviceDescription ?? t("serviceOrders.noSchedule")}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
                      {t("calendar.noUnscheduledServiceOrders")}
                    </div>
                  )
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Date Picker */}
      <DatePicker
        selectedDate={selectedDate}
        onDateSelect={onDateSelect}
        events={events}
      />
    </div>
  )
}
