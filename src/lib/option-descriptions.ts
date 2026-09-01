/**
 * Human-readable explanations for dropdown values across the dashboard.
 * Shown as hover tooltips so agents know exactly what each value does.
 */

export const CONVERSATION_STATUS_DESCRIPTIONS: Record<string, string> = {
  open:
    "Active and needs attention. The conversation stays in the Open inbox, counts towards your open/unread totals and SLA timers keep running.",
  pending:
    "Waiting on someone else (the customer, a colleague or a third party). It leaves the Open list but is not finished — it reopens automatically as soon as a new reply arrives.",
  resolved:
    "The issue is solved but the thread is kept out of the way. It is hidden from the active list and stops counting towards open work; a new customer reply reopens it.",
  closed:
    "Finished and archived. It disappears from the active inbox, stops SLA tracking and no follow-up reminders are sent. A new inbound message reopens it automatically.",
  all: "No status filter — show conversations in every state (open, pending, resolved and closed).",
};

export const PRIORITY_DESCRIPTIONS: Record<string, string> = {
  low:
    "Nice to have. Sorted last, no escalation and the longest response-time target.",
  normal:
    "Default priority for everyday requests. Standard sorting and standard SLA response target.",
  high:
    "Important. Sorted above normal traffic, highlighted in the list and given a shorter SLA response target.",
  urgent:
    "Critical or business-blocking. Pinned to the top of the list, shown with a red badge, given the shortest SLA target and may trigger Slack escalation alerts.",
  all: "No priority filter — show conversations at every priority level.",
};

export const REPLY_SEND_STATUS_DESCRIPTIONS: Record<string, string> = {
  closed:
    "Sends your reply and immediately closes the conversation. It leaves the active inbox; if the customer answers, it reopens automatically.",
  open:
    "Sends your reply and leaves the conversation open, so it stays in the active inbox and keeps counting as work in progress.",
  pending:
    "Sends your reply and marks the conversation as waiting for the customer. It leaves the active list but reopens the moment they reply.",
};
