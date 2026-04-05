"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  MoreHorizontal,
  Search,
  List,
  ChevronDown,
  Menu
} from "lucide-react"
import { format, addDays, subDays, isToday, isSameDay } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useI18n, useLocale } from "@/i18n/provider"
import { getDateFnsLocale } from "@/lib/date-locale"
import { type CalendarEvent } from "../types"

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
  const dateLocale = getDateFnsLocale(locale)
  const calendarEvents = events ?? []

  const [currentDate, setCurrentDate] = useState(selectedDate || new Date())
  const [viewMode, setViewMode] = useState<"day" | "list">("day")
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

  const renderDayView = () => {
    const isCurrentDayToday = isToday(currentDate)

    return (
      <div className="flex-1 p-6">
        <div className="mb-6 flex items-center justify-between rounded-xl border bg-muted/20 p-4">
          <div>
            <div className="text-sm text-muted-foreground">
              {format(currentDate, "EEEE", { locale: dateLocale })}
            </div>
            <div className="text-xl font-semibold">
              {format(currentDate, "PPP", { locale: dateLocale })}
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
          <div className="space-y-4">
            {dayEvents.map(event => (
              <Card key={event.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleEventClick(event)}>
                <CardContent className="px-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={cn("mt-1.5 h-3 w-3 rounded-full", event.color)} />
                      <div className="space-y-2">
                        <h3 className="font-medium">{event.title}</h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {event.time}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {event.location}
                          </div>
                        </div>
                        {event.description ? (
                          <p className="text-sm text-muted-foreground">{event.description}</p>
                        ) : null}
                      </div>
                    </div>
                    <Badge variant="secondary">{getEventTypeLabel(event.type)}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderListView = () => {
    const upcomingEvents = calendarEvents
      .filter(event => event.date >= new Date())
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    return (
      <div className="flex-1 p-6">
        <div className="space-y-4">
          {upcomingEvents.map(event => (
            <Card key={event.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleEventClick(event)}>
              <CardContent className="px-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={cn("w-3 h-3 rounded-full mt-1.5", event.color)} />
                    <div className="flex-1">
                      <h3 className="font-medium">{event.title}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center flex-wrap gap-1">
                          <CalendarIcon className="w-4 h-4" />
                          {format(event.date, 'PPP', { locale: dateLocale })}
                        </div>
                        <div className="flex items-center flex-wrap gap-1">
                          <Clock className="w-4 h-4" />
                          {event.time}
                        </div>
                        <div className="flex items-center flex-wrap gap-1">
                          <MapPin className="w-4 h-4" />
                          {event.location}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {event.attendees.slice(0, 3).map((attendee, index) => (
                        <Avatar key={index} className="border-2 border-background">
                          <AvatarFallback className="text-xs">{attendee}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <Button variant="ghost" size="sm" className="cursor-pointer">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const currentPeriodLabel = viewMode === "day"
    ? format(currentDate, "PPP", { locale: dateLocale })
    : format(currentDate, "MMMM yyyy", { locale: dateLocale })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col flex-wrap gap-4 p-6 border-b md:flex-row md:items-center md:justify-between">
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

          <h1 className="text-2xl font-semibold">
            {currentPeriodLabel}
          </h1>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={t("calendar.searchPlaceholder")} className="pl-10 w-64" />
          </div>

          {/* View Mode Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="cursor-pointer">
                {viewMode === "day" && <CalendarIcon className="w-4 h-4 mr-2" />}
                {viewMode === "list" && <List className="w-4 h-4 mr-2" />}
                {viewMode === "day" ? t("calendar.day") : t("calendar.list")}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setViewMode("day")} className="cursor-pointer">
                <CalendarIcon className="w-4 h-4 mr-2" />
                {t("calendar.day")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setViewMode("list")} className="cursor-pointer">
                <List className="w-4 h-4 mr-2" />
                {t("calendar.list")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Calendar Content */}
      {viewMode === "day" ? renderDayView() : renderListView()}

      {/* Event Detail Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title || t("calendar.eventDetails")}</DialogTitle>
            <DialogDescription>
              {t("calendar.eventDescription")}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                <span>{format(selectedEvent.date, 'PPPP', { locale: dateLocale })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{selectedEvent.time} ({selectedEvent.duration})</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{selectedEvent.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <span>{t("calendar.attendees")}:</span>
                  <div className="flex -space-x-2">
                    {selectedEvent.attendees.map((attendee: string, index: number) => (
                      <Avatar key={index} className="w-6 h-6 border-2 border-background">
                        <AvatarFallback className="text-xs">{attendee}</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={cn("text-white", selectedEvent.color)}>
                  {getEventTypeLabel(selectedEvent.type)}
                </Badge>
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1 cursor-pointer" onClick={() => {
                  setShowEventDialog(false)
                }}>{t("calendar.edit")}</Button>
                <Button variant="destructive" className="flex-1 cursor-pointer" onClick={() => {
                  setShowEventDialog(false)
                }}>{t("calendar.delete")}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
