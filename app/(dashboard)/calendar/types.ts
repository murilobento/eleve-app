export interface CalendarEvent {
  id: number
  title: string
  date: Date
  time: string
  duration: string
  startTime?: string
  endTime?: string
  serviceOrderId?: string
  serviceOrderNumber?: string
  clientName?: string
  equipmentName?: string
  equipmentTypeName?: string
  operatorName?: string
  status?: "pending" | "scheduled" | "in_progress" | "completed" | "cancelled"
  address?: string
  type: "meeting" | "event" | "personal" | "task" | "reminder"
  attendees: string[]
  location: string
  color: string
  description?: string
}

export interface Calendar {
  id: string
  name: string
  color: string
  visible: boolean
  type: "personal" | "work" | "shared"
}
