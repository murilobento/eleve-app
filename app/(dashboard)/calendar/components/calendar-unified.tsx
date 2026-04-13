"use client"

import { useState } from "react"
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Search,
  Grid3X3,
  List,
  ChevronDown,
  Menu,
  Plus
} from "lucide-react"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from "date-fns"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar } from "@/components/ui/calendar"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
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
import { useI18n } from "@/i18n/provider"
import { getDateFnsLocale } from "@/lib/date-locale"
import { type CalendarEvent } from "../types"
import { getAvatarInitials } from "../utils"

// Import data
import eventsData from "../data/events.json"
import calendarsData from "../data/calendars.json"

interface CalendarMainProps {
  eventDates?: Array<{ date: Date; count: number }>
}

export function CalendarMain({ eventDates = [] }: CalendarMainProps) {
  const { locale, t } = useI18n()
  const dateLocale = getDateFnsLocale(locale)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<"month" | "week" | "day" | "list">("month")
  const [showEventDialog, setShowEventDialog] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showCalendarSheet, setShowCalendarSheet] = useState(false)

  // Convert JSON events to CalendarEvent objects with proper Date objects
  const sampleEvents: CalendarEvent[] = eventsData.map(event => ({
    ...event,
    date: new Date(event.date),
    type: event.type as "meeting" | "event" | "personal" | "task" | "reminder"
  }))

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)

  // Extend to show full weeks (including previous/next month days)
  const calendarStart = new Date(monthStart)
  calendarStart.setDate(calendarStart.getDate() - monthStart.getDay())
  
  const calendarEnd = new Date(monthEnd)
  calendarEnd.setDate(calendarEnd.getDate() + (6 - monthEnd.getDay()))
  
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const getEventsForDay = (date: Date) => {
    return sampleEvents.filter(event => isSameDay(event.date, date))
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate(direction === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setShowEventDialog(true)
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
  }

  const handleNewCalendar = () => {
    console.log("Creating new calendar")
    // In a real app, this would open a new calendar form
  }

  const handleNewEvent = () => {
    console.log("Creating new event")
    // In a real app, this would open event form
  }

  const calendarNameMap: Record<string, string> = {
    personal: t("calendar.calendarPersonal"),
    work: t("calendar.calendarWork"),
    shared: t("calendar.calendarShared"),
    meetings: t("calendar.calendarMeetings"),
    events: t("calendar.calendarEvents"),
  }

  const eventTypeMap: Record<CalendarEvent["type"], string> = {
    meeting: t("calendar.scheduleMeeting"),
    event: t("calendar.event"),
    personal: t("calendar.personal"),
    task: t("calendar.task"),
    reminder: t("calendar.reminderType"),
  }

  const renderCalendarGrid = () => {
    const weekDays = t("calendar.weekdays") as string[]
    
    return (
      <div className="flex-1 bg-background">
        {/* Calendar Header */}
        <div className="grid grid-cols-7 border-b">
          {weekDays.map(day => (
            <div key={day} className="p-4 text-center font-medium text-sm text-muted-foreground border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 min-h-[600px]">
          {calendarDays.map((day) => {
            const dayEvents = getEventsForDay(day)
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isDayToday = isToday(day)
            const isSelected = isSameDay(day, selectedDate)

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "relative border-r border-b last:border-r-0 p-2 min-h-[120px] hover:bg-muted/50 cursor-pointer transition-colors",
                  !isCurrentMonth && "text-muted-foreground bg-muted/20",
                  isDayToday && "bg-accent/40",
                  isSelected && "bg-primary/15"
                )}
                onClick={() => handleDateSelect(day)}
              >
                {/* Date Number */}
                <div className={cn(
                  "text-sm font-medium mb-1",
                  isDayToday && "text-primary"
                )}>
                  {format(day, 'd')}
                </div>

                {/* Events */}
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        "text-xs px-2 py-1 rounded text-white cursor-pointer hover:opacity-80 transition-opacity truncate",
                        event.color
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEventClick(event)
                      }}
                    >
                      {event.time} {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-muted-foreground px-2">
                      {t("calendar.moreEvents", { count: dayEvents.length - 3 })}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderSidebar = () => (
    <div className="w-full h-full bg-background border-r">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">{t("calendar.calendar")}</h2>
          <Button size="sm" onClick={handleNewEvent}>
            <Plus className="h-4 w-4 mr-1" />
            {t("calendar.addEventShort")}
          </Button>
        </div>
        
        {/* Date Picker */}
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && handleDateSelect(date)}
          className="rounded-md border"
          locale={dateLocale}
          modifiers={{
            eventDay: eventDates.map(ed => ed.date)
          }}
          modifiersStyles={{
            eventDay: { fontWeight: 'bold' }
          }}
        />
      </div>

      {/* Mini Calendars List */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">{t("calendar.myCalendars")}</h3>
          <Button variant="ghost" size="sm" onClick={handleNewCalendar}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-2">
          {calendarsData.map((calendar) => (
            <div key={calendar.id} className="flex items-center space-x-2">
              <div className={cn("w-3 h-3 rounded-full", calendar.color)} />
              <span className="text-sm">{calendarNameMap[calendar.id] ?? calendar.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="border rounded-lg bg-background relative">
      <div className="flex min-h-[800px]">
        {/* Desktop Sidebar */}
        <div className="hidden xl:block w-80 flex-shrink-0">
          {renderSidebar()}
        </div>
        
        {/* Main Calendar Panel */}
        <div className="flex-1 min-w-0">
          {/* Calendar Toolbar */}
          <div className="border-b bg-background px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Mobile Menu Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="xl:hidden"
                  onClick={() => setShowCalendarSheet(true)}
                >
                  <Menu className="h-4 w-4" />
                </Button>

                {/* Month Navigation */}
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => navigateMonth("prev")}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-lg font-semibold min-w-[140px] text-center">
                    {format(currentDate, "MMMM yyyy", { locale: dateLocale })}
                  </h2>
                  <Button variant="ghost" size="sm" onClick={() => navigateMonth("next")}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <Button variant="outline" size="sm" onClick={goToToday}>
                  {t("calendar.today")}
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <div className="hidden sm:flex items-center space-x-2">
                  <Button variant="ghost" size="sm" className="text-xs">
                    <Search className="h-4 w-4 mr-1" />
                    {t("common.search")}
                  </Button>
                </div>

                {/* View Mode Toggle */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Grid3X3 className="h-4 w-4 mr-1" />
                      {viewMode === "month" ? t("calendar.viewMonth") : viewMode === "week" ? t("calendar.viewWeek") : viewMode === "day" ? t("calendar.viewDay") : t("calendar.viewList")}
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setViewMode("month")}>
                      <Grid3X3 className="h-4 w-4 mr-2" />
                      {t("calendar.viewMonth")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setViewMode("week")}>
                      <List className="h-4 w-4 mr-2" />
                      {t("calendar.viewWeek")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setViewMode("day")}>
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {t("calendar.viewDay")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setViewMode("list")}>
                      <List className="h-4 w-4 mr-2" />
                      {t("calendar.viewList")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Calendar Content */}
          {renderCalendarGrid()}
        </div>
      </div>

      {/* Mobile/Tablet Sheet */}
      <Sheet open={showCalendarSheet} onOpenChange={setShowCalendarSheet}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="p-4 pb-2">
            <SheetTitle>{t("calendar.calendar")}</SheetTitle>
            <SheetDescription>
              {t("calendar.sheetDescription")}
            </SheetDescription>
          </SheetHeader>
          {renderSidebar()}
        </SheetContent>
      </Sheet>

      {/* Event Details Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
            <DialogDescription>
              {t("calendar.eventDetailsInfo")}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{selectedEvent.time} • {selectedEvent.duration}</span>
              </div>
              
              {selectedEvent.location && (
                <div className="flex items-center space-x-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}
              
              {selectedEvent.attendees.length > 0 && (
                <div className="flex items-center space-x-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div className="flex space-x-1">
                    {selectedEvent.attendees.map((attendee, index) => (
                      <Avatar key={index} className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {getAvatarInitials(attendee)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                </div>
              )}

              {selectedEvent.description && (
                <div className="text-sm text-muted-foreground">
                  {selectedEvent.description}
                </div>
              )}

              <div className="flex items-center space-x-2 pt-4">
                <Badge variant="secondary" className={cn("text-white", selectedEvent.color)}>
                  {eventTypeMap[selectedEvent.type]}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
