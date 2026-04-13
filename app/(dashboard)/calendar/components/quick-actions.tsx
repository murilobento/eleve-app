"use client"

import { 
  Clock,
  Users,
  Plus,
  Settings,
  Download,
  Share,
  Bell
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useI18n } from "@/i18n/provider"

interface QuickActionsProps {
  onNewEvent?: () => void
  onNewMeeting?: () => void
  onNewReminder?: () => void
  onSettings?: () => void
}

export function QuickActions({ 
  onNewEvent, 
  onNewMeeting, 
  onNewReminder, 
  onSettings 
}: QuickActionsProps) {
  const { t } = useI18n()

  const quickStats = [
    { label: t("calendar.quickActions.todayEvents"), value: "3", color: "bg-chart-1" },
    { label: t("calendar.quickActions.thisWeek"), value: "12", color: "bg-chart-2" },
    { label: t("calendar.quickActions.pending"), value: "2", color: "bg-chart-4" }
  ]

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{t("calendar.quickActions.overview")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {quickStats.map((stat, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${stat.color}`} />
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
              <Badge variant="secondary">{stat.value}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{t("calendar.quickActions.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full justify-start cursor-pointer" 
            onClick={onNewEvent}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t("calendar.quickActions.newEvent")}
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start cursor-pointer" 
            onClick={onNewMeeting}
          >
            <Users className="w-4 h-4 mr-2" />
            {t("calendar.quickActions.scheduleMeeting")}
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start cursor-pointer" 
            onClick={onNewReminder}
          >
            <Bell className="w-4 h-4 mr-2" />
            {t("calendar.quickActions.setReminder")}
          </Button>

          <Separator className="my-3" />

          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start cursor-pointer" 
          >
            <Share className="w-4 h-4 mr-2" />
            {t("calendar.quickActions.shareCalendar")}
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start cursor-pointer" 
          >
            <Download className="w-4 h-4 mr-2" />
            {t("calendar.quickActions.export")}
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start cursor-pointer" 
            onClick={onSettings}
          >
            <Settings className="w-4 h-4 mr-2" />
            {t("calendar.quickActions.settings")}
          </Button>
        </CardContent>
      </Card>

      {/* Upcoming Events */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {t("calendar.quickActions.nextUp")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-chart-1 rounded-full mt-2" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t("calendar.quickActions.teamStandup")}</p>
                <p className="text-xs text-muted-foreground">{t("calendar.quickActions.teamStandupTime")}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-chart-5 rounded-full mt-2" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t("calendar.quickActions.designReview")}</p>
                <p className="text-xs text-muted-foreground">{t("calendar.quickActions.designReviewTime")}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
