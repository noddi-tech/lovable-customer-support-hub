import { useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MobileChatBubble } from './MobileChatBubble';
import type { NormalizedMessage } from '@/lib/normalizeMessage';

interface MobileChatMessageListProps {
  messages: NormalizedMessage[];
  customerName?: string;
  customerEmail?: string;
  customerTyping?: boolean;
}

export const MobileChatMessageList = ({
  messages,
  customerName,
  customerEmail,
  customerTyping = false,
}: MobileChatMessageListProps) => {
  const endRef = useRef<HTMLDivElement>(null);

  // Sort oldest first
  const sorted = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, customerTyping]);

  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col gap-1.5 p-3">
        {sorted.length === 0 && (
          <div className="flex items-center justify-center h-24 text-muted-foreground text-xs">
            No messages yet
          </div>
        )}

        {sorted.map((msg) => (
          <MobileChatBubble
            key={msg.id}
            message={msg}
            customerName={customerName || customerEmail}
          />
        ))}

        {/* Typing indicator */}
        {customerTyping && (
          <div className="self-start">
            <span className="text-[10px] text-muted-foreground mb-0.5 px-1 block">
              {customerName || 'Customer'}
            </span>
            <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>
    </ScrollArea>
  );
};
