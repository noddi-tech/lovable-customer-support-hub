import { MessageCircle, Users } from "lucide-react"
import type React from "react"

export const ChatEmptyState: React.FC = () => {
  return (
    <div className="@container h-full w-full min-w-0 overflow-y-auto bg-muted/10">
      <div className="flex min-h-full flex-col items-center justify-center gap-4 px-4 py-8 text-center">
        <div className="relative shrink-0">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 @md:h-20 @md:w-20">
            <MessageCircle className="h-7 w-7 text-primary @md:h-10 @md:w-10" />
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-green-100 @md:h-8 @md:w-8">
            <Users className="h-3 w-3 text-green-600 @md:h-4 @md:w-4" />
          </div>
        </div>

        <div className="w-full max-w-sm space-y-1.5">
          <h2 className="text-base font-semibold text-foreground @md:text-xl">
            Select a chat to start
          </h2>
          <p className="text-balance text-xs text-muted-foreground @md:text-sm">
            Choose a conversation from the list, or claim a waiting visitor from the queue.
          </p>
        </div>

        <div className="hidden w-full max-w-xs rounded-lg border border-dashed bg-muted/30 p-4 text-left @md:block">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <span className="h-2 w-2 shrink-0 rounded-full bg-green-500 animate-pulse" />
            Tips for great chat support
          </h3>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>• Respond quickly to waiting visitors</li>
            <li>• Keep messages short and helpful</li>
            <li>• Use the Noddi panel to identify customers</li>
            <li>• Transfer complex issues to specialists</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
