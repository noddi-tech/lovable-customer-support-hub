import type React from "react"
import { getWidgetTranslations } from "../../translations"
import { type BlockComponentProps, type FlowPreviewProps, registerBlock } from "./registry"

/**
 * End-of-topic resolution check. The AI asks "Did that solve your problem?".
 *   Yes -> resolve the AI conversation.
 *   No  -> escalate to a human (soft hand-off; the AI keeps answering).
 *
 * The block only reports a sentinel selection to AiChat, which owns the
 * capability token and performs the resolve/escalate call + UI state update.
 */
const ResolvedCheckBlock: React.FC<BlockComponentProps> = ({
  messageId,
  blockIndex,
  usedBlocks,
  onAction,
  language,
  data,
}) => {
  const t = getWidgetTranslations(language || "no")
  const question: string = data.question?.trim() || t.resolvedQuestion
  const blockKey = `${messageId}:${blockIndex}`
  const isUsed = usedBlocks.has(blockKey)
  const selected = isUsed ? localStorage.getItem(`noddi_action_${blockKey}`) : null

  const choose = (choice: "__RESOLVED__" | "__ESCALATE__") => {
    if (isUsed) return
    localStorage.setItem(`noddi_action_${blockKey}`, choice)
    onAction(choice, blockKey)
  }

  return (
    <div style={{ margin: "10px 0" }}>
      <p style={{ fontSize: "13px", marginBottom: "8px", fontWeight: 500 }}>{question}</p>
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          type="button"
          disabled={isUsed}
          onClick={() => choose("__RESOLVED__")}
          style={{
            flex: 1,
            padding: "10px 16px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: isUsed ? "default" : "pointer",
            border: "1.5px solid #22c55e",
            background: selected === "__RESOLVED__" ? "#22c55e" : "transparent",
            color: selected === "__RESOLVED__" ? "#fff" : "#22c55e",
            opacity: isUsed && selected !== "__RESOLVED__" ? 0.4 : 1,
            transition: "all 0.15s ease",
          }}
        >
          {t.resolvedYes}
        </button>
        <button
          type="button"
          disabled={isUsed}
          onClick={() => choose("__ESCALATE__")}
          style={{
            flex: 1,
            padding: "10px 16px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: isUsed ? "default" : "pointer",
            border: "1.5px solid #ef4444",
            background: selected === "__ESCALATE__" ? "#ef4444" : "transparent",
            color: selected === "__ESCALATE__" ? "#fff" : "#ef4444",
            opacity: isUsed && selected !== "__ESCALATE__" ? 0.4 : 1,
            transition: "all 0.15s ease",
          }}
        >
          {t.resolvedNo}
        </button>
      </div>
    </div>
  )
}

const ResolvedCheckPreview: React.FC<FlowPreviewProps> = () => (
  <div className="rounded-md bg-white dark:bg-background border p-2">
    <p className="text-[9px] text-muted-foreground font-medium mb-1.5">Customer sees:</p>
    <div className="flex gap-1.5">
      <div className="flex-1 flex items-center justify-center border-2 border-green-400 rounded-lg py-1.5 text-green-600 text-[10px] font-semibold">
        Yes, solved
      </div>
      <div className="flex-1 flex items-center justify-center border-2 border-red-400 rounded-lg py-1.5 text-red-600 text-[10px] font-semibold">
        No, not solved
      </div>
    </div>
  </div>
)

registerBlock({
  type: "resolved_check",
  marker: "[RESOLVED_CHECK]",
  closingMarker: "[/RESOLVED_CHECK]",
  parseContent: (inner) => ({ question: inner.trim() }),
  component: ResolvedCheckBlock,
  requiresApi: true,
  flowMeta: {
    label: "Resolution check",
    icon: "✅",
    description:
      "Asks the customer if their issue was solved. Yes marks the chat resolved; No hands off to a human.",
    applicableNodeTypes: ["decision"],
    previewComponent: ResolvedCheckPreview,
  },
})

export default ResolvedCheckBlock
