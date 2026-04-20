"use client"

import { CalendarSidebar } from "./calendar-sidebar"
import { CalendarMain } from "./calendar-main"
import { EventForm } from "./event-form"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useResourcePermissions } from "@/hooks/use-resource-permissions"
import { type CalendarEvent } from "../types"
import { useCalendar } from "../use-calendar"
import { useI18n, useLocale } from "@/i18n/provider"
import { getAppUrl } from "@/lib/utils"
import type { ManagedServiceOrder } from "@/lib/service-orders-admin"

interface CalendarProps {
  events: CalendarEvent[]
  eventDates: Array<{ date: Date; count: number }>
  serviceOrders: ManagedServiceOrder[]
  onServiceOrdersChange: () => Promise<void>
}

export function Calendar({ events, eventDates, serviceOrders, onServiceOrdersChange }: CalendarProps) {
  const { t } = useI18n()
  const locale = useLocale()
  const calendar = useCalendar(events)
  const { canCreate } = useResourcePermissions("service-orders")
  const unscheduledServiceOrders = serviceOrders.filter((serviceOrder) => serviceOrder.status === "pending")

  const handleOpenServiceOrder = (serviceOrderId: string) => {
    const serviceOrdersUrl = `${getAppUrl("/service-orders", locale)}?edit=${encodeURIComponent(serviceOrderId)}`
    window.location.assign(serviceOrdersUrl)
  }

  return (
    <>
      <div className="border rounded-lg bg-background relative">
        <div className="flex min-h-[800px]">
          {/* Desktop Sidebar - Hidden on mobile/tablet, shown on extra large screens */}
          <div className="hidden xl:block w-80 flex-shrink-0 border-r">
            <CalendarSidebar
              selectedDate={calendar.selectedDate}
              onDateSelect={calendar.handleDateSelect}
              onNewCalendar={calendar.handleNewCalendar}
              onNewEvent={canCreate ? calendar.handleNewEvent : undefined}
              unscheduledServiceOrders={unscheduledServiceOrders}
              onOpenServiceOrder={handleOpenServiceOrder}
              events={eventDates}
              className="h-full"
            />
          </div>
          
          {/* Main Calendar Panel */}
          <div className="flex-1 min-w-0">
            <CalendarMain 
              selectedDate={calendar.selectedDate}
              onDateSelect={calendar.handleDateSelect}
              onMenuClick={() => calendar.setShowCalendarSheet(true)}
              events={calendar.events}
              onServiceOrdersChange={onServiceOrdersChange}
            />
          </div>
        </div>

        {/* Mobile/Tablet Sheet - Positioned relative to calendar container */}
        <Sheet open={calendar.showCalendarSheet} onOpenChange={calendar.setShowCalendarSheet}>
          <SheetContent side="left" className="w-80 p-0" style={{ position: 'absolute' }}>
            <SheetHeader className="p-4 pb-2">
              <SheetTitle>{t("calendar.calendar")}</SheetTitle>
              <SheetDescription>
                {t("calendar.browseAndManage")}
              </SheetDescription>
            </SheetHeader>
            <CalendarSidebar
              selectedDate={calendar.selectedDate}
              onDateSelect={calendar.handleDateSelect}
              onNewCalendar={calendar.handleNewCalendar}
              onNewEvent={canCreate ? calendar.handleNewEvent : undefined}
              unscheduledServiceOrders={unscheduledServiceOrders}
              onOpenServiceOrder={handleOpenServiceOrder}
              events={eventDates}
              className="h-full"
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Event Form Dialog */}
      <EventForm
        event={calendar.editingEvent}
        open={calendar.showEventForm}
        onOpenChange={calendar.setShowEventForm}
        onSave={calendar.handleSaveEvent}
        onDelete={calendar.handleDeleteEvent}
      />
    </>
  )
}
