import { BookOpen, ChevronDown, ChevronUp } from "lucide-react"
import type React from "react"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

export const BadgeGuide: React.FC = () => {
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem("badgeGuideOpen")
    return saved ? JSON.parse(saved) : false
  })

  useEffect(() => {
    localStorage.setItem("badgeGuideOpen", JSON.stringify(isOpen))
  }, [isOpen])

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-3">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Badge Guide</span>
            <span className="text-xs text-muted-foreground">
              Understanding customer status indicators
            </span>
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {isOpen && (
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-start gap-3 p-2 rounded-md bg-background/50">
              <Badge
                variant="default"
                className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30 shrink-0"
              >
                ✓ Verified
              </Badge>
              <div>
                <p className="font-medium">Verified Customer</p>
                <p className="text-xs text-muted-foreground">
                  Customer found in Noddi system with confirmed contact details
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2 rounded-md bg-background/50">
              <Badge
                variant="default"
                className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30 shrink-0"
              >
                📦 Booking
              </Badge>
              <div>
                <p className="font-medium">Active Booking</p>
                <p className="text-xs text-muted-foreground">
                  Customer has active or completed bookings in the system
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2 rounded-md bg-background/50">
              <Badge variant="destructive" className="shrink-0">
                ⚠️ 1 unpaid
              </Badge>
              <div>
                <p className="font-medium">Unpaid Bookings</p>
                <p className="text-xs text-muted-foreground">
                  Number of outstanding unpaid bookings requiring follow-up
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2 rounded-md bg-background/50">
              <Badge
                variant="default"
                className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 shrink-0"
              >
                ⭐ Priority
              </Badge>
              <div>
                <p className="font-medium">Priority Customer</p>
                <p className="text-xs text-muted-foreground">
                  Customer has an upcoming booking and should receive priority service
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
