"use client"

import { useEffect, useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { useLocale } from "@/i18n/provider"
import { getDateFnsLocale } from "@/lib/date-locale"

interface DatePickerProps {
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
  events?: Array<{ date: Date; count: number }>
}

export function DatePicker({ selectedDate, onDateSelect, events = [] }: DatePickerProps) {
  const locale = useLocale()
  const dateLocale = getDateFnsLocale(locale)
  const [date, setDate] = useState<Date | undefined>(selectedDate || new Date())

  useEffect(() => {
    setDate(selectedDate || new Date())
  }, [selectedDate])

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate)
      onDateSelect?.(selectedDate)
    }
  }

  // Create a map of dates with events for styling
  const eventDates = events.reduce((acc, event) => {
    const dateKey = event.date.toDateString()
    acc[dateKey] = event.count
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="flex justify-center">
      <Calendar 
        mode="single"
        locale={dateLocale}
        selected={date}
        onSelect={handleDateSelect}
        className="w-full [&_[role=gridcell]_button]:cursor-pointer [&_button]:cursor-pointer"
        modifiers={{
          hasEvents: (date) => {
            const eventCount = eventDates[date.toDateString()]
            return Boolean(eventCount && eventCount > 0)
          }
        }}
        modifiersClassNames={{
          hasEvents: "relative after:absolute after:bottom-1 after:right-1 after:w-1.5 after:h-1.5 after:bg-primary after:rounded-full"
        }}
      />
    </div>
  )
}
