import { Bot, CheckCircle2, HelpCircle, UserRound } from "lucide-react"
import type React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

/**
 * Self-serve explainer for new agents: how AI chats, resolution, and human
 * escalation work in this inbox. Opens from the Live Chat header.
 */
export const AiEscalationInfoPopover: React.FC = () => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="How AI chat & escalation works"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 max-h-[70vh] overflow-y-auto text-sm">
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-base">How live chat &amp; the AI assistant work</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Every widget chat shows up here — both human live chats and AI conversations.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <Bot className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
              <p>
                <span className="font-medium">AI handles it first.</span> When a customer opens the
                widget, the AI assistant answers, looks up bookings, and can complete actions. AI
                chats carry an{" "}
                <Badge variant="outline" className="px-1 py-0 text-[10px] align-middle">
                  AI
                </Badge>{" "}
                badge.
              </p>
            </div>

            <div className="flex gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
              <p>
                <span className="font-medium">Resolution is tracked.</span> If the AI completes a
                booking/cancel/reschedule, or the customer confirms "yes, that solved it", the chat
                is marked <span className="font-medium">Resolved</span> and moves to the{" "}
                <span className="font-medium">Ended</span> tab. Unresolved chats stay in{" "}
                <span className="font-medium">Active</span>.
              </p>
            </div>

            <div className="flex gap-2">
              <UserRound className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <p>
                <span className="font-medium">Escalation to a human.</span> If the customer taps
                "Talk to a human" (or answers "no, not solved"), the chat is flagged{" "}
                <Badge
                  variant="outline"
                  className="px-1 py-0 text-[10px] align-middle border-red-300 text-red-700"
                >
                  Needs human
                </Badge>{" "}
                and you get a notification. The AI{" "}
                <span className="font-medium">keeps replying</span> so the customer is never stuck —
                the widget shows "finding a person to help you".
              </p>
            </div>
          </div>

          <div className="rounded-md bg-muted p-2.5 space-y-1.5">
            <p className="font-medium">Taking over a chat</p>
            <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground">
              <li>Open a chat marked "Needs human" (or any AI chat).</li>
              <li>
                Click <span className="font-medium text-foreground">Take over</span>, or just start
                typing a reply — either one claims the chat for you.
              </li>
              <li>
                Once you take over, the{" "}
                <span className="font-medium text-foreground">AI pauses</span> and the customer sees
                your messages as a human agent.
              </li>
              <li>
                When you're done, click <span className="font-medium text-foreground">Resolve</span>
                .
              </li>
            </ol>
          </div>

          <p className="text-xs text-muted-foreground">
            Only one agent can take over a chat — if someone claims it first, you'll be told. The{" "}
            <span className="font-medium">Waiting</span> tab lists chats asking for a human (widget
            queue + AI escalations).
          </p>

          <div className="rounded-md border p-2.5 space-y-2">
            <p className="font-medium">What the customer sees in the widget</p>
            <p className="text-xs text-muted-foreground">
              Which options appear depends on the widget's configuration (set per widget in admin,
              and the host app can further gate them).
            </p>
            <ul className="space-y-1.5 text-xs">
              <li className="flex gap-2">
                <Bot className="h-3.5 w-3.5 text-violet-500 shrink-0 mt-0.5" />
                <span>
                  <span className="font-medium text-foreground">AI assistant.</span> When enabled,
                  the customer can chat with the AI 24/7 — even when no agents are online. It
                  answers and can complete booking actions.
                </span>
              </li>
              <li className="flex gap-2">
                <UserRound className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <span className="font-medium text-foreground">Live chat with a human.</span> Only
                  shown when live chat is enabled and at least one agent is online. Otherwise the
                  customer sees an offline notice.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <span>
                  <span className="font-medium text-foreground">No AI / contact form.</span> With AI
                  and live chat off (or offline), the customer leaves a message via the contact form
                  and gets a reply by email.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
