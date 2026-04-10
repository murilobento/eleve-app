"use client"

import { Plus } from "lucide-react"

import { DatePicker } from "./date-picker"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/provider"

interface CalendarSidebarProps {
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
  onNewCalendar?: () => void
  onNewEvent?: () => void
  events?: Array<{ date: Date; count: number }>
  className?: string
}

export function CalendarSidebar({ 
  selectedDate,
  onDateSelect,
  onNewCalendar,
  onNewEvent,
  events = [],
  className 
}: CalendarSidebarProps) {
  const { t } = useI18n()

  return (
    <div className={`flex flex-col h-full bg-background rounded-lg ${className}`}>
      {/* Add New Event Button */}
      {onNewEvent ? (
        <div className="p-6 border-b">
          <Button
            className="w-full cursor-pointer"
            onClick={onNewEvent}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t("calendar.addNewEvent")}
          </Button>
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
