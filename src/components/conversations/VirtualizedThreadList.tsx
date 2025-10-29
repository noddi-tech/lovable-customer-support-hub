import { useRef, useEffect } from 'react';
import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { MessageCard } from "./MessageCard";
import { NormalizedMessage } from "@/lib/normalizeMessage";

interface VirtualizedThreadListProps {
  messages: NormalizedMessage[];
  conversation: any;
  collapsedMessageIds: Set<string>;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
}

export const VirtualizedThreadList = ({
  messages,
  conversation,
  collapsedMessageIds,
  onEditMessage,
  onDeleteMessage
}: VirtualizedThreadListProps) => {
  const listRef = useRef<List>(null);
  const rowHeights = useRef<{ [key: number]: number }>({});

  function getRowHeight(index: number) {
    return rowHeights.current[index] || 200; // Default height
  }

  function setRowHeight(index: number, size: number) {
    listRef.current?.resetAfterIndex(0);
    rowHeights.current = { ...rowHeights.current, [index]: size };
  }

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const rowRef = useRef<HTMLDivElement>(null);
    const message = messages[index];

    useEffect(() => {
      if (rowRef.current) {
        const height = rowRef.current.getBoundingClientRect().height;
        if (height !== rowHeights.current[index]) {
          setRowHeight(index, height);
        }
      }
    }, [index]);

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
    );
  };

  return (
    <AutoSizer>
      {({ height, width }) => (
        <List
          ref={listRef}
          height={height}
          itemCount={messages.length}
          itemSize={getRowHeight}
          width={width}
          overscanCount={3}
        >
          {Row}
        </List>
      )}
    </AutoSizer>
  );
};
