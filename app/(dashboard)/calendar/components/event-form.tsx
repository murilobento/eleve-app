"use client"

import { useEffect, useState } from "react"
import { CalendarIcon, Clock, MapPin, Users, Type, Tag } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle 
} from "@/components/ui/dialog"
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useResourcePermissions } from "@/hooks/use-resource-permissions"
import { useI18n } from "@/i18n/provider"
import { cn } from "@/lib/utils"
import { type CalendarEvent } from "../types"
import { getAvatarInitials } from "../utils"

interface EventFormProps {
  event?: CalendarEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (event: Partial<CalendarEvent>) => void
  onDelete?: (eventId: number) => void
}

const eventTypes = [
  { value: "meeting", color: "bg-chart-1" },
  { value: "event", color: "bg-chart-2" },
  { value: "personal", color: "bg-chart-3" },
  { value: "task", color: "bg-chart-4" },
  { value: "reminder", color: "bg-chart-5" }
]

const timeSlots = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM",
  "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM"
]

const durationOptions = ["15 min", "30 min", "45 min", "1 hour", "1.5 hours", "2 hours", "3 hours", "All day"]

export function EventForm({ event, open, onOpenChange, onSave, onDelete }: EventFormProps) {
  const { t } = useI18n()
  const { canCreate, canUpdate, canDelete } = useResourcePermissions("calendar")
  const [formData, setFormData] = useState({
    title: event?.title || "",
    date: event?.date || new Date(),
    time: event?.time || "9:00 AM",
    duration: event?.duration || "1 hour",
    type: event?.type || "meeting",
    location: event?.location || "",
    description: event?.description || "",
    attendees: event?.attendees || [],
    allDay: false,
    reminder: true
  })

  const [showCalendar, setShowCalendar] = useState(false)
  const [newAttendee, setNewAttendee] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    setFormData({
      title: event?.title || "",
      date: event?.date || new Date(),
      time: event?.time || "9:00 AM",
      duration: event?.duration || "1 hour",
      type: event?.type || "meeting",
      location: event?.location || "",
      description: event?.description || "",
      attendees: event?.attendees || [],
      allDay: false,
      reminder: true,
    })
    setNewAttendee("")
    setShowDeleteConfirm(false)
  }, [event, open])

  const handleSave = () => {
    if ((event && !canUpdate) || (!event && !canCreate)) {
      return
    }

    const eventData: Partial<CalendarEvent> = {
      ...formData,
      id: event?.id,
      color: eventTypes.find(t => t.value === formData.type)?.color || "bg-chart-1"
    }
    onSave(eventData)
    onOpenChange(false)
  }

  const handleDelete = () => {
    if (event?.id && onDelete && canDelete) {
      onDelete(event.id)
      setShowDeleteConfirm(false)
      onOpenChange(false)
    }
  }

  const addAttendee = () => {
    if (newAttendee.trim() && !formData.attendees.includes(newAttendee.trim())) {
      setFormData(prev => ({
        ...prev,
        attendees: [...prev.attendees, newAttendee.trim()]
      }))
      setNewAttendee("")
    }
  }

  const removeAttendee = (attendee: string) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.filter(a => a !== attendee)
    }))
  }

  const selectedEventType = eventTypes.find(t => t.value === formData.type)
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

  const getDurationLabel = (value: string) => {
    switch (value) {
      case "15 min":
        return t("calendar.min15")
      case "30 min":
        return t("calendar.min30")
      case "45 min":
        return t("calendar.min45")
      case "1 hour":
        return t("calendar.hour1")
      case "1.5 hours":
        return t("calendar.hour1_5")
      case "2 hours":
        return t("calendar.hours2")
      case "3 hours":
        return t("calendar.hours3")
      case "All day":
        return t("calendar.allDay")
      default:
        return value
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", selectedEventType?.color)} />
            {event ? t("calendar.editEvent") : t("calendar.createNewEvent")}
          </DialogTitle>
          <DialogDescription>
            {event ? t("calendar.editEventHelp") : t("calendar.createEventHelp")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Event Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-2">
              <Type className="w-4 h-4" />
              {t("calendar.eventTitle")}
            </Label>
            <Input
              id="title"
              placeholder={t("calendar.enterEventTitle")}
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="text-lg font-medium"
            />
          </div>

          {/* Event Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                {t("calendar.eventType")}
              </Label>
              <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as CalendarEvent["type"] }))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full", type.color)} />
                        {getEventTypeLabel(type.value)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                {t("calendar.date")}
              </Label>
              <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    {format(formData.date, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => {
                      if (date) {
                        setFormData(prev => ({ ...prev, date }))
                        setShowCalendar(false)
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {t("calendar.time")}
              </Label>
              <Select value={formData.time} onValueChange={(value) => setFormData(prev => ({ ...prev, time: value }))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map(time => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration and All Day */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("calendar.duration")}</Label>
              <Select value={formData.duration} onValueChange={(value) => setFormData(prev => ({ ...prev, duration: value }))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map(duration => (
                    <SelectItem key={duration} value={duration}>{getDurationLabel(duration)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("calendar.options")}</Label>
              <div className="flex items-center space-x-4 h-10">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="all-day"
                    checked={formData.allDay}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allDay: checked }))}
                  />
                  <Label htmlFor="all-day" className="text-sm">{t("calendar.allDay")}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="reminder"
                    checked={formData.reminder}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, reminder: checked }))}
                  />
                  <Label htmlFor="reminder" className="text-sm">{t("calendar.reminder")}</Label>
                </div>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {t("calendar.location")}
            </Label>
            <Input
              id="location"
              placeholder={t("calendar.addLocation")}
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            />
          </div>

          {/* Attendees */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {t("calendar.attendees")}
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder={t("calendar.addAttendee")}
                value={newAttendee}
                onChange={(e) => setNewAttendee(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addAttendee()}
              />
              <Button onClick={addAttendee} variant="outline" className="cursor-pointer">{t("calendar.add")}</Button>
            </div>
            {formData.attendees.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.attendees.map((attendee, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-2 px-2 py-1">
                    <Avatar className="w-5 h-5">
                      <AvatarFallback className="text-[10px] font-medium">
                        {getAvatarInitials(attendee)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{attendee}</span>
                    <button
                      onClick={() => removeAttendee(attendee)}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                      type="button"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t("calendar.descriptionLabel")}</Label>
            <Textarea
              id="description"
              placeholder={t("calendar.addDescription")}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-6">
            {((event && canUpdate) || (!event && canCreate)) ? (
              <Button onClick={handleSave} className="flex-1 cursor-pointer">
                {event ? t("calendar.updateEvent") : t("calendar.createEvent")}
              </Button>
            ) : null}
            {event && onDelete && canDelete && (
              <Button onClick={() => setShowDeleteConfirm(true)} variant="destructive" className="cursor-pointer">
                {t("calendar.delete")}
              </Button>
            )}
            <Button onClick={() => onOpenChange(false)} variant="outline" className="cursor-pointer">
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      </DialogContent>

      <ConfirmDeleteDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        description={
          event
            ? t("calendar.confirmDelete", { name: event.title })
            : t("calendar.confirmDeleteFallback")
        }
        onConfirm={async () => {
          handleDelete()
        }}
      />
    </Dialog>
  )
}
