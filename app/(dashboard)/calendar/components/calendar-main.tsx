"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Info,
  FileDown,
  MapPin,
  Truck,
  Menu,
  UserCog
} from "lucide-react"
import { format, addDays, subDays, isToday, isSameDay } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useResourcePermissions } from "@/hooks/use-resource-permissions"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { cn, getAppUrl } from "@/lib/utils"
import { useI18n, useLocale } from "@/i18n/provider"
import { getDateFnsLocale } from "@/lib/date-locale"
import { formatAgendaDateKey } from "@/lib/service-agenda"
import { useIsMobile } from "@/hooks/use-mobile"
import { type CalendarEvent } from "../types"

const HOUR_ROW_HEIGHT = 60
const TIMELINE_VERTICAL_PADDING = 12
const DEFAULT_TIMELINE_START_MINUTES = 7 * 60
const DEFAULT_TIMELINE_END_MINUTES = 17 * 60

function parseTimeToMinutes(value?: string) {
  if (!value) {
    return null
  }

  const [hours, minutes] = value.split(":").map(Number)

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null
  }

  return hours * 60 + minutes
}

function formatHourLabel(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)

  return `${String(hours).padStart(2, "0")}h`
}

function formatTimeLabel(value?: string) {
  const totalMinutes = parseTimeToMinutes(value)

  if (totalMinutes === null) {
    return value ?? ""
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const hourText = String(hours).padStart(2, "0")

  return minutes === 0
    ? `${hourText}h`
    : `${hourText}:${String(minutes).padStart(2, "0")}h`
}

function formatTimeRange(startTime?: string, endTime?: string) {
  if (!startTime || !endTime) {
    return ""
  }

  return `${formatTimeLabel(startTime)} às ${formatTimeLabel(endTime)}`
}

function getEventTimeRange(event: CalendarEvent) {
  const startTime = event.startTime ?? event.time.split("-")[0]?.trim()
  const endTime = event.endTime ?? event.time.split("-")[1]?.trim()

  return {
    startTime,
    endTime,
    startMinutes: parseTimeToMinutes(startTime),
    endMinutes: parseTimeToMinutes(endTime),
  }
}

function capitalizeText(value: string) {
  if (!value) {
    return value
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}

interface CalendarMainProps {
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
  onMenuClick?: () => void
  events?: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
}

export function CalendarMain({ selectedDate, onDateSelect, onMenuClick, events, onEventClick }: CalendarMainProps) {
  const { t } = useI18n()
  const locale = useLocale()
  const { canRead, canUpdate } = useResourcePermissions("service-orders")
  const dateLocale = getDateFnsLocale(locale)
  const isMobile = useIsMobile()
  const calendarEvents = events ?? []

  const [currentDate, setCurrentDate] = useState(selectedDate || new Date())
  const [showEventDialog, setShowEventDialog] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  useEffect(() => {
    if (selectedDate) {
      setCurrentDate(selectedDate)
    }
  }, [selectedDate])

  const dayEvents = useMemo(
    () => calendarEvents
      .filter(event => isSameDay(event.date, currentDate))
      .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [calendarEvents, currentDate]
  )

  const dayTimeline = useMemo(() => {
    const parsedEvents = dayEvents.map((event) => {
      const { startTime, endTime, startMinutes, endMinutes } = getEventTimeRange(event)

      return {
        event,
        startTime,
        endTime,
        startMinutes,
        endMinutes,
      }
    }).filter((item) => item.startMinutes !== null && item.endMinutes !== null)

    if (parsedEvents.length === 0) {
      return null
    }

    const earliestStart = Math.min(...parsedEvents.map((item) => item.startMinutes as number))
    const latestEnd = Math.max(...parsedEvents.map((item) => item.endMinutes as number))
    const timelineStartMinutes = Math.max(
      0,
      Math.min(DEFAULT_TIMELINE_START_MINUTES, Math.floor(earliestStart / 60) * 60)
    )
    const timelineEndMinutes = Math.min(
      24 * 60,
      Math.max(DEFAULT_TIMELINE_END_MINUTES, Math.ceil(latestEnd / 60) * 60)
    )
    const totalMinutes = Math.max(60, timelineEndMinutes - timelineStartMinutes)
    const hourSlots = Array.from(
      { length: Math.ceil(totalMinutes / 60) },
      (_, index) => timelineStartMinutes + index * 60
    )

    const stackedEvents: Array<(typeof parsedEvents)[number] & {
      columnIndex: number
      groupIndex: number
      groupColumns: number
    }> = []
    const groupColumnCounts = new Map<number, number>()
    const activeEvents: Array<{
      endMinutes: number
      columnIndex: number
      groupIndex: number
    }> = []
    let currentGroupIndex = -1

    for (const item of parsedEvents) {
      for (let index = activeEvents.length - 1; index >= 0; index -= 1) {
        if (activeEvents[index].endMinutes <= (item.startMinutes as number)) {
          activeEvents.splice(index, 1)
        }
      }

      if (activeEvents.length === 0) {
        currentGroupIndex += 1
      }

      const usedColumns = new Set(activeEvents.map((activeEvent) => activeEvent.columnIndex))
      let columnIndex = 0

      while (usedColumns.has(columnIndex)) {
        columnIndex += 1
      }

      activeEvents.push({
        endMinutes: item.endMinutes as number,
        columnIndex,
        groupIndex: currentGroupIndex,
      })

      groupColumnCounts.set(
        currentGroupIndex,
        Math.max(groupColumnCounts.get(currentGroupIndex) ?? 0, activeEvents.length)
      )

      stackedEvents.push({
        ...item,
        columnIndex,
        groupIndex: currentGroupIndex,
        groupColumns: 1,
      })
    }

    const resolvedEvents = stackedEvents.map((item) => ({
      ...item,
      groupColumns: groupColumnCounts.get(item.groupIndex) ?? 1,
    }))

    return {
      earliestStart,
      latestEnd,
      timelineStartMinutes,
      timelineEndMinutes,
      totalMinutes,
      hourSlots,
      events: resolvedEvents,
    }
  }, [dayEvents])

  const navigateDay = (direction: "prev" | "next") => {
    const nextDate = direction === "prev" ? subDays(currentDate, 1) : addDays(currentDate, 1)
    setCurrentDate(nextDate)
    onDateSelect?.(nextDate)
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    onDateSelect?.(today)
  }

  const handleEventClick = (event: CalendarEvent) => {
    if (onEventClick) {
      onEventClick(event)
    } else {
      setSelectedEvent(event)
      setShowEventDialog(true)
    }
  }

  const getEventTypeLabel = (value: string) => {
    switch (value) {
      case "meeting":
        return t("calendar.scheduleMeeting")
      case "event":
        return t("calendar.event")
      case "personal":
        return t("calendar.personal")
      case "task":
        return t("calendar.task")
      case "reminder":
        return t("calendar.reminderType")
      default:
        return value
    }
  }

  const getEventStatusLabel = (value?: CalendarEvent["status"]) => {
    switch (value) {
      case "pending":
        return t("serviceOrders.statusOptions.pending")
      case "scheduled":
        return t("serviceOrders.statusOptions.scheduled")
      case "in_progress":
        return t("serviceOrders.statusOptions.inProgress")
      case "completed":
        return t("serviceOrders.statusOptions.completed")
      case "cancelled":
        return t("serviceOrders.statusOptions.cancelled")
      default:
        return undefined
    }
  }

  const renderDayView = () => {
    const isCurrentDayToday = isToday(currentDate)
    const weekdayLabel = capitalizeText(format(currentDate, "EEEE", { locale: dateLocale }))
    const dateLabel = capitalizeText(format(currentDate, "PPP", { locale: dateLocale }))
    const daySummary = dayTimeline
      ? `${weekdayLabel}, ${formatHourLabel(dayTimeline.earliestStart)} às ${formatHourLabel(dayTimeline.latestEnd)}`
      : weekdayLabel

    return (
      <div className="flex-1 p-4">
        <div className="mb-4 flex items-center justify-between rounded-xl border bg-muted/20 p-3">
          <div>
            <div className="text-sm text-muted-foreground">{daySummary}</div>
            <div className="text-lg font-semibold">
              {dateLabel}
            </div>
          </div>
          {isCurrentDayToday ? (
            <Badge variant="secondary">{t("calendar.today")}</Badge>
          ) : null}
        </div>

        {dayEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
            {t("calendar.noEventsForDay")}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-background">
            <div className="grid grid-cols-[64px_minmax(0,1fr)] border-b bg-muted/30 px-3 py-2 text-sm">
              <div className="font-medium text-muted-foreground">{t("calendar.time")}</div>
              <div className="font-medium text-muted-foreground">{t("calendar.eventDetails")}</div>
            </div>

            {dayTimeline ? (
              <div
                className="relative overflow-x-auto"
                style={{
                  minHeight: `${dayTimeline.totalMinutes / 60 * HOUR_ROW_HEIGHT + TIMELINE_VERTICAL_PADDING * 2}px`,
                }}
              >
                <div className="grid grid-cols-[64px_minmax(0,1fr)]">
                  <div className="border-r bg-muted/10">
                    {dayTimeline.hourSlots.map((slot) => (
                      <div
                        key={slot}
                        className="border-b px-2.5 pt-1.5 text-right text-xs font-medium text-muted-foreground"
                        style={{ height: `${HOUR_ROW_HEIGHT}px` }}
                      >
                        {formatHourLabel(slot)}
                      </div>
                    ))}
                  </div>

                  <div className="relative">
                    {dayTimeline.hourSlots.map((slot) => (
                      <div
                        key={slot}
                        className="border-b border-dashed"
                        style={{ height: `${HOUR_ROW_HEIGHT}px` }}
                      />
                    ))}

                    {dayTimeline.events.map(({ event, startTime, endTime, startMinutes, endMinutes, columnIndex, groupColumns }) => {
                      const top = ((startMinutes as number) - dayTimeline.timelineStartMinutes) / 60 * HOUR_ROW_HEIGHT + TIMELINE_VERTICAL_PADDING
                      const eventDurationMinutes = Math.max(15, (endMinutes as number) - (startMinutes as number))
                      const maxHeightForSlot = (eventDurationMinutes / 60) * HOUR_ROW_HEIGHT - 6
                      const height = Math.max(28, Math.min(34, maxHeightForSlot))
                      const timeRange = formatTimeRange(startTime, endTime)
                      const horizontalGap = 6
                      const horizontalPadding = 10
                      const width = `calc((100% - ${horizontalPadding * 2}px - ${(groupColumns - 1) * horizontalGap}px) / ${groupColumns})`
                      const left = `calc(${horizontalPadding}px + ${columnIndex} * (${width} + ${horizontalGap}px))`

                      if (isMobile) {
                        return (
                          <button
                            key={event.id}
                            type="button"
                            className={cn(
                              "absolute right-3 flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-left shadow-sm transition-shadow hover:shadow-md",
                              event.color
                            )}
                            style={{
                              top: `${top + 2}px`,
                              left,
                              width,
                              height: `${height}px`,
                            }}
                            onClick={() => handleEventClick(event)}
                            aria-label={t("calendar.eventDetails")}
                          >
                            <div className="flex min-w-0 items-center gap-1.5 text-[10px] uppercase">
                              <Truck className="h-3 w-3 shrink-0" />
                              <span className="truncate font-semibold">
                                {event.equipmentName || event.title}
                              </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "border-transparent px-1.5 py-0 text-[9px]",
                                  event.color
                                )}
                              >
                                {getEventStatusLabel(event.status) ?? getEventTypeLabel(event.type)}
                              </Badge>
                              <Info className="size-3 shrink-0" />
                            </div>
                          </button>
                        )
                      }

                      return (
                        <button
                          key={event.id}
                          type="button"
                          className={cn(
                            "absolute right-3 flex items-center rounded-md border px-2 py-1 text-left shadow-sm transition-shadow hover:shadow-md",
                            event.color
                          )}
                          style={{
                            top: `${top + 2}px`,
                            left,
                            width,
                            height: `${height}px`,
                          }}
                          onClick={() => handleEventClick(event)}
                        >
                          <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                            <div className="flex min-w-0 flex-1 items-center gap-2 text-[11px] uppercase">
                              <Truck className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate font-semibold">
                                {event.equipmentName || event.title}
                              </span>
                              {event.clientName ? (
                                <span className="truncate opacity-90">{event.clientName}</span>
                              ) : null}
                              <div className="flex shrink-0 items-center gap-1 opacity-90">
                                <Clock className="h-3 w-3 shrink-0" />
                                <span>{timeRange || formatTimeLabel(startTime)}</span>
                              </div>
                              {event.operatorName ? (
                                <div className="flex min-w-0 items-center gap-1 opacity-90">
                                  <UserCog className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{event.operatorName}</span>
                                </div>
                              ) : null}
                            </div>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "shrink-0 border-transparent px-1.5 py-0 text-[10px]",
                                event.color
                              )}
                            >
                              {getEventStatusLabel(event.status) ?? getEventTypeLabel(event.type)}
                            </Badge>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                {t("calendar.noEventsForDay")}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }
  const currentPeriodLabel = format(currentDate, "PPP", { locale: dateLocale })
  const canEditSelectedEvent = canUpdate
    && selectedEvent?.status !== "completed"
    && selectedEvent?.status !== "cancelled"

  const handleOpenServiceOrderEdit = () => {
    if (!selectedEvent?.serviceOrderId || !canEditSelectedEvent) {
      return
    }

    const targetUrl = `${getAppUrl("/service-orders", locale)}?edit=${encodeURIComponent(selectedEvent.serviceOrderId)}`
    window.location.assign(targetUrl)
  }

  const handleExportDailyPdf = () => {
    if (dayEvents.length === 0) {
      toast.error(t("calendar.noRecordsToExport"))
      return
    }

    const date = formatAgendaDateKey(currentDate)
    const targetUrl = `/api/service-orders/daily-pdf?date=${encodeURIComponent(date)}`
    window.open(targetUrl, "_blank", "noopener,noreferrer")
  }

  const handleExportDailyPng = () => {
    if (dayEvents.length === 0) {
      toast.error(t("calendar.noRecordsToExport"))
      return
    }

    const date = formatAgendaDateKey(currentDate)
    const targetUrl = `/api/service-orders/daily-png?date=${encodeURIComponent(date)}`
    window.open(targetUrl, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col flex-wrap gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Mobile Menu Button */}
          <Button
            variant="outline"
            size="sm"
            className="xl:hidden cursor-pointer"
            onClick={onMenuClick}
          >
            <Menu className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateDay("prev")} className="cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateDay("next")} className="cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday} className="cursor-pointer">
              {t("calendar.today")}
            </Button>
          </div>

          <h1 className="text-xl font-semibold">
            {currentPeriodLabel}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {canRead ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={handleExportDailyPdf}
              >
                <FileDown className="w-4 h-4" />
                {t("calendar.exportDailyPdf")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={handleExportDailyPng}
              >
                <FileDown className="w-4 h-4" />
                {t("calendar.exportDailyPng")}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {/* Calendar Content */}
      {renderDayView()}

      {/* Event Detail Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedEvent?.serviceOrderNumber
                ? `Ver detalhes da OS ${selectedEvent.serviceOrderNumber}`
                : t("calendar.eventDetails")}
            </DialogTitle>
            <DialogDescription className="uppercase">
              {selectedEvent?.title || t("calendar.eventDescription")}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-6">
              <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 md:grid-cols-2">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("serviceOrders.number")}
                  </div>
                  <div className="mt-1 font-medium uppercase">{selectedEvent.serviceOrderNumber ?? "-"}</div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("serviceOrders.status")}
                  </div>
                  <div className="mt-1 uppercase">
                    <Badge variant="secondary" className={cn(selectedEvent.color)}>
                      {getEventStatusLabel(selectedEvent.status) ?? getEventTypeLabel(selectedEvent.type)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("serviceOrders.client")}
                  </div>
                  <div className="mt-1 font-medium uppercase">{selectedEvent.clientName ?? "-"}</div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("serviceOrders.serviceDescription")}
                  </div>
                  <div className="mt-1 font-medium uppercase">{selectedEvent.title}</div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="space-y-4 px-4 py-4">
                    <div className="text-sm font-medium">{t("calendar.eventDetails")}</div>
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="uppercase">{format(selectedEvent.date, 'PPPP', { locale: dateLocale })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="uppercase">{formatTimeRange(selectedEvent.startTime, selectedEvent.endTime) || selectedEvent.time}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <span className="uppercase">{selectedEvent.address ?? selectedEvent.location}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="space-y-4 px-4 py-4">
                    <div className="text-sm font-medium">Recursos alocados</div>
                    <div className="text-sm">
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("serviceOrders.equipment")}
                      </div>
                      <div className="mt-1 font-medium uppercase">{selectedEvent.equipmentName ?? "-"}</div>
                    </div>
                    <div className="text-sm">
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("serviceOrders.operator")}
                      </div>
                      <div className="mt-1 font-medium uppercase">{selectedEvent.operatorName ?? "-"}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {selectedEvent.description ? (
                <div className="rounded-xl border p-4">
                  <div className="text-sm font-medium">{t("serviceOrders.notes")}</div>
                  <p className="mt-2 text-sm text-muted-foreground uppercase">{selectedEvent.description}</p>
                </div>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                {canEditSelectedEvent ? (
                  <Button
                    className="cursor-pointer"
                    onClick={handleOpenServiceOrderEdit}
                    disabled={!selectedEvent.serviceOrderId}
                  >
                    {t("serviceOrders.editServiceOrder")}
                  </Button>
                ) : null}
                <Button variant="outline" className="cursor-pointer" onClick={() => {
                  setShowEventDialog(false)
                }}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
