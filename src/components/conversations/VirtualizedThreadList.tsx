import { useEffect, useMemo, useRef } from "react"
import { AutoSizer } from "react-virtualized-auto-sizer"
import {
  type DynamicRowHeight,
  List,
  type RowComponentProps,
  useDynamicRowHeight,
} from "react-window"
import type { NormalizedMessage } from "@/lib/normalizeMessage"
import { MessageCard } from "./MessageCard"

interface VirtualizedThreadListProps {
  messages: NormalizedMessage[]
  conversation: any
  collapsedMessageIds: Set<string>
  onEditMessage?: (messageId: string, content: string) => void
  onDeleteMessage?: (messageId: string) => void
}

type ThreadRowData = {
  messages: NormalizedMessage[]
  conversation: any
  collapsedMessageIds: Set<string>
  onEditMessage?: (messageId: string, content: string) => void
  onDeleteMessage?: (messageId: string) => void
  dynamicRowHeight: DynamicRowHeight
}

const ThreadRow = ({
  index,
  style,
  messages,
  conversation,
  collapsedMessageIds,
  onEditMessage,
  onDeleteMessage,
  dynamicRowHeight,
}: RowComponentProps<ThreadRowData>) => {
  const rowRef = useRef<HTMLDivElement>(null)
  const message = messages[index]

  useEffect(() => {
    const el = rowRef.current
    if (!el) return
    return dynamicRowHeight.observeRowElements([el])
  }, [dynamicRowHeight])

  return (
    <div style={style}>
      <div ref={rowRef} className="px-8 py-3">
        <MessageCard
          key={message.dedupKey || message.id}
          message={message}
          conversation={conversation}
          isFirstInThread={index === 0}
          defaultCollapsed={collapsedMessageIds.has(message.dedupKey || message.id)}
          onEdit={onEditMessage}
          onDelete={onDeleteMessage}
        />
      </div>
    </div>
  )
}

export const VirtualizedThreadList = ({
  messages,
  conversation,
  collapsedMessageIds,
  onEditMessage,
  onDeleteMessage,
}: VirtualizedThreadListProps) => {
  const dynamicRowHeight = useDynamicRowHeight({ defaultRowHeight: 200 })

  const rowProps = useMemo<ThreadRowData>(
    () => ({
      messages,
      conversation,
      collapsedMessageIds,
      onEditMessage,
      onDeleteMessage,
      dynamicRowHeight,
    }),
    [messages, conversation, collapsedMessageIds, onEditMessage, onDeleteMessage, dynamicRowHeight],
  )

  return (
    <AutoSizer
      renderProp={({ height, width }) => {
        if (height == null || width == null) {
          return null
        }

        return (
          <List
            style={{ height, width }}
            rowCount={messages.length}
            rowHeight={dynamicRowHeight}
            rowComponent={ThreadRow}
            rowProps={rowProps}
            overscanCount={3}
          />
        )
      }}
    />
  )
}
