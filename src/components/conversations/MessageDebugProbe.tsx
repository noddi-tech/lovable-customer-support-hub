/**
 * Debug probe component for message diagnostics
 * Only renders when VITE_UI_PROBE=1 is set
 */

import { Badge } from "@/components/ui/badge";
import { createContentHash, type NormalizedMessage } from "@/lib/normalizeMessage";
import { cn } from "@/lib/utils";

// Helper function to create soft dedup key (matches normalizeMessage.ts)
function createSoftDedupKey(message: NormalizedMessage): string {
  const timeStr = typeof message.createdAt === 'string' 
    ? new Date(message.createdAt).toISOString().split('T')[0] 
    : new Date(message.createdAt).toISOString().split('T')[0];
  
  const senderKey = message.from.email || message.from.phone || message.from.userId || 'unknown';
  const contentHash = createContentHash(message.visibleBody);
  
  return `${senderKey}-${timeStr}-${contentHash}`;
}

interface MessageDebugProbeProps {
  message: NormalizedMessage;
  className?: string;
}

export const MessageDebugProbe = ({ message, className }: MessageDebugProbeProps) => {
  // Only render if UI probe is enabled
  const isProbeMode = import.meta.env.VITE_UI_PROBE === '1';
  
  if (!isProbeMode) {
    return null;
  }
  
  const visibleHash = createContentHash(message.visibleBody);
  const fullHash = createContentHash(message.originalMessage?.content || '');
  
  return (
    <div className={cn(
      "mt-2 p-2 bg-muted/50 rounded text-xs font-mono text-muted-foreground border-l-2 border-orange-500",
      className
    )}>
      <div className="flex flex-wrap gap-1 items-center">
        <Badge variant="outline" className="text-xs">
          ID: {message.id.slice(-8)}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {message.direction}
        </Badge>
        <Badge variant={message.authorType === 'agent' ? 'default' : 'secondary'} className="text-xs">
          {message.authorType}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {message.channel}
        </Badge>
      </div>
      
      <div className="mt-1 space-y-1">
        <div>
          <span className="text-orange-600">Author:</span> {message.authorLabel}
        </div>
        <div>
          <span className="text-orange-600">From:</span> {JSON.stringify(message.from)}
        </div>
        <div>
          <span className="text-orange-600">Time:</span> {
            typeof message.createdAt === 'string' 
              ? new Date(message.createdAt).toLocaleTimeString()
              : new Date(message.createdAt).toLocaleTimeString()
          }
        </div>
        <div className="flex gap-2">
          <span>
            <span className="text-orange-600">Visible:</span> {message.visibleBody.length} chars
          </span>
          <span>
            <span className="text-orange-600">Full:</span> {(message.originalMessage?.content || '').length} chars
          </span>
        </div>
        <div>
          <span className="text-orange-600">Visible Hash:</span> {visibleHash.substring(0, 8)}
        </div>
        <div>
          <span className="text-orange-600">Dedup Key:</span> {createSoftDedupKey(message).substring(0, 20)}
        </div>
        {message.quotedBlocks && message.quotedBlocks.length > 0 && (
          <div>
            <span className="text-orange-600">Quoted:</span> {message.quotedBlocks.length} blocks ({message.quotedBlocks.map(b => b.kind).join(', ')})
          </div>
        )}
      </div>
    </div>
  );
};