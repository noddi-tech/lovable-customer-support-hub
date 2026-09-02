/**
 * Hover explanations for every inbox list column, shared by the standard and
 * virtualized tables so both stay in sync.
 */
export const CONVERSATION_COLUMN_DESCRIPTIONS: Record<string, string> = {
  channel:
    "How the customer reached you — email, live chat, SMS or social. A green dot means the live chat is still active.",
  customer:
    "Who the conversation is with: their name, or the email address if we have no name yet.",
  inbox: "Which shared inbox or brand received the message. Only shown when viewing all inboxes.",
  subject:
    "Email rows show the subject plus the first line of the latest message; chat and SMS rows show the first two lines of the message.",
  status: "Where the thread stands: open, pending, snoozed, resolved or closed.",
  priority: "Urgency set on the thread (low, normal, high, urgent). Drives the SLA target used.",
  received: "When the most recent customer message arrived, in your local time.",
  waiting:
    "How long the customer has been waiting since their last message without a reply from us.",
  sla: "Countdown to the first-reply deadline for this thread. Green = on track, amber = under 2 hours left, red = breached. Empty once we have replied.",
}
