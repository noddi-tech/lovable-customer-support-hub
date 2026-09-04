/** Control markers the AI embeds in widget messages. The visitor's widget
 * consumes these to render interactive UI blocks (pickers, confirm buttons);
 * the raw tokens are never shown to the visitor. Agent-facing views surface
 * them as labelled chips with the description below in a tooltip. */
export const MARKER_INFO: Record<string, { label: string; description: string }> = {
  TIME_SLOT: {
    label: "Time slots",
    description:
      "Requests available delivery windows for the booking. Renders a time-slot picker in the visitor's widget.",
  },
  BOOKING_EDIT: {
    label: "Booking change",
    description:
      "Proposes a change to an existing booking. Renders a confirm/cancel block in the visitor's widget.",
  },
  BOOKING_SUMMARY: {
    label: "Booking summary",
    description: "Renders a summary card of the booking in the visitor's widget.",
  },
  BOOKING_INFO: {
    label: "Booking info",
    description: "Renders booking details (address, date) in the visitor's widget.",
  },
  BOOKING_CONFIRM: {
    label: "Booking confirm",
    description: "Renders a confirmation block for a new booking in the visitor's widget.",
  },
  YES_NO: {
    label: "Yes / No",
    description: "Renders yes/no quick-reply buttons in the visitor's widget.",
  },
}

export interface ParsedMarker {
  tag: string
  payload: string
}

/** Split raw AI message content into the plain text an agent should read and
 * the list of control markers to surface separately. Markers look like
 * `[TAG]{...}[/TAG]`; leftover blank lines are collapsed. */
export const parseAgentContent = (content: string): { text: string; markers: ParsedMarker[] } => {
  const markers: ParsedMarker[] = []
  const text = content
    .replace(/\[([A-Z_]+)\]([\s\S]*?)\[\/\1\]/g, (_full, tag: string, payload: string) => {
      markers.push({ tag, payload: payload.trim() })
      return ""
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim()
  return { text, markers }
}
