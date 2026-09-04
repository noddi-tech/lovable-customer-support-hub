import { MessageCircle, Users } from "lucide-react"
import type React from "react"

export const ChatEmptyState: React.FC = () => {
  return (
    <div className="h-full w-full min-w-0 overflow-y-auto bg-muted/10">
      <div className="mx-auto flex min-h-full w-full max-w-sm flex-col items-center justify-center gap-4 px-4 py-8 text-center">
        <div className="relative shrink-0">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <MessageCircle className="h-8 w-8 text-primary" />
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-green-100">
            <Users className="h-3.5 w-3.5 text-green-600" />
          </div>
        </div>

        <div className="w-full space-y-1.5">
          <h2 className="text-base font-semibold text-foreground">Select a chat to start</h2>
          <p className="text-balance text-xs text-muted-foreground">
            Choose a conversation from the list, or claim a waiting visitor from the queue.
          </p>
        </div>

        <div className="w-full rounded-lg border border-dashed bg-muted/30 p-3 text-left">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-medium text-foreground">
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
