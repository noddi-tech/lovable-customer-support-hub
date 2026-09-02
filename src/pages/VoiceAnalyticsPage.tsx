import { format } from "date-fns"
import { ArrowLeft, CalendarIcon } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { CallAnalyticsDashboard } from "@/components/dashboard/voice/CallAnalyticsDashboard"
import { LiveDataIndicator } from "@/components/dashboard/voice/LiveDataIndicator"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SidebarTrigger } from "@/components/ui/sidebar"

export default function VoiceAnalyticsPage() {
  const navigate = useNavigate()
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  })
  const [isLive, setIsLive] = useState(true)

  return (
    <div className="space-y-4 p-3 pb-24 sm:space-y-6 sm:p-0 sm:pb-0">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <SidebarTrigger className="shrink-0 md:hidden" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/voice")}
            className="shrink-0 gap-2 px-2 sm:px-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Inbox</span>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold sm:text-3xl">Voice Analytics</h1>
            <p className="hidden text-muted-foreground mt-1 sm:block">
              Insights and performance metrics for your voice operations
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <LiveDataIndicator
            isLive={isLive}
            lastUpdated={new Date()}
            onRefresh={() => window.location.reload()}
          />

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10 gap-2 sm:h-9">
                <CalendarIcon className="h-4 w-4" />
                {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(20rem,calc(100vw-1.5rem))] p-0 sm:w-auto" align="end">
              <div className="p-3 space-y-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Date Range</p>
                  <p className="text-xs text-muted-foreground">
                    Select a range to filter analytics
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDateRange({
                        from: new Date(new Date().setDate(new Date().getDate() - 7)),
                        to: new Date(),
                      })
                    }
                  >
                    Last 7 days
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDateRange({
                        from: new Date(new Date().setDate(new Date().getDate() - 30)),
                        to: new Date(),
                      })
                    }
                  >
                    Last 30 days
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDateRange({
                        from: new Date(new Date().setDate(new Date().getDate() - 90)),
                        to: new Date(),
                      })
                    }
                  >
                    Last 90 days
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <CallAnalyticsDashboard dateRange={dateRange} />
    </div>
  )
}
