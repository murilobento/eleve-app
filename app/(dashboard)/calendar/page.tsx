"use client"

import { Calendar } from "./components/calendar"
import { events, eventDates } from "./data"
import { useI18n } from "@/i18n/provider"

export default function CalendarPage() {
  const { t } = useI18n()

  return (
    <>
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{t("calendar.title")}</h1>
          <p className="text-muted-foreground">{t("calendar.description")}</p>
        </div>
      </div>
      <div className="@container/main px-4 lg:px-6 mb-8 flex-1 h-[calc(100vh-12rem)] min-h-[600px]">
        <Calendar events={events} eventDates={eventDates} />
      </div>
    </>
  )
}
